// frontend/assets/js/chat.js
let currentSessionId = null;

const chatDateBar   = document.getElementById('chat-date-bar');
const chatContainer = document.getElementById('chat-container');
const chatForm      = document.getElementById('chat-form');
const messageInput  = document.getElementById('message-input');
const newSessionBtn = document.getElementById('new-session-btn');
const sessionList   = document.getElementById('session-list');

// Profile dropdown elements
const avatarBtn        = document.getElementById('avatarBtn');
const profileMenu      = document.getElementById('profileMenu');
const logoutBtn        = document.getElementById('logoutBtn');
const editPasswordBtn  = document.getElementById('editPasswordBtn');

/* ---------- Markdown config (safe, chat-friendly) ---------- */
(function configureMarkdown() {
  if (window.marked) {
    marked.setOptions({
      gfm: true,
      breaks: true,       // single newlines -> <br>
      smartLists: true,
      headerIds: false,
      mangle: false
    });
  }
})();

/* ---------- Helpers ---------- */
function capFirst(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateOnly(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleDateString();
}

function setDateBar(ts) {
  chatDateBar.textContent = formatDateOnly(ts);
  chatDateBar.style.display = 'block';
}

function createMessageElement(text, sender) {
  const div = document.createElement('div');
  div.classList.add('message', sender === 'user' ? 'user-msg' : 'bot-msg');

  const safeText = String(text ?? '');

  if (window.marked) {
    const rawHTML = marked.parse(safeText);
    div.innerHTML = window.DOMPurify ? DOMPurify.sanitize(rawHTML) : rawHTML;
  } else {
    div.textContent = safeText;
  }
  return div;
}

function createLoadingSpinner() {
  const spinner = document.createElement('div');
  spinner.classList.add('message', 'bot-msg');
  spinner.style.display = "flex";
  spinner.style.justifyContent = "flex-start";
  spinner.style.alignItems = "center";

  const circle = document.createElement('div');
  circle.classList.add('loading-spinner');

  spinner.appendChild(circle);
  return spinner;
}

/* ---------- Session management ---------- */
async function ensureSession() {
  if (currentSessionId) return currentSessionId;
  const res = await fetch('/api/chat/session', { method: 'POST', credentials: 'include' });
  const data = await res.json();
  currentSessionId = data.sessionId;
  return currentSessionId;
}

/* ---------- History list (single static title) ---------- */
async function fetchSessions() {
  const res = await fetch('/api/chat/sessions', { credentials: 'include' });
  if (!res.ok) return;
  const sessions = await res.json();
  sessionList.innerHTML = '';

  sessions.forEach(s => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'session-item-btn';

    const title = document.createElement('div');
    title.className = 'session-title';

    // Use locally cached title (first user msg) if available, else fallback
    const cached = localStorage.getItem(`sessionTitle_${s.sessionId}`);
    title.textContent = cached ? capFirst(cached.trim()) : 'Conversation';

    btn.appendChild(title);
    btn.addEventListener('click', () => loadSession(s.sessionId));
    li.appendChild(btn);
    sessionList.appendChild(li);
  });
}

/* ---------- Load a session ---------- */
async function loadSession(sessionId) {
  currentSessionId = sessionId;

  const res = await fetch(`/api/chat/session/${encodeURIComponent(sessionId)}`, { credentials: 'include' });
  if (!res.ok) return;
  const messages = await res.json();

  chatContainer.innerHTML = '';

  // Set date bar from the first message timestamp (or today if none)
  if (messages && messages.length) {
    setDateBar(messages[0].timestamp);
  } else {
    setDateBar(Date.now());
  }

  // If no cached title yet, use first user message of this session
  if (!localStorage.getItem(`sessionTitle_${sessionId}`) && messages?.length) {
    const firstUserMsg = messages[0]?.message || '';
    if (firstUserMsg) localStorage.setItem(`sessionTitle_${sessionId}`, firstUserMsg);
    // refresh history titles
    fetchSessions();
  }

  messages.forEach(m => {
    chatContainer.appendChild(createMessageElement(m.message, 'user'));
    chatContainer.appendChild(createMessageElement(m.reply, 'bot'));
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ---------- New session ---------- */
if (newSessionBtn) {
  newSessionBtn.addEventListener('click', async () => {
    currentSessionId = null;
    await ensureSession();
    setDateBar(Date.now());
    chatContainer.innerHTML = '';
    messageInput && messageInput.focus();
    await fetchSessions();
  });
}

/* ---------- Send message ---------- */
if (chatForm) {
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    messageInput.value = '';
    messageInput.disabled = true;

    await ensureSession();

    // Cache static title if not set yet (first user message)
    const titleKey = `sessionTitle_${currentSessionId}`;
    if (!localStorage.getItem(titleKey)) {
      localStorage.setItem(titleKey, message);
      fetchSessions();
    }

    if (!chatDateBar.textContent) setDateBar(Date.now());

    const interactionDiv = document.createElement('div');
    interactionDiv.style.display = 'flex';
    interactionDiv.style.flexDirection = 'column';
    interactionDiv.style.gap = '0.5rem';
    interactionDiv.style.marginBottom = '1rem';

    const userMsgElem = createMessageElement(message, 'user');
    interactionDiv.appendChild(userMsgElem);

    const loadingElem = createLoadingSpinner();
    interactionDiv.appendChild(loadingElem);

    chatContainer.appendChild(interactionDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: currentSessionId }),
      });

      const data = await response.json();

      const botReplyText = data.reply
        ? data.reply
        : (data.error ? `Error: ${data.error}` : 'No response from assistant.');

      const botMsgElem = createMessageElement(botReplyText, 'bot');
      interactionDiv.replaceChild(botMsgElem, loadingElem);

      chatContainer.scrollTop = chatContainer.scrollHeight;
      fetchSessions();
    } catch (err) {
      const errorElem = createMessageElement('Failed to fetch response.', 'bot');
      interactionDiv.replaceChild(errorElem, loadingElem);
    } finally {
      messageInput.disabled = false;
      messageInput.focus();
    }
  });
}

/* ---------- Profile dropdown behavior ---------- */
if (avatarBtn && profileMenu) {
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => profileMenu.classList.remove('open'));
  profileMenu.addEventListener('click', (e) => e.stopPropagation());
}
if (editPasswordBtn) {
  editPasswordBtn.addEventListener('click', () => {
    window.location.href = '/profile#password';
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
      alert('Failed to log out.');
    }
  });
}

/* ---------- Boot ---------- */
(async () => {
  try {
    await ensureSession();
    await fetchSessions();
    if (!chatDateBar.textContent) setDateBar(Date.now());
  } catch (e) {
    console.error(e);
  }
  if (messageInput) messageInput.focus();
})();
