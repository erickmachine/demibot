import os from 'os'

export async function handleInfo(ctx) {
  const {
    sock,
    groupId,
    sender,
    pushName,
    isGroup,
    prefix = '!',
    owner = 'Não definido'
  } = ctx

  try {
    // ⏱️ Uptime
    const uptimeSeconds = process.uptime()
    const hours = Math.floor(uptimeSeconds / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    const seconds = Math.floor(uptimeSeconds % 60)

    // 💾 Memória
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)

    // 🖥️ CPU
    const cpuModel = os.cpus()[0].model
    const cpuCores = os.cpus().length

    // 👥 Info do grupo
    let groupInfoText = ''
    if (isGroup) {
      const metadata = await sock.groupMetadata(groupId)
      groupInfoText = `
👥 *Grupo:* ${metadata.subject}
👤 *Participantes:* ${metadata.participants.length}
`
    }

    const message = `
🤖 *INFORMAÇÕES DO BOT*

👤 *Usuário:* ${pushName || 'Desconhecido'}
🆔 *ID:* ${sender}

${groupInfoText}

⚙️ *Sistema*
🖥️ CPU: ${cpuModel}
🧠 Núcleos: ${cpuCores}
💾 RAM Total: ${totalMem} GB
📉 RAM Livre: ${freeMem} GB

⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s

👑 *Dono:* ${owner}
🔑 *Prefixo:* ${prefix}

📜 *Comandos Disponíveis:*
${prefix}play
${prefix}audio
${prefix}fig
${prefix}info
${prefix}menu
${prefix}ping
${prefix}ytmp3
${prefix}ytmp4

🔥 Bot online e funcionando!
`

    await sock.sendMessage(groupId, { text: message })

  } catch (error) {
    console.error('Erro no comando info:', error)
    await sock.sendMessage(groupId, {
      text: '❌ Erro ao obter informações.'
    })
  }
}
