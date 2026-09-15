const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8788;
const CONFIG = path.join(__dirname, 'keys.json');

function loadKeys() {
  try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch(e) { return {}; }
}
function saveKeys(k) { fs.writeFileSync(CONFIG, JSON.stringify(k, null, 2)); }

function cors(res, origin) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
}

function proxy(targetUrl, headers, body, cb) {
  const u = new URL(targetUrl);
  const req = https.request({
    hostname: u.hostname, port: 443, path: u.pathname, method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 60000
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => cb(null, data));
  });
  req.on('error', e => cb(e));
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
  req.write(body);
  req.end();
}

const ENDPOINTS = {
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
  nara: 'https://router.bynara.id/v1/chat/completions',
  airforce: 'https://api.airforce/v1/chat/completions'
};

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  cors(res, origin);
  if (req.method === 'OPTIONS') return res.end();

  if (req.method === 'GET' && req.url === '/health') {
    return res.end(JSON.stringify({ ok: true }));
  }

  if (req.method === 'GET' && req.url === '/keys') {
    const k = loadKeys();
    return res.end(JSON.stringify({
      nvidia: !!k.nvidia, nara: !!k.nara, airforce: !!k.airforce
    }));
  }

  if (req.method === 'POST' && req.url === '/save-key') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const k = loadKeys();
        k[p.provider] = p.key;
        saveKeys(k);
        res.end(JSON.stringify({ ok: true }));
      } catch(e) { res.end(JSON.stringify({ error: 'Geçersiz veri' })); }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const keys = loadKeys();
        const k = keys[p.provider] || '';
        if (!k) return res.end(JSON.stringify({ error: p.provider + ' key yok. Ayarlardan girin.' }));

        const url = ENDPOINTS[p.provider];
        if (!url) return res.end(JSON.stringify({ error: 'Bilinmeyen provider: ' + p.provider }));

        const reqBody = JSON.stringify({
          model: p.model,
          messages: p.messages,
          max_tokens: 1024
        });

        proxy(url, { 'Authorization': 'Bearer ' + k }, reqBody, (err, data) => {
          if (err) return res.end(JSON.stringify({ error: err.message }));
          try {
            const j = JSON.parse(data);
            if (j.choices?.[0]?.message?.content) {
              res.end(JSON.stringify({ reply: j.choices[0].message.content }));
            } else {
              res.end(JSON.stringify({ error: j.error?.message || 'Yanıt alınamadı' }));
            }
          } catch(e) { res.end(JSON.stringify({ error: 'Parse hatası' })); }
        });
      } catch(e) { res.end(JSON.stringify({ error: 'Geçersiz veri' })); }
    });
    return;
  }

  res.end(JSON.stringify({ error: 'Bilinmeyen yol' }));
});

server.listen(PORT, () => {
  console.log('Köprü çalışıyor: http://localhost:' + PORT);
});
