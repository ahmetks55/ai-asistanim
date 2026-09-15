// AI Asistanım - Köprü Sunucusu
// localhost:8788 dinler.
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');

const PORT = 8788;
const OUTDIR = path.join(__dirname, 'bridge_output');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

// Config dosyası yolu
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Config yükle
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch(e) { console.log('[Config] Okuma hatası:', e.message); }
  return {};
}

// Config kaydet
function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    console.log('[Config] Kaydedildi');
  } catch(e) { console.log('[Config] Yazma hatası:', e.message); }
}

let config = loadConfig();

const ALLOWED_ORIGINS = [
  'https://ahmetks55.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

function originAllowed(origin) {
  if (!origin) return true;
  if (origin === 'null') return true;
  return ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o + ':'));
}

function send(res, code, obj, origin) {
  const allow = originAllowed(origin) ? origin || '*' : 'null';
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj));
}

const MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8'
};

function serveFile(res, relPath, origin) {
  const safe = path.normalize(path.join(OUTDIR, relPath));
  if (!safe.startsWith(OUTDIR + path.sep)) {
    res.writeHead(403); return res.end('Yasak');
  }
  fs.stat(safe, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('Yok'); }
    const ext = path.extname(safe).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Content-Length': st.size });
    fs.createReadStream(safe).pipe(res);
  });
}

// ===== NARAROUTER =====
const NARA_DEFAULT_KEY = 'sk-nry-Sjg_ciKWNPY6IhrE47VA2VlMjSnNbkqN3J3hXfR32X4';
const NARA_CHAT_URL = 'https://router.bynara.id/v1/chat/completions';
function naraChat(task, context, key, cb) {
  const k = key || config.naraKey || NARA_DEFAULT_KEY;
  console.log('[NaraRouter] İstek gönderiliyor... Key:', k ? 'var (' + k.substring(0,10) + '...)' : 'YOK');
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const body = JSON.stringify({ model: 'tencent-hy3-free', messages: msgs, max_tokens: 1024 });
  console.log('[NaraRouter] URL:', NARA_CHAT_URL);
  const url = new URL(NARA_CHAT_URL);
  const req = https.request({
    hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
    headers: { 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json' },
    timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      console.log('[NaraRouter] Status:', res.statusCode);
      if (res.statusCode >= 400) {
        console.log('[NaraRouter] Hata detayı:', data.slice(0, 500));
        return cb(new Error('Nara HTTP ' + res.statusCode + ': ' + data.slice(0, 200)));
      }
      try {
        const j = JSON.parse(data);
        const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        console.log('[NaraRouter] Başarılı, yanıt uzunluğu:', text.length);
        cb(null, text.trim() || null);
      } catch(e) {
        console.log('[NaraRouter] Parse hatası:', e.message);
        cb(null, null);
      }
    });
  });
  req.on('error', (e) => { console.log('[NaraRouter] Bağlantı hatası:', e.message); cb(e); });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.write(body);
  req.end();
}

// ===== NVIDIA NIM =====
function nvidiaChat(task, context, key, cb) {
  const k = key || config.nvidiaKey || '';
  console.log('[NVIDIA] İstek... Key:', k ? 'var' : 'YOK');
  if (!k) return cb(new Error('NVIDIA anahtarı yok'));
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const body = JSON.stringify({ model: 'deepseek-ai/deepseek-v4-flash-0731', messages: msgs, max_tokens: 1024, temperature: 0.7, top_p: 0.95 });
  const req = https.request({
    hostname: 'integrate.api.nvidia.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 60000
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      console.log('[NVIDIA] Status:', res.statusCode);
      if (res.statusCode >= 400) {
        console.log('[NVIDIA] Hata:', data.slice(0, 500));
        return cb(new Error('NVIDIA HTTP ' + res.statusCode + ': ' + data.slice(0, 200)));
      }
      try {
        const j = JSON.parse(data);
        const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        if (!text) console.log('[NVIDIA] Boş yanıt:', JSON.stringify(j).slice(0, 300));
        cb(null, text.trim() || null);
      } catch(e) { console.log('[NVIDIA] Parse hatası:', e.message); cb(null, null); }
    });
  });
  req.on('error', (e) => { console.log('[NVIDIA] Hata:', e.message); cb(e); });
  req.on('timeout', () => { console.log('[NVIDIA] TIMEOUT 60s!'); req.destroy(new Error('NVIDIA API timeout - 60 saniye')); });
  req.write(body);
  req.end();
}

// ===== AIRFORCE (Mimo) =====
function airforceChat(task, context, key, cb) {
  const k = key || config.airforceKey || '';
  if (!k) return cb(new Error('Airforce anahtarı yok'));
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const body = JSON.stringify({ model: 'mimo-v2.5-pro', messages: msgs, max_tokens: 1024 });
  const req = https.request({
    hostname: 'api.airforce',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      console.log('[Airforce] Status:', res.statusCode);
      if (res.statusCode >= 400) {
        console.log('[Airforce] Hata:', data.slice(0, 500));
        return cb(new Error('Airforce HTTP ' + res.statusCode + ': ' + data.slice(0, 200)));
      }
      try {
        const j = JSON.parse(data);
        const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        if (!text) console.log('[Airforce] Boş yanıt:', JSON.stringify(j).slice(0, 300));
        cb(null, text.trim() || null);
      } catch(e) { console.log('[Airforce] Parse hatası:', e.message); cb(null, null); }
    });
  });
  req.on('error', (e) => { console.log('[Airforce] Bağlantı hatası:', e.message); cb(e); });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.write(body);
  req.end();
}

// ===== GEMINI =====
function geminiChat(task, context, cb) {
  const k = config.geminiKey || '';
  if (!k) return cb(new Error('Gemini anahtarı yok'));
  const body = JSON.stringify({
    contents: [{ parts: [{ text: (context ? context + '\n\n' : '') + task }] }],
    systemInstruction: { parts: [{ text: 'Sen Türkçe konuşan yardımsever ve detaylı bir AI asistanısın.' }] }
  });
  const req = https.request({
    hostname: 'generativelanguage.googleapis.com', port: 443,
    path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + k,
    method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      if (res.statusCode >= 400) return cb(new Error('Gemini HTTP ' + res.statusCode));
      try {
        const j = JSON.parse(data);
        const text = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] && j.candidates[0].content.parts[0].text) || '';
        cb(null, text.trim() || null);
      } catch(e) { cb(null, null); }
    });
  });
  req.on('error', (e) => cb(e));
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.write(body);
  req.end();
}

// ===== BEYNİ ÇALIŞTIR =====
function runBrain(brain, task, context, keys, cb) {
  const ctx = context || 'Sen Türkçe konuşan yardımsever bir asistansın. Kısa ve net cevap ver.';
  const naraKey = keys.naraKey || config.naraKey || NARA_DEFAULT_KEY;

  if (brain === 'nvidia') {
    nvidiaChat(task, ctx, keys.nvidiaKey, (err, text) => {
      if (!err && text) return cb(null, { status: 'done', plan: ['nvidia'], results: [{ type: 'brain', text }] });
      cb(err || new Error('NVIDIA yanıt vermedi'));
    });
  } else if (brain === 'airforce') {
    airforceChat(task, ctx, keys.airforceKey, (err, text) => {
      if (!err && text) return cb(null, { status: 'done', plan: ['airforce'], results: [{ type: 'brain', text }] });
      cb(err || new Error('Airforce yanıt vermedi'));
    });
  } else {
    // NaraRouter
    naraChat(task, ctx, naraKey, (err, text) => {
      if (!err && text) return cb(null, { status: 'done', plan: ['nara'], results: [{ type: 'brain', text }] });
      cb(err || new Error('NaraRouter yanıt vermedi'));
    });
  }
}

// ===== HTTP SERVER =====
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && !originAllowed(origin)) {
    res.writeHead(403); return res.end(JSON.stringify({ error: 'İzin yok' }));
  }
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);

  // Health
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, tool: 'köprü' }, origin);
  }

  // Test brain
  if (req.method === 'GET' && req.url === '/test-brain') {
    const brain = 'nara';
    const keys = { naraKey: config.naraKey || '', nvidiaKey: config.nvidiaKey || '', airforceKey: config.airforceKey || '' };
    runBrain(brain, 'Merhaba, nasılsın?', '', keys, (err, result) => {
      if (err) return send(res, 200, { error: err.message, config: { nara: !!keys.naraKey, nvidia: !!keys.nvidiaKey, airforce: !!keys.airforceKey } }, origin);
      send(res, 200, result, origin);
    });
    return;
  }

  // Config durumu
  if (req.method === 'GET' && req.url === '/config') {
    return send(res, 200, {
      nvidia: { hasKey: !!config.nvidiaKey },
      airforce: { hasKey: !!config.airforceKey },
      nara: { hasKey: !!config.naraKey },
      gemini: { hasKey: !!config.geminiKey }
    }, origin);
  }

  // Key kaydet
  if (req.method === 'POST' && req.url === '/save-key') {
    let body = '';
    req.on('data', (c) => { body += c; if (Buffer.byteLength(body, 'utf8') > 1048576) body = ''; });
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        if (p.provider && p.key) {
          config[p.provider + 'Key'] = p.key;
          saveConfig(config);
          return send(res, 200, { ok: true, message: p.provider + ' anahtarı kaydedildi' }, origin);
        }
      } catch(e) {}
      send(res, 400, { error: 'Geçersiz veri' }, origin);
    });
    return;
  }

  // Brain (ana sohbet endpoint'i)
  if (req.method === 'POST' && req.url === '/brain') {
    let body = '';
    req.on('data', (c) => { body += c; if (Buffer.byteLength(body, 'utf8') > 1048576) body = ''; });
    req.on('end', () => {
      let task = '', context = '', brain = 'nara';
      let keys = {};
      try {
        const p = JSON.parse(body);
        task = p.task || '';
        context = p.context || '';
        brain = p.brain || 'nara';
        keys = { nvidiaKey: p.nvidiaKey || config.nvidiaKey || '', airforceKey: p.airforceKey || config.airforceKey || '', naraKey: p.naraKey || config.naraKey || '' };
      } catch(e) { task = body; }
      if (!task) return send(res, 400, { error: 'Görev boş' }, origin);

      runBrain(brain, task, context, keys, (err, result) => {
        if (err || !result) {
          return send(res, 200, { status: 'needs_brain', reason: err ? err.message : 'Beyin yanıt vermedi' }, origin);
        }
        send(res, 200, result, origin);
      });
    });
    return;
  }

  // Görsel servisi
  if (req.method === 'GET' && req.url.startsWith('/goruntu/')) {
    return serveFile(res, decodeURIComponent(req.url.slice('/goruntu/'.length)), origin);
  }

  // Eski /run endpoint'i (geriye dönük uyumluluk)
  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let task = '', context = '';
      try { const p = JSON.parse(body); task = p.task || ''; context = p.context || ''; } catch(e) { task = body; }
      if (!task) return send(res, 400, { error: 'Görev boş' }, origin);
      runBrain('nara', task, context, {}, (err, result) => {
        if (err || !result) return send(res, 200, { status: 'needs_brain', reason: 'Beyin yanıt vermedi' }, origin);
        send(res, 200, result, origin);
      });
    });
    return;
  }

  send(res, 404, { error: 'Bilinmeyen yol' }, origin);
});

server.listen(PORT, () => {
  console.log('=========================================');
  console.log('  AI Asistanım Köprü Sunucusu');
  console.log('  http://localhost:' + PORT);
  console.log('=========================================');
  console.log('  Config: ' + CONFIG_PATH);
  console.log('  NaraKey: ' + (config.naraKey ? '✓' : '✗'));
  console.log('  NvidiaKey: ' + (config.nvidiaKey ? '✓' : '✗'));
  console.log('  AirforceKey: ' + (config.airforceKey ? '✓' : '✗'));
  console.log('=========================================');
});

process.on('uncaughtException', (e) => console.log('Hata:', e.message));
