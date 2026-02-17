import os from "os";

const info = {
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

    async execute({ sock, msg, args, command, from, sender, isGroup, groupMetadata }) {

        switch (command) {

            case "info":
                return sock.sendMessage(from, {
                    text: `
━━━━━━━━━━━━━━━
👻 *𝐃𝐞𝐦𝐢𝐁𝐨𝐭* 👻
━━━━━━━━━━━━━━━

#info
#ping
#dono
#idiomas
#tabela
#tabelagp
#gpinfo
#perfil
#me
#check @user
#admins
#infocmd comando
#configurar-bot
`
                });

            case "ping": {
                const start = Date.now();
                const end = Date.now();
                return sock.sendMessage(from, {
                    text: `🏓 Pong!\nVelocidade: ${end - start}ms`
                });
            }

            case "dono": {
                const owner = process.env.OWNER_NUMBER || "559299652961";
                return sock.sendMessage(from, {
                    text: `👑 Dono do bot:\n@${owner}`,
                    mentions: [`${owner}@s.whatsapp.net`]
                });
            }

            case "idiomas":
                return sock.sendMessage(from, {
                    text: "🌎 Idiomas disponíveis:\n• Português\n• English (em breve)"
                });

            case "tabela":
            case "tabelagp":
                if (!isGroup)
                    return sock.sendMessage(from, { text: "❌ Apenas em grupo." });

                return sock.sendMessage(from, {
                    text: `📋 Total de membros: ${groupMetadata.participants.length}`
                });

            case "gpinfo":
                if (!isGroup)
                    return sock.sendMessage(from, { text: "❌ Apenas em grupo." });

                return sock.sendMessage(from, {
                    text: `
📌 Grupo: ${groupMetadata.subject}
👥 Membros: ${groupMetadata.participants.length}
`
                });

            case "perfil":
            case "me":
                return sock.sendMessage(from, {
                    text: `
👤 Número: ${sender?.split("@")[0]}
💻 Sistema: ${os.platform()}
🕒 Hora: ${new Date().toLocaleTimeString()}
`
                });

            case "check":
                if (!msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid)
                    return sock.sendMessage(from, { text: "❌ Marque um usuário." });

                const user = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

                return sock.sendMessage(from, {
                    text: `🔎 Informações de @${user.split("@")[0]}`,
                    mentions: [user]
                });

            case "admins":
                if (!isGroup)
                    return sock.sendMessage(from, { text: "❌ Apenas em grupo." });

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

            default:
                return;
        }
    }
};

export default info;                if (!isGroup)
                    return sock.sendMessage(from, { text: "❌ Apenas em grupo." });

                const admins = groupMetadata.participants
                    .filter(p => p.admin)
                    .map(p => `@${p.id.split("@")[0]}`);

                return sock.sendMessage(from, {
                    text: `👮 Admins:\n\n${admins.join("\n")}`,
                    mentions: groupMetadata.participants
                        .filter(p => p.admin)
                        .map(p => p.id)
                });

            case "infocmd":
                if (!args[0])
                    return sock.sendMessage(from, { text: "❌ Use: #infocmd comando" });

                return sock.sendMessage(from, {
                    text: `ℹ️ Informações do comando: ${args[0]}`
                });

            case "configurar-bot":
                return sock.sendMessage(from, {
                    text: `
⚙️ Configuração:

1. Edite config.js
2. Defina OWNER_NUMBER
3. pm2 restart demibot
`
                });
        }
    }
};

export default info;            case "check":
                if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid)
                    return sock.sendMessage(from, { text: "❌ Marque um usuário." });

                const user = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

                return sock.sendMessage(from, {
                    text: `🔎 Informações de @${user.split("@")[0]}`,
                    mentions: [user]
                });

            case "admins":
                if (!isGroup)
                    return sock.sendMessage(from, { text: "❌ Apenas em grupo." });

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

export default info;
