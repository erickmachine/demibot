const os = require("os");
const moment = require("moment");

module.exports = {
    name: "info",
    description: "Menu de informações",
    commands: [
        "info",
        "ping",
        "dono",
        "idiomas",
        "tabela",
        "tabelagp",
        "gpinfo",
        "perfil",
        "me",
        "check",
        "admins",
        "infocmd",
        "configurar-bot"
    ],

    execute: async ({ sock, msg, args, command, from, sender, isGroup, groupMetadata }) => {

        switch (command) {

            case "info":
                return sock.sendMessage(from, {
                    text: `
━━━━━━━━━━━━━━━
👻 *𝐃𝐞𝐦𝐢𝐁𝐨𝐭* 👻

*MENU INFORMACOES*
━━━━━━━━━━━━━━━

┃ ⎨⎟⟐⃟➪  #info - Info do bot
┃ ⎨⎟⟐⃟➪  #ping - Velocidade do bot
┃ ⎨⎟⟐⃟➪  #dono - Info da dona
┃ ⎨⎟⟐⃟➪  #idiomas - Idiomas disponiveis
┃ ⎨⎟⟐⃟➪  #tabela - Tabela do grupo
┃ ⎨⎟⟐⃟➪  #tabelagp - Info do grupo
┃ ⎨⎟⟐⃟➪  #gpinfo - Info completa grupo
┃ ⎨⎟⟐⃟➪  #perfil - Seu perfil
┃ ⎨⎟⟐⃟➪  #me - Suas estatisticas
┃ ⎨⎟⟐⃟➪  #check @user - Info do membro
┃ ⎨⎟⟐⃟➪  #admins - Lista de admins
┃ ⎨⎟⟐⃟➪  #infocmd <cmd> - Info do comando
┃ ⎨⎟⟐⃟➪  #configurar-bot - Como configurar

╰━━─ ≪ •❈• ≫ ─━━╯
`
                });

            case "ping":
                const start = Date.now();
                const end = Date.now();
                return sock.sendMessage(from, {
                    text: `🏓 Pong!\nVelocidade: ${end - start}ms`
                });

            case "dono":
                return sock.sendMessage(from, {
                    text: `👑 Dono do bot:\n@${process.env.OWNER_NUMBER || "559299652961"}`,
                    mentions: [`${process.env.OWNER_NUMBER || "559299652961"}@s.whatsapp.net`]
                });

            case "idiomas":
                return sock.sendMessage(from, {
                    text: `🌎 Idiomas disponíveis:\n• Português\n• English (em breve)`
                });

            case "tabela":
            case "tabelagp":
                if (!isGroup) return sock.sendMessage(from, { text: "❌ Comando apenas para grupos." });
                return sock.sendMessage(from, {
                    text: `📋 Tabela do grupo:\nTotal membros: ${groupMetadata.participants.length}`
                });

            case "gpinfo":
                if (!isGroup) return sock.sendMessage(from, { text: "❌ Comando apenas para grupos." });

                return sock.sendMessage(from, {
                    text: `
📌 *Informações do Grupo*

Nome: ${groupMetadata.subject}
Membros: ${groupMetadata.participants.length}
Criado em: ${moment(groupMetadata.creation * 1000).format("DD/MM/YYYY")}
`
                });

            case "perfil":
            case "me":
                return sock.sendMessage(from, {
                    text: `
👤 *Seu Perfil*

Número: ${sender.split("@")[0]}
Sistema: ${os.platform()}
Hora: ${moment().format("HH:mm:ss")}
`
                });

            case "check":
                if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid)
                    return sock.sendMessage(from, { text: "❌ Marque um usuário." });

                const user = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

                return sock.sendMessage(from, {
                    text: `🔎 Informações de @${user.split("@")[0]}`,
                    mentions: [user]
                });

            case "admins":
                if (!isGroup) return sock.sendMessage(from, { text: "❌ Apenas em grupo." });

                const admins = groupMetadata.participants
                    .filter(p => p.admin)
                    .map(p => `@${p.id.split("@")[0]}`);

                return sock.sendMessage(from, {
                    text: `👮 *Admins do Grupo:*\n\n${admins.join("\n")}`,
                    mentions: groupMetadata.participants
                        .filter(p => p.admin)
                        .map(p => p.id)
                });

            case "infocmd":
                if (!args[0])
                    return sock.sendMessage(from, { text: "❌ Use: #infocmd nomeDoComando" });

                return sock.sendMessage(from, {
                    text: `ℹ️ Informações do comando: ${args[0]}\nDescrição não configurada.`
                });

            case "configurar-bot":
                return sock.sendMessage(from, {
                    text: `
⚙️ *Como configurar o bot*

1. Edite o arquivo config.js
2. Defina OWNER_NUMBER
3. Reinicie com: pm2 restart demibot
`
                });

        }
    }
};
