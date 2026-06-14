package main

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

type Message struct {
	Action string          `json:"action"`
	Config *ConnectionConfig `json:"config,omitempty"`
}

type ConnectionConfig struct {
	Protocol    string `json:"protocol"`
	Server      string `json:"server"`
	Port        int    `json:"port"`
	UUID        string `json:"uuid"`
	Flow        string `json:"flow"`
	Encryption  string `json:"encryption"`
	Security    string `json:"security"`
	SNI         string `json:"sni"`
	FP          string `json:"fp"`
	PBK         string `json:"pbk"`
	SID         string `json:"sid"`
	SPX         string `json:"spx"`
	Type        string `json:"type"`
	HeaderType  string `json:"headerType"`
	Path        string `json:"path"`
	Host        string `json:"host"`
	ServiceName string `json:"serviceName"`
	Mode        string `json:"mode"`
	TLS         string `json:"tls"`
	AID         string `json:"aid"`
	Password    string `json:"password"`
	Peer        string `json:"peer"`
	LocalPort   int    `json:"localPort"`
}

type Response struct {
	Type    string `json:"type"`
	Message string `json:"message,omitempty"`
	Success bool   `json:"success,omitempty"`
	Port    int    `json:"port,omitempty"`
}

var xrayCmd *exec.Cmd

func main() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		stopXray()
		os.Exit(0)
	}()

	sendResponse(Response{Type: "ready", Success: true})

	reader := NewNativeReader(os.Stdin)
	for {
		msg, err := reader.ReadMessage()
		if err != nil {
			if err != io.EOF {
				sendResponse(Response{Type: "error", Message: fmt.Sprintf("read error: %v", err)})
			}
			break
		}

		var parsed Message
		if err := json.Unmarshal(msg, &parsed); err != nil {
			sendResponse(Response{Type: "error", Message: "invalid message format"})
			continue
		}

		switch parsed.Action {
		case "start":
			handleStart(parsed.Config)
		case "stop":
			handleStop()
		case "getTraffic":
			handleTraffic()
		default:
			sendResponse(Response{Type: "error", Message: "unknown action: " + parsed.Action})
		}
	}
}

func handleStart(config *ConnectionConfig) {
	if config == nil {
		sendResponse(Response{Type: "error", Message: "no config provided"})
		return
	}

	if xrayCmd != nil {
		stopXray()
	}

	xrayPath := findXrayBinary()
	if xrayPath == "" {
		sendResponse(Response{Type: "error", Message: "xray binary not found. Run installer first."})
		return
	}

	xrayConfig, err := generateXrayConfig(config)
	if err != nil {
		sendResponse(Response{Type: "error", Message: fmt.Sprintf("config generation error: %v", err)})
		return
	}

	configDir, err := os.MkdirTemp("", "vpnforall-*")
	if err != nil {
		sendResponse(Response{Type: "error", Message: fmt.Sprintf("temp dir error: %v", err)})
		return
	}

	configPath := filepath.Join(configDir, "config.json")
	if err := os.WriteFile(configPath, xrayConfig, 0644); err != nil {
		sendResponse(Response{Type: "error", Message: fmt.Sprintf("write config error: %v", err)})
		return
	}

	xrayCmd = exec.Command(xrayPath, "-c", configPath)
	xrayCmd.Stdout = os.Stdout
	xrayCmd.Stderr = os.Stderr

	if err := xrayCmd.Start(); err != nil {
		xrayCmd = nil
		sendResponse(Response{Type: "error", Message: fmt.Sprintf("failed to start xray: %v", err)})
		return
	}

	go func() {
		xrayCmd.Wait()
		xrayCmd = nil
		os.RemoveAll(configDir)
	}()

	sendResponse(Response{Type: "started", Success: true, Port: config.LocalPort})
}

func handleStop() {
	stopXray()
	sendResponse(Response{Type: "stopped", Success: true})
}

func handleTraffic() {
	sendResponse(Response{Type: "traffic", Message: "{\"uploadBytes\":0,\"downloadBytes\":0}"})
}

func stopXray() {
	if xrayCmd != nil && xrayCmd.Process != nil {
		xrayCmd.Process.Signal(syscall.SIGTERM)
		xrayCmd.Wait()
		xrayCmd = nil
	}
}

func findXrayBinary() string {
	// Check common locations
	locations := []string{
		filepath.Join(homeDir(), ".vpnforall", "xray"),
		filepath.Join(homeDir(), ".vpnforall", "xray.exe"),
		"/usr/local/bin/xray",
		"/usr/bin/xray",
	}

	// Check PATH
	if path, err := exec.LookPath("xray"); err == nil {
		return path
	}

	for _, loc := range locations {
		if _, err := os.Stat(loc); err == nil {
			return loc
		}
	}

	return ""
}

func homeDir() string {
	home, _ := os.UserHomeDir()
	return home
}

func generateXrayConfig(config *ConnectionConfig) ([]byte, error) {
	outbound := buildOutbound(config)
	inbound := map[string]interface{}{
		"tag":      "socks-in",
		"port":     config.LocalPort,
		"protocol": "socks",
		"settings": map[string]interface{}{
			"udp": true,
			"auth": "noauth",
		},
		"sniffing": map[string]interface{}{
			"enabled":      true,
			"destOverride": []string{"http", "tls"},
		},
	}

	xrayConfig := map[string]interface{}{
		"log": map[string]interface{}{
			"loglevel": "warning",
		},
		"inbounds":  []interface{}{inbound},
		"outbounds": []interface{}{outbound},
	}

	return json.MarshalIndent(xrayConfig, "", "  ")
}

func buildOutbound(config *ConnectionConfig) map[string]interface{} {
	outbound := map[string]interface{}{
		"protocol": config.Protocol,
		"settings": map[string]interface{}{},
	}

	switch config.Protocol {
	case "vless":
		vnext := []map[string]interface{}{
			{
				"address": config.Server,
				"port":    config.Port,
				"users": []map[string]interface{}{
					{
						"id":         config.UUID,
						"flow":       config.Flow,
						"encryption": config.Encryption,
					},
				},
			},
		}
		outbound["settings"] = map[string]interface{}{
			"vnext": vnext,
		}

	case "vmess":
		vnext := []map[string]interface{}{
			{
				"address": config.Server,
				"port":    config.Port,
				"users": []map[string]interface{}{
					{
						"id":       config.UUID,
						"alterId":  config.AID,
						"security": config.Security,
					},
				},
			},
		}
		outbound["settings"] = map[string]interface{}{
			"vnext": vnext,
		}

	case "trojan":
		servers := []map[string]interface{}{
			{
				"address":  config.Server,
				"port":     config.Port,
				"password": config.Password,
			},
		}
		outbound["settings"] = map[string]interface{}{
			"servers": servers,
		}
	}

	streamSettings := buildStreamSettings(config)
	if streamSettings != nil {
		outbound["streamSettings"] = streamSettings
	}

	return outbound
}

func buildStreamSettings(config *ConnectionConfig) map[string]interface{} {
	stream := map[string]interface{}{}
	network := config.Type
	if network == "" {
		network = "tcp"
	}
	stream["network"] = network
	stream["security"] = config.Security

	if config.Security == "tls" || config.Security == "reality" {
		tlsSettings := map[string]interface{}{}
		if config.SNI != "" {
			tlsSettings["serverName"] = config.SNI
		}
		if config.FP != "" {
			tlsSettings["fingerprint"] = config.FP
		}
		if config.Security == "reality" {
			tlsSettings["show"] = false
			if config.PBK != "" {
				tlsSettings["publicKey"] = config.PBK
			}
			if config.SID != "" {
				tlsSettings["shortId"] = config.SID
			}
			if config.SPX != "" {
				tlsSettings["spiderX"] = config.SPX
			}
		}
		stream["tlsSettings"] = tlsSettings
	}

	switch network {
	case "ws", "websocket":
		wsSettings := map[string]interface{}{}
		if config.Path != "" {
			wsSettings["path"] = config.Path
		}
		if config.Host != "" {
			wsSettings["headers"] = map[string]string{"Host": config.Host}
		}
		stream["wsSettings"] = wsSettings

	case "grpc":
		grpcSettings := map[string]interface{}{}
		if config.ServiceName != "" {
			grpcSettings["serviceName"] = config.ServiceName
		}
		if config.Mode != "" {
			grpcSettings["multiMode"] = config.Mode == "multi"
		}
		stream["grpcSettings"] = grpcSettings

	case "tcp":
		if config.HeaderType != "" && config.HeaderType != "none" {
			tcpSettings := map[string]interface{}{
				"header": map[string]interface{}{
					"type": config.HeaderType,
				},
			}
			stream["tcpSettings"] = tcpSettings
		}

	case "kcp", "mkcp":
		kcpSettings := map[string]interface{}{}
		if config.HeaderType != "" {
			kcpSettings["header"] = map[string]interface{}{
				"type": config.HeaderType,
			}
		}
		stream["kcpSettings"] = kcpSettings
	}

	return stream
}

// Native Messaging protocol: 4-byte length prefix (little-endian uint32) + JSON
type NativeReader struct {
	reader io.Reader
}

func NewNativeReader(r io.Reader) *NativeReader {
	return &NativeReader{reader: r}
}

func (nr *NativeReader) ReadMessage() ([]byte, error) {
	lenBuf := make([]byte, 4)
	if _, err := io.ReadFull(nr.reader, lenBuf); err != nil {
		return nil, err
	}
	msgLen := binary.LittleEndian.Uint32(lenBuf)
	if msgLen == 0 {
		return nil, io.EOF
	}
	msgBuf := make([]byte, msgLen)
	if _, err := io.ReadFull(nr.reader, msgBuf); err != nil {
		return nil, err
	}
	return msgBuf, nil
}

func sendResponse(resp Response) {
	data, _ := json.Marshal(resp)
	lenBuf := make([]byte, 4)
	binary.LittleEndian.PutUint32(lenBuf, uint32(len(data)))
	os.Stdout.Write(lenBuf)
	os.Stdout.Write(data)
}

// Placeholder to use imports
var _ = base64.StdEncoding
var _ = url.Values{}
var _ = strconv.Itoa
var _ = strings.TrimSpace
