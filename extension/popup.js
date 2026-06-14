// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('section-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'profiles') loadProfiles();
  });
});

// Load profiles on init
document.addEventListener('DOMContentLoaded', () => {
  loadProfiles();
  chrome.storage.local.get(['connected', 'activeConfigKey'], (data) => {
    if (data.connected) {
      updateUIForConnected(true);
      loadTrafficStats();
    }
  });
});

let configInput = document.getElementById('configInput');
let parsedConfig = null;
let toastTimer = null;

configInput.addEventListener('input', () => {
  const text = configInput.value.trim();
  if (!text) {
    document.getElementById('configDetails').style.display = 'none';
    document.getElementById('errorMsg').classList.remove('show');
    parsedConfig = null;
    return;
  }
  try {
    parsedConfig = parseConfig(text);
    showConfigDetails(parsedConfig);
    document.getElementById('errorMsg').classList.remove('show');
  } catch (e) {
    document.getElementById('configDetails').style.display = 'none';
    showError(e.message);
    parsedConfig = null;
  }
});

document.getElementById('addProfileBtn').addEventListener('click', () => {
  if (!parsedConfig) return;
  chrome.storage.local.get(['profiles'], (data) => {
    let profiles = data.profiles || [];
    const exists = profiles.some(p => p.key === parsedConfig.key);
    if (exists) {
      showToast('Profile already exists', 'error');
      return;
    }
    parsedConfig.name = parsedConfig.name || parsedConfig.server || 'Unnamed Server';
    profiles.push(parsedConfig);
    chrome.storage.local.set({ profiles }, () => {
      showToast('Profile added successfully');
      configInput.value = '';
      parsedConfig = null;
      document.getElementById('configDetails').style.display = 'none';
    });
  });
});

document.getElementById('connectBtn').addEventListener('click', () => {
  if (!parsedConfig) { showToast('Please paste a valid config link first', 'error'); return; }
  connectToServer(parsedConfig);
});

document.getElementById('disconnectBtn').addEventListener('click', disconnect);

function parseConfig(text) {
  text = text.trim();
  let parsed = { raw: text };

  if (text.startsWith('vless://')) {
    const u = new URL(text);
    parsed.type = 'VLESS';
    parsed.protocol = 'vless';
    parsed.server = u.hostname;
    parsed.port = u.port || '443';
    parsed.uuid = u.username;
    parsed.flow = u.searchParams.get('flow') || '';
    parsed.encryption = u.searchParams.get('encryption') || 'none';
    parsed.security = u.searchParams.get('security') || '';
    parsed.sni = u.searchParams.get('sni') || '';
    parsed.fp = u.searchParams.get('fp') || '';
    parsed.pbk = u.searchParams.get('pbk') || '';
    parsed.sid = u.searchParams.get('sid') || '';
    parsed.spx = u.searchParams.get('spx') || '';
    parsed.type_param = u.searchParams.get('type') || 'tcp';
    parsed.header_type = u.searchParams.get('headerType') || 'none';
    parsed.path = u.searchParams.get('path') || '';
    parsed.host = u.searchParams.get('host') || '';
    parsed.serviceName = u.searchParams.get('serviceName') || '';
    parsed.mode = u.searchParams.get('mode') || '';
    parsed.name = u.hash ? decodeURIComponent(u.hash.slice(1)) : '';
    parsed.key = `vless://${u.hostname}:${parsed.port}`;
    parsed.parsed = true;
  } else if (text.startsWith('vmess://')) {
    const b64 = text.slice(8);
    try {
      const decoded = atob(b64);
      const json = JSON.parse(decoded);
      parsed.type = 'VMess';
      parsed.protocol = 'vmess';
      parsed.server = json.add || json.address || '';
      parsed.port = json.port || '443';
      parsed.uuid = json.id || '';
      parsed.aid = json.aid || '0';
      parsed.security = json.security || 'auto';
      parsed.type_param = json.type || 'tcp';
      parsed.path = json.path || '';
      parsed.host = json.host || '';
      parsed.tls = json.tls ? 'tls' : '';
      parsed.sni = json.sni || '';
      parsed.name = json.ps || json.remark || '';
      parsed.key = `vmess://${parsed.server}:${parsed.port}`;
      parsed.parsed = true;
    } catch (e) {
      throw new Error('Invalid VMess config format');
    }
  } else if (text.startsWith('trojan://')) {
    const u = new URL(text);
    parsed.type = 'Trojan';
    parsed.protocol = 'trojan';
    parsed.server = u.hostname;
    parsed.port = u.port || '443';
    parsed.password = u.username;
    parsed.sni = u.searchParams.get('sni') || u.hostname;
    parsed.peer = u.searchParams.get('peer') || '';
    parsed.security = u.searchParams.get('security') || 'tls';
    parsed.name = u.hash ? decodeURIComponent(u.hash.slice(1)) : '';
    parsed.key = `trojan://${u.hostname}:${parsed.port}`;
    parsed.parsed = true;
  } else {
    try {
      const j = JSON.parse(text);
      parsed.type = j.protocol || 'Custom';
      parsed.protocol = j.protocol || 'custom';
      parsed.server = j.address || j.server || j.host || '';
      parsed.port = j.port || '443';
      parsed.uuid = j.id || j.uuid || '';
      parsed.key = `${parsed.protocol}://${parsed.server}:${parsed.port}`;
      parsed.rawJson = j;
      parsed.parsed = true;
    } catch (e) {
      throw new Error('Unsupported config format. Please use vless://, vmess://, or trojan:// links.');
    }
  }

  if (!parsed.server) throw new Error('Could not parse server address from config');
  return parsed;
}

function showConfigDetails(config) {
  const details = document.getElementById('configDetails');
  document.getElementById('detailType').textContent = config.type || '-';
  document.getElementById('detailServer').textContent = config.server || '-';
  document.getElementById('detailPort').textContent = config.port || '-';
  document.getElementById('detailName').textContent = config.name || 'Unnamed';
  details.style.display = 'block';
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
}

function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type === 'error' ? ' error' : '') + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function loadProfiles() {
  chrome.storage.local.get(['profiles', 'activeConfigKey', 'connected'], (data) => {
    const profiles = data.profiles || [];
    const list = document.getElementById('profilesList');
    if (!profiles.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No saved profiles yet.<br>Paste a config link in the Connect tab and save it.</p></div>';
      return;
    }
    list.innerHTML = profiles.map((p, i) => `
      <div class="profile-card ${data.connected && data.activeConfigKey === p.key ? 'active' : ''}">
        <div class="name">${escHtml(p.name || 'Unnamed')}</div>
        <div class="server">${escHtml(p.type || '?')} • ${escHtml(p.server)}:${escHtml(p.port)}</div>
        <div class="actions">
          <button class="connect-btn" data-index="${i}">Connect</button>
          <button class="delete-btn" data-index="${i}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.connect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        connectToServer(profiles[parseInt(btn.dataset.index)]);
      });
    });
    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        profiles.splice(parseInt(btn.dataset.index), 1);
        chrome.storage.local.set({ profiles }, () => loadProfiles());
      });
    });
  });
}

function connectToServer(config) {
  updateUIForConnecting();
  chrome.runtime.sendMessage({ action: 'connect', config }, (response) => {
    if (response && response.success) {
      updateUIForConnected(true);
      showToast('Connected to ' + (config.name || config.server));
      document.getElementById('section-stats').querySelector('#connStatus').textContent = 'Connected';
      document.getElementById('section-stats').querySelector('#connSince').textContent = new Date().toLocaleTimeString();
      loadTrafficStats();
    } else {
      updateUIForConnected(false);
      showToast('Connection failed: ' + (response ? response.error : 'Unknown error'), 'error');
    }
  });
}

function disconnect() {
  chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
    updateUIForConnected(false);
    showToast('Disconnected');
    document.getElementById('section-stats').querySelector('#connStatus').textContent = 'Disconnected';
    document.getElementById('section-stats').querySelector('#connSince').textContent = '-';
    document.getElementById('section-stats').querySelector('#activeProfile').textContent = '-';
  });
}

function updateUIForConnected(connected) {
  const badge = document.getElementById('statusBadge');
  if (connected) {
    badge.textContent = '● Connected';
    badge.className = 'status-badge connected';
    document.getElementById('connectBtn').textContent = 'Connected';
    document.getElementById('connectBtn').className = 'btn btn-disconnect';
    document.getElementById('connectBtn').onclick = disconnect;
  } else {
    badge.textContent = 'Disconnected';
    badge.className = 'status-badge';
    document.getElementById('connectBtn').textContent = 'Connect';
    document.getElementById('connectBtn').className = 'btn btn-connect';
    document.getElementById('connectBtn').onclick = () => {
      if (parsedConfig) connectToServer(parsedConfig);
      else showToast('Please paste a valid config link first', 'error');
    };
    document.getElementById('trafficTimer') && clearInterval(parseInt(document.getElementById('trafficTimer').dataset.timer));
  }
}

function updateUIForConnecting() {
  document.getElementById('statusBadge').textContent = '● Connecting...';
  document.getElementById('statusBadge').className = 'status-badge connecting';
}

function loadTrafficStats() {
  const timer = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'getTraffic' }, (response) => {
      if (!response) return;
      document.getElementById('uploadTotal').textContent = formatBytes(response.uploadBytes || 0);
      document.getElementById('downloadTotal').textContent = formatBytes(response.downloadBytes || 0);
      document.getElementById('uploadRate').textContent = formatBytes(response.uploadSpeed || 0) + '/s ↑';
      document.getElementById('downloadRate').textContent = formatBytes(response.downloadSpeed || 0) + '/s ↓';
    });
  }, 1000);
  const el = document.createElement('div');
  el.id = 'trafficTimer';
  el.dataset.timer = timer;
  document.body.appendChild(el);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
