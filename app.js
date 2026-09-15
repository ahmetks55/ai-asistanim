// ===== AI ASİSTANIM =====
const API = 'http://localhost:8788';
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const brainSelect = document.getElementById('brainSelect');
const connStatus = document.getElementById('connStatus');

let chatHistory = [];

// Köprü durumu
fetch(API + '/health').then(r => r.json()).then(() => {
  connStatus.textContent = '🟢 Köprü aktif';
  connStatus.className = 'conn-status ok';
}).catch(() => {
  connStatus.textContent = '🔴 Köprü kapalı (node server.js)';
  connStatus.className = 'conn-status error';
});

// Settings
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').style.display = 'flex';
document.getElementById('closeSettings').onclick = () => document.getElementById('settingsModal').style.display = 'none';
document.getElementById('settingsModal').onclick = (e) => { if (e.target.id === 'settingsModal') e.target.style.display = 'none'; };

// Key yükle
fetch(API + '/keys').then(r => r.json()).then(d => {
  document.getElementById('nvidiaKey').value = d.nvidia ? '••••••••' : '';
  document.getElementById('naraKey').value = d.nara ? '••••••••' : '';
  document.getElementById('airforceKey').value = d.airforce ? '••••••••' : '';
  document.getElementById('pollinationsKey').value = d.pollinations ? '••••••••' : '';
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
  const val = brainSelect.value;
  const [provider, model] = val.split(':');

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
    if (provider === 'image') {
      // Pollinations image generation
      const encoded = encodeURIComponent(text);
      const url = 'https://image.pollinations.ai/prompt/' + encoded + '?model=' + model + '&width=1024&height=1024';
      typing.remove();
      addMessage('🖼️ Görsel oluşturuluyor...', 'bot');
      const imgDiv = document.createElement('div');
      imgDiv.className = 'message bot';
      imgDiv.innerHTML = '<img src="' + url + '" style="max-width:100%;border-radius:12px;" />';
      messagesEl.appendChild(imgDiv);
      messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'assistant', content: 'Görsel üretildi: ' + text });
    } else if (provider === 'video') {
      // Pollinations video generation
      typing.remove();
      addMessage('🎬 Video oluşturuluyor... Bu işlem 1-2 dakika sürebilir.', 'bot');
      const r = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages })
      });
      const d = await r.json();
      if (d.video) {
        const vidDiv = document.createElement('div');
        vidDiv.className = 'message bot';
        vidDiv.innerHTML = '<video src="' + d.video + '" controls style="max-width:100%;border-radius:12px;"></video>';
        messagesEl.appendChild(vidDiv);
        messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: 'Video üretildi: ' + text });
      } else if (d.job_id) {
        // Async job - poll for result
        const statusMsg = addMessage('Video işleniyor... Lütfen bekleyin.', 'bot');
        let attempts = 0;
        const poll = async () => {
          attempts++;
          if (attempts > 60) {
            statusMsg.innerHTML = '<div class="msg-content">Video işleniyor ama çok uzun sürdü. <a href="https://pollinations.ai" target="_blank">Pollinations</a> dashboardundan kontrol edin.</div>';
            return;
          }
          try {
            const pr = await fetch(API + '/video-status?job_id=' + d.job_id);
            const pd = await pr.json();
            if (pd.status === 'completed' && pd.video_url) {
              statusMsg.innerHTML = '<video src="' + pd.video_url + '" controls style="max-width:100%;border-radius:12px;"></video>';
              chatHistory.push({ role: 'user', content: text });
              chatHistory.push({ role: 'assistant', content: 'Video üretildi: ' + text });
            } else if (pd.status === 'failed') {
              statusMsg.innerHTML = '<div class="msg-content">Video oluşturulamadı: ' + (pd.error || 'Bilinmeyen hata') + '</div>';
            } else {
              setTimeout(poll, 3000);
            }
          } catch(e) {
            setTimeout(poll, 3000);
          }
        };
        poll();
      } else {
        addMessage('Hata: ' + (d.error || 'Video oluşturulamadı'), 'bot');
      }
    } else {
      const r = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages })
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
    }
  } catch(e) {
    typing.remove();
    addMessage('Köprüye bağlanılamadı. Köprüyü başlatın: node server.js', 'bot');
  }
  sendBtn.disabled = false;
}

sendBtn.onclick = send;
userInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
