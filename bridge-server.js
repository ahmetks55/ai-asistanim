// AI Asistan Yapay Şirket Köprüsü + Yönetici Katmanı
// localhost:8788 dinler. Gelen görevi ücretsiz araç havuzuna yönlendirir (yönetici),
// sonucu doğrular, takılırsa yeniden dener; akıl gerektiren işi "beyne devret" olarak işaretler.
// Not: "bunu/şunu/bu" gibi göndermeler son asistan metnini (ör. hikaye) context olarak kullanır.
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

function uniq(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function fileUrl(fname) {
  return 'http://localhost:' + PORT + '/goruntu/' + encodeURIComponent(fname);
}

// ---------------------------------------------------------------
// ARAÇ ÜRETİCİLERİ + DOĞRULAMA (takılırsa yeniden dene)
// ---------------------------------------------------------------

// Görsel üretimi (Pollinations) — doğrulama: dosya > 1KB olmalı, boşsa 1 kez daha dener.
function imageFromPrompt(prompt, cb, attempt) {
  attempt = attempt || 0;
  const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(String(prompt).slice(0, 300)) + '?width=768&height=768&nologo=true&model=flux';
  const file = path.join(OUTDIR, uniq('gorsel') + '.jpg');
  const req = https.get(url, { timeout: 25000 }, (r) => {
    if (r.statusCode >= 400) {
      req.destroy();
      if (attempt < 1) return setTimeout(() => imageFromPrompt(prompt, cb, attempt + 1), 1500);
      return cb(new Error('Görsel servisi ' + r.statusCode));
    }
    const f = fs.createWriteStream(file);
    r.pipe(f);
    f.on('finish', () => {
      let st;
      try { st = fs.statSync(file); } catch (e) { st = { size: 0 }; }
      if (st.size < 1024) {
        try { fs.unlinkSync(file); } catch (e) {}
        if (attempt < 1) return setTimeout(() => imageFromPrompt(prompt, cb, attempt + 1), 1500);
        return cb(new Error('Görsel boş döndü (doğrulama başarısız)'));
      }
      cb(null, file);
    });
    f.on('error', (e) => cb(e));
  });
  req.on('timeout', () => req.destroy(new Error('Görsel üretimi zaman aşımı')));
  req.on('error', (e) => {
    if (attempt < 1) return setTimeout(() => imageFromPrompt(prompt, cb, attempt + 1), 1500);
    cb(e);
  });
}

// Güvenli aritmetik çözücü (eval yok) — recursive descent
function safeEvalArithmetic(expr) {
  try {
    const s = expr.replace(/\s+/g, '');
    let i = 0;
    const peek = () => s[i];
    const number = () => {
      let n = '';
      while (i < s.length && /[0-9.]/.test(s[i])) { n += s[i]; i++; }
      return n ? parseFloat(n) : NaN;
    };
    function factor() {
      if (peek() === '(') {
        i++;
        const v = expression();
        if (peek() === ')') i++;
        return v;
      }
      const n = number();
      if (isNaN(n)) throw new Error('geçersiz');
      return n;
    }
    function term() {
      let v = factor();
      while (i < s.length && (s[i] === '*' || s[i] === '/')) {
        const op = s[i++];
        const r = factor();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    function expression() {
      let v = term();
      while (i < s.length && (s[i] === '+' || s[i] === '-')) {
        const op = s[i++];
        const r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    const v = expression();
    if (i !== s.length) throw new Error('geçersiz');
    return Number.isFinite(v) ? v : null;
  } catch (e) {
    return null;
  }
}

const trMap = (s) => s
  .replace(/(?<![\p{L}\p{N}_])(kere|çarpı|carp|ile|çarpılmış|carpilmis|katı|kati)(?![\p{L}\p{N}_])/giu, '*')
  .replace(/(?<![\p{L}\p{N}_])(artı|arti|ekle|topla|toplam)(?![\p{L}\p{N}_])/giu, '+')
  .replace(/(?<![\p{L}\p{N}_])(eksi|çıkar|cikar)(?![\p{L}\p{N}_])/giu, '-')
  .replace(/(?<![\p{L}\p{N}_])(bölü|bolu|böl|bol)(?![\p{L}\p{N}_])/giu, '/');

// Web araması (sunucuda — CORS derdi yok): DuckDuckGo Özet API + HTML yedeği
function scrapeDdg(query, cb) {
  const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 25000 }, (r) => {
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => {
      const out = [];
      const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      let m;
      while ((m = re.exec(d)) !== null && out.length < 3) {
        let link = m[1];
        const redir = link.match(/uddg=([^&]+)/);
        if (redir) { try { link = decodeURIComponent(redir[1]); } catch (e) {} }
        const title = m[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        if (title) out.push('• ' + title + '\n  ' + link);
      }
      cb(out.length ? out.join('\n') : null);
    });
  }).on('timeout', function () { this.destroy(new Error('Arama zaman aşımı')); })
    .on('error', () => cb(null));
}

function webSearch(query, cb) {
  const url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1';
  https.get(url, { timeout: 25000 }, (r) => {
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => {
      try {
        const data = JSON.parse(d);
        if (data.AbstractText) {
          return cb(null, '📚 ' + data.AbstractText + (data.AbstractURL ? '\n🔗 ' + data.AbstractURL : ''));
        }
        if (data.RelatedTopics && data.RelatedTopics.length) {
          const texts = data.RelatedTopics.map((t) => t.Text).filter(Boolean).slice(0, 3);
          if (texts.length) return cb(null, 'İlgili sonuçlar:\n• ' + texts.join('\n• '));
        }
        // Özet API'de sonuç yoksa HTML aramasıyla dene
        return scrapeDdg(query, (html) => cb(null, html || 'Bu konuda web sonucu bulunamadı.'));
      } catch (e) {
        return scrapeDdg(query, (html) => cb(null, html || 'Web araması şu an çalışmadı.'));
      }
    });
  }).on('timeout', function () { this.destroy(new Error('Arama zaman aşımı')); })
    .on('error', (e) => cb(e));
}

// ---------------------------------------------------------------
// YÖNETİCİ: görevi anla, ücretsiz araca yönlendir
// ---------------------------------------------------------------

// "bunu/şunu/bu/şu/onu" gibi göndermeler son asistan metnini (ör. hikaye) kullanır.
function resolveSubject(task, context) {
  const ref = /(bunu|şunu|sunu|bu\b|şu\b|su\b|onu|bunun|şunun)\b/i.test(task);
  return ref && context ? String(context).trim() : task;
}

const stripPrompt = (s) => s
  .replace(/lütfen|lutfen|bana|bir|görsel|gorsel|resim|fotoğraf|fotograf|çiz\/?|çizim|yap|oluştur|olustur|göster|goster|ver|üret|uret|sağla|sagla|teşekkürler|tesekkurler|teşekkurler|li|li\s+olsun/gi, '')
  .trim();

const stripSpeak = (s) => s
  .replace(/(lütfen|lutfen|bunu|şunu|sunu|şu|su|onu|metni|sesli|seslendir|oku|konuş|konus|dinle|yap|olarak|artık|artik|ve|ayrıca)/gi, '')
  .trim();

const stripSearch = (s) => s
  .replace(/(lütfen|lutfen|internette|web'de|webde|internet|google'da|ara\b|şunu|sunu|şu|su|güncel|guncel|bilgi|yap|hakkında|hakkinda|ver)/gi, '')
  .trim();

// Uzun metni sahnelere böl (önce satır, yoksa cümle bazında)
function splitScenes(subject, max) {
  max = max || 4;
  const raw = String(subject || '').trim();
  const parts = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  let sentences = parts.length > 1 ? parts : raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (!sentences.length) sentences = ['İçerik bulunamadı, genel bir anlatım yapıyorum.'];
  sentences = sentences.slice(0, max).map((s) => (s.length > 140 ? s.slice(0, 137) + '...' : s));
  const titles = ['Giriş', 'Ana Konu', 'Devam', 'Sonuç'];
  return sentences.map((s, idx) => ({ title: titles[idx] || 'Bölüm ' + (idx + 1), text: s }));
}

// Yönetici kararı: görevi ücretsiz araç planına çevirir.
// Kelime sınırları Unicode sınırlı (Türkçe ı/ş/ç için \b güvenilmezdir).
function makePlan(task, context) {
  const t = task.toLowerCase();
  const subject = resolveSubject(task, context);
  const plan = [];
  const B = '(?<![\\p{L}\\p{N}_])'; // önceki karakter harf/rakam değilse kelime başı

  // 1) Video/slayt — metni sahnelere böler, her sahneye arkaplan görseli üretir.
  if (new RegExp(B + '(video|slayt|sunum)', 'iu').test(t)) {
    plan.push({ type: 'scenes', subject });
    return plan;
  }
  // 2) Görsel
  if (new RegExp(B + '(resim|gorsel|görsel|foto|karikatur|karikatür|logo|manzara|poster|afis|afiş|çizim|çiz)', 'iu').test(t)) {
    plan.push({ type: 'image', prompt: subject === task ? stripPrompt(task) : subject });
  }
  // 3) Sesli/seslendirme
  if (new RegExp(B + '(sesli|seslendir|konuş|konus|dinle|sesle|okuy|okur|oku|tts|text\\s*to\\s*speech)', 'iu').test(t)) {
    plan.push({ type: 'speak', text: subject === task ? stripSpeak(task) : subject });
  }
  // 4) Aritmetik / kod
  if (/(kaç\s+eder|kaçtır|kactir|kaç\s+yapar|kaç\s+ediyor|kaç\s+kalır|kac\s+kalir|hesapla|hesaplayıver|hesaplayiver)/iu.test(t)) {
    plan.push({ type: 'arithmetic', code: task });
  } else if (/(kod\s+çalıştır|kod\s+calistir|run\s+code|bir\s+kod|kod\s+yaz|kodu\s+çalıştır|kodu\s+calistir)/iu.test(t)) {
    plan.push({ type: 'code', code: task });
  }
  // 5) Web araması (net ifadelerle)
  if (/(internette\s+ara|web'de\s+ara|webde\s+ara|internet\s+ara|güncel\s+bilgi|guncel\s+bilgi|hakkında\s+ara|hakkinda\s+ara|google'da\s+ara|google'da\s+ara)/iu.test(t)) {
    plan.push({ type: 'web', query: stripSearch(task) });
  }
  return plan;
}

// Planı sırayla çalıştırır; her adım doğrulanır.
function runPlan(plan, done) {
  const results = [];
  let i = 0;
  function next() {
    if (i >= plan.length) return done(results);
    const step = plan[i];
    i++;
    if (step.type === 'image') {
      imageFromPrompt(step.prompt, (err, file) => {
        const fname = err ? null : path.basename(file);
        results.push(err
          ? { type: 'image', error: err.message }
          : { type: 'image', url: fileUrl(fname), file: fname });
        next();
      });
    } else if (step.type === 'scenes') {
      const scenes = splitScenes(step.subject);
      let si = 0;
      (function nextScene() {
        if (si >= scenes.length) {
          results.push({ type: 'scenes', scenes, note: scenes.length + ' sahnelik senaryo hazırlandı (sahne görselleri denendi, doğrulananlar kullanıldı)' });
          return next();
        }
        const sc = scenes[si];
        si++;
        imageFromPrompt(String(sc.text), (err, file) => {
          if (!err) sc.image = fileUrl(path.basename(file));
          nextScene();
        });
      })();
    } else if (step.type === 'arithmetic') {
      const cleaned = trMap(step.code).replace(/[^0-9+\-*/().\s]/g, ' ').trim().replace(/\s+/g, ' ');
      const parsed = /^[\d+\-*/().\s]+$/.test(cleaned) ? safeEvalArithmetic(cleaned) : null;
      results.push({ type: 'result', text: parsed !== null ? String(parsed) : 'Bu hesaplamayı güvenli şekilde çözemedim.' });
      next();
    } else if (step.type === 'code') {
      const m = step.code.match(/```(?:js|javascript)?\s*\n?([\s\S]*?)\n?```/);
      results.push({ type: 'run_code', code: m ? m[1].trim() : step.code, note: 'Kod tarayıcıda güvenli sandbox ile çalıştırılır' });
      next();
    } else if (step.type === 'speak') {
      results.push({ type: 'speak', text: step.text, note: 'Metin tarayıcıda Türkçe seslendirilir' });
      next();
    } else if (step.type === 'web') {
      webSearch(step.query, (err, text) => {
        results.push(err ? { type: 'search', error: err.message } : { type: 'search', text });
        next();
      });
    } else {
      next();
    }
  }
  next();
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && !originAllowed(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'İzin verilmeyen kaynak' }));
  }
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, tool: 'yönetici-köprü' }, origin);
  if (req.method === 'GET' && req.url === '/models') return send(res, 200, { tools: ['image', 'scenes', 'speak', 'run_code', 'result', 'search'] }, origin);

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
      let context = '';
      try {
        const p = JSON.parse(body);
        task = p.task || '';
        context = p.context || '';
      } catch (e) {
        task = body;
      }
      if (!task) return send(res, 400, { error: 'Görev boş' }, origin);
      const plan = makePlan(task, context);
      if (!plan.length) {
        return send(res, 200, {
          task,
          status: 'needs_brain',
          plan: [],
          results: [],
          reason: 'Yönetici bu görevi ücretsiz araçlara yönlendiremedi; sohbet beyni (Gemini) gerekiyor.'
        }, origin);
      }
      runPlan(plan, (results) => {
        send(res, 200, { task, status: 'done', plan: plan.map((p) => p.type), results }, origin);
      });
    });
    return;
  }
  send(res, 404, { error: 'Bilinmeyen yol' }, origin);
});

server.listen(PORT, () => {
  console.log('Yönetici köprü: http://localhost:' + PORT);
  console.log('Dosyalar: ' + OUTDIR);
});

process.on('uncaughtException', (e) => console.log('Hata:', e.message));