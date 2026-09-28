// PROMO 62 - COMPLETE APP WITH ALL FEATURES
let currentUser = null;
let token = null;
let data = {
  schedule: [], documents: [], grades: [], events: [], forum: [], users: [],
  photos: [], notifications: [], conversations: [], activity: []
};
const API = '/api';

// ============= PWA INSTALLATION BANNER =============
let deferredPrompt;
let installationDismissed = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installationDismissed = localStorage.getItem('installDismissed') === 'true';
  if (!installationDismissed) {
    setTimeout(() => showInstallBanner(), 1000);
  }
});

function showInstallBanner() {
  const existing = document.getElementById('install-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #FF6600, #E55A00);
    color: white;
    padding: 14px 16px;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    font-family: inherit;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 14px;">📱 Installer l'application</div>
        <div style="margin: 2px 0 0 0; font-size: 12px; opacity: 0.9;">Accès direct depuis votre écran d'accueil</div>
      </div>
      <button onclick="installApp()" style="
        background: white;
        color: #FF6600;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
        flex-shrink: 0;
        white-space: nowrap;
      ">Installer</button>
      <button onclick="dismissInstallBanner()" style="
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 18px;
        flex-shrink: 0;
      ">✕</button>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
  if (document.querySelector('.app')) {
    document.querySelector('.app').style.marginTop = '60px';
  }
}

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem('installDismissed', 'true');
        installationDismissed = true;
      }
      deferredPrompt = null;
      dismissInstallBanner();
    });
  }
}

function dismissInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.remove();
    const app = document.querySelector('.app');
    if (app) app.style.marginTop = '0';
  }
}

window.addEventListener('appinstalled', () => {
  localStorage.setItem('installDismissed', 'true');
  dismissInstallBanner();
});

function init() {
  token = localStorage.getItem('token');
  currentUser = JSON.parse(localStorage.getItem('user'));
  if (token && currentUser) {
    showApp();
    loadAllData();
    setInterval(loadNotifications, 5000);
  } else {
    showAuth();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
}

function showAuth() {
  document.getElementById('app').innerHTML = `<div class="auth-screen"><div class="auth-box"><h1>Promo 62</h1><p>ENA Diplomatie</p><div id="login-form"><div class="form-group"><label>Email</label><input type="email" id="email" placeholder="votre@email.com"></div><div class="form-group"><label>Mot de passe</label><input type="password" id="password" placeholder="••••••••"></div><button class="btn" onclick="login()">Connexion</button><div class="toggle-auth">Pas inscrit? <a onclick="toggleForm()">Créer un compte</a></div></div><div id="register-form" style="display:none"><div class="form-group"><label>Nom</label><input type="text" id="reg-name" placeholder="Votre nom"></div><div class="form-group"><label>Email</label><input type="email" id="reg-email" placeholder="votre@email.com"></div><div class="form-group"><label>Mot de passe</label><input type="password" id="reg-password" placeholder="••••••••"></div><button class="btn" onclick="register()">Créer mon compte</button><div class="toggle-auth">Déjà inscrit? <a onclick="toggleForm()">Se connecter</a></div></div></div></div>`;
}

function toggleForm() {
  document.getElementById('login-form').style.display = document.getElementById('login-form').style.display === 'none' ? 'block' : 'none';
  document.getElementById('register-form').style.display = document.getElementById('register-form').style.display === 'none' ? 'block' : 'none';
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    loadAllData();
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
}

async function register() {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  try {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
    if (!res.ok) throw new Error('Registration failed');
    const data = await res.json();
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    loadAllData();
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
}

function showApp() {
  const tabs = `<button class="tab-btn active" onclick="switchTab('student', this)">Étudiant</button>
    ${currentUser.role === 'admin' ? '<button class="tab-btn" onclick="switchTab(\'admin\', this)">Admin</button>' : ''}
    <button class="tab-btn" onclick="switchTab('forum', this)">Forum</button>
    <button class="tab-btn" onclick="switchTab('messages', this)">Messages</button>
    ${currentUser.role === 'admin' ? '<button class="tab-btn" onclick="switchTab(\'moderation\', this)">Modération</button>' : ''}`;

  document.getElementById('app').innerHTML = `<div class="app">
    <div class="header"><h1>Promo 62 – ENA Diplomatie</h1><p>Plateforme communautaire privée</p></div>
    <div class="header-actions"><span>Bienvenue, ${currentUser.name}</span><span id="notif-badge" style="cursor:pointer" onclick="showNotifications()">🔔 0</span><button class="logout-btn" onclick="logout()">Déconnexion</button></div>
    <div class="tabs">${tabs}</div>
    <div class="content">${renderStudentDashboard()}${currentUser.role === 'admin' ? renderAdminPanel() : ''}${renderForum()}${renderMessages()}${currentUser.role === 'admin' ? renderModeration() : ''}</div>
  </div>`;
  updateNotificationBadge();
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  btn?.classList.add('active');
}

function renderStudentDashboard() {
  const myGrades = data.grades.filter(g => g.student_id === currentUser.id);
  const avg = myGrades.length ? (myGrades.reduce((s, g) => s + (g.score || 0), 0) / myGrades.length).toFixed(1) : '0';

  return `<div id="student" class="section active">
    <div class="welcome-box"><h2 class="welcome-title">Bienvenue, ${currentUser.name}</h2><p class="welcome-date">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-label">Notes moyennes</div><div class="stat-value">${avg}</div></div>
      <div class="stat-box green"><div class="stat-label">Événements</div><div class="stat-value">${data.events.length}</div></div>
    </div>
    <div class="card"><h3 class="card-title">Emploi du temps</h3><div class="card-content">${data.schedule.length ? data.schedule.map(s => `<div class="item"><span class="item-name">${s.course_name}</span><span class="item-time">${s.day_of_week} ${s.start_time}</span></div>`).join('') : '<p style="color: #999;">Aucun cours</p>'}</div></div>
    <div class="card"><h3 class="card-title">Documents</h3><div class="card-content">${data.documents.length ? data.documents.map(d => `<div class="item"><span class="item-name">${d.title}</span><span class="item-time">${d.size} KB</span></div>`).join('') : '<p style="color: #999;">Aucun document</p>'}<button class="btn-download" onclick="searchDocs()">Rechercher</button></div></div>
    <div class="card green"><h3 class="card-title">Galerie photos</h3><div class="card-content" style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">${data.photos.slice(0, 4).map(p => `<div style="border-radius: 4px; overflow: hidden; aspect-ratio: 1; background: #f0f0f0;"><img src="${p.photo_url}" style="width: 100%; height: 100%; object-fit: cover;"></div>`).join('')}</div></div>
    <div class="card green"><h3 class="card-title">Événements à venir</h3><div class="card-content">${data.events.slice(0, 3).map(e => `<div style="padding: 8px 0; border-bottom: 1px solid #e8e8e8;"><div class="event-title">${e.title}</div><div class="event-date">${new Date(e.event_date).toLocaleDateString('fr-FR')} · ${new Date(e.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div></div>`).join('')}</div></div>
  </div>`;
}

function renderAdminPanel() {
  return `<div id="admin" class="section">
    <div class="welcome-box"><h2 class="welcome-title">Panneau d'administration</h2><p class="welcome-date">Gère tous les contenus et données</p></div>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-label">Utilisateurs</div><div class="stat-value" id="stat-users">0</div></div>
      <div class="stat-box"><div class="stat-label">Posts</div><div class="stat-value" id="stat-posts">0</div></div>
      <div class="stat-box"><div class="stat-label">Documents</div><div class="stat-value" id="stat-docs">0</div></div>
      <div class="stat-box green"><div class="stat-label">Événements</div><div class="stat-value" id="stat-events">0</div></div>
    </div>
    <div class="card"><h3 class="card-title">Ajouter un document</h3><div class="card-content"><input type="text" id="doc-title" placeholder="Titre"><input type="text" id="doc-file" placeholder="Nom du fichier"><input type="number" id="doc-size" placeholder="Taille KB"><select id="doc-cat" style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #e8e8e8; border-radius: 4px;"><option value="">Choisir une catégorie</option></select><button class="btn-download" onclick="addDoc()" style="background: #FF6600; color: white; border: none;">Ajouter</button></div></div>
    <div class="card"><h3 class="card-title">Ajouter une photo</h3><div class="card-content"><input type="text" id="photo-title" placeholder="Titre de la photo"><textarea id="photo-url" placeholder="Coller l'URL de l'image" style="width: 100%; padding: 8px; border: 1px solid #e8e8e8; min-height: 80px; resize: none;"></textarea><button class="btn-download" onclick="addPhoto()" style="background: #00A651; color: white; border: none;">Ajouter la photo</button></div></div>
    <div class="card"><h3 class="card-title">Ajouter un événement</h3><div class="card-content"><input type="text" id="event-title" placeholder="Titre"><input type="datetime-local" id="event-date"><input type="text" id="event-loc" placeholder="Lieu"><button class="btn-download" onclick="addEvent()" style="background: #FF6600; color: white; border: none;">+ Ajouter</button></div></div>
    <div class="card green"><h3 class="card-title">Activité récente</h3><div class="card-content" id="activity-log"></div></div>
  </div>`;
}

function renderForum() {
  return `<div id="forum" class="section">
    <div class="welcome-box"><h2 class="welcome-title">Forum – Groupe Promo 62</h2><p class="welcome-date">Partage et discussions libres</p></div>
    <div class="card"><div class="card-content"><textarea id="forum-text" placeholder="Dis quelque chose..." style="width: 100%; padding: 10px; border: 1px solid #e8e8e8; border-radius: 4px; min-height: 80px; resize: none;"></textarea><button class="btn-download" onclick="postForum()" style="background: #FF6600; color: white; border: none; margin: 8px 0; width: 100%;">Poster</button></div></div>
    <div id="forum-feed"></div>
  </div>`;
}

function renderMessages() {
  return `<div id="messages" class="section">
    <div class="welcome-box"><h2 class="welcome-title">Messages privés</h2><p class="welcome-date">Communique avec tes camarades</p></div>
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; height: 500px;">
      <div style="border: 1px solid #e8e8e8; border-radius: 4px; overflow-y: auto;" id="conversations-list"></div>
      <div style="border: 1px solid #e8e8e8; border-radius: 4px; display: flex; flex-direction: column;">
        <div style="flex: 1; overflow-y: auto; padding: 12px;" id="messages-display"></div>
        <div style="padding: 12px; border-top: 1px solid #e8e8e8;"><input type="text" id="msg-input" placeholder="Écris un message..." style="width: calc(100% - 50px); padding: 8px; border: 1px solid #e8e8e8; border-radius: 4px;"><button onclick="sendMessage()" style="width: 40px; margin-left: 8px; background: #FF6600; color: white; border: none; border-radius: 4px; cursor: pointer;">↓</button></div>
      </div>
    </div>
  </div>`;
}

function renderModeration() {
  return `<div id="moderation" class="section">
    <div class="welcome-box"><h2 class="welcome-title">Modération</h2><p class="welcome-date">Gère le contenu du forum</p></div>
    <div class="card"><h3 class="card-title">Posts signalés</h3><div class="card-content" id="moderation-content"></div></div>
  </div>`;
}

async function loadAllData() {
  await Promise.all([
    fetch(`${API}/schedule`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.schedule = d).catch(e => console.error('Schedule:', e)),
    fetch(`${API}/documents`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.documents = d).catch(e => console.error('Docs:', e)),
    fetch(`${API}/grades`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.grades = d).catch(e => console.error('Grades:', e)),
    fetch(`${API}/events`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.events = d).catch(e => console.error('Events:', e)),
    fetch(`${API}/forum`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.forum = d).catch(e => console.error('Forum:', e)),
    fetch(`${API}/photos`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.photos = d).catch(e => console.error('Photos:', e)),
    fetch(`${API}/notifications`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.notifications = d).catch(e => console.error('Notifs:', e)),
    fetch(`${API}/conversations`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.conversations = d).catch(e => console.error('Conversations:', e)),
    ...(currentUser.role === 'admin' ? [
      fetch(`${API}/users`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.users = d).catch(e => console.error('Users:', e)),
      fetch(`${API}/admin/activity`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(d => data.activity = d).catch(e => console.error('Activity:', e))
    ] : [])
  ]);
  renderForumFeed();
  if (currentUser.role === 'admin') updateAdminStats();
}

function renderForumFeed() {
  const feed = data.forum.map(post => `
    <div class="forum-post">
      <div style="display: flex; justify-content: space-between;">
        <div class="forum-author">${post.name}</div>
        ${post.user_id === currentUser.id || currentUser.role === 'admin' ? `<span onclick="deletePost('${post.id}')" style="cursor: pointer; color: #999;">✕</span>` : ''}
      </div>
      <div class="forum-text">${post.content}</div>
      <div style="display: flex; gap: 12px; margin: 8px 0;">
        <span onclick="likePost('${post.id}')" style="cursor: pointer;">❤️ ${post.likes_count || 0}</span>
        <span onclick="showComments('${post.id}')" style="cursor: pointer;">💬 ${post.comments_count || 0}</span>
      </div>
      <div id="comments-${post.id}" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e8e8e8;"></div>
      <div class="forum-time">${new Date(post.created_at).toLocaleDateString('fr-FR')} · ${new Date(post.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `).join('');
  document.getElementById('forum-feed').innerHTML = feed || '<p style="color: #999; text-align: center;">Aucun message pour le moment</p>';
}

async function postForum() {
  const content = document.getElementById('forum-text').value;
  if (!content.trim()) { alert('Écris quelque chose!'); return; }
  try {
    await fetch(`${API}/forum`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    document.getElementById('forum-text').value = '';
    await loadAllData();
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function deletePost(postId) {
  if (!confirm('Supprimer ce post?')) return;
  try {
    await fetch(`${API}/forum/${postId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    await loadAllData();
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function likePost(postId) {
  try {
    await fetch(`${API}/forum/${postId}/react`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reaction_type: 'like' }) });
    await loadAllData();
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function showComments(postId) {
  try {
    const comments = await fetch(`${API}/forum/${postId}/comments`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());
    const div = document.getElementById(`comments-${postId}`);
    div.style.display = div.style.display === 'none' ? 'block' : 'none';
    div.innerHTML = comments.map(c => `<div style="padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 8px;"><strong>${c.name}</strong>: ${c.content}</div>`).join('') + `<textarea id="comment-input-${postId}" placeholder="Ajouter un commentaire..." style="width: 100%; padding: 8px; border: 1px solid #e8e8e8; border-radius: 4px; margin: 8px 0;"></textarea><button onclick="addComment('${postId}')" style="background: #FF6600; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Commenter</button>`;
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function addComment(postId) {
  const content = document.getElementById(`comment-input-${postId}`).value;
  if (!content.trim()) return;
  try {
    await fetch(`${API}/forum/${postId}/comments`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    await showComments(postId);
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function addDoc() {
  const title = document.getElementById('doc-title').value;
  const filename = document.getElementById('doc-file').value;
  const size = document.getElementById('doc-size').value;
  const category = document.getElementById('doc-cat').value;
  try {
    await fetch(`${API}/documents`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title, filename, size, category }) });
    alert('Document ajouté!');
    await loadAllData();
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function addPhoto() {
  const title = document.getElementById('photo-title').value;
  const photo_url = document.getElementById('photo-url').value;
  try {
    await fetch(`${API}/photos`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title, photo_url }) });
    alert('Photo ajoutée!');
    await loadAllData();
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function addEvent() {
  const title = document.getElementById('event-title').value;
  const event_date = document.getElementById('event-date').value;
  const location = document.getElementById('event-loc').value;
  try {
    await fetch(`${API}/events`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title, event_date, location, event_type: 'school', tags: [] }) });
    alert('Événement créé!');
    await loadAllData();
  } catch (err) { alert('Erreur: ' + err.message); }
}

async function loadNotifications() {
  try {
    const notifs = await fetch(`${API}/notifications`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json());
    data.notifications = notifs;
    updateNotificationBadge();
  } catch (err) { console.error('Notif error:', err); }
}

function updateNotificationBadge() {
  const unread = data.notifications.filter(n => !n.is_read).length;
  const badge = document.getElementById('notif-badge');
  if (badge) badge.textContent = `🔔 ${unread}`;
}

function showNotifications() {
  alert('Notifications:\n' + (data.notifications.length ? data.notifications.slice(0, 5).map(n => `- ${n.content}`).join('\n') : 'Aucune notification'));
}

function updateAdminStats() {
  document.getElementById('stat-users').textContent = data.users.length;
  document.getElementById('stat-posts').textContent = data.forum.length;
  document.getElementById('stat-docs').textContent = data.documents.length;
  document.getElementById('stat-events').textContent = data.events.length;
  document.getElementById('activity-log').innerHTML = data.activity.slice(0, 10).map(a => `<div style="padding: 8px 0; border-bottom: 1px solid #e8e8e8;"><strong>${a.action}</strong> par ${a.user_id}</div>`).join('');
}

function searchDocs() {
  const query = prompt('Chercher un document:');
  if (!query) return;
  fetch(`${API}/search?q=${query}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()).then(results => {
    alert('Résultats:\nDocuments: ' + results.documents.length + '\nPosts: ' + results.posts.length + '\nÉvénements: ' + results.events.length);
  });
}

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const content = input.value;
  if (!content.trim()) return;
  const selectedConv = document.querySelector('.conversation-item.active');
  if (!selectedConv) { alert('Sélectionne une conversation'); return; }
  const userId = selectedConv.dataset.userId;
  try {
    await fetch(`${API}/messages/${userId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    input.value = '';
    await loadAllData();
  } catch (err) { alert('Erreur: ' + err.message); }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  token = null;
  showAuth();
}

init();
