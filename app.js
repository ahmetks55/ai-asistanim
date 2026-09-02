const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

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

  addMessage(text, 'user');
  userInput.value = '';

  const typingEl = addMessage('Asistan yazıyor...', 'bot');
  typingEl.classList.add('typing');

  sendBtn.disabled = true;

  try {
    const response = await callPollinations(text);
    typingEl.remove();
    addMessage(response, 'bot');
  } catch (err) {
    typingEl.remove();
    addMessage('⚠️ Hata: ' + err.message + ' Lütfen biraz sonra tekrar deneyin.', 'bot');
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

async function callPollinations(prompt) {
  const system = 'Sen Türkçe konuşan yardımsever bir AI asistanısın. Kısa ve net cevaplar ver.';
  const messages = [];
  // gather previous messages for context (without HTML)
  const history = messagesEl.querySelectorAll('.message');
  history.forEach((m) => {
    const isBot = m.classList.contains('bot');
    const txt = m.textContent.replace(/.*?:\s*/, '').trim();
    if (txt && !txt.startsWith('Asistan yazıyor') && !txt.startsWith('Merhaba! Ben')) {
      messages.push({ role: isBot ? 'assistant' : 'user', content: txt });
    }
  });
  messages.push({ role: 'user', content: prompt });

  const payload = { messages, model: 'openai', system, private: true };

  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('Servis cevap veremedi (' + res.status + ')');
  }

  const text = await res.text();
  if (!text || text.trim() === '') {
    throw new Error('Servisten yanıt alınamadı');
  }
  return text.trim();
}
