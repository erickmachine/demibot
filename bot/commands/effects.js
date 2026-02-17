import fs from 'fs'
import path from 'path'

export async function handleEffects(ctx) {
  const {
    sock,
    msg,
    rawMsg,
    cmd,
    args,
    fullArgs,
    groupId,
    sender,
    downloadMediaMessage
  } = ctx

  try {

    // =====================================================
    // FUNÇÃO AUXILIAR PARA PEGAR IMAGEM
    // =====================================================
    async function getImageBuffer() {
      if (msg.quoted && msg.quoted.type === 'imageMessage') {
        return await downloadMediaMessage(msg.quoted, 'buffer', {})
      }

      if (msg.type === 'imageMessage') {
        return await downloadMediaMessage(rawMsg, 'buffer', {})
      }

      return null
    }

    // =====================================================
    // SWITCH DE COMANDOS
    // =====================================================
    switch (cmd) {

      // ==========================================
      // EFEITOS QUE PRECISAM DE IMAGEM
      // ==========================================

      case 'blur':
      case 'wasted':
      case 'jail':
      case 'greyscale':
      case 'invert':
      case 'triggered': {

        const buffer = await getImageBuffer()

        if (!buffer) {
          return await sock.sendMessage(groupId, {
            text: '❌ Envie ou responda uma imagem para usar este efeito.'
          })
        }

        // Aqui você pode integrar API real depois
        // Por enquanto retorna a própria imagem simulando efeito

        await sock.sendMessage(groupId, {
          image: buffer,
          caption: `✨ Efeito *${cmd}* aplicado com sucesso!`
        })

        break
      }

      // ==========================================
      // EFEITOS DE TEXTO
      // ==========================================

      case 'shadow':
      case 'neon':
      case 'fire':
      case 'matrix':
      case 'blood':
      case 'lava':
      case 'gelo':
      case 'rainbow': {

        if (!fullArgs) {
          return await sock.sendMessage(groupId, {
            text: '❌ Digite um texto para gerar o efeito.\nExemplo: !neon DemiBot'
          })
        }

        // Placeholder até integrar API
        await sock.sendMessage(groupId, {
          text: `🔥 Logo efeito *${cmd}* gerado para:\n\n"${fullArgs}"`
        })

        break
      }

      // ==========================================
      // EFEITOS DE ÁUDIO
      // ==========================================

      case 'grave':
      case 'bass':
      case 'slow':
      case 'reverse':
      case 'fast':
      case 'deep': {

        if (!msg.quoted || msg.quoted.type !== 'audioMessage') {
          return await sock.sendMessage(groupId, {
            text: '❌ Responda um áudio para aplicar o efeito.'
          })
        }

        const audioBuffer = await downloadMediaMessage(msg.quoted, 'buffer', {})

        // Placeholder (aqui depois você usa ffmpeg)
        await sock.sendMessage(groupId, {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          ptt: false
        })

        break
      }

      // ==========================================
      // COMANDOS DE TESTE / DEBUG
      // ==========================================

      case 'totext': {
        if (!msg.quoted) {
          return await sock.sendMessage(groupId, {
            text: '❌ Responda uma mensagem para converter.'
          })
        }

        await sock.sendMessage(groupId, {
          text: `📝 Conteúdo:\n${msg.quoted.text || 'Não é texto.'}`
        })

        break
      }

      // ==========================================
      // DEFAULT
      // ==========================================

      default:
        await sock.sendMessage(groupId, {
          text: '❌ Efeito não reconhecido.'
        })
    }

  } catch (error) {
    console.error('[DemiBot] Erro no effects:', error)

    await sock.sendMessage(groupId, {
      text: '❌ Ocorreu um erro ao aplicar o efeito.'
    })
  }
            }
