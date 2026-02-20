// ============================================================
//  DEMIBOT - PAINEL WEB DE ADMINISTRACAO
//  Dashboard para gerenciar o bot via navegador
// ============================================================
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data', 'demibot.db')

// Verifica se o banco existe
if (!fs.existsSync(dbPath)) {
  console.log('[PANEL] Banco de dados nao encontrado. Inicie o bot primeiro para criar o banco.')
  console.log('[PANEL] Caminho esperado:', dbPath)
  process.exit(1)
}

const db = new Database(dbPath, { readonly: true })
const app = express()
const PORT = process.env.PANEL_PORT || 3000

// Credenciais do painel (altere conforme necessario)
const PANEL_USER = process.env.PANEL_USER || 'admin'
const PANEL_PASS = process.env.PANEL_PASS || 'demibot123'

// ============================================================
//  MIDDLEWARE
// ============================================================
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Autenticacao basica
function authMiddleware(req, res, next) {
  // Rotas publicas
  if (req.path === '/login' || req.path === '/api/login') return next()

  const token = req.headers['x-auth-token'] || req.query.token
  if (token === Buffer.from(`${PANEL_USER}:${PANEL_PASS}`).toString('base64')) {
    return next()
  }

  // Verificar cookie
  const cookie = req.headers.cookie || ''
  const authCookie = cookie.split(';').find(c => c.trim().startsWith('demibot_auth='))
  if (authCookie) {
    const val = authCookie.split('=')[1]?.trim()
    if (val === Buffer.from(`${PANEL_USER}:${PANEL_PASS}`).toString('base64')) {
      return next()
    }
  }

  // Redirecionar para login se for pagina HTML
  if (req.accepts('html')) {
    return res.redirect('/login')
  }

  res.status(401).json({ error: 'Nao autorizado' })
}

// ============================================================
//  API ROUTES
// ============================================================

// Login
app.post('/api/login', (req, res) => {
  const { user, pass } = req.body
  if (user === PANEL_USER && pass === PANEL_PASS) {
    const token = Buffer.from(`${user}:${pass}`).toString('base64')
    res.cookie('demibot_auth', token, { httpOnly: true, maxAge: 86400000 })
    return res.json({ success: true, token })
  }
  res.status(401).json({ error: 'Credenciais invalidas' })
})

// Logout
app.get('/api/logout', (req, res) => {
  res.clearCookie('demibot_auth')
  res.redirect('/login')
})

// Dashboard stats
app.get('/api/stats', authMiddleware, (req, res) => {
  try {
    const totalGroups = db.prepare('SELECT COUNT(*) as count FROM groups').get().count
    const totalMembers = db.prepare('SELECT COUNT(*) as count FROM members').get().count
    const totalBlacklist = db.prepare('SELECT COUNT(*) as count FROM blacklist').get().count
    const totalWarnings = db.prepare('SELECT SUM(warnings) as total FROM members').get().total || 0
    const totalMessages = db.prepare('SELECT SUM(messageCount) as total FROM members').get().total || 0
    const totalStickers = db.prepare('SELECT SUM(stickerCount) as total FROM members').get().total || 0
    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get().count
    const totalScheduled = db.prepare('SELECT COUNT(*) as count FROM scheduled_messages WHERE active = 1').get().count
    const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 20').all()
    const topMembers = db.prepare('SELECT userId, SUM(messageCount) as msgs FROM members GROUP BY userId ORDER BY msgs DESC LIMIT 10').all()
    const topGroups = db.prepare('SELECT odGroupId, COUNT(*) as members FROM members GROUP BY odGroupId ORDER BY members DESC LIMIT 10').all()

    res.json({
      totalGroups,
      totalMembers,
      totalBlacklist,
      totalWarnings,
      totalMessages,
      totalStickers,
      totalNotes,
      totalScheduled,
      recentActivity,
      topMembers,
      topGroups
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Listar grupos
app.get('/api/groups', authMiddleware, (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups ORDER BY createdAt DESC').all()
    res.json(groups)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Detalhes de um grupo
app.get('/api/groups/:groupId', authMiddleware, (req, res) => {
  try {
    const group = db.prepare('SELECT * FROM groups WHERE groupId = ?').get(req.params.groupId)
    if (!group) return res.status(404).json({ error: 'Grupo nao encontrado' })

    const members = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY messageCount DESC').all(req.params.groupId)
    const warnings = db.prepare('SELECT * FROM members WHERE odGroupId = ? AND warnings > 0 ORDER BY warnings DESC').all(req.params.groupId)
    const notes = db.prepare('SELECT * FROM notes WHERE groupId = ?').all(req.params.groupId)
    const scheduled = db.prepare('SELECT * FROM scheduled_messages WHERE groupId = ?').all(req.params.groupId)
    const activity = db.prepare('SELECT * FROM activity_log WHERE groupId = ? ORDER BY timestamp DESC LIMIT 50').all(req.params.groupId)
    const bannedWords = db.prepare('SELECT * FROM banned_words WHERE groupId = ?').all(req.params.groupId)
    const blockedCmds = db.prepare('SELECT * FROM blocked_cmds WHERE groupId = ?').all(req.params.groupId)

    res.json({
      group,
      members,
      warnings,
      notes,
      scheduled,
      activity,
      bannedWords,
      blockedCmds
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Listar membros de um grupo
app.get('/api/groups/:groupId/members', authMiddleware, (req, res) => {
  try {
    const members = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY messageCount DESC').all(req.params.groupId)
    res.json(members)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Blacklist
app.get('/api/blacklist', authMiddleware, (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM blacklist ORDER BY addedAt DESC').all()
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Activity log
app.get('/api/activity', authMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const groupId = req.query.groupId
    let query = 'SELECT * FROM activity_log'
    const params = []

    if (groupId) {
      query += ' WHERE groupId = ?'
      params.push(groupId)
    }
    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(limit)

    const logs = db.prepare(query).all(...params)
    res.json(logs)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Polls
app.get('/api/polls', authMiddleware, (req, res) => {
  try {
    const polls = db.prepare('SELECT * FROM polls ORDER BY createdAt DESC').all()
    res.json(polls)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Feedback
app.get('/api/feedback', authMiddleware, (req, res) => {
  try {
    const feedbacks = db.prepare('SELECT * FROM feedback ORDER BY createdAt DESC').all()
    res.json(feedbacks)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Rankings
app.get('/api/rankings/:groupId', authMiddleware, (req, res) => {
  try {
    const gid = req.params.groupId
    const ativos = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY messageCount DESC LIMIT 15').all(gid)
    const gold = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY gold DESC LIMIT 15').all(gid)
    const level = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY xp DESC LIMIT 15').all(gid)
    const stickers = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY stickerCount DESC LIMIT 15').all(gid)

    res.json({ ativos, gold, level, stickers })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Marriages
app.get('/api/marriages', authMiddleware, (req, res) => {
  try {
    const marriages = db.prepare('SELECT * FROM marriages ORDER BY marriedAt DESC').all()
    res.json(marriages)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Partnerships
app.get('/api/partnerships', authMiddleware, (req, res) => {
  try {
    const partnerships = db.prepare('SELECT * FROM partnerships ORDER BY addedAt DESC').all()
    res.json(partnerships)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
//  LOGIN PAGE
// ============================================================
app.get('/login', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DemiBot - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e0e0e0;
    }
    .login-box {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    .login-box h1 {
      font-size: 2rem;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #e94560, #c23bf0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .login-box p { color: #888; margin-bottom: 24px; }
    .login-box input {
      width: 100%;
      padding: 12px 16px;
      margin-bottom: 16px;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      background: rgba(255,255,255,0.08);
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: border-color 0.3s;
    }
    .login-box input:focus { border-color: #e94560; }
    .login-box button {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(90deg, #e94560, #c23bf0);
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.3s;
    }
    .login-box button:hover { opacity: 0.9; }
    .error { color: #e94560; margin-bottom: 12px; font-size: 13px; display: none; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>DemiBot</h1>
    <p>Painel de Administracao</p>
    <div class="error" id="error">Credenciais invalidas</div>
    <input type="text" id="user" placeholder="Usuario" autocomplete="off">
    <input type="password" id="pass" placeholder="Senha">
    <button onclick="doLogin()">Entrar</button>
  </div>
  <script>
    async function doLogin() {
      const user = document.getElementById('user').value
      const pass = document.getElementById('pass').value
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass })
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('demibot_token', data.token)
        window.location.href = '/'
      } else {
        document.getElementById('error').style.display = 'block'
      }
    }
    document.getElementById('pass').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin() })
  </script>
</body>
</html>`)
})

// ============================================================
//  DASHBOARD PAGE
// ============================================================
app.get('/', authMiddleware, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DemiBot - Painel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0d1117;
      color: #e0e0e0;
      min-height: 100vh;
    }
    /* SIDEBAR */
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      width: 240px;
      height: 100vh;
      background: #161b22;
      border-right: 1px solid #30363d;
      padding: 20px 0;
      overflow-y: auto;
      z-index: 100;
    }
    .sidebar .logo {
      text-align: center;
      padding: 0 20px 20px;
      border-bottom: 1px solid #30363d;
      margin-bottom: 16px;
    }
    .sidebar .logo h2 {
      background: linear-gradient(90deg, #e94560, #c23bf0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 1.4rem;
    }
    .sidebar .logo span { color: #666; font-size: 12px; }
    .nav-item {
      display: flex;
      align-items: center;
      padding: 10px 20px;
      color: #8b949e;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      font-size: 14px;
    }
    .nav-item:hover, .nav-item.active {
      background: rgba(233,69,96,0.1);
      color: #e94560;
      border-right: 3px solid #e94560;
    }
    .nav-item svg { margin-right: 10px; width: 18px; height: 18px; }

    /* MAIN */
    .main {
      margin-left: 240px;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 1.5rem; }
    .header .logout {
      padding: 8px 16px;
      border: 1px solid #30363d;
      border-radius: 6px;
      background: transparent;
      color: #8b949e;
      cursor: pointer;
      font-size: 13px;
      text-decoration: none;
    }
    .header .logout:hover { color: #e94560; border-color: #e94560; }

    /* STAT CARDS */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 20px;
    }
    .stat-card .label { color: #8b949e; font-size: 13px; margin-bottom: 4px; }
    .stat-card .value { font-size: 1.8rem; font-weight: 700; }
    .stat-card .value.pink { color: #e94560; }
    .stat-card .value.purple { color: #c23bf0; }
    .stat-card .value.blue { color: #58a6ff; }
    .stat-card .value.green { color: #3fb950; }
    .stat-card .value.orange { color: #d29922; }
    .stat-card .value.red { color: #f85149; }

    /* TABLES */
    .panel-section {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .panel-section h3 {
      margin-bottom: 16px;
      font-size: 1.1rem;
      color: #e0e0e0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid #30363d;
      color: #8b949e;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
    }
    tbody td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(48,54,61,0.5);
    }
    tbody tr:hover { background: rgba(233,69,96,0.05); }

    /* TAB NAV */
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid #30363d;
      padding-bottom: 0;
    }
    .tab-btn {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #8b949e;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .tab-btn:hover { color: #e0e0e0; }
    .tab-btn.active { color: #e94560; border-bottom-color: #e94560; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* BADGE */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-on { background: rgba(63,185,80,0.2); color: #3fb950; }
    .badge-off { background: rgba(248,81,73,0.2); color: #f85149; }
    .badge-warn { background: rgba(210,153,34,0.2); color: #d29922; }

    /* GROUP CARD */
    .group-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .group-card:hover { border-color: #e94560; transform: translateY(-2px); }
    .group-card h4 { margin-bottom: 8px; font-size: 14px; }
    .group-card .info { color: #8b949e; font-size: 12px; }

    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main { margin-left: 0; }
    }

    /* LOADING */
    .loading {
      text-align: center;
      padding: 40px;
      color: #8b949e;
    }
    .loading::after {
      content: '';
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #30363d;
      border-top-color: #e94560;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .search-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #30363d;
      border-radius: 8px;
      background: #0d1117;
      color: #e0e0e0;
      font-size: 14px;
      outline: none;
      margin-bottom: 16px;
    }
    .search-input:focus { border-color: #e94560; }
  </style>
</head>
<body>
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="logo">
      <h2>DemiBot</h2>
      <span>Painel Admin v1.0</span>
    </div>
    <a class="nav-item active" onclick="showPage('dashboard')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      Dashboard
    </a>
    <a class="nav-item" onclick="showPage('groups')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      Grupos
    </a>
    <a class="nav-item" onclick="showPage('blacklist')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      Lista Negra
    </a>
    <a class="nav-item" onclick="showPage('activity')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      Atividade
    </a>
    <a class="nav-item" onclick="showPage('feedback')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      Feedback
    </a>
  </div>

  <!-- MAIN CONTENT -->
  <div class="main">
    <div class="header">
      <h1 id="page-title">Dashboard</h1>
      <a href="/api/logout" class="logout">Sair</a>
    </div>

    <!-- DASHBOARD PAGE -->
    <div id="page-dashboard" class="page-content">
      <div class="stats-grid" id="stats-grid">
        <div class="loading">Carregando</div>
      </div>
      <div class="panel-section">
        <h3>Atividade Recente</h3>
        <table>
          <thead><tr><th>Grupo</th><th>Usuario</th><th>Acao</th><th>Detalhes</th><th>Data</th></tr></thead>
          <tbody id="recent-activity"><tr><td colspan="5" class="loading">Carregando</td></tr></tbody>
        </table>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="panel-section">
          <h3>Top Membros (Mensagens)</h3>
          <table>
            <thead><tr><th>#</th><th>Numero</th><th>Mensagens</th></tr></thead>
            <tbody id="top-members"><tr><td colspan="3" class="loading">Carregando</td></tr></tbody>
          </table>
        </div>
        <div class="panel-section">
          <h3>Top Grupos (Membros)</h3>
          <table>
            <thead><tr><th>#</th><th>Grupo ID</th><th>Membros</th></tr></thead>
            <tbody id="top-groups"><tr><td colspan="3" class="loading">Carregando</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- GROUPS PAGE -->
    <div id="page-groups" class="page-content" style="display:none;">
      <input class="search-input" placeholder="Buscar grupo por ID..." oninput="filterGroups(this.value)">
      <div class="groups-grid" id="groups-list">
        <div class="loading">Carregando</div>
      </div>
    </div>

    <!-- GROUP DETAIL PAGE -->
    <div id="page-group-detail" class="page-content" style="display:none;">
      <button onclick="showPage('groups')" style="background:transparent;border:1px solid #30363d;color:#8b949e;padding:6px 14px;border-radius:6px;cursor:pointer;margin-bottom:16px;font-size:13px;">Voltar</button>
      <div id="group-detail-content"><div class="loading">Carregando</div></div>
    </div>

    <!-- BLACKLIST PAGE -->
    <div id="page-blacklist" class="page-content" style="display:none;">
      <div class="panel-section">
        <h3>Lista Negra</h3>
        <table>
          <thead><tr><th>#</th><th>Numero</th><th>Motivo</th><th>Adicionado por</th><th>Data</th></tr></thead>
          <tbody id="blacklist-body"><tr><td colspan="5" class="loading">Carregando</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- ACTIVITY PAGE -->
    <div id="page-activity" class="page-content" style="display:none;">
      <div class="panel-section">
        <h3>Log de Atividade</h3>
        <table>
          <thead><tr><th>Grupo</th><th>Usuario</th><th>Acao</th><th>Detalhes</th><th>Data</th></tr></thead>
          <tbody id="activity-body"><tr><td colspan="5" class="loading">Carregando</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- FEEDBACK PAGE -->
    <div id="page-feedback" class="page-content" style="display:none;">
      <div class="panel-section">
        <h3>Feedback dos Usuarios</h3>
        <table>
          <thead><tr><th>#</th><th>Grupo</th><th>Usuario</th><th>Nota</th><th>Texto</th><th>Data</th></tr></thead>
          <tbody id="feedback-body"><tr><td colspan="6" class="loading">Carregando</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const token = localStorage.getItem('demibot_token') || ''

    function api(url) {
      return fetch(url + (url.includes('?') ? '&' : '?') + 'token=' + token)
        .then(r => {
          if (r.status === 401) { window.location.href = '/login'; throw new Error('auth') }
          return r.json()
        })
    }

    function shortId(id) {
      if (!id) return '-'
      return id.replace('@s.whatsapp.net', '').replace('@g.us', '').substring(0, 20)
    }

    function formatDate(d) {
      if (!d) return '-'
      try { return new Date(d).toLocaleString('pt-BR') } catch { return d }
    }

    // ---- PAGES ----
    function showPage(page) {
      document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none')
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
      const el = document.getElementById('page-' + page)
      if (el) el.style.display = 'block'
      event?.target?.closest?.('.nav-item')?.classList.add('active')

      const titles = { dashboard: 'Dashboard', groups: 'Grupos', blacklist: 'Lista Negra', activity: 'Atividade', feedback: 'Feedback' }
      document.getElementById('page-title').textContent = titles[page] || 'DemiBot'

      if (page === 'dashboard') loadDashboard()
      if (page === 'groups') loadGroups()
      if (page === 'blacklist') loadBlacklist()
      if (page === 'activity') loadActivity()
      if (page === 'feedback') loadFeedback()
    }

    // ---- DASHBOARD ----
    async function loadDashboard() {
      try {
        const data = await api('/api/stats')
        document.getElementById('stats-grid').innerHTML = \`
          <div class="stat-card"><div class="label">Grupos</div><div class="value pink">\${data.totalGroups}</div></div>
          <div class="stat-card"><div class="label">Membros</div><div class="value purple">\${data.totalMembers}</div></div>
          <div class="stat-card"><div class="label">Mensagens</div><div class="value blue">\${data.totalMessages.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Stickers</div><div class="value green">\${data.totalStickers.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Advertencias</div><div class="value orange">\${data.totalWarnings}</div></div>
          <div class="stat-card"><div class="label">Lista Negra</div><div class="value red">\${data.totalBlacklist}</div></div>
          <div class="stat-card"><div class="label">Anotacoes</div><div class="value blue">\${data.totalNotes}</div></div>
          <div class="stat-card"><div class="label">Agendamentos</div><div class="value green">\${data.totalScheduled}</div></div>
        \`

        document.getElementById('recent-activity').innerHTML = data.recentActivity.length
          ? data.recentActivity.map(a => \`<tr><td>\${shortId(a.groupId)}</td><td>\${shortId(a.userId)}</td><td>\${a.action}</td><td>\${a.details || '-'}</td><td>\${formatDate(a.timestamp)}</td></tr>\`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:#8b949e;">Nenhuma atividade registrada</td></tr>'

        document.getElementById('top-members').innerHTML = data.topMembers.length
          ? data.topMembers.map((m,i) => \`<tr><td>\${i+1}</td><td>\${shortId(m.userId)}</td><td>\${m.msgs.toLocaleString()}</td></tr>\`).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#8b949e;">Sem dados</td></tr>'

        document.getElementById('top-groups').innerHTML = data.topGroups.length
          ? data.topGroups.map((g,i) => \`<tr><td>\${i+1}</td><td>\${shortId(g.odGroupId)}</td><td>\${g.members}</td></tr>\`).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#8b949e;">Sem dados</td></tr>'
      } catch (e) {
        if (e.message !== 'auth') console.error('Erro ao carregar dashboard:', e)
      }
    }

    // ---- GROUPS ----
    let allGroups = []
    async function loadGroups() {
      try {
        allGroups = await api('/api/groups')
        renderGroups(allGroups)
      } catch (e) {
        if (e.message !== 'auth') document.getElementById('groups-list').innerHTML = '<p style="color:#f85149;">Erro ao carregar grupos</p>'
      }
    }

    function renderGroups(groups) {
      document.getElementById('groups-list').innerHTML = groups.length
        ? groups.map(g => \`
          <div class="group-card" onclick="loadGroupDetail('\${g.groupId}')">
            <h4>\${shortId(g.groupId)}</h4>
            <div class="info">
              Antilink: <span class="badge \${g.antilink ? 'badge-on' : 'badge-off'}">\${g.antilink ? 'ON' : 'OFF'}</span>
              Welcome: <span class="badge \${g.welcome ? 'badge-on' : 'badge-off'}">\${g.welcome ? 'ON' : 'OFF'}</span>
              Antiflood: <span class="badge \${g.antiflood ? 'badge-on' : 'badge-off'}">\${g.antiflood ? 'ON' : 'OFF'}</span>
            </div>
            <div class="info" style="margin-top:6px;">Criado: \${formatDate(g.createdAt)}</div>
          </div>\`).join('')
        : '<p style="color:#8b949e;">Nenhum grupo registrado</p>'
    }

    function filterGroups(q) {
      const filtered = allGroups.filter(g => g.groupId.toLowerCase().includes(q.toLowerCase()))
      renderGroups(filtered)
    }

    // ---- GROUP DETAIL ----
    async function loadGroupDetail(groupId) {
      document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none')
      document.getElementById('page-group-detail').style.display = 'block'
      document.getElementById('page-title').textContent = 'Detalhes do Grupo'

      try {
        const data = await api('/api/groups/' + encodeURIComponent(groupId))
        const g = data.group
        const settingsKeys = ['welcome','antilink','antifake','antiflood','antipalavra','autosticker','x9viewonce','x9adm','soadm','antiimg','antivideo','antiaudio','antidoc','antisticker','anticatalogo','anticontato','antiloc','antinotas','antimarcar','anticall','antibots','modoparceria','modoRpg','modoGamer','nsfw','autoresposta','autobaixar','multiprefixo','simih','simih2','limitcmd','limittexto','autoban']

        let settingsHtml = settingsKeys.map(k => \`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #30363d50;">
            <span>\${k}</span>
            <span class="badge \${g[k] ? 'badge-on' : 'badge-off'}">\${g[k] ? 'ON' : 'OFF'}</span>
          </div>\`).join('')

        let membersHtml = data.members.length
          ? data.members.slice(0, 50).map((m,i) => \`<tr>
              <td>\${i+1}</td>
              <td>\${shortId(m.userId)}</td>
              <td>\${m.role}</td>
              <td>\${m.messageCount}</td>
              <td>\${m.gold}</td>
              <td>Lv.\${m.level} (\${m.xp}xp)</td>
              <td>\${m.warnings > 0 ? '<span class="badge badge-warn">' + m.warnings + '</span>' : '0'}</td>
              <td>\${m.nick || '-'}</td>
              <td>\${formatDate(m.lastActive)}</td>
            </tr>\`).join('')
          : '<tr><td colspan="9" style="text-align:center;color:#8b949e;">Sem membros</td></tr>'

        let activityHtml = data.activity.length
          ? data.activity.map(a => \`<tr><td>\${shortId(a.userId)}</td><td>\${a.action}</td><td>\${a.details || '-'}</td><td>\${formatDate(a.timestamp)}</td></tr>\`).join('')
          : '<tr><td colspan="4" style="text-align:center;color:#8b949e;">Sem atividade</td></tr>'

        let wordsHtml = data.bannedWords.length
          ? data.bannedWords.map(w => \`<span class="badge badge-warn" style="margin:2px;">\${w.word}</span>\`).join(' ')
          : '<span style="color:#8b949e;">Nenhuma palavra proibida</span>'

        let blockedHtml = data.blockedCmds.length
          ? data.blockedCmds.map(c => \`<span class="badge badge-off" style="margin:2px;">\${c.cmdName}</span>\`).join(' ')
          : '<span style="color:#8b949e;">Nenhum comando bloqueado</span>'

        let notesHtml = data.notes.length
          ? data.notes.map(n => \`<div style="padding:8px;border-bottom:1px solid #30363d50;"><strong>#\${n.odId}</strong> - \${n.text} <span style="color:#8b949e;font-size:11px;">(\${formatDate(n.createdAt)})</span></div>\`).join('')
          : '<span style="color:#8b949e;">Sem anotacoes</span>'

        document.getElementById('group-detail-content').innerHTML = \`
          <h3 style="margin-bottom:16px;">Grupo: \${shortId(groupId)}</h3>
          <div class="tabs">
            <button class="tab-btn active" onclick="switchTab(this, 'tab-settings')">Configuracoes</button>
            <button class="tab-btn" onclick="switchTab(this, 'tab-members')">Membros (\${data.members.length})</button>
            <button class="tab-btn" onclick="switchTab(this, 'tab-activity')">Atividade</button>
            <button class="tab-btn" onclick="switchTab(this, 'tab-extras')">Extras</button>
          </div>

          <div id="tab-settings" class="tab-content active">
            <div class="panel-section">
              <h3>Configuracoes do Grupo</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 20px;">\${settingsHtml}</div>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #30363d;">
                <p><strong>Prefixo:</strong> \${g.prefix || '#'} | <strong>Cooldown:</strong> \${g.cmdCooldown}s | <strong>Max warnings:</strong> \${g.maxWarnings} | <strong>Max chars:</strong> \${g.maxChars}</p>
                <p style="margin-top:8px;"><strong>Welcome msg:</strong> \${g.welcomeMsg || g.legendaBv || '-'}</p>
                <p><strong>Goodbye msg:</strong> \${g.goodbyeMsg || g.legendaSaiu || '-'}</p>
              </div>
            </div>
          </div>

          <div id="tab-members" class="tab-content">
            <div class="panel-section">
              <h3>Membros</h3>
              <table>
                <thead><tr><th>#</th><th>Numero</th><th>Cargo</th><th>Msgs</th><th>Gold</th><th>Level</th><th>Warns</th><th>Nick</th><th>Ultima Atividade</th></tr></thead>
                <tbody>\${membersHtml}</tbody>
              </table>
            </div>
          </div>

          <div id="tab-activity" class="tab-content">
            <div class="panel-section">
              <h3>Atividade</h3>
              <table>
                <thead><tr><th>Usuario</th><th>Acao</th><th>Detalhes</th><th>Data</th></tr></thead>
                <tbody>\${activityHtml}</tbody>
              </table>
            </div>
          </div>

          <div id="tab-extras" class="tab-content">
            <div class="panel-section">
              <h3>Palavras Proibidas</h3>
              <div>\${wordsHtml}</div>
            </div>
            <div class="panel-section">
              <h3>Comandos Bloqueados</h3>
              <div>\${blockedHtml}</div>
            </div>
            <div class="panel-section">
              <h3>Anotacoes</h3>
              <div>\${notesHtml}</div>
            </div>
          </div>
        \`
      } catch (e) {
        if (e.message !== 'auth') document.getElementById('group-detail-content').innerHTML = '<p style="color:#f85149;">Erro ao carregar grupo: ' + e.message + '</p>'
      }
    }

    function switchTab(btn, tabId) {
      btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      btn.closest('.page-content').querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
      document.getElementById(tabId).classList.add('active')
    }

    // ---- BLACKLIST ----
    async function loadBlacklist() {
      try {
        const data = await api('/api/blacklist')
        document.getElementById('blacklist-body').innerHTML = data.length
          ? data.map((b,i) => \`<tr><td>\${i+1}</td><td>\${shortId(b.userId)}</td><td>\${b.reason || '-'}</td><td>\${shortId(b.addedBy)}</td><td>\${formatDate(b.addedAt)}</td></tr>\`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:#8b949e;">Lista negra vazia</td></tr>'
      } catch (e) { if (e.message !== 'auth') console.error(e) }
    }

    // ---- ACTIVITY ----
    async function loadActivity() {
      try {
        const data = await api('/api/activity?limit=200')
        document.getElementById('activity-body').innerHTML = data.length
          ? data.map(a => \`<tr><td>\${shortId(a.groupId)}</td><td>\${shortId(a.userId)}</td><td>\${a.action}</td><td>\${a.details || '-'}</td><td>\${formatDate(a.timestamp)}</td></tr>\`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:#8b949e;">Sem atividade</td></tr>'
      } catch (e) { if (e.message !== 'auth') console.error(e) }
    }

    // ---- FEEDBACK ----
    async function loadFeedback() {
      try {
        const data = await api('/api/feedback')
        document.getElementById('feedback-body').innerHTML = data.length
          ? data.map((f,i) => \`<tr><td>\${i+1}</td><td>\${shortId(f.groupId)}</td><td>\${shortId(f.userId)}</td><td>\${f.rating}/10</td><td>\${f.text || '-'}</td><td>\${formatDate(f.createdAt)}</td></tr>\`).join('')
          : '<tr><td colspan="6" style="text-align:center;color:#8b949e;">Sem feedback</td></tr>'
      } catch (e) { if (e.message !== 'auth') console.error(e) }
    }

    // ---- INIT ----
    loadDashboard()
  </script>
</body>
</html>`)
})

// ============================================================
//  START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('============================================')
  console.log('  DemiBot - Painel de Administracao')
  console.log('============================================')
  console.log(`  URL: http://localhost:${PORT}`)
  console.log(`  Usuario: ${PANEL_USER}`)
  console.log(`  Senha: ${PANEL_PASS}`)
  console.log('============================================')
  console.log('[PANEL] Servidor iniciado com sucesso!')
})
