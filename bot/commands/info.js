// ============================================================
//  COMANDOS DE INFORMACAO
//  Info, ping, perfil, admins, clima, traduzir, etc.
// ============================================================
import os from 'os'
import config from '../config.js'
import * as db from '../lib/database.js'
import {
  mention, extractNumber, botHeader, botFooter,
  canExecute, isOwner, formatDateBR
} from '../lib/utils.js'
import axios from 'axios'

export async function handleInfo(ctx) {
  const { sock, msg, cmd, args, fullArgs, groupId, sender,
    grpSettings, groupMeta, isGroupAdmin, permLevel, botNumber } = ctx

  const reply = async (text) => sock.sendMessage(groupId, { text, mentions: msg.mentionedJid || [] })
  const replyMentions = async (text, mentions) => sock.sendMessage(groupId, { text, mentions })

  const getTarget = () => {
    if (msg.mentionedJid?.length > 0) return msg.mentionedJid[0]
    if (msg.quoted?.sender) return msg.quoted.sender
    return null
  }

  switch (cmd) {
    // ================================================================
    //  INFO DO BOT
    // ================================================================
    case 'info':
    case 'infobot': {
      const uptime = process.uptime()
      const hours = Math.floor(uptime / 3600)
      const mins = Math.floor((uptime % 3600) / 60)
      const secs = Math.floor(uptime % 60)
      const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)

      await reply(
        `${botHeader('DEMIBOT INFO')}\n` +
        `Nome: ${config.botName || 'DemiBot'}\n` +
        `Dona: ${config.ownerName || 'Demi'}\n` +
        `Prefixo: ${grpSettings?.prefix || config.prefix || '#'}\n` +
        `Uptime: ${hours}h ${mins}m ${secs}s\n` +
        `RAM: ${memUsage} MB\n` +
        `SO: ${os.platform()} ${os.arch()}\n` +
        `Node: ${process.version}\n` +
        `Grupos: (use #status para detalhes)\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  PING
    // ================================================================
    case 'ping':
    case 'ping2':
    case 'ping3': {
      const start = Date.now()
      await reply('Medindo velocidade...')
      const end = Date.now()
      await reply(
        `${botHeader('PING')}\n` +
        `Velocidade: *${end - start}ms*\n` +
        `Uptime: ${Math.floor(process.uptime())}s\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  DONO / CRIADOR
    // ================================================================
    case 'dono':
    case 'donos':
    case 'infodono':
    case 'criador': {
      const ownerNum = config.ownerNumber || '559299652961'
      const ownerJid = `${ownerNum}@s.whatsapp.net`
      await replyMentions(
        `${botHeader('DONA DO BOT')}\n` +
        `Nome: ${config.ownerName || 'Demi'}\n` +
        `Numero: @${ownerNum}\n` +
        `${botFooter()}`,
        [ownerJid]
      )
      break
    }

    // ================================================================
    //  IDIOMAS
    // ================================================================
    case 'idiomas': {
      await reply(
        `${botHeader('IDIOMAS')}\n` +
        `Portugues (PT-BR) - Ativo\n` +
        `English - Em breve\n` +
        `Espanol - Em breve\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  TABELA / INFO DO GRUPO
    // ================================================================
    case 'tabela':
    case 'tabelagp':
    case 'gpinfo':
    case 'grupoinfo':
    case 'grupo': {
      const admins = groupMeta.participants.filter(p => p.admin)
      const createdDate = groupMeta.creation
        ? formatDateBR(new Date(groupMeta.creation * 1000).toISOString())
        : 'Desconhecido'

      await reply(
        `${botHeader('INFO DO GRUPO')}\n` +
        `Nome: ${groupMeta.subject}\n` +
        `Membros: ${groupMeta.participants.length}\n` +
        `Admins: ${admins.length}\n` +
        `Criado em: ${createdDate}\n` +
        `Descricao: ${groupMeta.desc || 'Sem descricao'}\n\n` +
        `*Configuracoes:*\n` +
        `Prefixo: ${grpSettings?.prefix || config.prefix || '#'}\n` +
        `Welcome: ${grpSettings?.welcome ? 'ON' : 'OFF'}\n` +
        `Antilink: ${grpSettings?.antilink ? 'ON' : 'OFF'}\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  PERFIL / ME
    // ================================================================
    case 'perfil':
    case 'me': {
      const target = getTarget() || sender
      const member = db.getMember(groupId, target)
      const isAdm = groupMeta.participants.find(p => p.id === target)?.admin != null

      let profilePic = null
      try {
        profilePic = await sock.profilePictureUrl(target, 'image')
      } catch {}

      const text = `${botHeader('PERFIL')}\n` +
        `Usuario: ${mention(target)}\n` +
        `Numero: ${extractNumber(target)}\n` +
        `Admin: ${isAdm ? 'Sim' : 'Nao'}\n` +
        `Nivel: ${member.level || 1}\n` +
        `XP: ${member.xp || 0}\n` +
        `Gold: ${member.gold || 0}\n` +
        `Mensagens: ${member.messageCount || 0}\n` +
        `Figurinhas: ${member.stickerCount || 0}\n` +
        `Advertencias: ${member.warnings || 0}/${grpSettings?.maxWarnings || 3}\n` +
        `AFK: ${member.isAfk ? `Sim - ${member.afkReason || 'Sem motivo'}` : 'Nao'}\n` +
        `${botFooter()}`

      if (profilePic) {
        try {
          const imgResp = await axios.get(profilePic, { responseType: 'arraybuffer' })
          await sock.sendMessage(groupId, {
            image: Buffer.from(imgResp.data),
            caption: text,
            mentions: [target]
          })
        } catch {
          await replyMentions(text, [target])
        }
      } else {
        await replyMentions(text, [target])
      }
      break
    }

    // ================================================================
    //  CHECK (info de outro membro)
    // ================================================================
    case 'check': {
      const target = getTarget()
      if (!target) return reply('Marque alguem. Ex: #check @user')
      const member = db.getMember(groupId, target)
      const isAdm = groupMeta.participants.find(p => p.id === target)?.admin != null
      await replyMentions(
        `${botHeader('CHECK')}\n` +
        `Usuario: ${mention(target)}\n` +
        `Admin: ${isAdm ? 'Sim' : 'Nao'}\n` +
        `Level: ${member.level || 1} | XP: ${member.xp || 0}\n` +
        `Gold: ${member.gold || 0}\n` +
        `Msgs: ${member.messageCount || 0}\n` +
        `Adv: ${member.warnings || 0}/${grpSettings?.maxWarnings || 3}\n` +
        `${botFooter()}`,
        [target]
      )
      break
    }

    // ================================================================
    //  ADMINS
    // ================================================================
    case 'admins': {
      const admins = groupMeta.participants.filter(p => p.admin)
      if (admins.length === 0) return reply('Nenhum admin encontrado.')
      let text = `${botHeader('ADMINS DO GRUPO')}\n`
      const mentions = []
      admins.forEach((p, i) => {
        const role = p.admin === 'superadmin' ? 'Criador' : 'Admin'
        text += `${i + 1}. ${mention(p.id)} - ${role}\n`
        mentions.push(p.id)
      })
      text += `\nTotal: ${admins.length}${botFooter()}`
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  INFOCMD
    // ================================================================
    case 'infocmd':
    case 'listacmd': {
      if (!args[0]) return reply('Informe o comando. Ex: #infocmd ban')
      const cmdInfo = {
        ban: { desc: 'Bane um membro do grupo', perm: 'Admin', uso: '#ban @user [motivo]' },
        add: { desc: 'Adiciona um numero ao grupo', perm: 'Admin', uso: '#add 5511999999999' },
        advertir: { desc: 'Adverte um membro', perm: 'Moderador', uso: '#advertir @user [motivo]' },
        play: { desc: 'Baixa audio do YouTube', perm: 'Todos', uso: '#play nome da musica' },
        s: { desc: 'Cria figurinha de imagem/video', perm: 'Todos', uso: '#s (envie/marque midia)' },
        gold: { desc: 'Ver saldo de gold', perm: 'Todos', uso: '#gold ou #gold @user' },
        menu: { desc: 'Abre o menu principal', perm: 'Todos', uso: '#menu' },
        antilink: { desc: 'Ativa/desativa antilink', perm: 'Admin', uso: '#antilink' },
        tagall: { desc: 'Marca todos os membros', perm: 'Moderador', uso: '#tagall [mensagem]' },
      }
      const info = cmdInfo[args[0].toLowerCase()]
      if (!info) return reply(`Sem informacao detalhada para "${args[0]}". Veja o #menu para lista de comandos.`)
      await reply(
        `${botHeader(`CMD: ${args[0].toUpperCase()}`)}\n` +
        `Descricao: ${info.desc}\n` +
        `Permissao: ${info.perm}\n` +
        `Uso: ${info.uso}\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  CONFIGURAR BOT
    // ================================================================
    case 'configurar-bot':
    case 'configurarbot': {
      await reply(
        `${botHeader('COMO CONFIGURAR')}\n` +
        `1. Edite o arquivo config.js\n` +
        `2. Defina OWNER_NUMBER com seu numero\n` +
        `3. Ajuste prefixo, nome do bot, etc.\n` +
        `4. Reinicie: pm2 restart demibot\n\n` +
        `Comandos importantes:\n` +
        `#status - Ver configs do grupo\n` +
        `#antilink - Ativar antilink\n` +
        `#bemvindo - Ativar boas-vindas\n` +
        `#prefixos - Ver prefixos ativos\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  ECO / REPEAT / TESTE
    // ================================================================
    case 'eco':
    case 'repeat':
    case 'teste': {
      if (!fullArgs) return reply('Informe o texto. Ex: #eco Ola Mundo')
      await reply(fullArgs)
      break
    }

    // ================================================================
    //  WAME / TAGME
    // ================================================================
    case 'wame': {
      const target = getTarget() || sender
      const num = extractNumber(target)
      await replyMentions(`Link: https://wa.me/${num}`, [target])
      break
    }
    case 'tagme': {
      await replyMentions(`${mention(sender)}`, [sender])
      break
    }

    // ================================================================
    //  AFK (ausente)
    // ================================================================
    case 'ausente':
    case 'afk': {
      const reason = fullArgs || 'Sem motivo'
      db.updateMember(groupId, sender, { isAfk: 1, afkReason: reason })
      await reply(`${mention(sender)} agora esta AFK.\nMotivo: ${reason}`)
      break
    }

    case 'ativo': {
      db.updateMember(groupId, sender, { isAfk: 0, afkReason: '' })
      await reply(`${mention(sender)} voltou e esta ativo!`)
      break
    }

    case 'listarafk':
    case 'statusafk': {
      const members = db.getAllMembers(groupId)
      const afkList = members.filter(m => m.isAfk)
      if (afkList.length === 0) return reply('Ninguem esta AFK.')
      let text = `${botHeader('MEMBROS AFK')}\n`
      const mentions = []
      afkList.forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - ${m.afkReason || 'Sem motivo'}\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  CLIMA
    // ================================================================
    case 'clima': {
      if (!fullArgs) return reply('Informe a cidade. Ex: #clima Manaus')
      try {
        const apiKey = config.apis?.weather
        if (!apiKey) return reply('API de clima nao configurada no config.js.')
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(fullArgs)}&appid=${apiKey}&units=metric&lang=pt_br`
        const resp = await axios.get(url, { timeout: 10000 })
        const d = resp.data
        await reply(
          `${botHeader('CLIMA')}\n` +
          `Cidade: ${d.name}, ${d.sys?.country}\n` +
          `Temperatura: ${d.main.temp}C\n` +
          `Sensacao: ${d.main.feels_like}C\n` +
          `Umidade: ${d.main.humidity}%\n` +
          `Clima: ${d.weather[0]?.description}\n` +
          `Vento: ${d.wind?.speed} m/s\n` +
          `${botFooter()}`
        )
      } catch (e) {
        reply('Erro ao buscar clima: ' + e.message)
      }
      break
    }

    // ================================================================
    //  TRADUZIR
    // ================================================================
    case 'traduzir': {
      if (!fullArgs) return reply('Informe o texto. Ex: #traduzir en Hello World')
      const targetLang = args[0]?.length === 2 ? args[0] : 'pt'
      const textToTranslate = targetLang === args[0] ? args.slice(1).join(' ') : fullArgs
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${targetLang}`
        const resp = await axios.get(url, { timeout: 10000 })
        const translated = resp.data?.responseData?.translatedText
        if (translated) {
          await reply(`${botHeader('TRADUCAO')}\nOriginal: ${textToTranslate}\nTraduzido: ${translated}${botFooter()}`)
        } else {
          reply('Nao consegui traduzir.')
        }
      } catch (e) {
        reply('Erro ao traduzir: ' + e.message)
      }
      break
    }

    // ================================================================
    //  WIKIPEDIA
    // ================================================================
    case 'wikipedia': {
      if (!fullArgs) return reply('Informe o termo. Ex: #wikipedia Brasil')
      try {
        const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(fullArgs)}`
        const resp = await axios.get(url, { timeout: 10000 })
        if (resp.data?.extract) {
          await reply(`${botHeader('WIKIPEDIA')}\n*${resp.data.title}*\n\n${resp.data.extract.substring(0, 3000)}${botFooter()}`)
        } else {
          reply('Nao encontrei informacao sobre isso.')
        }
      } catch (e) {
        reply('Erro ao buscar na Wikipedia: ' + e.message)
      }
      break
    }

    // ================================================================
    //  DICIONARIO
    // ================================================================
    case 'dicionario': {
      if (!fullArgs) return reply('Informe a palavra. Ex: #dicionario saudade')
      try {
        const url = `https://api.dictionaryapi.dev/api/v2/entries/pt/${encodeURIComponent(fullArgs)}`
        const resp = await axios.get(url, { timeout: 10000 })
        if (resp.data?.[0]) {
          const entry = resp.data[0]
          let text = `${botHeader('DICIONARIO')}\n*${entry.word}*\n`
          entry.meanings?.forEach(m => {
            text += `\n_${m.partOfSpeech}_\n`
            m.definitions?.slice(0, 3).forEach((d, i) => {
              text += `${i + 1}. ${d.definition}\n`
            })
          })
          text += botFooter()
          await reply(text)
        } else {
          reply('Palavra nao encontrada.')
        }
      } catch {
        reply('Palavra nao encontrada no dicionario.')
      }
      break
    }

    // ================================================================
    //  CALCULADORA
    // ================================================================
    case 'calculadora':
    case 'calcular': {
      if (!fullArgs) return reply('Informe a expressao. Ex: #calcular 2+2*3')
      try {
        // Expressao segura - apenas numeros e operadores basicos
        const sanitized = fullArgs.replace(/[^0-9+\-*/.() ]/g, '')
        if (!sanitized) return reply('Expressao invalida.')
        const result = Function('"use strict"; return (' + sanitized + ')')()
        await reply(`${botHeader('CALCULADORA')}\nExpressao: ${fullArgs}\nResultado: *${result}*${botFooter()}`)
      } catch {
        reply('Expressao invalida.')
      }
      break
    }

    // ================================================================
    //  CEP
    // ================================================================
    case 'cep': {
      if (!args[0]) return reply('Informe o CEP. Ex: #cep 69000000')
      try {
        const cep = args[0].replace(/\D/g, '')
        const resp = await axios.get(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 10000 })
        if (resp.data?.erro) return reply('CEP nao encontrado.')
        const d = resp.data
        await reply(
          `${botHeader('CEP')}\n` +
          `CEP: ${d.cep}\n` +
          `Rua: ${d.logradouro || '-'}\n` +
          `Bairro: ${d.bairro || '-'}\n` +
          `Cidade: ${d.localidade}\n` +
          `Estado: ${d.uf}\n` +
          `${botFooter()}`
        )
      } catch (e) {
        reply('Erro ao buscar CEP: ' + e.message)
      }
      break
    }

    // ================================================================
    //  DDD
    // ================================================================
    case 'ddd': {
      if (!args[0]) return reply('Informe o DDD. Ex: #ddd 92')
      const ddds = {
        '11': 'Sao Paulo', '21': 'Rio de Janeiro', '31': 'Belo Horizonte',
        '41': 'Curitiba', '51': 'Porto Alegre', '61': 'Brasilia',
        '71': 'Salvador', '81': 'Recife', '85': 'Fortaleza', '91': 'Belem',
        '92': 'Manaus', '27': 'Vitoria', '48': 'Florianopolis',
        '62': 'Goiania', '65': 'Cuiaba', '67': 'Campo Grande',
        '68': 'Rio Branco', '69': 'Porto Velho', '82': 'Maceio',
        '83': 'Joao Pessoa', '84': 'Natal', '86': 'Teresina',
        '87': 'Petrolina', '88': 'Juazeiro do Norte', '89': 'Picos',
        '93': 'Santarem', '94': 'Maraba', '95': 'Boa Vista',
        '96': 'Macapa', '97': 'Coari', '98': 'Sao Luis', '99': 'Imperatriz',
        '63': 'Palmas', '64': 'Rio Verde',
      }
      const ddd = args[0].replace(/\D/g, '')
      const city = ddds[ddd]
      if (city) {
        await reply(`${botHeader('DDD')}\nDDD: ${ddd}\nRegiao: ${city}${botFooter()}`)
      } else {
        reply('DDD nao encontrado.')
      }
      break
    }

    // ================================================================
    //  FALAR / GTTS (text to speech)
    // ================================================================
    case 'falar':
    case 'gtts': {
      if (!fullArgs) return reply('Informe o texto. Ex: #falar Ola Mundo')
      try {
        const lang = 'pt'
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(fullArgs.substring(0, 200))}&tl=${lang}&client=tw-ob`
        const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
        await sock.sendMessage(groupId, {
          audio: Buffer.from(resp.data),
          mimetype: 'audio/mpeg',
          ptt: true,
        })
      } catch {
        reply('Erro ao gerar audio. Texto muito longo ou servico indisponivel.')
      }
      break
    }

    // ================================================================
    //  AVALIACAO / BUG / SUGESTAO
    // ================================================================
    case 'avalie':
    case 'bug':
    case 'sugestao': {
      if (!fullArgs) return reply(`Informe sua mensagem. Ex: #${cmd} Texto aqui`)
      const ownerNum = config.ownerNumber || '559299652961'
      const ownerJid = `${ownerNum}@s.whatsapp.net`
      const labels = { avalie: 'AVALIACAO', bug: 'BUG REPORT', sugestao: 'SUGESTAO' }
      try {
        await sock.sendMessage(ownerJid, {
          text: `${botHeader(labels[cmd] || cmd.toUpperCase())}\nDe: ${extractNumber(sender)}\nGrupo: ${groupMeta.subject}\n\n${fullArgs}${botFooter()}`
        })
        reply(`Sua ${labels[cmd]?.toLowerCase() || 'mensagem'} foi enviada a dona. Obrigado!`)
      } catch {
        reply('Erro ao enviar. Tente novamente.')
      }
      break
    }

    // ================================================================
    //  GEMINI / GPT (placeholder - requer API)
    // ================================================================
    case 'gemini':
    case 'gpt': {
      if (!fullArgs) return reply(`Informe sua pergunta. Ex: #${cmd} O que e IA?`)
      reply('Para usar IA, configure a API key no config.js (apiKey para Gemini ou OpenAI).')
      break
    }

    // ================================================================
    //  APRESENTAR
    // ================================================================
    case 'apresentar':
    case 'apr': {
      if (!fullArgs) return reply('Escreva sua apresentacao. Ex: #apresentar Ola, meu nome e...')
      await reply(
        `${botHeader('APRESENTACAO')}\n` +
        `${mention(sender)} diz:\n\n` +
        `"${fullArgs}"\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  CONTAR
    // ================================================================
    case 'contar': {
      if (!fullArgs) return reply('Informe o texto para contar caracteres.')
      await reply(
        `${botHeader('CONTADOR')}\n` +
        `Caracteres: ${fullArgs.length}\n` +
        `Palavras: ${fullArgs.split(/\s+/).filter(Boolean).length}\n` +
        `${botFooter()}`
      )
      break
    }

    // ================================================================
    //  SENDER (debug)
    // ================================================================
    case 'sender': {
      await reply(`Seu JID: ${sender}\nNumero: ${extractNumber(sender)}`)
      break
    }

    // ================================================================
    //  DEFAULT
    // ================================================================
    default:
      await reply(`Comando info "${cmd}" em desenvolvimento.`)
  }
}
