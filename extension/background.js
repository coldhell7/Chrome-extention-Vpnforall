let nativePort = null;
let connected = false;
let activeConfig = null;
let proxyPort = 10801;
let stats = { uploadBytes: 0, downloadBytes: 0, uploadSpeed: 0, downloadSpeed: 0, lastCheck: Date.now() };
let statsInterval = null;

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ connected: false });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'connect':
      handleConnect(message.config, sendResponse);
      return true;
    case 'disconnect':
      handleDisconnect(sendResponse);
      return true;
    case 'getTraffic':
      sendResponse(stats);
      return true;
    case 'nativeStatus':
      sendResponse({ connected: nativePort !== null });
      return true;
  }
});

function handleConnect(config, sendResponse) {
  if (nativePort) {
    sendResponse({ success: false, error: 'Already connected. Disconnect first.' });
    return;
  }

  // Find next available port
  getNextPort((port) => {
    proxyPort = port;

    // Connect to native host
    try {
      nativePort = chrome.runtime.connectNative('com.vpnforall.native');
    } catch (e) {
      sendResponse({ success: false, error: 'Native host not found. Please install the native messaging host first. See README for instructions.' });
      return;
    }

    let timeout = setTimeout(() => {
      if (nativePort) {
        nativePort.disconnect();
        nativePort = null;
      }
      sendResponse({ success: false, error: 'Connection timeout. Native host did not respond.' });
    }, 10000);

    nativePort.onMessage.addListener((msg) => {
      clearTimeout(timeout);
      if (msg.type === 'error') {
        nativePort.disconnect();
        nativePort = null;
        sendResponse({ success: false, error: msg.message || 'Native host error' });
        return;
      }
      if (msg.type === 'ready' || msg.type === 'started') {
        activeConfig = config;
        connected = true;
        setProxy(proxyPort);
        chrome.storage.local.set({ connected: true, activeConfigKey: config.key || '' });
        startTrafficMonitor();
        sendResponse({ success: true, port: proxyPort });
      }
    });

    nativePort.onDisconnect.addListener(() => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: 'Native host disconnected: ' + chrome.runtime.lastError.message });
      }
      nativePort = null;
      connected = false;
      chrome.storage.local.set({ connected: false });
      clearProxy();
      stopTrafficMonitor();
    });

    // Send config to native host
    nativePort.postMessage({
      action: 'start',
      config: {
        protocol: config.protocol || config.type?.toLowerCase() || 'vless',
        server: config.server,
        port: parseInt(config.port) || 443,
        uuid: config.uuid || config.password || config.id || '',
        flow: config.flow || '',
        encryption: config.encryption || 'none',
        security: config.security || '',
        sni: config.sni || config.server,
        fp: config.fp || '',
        pbk: config.pbk || '',
        sid: config.sid || '',
        spx: config.spx || '',
        type: config.type_param || 'tcp',
        headerType: config.header_type || 'none',
        path: config.path || '',
        host: config.host || '',
        serviceName: config.serviceName || '',
        mode: config.mode || '',
        tls: config.tls || '',
        aid: config.aid || '0',
        password: config.password || '',
        peer: config.peer || '',
        localPort: proxyPort
      }
    });
  });
}

function handleDisconnect(sendResponse) {
  if (nativePort) {
    nativePort.postMessage({ action: 'stop' });
    nativePort.disconnect();
    nativePort = null;
  }
  connected = false;
  activeConfig = null;
  clearProxy();
  stopTrafficMonitor();
  chrome.storage.local.set({ connected: false, activeConfigKey: null });
  stats = { uploadBytes: 0, downloadBytes: 0, uploadSpeed: 0, downloadSpeed: 0, lastCheck: Date.now() };
  if (sendResponse) sendResponse({ success: true });
}

function setProxy(port) {
  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: 'socks5',
        host: '127.0.0.1',
        port: port
      }
    }
  };
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Proxy error:', chrome.runtime.lastError);
    }
  });
}

function clearProxy() {
  chrome.proxy.settings.clear({ scope: 'regular' });
}

function startTrafficMonitor() {
  stats.lastCheck = Date.now();
  if (statsInterval) clearInterval(statsInterval);
  statsInterval = setInterval(() => {
    if (!nativePort) return;
    nativePort.postMessage({ action: 'getTraffic' });
    // Note: native host would respond with traffic data via onMessage
    // For now simulate incremental traffic changes
    const now = Date.now();
    const elapsed = (now - stats.lastCheck) / 1000;
    if (elapsed > 0) {
      stats.uploadSpeed = Math.floor(Math.random() * 1000);
      stats.downloadSpeed = Math.floor(Math.random() * 5000);
      stats.uploadBytes += stats.uploadSpeed;
      stats.downloadBytes += stats.downloadSpeed;
    }
    stats.lastCheck = now;
  }, 1000);
}

function stopTrafficMonitor() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
}

function getNextPort(callback) {
  chrome.storage.local.get(['usedPorts'], (data) => {
    let usedPorts = data.usedPorts || {};
    let port = 10801;
    while (usedPorts[port]) {
      port += 2;
      if (port > 10999) port = 10801;
    }
    usedPorts[port] = true;
    chrome.storage.local.set({ usedPorts }, () => callback(port));
  });
}

// Listen for proxy errors
chrome.proxy.onProxyError.addListener((details) => {
  console.error('Proxy error:', details);
});
