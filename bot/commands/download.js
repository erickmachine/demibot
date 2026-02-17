// ============================================================
//  COMANDOS DE DOWNLOAD
//  Play, YouTube, TikTok, Instagram, Twitter, etc.
// ============================================================
import config from '../config.js'
import * as db from '../lib/database.js'
import { mention, botHeader, botFooter, canExecute } from '../lib/utils.js'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync, exec } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tempDir = path.join(__dirname, '..', 'temp')

// Helper: baixa arquivo de URL para buffer
async function downloadBuffer(url, headers = {}) {
  const resp = await axios.get(url, { responseType: 'arraybuffer', headers, timeout: 60000 })
  return Buffer.from(resp.data)
}

// Helper: busca video/audio com yt-dlp
function ytdlp(url, format = 'bestaudio', extra = '') {
  const output = path.join(tempDir, `dl_${Date.now()}`)
  const ext = format.includes('audio') ? 'mp3' : 'mp4'
  const outFile = `${output}.${ext}`
  const cmd = format.includes('audio')
    ? `yt-dlp -x --audio-format mp3 -o "${output}.%(ext)s" ${extra} "${url}"`
    : `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 -o "${output}.%(ext)s" ${extra} "${url}"`
  try {
    execSync(cmd, { timeout: 120000, stdio: 'pipe' })
    // yt-dlp pode gerar com extensao diferente
    const files = fs.readdirSync(tempDir).filter(f => f.startsWith(path.basename(output)))
    if (files.length > 0) {
      return path.join(tempDir, files[0])
    }
    return outFile
  } catch (e) {
    throw new Error('Falha ao baixar com yt-dlp: ' + e.message?.substring(0, 100))
  }
}

// Helper: busca no YouTube
async function ytSearch(query) {
  try {
    const cmd = `yt-dlp "ytsearch5:${query.replace(/"/g, '\\"')}" --dump-json --flat-playlist --no-download`
    const output = execSync(cmd, { timeout: 30000, maxBuffer: 1024 * 1024 * 10 }).toString()
    const results = output.trim().split('\n').map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean)
    return results.map(r => ({
      title: r.title,
      url: `https://www.youtube.com/watch?v=${r.id}`,
      duration: r.duration_string || r.duration || '?',
      channel: r.channel || r.uploader || '?',
    }))
  } catch {
    return []
  }
}

// Helper: limpa arquivos temp
function cleanTemp(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}
}

export async function handleDownload(ctx) {
  const { sock, msg, rawMsg, cmd, args, fullArgs, groupId, sender,
    grpSettings, permLevel, downloadMediaMessage } = ctx

  const reply = async (text) => sock.sendMessage(groupId, { text })

  switch (cmd) {
    // ================================================================
    //  PLAY (audio do YouTube)
    // ================================================================
    case 'play':
    case 'play2':
    case 'play_audio': {
      if (!fullArgs) return reply('Informe o que deseja buscar. Ex: #play Demi Lovato Sorry Not Sorry')
      await reply('Buscando e baixando audio...')
      try {
        const results = await ytSearch(fullArgs)
        if (results.length === 0) return reply('Nenhum resultado encontrado.')
        const chosen = results[0]
        await reply(`${botHeader('PLAY')}\n*${chosen.title}*\nCanal: ${chosen.channel}\nDuracao: ${chosen.duration}${botFooter()}`)
        const filePath = ytdlp(chosen.url, 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro ao baixar audio: ' + e.message)
      }
      break
    }

    // ================================================================
    //  PLAY VIDEO
    // ================================================================
    case 'play_video':
    case 'playvideo':
    case 'playvid2':
    case 'playmp4': {
      if (!fullArgs) return reply('Informe o que deseja buscar. Ex: #playvideo Demi Lovato')
      await reply('Buscando e baixando video...')
      try {
        const results = await ytSearch(fullArgs)
        if (results.length === 0) return reply('Nenhum resultado encontrado.')
        const chosen = results[0]
        await reply(`${botHeader('PLAY VIDEO')}\n*${chosen.title}*\nCanal: ${chosen.channel}\nDuracao: ${chosen.duration}${botFooter()}`)
        const filePath = ytdlp(chosen.url, 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          video: buffer,
          mimetype: 'video/mp4',
          caption: chosen.title,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro ao baixar video: ' + e.message)
      }
      break
    }

    // ================================================================
    //  PLAY DOC (audio como documento)
    // ================================================================
    case 'playdoc': {
      if (!fullArgs) return reply('Informe o que deseja buscar.')
      await reply('Buscando e baixando como documento...')
      try {
        const results = await ytSearch(fullArgs)
        if (results.length === 0) return reply('Nenhum resultado encontrado.')
        const chosen = results[0]
        const filePath = ytdlp(chosen.url, 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          document: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${chosen.title}.mp3`,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro ao baixar: ' + e.message)
      }
      break
    }

    // ================================================================
    //  YTMP3 / YTMP4 (link direto)
    // ================================================================
    case 'ytmp3': {
      if (!args[0]) return reply('Informe o link do YouTube. Ex: #ytmp3 https://youtu.be/...')
      await reply('Baixando audio...')
      try {
        const filePath = ytdlp(args[0], 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    case 'ytmp4': {
      if (!args[0]) return reply('Informe o link do YouTube. Ex: #ytmp4 https://youtu.be/...')
      await reply('Baixando video...')
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          video: buffer,
          mimetype: 'video/mp4',
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // ================================================================
    //  YTSEARCH / YTBUSCAR
    // ================================================================
    case 'ytsearch':
    case 'ytbuscar': {
      if (!fullArgs) return reply('Informe o que deseja buscar.')
      try {
        const results = await ytSearch(fullArgs)
        if (results.length === 0) return reply('Nenhum resultado encontrado.')
        let text = `${botHeader('RESULTADOS YOUTUBE')}\n`
        results.forEach((r, i) => {
          text += `*${i + 1}.* ${r.title}\n    Canal: ${r.channel}\n    Duracao: ${r.duration}\n    ${r.url}\n\n`
        })
        text += `Use #ytmp3 <link> ou #ytmp4 <link> para baixar.${botFooter()}`
        reply(text)
      } catch (e) {
        reply('Erro na busca: ' + e.message)
      }
      break
    }

    // ================================================================
    //  TIKTOK
    // ================================================================
    case 'tiktok':
    case 'tiktok2':
    case 'tiktok_video': {
      if (!args[0]) return reply('Informe o link do TikTok.')
      await reply('Baixando video do TikTok...')
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          video: buffer,
          mimetype: 'video/mp4',
          caption: 'TikTok Download',
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro ao baixar TikTok: ' + e.message)
      }
      break
    }

    case 'tiktok_audio': {
      if (!args[0]) return reply('Informe o link do TikTok.')
      await reply('Extraindo audio do TikTok...')
      try {
        const filePath = ytdlp(args[0], 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // ================================================================
    //  INSTAGRAM
    // ================================================================
    case 'instagram':
    case 'insta2':
    case 'insta_video': {
      if (!args[0]) return reply('Informe o link do Instagram.')
      await reply('Baixando do Instagram...')
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          video: buffer,
          mimetype: 'video/mp4',
          caption: 'Instagram Download',
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro ao baixar do Instagram: ' + e.message)
      }
      break
    }

    case 'insta_audio': {
      if (!args[0]) return reply('Informe o link do Instagram.')
      await reply('Extraindo audio do Instagram...')
      try {
        const filePath = ytdlp(args[0], 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // ================================================================
    //  TWITTER / X
    // ================================================================
    case 'twitter':
    case 'twitter2':
    case 'twitter_video': {
      if (!args[0]) return reply('Informe o link do Twitter/X.')
      await reply('Baixando do Twitter...')
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          video: buffer,
          mimetype: 'video/mp4',
          caption: 'Twitter Download',
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro ao baixar do Twitter: ' + e.message)
      }
      break
    }

    case 'twitter_audio': {
      if (!args[0]) return reply('Informe o link do Twitter/X.')
      await reply('Extraindo audio...')
      try {
        const filePath = ytdlp(args[0], 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // ================================================================
    //  FACEBOOK
    // ================================================================
    case 'facebook':
    case 'face_video':
    case 'facebook_video': {
      if (!args[0]) return reply('Informe o link do Facebook.')
      await reply('Baixando do Facebook...')
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          video: buffer,
          mimetype: 'video/mp4',
          caption: 'Facebook Download',
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro ao baixar do Facebook: ' + e.message)
      }
      break
    }

    case 'face_audio':
    case 'facebook_audio': {
      if (!args[0]) return reply('Informe o link do Facebook.')
      await reply('Extraindo audio...')
      try {
        const filePath = ytdlp(args[0], 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // ================================================================
    //  THREADS
    // ================================================================
    case 'threads_video': {
      if (!args[0]) return reply('Informe o link do Threads.')
      await reply('Baixando do Threads...')
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, { video: buffer, mimetype: 'video/mp4' }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) { reply('Erro: ' + e.message) }
      break
    }

    case 'threads_audio': {
      if (!args[0]) return reply('Informe o link do Threads.')
      try {
        const filePath = ytdlp(args[0], 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) { reply('Erro: ' + e.message) }
      break
    }

    // ================================================================
    //  PINTEREST
    // ================================================================
    case 'pinterest':
    case 'pinterest_video': {
      if (!fullArgs) return reply('Informe o link ou termo de busca do Pinterest.')
      await reply('Buscando no Pinterest...')
      try {
        if (fullArgs.includes('pinterest.com') || fullArgs.includes('pin.it')) {
          const filePath = ytdlp(fullArgs, 'bestvideo')
          const buffer = fs.readFileSync(filePath)
          await sock.sendMessage(groupId, { video: buffer, mimetype: 'video/mp4' }, { quoted: rawMsg })
          cleanTemp(filePath)
        } else {
          // Busca imagens
          const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(fullArgs + ' site:pinterest.com')}&searchType=image&num=5&key=${config.apis.googleSearch || ''}`
          reply('Para buscar no Pinterest por termo, configure a API de busca Google no config.')
        }
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // ================================================================
    //  SPOTIFY / SOUNDCLOUD / DEEZER
    // ================================================================
    case 'spotify':
    case 'soundcloud':
    case 'deezer': {
      if (!args[0]) return reply(`Informe o link do ${cmd}.`)
      await reply(`Baixando do ${cmd}...`)
      try {
        const filePath = ytdlp(args[0], 'bestaudio')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply(`Erro ao baixar do ${cmd}: ${e.message}`)
      }
      break
    }

    // ================================================================
    //  KWAI / IFUNNY
    // ================================================================
    case 'kwai':
    case 'ifunny': {
      if (!args[0]) return reply(`Informe o link do ${cmd}.`)
      await reply(`Baixando do ${cmd}...`)
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        const buffer = fs.readFileSync(filePath)
        await sock.sendMessage(groupId, { video: buffer, mimetype: 'video/mp4' }, { quoted: rawMsg })
        cleanTemp(filePath)
      } catch (e) {
        reply(`Erro: ${e.message}`)
      }
      break
    }

    // ================================================================
    //  MEDIAFIRE
    // ================================================================
    case 'mediafire': {
      if (!args[0]) return reply('Informe o link do MediaFire.')
      await reply('Baixando do MediaFire...')
      try {
        // Scrape o link direto do MediaFire
        const resp = await axios.get(args[0])
        const match = resp.data.match(/href="(https?:\/\/download[^"]+)"/)
        if (!match) return reply('Nao consegui extrair o link direto.')
        const dlUrl = match[1]
        const fileName = decodeURIComponent(dlUrl.split('/').pop().split('?')[0])
        const buffer = await downloadBuffer(dlUrl)
        await sock.sendMessage(groupId, {
          document: buffer,
          mimetype: 'application/octet-stream',
          fileName,
        }, { quoted: rawMsg })
      } catch (e) {
        reply('Erro ao baixar do MediaFire: ' + e.message)
      }
      break
    }

    // ================================================================
    //  GITCLONE
    // ================================================================
    case 'gitclone': {
      if (!args[0]) return reply('Informe o link do repositorio GitHub.')
      await reply('Clonando repositorio...')
      try {
        const repoUrl = args[0].endsWith('.git') ? args[0] : args[0] + '.git'
        const repoName = repoUrl.split('/').pop().replace('.git', '')
        const zipUrl = args[0].replace('.git', '') + '/archive/refs/heads/main.zip'
        try {
          const buffer = await downloadBuffer(zipUrl)
          await sock.sendMessage(groupId, {
            document: buffer,
            mimetype: 'application/zip',
            fileName: `${repoName}-main.zip`,
          }, { quoted: rawMsg })
        } catch {
          // Tenta branch master
          const zipUrl2 = args[0].replace('.git', '') + '/archive/refs/heads/master.zip'
          const buffer = await downloadBuffer(zipUrl2)
          await sock.sendMessage(groupId, {
            document: buffer,
            mimetype: 'application/zip',
            fileName: `${repoName}-master.zip`,
          }, { quoted: rawMsg })
        }
      } catch (e) {
        reply('Erro ao clonar repositorio: ' + e.message)
      }
      break
    }

    // ================================================================
    //  LYRICS / LETRA
    // ================================================================
    case 'lyrics':
    case 'letra': {
      if (!fullArgs) return reply('Informe o nome da musica. Ex: #letra Demi Lovato Skyscraper')
      await reply('Buscando letra...')
      try {
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(fullArgs.split(' - ')[0] || fullArgs)}/${encodeURIComponent(fullArgs.split(' - ')[1] || fullArgs)}`
        const resp = await axios.get(url, { timeout: 15000 })
        if (resp.data?.lyrics) {
          const lyrics = resp.data.lyrics.substring(0, 4000)
          reply(`${botHeader('LETRA')}\n*${fullArgs}*\n\n${lyrics}${botFooter()}`)
        } else {
          // Tenta busca alternativa
          const url2 = `https://some-random-api.com/lyrics?title=${encodeURIComponent(fullArgs)}`
          const resp2 = await axios.get(url2, { timeout: 15000 })
          if (resp2.data?.lyrics) {
            const lyrics = resp2.data.lyrics.substring(0, 4000)
            reply(`${botHeader('LETRA')}\n*${resp2.data.title || fullArgs}*\n${resp2.data.author || ''}\n\n${lyrics}${botFooter()}`)
          } else {
            reply('Letra nao encontrada.')
          }
        }
      } catch (e) {
        reply('Erro ao buscar letra: ' + e.message)
      }
      break
    }

    // ================================================================
    //  DOWNLOAD LINK GENERICO
    // ================================================================
    case 'download-link':
    case 'downloader': {
      if (!args[0]) return reply('Informe o link para baixar.')
      await reply('Baixando...')
      try {
        const filePath = ytdlp(args[0], 'bestvideo')
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath)
          const ext = path.extname(filePath)
          if (['.mp4', '.webm', '.mkv'].includes(ext)) {
            await sock.sendMessage(groupId, { video: buffer, mimetype: 'video/mp4' }, { quoted: rawMsg })
          } else if (['.mp3', '.m4a', '.ogg'].includes(ext)) {
            await sock.sendMessage(groupId, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
          } else {
            await sock.sendMessage(groupId, {
              document: buffer,
              mimetype: 'application/octet-stream',
              fileName: path.basename(filePath),
            }, { quoted: rawMsg })
          }
          cleanTemp(filePath)
        }
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // ================================================================
    //  TOMP3 (converter video/audio citado para mp3)
    // ================================================================
    case 'tomp3': {
      if (!msg.quoted) return reply('Cite um video ou audio para converter.')
      await reply('Convertendo para MP3...')
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        const inputPath = path.join(tempDir, `input_${Date.now()}`)
        const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`)
        fs.writeFileSync(inputPath, buffer)
        execSync(`ffmpeg -i "${inputPath}" -vn -ar 44100 -ac 2 -ab 192k "${outputPath}" -y`, { timeout: 60000 })
        const mp3Buffer = fs.readFileSync(outputPath)
        await sock.sendMessage(groupId, {
          audio: mp3Buffer,
          mimetype: 'audio/mpeg',
          ptt: false,
        }, { quoted: rawMsg })
        cleanTemp(inputPath)
        cleanTemp(outputPath)
      } catch (e) {
        reply('Erro ao converter: ' + e.message)
      }
      break
    }

    // ================================================================
    //  EFEITOS DE AUDIO COM FFMPEG
    // ================================================================
    case 'audiocontrario':
    case 'videocontrario':
    case 'videolento':
    case 'videorapido': {
      if (!msg.quoted) return reply('Cite um audio/video.')
      await reply(`Aplicando efeito "${cmd}"...`)
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        const inputPath = path.join(tempDir, `fx_in_${Date.now()}`)
        const outputPath = path.join(tempDir, `fx_out_${Date.now()}.mp4`)
        fs.writeFileSync(inputPath, buffer)

        let ffmpegCmd
        switch (cmd) {
          case 'audiocontrario':
            ffmpegCmd = `ffmpeg -i "${inputPath}" -af areverse "${outputPath}" -y`
            break
          case 'videocontrario':
            ffmpegCmd = `ffmpeg -i "${inputPath}" -vf reverse -af areverse "${outputPath}" -y`
            break
          case 'videolento':
            ffmpegCmd = `ffmpeg -i "${inputPath}" -filter:v "setpts=2.0*PTS" -filter:a "atempo=0.5" "${outputPath}" -y`
            break
          case 'videorapido':
            ffmpegCmd = `ffmpeg -i "${inputPath}" -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" "${outputPath}" -y`
            break
        }
        execSync(ffmpegCmd, { timeout: 120000 })
        const outBuffer = fs.readFileSync(outputPath)

        if (cmd === 'audiocontrario') {
          await sock.sendMessage(groupId, { audio: outBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: rawMsg })
        } else {
          await sock.sendMessage(groupId, { video: outBuffer, mimetype: 'video/mp4' }, { quoted: rawMsg })
        }
        cleanTemp(inputPath)
        cleanTemp(outputPath)
      } catch (e) {
        reply('Erro ao aplicar efeito: ' + e.message)
      }
      break
    }

    // ================================================================
    //  SHAZAM (identificar musica)
    // ================================================================
    case 'shazam': {
      if (!msg.quoted) return reply('Cite um audio para identificar a musica.')
      reply('Essa funcao requer a API do Shazam. Configure no config.js para usar.')
      break
    }

    // ================================================================
    //  TRANSCREVER (audio para texto)
    // ================================================================
    case 'transcrever': {
      if (!msg.quoted) return reply('Cite um audio para transcrever.')
      reply('Essa funcao requer uma API de Speech-to-Text. Configure no config.js para usar.')
      break
    }

    // ================================================================
    //  STATUSZAP
    // ================================================================
    case 'statuszap': {
      if (!msg.quoted) return reply('Cite a midia que deseja postar no status.')
      try {
        const buffer = await downloadMediaMessage(rawMsg, 'buffer', {})
        if (msg.quoted?.type === 'imageMessage') {
          await sock.sendMessage('status@broadcast', { image: buffer, caption: fullArgs || '' })
        } else if (msg.quoted?.type === 'videoMessage') {
          await sock.sendMessage('status@broadcast', { video: buffer, caption: fullArgs || '' })
        } else {
          return reply('Tipo de midia nao suportado para status.')
        }
        reply('Postado no status!')
      } catch (e) {
        reply('Erro ao postar status: ' + e.message)
      }
      break
    }

    // ================================================================
    //  GERAR LINK (hospeda imagem/video temp)
    // ================================================================
    case 'gerarlink':
    case 'gerarlink2':
    case 'imgpralink':
    case 'videopralink': {
      reply('Para gerar links publicos de midia, configure uma API de hospedagem (Imgur, Catbox, etc.) no config.js.')
      break
    }

    // ================================================================
    //  AUDIO MENU (lista efeitos de audio)
    // ================================================================
    case 'audio-menu': {
      reply(`${botHeader('MENU DE AUDIO')}\n` +
        `#grave - Audio grave\n` +
        `#grave2 - Audio grave 2\n` +
        `#bass - Audio com bass\n` +
        `#bass2 - Bass pesado\n` +
        `#bass3 - Bass extremo\n` +
        `#estourar - Audio estourado\n` +
        `#estourar2 - Audio estourado 2\n` +
        `#fast - Audio rapido\n` +
        `#esquilo - Voz de esquilo\n` +
        `#slow - Audio lento\n` +
        `#reverse - Audio ao contrario\n` +
        `#fat - Voz grossa\n` +
        `#alto - Volume alto\n` +
        `#deep - Voz profunda\n` +
        `#speedup - Acelerar\n` +
        `#audiolento - Audio lento\n` +
        `#vozmenino - Voz de menino\n` +
        `${botFooter()}`)
      break
    }

    default:
      reply(`Comando de download "${cmd}" em desenvolvimento.`)
  }
}
