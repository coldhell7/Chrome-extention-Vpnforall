# VPN for All — V2Ray Proxy Manager

[![GitHub release](https://img.shields.io/github/v/release/coldhell7/Chrome-extention-Vpnforall?color=blue&style=flat-square)](https://github.com/coldhell7/Chrome-extention-Vpnforall/releases)
[![License](https://img.shields.io/github/license/coldhell7/Chrome-extention-Vpnforall?style=flat-square)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-✓-brightgreen?style=flat-square&logo=googlechrome)](https://google.com/chrome)
[![Edge](https://img.shields.io/badge/edge-✓-brightgreen?style=flat-square&logo=microsoftedge)](https://microsoft.com/edge)
[![Brave](https://img.shields.io/badge/brave-✓-brightgreen?style=flat-square&logo=brave)](https://brave.com)
[![Chromium](https://img.shields.io/badge/chromium-✓-brightgreen?style=flat-square&logo=chromium)](https://chromium.org)

**VPN for All** is a Chrome extension that connects to V2Ray / VLESS / VMess / Trojan proxy servers and routes all your browser traffic through a secure encrypted tunnel. Just paste your config link and connect — it's that simple.

---

## Screenshots

```
┌─────────────────────────────────────────────────────────────┐
│  ■ VPN4All                                          ○ Connected │
│─────────────────────────────────────────────────────────────│
│  [Connect]  [Profiles]  [Stats]                             │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Paste V2Ray / VLESS / VMess / Trojan Config Link           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ vless://uuid@server.com:443?security=tls&...        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type       VLESS                                      │    │
│  │ Server     server.com                                 │    │
│  │ Port       443                                        │    │
│  │ Name       My Server                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [+ Add to Profiles]           [Connect] ████████████      │
│                                                             │
│  Paste a vless://, vmess://, or trojan:// link to connect  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ■ VPN4All                                          ○ Connected │
│─────────────────────────────────────────────────────────────│
│  [Connect]  [Profiles]  [Stats]                             │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  📋 No saved profiles yet.                                  │
│                                                             │
│  Paste a config link in the Connect tab and save it.        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ■ VPN4All                                          ● Connected │
│─────────────────────────────────────────────────────────────│
│  [Connect]  [Profiles]  [Stats]                             │
│─────────────────────────────────────────────────────────────│
│  TRAFFIC STATISTICS                                         │
│                                                             │
│       ▲ 1.2 MB                  ▼ 5.7 MB                    │
│     340 B/s ↑               1.2 KB/s ↓                      │
│     Upload                   Download                       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  CONNECTION                                                 │
│                                                             │
│  Status           ● Connected                               │
│  Connected Since  10:32:45 AM                               │
│  Active Profile   My Server                                 │
│                                                             │
│  [█████████████████████ Disconnect ██████████████████████]   │
└─────────────────────────────────────────────────────────────┘
```

## Features

- ✅ **Instant connect** — Paste any `vless://`, `vmess://`, or `trojan://` link and connect in one click
- ✅ **Multi-profile** — Save and switch between multiple server profiles
- ✅ **All protocols supported** — VLESS, VMess, Trojan (with Reality, XTLS, WebSocket, gRPC, TCP, etc.)
- ✅ **Real-time traffic stats** — Monitor upload/download speed and total data usage
- ✅ **Proxy isolation** — Routes only Chrome/Chromium traffic, not system-wide
- ✅ **PER-PROFILE support** — Each Chrome profile can use a different server on a different port
- ✅ **Lightweight** — Minimal UI, no bloat, just works
- ✅ **Open source** — MIT licensed, fully transparent

## Supported Protocols & Transports

| Protocol | Status |
|----------|--------|
| VLESS (with Reality, XTLS, Vision) | ✅ |
| VMess (with AEAD, WebSocket, gRPC) | ✅ |
| Trojan | ✅ |
| VLESS + TCP | ✅ |
| VLESS + WebSocket + TLS | ✅ |
| VLESS + gRPC | ✅ |
| VLESS + Reality | ✅ |
| VMess + TCP + WebSocket | ✅ |
| VMess + gRPC | ✅ |
| Trojan + TLS | ✅ |

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Popup     │────▶│  Background  │────▶│  Native Host    │────▶│  Xray Core   │
│  (UI/Config)│     │  (Service    │     │  (Go binary)    │     │  (SOCKS5     │
│             │     │   Worker)    │     │  runs xray      │     │   :10801)    │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                           │                                                │
                           ▼                                                ▼
                    ┌──────────────┐                               ┌──────────────────┐
                    │ chrome.proxy │                               │ All Chrome       │
                    │  API (MV3)   │──────────────────────────────▶│ traffic →        │
                    │  socks5://   │                               │ V2Ray Server     │
                    │  127.0.0.1   │                               │ → Internet       │
                    └──────────────┘                               └──────────────────┘
```

**Flow:**
1. User pastes a config link (`vless://...`, `vmess://...`, `trojan://...`) in the popup
2. Extension parses the config and sends it to the native host via Chrome Native Messaging
3. Native host generates Xray-compatible JSON config and launches Xray core as a local SOCKS5 proxy
4. Extension sets Chrome proxy settings (`chrome.proxy` API) to point to `127.0.0.1:SOCKS5_PORT`
5. All browser traffic is now routed through the V2Ray server
6. Real-time traffic statistics are displayed in the popup

> **Note:** This extension requires a **native messaging host** component to run the Xray core binary. Chrome extensions cannot implement raw TCP/VLESS protocol directly due to browser sandbox restrictions. See [Installation](#installation) for setup instructions.

## Installation

### Prerequisites

- Google Chrome, Microsoft Edge, Brave, or any Chromium-based browser
- Go 1.21+ (to build the native host — or use the pre-built binary from the [Releases](https://github.com/coldhell7/Chrome-extention-Vpnforall/releases) page)
- A V2Ray/VLESS/VMess/Trojan server config link

### Step 1: Install the Extension

#### Option A: Load Unpacked (Developer Mode)
1. Download this repository:
   ```bash
   git clone https://github.com/coldhell7/Chrome-extention-Vpnforall.git
   cd Chrome-extention-Vpnforall
   ```
2. Open `chrome://extensions/` in your browser
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked** and select the `extension/` folder

#### Option B: Install CRX (Release)
1. Download `vpnforall.crx` from the [Releases](https://github.com/coldhell7/Chrome-extention-Vpnforall/releases) page
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Drag and drop `vpnforall.crx` onto the page

### Step 2: Install the Native Messaging Host

> **Why?** Chrome extensions cannot directly implement V2Ray/VLESS protocol. The native host runs the Xray core, which does the actual proxy work.

#### On macOS / Linux

```bash
# Make the installer executable
chmod +x native-host/install.sh

# Run the installer
./native-host/install.sh
```

The installer will:
1. Build the Go native host binary
2. Download Xray core from GitHub releases
3. Register the native messaging host with Chrome
4. Ask for your **Extension ID** — copy it from `chrome://extensions/`

#### On Windows (PowerShell)

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the installer
.\native-host\install.ps1
```

The installer will:
1. Build the Go native host binary
2. Download Xray core from GitHub releases
3. Register the native messaging host in the registry
4. Ask for your **Extension ID** — copy it from `chrome://extensions/`

### Step 3: Get Your Extension ID

1. Go to `chrome://extensions/`
2. Find **VPN for All** in the list
3. Copy its **ID** (e.g., `abcdefghijklmnopabcdefghijklmnop`)
4. Enter this ID when prompted by the installer script

### Step 4: Reload & Connect

1. After installation, go back to `chrome://extensions/`
2. Click the **Refresh** icon on the VPN for All card
3. Click the extension icon in your toolbar
4. Paste your config link (e.g., `vless://...`) and click **Connect**

## Usage

### Connecting to a Server

1. Click the VPN for All icon in your Chrome toolbar
2. Paste your config link into the text area:
   ```
   vless://your-uuid@your-server.com:443?security=tls&sni=your-server.com&type=tcp&encryption=none#My%20Server
   ```
3. Click **Connect**
4. Chrome traffic is now routed through your V2Ray server

### Saving Profiles

1. Paste a config link
2. Click **+ Add to Profiles**
3. Switch to the **Profiles** tab to see your saved servers
4. Click **Connect** on any saved profile to quickly switch

### Multi-Profile Setup

Each Chrome profile can use a **different proxy server** on a **different port**:

| Chrome Profile | Port | Server |
|---------------|------|--------|
| Default | 10801 | 🇯🇵 Japan |
| Work | 10803 | 🇺🇸 US |
| Personal | 10805 | 🇸🇬 Singapore |

> **Important:** Use different ports for different Chrome profiles. Each port corresponds to a separate Xray process.

### Traffic Stats

The **Stats** tab shows:
- **Upload** — Total data sent + current upload speed
- **Download** — Total data received + current download speed
- **Connection** — Current status, connection time, active profile

## Building from Source

### Prerequisites

- Go 1.21+
- Node.js 18+
- OpenSSL (for CRX signing)

### Build Everything

```bash
# Clone the repo
git clone https://github.com/coldhell7/Chrome-extention-Vpnforall.git
cd Chrome-extention-Vpnforall

# Run the build script
chmod +x build.sh
./build.sh
```

The build script:
1. Compiles native host binaries for all platforms (Linux/macOS/Windows × amd64/arm64)
2. Creates `dist/vpnforall.crx` (packed Chrome extension)
3. Creates `dist/vpnforall.zip` (unpacked extension archive)
4. Copies installer scripts to `dist/`

### Output Structure

```
dist/
├── vpnforall.crx                        # Packed Chrome extension
├── vpnforall.zip                        # Unpacked extension archive
├── vpnforall-host-linux-amd64           # Native host (Linux x64)
├── vpnforall-host-linux-arm64           # Native host (Linux ARM)
├── vpnforall-host-darwin-amd64          # Native host (macOS Intel)
├── vpnforall-host-darwin-arm64          # Native host (macOS Apple Silicon)
├── vpnforall-host-windows-amd64.exe     # Native host (Windows x64)
├── install.sh                           # Linux/macOS installer
├── install.ps1                          # Windows installer
├── com.vpnforall.native.json            # Native messaging manifest template
└── key.pem                              # Extension private key
```

## Project Structure

```
Chrome-extention-Vpnforall/
├── extension/                 # Chrome extension source
│   ├── manifest.json          # Manifest V3 config
│   ├── popup.html             # Popup UI
│   ├── popup.js               # Popup logic + config parsing
│   ├── background.js          # Service worker (proxy + native messaging)
│   └── icons/                 # Extension icons
├── native-host/               # Native messaging host (Go)
│   ├── go.mod                 # Go module
│   ├── main.go                # Native host implementation
│   ├── install.sh             # Linux/macOS installer
│   ├── install.ps1            # Windows installer
│   └── com.vpnforall.native.json  # Native messaging manifest
├── dist/                      # Build output
├── build.sh                   # Build script
└── README.md                  # This file
```

## FAQ / Troubleshooting

### "Native host not found" error

- Make sure you ran the installer script (`install.sh` or `install.ps1`)
- Verify the native messaging manifest is in the correct location:
  - **macOS:** `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
  - **Linux:** `~/.config/google-chrome/NativeMessagingHosts/`
  - **Windows:** `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\`
- Check that the Extension ID in the manifest matches your extension's ID

### Connection fails after clicking Connect

- Check your server config is valid (paste it in another V2Ray client to test)
- Verify the Xray binary downloaded correctly: check `~/.vpnforall/xray`
- Look at the extension logs: `chrome://extensions/` → VPN for All → Service Worker → Console
- Check if port 10801 is already in use: `lsof -i :10801`

### "Port already in use" error

- Different Chrome profiles must use different ports (10801, 10803, 10805, etc.)
- Kill stale Xray processes:
  - **macOS/Linux:** `pkill xray`
  - **Windows:** Task Manager → find `xray.exe` → End Task

### Traffic stats show 0 B/s

- Traffic monitor updates every second
- Make sure there is active browser traffic
- Refresh the popup and check again

### Which browsers are supported?

- Google Chrome
- Microsoft Edge
- Mozilla Firefox (requires Firefox-specific native messaging paths)
- Brave
- Opera
- Any Chromium-based browser

### Why do I need a native host?

Chrome extensions run in a sandboxed JavaScript environment. They cannot:
- Create raw TCP/UDP sockets
- Execute system processes
- Implement the VLESS/VMess protocol directly

The native messaging host bridges this gap by running Xray core as a system process and communicating with the extension via stdin/stdout.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Chrome Extension | Manifest V3 (JavaScript) |
| Native Host | Go (compiled binary) |
| Proxy Core | [Xray-core](https://github.com/XTLS/Xray-core) |
| Proxy Protocol | SOCKS5 |
| Packaging | CRX3 format |

## License

[MIT](LICENSE)

## Credits

- [XTLS/Xray-core](https://github.com/XTLS/Xray-core) — The proxy core that powers this extension
- [Project V](https://www.v2fly.org/) — The original V2Ray project
- [razifijazi/v2ray-chrome-extension](https://github.com/razifijazi/v2ray-chrome-extension) — Reference implementation

## Disclaimer

This project is for educational and research purposes only. Users are responsible for complying with applicable laws and regulations in their jurisdiction. The authors are not responsible for any misuse of this software.
