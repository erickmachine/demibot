// ============================================================
//  BANCO DE DADOS - SQLite via better-sqlite3
// ============================================================
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data', 'demibot.db')

// Garante que o diretorio data existe
import fs from 'fs'
const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// ============================================================
//  CRIACAO DE TABELAS
// ============================================================
db.exec(`
  -- Configuracoes de grupo
  CREATE TABLE IF NOT EXISTS groups (
    groupId TEXT PRIMARY KEY,
    welcome INTEGER DEFAULT 1,
    welcome2 INTEGER DEFAULT 0,
    welcomeMsg TEXT DEFAULT '',
    goodbyeMsg TEXT DEFAULT '',
    welcomeBg TEXT DEFAULT '',
    goodbyeBg TEXT DEFAULT '',
    antilink INTEGER DEFAULT 0,
    advlink INTEGER DEFAULT 0,
    antilinkgp INTEGER DEFAULT 0,
    advlinkgp INTEGER DEFAULT 0,
    antifake INTEGER DEFAULT 0,
    antiflood INTEGER DEFAULT 0,
    advflood INTEGER DEFAULT 0,
    antibots INTEGER DEFAULT 0,
    antiimg INTEGER DEFAULT 0,
    antivideo INTEGER DEFAULT 0,
    antiaudio INTEGER DEFAULT 0,
    antidoc INTEGER DEFAULT 0,
    antisticker INTEGER DEFAULT 0,
    anticatalogo INTEGER DEFAULT 0,
    anticontato INTEGER DEFAULT 0,
    antiloc INTEGER DEFAULT 0,
    antinotas INTEGER DEFAULT 0,
    antimarcar INTEGER DEFAULT 0,
    antipalavra INTEGER DEFAULT 0,
    anticall INTEGER DEFAULT 0,
    autosticker INTEGER DEFAULT 0,
    autobaixar INTEGER DEFAULT 0,
    x9viewonce INTEGER DEFAULT 0,
    x9adm INTEGER DEFAULT 0,
    modoparceria INTEGER DEFAULT 0,
    soadm INTEGER DEFAULT 0,
    limitcmd INTEGER DEFAULT 0,
    limittexto INTEGER DEFAULT 0,
    maxChars INTEGER DEFAULT 5000,
    multiprefixo INTEGER DEFAULT 1,
    modoRpg INTEGER DEFAULT 0,
    modoGamer INTEGER DEFAULT 0,
    autoresposta INTEGER DEFAULT 0,
    nsfw INTEGER DEFAULT 0,
    simih INTEGER DEFAULT 0,
    simih2 INTEGER DEFAULT 0,
    openHour TEXT DEFAULT '',
    closeHour TEXT DEFAULT '',
    prefix TEXT DEFAULT '#',
    cmdCooldown INTEGER DEFAULT 3,
    legendaBv TEXT DEFAULT 'Seja bem-vindo(a) ao grupo!',
    legendaSaiu TEXT DEFAULT 'Saiu do grupo...',
    legendaBv2 TEXT DEFAULT '',
    legendaSaiu2 TEXT DEFAULT '',
    legendaEstrangeiro TEXT DEFAULT 'Numero estrangeiro nao permitido.',
    legendaListanegra TEXT DEFAULT 'Voce esta na lista negra.',
    legendaImagem TEXT DEFAULT '',
    legendaDocumento TEXT DEFAULT '',
    legendaVideo TEXT DEFAULT '',
    msgBan TEXT DEFAULT 'Foi banido(a) do grupo.',
    maxWarnings INTEGER DEFAULT 3,
    autoban INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Membros
  CREATE TABLE IF NOT EXISTS members (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    odGroupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    gold INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    messageCount INTEGER DEFAULT 0,
    stickerCount INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    warningReasons TEXT DEFAULT '[]',
    isMuted INTEGER DEFAULT 0,
    isAfk INTEGER DEFAULT 0,
    afkReason TEXT DEFAULT '',
    nick TEXT DEFAULT '',
    birthday TEXT DEFAULT '',
    lastActive TEXT DEFAULT (datetime('now')),
    joinedAt TEXT DEFAULT (datetime('now')),
    UNIQUE(odGroupId, userId)
  );

  -- Lista negra global
  CREATE TABLE IF NOT EXISTS blacklist (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL UNIQUE,
    reason TEXT DEFAULT '',
    addedBy TEXT DEFAULT '',
    addedAt TEXT DEFAULT (datetime('now'))
  );

  -- Lista branca (whitelist de links)
  CREATE TABLE IF NOT EXISTS whitelist (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    UNIQUE(groupId, userId)
  );

  -- Palavras proibidas por grupo
  CREATE TABLE IF NOT EXISTS banned_words (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    word TEXT NOT NULL,
    UNIQUE(groupId, word)
  );

  -- Mensagens agendadas
  CREATE TABLE IF NOT EXISTS scheduled_messages (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    message TEXT NOT NULL,
    mediaPath TEXT DEFAULT '',
    cronExpression TEXT NOT NULL,
    type TEXT DEFAULT 'once',
    active INTEGER DEFAULT 1,
    createdBy TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Anotacoes do grupo
  CREATE TABLE IF NOT EXISTS notes (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    text TEXT NOT NULL,
    createdBy TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Sticker commands personalizados
  CREATE TABLE IF NOT EXISTS sticker_cmds (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    cmdName TEXT NOT NULL,
    stickerData TEXT NOT NULL,
    createdBy TEXT DEFAULT '',
    UNIQUE(groupId, cmdName)
  );

  -- Comandos gold (customizados)
  CREATE TABLE IF NOT EXISTS gold_cmds (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    cmdName TEXT NOT NULL,
    goldCost INTEGER DEFAULT 0,
    UNIQUE(groupId, cmdName)
  );

  -- Comandos premium
  CREATE TABLE IF NOT EXISTS premium_cmds (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    cmdName TEXT NOT NULL,
    UNIQUE(groupId, cmdName)
  );

  -- Comandos bloqueados por grupo
  CREATE TABLE IF NOT EXISTS blocked_cmds (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    cmdName TEXT NOT NULL,
    UNIQUE(groupId, cmdName)
  );

  -- Cargos personalizados por grupo
  CREATE TABLE IF NOT EXISTS custom_roles (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT NOT NULL,
    assignedBy TEXT DEFAULT '',
    UNIQUE(groupId, userId)
  );

  -- Atividade log (x9 dos adms)
  CREATE TABLE IF NOT EXISTS activity_log (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    timestamp TEXT DEFAULT (datetime('now'))
  );

  -- Votacoes
  CREATE TABLE IF NOT EXISTS polls (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT DEFAULT '[]',
    votes TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1,
    createdBy TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Feedback
  CREATE TABLE IF NOT EXISTS feedback (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    rating INTEGER DEFAULT 0,
    text TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Duelos
  CREATE TABLE IF NOT EXISTS duels (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    player1 TEXT NOT NULL,
    player2 TEXT NOT NULL,
    votes1 INTEGER DEFAULT 0,
    votes2 INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Parcerias
  CREATE TABLE IF NOT EXISTS partnerships (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    partnerGroup TEXT NOT NULL,
    addedBy TEXT DEFAULT '',
    addedAt TEXT DEFAULT (datetime('now'))
  );

  -- Casamentos
  CREATE TABLE IF NOT EXISTS marriages (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    marriedAt TEXT DEFAULT (datetime('now'))
  );

  -- Prefixos por grupo
  CREATE TABLE IF NOT EXISTS group_prefixes (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    prefix TEXT NOT NULL,
    UNIQUE(groupId, prefix)
  );

  -- Novatos do dia
  CREATE TABLE IF NOT EXISTS daily_newcomers (
    odId INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    joinedDate TEXT DEFAULT (date('now')),
    UNIQUE(groupId, userId, joinedDate)
  );

  -- Indices
  CREATE INDEX IF NOT EXISTS idx_members_group ON members(odGroupId);
  CREATE INDEX IF NOT EXISTS idx_members_user ON members(userId);
  CREATE INDEX IF NOT EXISTS idx_members_active ON members(lastActive);
  CREATE INDEX IF NOT EXISTS idx_activity_group ON activity_log(groupId);
  CREATE INDEX IF NOT EXISTS idx_scheduled_active ON scheduled_messages(active);
`)

// ============================================================
//  FUNCOES DO BANCO DE DADOS
// ============================================================

// --- GRUPOS ---
export function getGroup(groupId) {
  const stmt = db.prepare('SELECT * FROM groups WHERE groupId = ?')
  let group = stmt.get(groupId)
  if (!group) {
    db.prepare('INSERT OR IGNORE INTO groups (groupId) VALUES (?)').run(groupId)
    group = stmt.get(groupId)
  }
  return group
}

export function updateGroup(groupId, fields) {
  const keys = Object.keys(fields)
  const sets = keys.map(k => `${k} = ?`).join(', ')
  const values = keys.map(k => fields[k])
  db.prepare(`UPDATE groups SET ${sets} WHERE groupId = ?`).run(...values, groupId)
}

export function toggleGroupSetting(groupId, setting) {
  getGroup(groupId)
  const current = db.prepare(`SELECT ${setting} FROM groups WHERE groupId = ?`).get(groupId)
  const newVal = current[setting] ? 0 : 1
  db.prepare(`UPDATE groups SET ${setting} = ? WHERE groupId = ?`).run(newVal, groupId)
  return newVal
}

// --- MEMBROS ---
export function getMember(groupId, userId) {
  let member = db.prepare('SELECT * FROM members WHERE odGroupId = ? AND userId = ?').get(groupId, userId)
  if (!member) {
    db.prepare('INSERT OR IGNORE INTO members (odGroupId, userId) VALUES (?, ?)').run(groupId, userId)
    member = db.prepare('SELECT * FROM members WHERE odGroupId = ? AND userId = ?').get(groupId, userId)
  }
  return member
}

export function updateMember(groupId, userId, fields) {
  getMember(groupId, userId)
  const keys = Object.keys(fields)
  const sets = keys.map(k => `${k} = ?`).join(', ')
  const values = keys.map(k => fields[k])
  db.prepare(`UPDATE members SET ${sets} WHERE odGroupId = ? AND userId = ?`).run(...values, groupId, userId)
}

export function incrementMessageCount(groupId, userId) {
  getMember(groupId, userId)
  db.prepare(`UPDATE members SET messageCount = messageCount + 1, lastActive = datetime('now') WHERE odGroupId = ? AND userId = ?`).run(groupId, userId)
}

export function incrementStickerCount(groupId, userId) {
  getMember(groupId, userId)
  db.prepare('UPDATE members SET stickerCount = stickerCount + 1 WHERE odGroupId = ? AND userId = ?').run(groupId, userId)
}

export function addWarning(groupId, userId, reason = '') {
  const member = getMember(groupId, userId)
  const reasons = JSON.parse(member.warningReasons || '[]')
  reasons.push({ reason, date: new Date().toISOString() })
  db.prepare('UPDATE members SET warnings = warnings + 1, warningReasons = ? WHERE odGroupId = ? AND userId = ?').run(JSON.stringify(reasons), groupId, userId)
  return member.warnings + 1
}

export function removeWarning(groupId, userId) {
  const member = getMember(groupId, userId)
  if (member.warnings <= 0) return 0
  const reasons = JSON.parse(member.warningReasons || '[]')
  reasons.pop()
  db.prepare('UPDATE members SET warnings = warnings - 1, warningReasons = ? WHERE odGroupId = ? AND userId = ?').run(JSON.stringify(reasons), groupId, userId)
  return member.warnings - 1
}

export function clearWarnings(groupId, userId) {
  db.prepare("UPDATE members SET warnings = 0, warningReasons = '[]' WHERE odGroupId = ? AND userId = ?").run(groupId, userId)
}

export function clearAllWarnings(groupId) {
  db.prepare("UPDATE members SET warnings = 0, warningReasons = '[]' WHERE odGroupId = ?").run(groupId)
}

export function getRankAtivos(groupId, limit = 10) {
  return db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY messageCount DESC LIMIT ?').all(groupId, limit)
}

export function getRankInativos(groupId, limit = 10) {
  return db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY lastActive ASC LIMIT ?').all(groupId, limit)
}

export function getRankStickers(groupId, limit = 10) {
  return db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY stickerCount DESC LIMIT ?').all(groupId, limit)
}

export function getRankGold(groupId, limit = 10) {
  return db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY gold DESC LIMIT ?').all(groupId, limit)
}

export function getRankLevel(groupId, limit = 10) {
  return db.prepare('SELECT * FROM members WHERE odGroupId = ? ORDER BY xp DESC LIMIT ?').all(groupId, limit)
}

export function getInactiveMembers(groupId, days) {
  return db.prepare(`SELECT * FROM members WHERE odGroupId = ? AND lastActive < datetime('now', '-' || ? || ' days')`).all(groupId, days)
}

export function getWarned(groupId) {
  return db.prepare('SELECT * FROM members WHERE odGroupId = ? AND warnings > 0 ORDER BY warnings DESC').all(groupId)
}

export function getAllMembers(groupId) {
  return db.prepare('SELECT * FROM members WHERE odGroupId = ?').all(groupId)
}

export function deleteMember(groupId, userId) {
  db.prepare('DELETE FROM members WHERE odGroupId = ? AND userId = ?').run(groupId, userId)
}

// --- GOLD ---
export function addGold(groupId, userId, amount) {
  getMember(groupId, userId)
  db.prepare('UPDATE members SET gold = gold + ? WHERE odGroupId = ? AND userId = ?').run(amount, groupId, userId)
}

export function removeGold(groupId, userId, amount) {
  db.prepare('UPDATE members SET gold = MAX(0, gold - ?) WHERE odGroupId = ? AND userId = ?').run(amount, groupId, userId)
}

export function getGold(groupId, userId) {
  const m = getMember(groupId, userId)
  return m.gold
}

export function transferGold(groupId, from, to, amount) {
  const sender = getMember(groupId, from)
  if (sender.gold < amount) return false
  removeGold(groupId, from, amount)
  addGold(groupId, to, amount)
  return true
}

export function resetGold(groupId) {
  db.prepare('UPDATE members SET gold = 0 WHERE odGroupId = ?').run(groupId)
}

// --- XP / LEVEL ---
export function addXp(groupId, userId, amount) {
  getMember(groupId, userId)
  db.prepare('UPDATE members SET xp = xp + ? WHERE odGroupId = ? AND userId = ?').run(amount, groupId, userId)
  const member = getMember(groupId, userId)
  const newLevel = Math.floor(member.xp / 100) + 1
  if (newLevel > member.level) {
    db.prepare('UPDATE members SET level = ? WHERE odGroupId = ? AND userId = ?').run(newLevel, groupId, userId)
    return newLevel
  }
  return null
}

export function resetLevels(groupId) {
  db.prepare('UPDATE members SET xp = 0, level = 1 WHERE odGroupId = ?').run(groupId)
}

// --- LISTA NEGRA ---
export function addToBlacklist(userId, reason = '', addedBy = '') {
  db.prepare('INSERT OR REPLACE INTO blacklist (userId, reason, addedBy) VALUES (?, ?, ?)').run(userId, reason, addedBy)
}

export function removeFromBlacklist(userId) {
  db.prepare('DELETE FROM blacklist WHERE userId = ?').run(userId)
}

export function isBlacklisted(userId) {
  return !!db.prepare('SELECT 1 FROM blacklist WHERE userId = ?').get(userId)
}

export function getBlacklist() {
  return db.prepare('SELECT * FROM blacklist').all()
}

// --- WHITELIST ---
export function addToWhitelist(groupId, userId) {
  db.prepare('INSERT OR IGNORE INTO whitelist (groupId, userId) VALUES (?, ?)').run(groupId, userId)
}

export function removeFromWhitelist(groupId, userId) {
  db.prepare('DELETE FROM whitelist WHERE groupId = ? AND userId = ?').run(groupId, userId)
}

export function isWhitelisted(groupId, userId) {
  return !!db.prepare('SELECT 1 FROM whitelist WHERE groupId = ? AND userId = ?').get(groupId, userId)
}

export function getWhitelist(groupId) {
  return db.prepare('SELECT * FROM whitelist WHERE groupId = ?').all(groupId)
}

// --- PALAVRAS PROIBIDAS ---
export function addBannedWord(groupId, word) {
  db.prepare('INSERT OR IGNORE INTO banned_words (groupId, word) VALUES (?, ?)').run(groupId, word.toLowerCase())
}

export function removeBannedWord(groupId, word) {
  db.prepare('DELETE FROM banned_words WHERE groupId = ? AND word = ?').run(groupId, word.toLowerCase())
}

export function getBannedWords(groupId) {
  return db.prepare('SELECT word FROM banned_words WHERE groupId = ?').all(groupId).map(r => r.word)
}

export function clearBannedWords(groupId) {
  db.prepare('DELETE FROM banned_words WHERE groupId = ?').run(groupId)
}

// --- MENSAGENS AGENDADAS ---
export function addScheduledMessage(groupId, message, cronExpression, type = 'once', mediaPath = '', createdBy = '') {
  db.prepare('INSERT INTO scheduled_messages (groupId, message, cronExpression, type, mediaPath, createdBy) VALUES (?, ?, ?, ?, ?, ?)').run(groupId, message, cronExpression, type, mediaPath, createdBy)
}

export function getScheduledMessages(groupId) {
  return db.prepare('SELECT * FROM scheduled_messages WHERE groupId = ? AND active = 1').all(groupId)
}

export function getAllScheduledMessages() {
  return db.prepare('SELECT * FROM scheduled_messages WHERE active = 1').all()
}

export function removeScheduledMessage(id) {
  db.prepare('UPDATE scheduled_messages SET active = 0 WHERE odId = ?').run(id)
}

export function clearScheduledMessages(groupId) {
  db.prepare('UPDATE scheduled_messages SET active = 0 WHERE groupId = ?').run(groupId)
}

// --- ANOTACOES ---
export function addNote(groupId, text, createdBy = '') {
  db.prepare('INSERT INTO notes (groupId, text, createdBy) VALUES (?, ?, ?)').run(groupId, text, createdBy)
}

export function getNotes(groupId) {
  return db.prepare('SELECT * FROM notes WHERE groupId = ?').all(groupId)
}

export function removeNote(id) {
  db.prepare('DELETE FROM notes WHERE odId = ?').run(id)
}

export function clearNotes(groupId) {
  db.prepare('DELETE FROM notes WHERE groupId = ?').run(groupId)
}

// --- STICKER COMMANDS ---
export function addStickerCmd(groupId, cmdName, stickerData, createdBy = '') {
  db.prepare('INSERT OR REPLACE INTO sticker_cmds (groupId, cmdName, stickerData, createdBy) VALUES (?, ?, ?, ?)').run(groupId, cmdName, stickerData, createdBy)
}

export function getStickerCmd(groupId, cmdName) {
  return db.prepare('SELECT * FROM sticker_cmds WHERE groupId = ? AND cmdName = ?').get(groupId, cmdName)
}

export function removeStickerCmd(groupId, cmdName) {
  db.prepare('DELETE FROM sticker_cmds WHERE groupId = ? AND cmdName = ?').run(groupId, cmdName)
}

export function listStickerCmds(groupId) {
  return db.prepare('SELECT cmdName FROM sticker_cmds WHERE groupId = ?').all(groupId)
}

// --- COMANDOS BLOQUEADOS ---
export function blockCmd(groupId, cmdName) {
  db.prepare('INSERT OR IGNORE INTO blocked_cmds (groupId, cmdName) VALUES (?, ?)').run(groupId, cmdName.toLowerCase())
}

export function unblockCmd(groupId, cmdName) {
  db.prepare('DELETE FROM blocked_cmds WHERE groupId = ? AND cmdName = ?').run(groupId, cmdName.toLowerCase())
}

export function isCmdBlocked(groupId, cmdName) {
  return !!db.prepare('SELECT 1 FROM blocked_cmds WHERE groupId = ? AND cmdName = ?').get(groupId, cmdName.toLowerCase())
}

// --- CARGOS ---
export function setRole(groupId, userId, role, assignedBy = '') {
  db.prepare('INSERT OR REPLACE INTO custom_roles (groupId, userId, role, assignedBy) VALUES (?, ?, ?, ?)').run(groupId, userId, role, assignedBy)
  updateMember(groupId, userId, { role })
}

export function getRole(groupId, userId) {
  const r = db.prepare('SELECT role FROM custom_roles WHERE groupId = ? AND userId = ?').get(groupId, userId)
  return r ? r.role : 'member'
}

export function removeRole(groupId, userId) {
  db.prepare('DELETE FROM custom_roles WHERE groupId = ? AND userId = ?').run(groupId, userId)
  updateMember(groupId, userId, { role: 'member' })
}

// --- LOG DE ATIVIDADES ---
export function logActivity(groupId, userId, action, details = '') {
  db.prepare('INSERT INTO activity_log (groupId, userId, action, details) VALUES (?, ?, ?, ?)').run(groupId, userId, action, details)
}

export function getActivityLog(groupId, limit = 50) {
  return db.prepare('SELECT * FROM activity_log WHERE groupId = ? ORDER BY timestamp DESC LIMIT ?').all(groupId, limit)
}

// --- VOTACOES ---
export function createPoll(groupId, question, options, createdBy = '') {
  db.prepare('INSERT INTO polls (groupId, question, options, createdBy) VALUES (?, ?, ?, ?)').run(groupId, question, JSON.stringify(options), createdBy)
}

export function getActivePoll(groupId) {
  return db.prepare('SELECT * FROM polls WHERE groupId = ? AND active = 1 ORDER BY odId DESC LIMIT 1').get(groupId)
}

export function votePoll(pollId, userId, optionIndex) {
  const poll = db.prepare('SELECT * FROM polls WHERE odId = ?').get(pollId)
  if (!poll) return false
  const votes = JSON.parse(poll.votes || '{}')
  votes[userId] = optionIndex
  db.prepare('UPDATE polls SET votes = ? WHERE odId = ?').run(JSON.stringify(votes), pollId)
  return true
}

export function endPoll(pollId) {
  db.prepare('UPDATE polls SET active = 0 WHERE odId = ?').run(pollId)
}

// --- FEEDBACK ---
export function addFeedback(groupId, userId, rating, text = '') {
  db.prepare('INSERT INTO feedback (groupId, userId, rating, text) VALUES (?, ?, ?, ?)').run(groupId, userId, rating, text)
}

export function getFeedbacks(groupId) {
  return db.prepare('SELECT * FROM feedback WHERE groupId = ? ORDER BY createdAt DESC').all(groupId)
}

// --- DUELOS ---
export function createDuel(groupId, player1, player2) {
  db.prepare('INSERT INTO duels (groupId, player1, player2) VALUES (?, ?, ?)').run(groupId, player1, player2)
  return db.prepare('SELECT * FROM duels WHERE groupId = ? ORDER BY odId DESC LIMIT 1').get(groupId)
}

export function getActiveDuel(groupId) {
  return db.prepare('SELECT * FROM duels WHERE groupId = ? AND active = 1 ORDER BY odId DESC LIMIT 1').get(groupId)
}

export function voteDuel(duelId, player) {
  if (player === 1) db.prepare('UPDATE duels SET votes1 = votes1 + 1 WHERE odId = ?').run(duelId)
  else db.prepare('UPDATE duels SET votes2 = votes2 + 1 WHERE odId = ?').run(duelId)
}

export function endDuel(duelId) {
  db.prepare('UPDATE duels SET active = 0 WHERE odId = ?').run(duelId)
}

export function resetDuels(groupId) {
  db.prepare('UPDATE duels SET active = 0 WHERE groupId = ?').run(groupId)
}

// --- NOVATOS DO DIA ---
export function addNewcomer(groupId, userId) {
  db.prepare("INSERT OR IGNORE INTO daily_newcomers (groupId, userId) VALUES (?, ?)").run(groupId, userId)
}

export function getNewcomers(groupId) {
  return db.prepare("SELECT * FROM daily_newcomers WHERE groupId = ? AND joinedDate = date('now')").all(groupId)
}

// --- PARCERIAS ---
export function addPartnership(groupId, partnerGroup, addedBy = '') {
  db.prepare('INSERT OR IGNORE INTO partnerships (groupId, partnerGroup, addedBy) VALUES (?, ?, ?)').run(groupId, partnerGroup, addedBy)
}

export function removePartnership(groupId, partnerGroup) {
  db.prepare('DELETE FROM partnerships WHERE groupId = ? AND partnerGroup = ?').run(groupId, partnerGroup)
}

export function getPartnerships(groupId) {
  return db.prepare('SELECT * FROM partnerships WHERE groupId = ?').all(groupId)
}

// --- PREFIXOS POR GRUPO ---
export function addGroupPrefix(groupId, prefix) {
  db.prepare('INSERT OR IGNORE INTO group_prefixes (groupId, prefix) VALUES (?, ?)').run(groupId, prefix)
}

export function removeGroupPrefix(groupId, prefix) {
  db.prepare('DELETE FROM group_prefixes WHERE groupId = ? AND prefix = ?').run(groupId, prefix)
}

export function getGroupPrefixes(groupId) {
  const list = db.prepare('SELECT prefix FROM group_prefixes WHERE groupId = ?').all(groupId)
  return list.map(r => r.prefix)
}

export default db
