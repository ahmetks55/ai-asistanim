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

  try {
    const response = await callGemini(text);
    typingEl.remove();
    addMessage(response, 'bot');
  } catch (err) {
    typingEl.remove();
    addMessage('⚠️ Hata: ' + err.message, 'bot');
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

async function callGemini(prompt) {
  const system = 'Sen Türkçe konuşan yardımsever bir AI asistanısın. Kısa ve net cevaplar ver.';

  // Build conversation history from previous messages
  const steps = [];
  const history = messagesEl.querySelectorAll('.message');
  history.forEach((m) => {
    const isBot = m.classList.contains('bot');
    const txt = m.textContent.replace(/.*?:\s*/, '').trim();
    if (txt && !txt.startsWith('Asistan yazıyor') && !txt.startsWith('Merhaba! Ben')) {
      const role = isBot ? 'model' : 'user';
      steps.push({ role, content: [{ type: 'text', text: txt }] });
    }
  });
  steps.push({ role: 'user', content: [{ type: 'text', text: prompt }] });

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      model: MODEL,
      input: steps,
      config: { system_instruction: system }
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

  const data = await res.json();
  return data.output_text || 'Yanıt alınamadı.';
}

// Initialize
loadSavedKey();
