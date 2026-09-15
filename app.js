// ===== AI ASİSTANIM - ANA UYGULAMA (Doğrudan API) =====

const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');
const localStatus = document.getElementById('localStatus');

let activeBrain = localStorage.getItem('activeBrain') || 'nara';
let nvidiaKey = localStorage.getItem('nvidia_api_key') || '';
let airforceKey = localStorage.getItem('airforce_api_key') || '';
let naraKey = localStorage.getItem('nara_api_key') || '';
let chatHistory = [];

// ===== AYARLAR PANELİ =====
settingsBtn.addEventListener('click', () => { settingsOverlay.style.display = 'flex'; });
settingsClose.addEventListener('click', () => { settingsOverlay.style.display = 'none'; });
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) settingsOverlay.style.display = 'none'; });

// Beyin seçimi
document.querySelectorAll('.brain-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.brain-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeBrain = btn.dataset.brain;
    localStorage.setItem('activeBrain', activeBrain);
  });
});
document.querySelector(`.brain-btn[data-brain="${activeBrain}"]`)?.classList.add('active');
document.querySelectorAll('.brain-btn:not([data-brain="' + activeBrain + '"])').forEach(b => b.classList.remove('active'));

// ===== API KEY KAYDETME =====
document.getElementById('nvidiaKeySave').addEventListener('click', () => {
  const v = document.getElementById('nvidiaKeyInput').value.trim();
  if (!v) return;
  nvidiaKey = v;
  localStorage.setItem('nvidia_api_key', v);
  document.getElementById('nvidiaKeyStatus').textContent = '✓ Kaydedildi';
  document.getElementById('nvidiaKeyStatus').className = 'key-status ok';
});

document.getElementById('airforceKeySave').addEventListener('click', () => {
  const v = document.getElementById('airforceKeyInput').value.trim();
  if (!v) return;
  airforceKey = v;
  localStorage.setItem('airforce_api_key', v);
  document.getElementById('airforceKeyStatus').textContent = '✓ Kaydedildi';
  document.getElementById('airforceKeyStatus').className = 'key-status ok';
});

document.getElementById('naraKeySave').addEventListener('click', () => {
  const v = document.getElementById('naraKeyInput').value.trim();
  if (!v) return;
  naraKey = v;
  localStorage.setItem('nara_api_key', v);
  document.getElementById('naraKeyStatus').textContent = '✓ Kaydedildi';
  document.getElementById('naraKeyStatus').className = 'key-status ok';
});

// Sayfa yüklenince kayıtlı key'leri inputlara doldur
document.getElementById('nvidiaKeyInput').value = nvidiaKey;
document.getElementById('airforceKeyInput').value = airforceKey;
document.getElementById('naraKeyInput').value = naraKey;

// ===== DURUM KONTROLÜ =====
document.getElementById('checkAllStatus').addEventListener('click', checkAllStatus);

async function checkAllStatus() {
  const nvidiaEl = document.getElementById('nvidiaStatus');
  const naraEl = document.getElementById('naraStatus');
  const airforceEl = document.getElementById('airforceStatus');

  // NVIDIA test
  if (nvidiaKey) {
    nvidiaEl.textContent = 'Test ediliyor...';
    nvidiaEl.className = 'status-dot checking';
    try {
      const r = await fetch('https://integrate.api.nvidia.com/v1/models', {
        headers: { 'Authorization': 'Bearer ' + nvidiaKey },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) { nvidiaEl.textContent = '✓ Çalışıyor'; nvidiaEl.className = 'status-dot ok'; }
      else { nvidiaEl.textContent = '✗ Hata ' + r.status; nvidiaEl.className = 'status-dot error'; }
    } catch(e) { nvidiaEl.textContent = '✗ Erişilemiyor'; nvidiaEl.className = 'status-dot error'; }
  } else {
    nvidiaEl.textContent = '✗ Anahtar yok';
    nvidiaEl.className = 'status-dot error';
  }

  // NaraRouter test
  if (naraKey) {
    naraEl.textContent = 'Test ediliyor...';
    naraEl.className = 'status-dot checking';
    try {
      const r = await fetch('https://router.bynara.id/v1/models', {
        headers: { 'Authorization': 'Bearer ' + naraKey },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) { naraEl.textContent = '✓ Çalışıyor'; naraEl.className = 'status-dot ok'; }
      else { naraEl.textContent = '✗ Hata ' + r.status; naraEl.className = 'status-dot error'; }
    } catch(e) { naraEl.textContent = '✗ Erişilemiyor'; naraEl.className = 'status-dot error'; }
  } else {
    naraEl.textContent = '✗ Anahtar yok';
    naraEl.className = 'status-dot error';
  }

  // Airforce test
  if (airforceKey) {
    airforceEl.textContent = 'Test ediliyor...';
    airforceEl.className = 'status-dot checking';
    try {
      const r = await fetch('https://api.airforce/v1/models', {
        headers: { 'Authorization': 'Bearer ' + airforceKey },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) { airforceEl.textContent = '✓ Çalışıyor'; airforceEl.className = 'status-dot ok'; }
      else { airforceEl.textContent = '✗ Hata ' + r.status; airforceEl.className = 'status-dot error'; }
    } catch(e) { airforceEl.textContent = '✗ Erişilemiyor'; airforceEl.className = 'status-dot error'; }
  } else {
    airforceEl.textContent = '✗ Anahtar yok';
    airforceEl.className = 'status-dot error';
  }

  localStatus.textContent = '✓ Doğrudan bağlantı';
  localStatus.className = 'status ok';
}

// Sayfa yüklenince durum kontrolü yap
checkAllStatus();

// ===== MESAJ GÖNDERME =====
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = 'message ' + sender;
  div.innerHTML = (sender === 'user' ? '<strong>Sen:</strong> ' : '<strong>🤖 Asistan:</strong> ') + text;
  messagesEl.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  messagesEl.parentElement.scrollTo({ top: messagesEl.parentElement.scrollHeight, behavior: 'smooth' });
}

// ===== API ÇAĞRILARI =====
async function callNvidia(task, context) {
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + nvidiaKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-ai/deepseek-v4-flash-0731', messages: msgs, max_tokens: 1024, temperature: 0.7, top_p: 0.95 })
  });
  const d = await r.json();
  if (d.choices && d.choices[0] && d.choices[0].message) return d.choices[0].message.content;
  throw new Error(d.error?.message || 'NVIDIA yanıt vermedi');
}

async function callNara(task, context) {
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const r = await fetch('https://router.bynara.id/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + naraKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tencent-hy3-free', messages: msgs, max_tokens: 1024 })
  });
  const d = await r.json();
  if (d.choices && d.choices[0] && d.choices[0].message) return d.choices[0].message.content;
  throw new Error(d.error?.message || 'NaraRouter yanıt vermedi');
}

async function callAirforce(task, context) {
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const r = await fetch('https://api.airforce/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + airforceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mimo-v2.5-pro', messages: msgs, max_tokens: 1024 })
  });
  const d = await r.json();
  if (d.choices && d.choices[0] && d.choices[0].message) return d.choices[0].message.content;
  throw new Error(d.error?.message || 'Airforce yanıt vermedi');
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;

  const typingEl = addMessage('Asistan çalışıyor...', 'bot');
  typingEl.classList.add('typing');

  const context = chatHistory.map(m => m.role + ': ' + m.content).join('\n');

  try {
    let reply;
    if (activeBrain === 'nvidia') {
      if (!nvidiaKey) throw new Error('NVIDIA API key girilmemiş. Ayarlardan key girin.');
      reply = await callNvidia(text, context);
    } else if (activeBrain === 'airforce') {
      if (!airforceKey) throw new Error('Airforce API key girilmemiş. Ayarlardan key girin.');
      reply = await callAirforce(text, context);
    } else {
      if (!naraKey) throw new Error('NaraRouter API key girilmemiş. Ayarlardan key girin.');
      reply = await callNara(text, context);
    }
    typingEl.remove();
    addMessage(reply, 'bot');
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: reply });
  } catch(e) {
    typingEl.remove();
    addMessage('⚠️ Hata: ' + e.message, 'bot');
  }

  sendBtn.disabled = false;
  userInput.focus();
}
