const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const rememberKey = document.getElementById('rememberKey');
const keyStatus = document.getElementById('keyStatus');

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
}

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

// Bir gorsel mesaji ekler (ayri stil ile)
function addImageMessage(imgUrl, alt) {
  const div = document.createElement('div');
  div.className = `message bot image-msg`;
  div.innerHTML = '<strong>🤖 Asistan:</strong><br><img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(alt) + '" class="generated-image">';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// Basit duz metin cikarici (gorsel icerikli mesajlari atlar)
function messagePlainText(div) {
  const img = div.querySelector('img');
  if (img) return ''; // gorsel mesajini sohbet gecmisinde metne donusturme
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

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  if (!apiKey) {
    apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      keyStatus.textContent = 'Önce API anahtarını girin!';
      keyStatus.classList.add('error');
      return;
    }
  }

  addMessage(text, 'user');
  userInput.value = '';

  const typingEl = addMessage('Asistan yazıyor...', 'bot');
  typingEl.classList.add('typing');

  sendBtn.disabled = true;

  // Açık bir görsel isteği mi? Sadece o zaman görsel aracını göndeririz.
  const imageKW = /(resim|görsel|gorsel|fotoğraf|fotograf|çiz|çizim|tablo|manzara|karikatür|karikatur|vitrin|logo)/i;
  const textKW = /(hikaye|şiir|siir|mektup|kompozisyon|özet|ozet|çeviri|ceviri|cümle|cumle|metin|mail|e.?mail|rapor|yaz\b)/i;
  const isImageRequest = imageKW.test(text) && !textKW.test(text);

  try {
    await handleInteraction(text, typingEl, isImageRequest);
  } catch (err) {
    typingEl.remove();
    addMessage('⚠️ Hata: ' + err.message, 'bot');
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

async function callGemini(prompt, forceImage) {
  const system = 'Sen Türkçe konuşan yardımsever ve detaylı bir AI asistanısın. Cevapların her zaman Türkçe, açıklayıcı ve detaylı olsun. ' +
    'Sadece kullanıcı AÇIKÇA bir resim/görsel/fotoğraf/çizim yapmamı isterse "generate_image" aracını çağır ve "prompt" parametresine görselin Türkçe, çok detaylı ve sanatsal açıklamasını yaz. ' +
    'Kullanıcı hikaye, şiir, mektup, kompozisyon, özet, çeviri, kod, rapor gibi bir metin yazmamı isterse LÜTFEN görsel aracını ASLA kullanma; onun yerine düzgün, kapsamlı bir Türkçe metin cevabı ver.';

  const historyParts = [];
  const history = messagesEl.querySelectorAll('.message');
  history.forEach((m) => {
    const txt = messagePlainText(m);
    if (txt && !txt.startsWith('Asistan yazıyor') && !txt.startsWith('Merhaba! Ben')) {
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
      tools: forceImage ? [
        {
          type: 'function',
          name: 'generate_image',
          description: 'Kullanıcı istediğinde bir resim/görsel oluşturur. Prompt parametresine Türkçe, detaylı ve sanatsal bir açıklama yaz.',
          parameters: {
            type: 'OBJECT',
            properties: {
              prompt: { type: 'STRING', description: 'Görselin Türkçe detaylı açıklaması' }
            },
            required: ['prompt']
          }
        }
      ] : undefined
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

// Araclari + metni birlikte yonetir
async function handleInteraction(prompt, typingEl, forceImage) {
  const data = await callGemini(prompt, forceImage);

  // Araç çağrısı var mı kontrol et
  let imagePrompt = null;
  if (Array.isArray(data.steps)) {
    const fc = data.steps.find((s) => s.type === 'function_call' && s.name === 'generate_image');
    if (fc && fc.arguments) {
      imagePrompt = fc.arguments.prompt || null;
    }
  }

  if (imagePrompt) {
    // Asistan aracı çağırdı - görseli üret ve göster
    // Ayrıca modelin varsa Türkçe açıklamasını da gösterelim
    let modelText = '';
    if (Array.isArray(data.steps)) {
      const modelOut = data.steps.find((s) => s.type === 'model_output');
      if (modelOut && Array.isArray(modelOut.content)) {
        const tp = modelOut.content.filter((c) => c.type === 'text').map((c) => c.text);
        if (tp.length) modelText = tp.join('\n');
      }
    }
    typingEl.remove();
    const genEl = addMessage('🖼️ Görsel oluşturuluyor...', 'bot');
    genEl.classList.add('typing');
    try {
      const imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(imagePrompt) + '?width=768&height=768&nologo=true&model=flux';
      if (modelText) addMessage(modelText, 'bot');
      addImageMessage(imgUrl, imagePrompt);
      genEl.remove();
    } catch (e) {
      genEl.remove();
      addMessage('⚠️ Görsel oluşturulamadı: ' + e.message, 'bot');
    }
  } else {
    // Normal metin yanıtı
    let answer = data.output_text;
    if (!answer && Array.isArray(data.steps)) {
      const modelOut = data.steps.find((s) => s.type === 'model_output');
      if (modelOut && Array.isArray(modelOut.content)) {
        const textParts = modelOut.content.filter((c) => c.type === 'text').map((c) => c.text);
        if (textParts.length) answer = textParts.join('\n');
      }
    }
    typingEl.remove();
    addMessage(answer || 'Yanıt alınamadı.', 'bot');
  }
}

// Initialize
loadSavedKey();
