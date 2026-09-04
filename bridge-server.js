// AI Asistan Köprü Sunucusu
// localhost:8788 dinler. Siteden gelen görevi alır, araçları çalıştırır, hazır dosya döner.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8788;
const OUTDIR = path.join(__dirname, 'bridge_output');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const ALLOWED_BRIDGE_ORIGINS = [
  'https://ahmetks55.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

// Kötü niyetli web sayfalarının yerel köprüyü kullanmasını engeller.
function originAllowed(origin) {
  if (!origin) return true; // tarayıcı dışı istemciler (curl, node) origin göndermez
  if (origin === 'null') return true; // file:// ile açılmış sayfa
  return ALLOWED_BRIDGE_ORIGINS.some((o) => origin === o || origin.startsWith(o + ':'));
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
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

// bridge_output içindeki bir dosyayı tarayıcıya servis et (görsel gösterimi + indirme)
function serveFile(res, relPath, origin) {
  const safe = path.normalize(path.join(OUTDIR, relPath));
  if (!safe.startsWith(path.normalize(OUTDIR)) || !safe.startsWith(OUTDIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Erişim yasak');
    return;
  }
  fs.stat(safe, (e, st) => {
    if (e || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Dosya yok');
      return;
    }
    const ext = path.extname(safe).toLowerCase();
    const ct = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': ct, 'Content-Length': st.size };
    if (origin && originAllowed(origin)) headers['Access-Control-Allow-Origin'] = origin;
    res.writeHead(200, headers);
    fs.createReadStream(safe).pipe(res);
  });
}

// Araçlar - her biri görevden parça alıp üretir
const tools = {
  // Görsel üretimi (Pollinations)
  imagetool: (prompt, cb) => {
    const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt.slice(0, 300)) + '?width=512&height=512&nologo=true';
    const file = path.join(OUTDIR, 'gorsel_' + Date.now() + '.jpg');
    require('https').get(url, (r) => {
      const f = fs.createWriteStream(file);
      r.pipe(f);
      f.on('finish', () => cb(null, file));
      f.on('error', (e) => cb(e));
    }).on('error', (e) => cb(e));
  },
  // Metin dosyası oluştur
  texttool: (prompt, cb) => {
    const file = path.join(OUTDIR, 'metin_' + Date.now() + '.txt');
    fs.writeFile(file, prompt, (e) => cb(e, e ? null : file));
  },
  listener: () => {}
};

// Görevi anahtar kelimelerle böl
function planTask(task) {
  const t = task.toLowerCase();
  const steps = [];
  const resimKW = /(resim|görsel|gorsel|foto|çiz|çizim|manzara|logo|tablo)/i;
  const videoKW = /(video|slayt|sunum)/i;
  const sesKW = /(seslendir|konuş|okuy|anlat|ses)/i;
  const metinKW = /(hikaye|şiir|siir|mektup|rapor|özet|ozet|metin|yaz|makale)/i;

  if (resimKW.test(t)) steps.push({ type: 'image', prompt: task });
  if (sesKW.test(t)) steps.push({ type: 'tts', prompt: task });
  if (videoKW.test(t)) steps.push({ type: 'video', prompt: task });
  if (metinKW.test(t) && steps.length === 0) steps.push({ type: 'text', prompt: task });
  if (!steps.length) steps.push({ type: 'text', prompt: 'Görev: ' + task });
  return steps;
}

function fileUrl(fname) {
  return 'http://localhost:' + PORT + '/goruntu/' + fname;
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && !originAllowed(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'İzin verilmeyen kaynak' }));
  }
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, tool: 'bridge' }, origin);
  if (req.method === 'GET' && req.url === '/models') return send(res, 200, { tools: ['image','text','tts','video'] }, origin);

  // Görsel/metin dosyasını tarayıcıya servis et: /goruntu/gorsel_123.jpg
  if (req.method === 'GET' && req.url.startsWith('/goruntu/')) {
    return serveFile(res, decodeURIComponent(req.url.slice('/goruntu/'.length)), origin);
  }

  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    let tooBig = false;
    req.on('data', (c) => {
      body += c;
      if (Buffer.byteLength(body, 'utf8') > 1048576) tooBig = true;
    });
    req.on('end', () => {
      if (tooBig) return send(res, 413, { error: 'Görev çok büyük' }, origin);
      let task = '';
      try { task = JSON.parse(body).task || ''; } catch (e) { task = body; }
      if (!task) return send(res, 400, { error: 'Görev boş' }, origin);
      const steps = planTask(task);
      const results = [];
      let done = 0;
      steps.forEach((s) => {
        if (s.type === 'image') {
          tools.imagetool(s.prompt, (err, file) => {
            const fname = err ? null : path.basename(file);
            results.push({ type: 'image', url: err ? null : fileUrl(fname), file: err ? null : file, error: err ? err.message : null });
            done++; if (done === steps.length) finish();
          });
        } else if (s.type === 'text') {
          tools.texttool(s.prompt, (err, file) => {
            const fname = err ? null : path.basename(file);
            results.push({ type: 'text', url: err ? null : fileUrl(fname), file: err ? null : file, content: err ? null : s.prompt, error: err ? err.message : null });
            done++; if (done === steps.length) finish();
          });
        } else {
          results.push({ type: s.type, note: 'Bu araç köprüde hazırlanıyor (ses/video tarayıcıda çalışır)' });
          done++; if (done === steps.length) finish();
        }
      });
      function finish() {
        send(res, 200, { task, steps: steps.map(s => s.type), results }, origin);
      }
    });
    return;
  }
  send(res, 404, { error: 'Bilinmeyen yol' }, origin);
});

server.listen(PORT, () => {
  console.log('Köprü sunucu http://localhost:' + PORT + ' çalışıyor');
  console.log('Dosyalar: ' + OUTDIR);
});

process.on('uncaughtException', (e) => console.log('Hata:', e.message));