// ============================================================
//  UTILIDADES GERAIS
// ============================================================
import config from '../config.js'
import { getRole, getGroup, getGroupPrefixes, isBlacklisted, isCmdBlocked, isWhitelisted } from './database.js'
import fs from 'fs'
import path from 'path'

// Formata numero para JID
export function formatJid(number) {
  if (!number) return ''
  const clean = number.replace(/[^0-9]/g, '')
  return clean.includes('@') ? clean : `${clean}@s.whatsapp.net`
}

// Extrai numero puro do JID
export function extractNumber(jid) {
  if (!jid) return ''
  return jid.replace(/@.*/, '')
}

// Verifica se eh grupo
export function isGroup(jid) {
  return jid?.endsWith('@g.us')
}

// Verifica se eh a dona
export function isOwner(userId) {
  return userId === config.ownerNumber || extractNumber(userId) === extractNumber(config.ownerNumber)
}

// Obtem nivel de permissao do usuario
export function getPermLevel(groupId, userId, isGroupAdmin) {
  if (isOwner(userId)) return 4
  const role = getRole(groupId, userId)
  if (role === 'admin' || isGroupAdmin) return 3
  if (role === 'mod') return 2
  if (role === 'aux') return 1
  return 0
}

// Verifica se o comando pode ser executado
export function canExecute(groupId, userId, isGroupAdmin, requiredLevel = 0) {
  return getPermLevel(groupId, userId, isGroupAdmin) >= requiredLevel
}

// Verifica se o prefixo bate
export function matchPrefix(text, groupId) {
  if (!text) return { matched: false }
  const grpSettings = getGroup(groupId)
  let prefixes = config.prefixes

  if (grpSettings?.multiprefixo) {
    const customPrefixes = getGroupPrefixes(groupId)
    if (customPrefixes.length > 0) {
      prefixes = [...new Set([...prefixes, ...customPrefixes])]
    }
  } else {
    prefixes = [grpSettings?.prefix || '#']
  }

  for (const p of prefixes) {
    if (text.startsWith(p)) {
      const withoutPrefix = text.slice(p.length).trim()
      const parts = withoutPrefix.split(/\s+/)
      const cmd = parts[0]?.toLowerCase() || ''
      const args = parts.slice(1)
      const fullArgs = withoutPrefix.slice(cmd.length).trim()
      return { matched: true, prefix: p, cmd, args, fullArgs }
    }
  }
  return { matched: false }
}

// Verifica links na mensagem
export function containsLink(text) {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|br|io|me|tv|co)[^\s]*)/gi
  return urlRegex.test(text)
}

// Verifica se o link eh permitido
export function isAllowedLink(text) {
  const urls = text.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi) || []
  for (const url of urls) {
    const isAllowed = config.allowedLinks.some(allowed => url.toLowerCase().includes(allowed))
    if (!isAllowed) return false
  }
  return urls.length > 0
}

// Verifica link de grupo do WhatsApp
export function isWhatsAppGroupLink(text) {
  return /chat\.whatsapp\.com\/[a-zA-Z0-9]+/i.test(text)
}

// Formata duracao em segundos para texto
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

// Gera numero aleatorio
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Escolhe item aleatorio de um array
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Gera porcentagem aleatoria
export function randomPercentage() {
  return randomInt(0, 100)
}

// Delay/Sleep
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Formata data brasileira
export function formatDateBR(date) {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Cria diretorio se nao existir
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// Header padrao de mensagens do bot
export function botHeader(title = '') {
  const t = config.demiTheme
  return `${t.separator}\n${t.emoji} *${t.greeting}* ${t.emoji}\n${title ? `\n*${title}*\n` : ''}${t.separator}\n`
}

// Footer padrao
export function botFooter() {
  return `\n${config.demiTheme.footerDecor}`
}

// Monta mensagem de menu formatada
export function buildMenu(title, items) {
  const t = config.demiTheme
  let msg = botHeader(title) + '\n'
  for (const item of items) {
    msg += `┃ ${t.headerDecor}  ${item}\n`
  }
  msg += botFooter()
  return msg
}

// Verifica se mensagem contem palavrao
export function containsBadWord(text, bannedWords = []) {
  const lower = text.toLowerCase()
  return bannedWords.some(word => lower.includes(word.toLowerCase()))
}

// Menciona usuario em texto
export function mention(userId) {
  const number = extractNumber(userId)
  return `@${number}`
}

// Serializa mensagem para facilitar o uso
export function serializeMessage(msg, sock) {
  const result = {
    key: msg.key,
    id: msg.key.id,
    from: msg.key.remoteJid,
    isGroup: isGroup(msg.key.remoteJid),
    sender: msg.key.participant || msg.key.remoteJid,
    fromMe: msg.key.fromMe,
    pushName: msg.pushName || '',
    message: msg.message,
    timestamp: msg.messageTimestamp,
  }

  // Tipo de mensagem
  const mtype = Object.keys(msg.message || {})[0]
  result.type = mtype

  // Conteudo de texto
  if (mtype === 'conversation') {
    result.text = msg.message.conversation
  } else if (mtype === 'extendedTextMessage') {
    result.text = msg.message.extendedTextMessage.text
  } else if (mtype === 'imageMessage') {
    result.text = msg.message.imageMessage.caption || ''
    result.isMedia = true
    result.mediaType = 'image'
  } else if (mtype === 'videoMessage') {
    result.text = msg.message.videoMessage.caption || ''
    result.isMedia = true
    result.mediaType = 'video'
  } else if (mtype === 'audioMessage') {
    result.text = ''
    result.isMedia = true
    result.mediaType = 'audio'
  } else if (mtype === 'stickerMessage') {
    result.text = ''
    result.isMedia = true
    result.mediaType = 'sticker'
  } else if (mtype === 'documentMessage') {
    result.text = msg.message.documentMessage.caption || ''
    result.isMedia = true
    result.mediaType = 'document'
  } else if (mtype === 'contactMessage' || mtype === 'contactsArrayMessage') {
    result.text = ''
    result.isContact = true
  } else if (mtype === 'locationMessage' || mtype === 'liveLocationMessage') {
    result.text = ''
    result.isLocation = true
  } else if (mtype === 'viewOnceMessageV2' || mtype === 'viewOnceMessage') {
    const inner = msg.message[mtype]?.message
    result.isViewOnce = true
    result.viewOnceMessage = inner
    result.text = ''
  } else {
    result.text = ''
  }

  // Mensagem citada
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (quoted) {
    result.quoted = {
      message: quoted,
      sender: msg.message.extendedTextMessage.contextInfo.participant,
      type: Object.keys(quoted)[0],
    }
  }

  // Mencionados
  result.mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

  return result
}

// Cooldown tracker
const cooldowns = new Map()

export function isOnCooldown(groupId, userId, cmd, seconds) {
  const key = `${groupId}_${userId}_${cmd}`
  const now = Date.now()
  const last = cooldowns.get(key) || 0
  if (now - last < seconds * 1000) {
    return { onCooldown: true, remaining: Math.ceil((seconds * 1000 - (now - last)) / 1000) }
  }
  cooldowns.set(key, now)
  return { onCooldown: false }
}

// Flood tracker
const floodTracker = new Map()

export function checkFlood(groupId, userId, limit = 10) {
  const key = `${groupId}_${userId}`
  const now = Date.now()
  const msgs = floodTracker.get(key) || []
  const recent = msgs.filter(t => now - t < 60000) // Ultimo minuto
  recent.push(now)
  floodTracker.set(key, recent)
  return recent.length > limit
}

// Limpa flood tracker periodicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, msgs] of floodTracker) {
    const recent = msgs.filter(t => now - t < 120000)
    if (recent.length === 0) floodTracker.delete(key)
    else floodTracker.set(key, recent)
  }
}, 60000)
