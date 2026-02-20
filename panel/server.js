// ============================================================ //
// DEMIBOT - PAINEL WEB DE ADMINISTRACAO (MODERNO)
// Dashboard para gerenciar o bot via navegador - TOTALMENTE LIVRE
// ============================================================ //

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'bot', 'data', 'demibot.db');

// Verifica se o banco existe
if (!fs.existsSync(dbPath)) {
  console.log('[PANEL] Banco de dados nao encontrado. Inicie o bot primeiro para criar o banco.');
  console.log('[PANEL] Caminho esperado:', dbPath);
  process.exit(1);
}

// Abre o banco em modo leitura/escrita para permitir alterações
const db = new Database(dbPath, { readonly: false });
const app = express();
const PORT = process.env.PANEL_PORT || 3000;

// ============================================================ //
// MIDDLEWARE (sem autenticação)
// ============================================================ //

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================ //
// API ROUTES (GET - leitura)
// ============================================================ //

// Dashboard stats
app.get('/api/stats', (req, res) => {
  try {
    const totalGroups = db.prepare('SELECT COUNT(*) as count FROM groups').get().count;
    const totalMembers = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
    const totalBlacklist = db.prepare('SELECT COUNT(*) as count FROM blacklist').get().count;
    const totalWarnings = db.prepare('SELECT SUM(warnings) as total FROM members').get().total || 0;
    const totalMessages = db.prepare('SELECT SUM(messageCount) as total FROM members').get().total || 0;
    const totalStickers = db.prepare('SELECT SUM(stickerCount) as total FROM members').get().total || 0;
    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
    const totalScheduled = db.prepare('SELECT COUNT(*) as count FROM scheduled_messages WHERE active = 1').get().count;
    const recentActivity = db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 20').all();
    const topMembers = db.prepare('SELECT userId, SUM(messageCount) as msgs FROM members GROUP BY userId ORDER BY msgs DESC LIMIT 10').all();
    const topGroups = db.prepare('SELECT odGroupId, COUNT(*) as members FROM members GROUP BY odGroupId ORDER BY members DESC LIMIT 10').all();

    res.json({
      totalGroups, totalMembers, totalBlacklist, totalWarnings,
      totalMessages, totalStickers, totalNotes, totalScheduled,
      recentActivity, topMembers, topGroups
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar grupos
app.get('/api/groups', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups ORDER BY createdAt DESC').all();
    res.json(groups);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Detalhes de um grupo
app.get('/api/groups/:groupId', (req, res) => {
  try {
    const group = db.prepare('SELECT * FROM groups WHERE groupId = ?').get(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Grupo nao encontrado' });

    const members = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY messageCount DESC').all(req.params.groupId);
    const warnings = db.prepare('SELECT * FROM members WHERE odGroupId = ? AND warnings > 0 ORDER BY warnings DESC').all(req.params.groupId);
    const notes = db.prepare('SELECT * FROM notes WHERE groupId = ?').all(req.params.groupId);
    const scheduled = db.prepare('SELECT * FROM scheduled_messages WHERE groupId = ?').all(req.params.groupId);
    const activity = db.prepare('SELECT * FROM activity_log WHERE groupId = ? ORDER BY timestamp DESC LIMIT 50').all(req.params.groupId);
    const bannedWords = db.prepare('SELECT * FROM banned_words WHERE groupId = ?').all(req.params.groupId);
    const blockedCmds = db.prepare('SELECT * FROM blocked_cmds WHERE groupId = ?').all(req.params.groupId);

    res.json({ group, members, warnings, notes, scheduled, activity, bannedWords, blockedCmds });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar membros de um grupo
app.get('/api/groups/:groupId/members', (req, res) => {
  try {
    const members = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY messageCount DESC').all(req.params.groupId);
    res.json(members);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Blacklist
app.get('/api/blacklist', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM blacklist ORDER BY addedAt DESC').all();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Activity log
app.get('/api/activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const groupId = req.query.groupId;
    let query = 'SELECT * FROM activity_log';
    const params = [];
    if (groupId) {
      query += ' WHERE groupId = ?';
      params.push(groupId);
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Polls
app.get('/api/polls', (req, res) => {
  try {
    const polls = db.prepare('SELECT * FROM polls ORDER BY createdAt DESC').all();
    res.json(polls);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Feedback
app.get('/api/feedback', (req, res) => {
  try {
    const feedbacks = db.prepare('SELECT * FROM feedback ORDER BY createdAt DESC').all();
    res.json(feedbacks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Rankings
app.get('/api/rankings/:groupId', (req, res) => {
  try {
    const gid = req.params.groupId;
    const ativos = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY messageCount DESC LIMIT 15').all(gid);
    const gold = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY gold DESC LIMIT 15').all(gid);
    const level = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY xp DESC LIMIT 15').all(gid);
    const stickers = db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY stickerCount DESC LIMIT 15').all(gid);
    res.json({ ativos, gold, level, stickers });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Marriages
app.get('/api/marriages', (req, res) => {
  try {
    const marriages = db.prepare('SELECT * FROM marriages ORDER BY marriedAt DESC').all();
    res.json(marriages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Partnerships
app.get('/api/partnerships', (req, res) => {
  try {
    const partnerships = db.prepare('SELECT * FROM partnerships ORDER BY addedAt DESC').all();
    res.json(partnerships);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================ //
// API ROUTES (POST - atualizações)
// ============================================================ //

// Atualizar configuração de um grupo (toggle booleano)
app.post('/api/groups/:groupId/toggle', (req, res) => {
  const { groupId } = req.params;
  const { setting } = req.body; // nome da coluna (ex: antilink, welcome)
  try {
    const group = db.prepare('SELECT * FROM groups WHERE groupId = ?').get(groupId);
    if (!group) return res.status(404).json({ error: 'Grupo não encontrado' });

    const current = group[setting] ? 1 : 0;
    const newValue = current === 1 ? 0 : 1;
    db.prepare(`UPDATE groups SET ${setting} = ? WHERE groupId = ?`).run(newValue, groupId);
    res.json({ success: true, newValue: !!newValue });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Atualizar campo texto (prefixo, mensagens, etc)
app.post('/api/groups/:groupId/update', (req, res) => {
  const { groupId } = req.params;
  const { field, value } = req.body; // campo e novo valor
  try {
    // Lista de campos permitidos para segurança
    const allowedFields = ['prefix', 'welcomeMsg', 'goodbyeMsg', 'legendaBv', 'legendaSaiu', 'msgBan', 'maxWarnings', 'cmdCooldown', 'maxChars'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: 'Campo não permitido' });
    }
    db.prepare(`UPDATE groups SET ${field} = ? WHERE groupId = ?`).run(value, groupId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Adicionar palavra proibida
app.post('/api/groups/:groupId/bannedWords/add', (req, res) => {
  const { groupId } = req.params;
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Palavra obrigatória' });
  try {
    db.prepare('INSERT INTO banned_words (groupId, word, addedAt) VALUES (?, ?, ?)').run(groupId, word, Date.now());
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover palavra proibida
app.post('/api/groups/:groupId/bannedWords/remove', (req, res) => {
  const { groupId } = req.params;
  const { word } = req.body;
  try {
    db.prepare('DELETE FROM banned_words WHERE groupId = ? AND word = ?').run(groupId, word);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Adicionar comando bloqueado
app.post('/api/groups/:groupId/blockedCmds/add', (req, res) => {
  const { groupId } = req.params;
  const { cmdName } = req.body;
  if (!cmdName) return res.status(400).json({ error: 'Nome do comando obrigatório' });
  try {
    db.prepare('INSERT INTO blocked_cmds (groupId, cmdName, blockedAt) VALUES (?, ?, ?)').run(groupId, cmdName, Date.now());
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover comando bloqueado
app.post('/api/groups/:groupId/blockedCmds/remove', (req, res) => {
  const { groupId } = req.params;
  const { cmdName } = req.body;
  try {
    db.prepare('DELETE FROM blocked_cmds WHERE groupId = ? AND cmdName = ?').run(groupId, cmdName);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Adicionar à lista negra
app.post('/api/blacklist/add', (req, res) => {
  const { userId, reason } = req.body;
  if (!userId) return res.status(400).json({ error: 'Usuário obrigatório' });
  try {
    db.prepare('INSERT INTO blacklist (userId, reason, addedAt) VALUES (?, ?, ?)').run(userId, reason || 'Adicionado via painel', Date.now());
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover da lista negra
app.post('/api/blacklist/remove', (req, res) => {
  const { userId } = req.body;
  try {
    db.prepare('DELETE FROM blacklist WHERE userId = ?').run(userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================ //
// DASHBOARD PAGE (HTML modernizado)
// ============================================================ //
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DemiBot - Painel Admin</title>
  <!-- Fontes modernas -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      color: #f0f0f0;
      min-height: 100vh;
      position: relative;
    }

    /* Efeito de partículas (opcional) */
    body::before {
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: url('data:image/svg+xml;utf8,<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="70" r="2" fill="rgba(255,255,255,0.1)"/></svg>');
      opacity: 0.5;
      pointer-events: none;
      z-index: 0;
    }

    /* Sidebar com glassmorphism */
    .sidebar {
      position: fixed;
      left: 20px;
      top: 20px;
      width: 260px;
      height: calc(100vh - 40px);
      background: rgba(20, 20, 40, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      padding: 24px 0;
      overflow-y: auto;
      z-index: 10;
    }

    .sidebar .logo {
      text-align: center;
      padding: 0 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 16px;
    }

    .sidebar .logo h2 {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #ff6ec4, #7873f5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 1px;
    }

    .sidebar .logo span {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.8rem;
      font-weight: 300;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 12px 24px;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      margin: 4px 12px;
      border-radius: 12px;
    }

    .nav-item:hover, .nav-item.active {
      background: rgba(255, 110, 196, 0.2);
      color: #fff;
      box-shadow: 0 4px 12px rgba(255, 110, 196, 0.3);
      transform: translateX(4px);
    }

    .nav-item svg {
      margin-right: 12px;
      width: 20px;
      height: 20px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
    }

    .main {
      margin-left: 300px;
      padding: 24px 32px;
      position: relative;
      z-index: 5;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 40px;
      padding: 12px 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header h1 {
      font-size: 1.8rem;
      font-weight: 600;
      background: linear-gradient(135deg, #ff6ec4, #7873f5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Cards com glassmorphism */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: rgba(30, 30, 50, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 30px rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 110, 196, 0.5);
    }

    .stat-card .label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .stat-card .value {
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-card .value.pink { color: #ff6ec4; }
    .stat-card .value.purple { color: #a56eff; }
    .stat-card .value.blue { color: #5f9eff; }
    .stat-card .value.green { color: #4cd964; }
    .stat-card .value.orange { color: #ff9f4b; }
    .stat-card .value.red { color: #ff5e5e; }

    .panel-section {
      background: rgba(30, 30, 50, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .panel-section h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: #fff;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    thead th {
      text-align: left;
      padding: 12px 8px;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    tbody td {
      padding: 10px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    tbody tr:hover {
      background: rgba(255, 110, 196, 0.1);
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 30px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-on {
      background: rgba(76, 217, 100, 0.2);
      color: #4cd964;
      border: 1px solid rgba(76, 217, 100, 0.3);
    }

    .badge-off {
      background: rgba(255, 94, 94, 0.2);
      color: #ff5e5e;
      border: 1px solid rgba(255, 94, 94, 0.3);
    }

    .badge-warn {
      background: rgba(255, 159, 75, 0.2);
      color: #ff9f4b;
      border: 1px solid rgba(255, 159, 75, 0.3);
    }

    .group-card {
      background: rgba(40, 40, 60, 0.7);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .group-card:hover {
      border-color: #ff6ec4;
      transform: scale(1.02);
      box-shadow: 0 10px 20px rgba(255, 110, 196, 0.2);
    }

    .group-card h4 {
      font-size: 1rem;
      margin-bottom: 12px;
      color: #fff;
    }

    .group-card .info {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.8rem;
      line-height: 1.6;
    }

    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    /* Botões */
    button {
      background: linear-gradient(135deg, #ff6ec4, #7873f5);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 30px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      transition: all 0.2s;
      box-shadow: 0 4px 10px rgba(255, 110, 196, 0.3);
    }

    button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 15px rgba(255, 110, 196, 0.5);
    }

    button.secondary {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(4px);
      box-shadow: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    button.secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    input[type="text"], input[type="number"] {
      padding: 10px 16px;
      border-radius: 30px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(0, 0, 0, 0.3);
      color: #fff;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s;
      margin-right: 8px;
      backdrop-filter: blur(4px);
    }

    input:focus {
      border-color: #ff6ec4;
      box-shadow: 0 0 0 3px rgba(255, 110, 196, 0.2);
    }

    .inline-form {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: rgba(255, 255, 255, 0.6);
    }

    .loading::after {
      content: '';
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #ff6ec4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .search-input {
      width: 100%;
      padding: 12px 20px;
      border-radius: 40px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(0, 0, 0, 0.3);
      color: #fff;
      font-size: 1rem;
      outline: none;
      margin-bottom: 24px;
      backdrop-filter: blur(4px);
    }

    .search-input:focus { border-color: #ff6ec4; }

    /* Scrollbar personalizada */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255,110,196,0.5);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #ff6ec4;
    }

    @media (max-width: 768px) {
      .sidebar {
        left: 10px;
        top: 10px;
        width: calc(100% - 20px);
        height: auto;
        max-height: 80px;
        overflow: hidden;
        transition: max-height 0.3s;
      }
      .sidebar:hover {
        max-height: 80vh;
        overflow-y: auto;
      }
      .main {
        margin-left: 10px;
        margin-top: 100px;
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo">
      <h2>DemiBot</h2>
      <span>Painel Admin v3.0</span>
    </div>
    <a class="nav-item active" onclick="showPage('dashboard')">
      <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
      Dashboard
    </a>
    <a class="nav-item" onclick="showPage('groups')">
      <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-1 .05 1.16.84 2 1.87 2 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
      Grupos
    </a>
    <a class="nav-item" onclick="showPage('blacklist')">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
      Lista Negra
    </a>
    <a class="nav-item" onclick="showPage('activity')">
      <svg viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C4.21 7.06 2 10.79 2 14.5 2 19.4 6.1 23 11 23s9-3.6 9-8.5c0-5.33-4.86-9.27-6.5-13.83zM11 20c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
      Atividade
    </a>
    <a class="nav-item" onclick="showPage('feedback')">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12l-4-3.2V14H6V6h8v3.2L18 6v8z"/></svg>
      Feedback
    </a>
  </div>

  <div class="main">
    <div class="header">
      <h1 id="page-title">Dashboard</h1>
    </div>

    <!-- PÁGINAS -->
    <div id="page-dashboard" class="page-content">
      <div class="stats-grid" id="stats-grid"><div class="loading">Carregando</div></div>
      <div class="panel-section">
        <h3>Atividade Recente</h3>
        <table><thead><tr><th>Grupo</th><th>Usuário</th><th>Ação</th><th>Detalhes</th><th>Data</th></tr></thead><tbody id="recent-activity"><tr><td colspan="5" class="loading">Carregando</td></tr></tbody></table>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="panel-section">
          <h3>Top Membros (Mensagens)</h3>
          <table><thead><tr><th>#</th><th>Número</th><th>Mensagens</th></tr></thead><tbody id="top-members"><tr><td colspan="3" class="loading">Carregando</td></tr></tbody></table>
        </div>
        <div class="panel-section">
          <h3>Top Grupos (Membros)</h3>
          <table><thead><tr><th>#</th><th>Grupo ID</th><th>Membros</th></tr></thead><tbody id="top-groups"><tr><td colspan="3" class="loading">Carregando</td></tr></tbody></table>
        </div>
      </div>
    </div>

    <div id="page-groups" class="page-content" style="display:none;">
      <input class="search-input" placeholder="🔍 Buscar grupo por ID..." oninput="filterGroups(this.value)">
      <div class="groups-grid" id="groups-list"><div class="loading">Carregando</div></div>
    </div>

    <div id="page-group-detail" class="page-content" style="display:none;">
      <button onclick="showPage('groups')" class="secondary" style="margin-bottom:20px;">← Voltar</button>
      <div id="group-detail-content"><div class="loading">Carregando</div></div>
    </div>

    <div id="page-blacklist" class="page-content" style="display:none;">
      <div class="panel-section">
        <h3>Lista Negra</h3>
        <div class="inline-form">
          <input type="text" id="blacklist-user" placeholder="Número (5511999999999)">
          <input type="text" id="blacklist-reason" placeholder="Motivo">
          <button onclick="addBlacklist()">Adicionar</button>
        </div>
        <table><thead><tr><th>#</th><th>Número</th><th>Motivo</th><th>Adicionado por</th><th>Data</th></tr></thead><tbody id="blacklist-body"><tr><td colspan="5" class="loading">Carregando</td></tr></tbody></table>
      </div>
    </div>

    <div id="page-activity" class="page-content" style="display:none;">
      <div class="panel-section">
        <h3>Log de Atividade</h3>
        <table><thead><tr><th>Grupo</th><th>Usuário</th><th>Ação</th><th>Detalhes</th><th>Data</th></tr></thead><tbody id="activity-body"><tr><td colspan="5" class="loading">Carregando</td></tr></tbody></table>
      </div>
    </div>

    <div id="page-feedback" class="page-content" style="display:none;">
      <div class="panel-section">
        <h3>Feedback dos Usuários</h3>
        <table><thead><tr><th>#</th><th>Grupo</th><th>Usuário</th><th>Nota</th><th>Texto</th><th>Data</th></tr></thead><tbody id="feedback-body"><tr><td colspan="6" class="loading">Carregando</td></tr></tbody></table>
      </div>
    </div>
  </div>

  <script>
    // Função auxiliar para fetch (sem token)
    function api(url, options = {}) {
      return fetch(url, options).then(r => r.json());
    }

    function shortId(id) {
      if (!id) return '-';
      return id.replace('@s.whatsapp.net', '').replace('@g.us', '').substring(0, 20);
    }

    function formatDate(d) {
      if (!d) return '-';
      try { return new Date(d).toLocaleString('pt-BR'); } catch { return d; }
    }

    function showPage(page) {
      document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const el = document.getElementById('page-' + page);
      if (el) el.style.display = 'block';
      if (window.event) {
        const target = window.event.target;
        if (target && target.closest) target.closest('.nav-item')?.classList.add('active');
      }
      const titles = { dashboard: 'Dashboard', groups: 'Grupos', blacklist: 'Lista Negra', activity: 'Atividade', feedback: 'Feedback' };
      document.getElementById('page-title').textContent = titles[page] || 'DemiBot';
      if (page === 'dashboard') loadDashboard();
      if (page === 'groups') loadGroups();
      if (page === 'blacklist') loadBlacklist();
      if (page === 'activity') loadActivity();
      if (page === 'feedback') loadFeedback();
    }

    async function loadDashboard() {
      try {
        const data = await api('/api/stats');
        document.getElementById('stats-grid').innerHTML = \`
          <div class="stat-card"><div class="label">Grupos</div><div class="value pink">\${data.totalGroups}</div></div>
          <div class="stat-card"><div class="label">Membros</div><div class="value purple">\${data.totalMembers}</div></div>
          <div class="stat-card"><div class="label">Mensagens</div><div class="value blue">\${data.totalMessages.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Stickers</div><div class="value green">\${data.totalStickers.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Advertências</div><div class="value orange">\${data.totalWarnings}</div></div>
          <div class="stat-card"><div class="label">Lista Negra</div><div class="value red">\${data.totalBlacklist}</div></div>
          <div class="stat-card"><div class="label">Anotações</div><div class="value blue">\${data.totalNotes}</div></div>
          <div class="stat-card"><div class="label">Agendamentos</div><div class="value green">\${data.totalScheduled}</div></div>
        \`;
        document.getElementById('recent-activity').innerHTML = data.recentActivity.length
          ? data.recentActivity.map(a => \`<tr><td>\${shortId(a.groupId)}</td><td>\${shortId(a.userId)}</td><td>\${a.action}</td><td>\${a.details || '-'}</td><td>\${formatDate(a.timestamp)}</td></tr>\`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:#aaa;">Nenhuma atividade registrada</td></tr>';
        document.getElementById('top-members').innerHTML = data.topMembers.length
          ? data.topMembers.map((m,i) => \`<tr><td>\${i+1}</td><td>\${shortId(m.userId)}</td><td>\${m.msgs.toLocaleString()}</td></tr>\`).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#aaa;">Sem dados</td></tr>';
        document.getElementById('top-groups').innerHTML = data.topGroups.length
          ? data.topGroups.map((g,i) => \`<tr><td>\${i+1}</td><td>\${shortId(g.odGroupId)}</td><td>\${g.members}</td></tr>\`).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#aaa;">Sem dados</td></tr>';
      } catch (e) { console.error('Erro ao carregar dashboard:', e); }
    }

    let allGroups = [];
    async function loadGroups() {
      try {
        allGroups = await api('/api/groups');
        renderGroups(allGroups);
      } catch (e) {
        document.getElementById('groups-list').innerHTML = '<p style="color:#ff5e5e;">Erro ao carregar grupos</p>';
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
              <div class="info" style="margin-top:8px;">Criado: \${formatDate(g.createdAt)}</div>
            </div>
          \`).join('')
        : '<p style="color:#aaa;">Nenhum grupo registrado</p>';
    }

    function filterGroups(q) {
      const filtered = allGroups.filter(g => g.groupId.toLowerCase().includes(q.toLowerCase()));
      renderGroups(filtered);
    }

    async function loadGroupDetail(groupId) {
      document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none');
      document.getElementById('page-group-detail').style.display = 'block';
      document.getElementById('page-title').textContent = 'Detalhes do Grupo';
      try {
        const data = await api('/api/groups/' + encodeURIComponent(groupId));
        const g = data.group;
        const settingsKeys = ['welcome','antilink','antifake','antiflood','antipalavra','autosticker','x9viewonce','x9adm','soadm','antiimg','antivideo','antiaudio','antidoc','antisticker','anticatalogo','anticontato','antiloc','antinotas','antimarcar','anticall','antibots','modoparceria','modoRpg','modoGamer','nsfw','autoresposta','autobaixar','multiprefixo','simih','simih2','limitcmd','limittexto','autoban'];

        let settingsHtml = settingsKeys.map(k => \`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <span>\${k}</span>
            <div>
              <span class="badge \${g[k] ? 'badge-on' : 'badge-off'}">\${g[k] ? 'ON' : 'OFF'}</span>
              <button class="secondary" style="margin-left:8px;" onclick="toggleSetting('\${groupId}', '\${k}')">Toggle</button>
            </div>
          </div>
        \`).join('');

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
          : '<tr><td colspan="9" style="text-align:center;color:#aaa;">Sem membros</td></tr>';

        let activityHtml = data.activity.length
          ? data.activity.map(a => \`<tr><td>\${shortId(a.userId)}</td><td>\${a.action}</td><td>\${a.details || '-'}</td><td>\${formatDate(a.timestamp)}</td></tr>\`).join('')
          : '<tr><td colspan="4" style="text-align:center;color:#aaa;">Sem atividade</td></tr>';

        let wordsHtml = data.bannedWords.length
          ? data.bannedWords.map(w => \`
              <span class="badge badge-warn" style="margin:4px; display:inline-flex; align-items:center;">
                \${w.word}
                <button class="secondary" style="margin-left:6px; padding:2px 8px;" onclick="removeBannedWord('\${groupId}', '\${w.word}')">x</button>
              </span>\`).join(' ')
          : '<span style="color:#aaa;">Nenhuma palavra proibida</span>';

        let blockedHtml = data.blockedCmds.length
          ? data.blockedCmds.map(c => \`
              <span class="badge badge-off" style="margin:4px; display:inline-flex; align-items:center;">
                \${c.cmdName}
                <button class="secondary" style="margin-left:6px; padding:2px 8px;" onclick="removeBlockedCmd('\${groupId}', '\${c.cmdName}')">x</button>
              </span>\`).join(' ')
          : '<span style="color:#aaa;">Nenhum comando bloqueado</span>';

        let notesHtml = data.notes.length
          ? data.notes.map(n => \`<div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.1);"><strong>#\${n.odId}</strong> - \${n.text} <span style="color:#aaa;font-size:0.7rem;">(\${formatDate(n.createdAt)})</span></div>\`).join('')
          : '<span style="color:#aaa;">Sem anotações</span>';

        document.getElementById('group-detail-content').innerHTML = \`
          <h3 style="margin-bottom:20px; font-size:1.4rem;">Grupo: \${shortId(groupId)}</h3>
          <div class="panel-section">
            <h4>Configurações Básicas</h4>
            <div class="inline-form">
              <label>Prefixo:</label>
              <input type="text" id="prefix-input" value="\${g.prefix || '#'}">
              <button onclick="updateGroupField('\${groupId}', 'prefix', document.getElementById('prefix-input').value)">Salvar</button>
            </div>
            <div class="inline-form">
              <label>Max Warnings:</label>
              <input type="number" id="maxWarnings-input" value="\${g.maxWarnings || 3}">
              <button onclick="updateGroupField('\${groupId}', 'maxWarnings', document.getElementById('maxWarnings-input').value)">Salvar</button>
            </div>
            <div class="inline-form">
              <label>Cooldown (s):</label>
              <input type="number" id="cmdCooldown-input" value="\${g.cmdCooldown || 2}">
              <button onclick="updateGroupField('\${groupId}', 'cmdCooldown', document.getElementById('cmdCooldown-input').value)">Salvar</button>
            </div>
            <div class="inline-form">
              <label>Max chars:</label>
              <input type="number" id="maxChars-input" value="\${g.maxChars || 500}">
              <button onclick="updateGroupField('\${groupId}', 'maxChars', document.getElementById('maxChars-input').value)">Salvar</button>
            </div>
            <div class="inline-form">
              <label>Welcome msg:</label>
              <input type="text" id="welcomeMsg-input" value="\${g.welcomeMsg || g.legendaBv || ''}">
              <button onclick="updateGroupField('\${groupId}', 'welcomeMsg', document.getElementById('welcomeMsg-input').value)">Salvar</button>
            </div>
            <div class="inline-form">
              <label>Goodbye msg:</label>
              <input type="text" id="goodbyeMsg-input" value="\${g.goodbyeMsg || g.legendaSaiu || ''}">
              <button onclick="updateGroupField('\${groupId}', 'goodbyeMsg', document.getElementById('goodbyeMsg-input').value)">Salvar</button>
            </div>
          </div>

          <div class="panel-section">
            <h4>Toggles (ON/OFF)</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:12px;">\${settingsHtml}</div>
          </div>

          <div class="panel-section">
            <h4>Palavras Proibidas</h4>
            <div class="inline-form">
              <input type="text" id="new-word" placeholder="Nova palavra">
              <button onclick="addBannedWord('\${groupId}')">Adicionar</button>
            </div>
            <div>\${wordsHtml}</div>
          </div>

          <div class="panel-section">
            <h4>Comandos Bloqueados</h4>
            <div class="inline-form">
              <input type="text" id="new-cmd" placeholder="Nome do comando (ex: play)">
              <button onclick="addBlockedCmd('\${groupId}')">Adicionar</button>
            </div>
            <div>\${blockedHtml}</div>
          </div>

          <div class="panel-section">
            <h4>Anotações</h4>
            <div class="inline-form">
              <input type="text" id="new-note" placeholder="Texto da anotação">
              <button onclick="addNote('\${groupId}')">Adicionar</button>
            </div>
            <div>\${notesHtml}</div>
          </div>

          <div class="panel-section">
            <h4>Membros (top 50)</h4>
            <div style="overflow-x:auto;">
              <table><thead><tr><th>#</th><th>Número</th><th>Cargo</th><th>Msgs</th><th>Gold</th><th>Level</th><th>Warns</th><th>Nick</th><th>Última Ativ</th></tr></thead><tbody>\${membersHtml}</tbody></table>
            </div>
          </div>

          <div class="panel-section">
            <h4>Atividade Recente no Grupo</h4>
            <div style="overflow-x:auto;">
              <table><thead><tr><th>Usuário</th><th>Ação</th><th>Detalhes</th><th>Data</th></tr></thead><tbody>\${activityHtml}</tbody></table>
            </div>
          </div>
        \`;
      } catch (e) {
        document.getElementById('group-detail-content').innerHTML = '<p style="color:#ff5e5e;">Erro ao carregar grupo: ' + e.message + '</p>';
      }
    }

    // Funções de edição
    async function toggleSetting(groupId, setting) {
      await api('/api/groups/' + groupId + '/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting })
      });
      loadGroupDetail(groupId); // recarrega
    }

    async function updateGroupField(groupId, field, value) {
      await api('/api/groups/' + groupId + '/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
      });
      loadGroupDetail(groupId);
    }

    async function addBannedWord(groupId) {
      const word = document.getElementById('new-word').value;
      if (!word) return;
      await api('/api/groups/' + groupId + '/bannedWords/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      document.getElementById('new-word').value = '';
      loadGroupDetail(groupId);
    }

    async function removeBannedWord(groupId, word) {
      await api('/api/groups/' + groupId + '/bannedWords/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      loadGroupDetail(groupId);
    }

    async function addBlockedCmd(groupId) {
      const cmdName = document.getElementById('new-cmd').value;
      if (!cmdName) return;
      await api('/api/groups/' + groupId + '/blockedCmds/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmdName })
      });
      document.getElementById('new-cmd').value = '';
      loadGroupDetail(groupId);
    }

    async function removeBlockedCmd(groupId, cmdName) {
      await api('/api/groups/' + groupId + '/blockedCmds/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmdName })
      });
      loadGroupDetail(groupId);
    }

    async function addNote(groupId) {
      const text = document.getElementById('new-note').value;
      if (!text) return;
      // Aqui você pode implementar uma rota POST para notas se desejar
      alert('Função de adicionar nota ainda não implementada no backend.');
      // await api('/api/notes/add', { method: 'POST', body: JSON.stringify({ groupId, text, userId: 'painel' }) });
      // document.getElementById('new-note').value = '';
      // loadGroupDetail(groupId);
    }

    async function addBlacklist() {
      const userId = document.getElementById('blacklist-user').value;
      const reason = document.getElementById('blacklist-reason').value;
      if (!userId) return;
      await api('/api/blacklist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      });
      document.getElementById('blacklist-user').value = '';
      document.getElementById('blacklist-reason').value = '';
      loadBlacklist();
    }

    async function loadBlacklist() {
      try {
        const data = await api('/api/blacklist');
        document.getElementById('blacklist-body').innerHTML = data.length
          ? data.map((b,i) => \`<tr><td>\${i+1}</td><td>\${shortId(b.userId)}</td><td>\${b.reason || '-'}</td><td>\${shortId(b.addedBy) || '-'}</td><td>\${formatDate(b.addedAt)}</td></tr>\`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:#aaa;">Lista negra vazia</td></tr>';
      } catch (e) { console.error(e); }
    }

    async function loadActivity() {
      try {
        const data = await api('/api/activity?limit=200');
        document.getElementById('activity-body').innerHTML = data.length
          ? data.map(a => \`<tr><td>\${shortId(a.groupId)}</td><td>\${shortId(a.userId)}</td><td>\${a.action}</td><td>\${a.details || '-'}</td><td>\${formatDate(a.timestamp)}</td></tr>\`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:#aaa;">Sem atividade</td></tr>';
      } catch (e) { console.error(e); }
    }

    async function loadFeedback() {
      try {
        const data = await api('/api/feedback');
        document.getElementById('feedback-body').innerHTML = data.length
          ? data.map((f,i) => \`<tr><td>\${i+1}</td><td>\${shortId(f.groupId)}</td><td>\${shortId(f.userId)}</td><td>\${f.rating}/10</td><td>\${f.text || '-'}</td><td>\${formatDate(f.createdAt)}</td></tr>\`).join('')
          : '<tr><td colspan="6" style="text-align:center;color:#aaa;">Sem feedback</td></tr>';
      } catch (e) { console.error(e); }
    }

    // Inicializa
    loadDashboard();
  </script>
</body>
</html>`);
});

// ============================================================ //
// START SERVER
// ============================================================ //
app.listen(PORT, '0.0.0.0', () => {
  console.log('============================================');
  console.log(' DemiBot - Painel de Administracao (MODERNO)');
  console.log('============================================');
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` ATENCAO: Painel totalmente aberto, sem autenticação!`);
  console.log('============================================');
  console.log('[PANEL] Servidor iniciado com sucesso!');
});
