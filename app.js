// ===== AI ASİSTANIM =====
const API = 'http://localhost:8788';
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const brainSelect = document.getElementById('brainSelect');
const connStatus = document.getElementById('connStatus');

let chatHistory = [];

// Bildirim sesleri
function notifySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}
function errorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}
function connErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

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

// Provider toggle
function toggleProvider(who) {
  const card = document.querySelector('[onclick="toggleProvider(\'' + who + '\')"]');
  card.classList.toggle('open');
}
window.toggleProvider = toggleProvider;

function updateBadge(who, saved) {
  const badge = document.getElementById(who + 'Badge');
  if (badge) {
    badge.textContent = saved ? '✓ Kayıtlı' : '✗ Kayıtlı Değil';
    badge.className = 'provider-badge' + (saved ? ' active' : '');
  }
}

// Key yükle
fetch(API + '/keys').then(r => r.json()).then(d => {
  document.getElementById('naraKey').value = d.nara ? '••••••••' : '';
  document.getElementById('nvidiaKey').value = d.nvidia ? '••••••••' : '';
  document.getElementById('airforceKey').value = d.airforce ? '••••••••' : '';
  document.getElementById('pollinationsKey').value = d.pollinations ? '••••••••' : '';
  document.getElementById('hfKey').value = d.hf ? '••••••••' : '';
  updateBadge('nara', d.nara);
  updateBadge('nvidia', d.nvidia);
  updateBadge('airforce', d.airforce);
  updateBadge('pollinations', d.pollinations);
  updateBadge('hf', d.hf);
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
      updateBadge(who, true);
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
    } else if (provider === 'video' || provider === 'hfvideo') {
      // Video generation
      typing.remove();
      notifySound();
      addMessage('🎬 Video oluşturuluyor... Hazır olunca burada oynatılacak.', 'bot');
      const r = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages })
      });
      const d = await r.json();
      if (d.video) {
        notifySound();
        const vidDiv = document.createElement('div');
        vidDiv.className = 'message bot';
        vidDiv.innerHTML = '<video src="' + d.video + '" controls autoplay style="max-width:100%;border-radius:12px;"></video>';
        messagesEl.appendChild(vidDiv);
        messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: 'Video üretildi: ' + text });
      } else if (d.job_id) {
        const statusMsg = addMessage('Video işleniyor... Lütfen bekleyin.', 'bot');
        let attempts = 0;
        const poll = async () => {
          attempts++;
          if (attempts > 60) {
            errorSound();
            statusMsg.innerHTML = '<div class="msg-content">Video çok uzun sürdü. Kontrol edin.</div>';
            return;
          }
          try {
            const pr = await fetch(API + '/video-status?job_id=' + d.job_id);
            const pd = await pr.json();
            if (pd.status === 'completed' && pd.video_url) {
              notifySound();
              statusMsg.innerHTML = '<video src="' + pd.video_url + '" controls autoplay style="max-width:100%;border-radius:12px;"></video>';
            } else if (pd.status === 'failed') {
              errorSound();
              statusMsg.innerHTML = '<div class="msg-content">Hata: ' + (pd.error || 'Başarısız') + '</div>';
            } else {
              setTimeout(poll, 3000);
            }
          } catch(e) { setTimeout(poll, 3000); }
        };
        poll();
      } else {
        errorSound();
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
        notifySound();
        addMessage(d.reply, 'bot');
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: d.reply });
      } else {
        errorSound();
        addMessage('Hata: ' + (d.error || 'Yanıt alınamadı'), 'bot');
      }
    }
  } catch(e) {
    typing.remove();
    connErrorSound();
    addMessage('Köprüye bağlanılamadı. Köprüyü başlatın: node server.js', 'bot');
  }
  sendBtn.disabled = false;
}

sendBtn.onclick = send;
userInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
