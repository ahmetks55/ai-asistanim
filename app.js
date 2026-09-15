// ===== AI ASİSTANIM - ANA UYGULAMA =====

const API = 'http://localhost:8788';
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
// Sayfa yüklenince seçili beyini aktifleştir
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
  saveToServer('nvidia', v);
});

document.getElementById('airforceKeySave').addEventListener('click', () => {
  const v = document.getElementById('airforceKeyInput').value.trim();
  if (!v) return;
  airforceKey = v;
  localStorage.setItem('airforce_api_key', v);
  document.getElementById('airforceKeyStatus').textContent = '✓ Kaydedildi';
  document.getElementById('airforceKeyStatus').className = 'key-status ok';
  saveToServer('airforce', v);
});

document.getElementById('naraKeySave').addEventListener('click', () => {
  const v = document.getElementById('naraKeyInput').value.trim();
  if (!v) return;
  naraKey = v;
  localStorage.setItem('nara_api_key', v);
  document.getElementById('naraKeyStatus').textContent = '✓ Kaydedildi';
  document.getElementById('naraKeyStatus').className = 'key-status ok';
  saveToServer('nara', v);
});

// Sayfa yüklenince kayıtlı key'leri inputlara doldur
document.getElementById('nvidiaKeyInput').value = nvidiaKey;
document.getElementById('airforceKeyInput').value = airforceKey;
document.getElementById('naraKeyInput').value = naraKey;

function saveToServer(provider, key) {
  fetch(API + '/save-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, key })
  }).catch(e => console.log('Key kaydetme hatası:', e.message));
}

// ===== DURUM KONTROLÜ =====
document.getElementById('checkAllStatus').addEventListener('click', checkAllStatus);

async function checkAllStatus() {
  // Köprü
  const bridgeEl = document.getElementById('bridgeStatus');
  bridgeEl.textContent = 'Kontrol...';
  bridgeEl.className = 'status-dot checking';
  try {
    const r = await fetch(API + '/health', { signal: AbortSignal.timeout(3000) });
    if (r.ok) { bridgeEl.textContent = '✓ Bağlı'; bridgeEl.className = 'status-dot ok'; }
    else { bridgeEl.textContent = '✗ Hata'; bridgeEl.className = 'status-dot error'; }
  } catch(e) { bridgeEl.textContent = '✗ Bağlantı yok'; bridgeEl.className = 'status-dot error'; }

  // NaraRouter
  const naraEl = document.getElementById('naraStatus');
  naraEl.textContent = naraKey ? '✓ Anahtar var' : '✗ Anahtar yok';
  naraEl.className = naraKey ? 'status-dot ok' : 'status-dot error';

  // NVIDIA
  const nvidiaEl = document.getElementById('nvidiaStatus');
  nvidiaEl.textContent = nvidiaKey ? '✓ Anahtar var' : '✗ Anahtar yok';
  nvidiaEl.className = nvidiaKey ? 'status-dot ok' : 'status-dot error';

  // Airforce
  const airforceEl = document.getElementById('airforceStatus');
  airforceEl.textContent = airforceKey ? '✓ Anahtar var' : '✗ Anahtar yok';
  airforceEl.className = airforceKey ? 'status-dot ok' : 'status-dot error';

  // Köprü durumunu header'da göster
  localStatus.textContent = bridgeEl.className.includes('ok') ? '✓ Köprü aktif' : '✗ Köprü kapalı';
  localStatus.className = bridgeEl.className.includes('ok') ? 'status ok' : 'status error';
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

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;

  const typingEl = addMessage('Asistan çalışıyor...', 'bot');
  typingEl.classList.add('typing');

  try {
    const res = await fetch(API + '/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: text,
        context: chatHistory.map(m => m.role + ': ' + m.content).join('\n'),
        brain: activeBrain,
        nvidiaKey: nvidiaKey,
        airforceKey: airforceKey,
        naraKey: naraKey
      })
    });

    const data = await res.json();
    typingEl.remove();

    if (data.status === 'done' && data.results && data.results[0] && data.results[0].text) {
      addMessage(data.results[0].text, 'bot');
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'assistant', content: data.results[0].text });
    } else {
      addMessage('⚠️ Beyin yanıt vermedi: ' + (data.reason || 'Bilinmeyen hata'), 'bot');
    }
  } catch(e) {
    typingEl.remove();
    addMessage('⚠️ Köprüye bağlanılamadı. Köprüyü başlatın: node bridge-server.js', 'bot');
  }

  sendBtn.disabled = false;
  userInput.focus();
}
