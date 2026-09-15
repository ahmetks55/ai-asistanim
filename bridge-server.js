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
function naraChat(task, context, key, cb) {
  const k = key || config.naraKey || '';
  if (!k) return cb(new Error('NaraRouter anahtarı yok'));
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const body = JSON.stringify({ model: 'tencent-hy3-free', messages: msgs, max_tokens: 1024 });
  const url = new URL('https://router.bynara.id/v1/chat/completions');
  const req = https.request({
    hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
    headers: { 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json' },
    timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      if (res.statusCode >= 400) return cb(new Error('Nara HTTP ' + res.statusCode));
      try {
        const j = JSON.parse(data);
        const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        cb(null, text.trim() || null);
      } catch(e) { cb(null, null); }
    });
  });
  req.on('error', (e) => cb(e));
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.write(body);
  req.end();
}

// ===== NVIDIA NIM =====
function nvidiaChat(task, context, key, cb) {
  const k = key || config.nvidiaKey || '';
  if (!k) return cb(new Error('NVIDIA anahtarı yok'));
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const body = JSON.stringify({ model: 'meta/llama-3.3-70b-instruct', messages: msgs, max_tokens: 1024, stream: false });
  const req = https.request({
    hostname: 'integrate.api.nvidia.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json' },
    timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      if (res.statusCode >= 400) return cb(new Error('NVIDIA HTTP ' + res.statusCode));
      try {
        const j = JSON.parse(data);
        const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        cb(null, text.trim() || null);
      } catch(e) { cb(null, null); }
    });
  });
  req.on('error', (e) => cb(e));
  req.on('timeout', () => req.destroy(new Error('timeout')));
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
  const body = JSON.stringify({ model: 'mimo-v2.5-pro', messages: msgs, max_tokens: 1024, stream: false });
  const req = https.request({
    hostname: 'api.air.force',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json' },
    timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      if (res.statusCode >= 400) return cb(new Error('Airforce HTTP ' + res.statusCode));
      try {
        const j = JSON.parse(data);
        const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        cb(null, text.trim() || null);
      } catch(e) { cb(null, null); }
    });
  });
  req.on('error', (e) => cb(e));
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
    // Varsayılan: NaraRouter, başarısızsa fallback
    naraChat(task, ctx, keys.naraKey, (err, text) => {
      if (!err && text) return cb(null, { status: 'done', plan: ['nara'], results: [{ type: 'brain', text }] });
      // Fallback: NVIDIA varsa onu dene
      if (keys.nvidiaKey) {
        nvidiaChat(task, ctx, keys.nvidiaKey, (err2, text2) => {
          if (!err2 && text2) return cb(null, { status: 'done', plan: ['nvidia'], results: [{ type: 'brain', text: text2 }] });
          cb(new Error('Tüm beyinler yanıt vermedi'));
        });
      } else {
        cb(new Error('NaraRouter ve fallback beyinler yanıt vermedi'));
      }
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
