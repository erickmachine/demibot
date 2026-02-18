// ============================================================
//  COMANDOS DE GRUPO / RANKINGS
//  Rank de ativos, figurinhas, inativos, level, novatos, etc.
// ============================================================
import config from '../config.js'
import * as db from '../lib/database.js'
import {
  mention, extractNumber, botHeader, botFooter,
  canExecute, formatDateBR
} from '../lib/utils.js'

export async function handleGroup(ctx) {
  const { sock, msg, cmd, args, fullArgs, groupId, sender,
    grpSettings, groupMeta, isGroupAdmin, permLevel } = ctx

  const reply = async (text) => sock.sendMessage(groupId, { text, mentions: msg.mentionedJid || [] })
  const replyMentions = async (text, mentions) => sock.sendMessage(groupId, { text, mentions })

  const getTarget = () => {
    if (msg.mentionedJid?.length > 0) return msg.mentionedJid[0]
    if (msg.quoted?.sender) return msg.quoted.sender
    return null
  }

  switch (cmd) {
    // ================================================================
    //  RANK DE ATIVOS (por mensagens)
    // ================================================================
    case 'rankativos': {
      const members = db.getAllMembers(groupId)
      if (!members || members.length === 0) return reply('Nenhum dado de membro encontrado.')

      const sorted = members
        .filter(m => (m.messageCount || 0) > 0)
        .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
        .slice(0, 15)

      if (sorted.length === 0) return reply('Nenhum membro ativo registrado.')

      const medals = ['1.', '2.', '3.']
      let text = `${botHeader('RANK DE ATIVOS')}\n`
      const mentions = []
      sorted.forEach((m, i) => {
        const medal = medals[i] || `${i + 1}.`
        text += `${medal} ${mention(m.userId)} - ${m.messageCount} msgs\n`
        mentions.push(m.userId)
      })
      text += `\nTotal: ${sorted.length} membros ativos${botFooter()}`
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  RANK DE ATIVOS GOLD (por gold)
    // ================================================================
    case 'rankativosg': {
      const ranking = db.getGoldRanking(groupId)
      if (!ranking || ranking.length === 0) return reply('Nenhum membro com gold.')

      let text = `${botHeader('RANK ATIVOS GOLD')}\n`
      const mentions = []
      ranking.slice(0, 15).forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - ${m.gold} gold | ${m.messageCount || 0} msgs\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  CHECK ATIVO (ver atividade de um membro)
    // ================================================================
    case 'checkativo': {
      const target = getTarget() || sender
      const member = db.getMember(groupId, target)
      await replyMentions(
        `${botHeader('ATIVIDADE')}\n` +
        `${mention(target)}\n` +
        `Mensagens: ${member.messageCount || 0}\n` +
        `Figurinhas: ${member.stickerCount || 0}\n` +
        `Gold: ${member.gold || 0}\n` +
        `Level: ${member.level || 1}\n` +
        `XP: ${member.xp || 0}\n` +
        `Ultima atividade: ${member.lastActive ? formatDateBR(member.lastActive) : 'Desconhecida'}\n` +
        `${botFooter()}`,
        [target]
      )
      break
    }

    // ================================================================
    //  RANK DE FIGURINHAS
    // ================================================================
    case 'rankfigurinhas': {
      const members = db.getAllMembers(groupId)
      if (!members || members.length === 0) return reply('Nenhum dado encontrado.')

      const sorted = members
        .filter(m => (m.stickerCount || 0) > 0)
        .sort((a, b) => (b.stickerCount || 0) - (a.stickerCount || 0))
        .slice(0, 15)

      if (sorted.length === 0) return reply('Ninguem criou figurinhas ainda.')

      let text = `${botHeader('RANK DE FIGURINHAS')}\n`
      const mentions = []
      sorted.forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - ${m.stickerCount} figurinhas\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  ULTIMOS ATIVOS
    // ================================================================
    case 'ultimosativos': {
      const members = db.getAllMembers(groupId)
      if (!members || members.length === 0) return reply('Nenhum dado encontrado.')

      const sorted = members
        .filter(m => m.lastActive)
        .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))
        .slice(0, 15)

      if (sorted.length === 0) return reply('Nenhum membro com atividade registrada.')

      let text = `${botHeader('ULTIMOS ATIVOS')}\n`
      const mentions = []
      sorted.forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - ${formatDateBR(m.lastActive)}\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  RANK DE INATIVOS
    // ================================================================
    case 'rankinativo': {
      const days = parseInt(args[0]) || config.inactiveDays || 7
      const inactive = db.getInactiveMembers(groupId, days)
      if (!inactive || inactive.length === 0) return reply(`Nenhum membro inativo ha mais de ${days} dias.`)

      let text = `${botHeader('RANK DE INATIVOS')}\nInativos ha mais de ${days} dias:\n\n`
      const mentions = []
      inactive.slice(0, 20).forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - Ultima ativ: ${m.lastActive ? formatDateBR(m.lastActive) : 'Nunca'}\n`
        mentions.push(m.userId)
      })
      text += `\nTotal: ${inactive.length}${botFooter()}`
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  RANK DE LEVEL
    // ================================================================
    case 'ranklevel': {
      const members = db.getAllMembers(groupId)
      if (!members || members.length === 0) return reply('Nenhum dado encontrado.')

      const sorted = members
        .filter(m => (m.level || 1) > 1 || (m.xp || 0) > 0)
        .sort((a, b) => {
          if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1)
          return (b.xp || 0) - (a.xp || 0)
        })
        .slice(0, 15)

      if (sorted.length === 0) return reply('Ninguem subiu de nivel ainda.')

      let text = `${botHeader('RANK DE LEVEL')}\n`
      const mentions = []
      sorted.forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - Lvl ${m.level || 1} (${m.xp || 0} XP)\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  NOVATOS (membros recentes)
    // ================================================================
    case 'novatos':
    case 'bemvindoaosnovatos': {
      const newcomers = db.getNewcomers(groupId)
      if (!newcomers || newcomers.length === 0) return reply('Nenhum novato registrado.')

      let text = `${botHeader('NOVATOS')}\nMembros recentes:\n\n`
      const mentions = []
      newcomers.slice(0, 15).forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - Entrou: ${m.joinedAt ? formatDateBR(m.joinedAt) : 'Recente'}\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  LEVEL TEMAS
    // ================================================================
    case 'leveltemas': {
      await reply(
        `${botHeader('TEMAS DE LEVEL')}\n` +
        `Lvl 1 - Novato\n` +
        `Lvl 5 - Membro\n` +
        `Lvl 10 - Veterano\n` +
        `Lvl 20 - Mestre\n` +
        `Lvl 30 - Lenda\n` +
        `Lvl 50 - Divino\n\n` +
        `Ganhe XP enviando mensagens e figurinhas!${botFooter()}`
      )
      break
    }

    // ================================================================
    //  EM COMUM (membros em comum com outro grupo)
    // ================================================================
    case 'emcomum': {
      await reply('Funcao em desenvolvimento. Em breve voce podera ver membros em comum entre grupos.')
      break
    }

    // ================================================================
    //  STATUS DAMAS
    // ================================================================
    case 'statusdamas': {
      await reply('Nenhuma partida de damas ativa. Inicie com #damas @user')
      break
    }

    // ================================================================
    //  LISTA TM (equipes/times)
    // ================================================================
    case 'listatm': {
      const teams = db.getTeams ? db.getTeams(groupId) : []
      if (!teams || teams.length === 0) return reply('Nenhuma equipe registrada. Use #rgtm para criar.')
      let text = `${botHeader('EQUIPES')}\n`
      teams.forEach((t, i) => {
        text += `${i + 1}. ${t.name} - ${t.members?.length || 0} membros\n`
      })
      text += botFooter()
      await reply(text)
      break
    }

    case 'rgtm': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!fullArgs) return reply('Informe o nome da equipe. Ex: #rgtm Time Alpha')
      if (db.addTeam) {
        db.addTeam(groupId, fullArgs, sender)
        await reply(`Equipe "${fullArgs}" criada com sucesso!`)
      } else {
        reply('Funcao de equipes nao disponivel no banco de dados.')
      }
      break
    }

    case 'tirardatm': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!args[0]) return reply('Informe o nome da equipe.')
      if (db.removeTeam) {
        db.removeTeam(groupId, args[0])
        await reply(`Equipe "${args[0]}" removida.`)
      } else {
        reply('Funcao de equipes nao disponivel.')
      }
      break
    }

    case 'fazertm': {
      if (!fullArgs) return reply('Informe o nome da equipe para entrar.')
      if (db.joinTeam) {
        db.joinTeam(groupId, fullArgs, sender)
        await reply(`${mention(sender)} entrou na equipe "${fullArgs}"!`)
      } else {
        reply('Funcao de equipes nao disponivel.')
      }
      break
    }

    // ================================================================
    //  LISTA GP2 (listar grupos do bot)
    // ================================================================
    case 'listagp2': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      try {
        const groups = await sock.groupFetchAllParticipating()
        const groupList = Object.values(groups)
        let text = `${botHeader('GRUPOS DO BOT')}\nTotal: ${groupList.length}\n\n`
        groupList.slice(0, 20).forEach((g, i) => {
          text += `${i + 1}. ${g.subject} - ${g.participants?.length || '?'} membros\n`
        })
        text += botFooter()
        await reply(text)
      } catch (e) {
        reply('Erro ao listar grupos: ' + e.message)
      }
      break
    }

    // ================================================================
    //  DEFAULT
    // ================================================================
    default:
      await reply(`Comando de grupo "${cmd}" em desenvolvimento.`)
  }
}
