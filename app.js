// ===== AI ASİSTANIM =====
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const brainSelect = document.getElementById('brainSelect');

let chatHistory = [];
let nvidiaKey = localStorage.getItem('nvidia_key') || '';
let naraKey = localStorage.getItem('nara_key') || '';
let airforceKey = localStorage.getItem('airforce_key') || '';

// Settings
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').style.display = 'flex';
document.getElementById('closeSettings').onclick = () => document.getElementById('settingsModal').style.display = 'none';
document.getElementById('settingsModal').onclick = (e) => { if (e.target.id === 'settingsModal') e.target.style.display = 'none'; };

document.getElementById('nvidiaKey').value = nvidiaKey;
document.getElementById('naraKey').value = naraKey;
document.getElementById('airforceKey').value = airforceKey;

function saveKey(who) {
  const val = document.getElementById(who + 'Key').value.trim();
  const statusEl = document.getElementById(who + 'Status');
  if (!val) { statusEl.textContent = 'Boş bırakılamaz'; statusEl.className = 'status-text error'; return; }
  if (who === 'nvidia') { nvidiaKey = val; localStorage.setItem('nvidia_key', val); }
  else if (who === 'nara') { naraKey = val; localStorage.setItem('nara_key', val); }
  else if (who === 'airforce') { airforceKey = val; localStorage.setItem('airforce_key', val); }
  statusEl.textContent = '✓ Kaydedildi';
  statusEl.className = 'status-text success';
}
window.saveKey = saveKey;

// Chat
function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = 'message ' + sender;
  div.innerHTML = '<div class="msg-content">' + text.replace(/\n/g, '<br>') + '</div>';
  messagesEl.appendChild(div);
  messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
  return div;
}

async function callNvidia(task, context) {
  const msgs = [];
  if (context) msgs.push({ role: 'system', content: context });
  msgs.push({ role: 'user', content: task });
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + nvidiaKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-ai/deepseek-v4-flash-0731', messages: msgs, max_tokens: 1024 })
  });
  const d = await r.json();
  if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
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
  if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
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
  if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
  throw new Error(d.error?.message || 'Airforce yanıt vermedi');
}

async function send() {
  const text = userInput.value.trim();
  if (!text) return;
  const brain = brainSelect.value;

  if (brain === 'nvidia' && !nvidiaKey) { addMessage('NVIDIA key girilmemiş. Ayarlardan girin.', 'bot'); return; }
  if (brain === 'nara' && !naraKey) { addMessage('NaraRouter key girilmemiş. Ayarlardan girin.', 'bot'); return; }
  if (brain === 'airforce' && !airforceKey) { addMessage('Airforce key girilmemiş. Ayarlardan girin.', 'bot'); return; }

  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;
  const typing = addMessage('Düşünüyorum...', 'bot');
  typing.classList.add('typing');

  const context = chatHistory.map(m => m.role + ': ' + m.content).join('\n');

  try {
    let reply;
    if (brain === 'nvidia') reply = await callNvidia(text, context);
    else if (brain === 'nara') reply = await callNara(text, context);
    else reply = await callAirforce(text, context);
    typing.remove();
    addMessage(reply, 'bot');
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: reply });
  } catch(e) {
    typing.remove();
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      addMessage('CORS engellendi. Bu API tarayıcıdan doğrudan çalışmaz. Köprü sunucu gerekir.', 'bot');
    } else {
      addMessage('Hata: ' + e.message, 'bot');
    }
  }
  sendBtn.disabled = false;
}

sendBtn.onclick = send;
userInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
