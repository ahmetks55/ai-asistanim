// AI Asistan Köprü Sunucusu
// localhost:8788 dinler. Siteden gelen görevi alır, araçları çalıştırır, hazır dosya döner.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8788;
const OUTDIR = path.join(__dirname, 'bridge_output');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(obj));
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
  const webKW = /(ara|bul|internet|güncel|ogren|öğren)/i;

  if (resimKW.test(t)) steps.push({ type: 'image', prompt: task });
  if (sesKW.test(t)) steps.push({ type: 'tts', prompt: task });
  if (videoKW.test(t)) steps.push({ type: 'video', prompt: task });
  if (metinKW.test(t) && steps.length === 0) steps.push({ type: 'text', prompt: task });
  if (!steps.length) steps.push({ type: 'text', prompt: 'Görev: ' + task });
  return steps;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, tool: 'bridge' });
  if (req.method === 'GET' && req.url === '/models') return send(res, 200, { tools: ['image','text','tts','video'] });

  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      let task = '';
      try { task = JSON.parse(body).task || ''; } catch (e) { task = body; }
      if (!task) return send(res, 400, { error: 'Görev boş' });
      const steps = planTask(task);
      const results = [];
      let done = 0;
      steps.forEach((s) => {
        if (s.type === 'image') {
          tools.imagetool(s.prompt, (err, file) => {
            results.push({ type: 'image', file: err ? null : file, error: err ? err.message : null });
            done++; if (done === steps.length) finish();
          });
        } else if (s.type === 'text') {
          tools.texttool(s.prompt, (err, file) => {
            results.push({ type: 'text', file: err ? null : file, content: err ? null : s.prompt, error: err ? err.message : null });
            done++; if (done === steps.length) finish();
          });
        } else {
          results.push({ type: s.type, note: 'Bu araç köprüde hazırlanıyor (ses/video tarayıcıda çalışır)' });
          done++; if (done === steps.length) finish();
        }
      });
      function finish() {
        send(res, 200, { task, steps: steps.map(s => s.type), results });
      }
    });
    return;
  }
  send(res, 404, { error: 'Bilinmeyen yol' });
});

server.listen(PORT, () => {
  console.log('Köprü sunucu http://localhost:' + PORT + ' çalışıyor');
  console.log('Dosyalar: ' + OUTDIR);
});

process.on('uncaughtException', (e) => console.log('Hata:', e.message));
