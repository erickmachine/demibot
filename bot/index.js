// ============================================================
//  DEMIBOT - ENTRADA PRINCIPAL
//  Bot completo para WhatsApp com Baileys
// ============================================================
import { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import cron from 'node-cron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import config from './config.js'
import * as db from './lib/database.js'
import {
  isGroup, isOwner, serializeMessage, matchPrefix, getPermLevel,
  canExecute, containsLink, isAllowedLink, isWhatsAppGroupLink,
  containsBadWord, checkFlood, isOnCooldown, mention, extractNumber,
  botHeader, botFooter, buildMenu, formatDateBR, sleep, randomChoice,
  ensureDir
} from './lib/utils.js'

import { handleMenu } from './commands/menu.js'
import { handleAdmin } from './commands/admin.js'
import { handleSticker } from './commands/sticker.js'
import { handleDownload } from './commands/download.js'
import { handleGames } from './commands/games.js'
import { handleGold } from './commands/gold.js'
import { handleEffects } from './commands/effects.js'
import { handleInfo } from './commands/info.js'
import { handleGroup } from './commands/group.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logger = pino({ level: 'silent' })

// Garante que diretorios existem
ensureDir(path.join(__dirname, 'data'))
ensureDir(path.join(__dirname, 'temp'))
ensureDir(path.join(__dirname, 'auth'))

// ============================================================
//  CONEXAO PRINCIPAL
// ============================================================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth'))
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['DemiBot', 'Chrome', '4.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
  })

  // QR Code
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('\n╔════════════════════════════════════╗')
      console.log('║     DEMIBOT - Escaneie o QR Code   ║')
      console.log('╚════════════════════════════════════╝\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('[DemiBot] Conexao fechada. Reconectando:', shouldReconnect)
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('\n╔════════════════════════════════════╗')
      console.log('║     DEMIBOT conectado com sucesso!  ║')
      console.log('╚════════════════════════════════════╝\n')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // ============================================================
  //  MENSAGENS AGENDADAS / BOM DIA
  // ============================================================
  cron.schedule(config.goodMorningCron, async () => {
    const msg = randomChoice(config.goodMorningMessages)
    // Envia para todos os grupos que o bot participa
    try {
      const groups = await sock.groupFetchAllParticipating()
      for (const groupId of Object.keys(groups)) {
        const grpSettings = db.getGroup(groupId)
        if (grpSettings) {
          await sock.sendMessage(groupId, { text: msg })
          await sleep(2000)
        }
      }
    } catch (e) {
      console.error('[DemiBot] Erro ao enviar bom dia:', e.message)
    }
  })

  // Mensagens agendadas customizadas
  setInterval(async () => {
    const scheduled = db.getAllScheduledMessages()
    for (const sched of scheduled) {
      try {
        if (cron.validate(sched.cronExpression)) {
          // Checa se o cron bate com o momento atual (simplificado)
          const job = cron.schedule(sched.cronExpression, async () => {
            if (sched.mediaPath && fs.existsSync(sched.mediaPath)) {
              const media = fs.readFileSync(sched.mediaPath)
              await sock.sendMessage(sched.groupId, { image: media, caption: sched.message })
            } else {
              await sock.sendMessage(sched.groupId, { text: sched.message })
            }
            if (sched.type === 'once') db.removeScheduledMessage(sched.odId)
            job.stop()
          })
        }
      } catch (e) {
        console.error('[DemiBot] Erro msg agendada:', e.message)
      }
    }
  }, 60000)

  // ============================================================
  //  HANDLER DE MENSAGENS
  // ============================================================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const rawMsg of messages) {
      try {
        if (!rawMsg.message) continue
        if (rawMsg.key.fromMe) continue

        const msg = serializeMessage(rawMsg, sock)
        const { from, sender, text, isGroup: isGrp } = msg

        // Ignora se nao eh grupo
        if (!isGrp) {
          // Advertir quem chamar no privado (opcional)
          await sock.sendMessage(from, {
            text: `${botHeader('AVISO')}\nEste bot funciona apenas em grupos!\nNao me chame no privado.${botFooter()}`
          })
          continue
        }

        const groupId = from
        const grpSettings = db.getGroup(groupId)

        // Obtem metadados do grupo
        let groupMeta
        try {
          groupMeta = await sock.groupMetadata(groupId)
        } catch {
          continue
        }

        const botNumber = sock.user?.id?.replace(/:.*/, '') + '@s.whatsapp.net'
        const isGroupAdmin = groupMeta.participants.find(p => p.id === sender)?.admin != null
        const isBotAdmin = groupMeta.participants.find(p => p.id === botNumber)?.admin != null
        const permLevel = getPermLevel(groupId, sender, isGroupAdmin)

        // Lista negra
        if (db.isBlacklisted(sender)) {
          if (isBotAdmin) {
            try {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              await sock.sendMessage(groupId, {
                text: `${grpSettings.legendaListanegra || 'Usuario na lista negra. Removido.'}`,
                mentions: [sender]
              })
            } catch {}
          }
          continue
        }

        // Incrementa contagem de mensagens
        db.incrementMessageCount(groupId, sender)

        // Adiciona XP
        const newLevel = db.addXp(groupId, sender, 1)
        if (newLevel) {
          await sock.sendMessage(groupId, {
            text: `${botHeader('LEVEL UP!')}\n${mention(sender)} subiu para o nivel *${newLevel}*!${botFooter()}`,
            mentions: [sender]
          })
        }

        // ============================================================
        //  FILTROS AUTOMATICOS
        // ============================================================

        // Anti-flood
        if (grpSettings.antiflood && permLevel < 3) {
          if (checkFlood(groupId, sender, config.floodLimit)) {
            const warns = db.addWarning(groupId, sender, 'Flood de mensagens')
            if (warns >= grpSettings.maxWarnings && isBotAdmin) {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              await sock.sendMessage(groupId, {
                text: `${mention(sender)} removido por flood (${warns} advertencias).`,
                mentions: [sender]
              })
              db.clearWarnings(groupId, sender)
            } else {
              await sock.sendMessage(groupId, {
                text: `${mention(sender)} pare de fazer flood! Advertencia ${warns}/${grpSettings.maxWarnings}`,
                mentions: [sender]
              })
            }
            continue
          }
        }

        // Anti-link
        if (grpSettings.antilink && text && containsLink(text) && permLevel < 3 && !db.isWhitelisted(groupId, sender)) {
          if (!isAllowedLink(text)) {
            if (grpSettings.advlink) {
              const warns = db.addWarning(groupId, sender, 'Envio de link nao permitido')
              await sock.sendMessage(groupId, {
                text: `${mention(sender)} links nao sao permitidos! Advertencia ${warns}/${grpSettings.maxWarnings}`,
                mentions: [sender]
              })
              if (warns >= grpSettings.maxWarnings && isBotAdmin) {
                await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
                db.clearWarnings(groupId, sender)
                db.addToBlacklist(sender, 'Excesso de links', 'auto')
              }
            }
            try {
              await sock.sendMessage(groupId, { delete: msg.key })
            } catch {}
            continue
          }
        }

        // Anti-link de grupo
        if (grpSettings.antilinkgp && text && isWhatsAppGroupLink(text) && permLevel < 3) {
          if (grpSettings.advlinkgp) {
            const warns = db.addWarning(groupId, sender, 'Envio de link de grupo')
            await sock.sendMessage(groupId, {
              text: `${mention(sender)} links de grupo nao sao permitidos! Advertencia ${warns}/${grpSettings.maxWarnings}`,
              mentions: [sender]
            })
            if (warns >= grpSettings.maxWarnings && isBotAdmin) {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              db.clearWarnings(groupId, sender)
            }
          }
          try {
            await sock.sendMessage(groupId, { delete: msg.key })
          } catch {}
          continue
        }

        // Anti-palavrao
        if (grpSettings.antipalavra && text && permLevel < 3) {
          const bannedWords = db.getBannedWords(groupId)
          if (containsBadWord(text, bannedWords)) {
            const warns = db.addWarning(groupId, sender, 'Uso de palavra proibida')
            await sock.sendMessage(groupId, {
              text: `${mention(sender)} essa palavra nao e permitida aqui! Advertencia ${warns}/${grpSettings.maxWarnings}`,
              mentions: [sender]
            })
            try {
              await sock.sendMessage(groupId, { delete: msg.key })
            } catch {}
            if (warns >= grpSettings.maxWarnings && isBotAdmin) {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              db.clearWarnings(groupId, sender)
            }
            continue
          }
        }

        // Anti-midia (imagem, video, audio, doc, sticker, contato, localizacao)
        const antiMediaChecks = [
          { setting: 'antiimg', type: 'imageMessage', label: 'Imagens' },
          { setting: 'antivideo', type: 'videoMessage', label: 'Videos' },
          { setting: 'antiaudio', type: 'audioMessage', label: 'Audios' },
          { setting: 'antidoc', type: 'documentMessage', label: 'Documentos' },
          { setting: 'antisticker', type: 'stickerMessage', label: 'Stickers' },
          { setting: 'anticontato', type: 'contactMessage', label: 'Contatos' },
          { setting: 'antiloc', type: 'locationMessage', label: 'Localizacao' },
        ]

        let blocked = false
        for (const check of antiMediaChecks) {
          if (grpSettings[check.setting] && msg.type === check.type && permLevel < 3) {
            const warns = db.addWarning(groupId, sender, `Envio de ${check.label}`)
            await sock.sendMessage(groupId, {
              text: `${mention(sender)} ${check.label} nao permitido(s)! Adv ${warns}/${grpSettings.maxWarnings}`,
              mentions: [sender]
            })
            try {
              await sock.sendMessage(groupId, { delete: msg.key })
            } catch {}
            blocked = true
            break
          }
        }
        if (blocked) continue

        // Limite de caracteres
        if (grpSettings.limittexto && text && text.length > grpSettings.maxChars && permLevel < 3) {
          await sock.sendMessage(groupId, {
            text: `${mention(sender)} mensagem muito longa! Limite: ${grpSettings.maxChars} caracteres.`,
            mentions: [sender]
          })
          try {
            await sock.sendMessage(groupId, { delete: msg.key })
          } catch {}
          continue
        }

        // Modo so admin
        if (grpSettings.soadm && permLevel < 3) {
          try {
            await sock.sendMessage(groupId, { delete: msg.key })
          } catch {}
          continue
        }

        // X9 view once - revelar mensagem de visualizacao unica
        if (grpSettings.x9viewonce && msg.isViewOnce) {
          try {
            const viewOnceMsg = msg.viewOnceMessage
            if (viewOnceMsg) {
              const mtype = Object.keys(viewOnceMsg)[0]
              if (mtype === 'imageMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
                await sock.sendMessage(groupId, {
                  image: buffer,
                  caption: `${botHeader('X9 VIEW ONCE')}\n${mention(sender)} enviou uma visualizacao unica:${botFooter()}`,
                  mentions: [sender]
                })
              } else if (mtype === 'videoMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
                await sock.sendMessage(groupId, {
                  video: buffer,
                  caption: `${botHeader('X9 VIEW ONCE')}\n${mention(sender)} enviou uma visualizacao unica:${botFooter()}`,
                  mentions: [sender]
                })
              }
            }
          } catch (e) {
            console.error('[DemiBot] Erro x9 viewonce:', e.message)
          }
        }

        // Auto sticker
        if (grpSettings.autosticker && msg.isMedia && msg.mediaType === 'image') {
          try {
            const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
            await sock.sendMessage(groupId, {
              sticker: buffer,
              mimetype: 'image/webp',
            })
          } catch {}
        }

        // AFK check - se alguem mencionou um usuario AFK
        for (const mentioned of msg.mentionedJid) {
          const memberData = db.getMember(groupId, mentioned)
          if (memberData.isAfk) {
            await sock.sendMessage(groupId, {
              text: `${mention(mentioned)} esta AFK: ${memberData.afkReason || 'Sem motivo'}`,
              mentions: [mentioned]
            })
          }
        }

        // Se o proprio usuario que mandou msg esta AFK, remove o AFK
        const senderMember = db.getMember(groupId, sender)
        if (senderMember.isAfk) {
          db.updateMember(groupId, sender, { isAfk: 0, afkReason: '' })
          await sock.sendMessage(groupId, {
            text: `${mention(sender)} voltou e nao esta mais AFK!`,
            mentions: [sender]
          })
        }

        // ============================================================
        //  PROCESSAMENTO DE COMANDOS
        // ============================================================
        const parsed = matchPrefix(text, groupId)
        if (!parsed.matched) continue

        const { cmd, args, fullArgs } = parsed

        // Verifica se o comando esta bloqueado
        if (db.isCmdBlocked(groupId, cmd)) {
          await sock.sendMessage(groupId, { text: 'Este comando esta bloqueado neste grupo.' })
          continue
        }

        // Cooldown
        const cooldownResult = isOnCooldown(groupId, sender, cmd, grpSettings.cmdCooldown || config.cmdCooldown)
        if (cooldownResult.onCooldown && permLevel < 3) {
          await sock.sendMessage(groupId, {
            text: `Aguarde ${cooldownResult.remaining}s para usar este comando novamente.`
          })
          continue
        }

        // Log de atividade
        db.logActivity(groupId, sender, cmd, fullArgs)

        // Context object para passar aos handlers
        const ctx = {
          sock,
          msg,
          rawMsg,
          cmd,
          args,
          fullArgs,
          groupId,
          sender,
          grpSettings,
          groupMeta,
          isGroupAdmin,
          isBotAdmin,
          permLevel,
          botNumber,
          downloadMediaMessage,
        }

        // ============================================================
        //  ROTEAMENTO DE COMANDOS
        // ============================================================

        // MENUS
        const menuCmds = ['menu', 'menufigurinhas', 'menubrincadeiras', 'menuefeitos',
          'menuadm', 'menugold', 'menumenu', 'menudownload', 'menuinfo', 'menujogos',
          'menugrupo', 'menuanime', 'menulogos', 'menusticker', 'menumarcar',
          'menubaixar', 'menufig', 'menuvip', 'menugame', 'menudono', 'menurpg',
          'configurarbot', 'configurar-bot']
        if (menuCmds.includes(cmd)) {
          const result = handleMenu(cmd, { ...msg, args }, sock)
          await sock.sendMessage(groupId, { text: result })
          continue
        }

        // ADMIN
        const adminCmds = [
          'ban', 'band', 'add', 'advertir', 'adverter', 'checkwarnings', 'ver_adv',
          'removewarnings', 'rm_adv', 'clearwarnings', 'limpar_adv', 'limparavisos',
          'resetavisos', 'advertidos', 'lista_adv', 'mute', 'desmute',
          'promover', 'rebaixar', 'cargo', 'tagall', 'totag', 'hidetag', 'marcar',
          'marcar2', 'marcarwa', 'linkgp', 'nomegp', 'descgp', 'fotogp', 'setfotogp',
          'fechargp', 'colloportus', 'abrirgp', 'alohomora', 'deletar',
          'sorteio', 'banghost', 'banfakes', 'banfake', 'inativos', 'nuke',
          'listanegra', 'listaban', 'listafake', 'tirardalista',
          'listabranca', 'rmlistabranca', 'antilinkwhite',
          'aceitar', 'aceitarmembro', 'anotar', 'anotacao', 'anotacoes', 'rmnota', 'tirar_nota',
          'status', 'atividades', 'atividade',
          'bemvindo', 'bemvindo2', 'fundobemvindo', 'fundosaiu', 'verfundos',
          'antilink', 'advlink', 'antilinkgp', 'advlinkgp',
          'antifake', 'antiflood', 'advflood', 'antipalavra',
          'addpalavra', 'add_palavra', 'delpalavra', 'rm_palavra',
          'listapalavrao', 'limparpalavras',
          'antibots', 'antimarcar', 'antiimg', 'antivideo', 'antiaudio',
          'antidoc', 'antisticker', 'anticatalogo', 'anticontato', 'antiloc',
          'anti_notas', 'antinotas', 'anticallgp',
          'so_adm', 'soadm', 'autobaixar', 'autodl', 'autosticker',
          'x9viewonce', 'x9visuunica', 'x9adm',
          'multiprefixo', 'multiprefix', 'prefixos', 'add_prefixo', 'del_prefixo',
          'legendabv', 'legendasaiu', 'legendabv2', 'legendasaiu2',
          'legenda_estrangeiro', 'legenda_listanegra', 'legenda_imagem',
          'legenda_documento', 'legenda_video', 'setmsgban',
          'limitecaracteres', 'limitec', 'limittexto', 'setlimitec',
          'mensagem-automatica', 'listar-mensagens-automaticas',
          'limpar-mensagens-automaticas', 'mensagens-agendadas', 'limpar-agendadas',
          'fechar-abrirgp', 'tirar-fechar-abrirgp', 'verificar-horario',
          'opengp', 'closegp', 'rm_opengp', 'listar-opengp', 'ativar-opengp',
          'time-status', 'tempocmd', 'cooldowncmd',
          'bloquearcmd', 'desativarcmd', 'liberarcmd', 'restringircmd',
          'verlimites', 'limparlimites', 'listanti',
          'addcmdgold', 'rmcmdgold', 'delcmdgold', 'addcmdpremium', 'tirarcmdpremium', 'cmdpremium',
          'adddono', 'dononogrupo', 'modoparceria', 'add_parceria', 'del_parceria', 'parceria',
          'criartabela', 'remover-tabela', 'tabelagp',
          'zerarrank', 'zerar_duelo', 'resetdamas', 'resetvelha', 'resetlevel',
          'zerar_gold', 'addgold', 'addxp',
          'autoban', 'admautoban', 'limite-msg-auto',
          'setativ', 'setmsg',
          'bcgp', 'bc', 'divmsg',
          'join', 'sairgp', 'exitgp', 'sairdogp',
          'simih', 'simih2', 'modorpg', 'modogamer', 'autoresposta', 'nsfw',
          'regras', 'recrutar', 'grupos',
          'clearcache', 'limpar',
          'permissoes', 'block',
        ]
        if (adminCmds.includes(cmd)) {
          await handleAdmin(ctx)
          continue
        }

        // STICKER
        const stickerCmds = [
          's', 'f', 'sticker', 'figurinha', 'figu',
          'take', 'rgtake', 'rmtake', 'mytake', 'modtake',
          'toimg', 'togif', 'tomp4',
          'ttp', 'ttp2', 'ttp3', 'ttp4', 'ttp5', 'ttp6',
          'attp', 'attp2', 'attp3', 'attp4',
          'rename', 'idfigu',
          'sfundo', 'rbale',
          'qc', 'qc1', 'qc2',
          'emoji', 'emoji-mix',
          'addstickercmd', 'getstickercmd', 'delstickercmd', 'liststickerscmd', 'stickercmdinfo',
          'rgfigu', 'rmfigu', 'listafigu',
          'autofigu',
          'smartsticker',
          'fig', 'figurinhas', 'figanime', 'figroblox', 'figmeme', 'figdesenho',
          'figemoji', 'figraiva', 'figcoreana', 'figengracada', 'funny',
          'packfig', 'packsfigs', 'pesquisarfig',
          'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat',
          'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive',
          'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'happy',
          'wink', 'poke', 'dance', 'cringe',
          'placaloli',
        ]
        if (stickerCmds.includes(cmd)) {
          await handleSticker(ctx)
          continue
        }

        // DOWNLOADS
        const downloadCmds = [
          'play', 'play2', 'play_audio', 'play_video',
          'playvideo', 'playvid2', 'playmp4', 'playdoc',
          'ytmp3', 'ytmp4', 'ytsearch', 'ytbuscar',
          'tiktok', 'tiktok2', 'tiktok_video', 'tiktok_audio',
          'instagram', 'insta2', 'insta_video', 'insta_audio',
          'twitter', 'twitter2', 'twitter_video', 'twitter_audio',
          'facebook', 'face_video', 'face_audio', 'facebook_video', 'facebook_audio',
          'threads_video', 'threads_audio',
          'pinterest', 'pinterest_video',
          'spotify', 'soundcloud', 'deezer',
          'mediafire', 'gitclone',
          'lyrics', 'letra',
          'download-link', 'downloader',
          'tomp3', 'imgpralink', 'videopralink',
          'kwai', 'ifunny', 'statuszap',
          'transcrever', 'shazam',
          'videocontrario', 'videolento', 'videorapido',
          'audiocontrario',
          'gerarlink', 'gerarlink2',
          'audio-menu',
          'legenda_video',
        ]
        if (downloadCmds.includes(cmd)) {
          await handleDownload(ctx)
          continue
        }

        // JOGOS / BRINCADEIRAS
        const gamesCmds = [
          'ppt', 'ppt2', 'akinator', 'damas', 'jogodavelha',
          'iniciar_forca', 'rv-forca', 'rv', 'roleta',
          'fakemsg', 'eujaeununca',
          'porcentagem', 'chance', 'sorte',
          'rankgay', 'rankgado', 'rankcorno', 'rankgostoso', 'rankgostosa',
          'rankkenga', 'rankhetero', 'ranknazista', 'rankgolpe', 'rankotaku', 'rankpau', 'rankbct',
          'gadometro', 'signo',
          'pergunta', 'sn', 'cantadas', 'fatos', 'conselho', 'conselhobiblico',
          'duelo', 'votar_duelo',
          'iniciar_votacao', 'votar', 'terminar_votacao',
          'proxjogo', 'tabelacamp', 'ultimosjogos', 'placares',
          'enviarcachaca', 'resetarcc',
          'casamento', 'casal', 'recusar', 'entrar',
          'matar', 'beijo', 'tapa', 'chute', 'abraco',
          'corno', 'gado', 'gostoso', 'gostosa', 'gay',
          'vesgo', 'bebado', 'feio', 'nazista', 'golpe', 'dogolpe',
          'hetero', 'sigma',
          'imc', 'webcorno', 'ceu', 'inferno',
          'anagrama', 'revelar_anagrama', 'revelar_gartic', 'revelar_enigma',
          'simi', 'bot',
        ]
        if (gamesCmds.includes(cmd)) {
          await handleGames(ctx)
          continue
        }

        // GOLD
        const goldCmds = [
          'gold', 'rankgold', 'doargold', 'minerar_gold', 'roubargold',
          'vingancagold', 'daily',
          'cassino', 'apostargold', 'doublegold', 'jackpotgold',
          'roletadasorte', 'aviatorgold', 'caixamisteriosagold',
          'sequenciagold', 'combinegold', 'quiznumero', 'sorteiogold',
          'emojigold', 'mencgold', 'desmencgold', 'statusemoji',
          'emojiativo', 'emojiatual', 'rankemojigold', 'emojisgoldlista',
          'lojagold', 'ccgold', 'bolaogold',
          'premium', 'serpremium', 'wallpaperprem', 'wallpp',
          'hrppremium', 'rankingjogosgold',
        ]
        if (goldCmds.includes(cmd)) {
          await handleGold(ctx)
          continue
        }

        // EFEITOS
        const effectsCmds = [
          'kiss', 'kissme', 'ship', 'shipme', 'slap', 'spank',
          'triggered', 'delete', 'jail', 'wasted', 'blur',
          'greyscale', 'sepia', 'invert', 'clown', 'batslap',
          'beautiful', 'bobross', 'ad',
          'lixo', 'lgbt', 'morto', 'preso', 'deletem', 'procurado', 'hitler',
          'borrar', 'merda',
          'totext', 'bs64',
          'grave', 'grave2', 'bass', 'bass2', 'bass3',
          'estourar', 'estourar2', 'fast', 'esquilo', 'slow',
          'reverse', 'fat', 'alto', 'deep', 'deep1', 'speedup',
          'audiolento', 'vozmenino',
          // Logos/text effects
          'shadow', 'efeitoneon', 'neon', 'neon1', 'neon2', 'neon3', 'neon3d', 'neongreen', 'neondevil',
          'fire', 'smoke', 'matrix', 'blood', 'lava', 'gelo', '3dgold', 'rainbow',
          'carbon', 'horror', 'berry', 'luxury', 'toxic',
          'plabe', 'metalgold', 'cup', 'txtborboleta', 'harryp',
          'cemiterio', 'lobometal', 'madeira', 'lovemsg', 'lovemsg2', 'lovemsg3',
          'coffecup', 'coffecup2', 'florwooden', 'narutologo', 'romantic',
          'papel', 'angelwing', 'hackneon', 'fpsmascote', 'equipemascote',
          'txtquadrinhos', 'ffavatar', 'mascotegame', 'angelglx',
          'gizquadro', 'wingeffect', 'blackpink', 'girlmascote', 'logogame',
          'fiction', '3dstone', 'areia', 'style', 'pink', 'cattxt',
          'metalfire', 'thunder', 'thunderv2', 'vidro', 'jokerlogo',
          'transformer', 'demonfire', 'jeans', 'metalblue', 'natal',
          'ossos', 'asfalto', 'break', 'glitch2', 'colaq', 'nuvem',
          'neve', 'lapis', 'demongreen', 'halloween',
          'circulo', 'upscale', 'hd', 'crimg',
          'metadinha', 'adolesc',
        ]
        if (effectsCmds.includes(cmd)) {
          await handleEffects(ctx)
          continue
        }

        // INFO
        const infoCmds = [
          'info', 'infobot', 'ping', 'ping2', 'ping3',
          'dono', 'donos', 'infodono', 'criador',
          'idiomas', 'tabela', 'gpinfo', 'grupoinfo', 'grupo',
          'perfil', 'me', 'check',
          'admins', 'infocmd', 'listacmd',
          'infobv', 'info_adverter', 'info_listanegra', 'infocontador',
          'infoclosegp',
          'eco', 'repeat', 'teste',
          'wame', 'tagme',
          'clima', 'traduzir', 'wikipedia', 'dicionario',
          'calculadora', 'calcular', 'moedas',
          'cep', 'ddd', 'encurtalink',
          'gerarcpf', 'vrcpf',
          'celular', 'amazon',
          'gimage', 'buscar', 'pesquisa', 'ler',
          'esportenoticias', 'noticiaesp', 'noticias', 'terra',
          'playstore', 'aptoide', 'aptoide_pesquisa',
          'printsite', 'lastfm',
          'filme', 'serie', 'book',
          'avalie', 'bug', 'sugestao', 'sugestão',
          'convite', 'listavip',
          'npm', 'bingimg', 'criarimg',
          'legenda', 'contar', 'sender',
          'falar', 'gtts',
          'gerarnick', 'nick', 'aniversario',
          'ausente', 'afk', 'ativo', 'listarafk', 'statusafk',
          'apresentar', 'apr', 'digt', 'papof',
          'ptvmsg', 'rvisu',
          'instauser', 'ytstalk', 'tiktok_stalker',
          'gemini', 'gpt',
          'animets',
          'alugar', 'aluguel',
          'ativacoes', 'logos1',
          'listacomunidades',
          'sorte', 'signo',
          'listavip',
        ]
        if (infoCmds.includes(cmd)) {
          await handleInfo(ctx)
          continue
        }

        // GRUPO / RANKINGS
        const groupCmds = [
          'rankativos', 'rankativosg', 'checkativo',
          'rankfigurinhas', 'ultimosativos', 'rankinativo',
          'ranklevel', 'leveltemas',
          'novatos', 'bemvindoaosnovatos',
          'listatm', 'rgtm', 'tirardatm', 'fazertm',
          'emcomum', 'listagp2',
          'statusdamas',
        ]
        if (groupCmds.includes(cmd)) {
          await handleGroup(ctx)
          continue
        }

        // ANIME
        const animeCmds = [
          'animeinfo', 'waifu', 'neko', 'loli', 'megumin',
          'goku', 'nezuko', 'makima', 'kaguya', 'nagatoro',
          'sakura', 'itsuki', 'chizuru', 'hinata', 'akame',
          'yuno', 'daki', 'aqua', 'aizen',
          'komi', 'esdeath', 'muzan', 'gojo', 'shinobu',
          'yuta', 'mitsuri', 'yoruichi', 'rukia', 'fubuki', 'anya',
        ]
        if (animeCmds.includes(cmd)) {
          await handleEffects(ctx) // anime images handled in effects
          continue
        }

      } catch (err) {
        console.error('[DemiBot] Erro ao processar mensagem:', err)
      }
    }
  })

  // ============================================================
  //  EVENTOS DE GRUPO (boas-vindas, saida, etc.)
  // ============================================================
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const grpSettings = db.getGroup(id)
      const groupMeta = await sock.groupMetadata(id)

      for (const participant of participants) {
        if (action === 'add') {
          // Anti-fake
          if (grpSettings.antifake) {
            const num = extractNumber(participant)
            if (!num.startsWith('55')) {
              const botNumber = sock.user?.id?.replace(/:.*/, '') + '@s.whatsapp.net'
              const isBotAdmin = groupMeta.participants.find(p => p.id === botNumber)?.admin != null
              if (isBotAdmin) {
                await sock.groupParticipantsUpdate(id, [participant], 'remove')
                await sock.sendMessage(id, {
                  text: grpSettings.legendaEstrangeiro || 'Numero estrangeiro nao permitido.',
                })
                continue
              }
            }
          }

          // Lista negra
          if (db.isBlacklisted(participant)) {
            const botNumber = sock.user?.id?.replace(/:.*/, '') + '@s.whatsapp.net'
            const isBotAdmin = groupMeta.participants.find(p => p.id === botNumber)?.admin != null
            if (isBotAdmin) {
              await sock.groupParticipantsUpdate(id, [participant], 'remove')
              await sock.sendMessage(id, {
                text: grpSettings.legendaListanegra || 'Usuario na lista negra.',
              })
              continue
            }
          }

          // Registrar membro
          db.getMember(id, participant)
          db.addNewcomer(id, participant)

          // Boas-vindas
          if (grpSettings.welcome) {
            let welcomeMsg = grpSettings.legendaBv || 'Seja bem-vindo(a) ao grupo!'
            welcomeMsg = welcomeMsg
              .replace('{user}', mention(participant))
              .replace('{group}', groupMeta.subject)
              .replace('{desc}', groupMeta.desc || '')

            const welcomeText = `${botHeader('BEM-VINDO(A)!')}\n${welcomeMsg}\n\nDigite *#menu* para ver os comandos disponiveis.${botFooter()}`

            if (grpSettings.welcomeBg) {
              try {
                const bgBuffer = fs.readFileSync(grpSettings.welcomeBg)
                await sock.sendMessage(id, {
                  image: bgBuffer,
                  caption: welcomeText,
                  mentions: [participant]
                })
              } catch {
                await sock.sendMessage(id, { text: welcomeText, mentions: [participant] })
              }
            } else {
              await sock.sendMessage(id, { text: welcomeText, mentions: [participant] })
            }
          }
        }

        if (action === 'remove') {
          // Despedida
          if (grpSettings.welcome) {
            let goodbyeMsg = grpSettings.legendaSaiu || 'Saiu do grupo...'
            goodbyeMsg = goodbyeMsg
              .replace('{user}', mention(participant))
              .replace('{group}', groupMeta.subject)

            const goodbyeText = `${botHeader('SAIU DO GRUPO')}\n${goodbyeMsg}${botFooter()}`

            if (grpSettings.goodbyeBg) {
              try {
                const bgBuffer = fs.readFileSync(grpSettings.goodbyeBg)
                await sock.sendMessage(id, {
                  image: bgBuffer,
                  caption: goodbyeText,
                  mentions: [participant]
                })
              } catch {
                await sock.sendMessage(id, { text: goodbyeText, mentions: [participant] })
              }
            } else {
              await sock.sendMessage(id, { text: goodbyeText, mentions: [participant] })
            }
          }

          // Remove dados do membro
          db.deleteMember(id, participant)
        }

        if (action === 'promote') {
          await sock.sendMessage(id, {
            text: `${botHeader('PROMOVIDO')}\n${mention(participant)} agora e administrador!${botFooter()}`,
            mentions: [participant]
          })
        }

        if (action === 'demote') {
          await sock.sendMessage(id, {
            text: `${botHeader('REBAIXADO')}\n${mention(participant)} nao e mais administrador.${botFooter()}`,
            mentions: [participant]
          })
        }
      }
    } catch (err) {
      console.error('[DemiBot] Erro no evento de grupo:', err)
    }
  })

  return sock
}

// Inicia o bot
startBot().catch(err => {
  console.error('[DemiBot] Erro fatal:', err)
  process.exit(1)
})      try {
        if (cron.validate(sched.cronExpression)) {
          // Checa se o cron bate com o momento atual (simplificado)
          const job = cron.schedule(sched.cronExpression, async () => {
            if (sched.mediaPath && fs.existsSync(sched.mediaPath)) {
              const media = fs.readFileSync(sched.mediaPath)
              await sock.sendMessage(sched.groupId, { image: media, caption: sched.message })
            } else {
              await sock.sendMessage(sched.groupId, { text: sched.message })
            }
            if (sched.type === 'once') db.removeScheduledMessage(sched.odId)
            job.stop()
          })
        }
      } catch (e) {
        console.error('[DemiBot] Erro msg agendada:', e.message)
      }
    }
  }, 60000)

  // ============================================================
  //  HANDLER DE MENSAGENS
  // ============================================================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const rawMsg of messages) {
      try {
        if (!rawMsg.message) continue
        if (rawMsg.key.fromMe) continue

        const msg = serializeMessage(rawMsg, sock)
        const { from, sender, text, isGroup: isGrp } = msg

        // Ignora se nao eh grupo
        if (!isGrp) {
          // Advertir quem chamar no privado (opcional)
          await sock.sendMessage(from, {
            text: `${botHeader('AVISO')}\nEste bot funciona apenas em grupos!\nNao me chame no privado.${botFooter()}`
          })
          continue
        }

        const groupId = from
        const grpSettings = db.getGroup(groupId)

        // Obtem metadados do grupo
        let groupMeta
        try {
          groupMeta = await sock.groupMetadata(groupId)
        } catch {
          continue
        }

        const botNumber = sock.user?.id?.replace(/:.*/, '') + '@s.whatsapp.net'
        const isGroupAdmin = groupMeta.participants.find(p => p.id === sender)?.admin != null
        const isBotAdmin = groupMeta.participants.find(p => p.id === botNumber)?.admin != null
        const permLevel = getPermLevel(groupId, sender, isGroupAdmin)

        // Lista negra
        if (db.isBlacklisted(sender)) {
          if (isBotAdmin) {
            try {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              await sock.sendMessage(groupId, {
                text: `${grpSettings.legendaListanegra || 'Usuario na lista negra. Removido.'}`,
                mentions: [sender]
              })
            } catch {}
          }
          continue
        }

        // Incrementa contagem de mensagens
        db.incrementMessageCount(groupId, sender)

        // Adiciona XP
        const newLevel = db.addXp(groupId, sender, 1)
        if (newLevel) {
          await sock.sendMessage(groupId, {
            text: `${botHeader('LEVEL UP!')}\n${mention(sender)} subiu para o nivel *${newLevel}*!${botFooter()}`,
            mentions: [sender]
          })
        }

        // ============================================================
        //  FILTROS AUTOMATICOS
        // ============================================================

        // Anti-flood
        if (grpSettings.antiflood && permLevel < 3) {
          if (checkFlood(groupId, sender, config.floodLimit)) {
            const warns = db.addWarning(groupId, sender, 'Flood de mensagens')
            if (warns >= grpSettings.maxWarnings && isBotAdmin) {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              await sock.sendMessage(groupId, {
                text: `${mention(sender)} removido por flood (${warns} advertencias).`,
                mentions: [sender]
              })
              db.clearWarnings(groupId, sender)
            } else {
              await sock.sendMessage(groupId, {
                text: `${mention(sender)} pare de fazer flood! Advertencia ${warns}/${grpSettings.maxWarnings}`,
                mentions: [sender]
              })
            }
            continue
          }
        }

        // Anti-link
        if (grpSettings.antilink && text && containsLink(text) && permLevel < 3 && !db.isWhitelisted(groupId, sender)) {
          if (!isAllowedLink(text)) {
            if (grpSettings.advlink) {
              const warns = db.addWarning(groupId, sender, 'Envio de link nao permitido')
              await sock.sendMessage(groupId, {
                text: `${mention(sender)} links nao sao permitidos! Advertencia ${warns}/${grpSettings.maxWarnings}`,
                mentions: [sender]
              })
              if (warns >= grpSettings.maxWarnings && isBotAdmin) {
                await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
                db.clearWarnings(groupId, sender)
                db.addToBlacklist(sender, 'Excesso de links', 'auto')
              }
            }
            try {
              await sock.sendMessage(groupId, { delete: msg.key })
            } catch {}
            continue
          }
        }

        // Anti-link de grupo
        if (grpSettings.antilinkgp && text && isWhatsAppGroupLink(text) && permLevel < 3) {
          if (grpSettings.advlinkgp) {
            const warns = db.addWarning(groupId, sender, 'Envio de link de grupo')
            await sock.sendMessage(groupId, {
              text: `${mention(sender)} links de grupo nao sao permitidos! Advertencia ${warns}/${grpSettings.maxWarnings}`,
              mentions: [sender]
            })
            if (warns >= grpSettings.maxWarnings && isBotAdmin) {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              db.clearWarnings(groupId, sender)
            }
          }
          try {
            await sock.sendMessage(groupId, { delete: msg.key })
          } catch {}
          continue
        }

        // Anti-palavrao
        if (grpSettings.antipalavra && text && permLevel < 3) {
          const bannedWords = db.getBannedWords(groupId)
          if (containsBadWord(text, bannedWords)) {
            const warns = db.addWarning(groupId, sender, 'Uso de palavra proibida')
            await sock.sendMessage(groupId, {
              text: `${mention(sender)} essa palavra nao e permitida aqui! Advertencia ${warns}/${grpSettings.maxWarnings}`,
              mentions: [sender]
            })
            try {
              await sock.sendMessage(groupId, { delete: msg.key })
            } catch {}
            if (warns >= grpSettings.maxWarnings && isBotAdmin) {
              await sock.groupParticipantsUpdate(groupId, [sender], 'remove')
              db.clearWarnings(groupId, sender)
            }
            continue
          }
        }

        // Anti-midia (imagem, video, audio, doc, sticker, contato, localizacao)
        const antiMediaChecks = [
          { setting: 'antiimg', type: 'imageMessage', label: 'Imagens' },
          { setting: 'antivideo', type: 'videoMessage', label: 'Videos' },
          { setting: 'antiaudio', type: 'audioMessage', label: 'Audios' },
          { setting: 'antidoc', type: 'documentMessage', label: 'Documentos' },
          { setting: 'antisticker', type: 'stickerMessage', label: 'Stickers' },
          { setting: 'anticontato', type: 'contactMessage', label: 'Contatos' },
          { setting: 'antiloc', type: 'locationMessage', label: 'Localizacao' },
        ]

        let blocked = false
        for (const check of antiMediaChecks) {
          if (grpSettings[check.setting] && msg.type === check.type && permLevel < 3) {
            const warns = db.addWarning(groupId, sender, `Envio de ${check.label}`)
            await sock.sendMessage(groupId, {
              text: `${mention(sender)} ${check.label} nao permitido(s)! Adv ${warns}/${grpSettings.maxWarnings}`,
              mentions: [sender]
            })
            try {
              await sock.sendMessage(groupId, { delete: msg.key })
            } catch {}
            blocked = true
            break
          }
        }
        if (blocked) continue

        // Limite de caracteres
        if (grpSettings.limittexto && text && text.length > grpSettings.maxChars && permLevel < 3) {
          await sock.sendMessage(groupId, {
            text: `${mention(sender)} mensagem muito longa! Limite: ${grpSettings.maxChars} caracteres.`,
            mentions: [sender]
          })
          try {
            await sock.sendMessage(groupId, { delete: msg.key })
          } catch {}
          continue
        }

        // Modo so admin
        if (grpSettings.soadm && permLevel < 3) {
          try {
            await sock.sendMessage(groupId, { delete: msg.key })
          } catch {}
          continue
        }

        // X9 view once - revelar mensagem de visualizacao unica
        if (grpSettings.x9viewonce && msg.isViewOnce) {
          try {
            const viewOnceMsg = msg.viewOnceMessage
            if (viewOnceMsg) {
              const mtype = Object.keys(viewOnceMsg)[0]
              if (mtype === 'imageMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
                await sock.sendMessage(groupId, {
                  image: buffer,
                  caption: `${botHeader('X9 VIEW ONCE')}\n${mention(sender)} enviou uma visualizacao unica:${botFooter()}`,
                  mentions: [sender]
                })
              } else if (mtype === 'videoMessage') {
                const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
                await sock.sendMessage(groupId, {
                  video: buffer,
                  caption: `${botHeader('X9 VIEW ONCE')}\n${mention(sender)} enviou uma visualizacao unica:${botFooter()}`,
                  mentions: [sender]
                })
              }
            }
          } catch (e) {
            console.error('[DemiBot] Erro x9 viewonce:', e.message)
          }
        }

        // Auto sticker
        if (grpSettings.autosticker && msg.isMedia && msg.mediaType === 'image') {
          try {
            const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
            await sock.sendMessage(groupId, {
              sticker: buffer,
              mimetype: 'image/webp',
            })
          } catch {}
        }

        // AFK check - se alguem mencionou um usuario AFK
        for (const mentioned of msg.mentionedJid) {
          const memberData = db.getMember(groupId, mentioned)
          if (memberData.isAfk) {
            await sock.sendMessage(groupId, {
              text: `${mention(mentioned)} esta AFK: ${memberData.afkReason || 'Sem motivo'}`,
              mentions: [mentioned]
            })
          }
        }

        // Se o proprio usuario que mandou msg esta AFK, remove o AFK
        const senderMember = db.getMember(groupId, sender)
        if (senderMember.isAfk) {
          db.updateMember(groupId, sender, { isAfk: 0, afkReason: '' })
          await sock.sendMessage(groupId, {
            text: `${mention(sender)} voltou e nao esta mais AFK!`,
            mentions: [sender]
          })
        }

        // ============================================================
        //  PROCESSAMENTO DE COMANDOS
        // ============================================================
        const parsed = matchPrefix(text, groupId)
        if (!parsed.matched) continue

        const { cmd, args, fullArgs } = parsed

        // Verifica se o comando esta bloqueado
        if (db.isCmdBlocked(groupId, cmd)) {
          await sock.sendMessage(groupId, { text: 'Este comando esta bloqueado neste grupo.' })
          continue
        }

        // Cooldown
        const cooldownResult = isOnCooldown(groupId, sender, cmd, grpSettings.cmdCooldown || config.cmdCooldown)
        if (cooldownResult.onCooldown && permLevel < 3) {
          await sock.sendMessage(groupId, {
            text: `Aguarde ${cooldownResult.remaining}s para usar este comando novamente.`
          })
          continue
        }

        // Log de atividade
        db.logActivity(groupId, sender, cmd, fullArgs)

        // Context object para passar aos handlers
        const ctx = {
          sock,
          msg,
          rawMsg,
          cmd,
          args,
          fullArgs,
          groupId,
          sender,
          grpSettings,
          groupMeta,
          isGroupAdmin,
          isBotAdmin,
          permLevel,
          botNumber,
          downloadMediaMessage,
        }

        // ============================================================
        //  ROTEAMENTO DE COMANDOS
        // ============================================================

        // MENUS
        const menuCmds = ['menu', 'menufigurinhas', 'menubrincadeiras', 'menuefeitos',
          'menuadm', 'menugold', 'menumenu', 'menudownload', 'menuinfo', 'menujogos',
          'menugrupo', 'menuanime', 'menulogos', 'menusticker', 'menumarcar',
          'menubaixar', 'menufig', 'menuvip', 'menugame', 'menudono', 'menurpg',
          'configurarbot', 'configurar-bot']
        if (menuCmds.includes(cmd)) {
          const result = handleMenu(cmd, { ...msg, args }, sock)
          await sock.sendMessage(groupId, { text: result })
          continue
        }

        // ADMIN
        const adminCmds = [
          'ban', 'band', 'add', 'advertir', 'adverter', 'checkwarnings', 'ver_adv',
          'removewarnings', 'rm_adv', 'clearwarnings', 'limpar_adv', 'limparavisos',
          'resetavisos', 'advertidos', 'lista_adv', 'mute', 'desmute',
          'promover', 'rebaixar', 'cargo', 'tagall', 'totag', 'hidetag', 'marcar',
          'marcar2', 'marcarwa', 'linkgp', 'nomegp', 'descgp', 'fotogp', 'setfotogp',
          'fechargp', 'colloportus', 'abrirgp', 'alohomora', 'deletar',
          'sorteio', 'banghost', 'banfakes', 'banfake', 'inativos', 'nuke',
          'listanegra', 'listaban', 'listafake', 'tirardalista',
          'listabranca', 'rmlistabranca', 'antilinkwhite',
          'aceitar', 'aceitarmembro', 'anotar', 'anotacao', 'anotacoes', 'rmnota', 'tirar_nota',
          'status', 'atividades', 'atividade',
          'bemvindo', 'bemvindo2', 'fundobemvindo', 'fundosaiu', 'verfundos',
          'antilink', 'advlink', 'antilinkgp', 'advlinkgp',
          'antifake', 'antiflood', 'advflood', 'antipalavra',
          'addpalavra', 'add_palavra', 'delpalavra', 'rm_palavra',
          'listapalavrao', 'limparpalavras',
          'antibots', 'antimarcar', 'antiimg', 'antivideo', 'antiaudio',
          'antidoc', 'antisticker', 'anticatalogo', 'anticontato', 'antiloc',
          'anti_notas', 'antinotas', 'anticallgp',
          'so_adm', 'soadm', 'autobaixar', 'autodl', 'autosticker',
          'x9viewonce', 'x9visuunica', 'x9adm',
          'multiprefixo', 'multiprefix', 'prefixos', 'add_prefixo', 'del_prefixo',
          'legendabv', 'legendasaiu', 'legendabv2', 'legendasaiu2',
          'legenda_estrangeiro', 'legenda_listanegra', 'legenda_imagem',
          'legenda_documento', 'legenda_video', 'setmsgban',
          'limitecaracteres', 'limitec', 'limittexto', 'setlimitec',
          'mensagem-automatica', 'listar-mensagens-automaticas',
          'limpar-mensagens-automaticas', 'mensagens-agendadas', 'limpar-agendadas',
          'fechar-abrirgp', 'tirar-fechar-abrirgp', 'verificar-horario',
          'opengp', 'closegp', 'rm_opengp', 'listar-opengp', 'ativar-opengp',
          'time-status', 'tempocmd', 'cooldowncmd',
          'bloquearcmd', 'desativarcmd', 'liberarcmd', 'restringircmd',
          'verlimites', 'limparlimites', 'listanti',
          'addcmdgold', 'rmcmdgold', 'delcmdgold', 'addcmdpremium', 'tirarcmdpremium', 'cmdpremium',
          'adddono', 'dononogrupo', 'modoparceria', 'add_parceria', 'del_parceria', 'parceria',
          'criartabela', 'remover-tabela', 'tabelagp',
          'zerarrank', 'zerar_duelo', 'resetdamas', 'resetvelha', 'resetlevel',
          'zerar_gold', 'addgold', 'addxp',
          'autoban', 'admautoban', 'limite-msg-auto',
          'setativ', 'setmsg',
          'bcgp', 'bc', 'divmsg',
          'join', 'sairgp', 'exitgp', 'sairdogp',
          'simih', 'simih2', 'modorpg', 'modogamer', 'autoresposta', 'nsfw',
          'regras', 'recrutar', 'grupos',
          'clearcache', 'limpar',
          'permissoes', 'block',
        ]
        if (adminCmds.includes(cmd)) {
          await handleAdmin(ctx)
          continue
        }

        // STICKER
        const stickerCmds = [
          's', 'f', 'sticker', 'figurinha', 'figu',
          'take', 'rgtake', 'rmtake', 'mytake', 'modtake',
          'toimg', 'togif', 'tomp4',
          'ttp', 'ttp2', 'ttp3', 'ttp4', 'ttp5', 'ttp6',
          'attp', 'attp2', 'attp3', 'attp4',
          'rename', 'idfigu',
          'sfundo', 'rbale',
          'qc', 'qc1', 'qc2',
          'emoji', 'emoji-mix',
          'addstickercmd', 'getstickercmd', 'delstickercmd', 'liststickerscmd', 'stickercmdinfo',
          'rgfigu', 'rmfigu', 'listafigu',
          'autofigu',
          'smartsticker',
          'fig', 'figurinhas', 'figanime', 'figroblox', 'figmeme', 'figdesenho',
          'figemoji', 'figraiva', 'figcoreana', 'figengracada', 'funny',
          'packfig', 'packsfigs', 'pesquisarfig',
          'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat',
          'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive',
          'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'happy',
          'wink', 'poke', 'dance', 'cringe',
          'placaloli',
        ]
        if (stickerCmds.includes(cmd)) {
          await handleSticker(ctx)
          continue
        }

        // DOWNLOADS
        const downloadCmds = [
          'play', 'play2', 'play_audio', 'play_video',
          'playvideo', 'playvid2', 'playmp4', 'playdoc',
          'ytmp3', 'ytmp4', 'ytsearch', 'ytbuscar',
          'tiktok', 'tiktok2', 'tiktok_video', 'tiktok_audio',
          'instagram', 'insta2', 'insta_video', 'insta_audio',
          'twitter', 'twitter2', 'twitter_video', 'twitter_audio',
          'facebook', 'face_video', 'face_audio', 'facebook_video', 'facebook_audio',
          'threads_video', 'threads_audio',
          'pinterest', 'pinterest_video',
          'spotify', 'soundcloud', 'deezer',
          'mediafire', 'gitclone',
          'lyrics', 'letra',
          'download-link', 'downloader',
          'tomp3', 'imgpralink', 'videopralink',
          'kwai', 'ifunny', 'statuszap',
          'transcrever', 'shazam',
          'videocontrario', 'videolento', 'videorapido',
          'audiocontrario',
          'gerarlink', 'gerarlink2',
          'audio-menu',
          'legenda_video',
        ]
        if (downloadCmds.includes(cmd)) {
          await handleDownload(ctx)
          continue
        }

        // JOGOS / BRINCADEIRAS
        const gamesCmds = [
          'ppt', 'ppt2', 'akinator', 'damas', 'jogodavelha',
          'iniciar_forca', 'rv-forca', 'rv', 'roleta',
          'fakemsg', 'eujaeununca',
          'porcentagem', 'chance', 'sorte',
          'rankgay', 'rankgado', 'rankcorno', 'rankgostoso', 'rankgostosa',
          'rankkenga', 'rankhetero', 'ranknazista', 'rankgolpe', 'rankotaku', 'rankpau', 'rankbct',
          'gadometro', 'signo',
          'pergunta', 'sn', 'cantadas', 'fatos', 'conselho', 'conselhobiblico',
          'duelo', 'votar_duelo',
          'iniciar_votacao', 'votar', 'terminar_votacao',
          'proxjogo', 'tabelacamp', 'ultimosjogos', 'placares',
          'enviarcachaca', 'resetarcc',
          'casamento', 'casal', 'recusar', 'entrar',
          'matar', 'beijo', 'tapa', 'chute', 'abraco',
          'corno', 'gado', 'gostoso', 'gostosa', 'gay',
          'vesgo', 'bebado', 'feio', 'nazista', 'golpe', 'dogolpe',
          'hetero', 'sigma',
          'imc', 'webcorno', 'ceu', 'inferno',
          'anagrama', 'revelar_anagrama', 'revelar_gartic', 'revelar_enigma',
          'simi', 'bot',
        ]
        if (gamesCmds.includes(cmd)) {
          await handleGames(ctx)
          continue
        }

        // GOLD
        const goldCmds = [
          'gold', 'rankgold', 'doargold', 'minerar_gold', 'roubargold',
          'vingancagold', 'daily',
          'cassino', 'apostargold', 'doublegold', 'jackpotgold',
          'roletadasorte', 'aviatorgold', 'caixamisteriosagold',
          'sequenciagold', 'combinegold', 'quiznumero', 'sorteiogold',
          'emojigold', 'mencgold', 'desmencgold', 'statusemoji',
          'emojiativo', 'emojiatual', 'rankemojigold', 'emojisgoldlista',
          'lojagold', 'ccgold', 'bolaogold',
          'premium', 'serpremium', 'wallpaperprem', 'wallpp',
          'hrppremium', 'rankingjogosgold',
        ]
        if (goldCmds.includes(cmd)) {
          await handleGold(ctx)
          continue
        }

        // EFEITOS
        const effectsCmds = [
          'kiss', 'kissme', 'ship', 'shipme', 'slap', 'spank',
          'triggered', 'delete', 'jail', 'wasted', 'blur',
          'greyscale', 'sepia', 'invert', 'clown', 'batslap',
          'beautiful', 'bobross', 'ad',
          'lixo', 'lgbt', 'morto', 'preso', 'deletem', 'procurado', 'hitler',
          'borrar', 'merda',
          'totext', 'bs64',
          'grave', 'grave2', 'bass', 'bass2', 'bass3',
          'estourar', 'estourar2', 'fast', 'esquilo', 'slow',
          'reverse', 'fat', 'alto', 'deep', 'deep1', 'speedup',
          'audiolento', 'vozmenino',
          // Logos/text effects
          'shadow', 'efeitoneon', 'neon', 'neon1', 'neon2', 'neon3', 'neon3d', 'neongreen', 'neondevil',
          'fire', 'smoke', 'matrix', 'blood', 'lava', 'gelo', '3dgold', 'rainbow',
          'carbon', 'horror', 'berry', 'luxury', 'toxic',
          'plabe', 'metalgold', 'cup', 'txtborboleta', 'harryp',
          'cemiterio', 'lobometal', 'madeira', 'lovemsg', 'lovemsg2', 'lovemsg3',
          'coffecup', 'coffecup2', 'florwooden', 'narutologo', 'romantic',
          'papel', 'angelwing', 'hackneon', 'fpsmascote', 'equipemascote',
          'txtquadrinhos', 'ffavatar', 'mascotegame', 'angelglx',
          'gizquadro', 'wingeffect', 'blackpink', 'girlmascote', 'logogame',
          'fiction', '3dstone', 'areia', 'style', 'pink', 'cattxt',
          'metalfire', 'thunder', 'thunderv2', 'vidro', 'jokerlogo',
          'transformer', 'demonfire', 'jeans', 'metalblue', 'natal',
          'ossos', 'asfalto', 'break', 'glitch2', 'colaq', 'nuvem',
          'neve', 'lapis', 'demongreen', 'halloween',
          'circulo', 'upscale', 'hd', 'crimg',
          'metadinha', 'adolesc',
        ]
        if (effectsCmds.includes(cmd)) {
          await handleEffects(ctx)
          continue
        }

        // INFO
        const infoCmds = [
          'info', 'infobot', 'ping', 'ping2', 'ping3',
          'dono', 'donos', 'infodono', 'criador',
          'idiomas', 'tabela', 'gpinfo', 'grupoinfo', 'grupo',
          'perfil', 'me', 'check',
          'admins', 'infocmd', 'listacmd',
          'infobv', 'info_adverter', 'info_listanegra', 'infocontador',
          'infoclosegp',
          'eco', 'repeat', 'teste',
          'wame', 'tagme',
          'clima', 'traduzir', 'wikipedia', 'dicionario',
          'calculadora', 'calcular', 'moedas',
          'cep', 'ddd', 'encurtalink',
          'gerarcpf', 'vrcpf',
          'celular', 'amazon',
          'gimage', 'buscar', 'pesquisa', 'ler',
          'esportenoticias', 'noticiaesp', 'noticias', 'terra',
          'playstore', 'aptoide', 'aptoide_pesquisa',
          'printsite', 'lastfm',
          'filme', 'serie', 'book',
          'avalie', 'bug', 'sugestao', 'sugestão',
          'convite', 'listavip',
          'npm', 'bingimg', 'criarimg',
          'legenda', 'contar', 'sender',
          'falar', 'gtts',
          'gerarnick', 'nick', 'aniversario',
          'ausente', 'afk', 'ativo', 'listarafk', 'statusafk',
          'apresentar', 'apr', 'digt', 'papof',
          'ptvmsg', 'rvisu',
          'instauser', 'ytstalk', 'tiktok_stalker',
          'gemini', 'gpt',
          'animets',
          'alugar', 'aluguel',
          'ativacoes', 'logos1',
          'listacomunidades',
          'sorte', 'signo',
          'listavip',
        ]
        if (infoCmds.includes(cmd)) {
          await handleInfo(ctx)
          continue
        }

        // GRUPO / RANKINGS
        const groupCmds = [
          'rankativos', 'rankativosg', 'checkativo',
          'rankfigurinhas', 'ultimosativos', 'rankinativo',
          'ranklevel', 'leveltemas',
          'novatos', 'bemvindoaosnovatos',
          'listatm', 'rgtm', 'tirardatm', 'fazertm',
          'emcomum', 'listagp2',
          'statusdamas',
        ]
        if (groupCmds.includes(cmd)) {
          await handleGroup(ctx)
          continue
        }

        // ANIME
        const animeCmds = [
          'animeinfo', 'waifu', 'neko', 'loli', 'megumin',
          'goku', 'nezuko', 'makima', 'kaguya', 'nagatoro',
          'sakura', 'itsuki', 'chizuru', 'hinata', 'akame',
          'yuno', 'daki', 'aqua', 'aizen',
          'komi', 'esdeath', 'muzan', 'gojo', 'shinobu',
          'yuta', 'mitsuri', 'yoruichi', 'rukia', 'fubuki', 'anya',
        ]
        if (animeCmds.includes(cmd)) {
          await handleEffects(ctx) // anime images handled in effects
          continue
        }

      } catch (err) {
        console.error('[DemiBot] Erro ao processar mensagem:', err)
      }
    }
  })

  // ============================================================
  //  EVENTOS DE GRUPO (boas-vindas, saida, etc.)
  // ============================================================
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const grpSettings = db.getGroup(id)
      const groupMeta = await sock.groupMetadata(id)

      for (const participant of participants) {
        if (action === 'add') {
          // Anti-fake
          if (grpSettings.antifake) {
            const num = extractNumber(participant)
            if (!num.startsWith('55')) {
              const botNumber = sock.user?.id?.replace(/:.*/, '') + '@s.whatsapp.net'
              const isBotAdmin = groupMeta.participants.find(p => p.id === botNumber)?.admin != null
              if (isBotAdmin) {
                await sock.groupParticipantsUpdate(id, [participant], 'remove')
                await sock.sendMessage(id, {
                  text: grpSettings.legendaEstrangeiro || 'Numero estrangeiro nao permitido.',
                })
                continue
              }
            }
          }

          // Lista negra
          if (db.isBlacklisted(participant)) {
            const botNumber = sock.user?.id?.replace(/:.*/, '') + '@s.whatsapp.net'
            const isBotAdmin = groupMeta.participants.find(p => p.id === botNumber)?.admin != null
            if (isBotAdmin) {
              await sock.groupParticipantsUpdate(id, [participant], 'remove')
              await sock.sendMessage(id, {
                text: grpSettings.legendaListanegra || 'Usuario na lista negra.',
              })
              continue
            }
          }

          // Registrar membro
          db.getMember(id, participant)
          db.addNewcomer(id, participant)

          // Boas-vindas
          if (grpSettings.welcome) {
            let welcomeMsg = grpSettings.legendaBv || 'Seja bem-vindo(a) ao grupo!'
            welcomeMsg = welcomeMsg
              .replace('{user}', mention(participant))
              .replace('{group}', groupMeta.subject)
              .replace('{desc}', groupMeta.desc || '')

            const welcomeText = `${botHeader('BEM-VINDO(A)!')}\n${welcomeMsg}\n\nDigite *#menu* para ver os comandos disponiveis.${botFooter()}`

            if (grpSettings.welcomeBg) {
              try {
                const bgBuffer = fs.readFileSync(grpSettings.welcomeBg)
                await sock.sendMessage(id, {
                  image: bgBuffer,
                  caption: welcomeText,
                  mentions: [participant]
                })
              } catch {
                await sock.sendMessage(id, { text: welcomeText, mentions: [participant] })
              }
            } else {
              await sock.sendMessage(id, { text: welcomeText, mentions: [participant] })
            }
          }
        }

        if (action === 'remove') {
          // Despedida
          if (grpSettings.welcome) {
            let goodbyeMsg = grpSettings.legendaSaiu || 'Saiu do grupo...'
            goodbyeMsg = goodbyeMsg
              .replace('{user}', mention(participant))
              .replace('{group}', groupMeta.subject)

            const goodbyeText = `${botHeader('SAIU DO GRUPO')}\n${goodbyeMsg}${botFooter()}`

            if (grpSettings.goodbyeBg) {
              try {
                const bgBuffer = fs.readFileSync(grpSettings.goodbyeBg)
                await sock.sendMessage(id, {
                  image: bgBuffer,
                  caption: goodbyeText,
                  mentions: [participant]
                })
              } catch {
                await sock.sendMessage(id, { text: goodbyeText, mentions: [participant] })
              }
            } else {
              await sock.sendMessage(id, { text: goodbyeText, mentions: [participant] })
            }
          }

          // Remove dados do membro
          db.deleteMember(id, participant)
        }

        if (action === 'promote') {
          await sock.sendMessage(id, {
            text: `${botHeader('PROMOVIDO')}\n${mention(participant)} agora e administrador!${botFooter()}`,
            mentions: [participant]
          })
        }

        if (action === 'demote') {
          await sock.sendMessage(id, {
            text: `${botHeader('REBAIXADO')}\n${mention(participant)} nao e mais administrador.${botFooter()}`,
            mentions: [participant]
          })
        }
      }
    } catch (err) {
      console.error('[DemiBot] Erro no evento de grupo:', err)
    }
  })

  return sock
}

// Inicia o bot
startBot().catch(err => {
  console.error('[DemiBot] Erro fatal:', err)
  process.exit(1)
})
