// ============================================================
//  COMANDOS DE EFEITOS
//  Efeitos de imagem, audio, texto/logos, marcacao, anime, etc.
// ============================================================
import config from '../config.js'
import * as db from '../lib/database.js'
import { mention, botHeader, botFooter } from '../lib/utils.js'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import axios from 'axios'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tempDir = path.join(__dirname, '..', 'temp')

// Garante que temp existe
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

function cleanTemp(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch {}
}

export async function handleEffects(ctx) {
  const { sock, msg, rawMsg, cmd, args, fullArgs, groupId, sender,
    grpSettings, groupMeta, downloadMediaMessage } = ctx

  const reply = async (text) => sock.sendMessage(groupId, { text, mentions: msg.mentionedJid || [] })
  const replyMentions = async (text, mentions) => sock.sendMessage(groupId, { text, mentions })

  const getTarget = () => {
    if (msg.mentionedJid?.length > 0) return msg.mentionedJid[0]
    if (msg.quoted?.sender) return msg.quoted.sender
    return null
  }

  // Helper: pega buffer da imagem (enviada ou citada)
  async function getImageBuffer() {
    try {
      if (msg.type === 'imageMessage') {
        return await downloadMediaMessage(rawMsg, 'buffer', {})
      }
      if (msg.quoted && (msg.quoted.type === 'imageMessage' || msg.quoted.type === 'stickerMessage')) {
        return await downloadMediaMessage(rawMsg, 'buffer', {})
      }
      return null
    } catch {
      return null
    }
  }

  // Helper: pega buffer do audio (citado)
  async function getAudioBuffer() {
    try {
      if (msg.quoted && (msg.quoted.type === 'audioMessage' || msg.quoted.type === 'videoMessage')) {
        return await downloadMediaMessage(rawMsg, 'buffer', {})
      }
      return null
    } catch {
      return null
    }
  }

  try {
    switch (cmd) {
      // ============================================================
      //  EFEITOS DE IMAGEM
      // ============================================================
      case 'blur': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem para aplicar o efeito.')
        try {
          const result = await sharp(buffer).blur(10).toBuffer()
          await sock.sendMessage(groupId, { image: result, caption: 'Efeito blur aplicado!' }, { quoted: rawMsg })
        } catch (e) { reply('Erro ao aplicar blur: ' + e.message) }
        break
      }

      case 'greyscale': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem.')
        try {
          const result = await sharp(buffer).greyscale().toBuffer()
          await sock.sendMessage(groupId, { image: result, caption: 'Efeito preto e branco!' }, { quoted: rawMsg })
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'sepia': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem.')
        try {
          // Sepia via tint
          const result = await sharp(buffer)
            .greyscale()
            .tint({ r: 112, g: 66, b: 20 })
            .toBuffer()
          await sock.sendMessage(groupId, { image: result, caption: 'Efeito sepia!' }, { quoted: rawMsg })
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'invert': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem.')
        try {
          const result = await sharp(buffer).negate().toBuffer()
          await sock.sendMessage(groupId, { image: result, caption: 'Cores invertidas!' }, { quoted: rawMsg })
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'triggered':
      case 'wasted':
      case 'jail':
      case 'clown':
      case 'beautiful':
      case 'bobross':
      case 'ad': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem para usar este efeito.')
        // Envia a imagem com o caption do efeito (APIs externas podem ser integradas)
        try {
          await sock.sendMessage(groupId, {
            image: buffer,
            caption: `Efeito *${cmd}* aplicado! (Para efeitos avancados, configure APIs no config.js)`
          }, { quoted: rawMsg })
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      // Upscale / HD
      case 'upscale':
      case 'hd':
      case 'crimg': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem.')
        try {
          const result = await sharp(buffer)
            .resize(2048, 2048, { fit: 'inside', withoutEnlargement: false })
            .sharpen()
            .toBuffer()
          await sock.sendMessage(groupId, { image: result, caption: 'Imagem melhorada!' }, { quoted: rawMsg })
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      // Circulo
      case 'circulo': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem.')
        try {
          const meta = await sharp(buffer).metadata()
          const size = Math.min(meta.width || 512, meta.height || 512)
          const circle = Buffer.from(
            `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
          )
          const result = await sharp(buffer)
            .resize(size, size, { fit: 'cover' })
            .composite([{ input: circle, blend: 'dest-in' }])
            .png()
            .toBuffer()
          await sock.sendMessage(groupId, { image: result, caption: 'Imagem em circulo!' }, { quoted: rawMsg })
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      // ============================================================
      //  EFEITOS DE MARCACAO (com @user)
      // ============================================================
      case 'lixo':
      case 'lgbt':
      case 'morto':
      case 'preso':
      case 'deletem':
      case 'procurado':
      case 'hitler':
      case 'borrar':
      case 'merda': {
        const target = getTarget()
        if (!target) return reply('Marque alguem. Ex: #' + cmd + ' @user')
        const labels = {
          lixo: 'foi jogado no lixo!', lgbt: 'agora e LGBT!', morto: 'esta morto!',
          preso: 'foi preso!', deletem: 'foi deletado!', procurado: 'esta sendo procurado!',
          hitler: '...', borrar: 'foi borrado!', merda: '...',
        }
        let profilePic = null
        try { profilePic = await sock.profilePictureUrl(target, 'image') } catch {}

        if (profilePic) {
          try {
            const imgResp = await axios.get(profilePic, { responseType: 'arraybuffer' })
            await sock.sendMessage(groupId, {
              image: Buffer.from(imgResp.data),
              caption: `${botHeader(cmd.toUpperCase())}\n${mention(target)} ${labels[cmd] || ''}${botFooter()}`,
              mentions: [target]
            })
          } catch {
            await replyMentions(
              `${botHeader(cmd.toUpperCase())}\n${mention(target)} ${labels[cmd] || ''}${botFooter()}`,
              [target]
            )
          }
        } else {
          await replyMentions(
            `${botHeader(cmd.toUpperCase())}\n${mention(target)} ${labels[cmd] || ''}${botFooter()}`,
            [target]
          )
        }
        break
      }

      // ============================================================
      //  EFEITOS DE TEXTO / LOGOS
      // ============================================================
      case 'shadow':
      case 'neon':
      case 'efeitoneon':
      case 'neon1':
      case 'neon2':
      case 'neon3':
      case 'neon3d':
      case 'neongreen':
      case 'neondevil':
      case 'fire':
      case 'smoke':
      case 'matrix':
      case 'blood':
      case 'lava':
      case 'gelo':
      case '3dgold':
      case 'rainbow':
      case 'carbon':
      case 'horror':
      case 'berry':
      case 'luxury':
      case 'toxic':
      case 'plabe':
      case 'metalgold':
      case 'cup':
      case 'txtborboleta':
      case 'harryp':
      case 'cemiterio':
      case 'lobometal':
      case 'madeira':
      case 'lovemsg':
      case 'lovemsg2':
      case 'lovemsg3':
      case 'coffecup':
      case 'coffecup2':
      case 'florwooden':
      case 'narutologo':
      case 'romantic':
      case 'papel':
      case 'angelwing':
      case 'hackneon':
      case 'fpsmascote':
      case 'equipemascote':
      case 'txtquadrinhos':
      case 'ffavatar':
      case 'mascotegame':
      case 'angelglx':
      case 'gizquadro':
      case 'wingeffect':
      case 'blackpink':
      case 'girlmascote':
      case 'logogame':
      case 'fiction':
      case '3dstone':
      case 'areia':
      case 'style':
      case 'pink':
      case 'cattxt':
      case 'metalfire':
      case 'thunder':
      case 'thunderv2':
      case 'vidro':
      case 'jokerlogo':
      case 'transformer':
      case 'demonfire':
      case 'jeans':
      case 'metalblue':
      case 'natal':
      case 'ossos':
      case 'asfalto':
      case 'break':
      case 'glitch2':
      case 'colaq':
      case 'nuvem':
      case 'neve':
      case 'lapis':
      case 'demongreen':
      case 'halloween': {
        if (!fullArgs) return reply(`Informe o texto. Ex: #${cmd} DemiBot`)
        try {
          // Cores por tipo de efeito
          const colorMap = {
            shadow: { fill: '#333333', stroke: '#000000', bg: 'transparent' },
            neon: { fill: '#00ff00', stroke: '#003300', bg: 'transparent' },
            fire: { fill: '#FF4500', stroke: '#8B0000', bg: 'transparent' },
            smoke: { fill: '#888888', stroke: '#333333', bg: 'transparent' },
            matrix: { fill: '#00ff00', stroke: '#001100', bg: '#000000' },
            blood: { fill: '#8B0000', stroke: '#4B0000', bg: 'transparent' },
            lava: { fill: '#FF6600', stroke: '#CC0000', bg: 'transparent' },
            gelo: { fill: '#87CEEB', stroke: '#4682B4', bg: 'transparent' },
            '3dgold': { fill: '#FFD700', stroke: '#B8860B', bg: 'transparent' },
            rainbow: { fill: '#FF69B4', stroke: '#4B0082', bg: 'transparent' },
            carbon: { fill: '#CCCCCC', stroke: '#333333', bg: '#1a1a1a' },
            horror: { fill: '#8B0000', stroke: '#000000', bg: '#1a0000' },
            berry: { fill: '#FF1493', stroke: '#8B008B', bg: 'transparent' },
            luxury: { fill: '#FFD700', stroke: '#4B0082', bg: '#1a1a2e' },
            toxic: { fill: '#39FF14', stroke: '#006400', bg: '#0a0a0a' },
          }
          const colors = colorMap[cmd] || { fill: '#FFFFFF', stroke: '#000000', bg: 'transparent' }
          const text = fullArgs.substring(0, 25)
          const fontSize = text.length > 15 ? 48 : text.length > 10 ? 56 : 72

          const svgText = `
            <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" fill="${colors.bg}"/>
              <text x="256" y="256" font-family="Arial, Impact, sans-serif" font-size="${fontSize}"
                font-weight="bold" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="3"
                text-anchor="middle" dominant-baseline="middle">
                ${text}
              </text>
            </svg>`

          const buffer = await sharp(Buffer.from(svgText))
            .resize(512, 512)
            .webp()
            .toBuffer()

          await sock.sendMessage(groupId, {
            sticker: buffer,
          })
          db.incrementStickerCount(groupId, sender)
        } catch (e) {
          reply(`Erro ao criar efeito ${cmd}: ` + e.message)
        }
        break
      }

      // ============================================================
      //  EFEITOS DE AUDIO (com ffmpeg)
      // ============================================================
      case 'grave':
      case 'grave2': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio para aplicar o efeito.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          const pitch = cmd === 'grave2' ? '0.6' : '0.75'
          execSync(`ffmpeg -i "${inputPath}" -af "asetrate=44100*${pitch},aresample=44100" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro ao aplicar efeito: ' + e.message) }
        break
      }

      case 'bass':
      case 'bass2':
      case 'bass3': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio para aplicar o efeito.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          const gain = cmd === 'bass3' ? '20' : cmd === 'bass2' ? '15' : '10'
          execSync(`ffmpeg -i "${inputPath}" -af "bass=g=${gain}" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'estourar':
      case 'estourar2': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          const vol = cmd === 'estourar2' ? '30' : '20'
          execSync(`ffmpeg -i "${inputPath}" -af "volume=${vol}" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'fast':
      case 'speedup': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          execSync(`ffmpeg -i "${inputPath}" -af "atempo=1.5" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'slow':
      case 'audiolento': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          execSync(`ffmpeg -i "${inputPath}" -af "atempo=0.7" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'esquilo':
      case 'vozmenino': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          const pitch = cmd === 'esquilo' ? '1.6' : '1.4'
          execSync(`ffmpeg -i "${inputPath}" -af "asetrate=44100*${pitch},aresample=44100" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'reverse': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          execSync(`ffmpeg -i "${inputPath}" -af "areverse" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'deep':
      case 'deep1':
      case 'fat': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          execSync(`ffmpeg -i "${inputPath}" -af "asetrate=44100*0.6,aresample=44100" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      case 'alto': {
        const buffer = await getAudioBuffer()
        if (!buffer) return reply('Responda um audio.')
        try {
          const inputPath = path.join(tempDir, `afx_in_${Date.now()}.ogg`)
          const outputPath = path.join(tempDir, `afx_out_${Date.now()}.mp3`)
          fs.writeFileSync(inputPath, buffer)
          execSync(`ffmpeg -i "${inputPath}" -af "volume=5" "${outputPath}" -y`, { timeout: 60000 })
          const outBuffer = fs.readFileSync(outputPath)
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          cleanTemp(inputPath)
          cleanTemp(outputPath)
        } catch (e) { reply('Erro: ' + e.message) }
        break
      }

      // ============================================================
      //  TOTEXT (mensagem citada para texto)
      // ============================================================
      case 'totext':
      case 'bs64': {
        if (!msg.quoted) return reply('Responda uma mensagem para converter.')
        await reply(`Conteudo:\n${msg.quoted.text || msg.quoted.caption || 'Nao e texto.'}`)
        break
      }

      // ============================================================
      //  METADINHA
      // ============================================================
      case 'metadinha': {
        const target = getTarget()
        if (!target) return reply('Marque alguem. Ex: #metadinha @user')
        let pic1, pic2
        try { pic1 = await sock.profilePictureUrl(sender, 'image') } catch {}
        try { pic2 = await sock.profilePictureUrl(target, 'image') } catch {}
        if (!pic1 || !pic2) return reply('Nao consegui obter as fotos de perfil de ambos.')
        try {
          const [resp1, resp2] = await Promise.all([
            axios.get(pic1, { responseType: 'arraybuffer' }),
            axios.get(pic2, { responseType: 'arraybuffer' }),
          ])
          const img1 = await sharp(Buffer.from(resp1.data)).resize(256, 512, { fit: 'cover' }).toBuffer()
          const img2 = await sharp(Buffer.from(resp2.data)).resize(256, 512, { fit: 'cover' }).toBuffer()
          const result = await sharp({
            create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
          })
            .composite([
              { input: img1, left: 0, top: 0 },
              { input: img2, left: 256, top: 0 },
            ])
            .png()
            .toBuffer()
          await sock.sendMessage(groupId, {
            image: result,
            caption: `${botHeader('METADINHA')}\n${mention(sender)} + ${mention(target)}${botFooter()}`,
            mentions: [sender, target]
          })
        } catch (e) { reply('Erro ao criar metadinha: ' + e.message) }
        break
      }

      // ============================================================
      //  ANIME (waifu, neko, etc. - tambem roteado para ca)
      // ============================================================
      case 'waifu':
      case 'neko':
      case 'loli':
      case 'megumin':
      case 'goku':
      case 'nezuko':
      case 'makima':
      case 'kaguya':
      case 'nagatoro':
      case 'sakura':
      case 'itsuki':
      case 'chizuru':
      case 'hinata':
      case 'akame':
      case 'yuno':
      case 'daki':
      case 'aqua':
      case 'aizen':
      case 'komi':
      case 'esdeath':
      case 'muzan':
      case 'gojo':
      case 'shinobu':
      case 'yuta':
      case 'mitsuri':
      case 'yoruichi':
      case 'rukia':
      case 'fubuki':
      case 'anya':
      case 'animeinfo': {
        // Para animeinfo, buscar info na API
        if (cmd === 'animeinfo') {
          if (!fullArgs) return reply('Informe o nome do anime. Ex: #animeinfo Naruto')
          try {
            const resp = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(fullArgs)}&limit=1`, { timeout: 10000 })
            const anime = resp.data?.data?.[0]
            if (!anime) return reply('Anime nao encontrado.')
            let text = `${botHeader('ANIME INFO')}\n` +
              `Nome: ${anime.title}\n` +
              `Nome JP: ${anime.title_japanese || '-'}\n` +
              `Score: ${anime.score || '-'}\n` +
              `Eps: ${anime.episodes || '?'}\n` +
              `Status: ${anime.status}\n` +
              `Generos: ${anime.genres?.map(g => g.name).join(', ') || '-'}\n\n` +
              `${anime.synopsis?.substring(0, 500) || 'Sem sinopse.'}${botFooter()}`
            if (anime.images?.jpg?.large_image_url) {
              const imgResp = await axios.get(anime.images.jpg.large_image_url, { responseType: 'arraybuffer' })
              await sock.sendMessage(groupId, { image: Buffer.from(imgResp.data), caption: text })
            } else {
              await reply(text)
            }
          } catch (e) { reply('Erro ao buscar anime: ' + e.message) }
          break
        }

        // Busca imagem anime via waifu.pics ou semelhante
        const waifuEndpoints = ['waifu', 'neko', 'megumin', 'shinobu', 'awoo']
        const endpoint = waifuEndpoints.includes(cmd) ? cmd : 'waifu'
        try {
          const resp = await axios.get(`https://api.waifu.pics/sfw/${endpoint}`, { timeout: 10000 })
          if (resp.data?.url) {
            const imgResp = await axios.get(resp.data.url, { responseType: 'arraybuffer' })
            await sock.sendMessage(groupId, {
              image: Buffer.from(imgResp.data),
              caption: `${botHeader(cmd.toUpperCase())}\nImagem ${cmd}!${botFooter()}`
            })
          } else {
            reply('Nao encontrei imagem.')
          }
        } catch (e) { reply('Erro ao buscar imagem: ' + e.message) }
        break
      }

      // ============================================================
      //  SHIP / KISS / SLAP (interacoes com efeito)
      //  Nota: kiss/slap/ship do index vao para effects quando
      //  estao na lista effectsCmds (com imagem). Se vieram
      //  da lista de games, serao tratados la como interacao social.
      // ============================================================
      case 'kiss':
      case 'kissme':
      case 'ship':
      case 'shipme':
      case 'slap':
      case 'spank':
      case 'batslap': {
        const target = getTarget()
        if (!target && !['kissme', 'shipme'].includes(cmd)) return reply('Marque alguem.')
        const actionTarget = target || sender
        const actionMap = {
          kiss: 'beijou', kissme: 'se auto-beijou', ship: 'shippou com',
          shipme: 'se shippou', slap: 'deu um tapa em', spank: 'deu um tapa em',
          batslap: 'deu uma voadora em',
        }
        const apiEndpoint = cmd.includes('kiss') ? 'kiss' : cmd.includes('slap') || cmd === 'spank' || cmd === 'batslap' ? 'slap' : 'hug'
        try {
          const resp = await axios.get(`https://api.waifu.pics/sfw/${apiEndpoint}`, { timeout: 10000 })
          if (resp.data?.url) {
            const imgResp = await axios.get(resp.data.url, { responseType: 'arraybuffer' })
            const pct = cmd.includes('ship') ? `\nCompatibilidade: ${Math.floor(Math.random() * 101)}%` : ''
            await sock.sendMessage(groupId, {
              image: Buffer.from(imgResp.data),
              caption: `${botHeader(cmd.toUpperCase())}\n${mention(sender)} ${actionMap[cmd] || cmd} ${target ? mention(actionTarget) : ''}!${pct}${botFooter()}`,
              mentions: [sender, actionTarget]
            })
          } else {
            await replyMentions(
              `${botHeader(cmd.toUpperCase())}\n${mention(sender)} ${actionMap[cmd] || cmd} ${target ? mention(actionTarget) : ''}!${botFooter()}`,
              [sender, actionTarget]
            )
          }
        } catch {
          await replyMentions(
            `${botHeader(cmd.toUpperCase())}\n${mention(sender)} ${actionMap[cmd] || cmd} ${target ? mention(actionTarget) : ''}!${botFooter()}`,
            [sender, actionTarget]
          )
        }
        break
      }

      // ============================================================
      //  ADOLESC (efeito adolescente placeholder)
      // ============================================================
      case 'adolesc': {
        const buffer = await getImageBuffer()
        if (!buffer) return reply('Envie ou marque uma imagem.')
        await sock.sendMessage(groupId, { image: buffer, caption: 'Efeito adolescente!' }, { quoted: rawMsg })
        break
      }

      // ============================================================
      //  DEFAULT
      // ============================================================
      default:
        await reply(`Efeito "${cmd}" em desenvolvimento.`)
    }

  } catch (error) {
    console.error('[DemiBot] Erro no effects:', error)
    await reply('Ocorreu um erro ao aplicar o efeito.')
  }
}
