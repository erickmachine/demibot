// ============================================================
//  COMANDOS DE FIGURINHAS / STICKERS
// ============================================================
import config from '../config.js'
import * as db from '../lib/database.js'
import { mention, botHeader, botFooter, canExecute } from '../lib/utils.js'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tempDir = path.join(__dirname, '..', 'temp')

export async function handleSticker(ctx) {
  const { sock, msg, rawMsg, cmd, args, fullArgs, groupId, sender,
    grpSettings, permLevel, downloadMediaMessage } = ctx

  const reply = async (text) => sock.sendMessage(groupId, { text })

  switch (cmd) {
    // === CRIAR FIGURINHA ===
    case 's':
    case 'f':
    case 'sticker':
    case 'figurinha':
    case 'figu': {
      if (!msg.isMedia && !msg.quoted) {
        return reply('Envie ou marque uma imagem/video/GIF com o comando #s')
      }
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        if (!buffer) return reply('Nao consegui baixar a midia.')

        const mediaType = msg.mediaType || msg.quoted?.type?.replace('Message', '')

        if (mediaType === 'image' || msg.type === 'imageMessage' ||
            msg.quoted?.type === 'imageMessage') {
          const webpBuffer = await sharp(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 80 })
            .toBuffer()

          await sock.sendMessage(groupId, {
            sticker: webpBuffer,
          }, { quoted: rawMsg })

          db.incrementStickerCount(groupId, sender)
        } else if (mediaType === 'video' || msg.type === 'videoMessage' ||
                   msg.quoted?.type === 'videoMessage') {
          // Para videos/GIFs, envia diretamente como sticker animado
          await sock.sendMessage(groupId, {
            sticker: buffer,
          }, { quoted: rawMsg })
          db.incrementStickerCount(groupId, sender)
        } else {
          reply('Tipo de midia nao suportado. Envie imagem, video ou GIF.')
        }
      } catch (e) {
        reply('Erro ao criar figurinha: ' + e.message)
      }
      break
    }

    // === TAKE (roubar figurinha com novo nome) ===
    case 'take': {
      if (!msg.quoted || msg.quoted.type !== 'stickerMessage') {
        return reply('Marque uma figurinha para roubar.')
      }
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        const packName = args[0] || config.botName
        const author = args[1] || config.ownerName
        await sock.sendMessage(groupId, {
          sticker: buffer,
          packname: packName,
          author: author,
        })
      } catch (e) {
        reply('Erro ao roubar figurinha: ' + e.message)
      }
      break
    }

    // === RGTAKE / RMTAKE / MYTAKE ===
    case 'rgtake': {
      if (args.length < 2) return reply('Use: #rgtake <pack> <autor>')
      db.updateMember(groupId, sender, { nick: `${args[0]}|${args[1]}` })
      reply(`Take registrado! Pack: ${args[0]} | Autor: ${args[1]}`)
      break
    }
    case 'rmtake': {
      db.updateMember(groupId, sender, { nick: '' })
      reply('Take removido.')
      break
    }
    case 'mytake': {
      const member = db.getMember(groupId, sender)
      const take = member.nick?.split('|')
      if (!take || take.length < 2) return reply('Voce nao tem take registrado. Use #rgtake')
      reply(`Seu take: Pack: ${take[0]} | Autor: ${take[1]}`)
      break
    }

    // === TOIMG (figurinha para imagem) ===
    case 'toimg': {
      if (!msg.quoted || msg.quoted.type !== 'stickerMessage') {
        return reply('Marque uma figurinha.')
      }
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        const pngBuffer = await sharp(buffer).png().toBuffer()
        await sock.sendMessage(groupId, { image: pngBuffer }, { quoted: rawMsg })
      } catch (e) {
        reply('Erro ao converter: ' + e.message)
      }
      break
    }

    // === TOGIF / TOMP4 ===
    case 'togif':
    case 'tomp4': {
      if (!msg.quoted || msg.quoted.type !== 'stickerMessage') {
        return reply('Marque uma figurinha animada.')
      }
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        await sock.sendMessage(groupId, {
          video: buffer,
          mimetype: 'video/mp4',
          gifPlayback: cmd === 'togif',
        }, { quoted: rawMsg })
      } catch (e) {
        reply('Erro ao converter: ' + e.message)
      }
      break
    }

    // === TTP (texto para figurinha) ===
    case 'ttp':
    case 'ttp2':
    case 'ttp3':
    case 'ttp4':
    case 'ttp5':
    case 'ttp6': {
      if (!fullArgs) return reply('Informe o texto. Ex: #ttp Ola Mundo')
      try {
        const colors = {
          ttp: '#FFFFFF', ttp2: '#FF6B6B', ttp3: '#4ECDC4',
          ttp4: '#FFE66D', ttp5: '#A855F7', ttp6: '#22D3EE',
        }
        const strokeColors = {
          ttp: '#000000', ttp2: '#8B0000', ttp3: '#006B5A',
          ttp4: '#8B6914', ttp5: '#581C87', ttp6: '#0E7490',
        }
        const color = colors[cmd] || '#FFFFFF'
        const stroke = strokeColors[cmd] || '#000000'

        const svgText = `
          <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" fill="transparent"/>
            <text x="256" y="256" font-family="Arial, sans-serif" font-size="72"
              font-weight="bold" fill="${color}" stroke="${stroke}" stroke-width="3"
              text-anchor="middle" dominant-baseline="middle">
              ${fullArgs.length > 20 ? fullArgs.substring(0, 20) : fullArgs}
            </text>
          </svg>`

        const buffer = await sharp(Buffer.from(svgText))
          .resize(512, 512)
          .webp()
          .toBuffer()

        await sock.sendMessage(groupId, { sticker: buffer })
        db.incrementStickerCount(groupId, sender)
      } catch (e) {
        reply('Erro ao criar TTP: ' + e.message)
      }
      break
    }

    // === ATTP (texto animado para figurinha) ===
    case 'attp':
    case 'attp2':
    case 'attp3':
    case 'attp4': {
      if (!fullArgs) return reply('Informe o texto. Ex: #attp Ola')
      try {
        // Cria figurinha de texto simples (animacao requer mais libs)
        const svgText = `
          <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FF6B6B"/>
                <stop offset="50%" style="stop-color:#4ECDC4"/>
                <stop offset="100%" style="stop-color:#FFE66D"/>
              </linearGradient>
            </defs>
            <rect width="512" height="512" fill="transparent"/>
            <text x="256" y="256" font-family="Arial, sans-serif" font-size="64"
              font-weight="bold" fill="url(#grad)" stroke="#000" stroke-width="2"
              text-anchor="middle" dominant-baseline="middle">
              ${fullArgs.substring(0, 25)}
            </text>
          </svg>`

        const buffer = await sharp(Buffer.from(svgText))
          .resize(512, 512)
          .webp()
          .toBuffer()

        await sock.sendMessage(groupId, { sticker: buffer })
        db.incrementStickerCount(groupId, sender)
      } catch (e) {
        reply('Erro ao criar ATTP: ' + e.message)
      }
      break
    }

    // === RENAME ===
    case 'rename': {
      if (!msg.quoted || msg.quoted.type !== 'stickerMessage') {
        return reply('Marque uma figurinha. Use: #rename pack/autor')
      }
      const parts = fullArgs?.split('/') || []
      const packName = parts[0]?.trim() || config.botName
      const author = parts[1]?.trim() || config.ownerName
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        await sock.sendMessage(groupId, {
          sticker: buffer,
          packname: packName,
          author: author,
        })
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // === SFUNDO (remover fundo) ===
    case 'sfundo': {
      if (!msg.isMedia && !msg.quoted) return reply('Envie ou marque uma imagem.')
      if (!config.apis.removeBg) return reply('API de remocao de fundo nao configurada.')
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        const formData = new FormData()
        formData.append('image_file', new Blob([buffer]), 'image.png')
        formData.append('size', 'auto')

        const response = await axios({
          method: 'post',
          url: 'https://api.remove.bg/v1.0/removebg',
          data: formData,
          headers: { 'X-Api-Key': config.apis.removeBg },
          responseType: 'arraybuffer',
        })

        const webpBuffer = await sharp(Buffer.from(response.data))
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp()
          .toBuffer()

        await sock.sendMessage(groupId, { sticker: webpBuffer })
        db.incrementStickerCount(groupId, sender)
      } catch (e) {
        reply('Erro ao remover fundo: ' + e.message)
      }
      break
    }

    // === EMOJI para figurinha ===
    case 'emoji': {
      if (!args[0]) return reply('Informe o emoji. Ex: #emoji 😎')
      try {
        const emojiUrl = `https://emojicdn.elk.sh/${encodeURIComponent(args[0])}?style=apple`
        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' })
        const webpBuffer = await sharp(Buffer.from(response.data))
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp()
          .toBuffer()
        await sock.sendMessage(groupId, { sticker: webpBuffer })
        db.incrementStickerCount(groupId, sender)
      } catch (e) {
        reply('Erro ao criar figurinha de emoji: ' + e.message)
      }
      break
    }

    // === EMOJI MIX ===
    case 'emoji-mix': {
      if (args.length < 2) return reply('Use: #emoji-mix 😎 🔥')
      try {
        const url = `https://tenor.googleapis.com/v2/featured?q=${encodeURIComponent(args[0] + args[1])}&client_key=emoji_kitchen&collection=emoji_kitchen_v6`
        const response = await axios.get(url)
        if (response.data?.results?.[0]?.media_formats?.png?.url) {
          const imgResp = await axios.get(response.data.results[0].media_formats.png.url, { responseType: 'arraybuffer' })
          const webpBuffer = await sharp(Buffer.from(imgResp.data))
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp()
            .toBuffer()
          await sock.sendMessage(groupId, { sticker: webpBuffer })
          db.incrementStickerCount(groupId, sender)
        } else {
          reply('Nao encontrei combinacao para esses emojis.')
        }
      } catch (e) {
        reply('Erro ao misturar emojis: ' + e.message)
      }
      break
    }

    // === QC (Quote Chat - mensagem como sticker) ===
    case 'qc':
    case 'qc1':
    case 'qc2': {
      if (!fullArgs) return reply('Informe o texto. Ex: #qc Ola Mundo')
      try {
        const svgText = `
          <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="80" width="472" height="352" rx="30" fill="#075E54"/>
            <polygon points="40,400 20,450 80,400" fill="#075E54"/>
            <text x="256" y="200" font-family="Arial" font-size="18" fill="#AAAAAA"
              text-anchor="middle">${msg.pushName || 'User'}</text>
            <text x="256" y="270" font-family="Arial" font-size="36" fill="white"
              text-anchor="middle" dominant-baseline="middle">
              ${fullArgs.substring(0, 30)}
            </text>
          </svg>`
        const buffer = await sharp(Buffer.from(svgText)).resize(512, 512).webp().toBuffer()
        await sock.sendMessage(groupId, { sticker: buffer })
        db.incrementStickerCount(groupId, sender)
      } catch (e) {
        reply('Erro ao criar QC: ' + e.message)
      }
      break
    }

    // === ADDSTICKERCMD / GETSTICKERCMD / DELSTICKERCMD ===
    case 'addstickercmd': {
      if (!canExecute(groupId, sender, ctx.isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!args[0]) return reply('Informe o nome do comando. Marque uma figurinha.')
      if (!msg.quoted || msg.quoted.type !== 'stickerMessage') return reply('Marque uma figurinha.')
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        db.addStickerCmd(groupId, args[0].toLowerCase(), buffer.toString('base64'), sender)
        reply(`Figurinha salva como comando: #${args[0]}`)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }
    case 'getstickercmd': {
      if (!args[0]) return reply('Informe o nome. Ex: #getstickercmd nome')
      const stickerCmd = db.getStickerCmd(groupId, args[0].toLowerCase())
      if (!stickerCmd) return reply('Comando de figurinha nao encontrado.')
      try {
        const buffer = Buffer.from(stickerCmd.stickerData, 'base64')
        await sock.sendMessage(groupId, { sticker: buffer })
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }
    case 'delstickercmd': {
      if (!canExecute(groupId, sender, ctx.isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!args[0]) return reply('Informe o nome.')
      db.removeStickerCmd(groupId, args[0].toLowerCase())
      reply(`Comando de figurinha "${args[0]}" removido.`)
      break
    }
    case 'liststickerscmd':
    case 'listafigu': {
      const cmds = db.listStickerCmds(groupId)
      if (cmds.length === 0) return reply('Nenhum comando de figurinha salvo.')
      let text = `${botHeader('FIGURINHAS SALVAS')}\n`
      cmds.forEach((c, i) => { text += `${i + 1}. #${c.cmdName}\n` })
      text += botFooter()
      reply(text)
      break
    }

    // === AUTOFIGU ===
    case 'autofigu': {
      if (!canExecute(groupId, sender, ctx.isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'autosticker')
      reply(`Auto figurinha ${v ? 'ativada' : 'desativada'}.`)
      break
    }

    // === FIGURINHAS ALEATORIAS ===
    case 'fig':
    case 'figurinhas':
    case 'figanime':
    case 'figroblox':
    case 'figmeme':
    case 'figdesenho':
    case 'figemoji':
    case 'figraiva':
    case 'figcoreana':
    case 'figengracada':
    case 'funny': {
      const themes = {
        fig: 'random sticker', figurinhas: 'sticker pack',
        figanime: 'anime', figroblox: 'roblox',
        figmeme: 'meme', figdesenho: 'cartoon',
        figemoji: 'emoji', figraiva: 'angry',
        figcoreana: 'korean cute', figengracada: 'funny',
        funny: 'funny meme',
      }
      const query = themes[cmd] || 'sticker'
      try {
        const url = `https://api.tenor.com/v1/random?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=1&media_filter=minimal`
        const response = await axios.get(url)
        if (response.data?.results?.[0]?.media?.[0]?.gif?.url) {
          const gifUrl = response.data.results[0].media[0].gif.url
          const gifResp = await axios.get(gifUrl, { responseType: 'arraybuffer' })
          const webpBuffer = await sharp(Buffer.from(gifResp.data), { animated: true })
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp()
            .toBuffer()
          await sock.sendMessage(groupId, { sticker: webpBuffer })
          db.incrementStickerCount(groupId, sender)
        } else {
          reply('Nao encontrei figurinha. Tente novamente.')
        }
      } catch (e) {
        reply('Erro ao buscar figurinha: ' + e.message)
      }
      break
    }

    // === ANIME REACTIONS ===
    case 'bully': case 'cuddle': case 'cry': case 'hug': case 'awoo':
    case 'kiss': case 'lick': case 'pat': case 'smug': case 'bonk':
    case 'yeet': case 'blush': case 'smile': case 'wave': case 'highfive':
    case 'handhold': case 'nom': case 'bite': case 'glomp': case 'slap':
    case 'kill': case 'happy': case 'wink': case 'poke': case 'dance':
    case 'cringe': {
      try {
        const response = await axios.get(`https://api.waifu.pics/sfw/${cmd}`)
        if (response.data?.url) {
          const imgResp = await axios.get(response.data.url, { responseType: 'arraybuffer' })
          const webpBuffer = await sharp(Buffer.from(imgResp.data))
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp()
            .toBuffer()
          await sock.sendMessage(groupId, { sticker: webpBuffer })
          db.incrementStickerCount(groupId, sender)
        }
      } catch (e) {
        reply('Erro ao buscar reacao: ' + e.message)
      }
      break
    }

    // === SMART STICKER ===
    case 'smartsticker': {
      if (!fullArgs) return reply('Descreva a figurinha. Ex: #smartsticker gato sorrindo')
      reply('Gerando figurinha inteligente... (requer API de IA configurada)')
      break
    }

    default:
      reply(`Comando de figurinha "${cmd}" em desenvolvimento.`)
  }
}
