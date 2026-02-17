import os from 'os';
import moment from 'moment';

export const name = "info";
export const description = "Menu de informações";
export const commands = [
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
];

export async function execute({ sock, msg, args, command, from, sender, isGroup, groupMetadata }) {
    switch (command) {
        case "info":
            await sock.sendMessage(from, {
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
            break;

        case "ping": {
            const start = Date.now();
            const end = Date.now();
            await sock.sendMessage(from, {
                text: `🏓 Pong!\nVelocidade: ${end - start}ms`
            });
            break;
        }

        case "dono":
            await sock.sendMessage(from, {
                text: `👑 Dono do bot:\n@${process.env.OWNER_NUMBER || "559299652961"}`,
                mentions: [`${process.env.OWNER_NUMBER || "559299652961"}@s.whatsapp.net`]
            });
            break;

        case "idiomas":
            await sock.sendMessage(from, {
                text: `🌎 Idiomas disponíveis:\n• Português\n• English (em breve)`
            });
            break;

        case "tabela":
        case "tabelagp":
            if (!isGroup) {
                await sock.sendMessage(from, { text: "❌ Comando apenas para grupos." });
                break;
            }
            await sock.sendMessage(from, {
                text: `📋 Tabela do grupo:\nTotal membros: ${groupMetadata.participants.length}`
            });
            break;

        case "gpinfo":
            if (!isGroup) {
                await sock.sendMessage(from, { text: "❌ Comando apenas para grupos." });
                break;
            }
            await sock.sendMessage(from, {
                text: `
📌 *Informações do Grupo*

Nome: ${groupMetadata.subject}
Membros: ${groupMetadata.participants.length}
Criado em: ${moment(groupMetadata.creation * 1000).format("DD/MM/YYYY")}
`
            });
            break;

        case "perfil":
        case "me":
            await sock.sendMessage(from, {
                text: `
👤 *Seu Perfil*

Número: ${sender.split("@")[0]}
Sistema: ${os.platform()}
Hora: ${moment().format("HH:mm:ss")}
`
            });
            break;

        case "check": {
            if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                await sock.sendMessage(from, { text: "❌ Marque um usuário." });
                break;
            }
            const user = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            await sock.sendMessage(from, {
                text: `🔎 Informações de @${user.split("@")[0]}`,
                mentions: [user]
            });
            break;
        }

        case "admins":
            if (!isGroup) {
                await sock.sendMessage(from, { text: "❌ Apenas em grupo." });
                break;
            }
            const admins = groupMetadata.participants
                .filter(p => p.admin)
                .map(p => `@${p.id.split("@")[0]}`);
            await sock.sendMessage(from, {
                text: `👮 *Admins do Grupo:*\n\n${admins.join("\n")}`,
                mentions: groupMetadata.participants
                    .filter(p => p.admin)
                    .map(p => p.id)
            });
            break;

        case "infocmd":
            if (!args[0]) {
                await sock.sendMessage(from, { text: "❌ Use: #infocmd nomeDoComando" });
                break;
            }
            await sock.sendMessage(from, {
                text: `ℹ️ Informações do comando: ${args[0]}\nDescrição não configurada.`
            });
            break;

        case "configurar-bot":
            await sock.sendMessage(from, {
                text: `
⚙️ *Como configurar o bot*

1. Edite o arquivo config.js
2. Defina OWNER_NUMBER
3. Reinicie com: pm2 restart demibot
`
            });
            break;

        default:
            await sock.sendMessage(from, { text: "Comando não reconhecido." });
    }
}
