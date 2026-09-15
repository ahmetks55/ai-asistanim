// ===== AI ASİSTANIM =====
const API = 'http://localhost:8788';
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const brainSelect = document.getElementById('brainSelect');

let chatHistory = [];

// Settings
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').style.display = 'flex';
document.getElementById('closeSettings').onclick = () => document.getElementById('settingsModal').style.display = 'none';
document.getElementById('settingsModal').onclick = (e) => { if (e.target.id === 'settingsModal') e.target.style.display = 'none'; };

// Key yükle
fetch(API + '/keys').then(r => r.json()).then(d => {
  document.getElementById('nvidiaKey').value = d.nvidia ? '••••••••' : '';
  document.getElementById('naraKey').value = d.nara ? '••••••••' : '';
  document.getElementById('airforceKey').value = d.airforce ? '••••••••' : '';
}).catch(() => {});

function saveKey(who) {
  const val = document.getElementById(who + 'Key').value.trim();
  const statusEl = document.getElementById(who + 'Status');
  if (!val || val === '••••••••') { statusEl.textContent = 'Boş bırakılamaz'; statusEl.className = 'status-text error'; return; }
  fetch(API + '/save-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: who, key: val })
  }).then(r => r.json()).then(d => {
    if (d.ok) {
      statusEl.textContent = '✓ Kaydedildi';
      statusEl.className = 'status-text success';
      document.getElementById(who + 'Key').value = '••••••••';
    }
  }).catch(() => {
    statusEl.textContent = '✗ Köprü bağlı değil';
    statusEl.className = 'status-text error';
  });
}
window.saveKey = saveKey;

function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = 'message ' + sender;
  div.innerHTML = '<div class="msg-content">' + text.replace(/\n/g, '<br>') + '</div>';
  messagesEl.appendChild(div);
  messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
  return div;
}

async function send() {
  const text = userInput.value.trim();
  if (!text) return;
  const brain = brainSelect.value;

  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;
  const typing = addMessage('Düşünüyorum...', 'bot');
  typing.classList.add('typing');

  const messages = [];
  const context = chatHistory.map(m => m.role + ': ' + m.content).join('\n');
  if (context) messages.push({ role: 'system', content: context });
  messages.push({ role: 'user', content: text });

  try {
    const r = await fetch(API + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brain, messages })
    });
    const d = await r.json();
    typing.remove();
    if (d.reply) {
      addMessage(d.reply, 'bot');
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'assistant', content: d.reply });
    } else {
      addMessage('Hata: ' + (d.error || 'Yanıt alınamadı'), 'bot');
    }
  } catch(e) {
    typing.remove();
    addMessage('Köprüye bağlanılamadı. Köprüyü başlatın: node server.js', 'bot');
  }
  sendBtn.disabled = false;
}

sendBtn.onclick = send;
userInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
