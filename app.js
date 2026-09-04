const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const rememberKey = document.getElementById('rememberKey');
const keyStatus = document.getElementById('keyStatus');
const aiMode = document.getElementById('aiMode');
const cloudFields = document.getElementById('cloudFields');
const noticeLocal = document.getElementById('noticeLocal');
const noticeCloud = document.getElementById('noticeCloud');
const localStatus = document.getElementById('localStatus');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomInBtn = document.getElementById('zoomIn');
const zoomValEl = document.getElementById('zoomVal');

// Site geneli uzaklaştır/yakınlaştır (tarayıcı zoom'unu kullanamayan ortamlar için)
(function initZoom() {
  const container = document.querySelector('.container');
  if (!container || !zoomOutBtn || !zoomInBtn || !zoomValEl) return;
  let zoom = parseInt(localStorage.getItem('site_zoom') || '100', 10) || 100;
  zoom = Math.max(50, Math.min(150, zoom));
  function applyZoom() {
    container.style.zoom = String(zoom / 100);
    zoomValEl.textContent = '%' + zoom;
    localStorage.setItem('site_zoom', String(zoom));
  }
  zoomOutBtn.addEventListener('click', () => { zoom = Math.max(50, zoom - 10); applyZoom(); });
  zoomInBtn.addEventListener('click', () => { zoom = Math.min(150, zoom + 10); applyZoom(); });
  applyZoom();
})();

const MODEL = 'gemini-3.5-flash';
let apiKey = '';

// Store/load saved key
function loadSavedKey() {
  const saved = localStorage.getItem('gemini_auth_key');
  if (saved) {
    apiKey = saved;
    apiKeyInput.value = saved;
    rememberKey.checked = true;
    keyStatus.textContent = '✓ Anahtar yüklendi';
    keyStatus.classList.remove('error');
  }
  // Mod tercihini yükle
  const mode = localStorage.getItem('ai_mode') || 'bridge';
  aiMode.value = mode;
  applyMode(mode);
}

function applyMode(mode) {
  // Köprü modu öncelikli: Ollama + Gemini devre dışı, köprüye bağlan
  if (mode === 'bridge') {
    cloudFields.style.display = 'none';
    noticeLocal.style.display = 'none';
    noticeCloud.style.display = 'block';
    checkBridge();
    return;
  }
  if (mode === 'cloud') {
    cloudFields.style.display = 'flex';
    noticeLocal.style.display = 'block';
    noticeCloud.style.display = 'none';
    localStatus.textContent = '';
  } else {
    cloudFields.style.display = 'none';
    noticeLocal.style.display = 'none';
    noticeCloud.style.display = 'block';
    checkLocalOllama();
  }
}

async function checkBridge() {
  localStatus.textContent = '🔍 Köprü kontrol ediliyor...';
  localStatus.classList.remove('error', 'ok');
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('http://localhost:8788/health', { signal: ctrl.signal });
    clearTimeout(to);
    if (res.ok) {
      localStatus.textContent = '✓ Köprü bağlı — görev hazır';
      localStatus.classList.add('ok');
    } else {
      localStatus.textContent = '⚠️ Köprü çalışmıyor (bridge-server açık mı?)';
      localStatus.classList.add('error');
    }
  } catch (e) {
    localStatus.textContent = '⚠️ Köprü bulunamadı — bridge-server başlatın';
    localStatus.classList.add('error');
  }
}

async function checkLocalOllama() {
  localStatus.textContent = '🔍 Ollama kontrol ediliyor...';
  localStatus.classList.remove('error', 'ok');
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('http://localhost:11434/api/tags', { signal: ctrl.signal });
    clearTimeout(to);
    if (res.ok) {
      const data = await res.json();
      const models = (data.models || []).map((m) => m.name);
      localStatus.textContent = models.length ? '✓ Bağlı — modeller: ' + models.join(', ') : '✓ Ollama açık, model yok';
      localStatus.classList.add('ok');
    } else {
      localStatus.textContent = '⚠️ Ollama çalışmıyor (açık mı?)';
      localStatus.classList.add('error');
    }
  } catch (e) {
    localStatus.textContent = '⚠️ Ollama bulunamadı — yerel AI bağlantısı kurulamadı';
    localStatus.classList.add('error');
  }
}

aiMode.addEventListener('change', () => {
  const mode = aiMode.value;
  localStorage.setItem('ai_mode', mode);
  applyMode(mode);
});

saveKeyBtn.addEventListener('click', () => {
  apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    keyStatus.textContent = 'Lütfen bir anahtar girin';
    keyStatus.classList.add('error');
    return;
  }
  if (rememberKey.checked) {
    localStorage.setItem('gemini_auth_key', apiKey);
  } else {
    localStorage.removeItem('gemini_auth_key');
  }
  keyStatus.textContent = '✓ Anahtar kaydedildi';
  keyStatus.classList.remove('error');
});

// Send message on button click or Enter
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.innerHTML = renderMarkdown(text);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// Bir gorsel mesaji ekler
function addImageMessage(imgUrl, alt) {
  const div = document.createElement('div');
  div.className = `message bot image-msg`;
  div.innerHTML = '<strong>🤖 Asistan:</strong><br><img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(alt) + '" class="generated-image">';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// Basit duz metin cikarici
function messagePlainText(div) {
  const img = div.querySelector('img');
  if (img) return '';
  return div.textContent.replace(/.*?:\s*/, '').trim();
}

// Very light markdown rendering
function renderMarkdown(text) {
  let safe = escapeHtml(text);
  safe = safe.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
    return '<pre><code>' + code + '</code></pre>';
  });
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ------------------------------------------------
// ARAÇLAR (tarayıcıda, ücretsiz)
// ------------------------------------------------

// 1) Metni sese çevir (TTS) - Web Speech API, Türkçe
function runTTS(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(false); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Türkçe ses bulmaya çalış
    const voices = window.speechSynthesis.getVoices();
    const tr = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('tr'));
    if (tr) u.voice = tr;
    u.lang = tr ? tr.lang : 'tr-TR';
    u.rate = 1;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    window.speechSynthesis.speak(u);
    // Bazı tarayıcılar onend vermez; güvenli zaman aşımı
    setTimeout(() => resolve(true), Math.max(4000, text.length * 120));
  });
}

// 2) Slayt Video üretimi — görsel kartlar (her zaman görünür) + TTS anlatım + kontroller
function makeSlideshowVideo(scenes) {
  // scenes: [{title, text, image?}] — her sahne: görsel kartı + metin; Oynat ile anlatımlı geçiş
  if (!Array.isArray(scenes) || scenes.length === 0) return false;
  const holder = document.createElement('div');
  holder.className = 'slideshow-holder';

  const cardsEl = document.createElement('div');
  cardsEl.className = 'slide-cards';
  const cards = [];
  scenes.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'slide-card';
    const img = document.createElement('img');
    img.className = 'slide-img';
    img.alt = s.title || 'Sahne';
    if (s.image) {
      img.src = s.image;
      img.onerror = () => { img.style.display = 'none'; card.classList.add('no-img'); };
    } else {
      img.style.display = 'none';
    }
    const body = document.createElement('div');
    body.className = 'slide-body';
    const title = document.createElement('div');
    title.className = 'slide-title';
    title.textContent = s.title || 'Sahne';
    const desc = document.createElement('div');
    desc.className = 'slide-desc';
    desc.textContent = s.text || '';
    body.appendChild(title);
    body.appendChild(desc);
    card.appendChild(img);
    card.appendChild(body);
    cardsEl.appendChild(card);
    cards.push({ card, s });
  });
  holder.appendChild(cardsEl);

  const controls = document.createElement('div');
  controls.className = 'slideshow-controls';
  const btnToggle = document.createElement('button');
  btnToggle.className = 'video-btn';
  btnToggle.textContent = '▶ Anlatımlı Oynat';
  const btnNext = document.createElement('button');
  btnNext.className = 'video-btn';
  btnNext.textContent = '⏭ Sonraki';
  const btnStop = document.createElement('button');
  btnStop.className = 'video-btn';
  btnStop.textContent = '⏹ Bitir';
  controls.appendChild(btnToggle);
  controls.appendChild(btnNext);
  controls.appendChild(btnStop);
  holder.appendChild(controls);

  const info = document.createElement('div');
  info.className = 'video-info';
  holder.appendChild(info);

  messagesEl.appendChild(holder);
  holder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  let current = 0;
  let playing = false;
  let paused = false;
  let seq = 0;

  function setActive(i) {
    cards.forEach((c, idx) => c.card.classList.toggle('active', idx === i));
    info.textContent = 'Sahne ' + (i + 1) + '/' + cards.length + ' — ' + (cards[i].s.title || '');
  }

  // Duraklatma/skip bilincinde konuşma: duraklatıldıysa ilerlemez.
  function speakText(text) {
    return new Promise((resolve) => {
      const finish = () => resolve(true);
      if (!('speechSynthesis' in window)) { setTimeout(finish, Math.max(2500, String(text).length * 90)); return; }
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      const voices = synth.getVoices();
      const tr = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('tr'));
      if (tr) u.voice = tr;
      u.lang = tr ? tr.lang : 'tr-TR';
      u.rate = 1;
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      const iv = setInterval(() => {
        if (paused) return;
        if (synth.paused) return;
        if (synth.speaking) return;
        clearInterval(iv);
        finish();
      }, 150);
    });
  }

  function runScene(i) {
    if (!playing) return;
    if (i >= cards.length) {
      playing = false;
      paused = false;
      btnToggle.textContent = '▶ Yeniden Oynat';
      info.textContent = '✅ Anlatım tamamlandı.';
      return;
    }
    const my = ++seq;
    current = i;
    setActive(i);
    speakText(cards[i].s.text || '').then(() => {
      setTimeout(() => { if (playing && my === seq) runScene(current + 1); }, 600);
    });
  }

  function start() {
    playing = true;
    paused = false;
    btnToggle.textContent = '⏸ Duraklat';
    if (current >= cards.length) current = 0;
    runScene(current);
  }

  function stop() {
    playing = false;
    paused = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    btnToggle.textContent = '▶ Anlatımlı Oynat';
    info.textContent = "⏹ Durdu. 'Oynat' demek ilk sahneden başlatır.";
  }

  btnToggle.addEventListener('click', () => {
    if (playing && !paused) {
      paused = true;
      if (window.speechSynthesis) window.speechSynthesis.pause();
      btnToggle.textContent = '▶ Devam';
      info.textContent = '⏸ Duraklatıldı.';
    } else if (playing && paused) {
      paused = false;
      if (window.speechSynthesis) window.speechSynthesis.resume();
      btnToggle.textContent = '⏸ Duraklat';
      setActive(current);
    } else {
      start();
    }
  });
  btnNext.addEventListener('click', () => {
    if (!playing) start();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (current + 1 < cards.length) runScene(current + 1);
    else stop();
  });
  btnStop.addEventListener('click', stop);

  setActive(0);
  return true;
}

// 3) Kod çalıştırma - tarayıcıda güvenli JS sandbox
function runCodeSnippet(code) {
  return new Promise((resolve) => {
    try {
      const logs = [];
      const origLog = console.log;
      const origError = console.error;
      const origWarn = console.warn;
      console.log = (...a) => logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
      console.error = console.log;
      console.warn = console.log;
      let ret;
      try {
        ret = new Function(code)();
      } catch (e) {
        logs.push('⚠️ Kod hatası: ' + e.message);
      }
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
      // Dönen değer varsa ekle
      if (ret !== undefined && logs.length === 0) logs.push(String(ret));
      resolve(logs.length ? logs.join('\n') : 'Kod çalıştı, çıktı yok.');
    } catch (e) {
      resolve('⚠️ Kod hatası: ' + e.message);
    }
  });
}

// GÜVENLİ aritmetik çözücü — eval() kullanmaz, yalnızca sayı + - * / ( ) işler.
// Yanlış formatta null döner, çağıran taraf "Kod çalıştırma" yoluna düşer.
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

// 4) Web arama (ücretsiz, basit) - DuckDuckGo instant + bilgi
async function webSearch(query) {
  try {
    const res = await fetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1');
    const data = await res.json();
    if (data.AbstractText) {
      return '📚 ' + data.AbstractText + (data.AbstractURL ? '\n🔗 ' + data.AbstractURL : '');
    }
    // Abstract bilgi yoksa ilgili sonuçları dene
    if (data.RelatedTopics && data.RelatedTopics.length) {
      const texts = data.RelatedTopics.slice(0, 3).map((t) => t.Text).filter(Boolean);
      if (texts.length) return 'İlgili sonuçlar:\n• ' + texts.join('\n• ');
    }
    return 'Bu konuda web sonucu bulunamadı.';
  } catch (e) {
    return 'Web araması şu an çalışmadı: ' + e.message;
  }
}

// ------------------------------------------------
// Arac tanımları (Gemini'ye bildirilecek)
// ------------------------------------------------
const TOOLS = [
  {
    type: 'function',
    name: 'generate_image',
    description: 'Kullanıcı açıkça bir resim/görsel isterse çağır. Türkçe detaylı açıklama ver.',
    parameters: {
      type: 'OBJECT',
      properties: { prompt: { type: 'STRING', description: 'Görselin Türkçe detaylı açıklaması' } },
      required: ['prompt']
    }
  },
  {
    type: 'function',
    name: 'text_to_speech',
    description: 'Kullanıcı metni sesli/seslendir demek isterse çağır. text parametresine okunacak Türkçe metni ver.',
    parameters: {
      type: 'OBJECT',
      properties: { text: { type: 'STRING', description: 'Sesli okunacak Türkçe metin' } },
      required: ['text']
    }
  },
  {
    type: 'function',
    name: 'make_video',
    description: 'Kullanıcı video/slayt gösterisi/animasyonlu anlatım isterse çağır. scenes parametresine başlık+metin dizisi ver (en az 1, en fazla 6).',
    parameters: {
      type: 'OBJECT',
      properties: {
        scenes: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'Slayt başlığı (kısa)' },
              text: { type: 'STRING', description: 'Slayttaki kısa anlatım metni' }
            }
          }
        }
      },
      required: ['scenes']
    }
  },
  {
    type: 'function',
    name: 'run_code',
    description: 'Kullanıcı bir kod yazıp çalıştırmamı isterse çağır. code parametresine JavaScript kodu ver.',
    parameters: {
      type: 'OBJECT',
      properties: { code: { type: 'STRING', description: 'Çalıştırılacak JavaScript kodu' } },
      required: ['code']
    }
  },
  {
    type: 'function',
    name: 'web_search',
    description: 'Kullanıcı güncel bilgi veya internetten bilgi isterse çağır. query parametresine arama sorusu ver.',
    parameters: {
      type: 'OBJECT',
      properties: { query: { type: 'STRING', description: 'Web arama sorgusu' } },
      required: ['query']
    }
  }
];

// ------------------------------------------------
// Ana akış
// ------------------------------------------------
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const mode = getMode();
  if (mode === 'cloud' && !apiKey) {
    apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      keyStatus.textContent = 'Önce API anahtarını girin!';
      keyStatus.classList.add('error');
      return;
    }
  }
  // Köprü modunda anahtarsız ilerle (Ollama+Gemini devre dışı)

  addMessage(text, 'user');
  userInput.value = '';

  const typingEl = addMessage('Asistan çalışıyor...', 'bot');
  typingEl.classList.add('typing');

  sendBtn.disabled = true;

  // Hangi aracı göndereceğimizi seç
  const imageKW = /(resim|görsel|gorsel|fotoğraf|fotograf|çiz|çizim|tablo|manzara|karikatür|karikatur|vitrin|logo)/i;
  const textKW = /(hikaye|şiir|siir|mektup|kompozisyon|özet|ozet|çeviri|ceviri|cümle|cumle|metin|mail|e.?mail|rapor|yaz\b)/i;
  const isImageRequest = imageKW.test(text) && !textKW.test(text);

  const allowedTools = isImageRequest
    ? TOOLS
    : TOOLS.filter((t) => t.name !== 'generate_image');

  // --- ARAÇLARI GEMİNİ'SIZ, SINIRSIZ ÇALIŞTIR ---
  // Net bir araç komutu verildiyse Gemini'ye hiç uğramadan tarayıcıda halleder.
  // Köprü modunda bu işi köprüdeki YÖNETİCİ üstlenir (context ile, doğrulayarak):
  // "bunu video yap" gibi istekler son asistan metnini (ör. hikaye) kullanır.
  const handled = getMode() !== 'bridge' ? await tryDirectTool(text, typingEl) : false;
  if (handled) {
    sendBtn.disabled = false;
    userInput.focus();
    return;
  }

  try {
    if (getMode() === 'bridge') {
      await handleBridgeTask(text, typingEl);
    } else if (getMode() === 'local') {
      await handleLocalChat(text, typingEl);
    } else {
      await handleInteraction(text, typingEl, allowedTools);
    }
  } catch (err) {
    typingEl.remove();
    addMessage('⚠️ Hata: ' + err.message, 'bot');
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

async function callGemini(prompt, allowedTools) {
  const system = 'Sen Türkçe konuşan yardımsever ve detaylı bir AI asistanısın. Cevapların Türkçe, açıklayıcı ve kapsamlı olsun. ' +
    'Verilen araçları yalnızca kullanıcı istediğinde uygun şekilde kullan: ' +
    'resim isterse generate_image, sesli isterse text_to_speech, video/slayt isterse make_video, kod çalıştırmamı isterse run_code, güncel bilgi isterse web_search. ' +
    'Metin hikaye/şiir/özet gibi isteklerde görsel aracını asla kullanma, düz Türkçe metin cevabı ver.';

  const historyParts = [];
  const history = messagesEl.querySelectorAll('.message');
  history.forEach((m) => {
    const txt = messagePlainText(m);
    if (txt && !txt.startsWith('Asistan çalışıyor') && !txt.startsWith('Merhaba! Ben')) {
      const isBot = m.classList.contains('bot');
      historyParts.push((isBot ? 'Asistan: ' : 'Kullanıcı: ') + txt);
    }
  });
  historyParts.push('Kullanıcı: ' + prompt);
  const inputText = historyParts.join('\n');

  const cleanKey = String(apiKey).replace(/[^\x20-\x7E]/g, '').trim();

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': cleanKey
    },
    body: JSON.stringify({
      model: MODEL,
      input: inputText,
      system_instruction: system,
      tools: allowedTools.length ? allowedTools : undefined
    })
  });

  if (!res.ok) {
    let msg = 'API isteği başarısız oldu (' + res.status + ')';
    try {
      const errData = await res.json();
      msg = errData?.error?.message || msg;
    } catch (e) {}
    throw new Error(msg);
  }

  return await res.json();
}

// Metin çıkar
function extractText(data) {
  let a = data.output_text;
  if (!a && Array.isArray(data.steps)) {
    const m = data.steps.find((s) => s.type === 'model_output');
    if (m && Array.isArray(m.content)) {
      const tp = m.content.filter((c) => c.type === 'text').map((c) => c.text);
      if (tp.length) a = tp.join('\n');
    }
  }
  return a;
}

async function handleInteraction(prompt, typingEl, allowedTools) {
  const data = await callGemini(prompt, allowedTools);

  // Tüm araç çağrılarını bul
  const calls = [];
  if (Array.isArray(data.steps)) {
    data.steps.forEach((s) => {
      if (s.type === 'function_call') calls.push(s);
    });
  }

  if (calls.length) {
    for (const call of calls) {
      const args = call.arguments || {};
      const name = call.name;
      if (name === 'generate_image') {
        typingEl.remove();
        const genEl = addMessage('🖼️ Görsel oluşturuluyor...', 'bot');
        genEl.classList.add('typing');
        const imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(args.prompt || '') + '?width=768&height=768&nologo=true&model=flux';
        addImageMessage(imgUrl, args.prompt || '');
        genEl.remove();
      } else if (name === 'text_to_speech') {
        typingEl.remove();
        addMessage('🔊 Metin seslendiriliyor...', 'bot');
        await runTTS(args.text || '');
        addMessage('🔊 Seslendirme tamamlandı. (Metin: ' + (args.text || '') + ')', 'bot');
      } else if (name === 'make_video') {
        typingEl.remove();
        addMessage('🎬 Video/Slayt hazırlanıyor...', 'bot');
        const scenes = Array.isArray(args.scenes) ? args.scenes : [{ title: 'Anlatım', text: (args.text || '') }];
        const ok = makeSlideshowVideo(scenes);
        if (!ok) addMessage('⚠️ Video oluşturulamadı.', 'bot');
      } else if (name === 'run_code') {
        typingEl.remove();
        addMessage('💻 Kod çalıştırılıyor...', 'bot');
        const output = await runCodeSnippet(args.code || '');
        addMessage('**Kod çıktısı:**\n```\n' + output + '\n```', 'bot');
      } else if (name === 'web_search') {
        typingEl.remove();
        addMessage('🔍 Web araması yapılıyor...', 'bot');
        const result = await webSearch(args.query || '');
        addMessage('**Arama sonucu:** ' + result, 'bot');
      }
    }
  } else {
    typingEl.remove();
    const answer = extractText(data);
    addMessage(answer || 'Yanıt alınamadı.', 'bot');
  }
}

// Initialize
loadSavedKey();

// ------------------------------------------------
// YEREL AI (OLLAMA) — anahtarsız, sınırsız sohbet
// ------------------------------------------------
function getMode() {
  return aiMode.value === 'cloud' ? 'cloud' : (aiMode.value === 'bridge' ? 'bridge' : 'local');
}

// Sohbet geçmişini Ollama formatına çevir
function getLocalHistory(prompt) {
  const history = [{ role: 'system', content: 'Sen Türkçe konuşan yardımsever ve detaylı bir AI asistanısın. Cevapların Türkçe, açıklayıcı ve kapsamlı olsun. Kullanıcı hikaye, şiir, özet, çeviri gibi metin isteklerinde düzgün, kapsamlı bir Türkçe metin cevabı ver.' }];
  const msgs = messagesEl.querySelectorAll('.message');
  msgs.forEach((m) => {
    const txt = messagePlainText(m);
    if (txt && !txt.startsWith('Asistan çalışıyor') && !txt.startsWith('Merhaba! Ben') && !txt.startsWith('Yerel') && !txt.startsWith('🔊') && !txt.startsWith('🖼') && !txt.startsWith('💻') && !txt.startsWith('🎬') && !txt.startsWith('🔍') && !txt.startsWith('**')) {
      const role = m.classList.contains('bot') ? 'assistant' : 'user';
      history.push({ role: role, content: txt });
    }
  });
  history.push({ role: 'user', content: prompt });
  return history;
}

async function handleLocalChat(prompt, typingEl) {
  const model = 'qwen2.5:0.5b';
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      stream: false,
      options: { num_ctx: 512, temperature: 0.7 },
      messages: getLocalHistory(prompt)
    })
  });
  if (!res.ok) {
    let msg = 'Yerel AI hatası (' + res.status + ')';
    try { const e = await res.json(); msg = e.error || msg; } catch (e) {}
    throw new Error(msg);
  }
  const data = await res.json();
  typingEl.remove();
  addMessage(data.message?.content || 'Yanıt alınamadı.', 'bot');
}

// ------------------------------------------------
// ARAÇLARI GEMİNİ'SIZ, SINIRSIZ ÇALIŞTIR
// Net bir araç komutu verildiğinde Gemini'ye hiç uğramadan tarayıcıda halleder.
// Böylece kota yalnızca gerçek sohbet/zeka isteklerine harcanır.
// ------------------------------------------------
async function tryDirectTool(text, typingEl) {
  const t = text.toLowerCase();

  // GÖRSEL ÜRETİMİ (net istek)
  const imageKW = /(bir\s+)?(resim|görsel|gorsel|fotoğraf|fotograf|çiz|çizim|logo)/i;
  if (imageKW.test(t)) {
    typingEl.remove();
    const prompt = text.replace(/lütfen|lutfen|bana|bir\s+görsel|gorsel|resim|fotoğraf|fotograf|çiz\/?|çizim|yap|oluştur|olustur|göster|goster|ver|üret|uret|sağla|sagla|teşekkürler|tesekkurler/gi, '').trim();
    const cleanPrompt = prompt || 'Detaylı güzel bir resim';
    const genEl = addMessage('🖼️ Görsel oluşturuluyor (sınırsız, ücretsiz)...', 'bot');
    genEl.classList.add('typing');
    const imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt) + '?width=768&height=768&nologo=true&model=flux';
    addImageMessage(imgUrl, cleanPrompt);
    genEl.remove();
    return true;
  }

  // SESLİ OKUMA (TTS)
  if (/(sesli|seslendir|oku\b|konuş|konus|dinle|sesle\s+anlat|anlat.*sesli|text.*to.*speech|tts)/i.test(t)) {
    typingEl.remove();
    addMessage('🔊 Türkçe seslendiriliyor (sınırsız, ücretsiz)...', 'bot');
    const speechText = text.replace(/(lütfen|lutfen|bunu|şunu|sunu|şu|su|metni|sesli|seslendir|oku|konuş|konus|dinle|yap|olarak|okuyabilir\s+misin|okur\s+musun)/gi, '').trim() || 'Merhaba, ben sizin ücretsiz AI asistanınızım.';
    await runTTS(speechText);
    addMessage('🔊 Seslendirme tamamlandı.', 'bot');
    return true;
  }

  // KOD ÇALIŞTIRMA (net istek)
  if (/(kod\s+yaz|kod\s+çalıştır|kod\s+calistir|bir\s+kod|js\s+kod|javascript|kodu\s+çalıştır|kodu\s+calistir|çalıştır\s+şu|run\s+code)/i.test(t) || /(kaç\s+eder|kaçtır|kactir|hesapla|hesaplayıver)\b/i.test(t)) {
    typingEl.remove();
    addMessage('💻 Kod tarayıcıda çalıştırılıyor (sınırsız)...', 'bot');
    // Gömülü kod bloğu var mı?
    const codeMatch = text.match(/```(?:js|javascript)?\s*\n?([\s\S]*?)\n?```/);
    let codeText = codeMatch ? codeMatch[1].trim() : text;
    // "7 kere 8 hesapla" gibi doğal dil aritmetiğini güvenli şekilde çöz (eval yok)
    const trMap = (s) => s.replace(/\b(kere|çarpı|carp|ile|çarpılmış|carpilmis)\b/gi, '*').replace(/\b(artı|arti|toplam|topla)\b/gi, '+').replace(/\b(eksi|çıkar|cikar)\b/gi, '-').replace(/\b(bölü|bolu|böl)\b/gi, '/');
    const cleaned = trMap(codeText).replace(/[^0-9+\-*/().\s]/g, ' ').trim().replace(/\s+/g, ' ');
    if (/^[\d+\-*/().\s]+$/.test(cleaned)) {
      const parsed = safeEvalArithmetic(cleaned);
      if (parsed !== null) { addMessage('**Sonuç:** ' + String(parsed), 'bot'); return true; }
    }
    const output = await runCodeSnippet(codeText);
    addMessage('**Kod çıktısı:**\n```\n' + output + '\n```', 'bot');
    return true;
  }

  // WEB ARAMA (net istek)
  if (/(internette\s+ara|web'de\s+ara|webde\s+ara|internet\s+ara|ara\s+şu|ara\s+su|şunu\s+ara|su\s+ara|hakkında\s+ara|hakkinda\s+ara|google'da\s+ara|güncel\s+bilgi|guncel\s+bilgi|web\s+araması|dunyadaki\s+en)/i.test(t)) {
    typingEl.remove();
    addMessage('🔍 Web araması yapılıyor (sınırsız)...', 'bot');
    const query = text.replace(/(lütfen|lutfen|internette|web'de|webde|internet|google'da|ara|şunu|suyu|sunu|hakkında|hakkinda|bir\s+şey|güncel|guncel|bilgi|web\s+araması)\s*yap?/gi, '').trim();
    const result = await webSearch(query || text);
    addMessage('**Arama sonucu:** ' + result, 'bot');
    return true;
  }

  // VİDEO/SLAYT (net istek)
  if (/(video\s+yap|video\s+üret|video\s+uret|slayt|video\s+göster|video\s+goster|animasyonlu|anlatım\s+videosu|anlatim\s+videosu|bunu\s+video|kısa\s+video|kisa\s+video|konu\s+anlatım\s+videosu)/i.test(t)) {
    typingEl.remove();
    addMessage('🎬 Video/Slayt hazırlanıyor (sınırsız)...', 'bot');
    // Konuyu çıkar, basit birkaç slayta böl
    const topic = text.replace(/(lütfen|lutfen|bana|bir|video|slayt|göster|goster|yap|üret|uret|anlatım|anlatim|oluştur|olustur|konu)\s*/gi, '').trim() || 'Genel anlatım';
    const scenes = [
      { title: 'Giriş', text: 'Merhaba! Bugün size "' + topic + '" konusunu anlatacağım.', color: '#667eea' },
      { title: 'Ana Konu', text: 'Bu konunun en önemli noktalarına birlikte bakalım.', color: '#764ba2' },
      { title: 'Özet', text: 'Umarım bu kısa anlatım işinize yarar. Teşekkürler!', color: '#11998e' }
    ];
    makeSlideshowVideo(scenes);
    return true;
  }

  return false;
}

// ------------------------------------------------
// KÖPRÜ (YAPAY ŞİRKET) — görevi bu makinedeki bridge-server'a gönderir
// Görev anlaşılır, araçlar çalışır, hazır dosyalar döner.
// ------------------------------------------------
// Son asistan mesajının düz metni — "bunu/şunu" göndermeleri için context görevi görür (ör. hikaye).
function lastBotText() {
  const msgs = messagesEl.querySelectorAll('.message.bot');
  for (let i = msgs.length - 1; i >= 0; i--) {
    const txt = messagePlainText(msgs[i]);
    if (txt && !txt.startsWith('Asistan çalışıyor') && !txt.startsWith('Merhaba! Ben') &&
        !txt.startsWith('🏭') && !txt.startsWith('🤖') && !txt.startsWith('🧠') &&
        !txt.startsWith('✅') && !txt.startsWith('⚠️') && !txt.startsWith('**') &&
        !txt.startsWith('🔊') && !txt.startsWith('🖼') && !txt.startsWith('💻') &&
        !txt.startsWith('🎬') && !txt.startsWith('🔍')) {
      return txt;
    }
  }
  return '';
}

async function handleBridgeTask(task, typingEl) {
  typingEl.textContent = '🏭 Yönetici görevi planlıyor...';
  let res;
  try {
    const hdrs = { 'Content-Type': 'application/json' };
    const adminTok = localStorage.getItem('adminToken');
    if (adminTok) hdrs['x-admin-token'] = adminTok;
    res = await fetch('http://localhost:8788/run', {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ task: task, context: lastBotText() })
    });
  } catch (e) {
    typingEl.remove();
    addMessage('⚠️ Köprüye bağlanılamadı. Bu makinede köprüyü başlatın:\n```\nnode bridge-server.js\n```', 'bot');
    return;
  }
  if (!res.ok) {
    typingEl.remove();
    addMessage('⚠️ Köprü hatası (' + res.status + ')', 'bot');
    return;
  }
  const data = await res.json();
  typingEl.remove();

  // Yönetici bu görevi ücretsiz araçlara yönlendiremedi → beyne (Gemini) otomatik devreder.
  if (data.status === 'needs_brain') {
    addMessage('🤖 **Yönetici:** bu görev ücretsiz araç değil, sohbet beyni gerektiriyor. Beyne devrediyorum…', 'bot');
    const brainEl = addMessage('🧠 Sohbet beyni çalışıyor...', 'bot');
    brainEl.classList.add('typing');
    if (apiKey) {
      try {
        await handleInteraction(task, brainEl, TOOLS);
      } catch (e) {
        brainEl.remove();
        addMessage('⚠️ Beyin hatası: ' + e.message, 'bot');
      }
    } else {
      brainEl.remove();
      addMessage('Beyni çalıştırmak için üstteki karta Gemini anahtarını girin (ücretsiz ~20 sohbet/gün) veya **Bulut** modunu seçip aynı isteği yapın.', 'bot');
    }
    return;
  }

  if (data.plan && data.plan.length) {
    addMessage('🏭 **Yönetici planı:** ' + data.plan.join(' → ') + ' (0 kota, sınırsız)', 'bot');
  }
  for (const r of (data.results || [])) {
    if (r.type === 'image') {
      if (r.url) {
        addMessage('🖼️ **Görsel üretildi (doğrulandı):** ' + (r.prompt || ''), 'bot');
        addImageMessage(r.url, r.prompt || 'Görsel');
      } else {
        addMessage('⚠️ Görsel üretilemedi: ' + (r.error || 'bilinmeyen hata'), 'bot');
      }
    } else if (r.type === 'scenes') {
      const ok = makeSlideshowVideo(r.scenes || []);
      addMessage('🎬 ' + (r.note || 'Senaryo hazır') + (ok ? ' — ▶ Başlat ile oynat' : ' — oynatılamadı'), 'bot');
    } else if (r.type === 'speak') {
      addMessage('🔊 Anlatım metni hazır, seslendiriliyor (sınırsız, ücretsiz)...', 'bot');
      await runTTS(r.text || '');
      addMessage('🔊 Seslendirme tamamlandı.', 'bot');
    } else if (r.type === 'result') {
      addMessage('✅ **Sonuç:** ' + r.text, 'bot');
    } else if (r.type === 'run_code') {
      addMessage('💻 Kod tarayıcıda güvenli sandbox ile çalıştırılıyor...', 'bot');
      const output = await runCodeSnippet(r.code || '');
      addMessage('**Kod çıktısı:**\n```\n' + output + '\n```', 'bot');
    } else if (r.type === 'search') {
      addMessage('🔍 **Arama sonucu:**\n' + (r.text || r.error || ''), 'bot');
    } else if (r.type === 'admin') {
      addMessage('🧠 **Yönetici (admin CLI) çıktısı:**\n' + (r.text || ''), 'bot');
    } else if (r.error) {
      addMessage('⚠️ **' + r.type + ' hatası:** ' + r.error, 'bot');
    }
  }
}
