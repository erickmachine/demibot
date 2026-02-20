// ============================================================
//  COMANDOS DE ADMINISTRACAO
// ============================================================
import config from '../config.js'
import * as db from '../lib/database.js'
import {
  mention, extractNumber, formatJid, botHeader, botFooter,
  buildMenu, isOwner, formatDateBR, canExecute
} from '../lib/utils.js'

export async function handleAdmin(ctx) {
  const { sock, msg, cmd, args, fullArgs, groupId, sender, grpSettings,
    groupMeta, isGroupAdmin, isBotAdmin, permLevel, botNumber } = ctx

  const reply = async (text) => sock.sendMessage(groupId, { text, mentions: msg.mentionedJid || [] })
  const replyMentions = async (text, mentions) => sock.sendMessage(groupId, { text, mentions })

  // Funcao para pegar usuario mencionado ou citado
  const getTarget = () => {
    if (msg.mentionedJid?.length > 0) return msg.mentionedJid[0]
    if (msg.quoted?.sender) return msg.quoted.sender
    if (args[0]) return formatJid(args[0])
    return null
  }

  switch (cmd) {
    // === BAN ===
    case 'ban':
    case 'band': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para banir membros. Promova o bot a admin primeiro.')
      const target = getTarget()
      if (!target) return reply('Marque alguem ou cite uma mensagem.')
      if (target === botNumber) return reply('Nao posso me banir.')
      if (isOwner(target)) return reply('Nao posso banir a dona.')
      try {
        await sock.groupParticipantsUpdate(groupId, [target], 'remove')
        const reason = fullArgs.replace(/@\d+/g, '').trim() || 'Sem motivo'
        await replyMentions(
          `${botHeader('BAN')}\n${mention(target)} foi banido(a).\nMotivo: ${reason}\n${grpSettings.msgBan || ''}${botFooter()}`,
          [target]
        )
        db.logActivity(groupId, sender, 'ban', `Baniu ${extractNumber(target)}: ${reason}`)
      } catch (e) {
        reply('Erro ao banir: ' + e.message)
      }
      break
    }

    // === ADD ===
    case 'add': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para adicionar membros. Promova o bot a admin primeiro.')
      if (!args[0]) return reply('Informe o numero. Ex: #add 5511999999999')
      const num = formatJid(args[0])
      try {
        await sock.groupParticipantsUpdate(groupId, [num], 'add')
        reply(`${mention(num)} adicionado ao grupo!`)
      } catch (e) {
        reply('Nao foi possivel adicionar. O numero pode ter bloqueado convites ou a privacidade esta fechada.')
      }
      break
    }

    // === ADVERTIR ===
    case 'advertir':
    case 'adverter': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      if (isOwner(target)) return reply('Nao posso advertir a dona.')
      const reason = fullArgs.replace(/@\d+/g, '').trim() || 'Sem motivo'
      const warns = db.addWarning(groupId, target, reason)
      let text = `${botHeader('ADVERTENCIA')}\n${mention(target)} recebeu uma advertencia.\nMotivo: ${reason}\nAdvertencias: ${warns}/${grpSettings.maxWarnings}${botFooter()}`
      if (warns >= grpSettings.maxWarnings) {
        if (isBotAdmin) {
          await sock.groupParticipantsUpdate(groupId, [target], 'remove')
          text += `\n\nRemovido por excesso de advertencias!`
          db.clearWarnings(groupId, target)
          if (grpSettings.autoban) db.addToBlacklist(target, 'Excesso de advertencias', sender)
        }
      }
      await replyMentions(text, [target])
      db.logActivity(groupId, sender, 'advertir', `Advertiu ${extractNumber(target)}: ${reason}`)
      break
    }

    // === CHECK WARNINGS ===
    case 'checkwarnings':
    case 'ver_adv': {
      const target = getTarget() || sender
      const member = db.getMember(groupId, target)
      const reasons = JSON.parse(member.warningReasons || '[]')
      let text = `${botHeader('ADVERTENCIAS')}\n${mention(target)}\nTotal: ${member.warnings}/${grpSettings.maxWarnings}\n`
      if (reasons.length > 0) {
        text += '\nHistorico:\n'
        reasons.forEach((r, i) => {
          text += `${i + 1}. ${r.reason} (${formatDateBR(r.date)})\n`
        })
      }
      text += botFooter()
      await replyMentions(text, [target])
      break
    }

    // === REMOVE WARNINGS ===
    case 'removewarnings':
    case 'rm_adv': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      const remaining = db.removeWarning(groupId, target)
      await replyMentions(`${mention(target)} teve 1 advertencia removida. Restam: ${remaining}/${grpSettings.maxWarnings}`, [target])
      break
    }

    // === CLEAR WARNINGS ===
    case 'clearwarnings':
    case 'limpar_adv':
    case 'limparavisos': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const target = getTarget()
      if (target) {
        db.clearWarnings(groupId, target)
        await replyMentions(`Advertencias de ${mention(target)} limpas.`, [target])
      } else {
        db.clearAllWarnings(groupId)
        reply('Todas as advertencias do grupo foram limpas.')
      }
      break
    }

    case 'resetavisos': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.clearAllWarnings(groupId)
      reply('Todos os avisos foram resetados.')
      break
    }

    // === ADVERTIDOS ===
    case 'advertidos':
    case 'lista_adv': {
      const warned = db.getWarned(groupId)
      if (warned.length === 0) return reply('Nenhum membro com advertencias.')
      let text = `${botHeader('MEMBROS ADVERTIDOS')}\n`
      const mentions = []
      warned.forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - ${m.warnings} adv\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // === MUTE / DESMUTE ===
    case 'mute': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      db.updateMember(groupId, target, { isMuted: 1 })
      await replyMentions(`${mention(target)} foi silenciado.`, [target])
      break
    }

    case 'desmute': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      db.updateMember(groupId, target, { isMuted: 0 })
      await replyMentions(`${mention(target)} foi dessilenciado.`, [target])
      break
    }

    // === PROMOVER / REBAIXAR ===
    case 'promover': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para promover membros. Promova o bot a admin primeiro.')
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      try {
        await sock.groupParticipantsUpdate(groupId, [target], 'promote')
        await replyMentions(`${botHeader('PROMOVIDO')}\n${mention(target)} foi promovido a admin!${botFooter()}`, [target])
        db.logActivity(groupId, sender, 'promover', `Promoveu ${extractNumber(target)}`)
      } catch (e) {
        reply('Erro ao promover: ' + e.message)
      }
      break
    }

    case 'rebaixar': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para rebaixar membros. Promova o bot a admin primeiro.')
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      try {
        await sock.groupParticipantsUpdate(groupId, [target], 'demote')
        await replyMentions(`${botHeader('REBAIXADO')}\n${mention(target)} foi rebaixado.${botFooter()}`, [target])
        db.logActivity(groupId, sender, 'rebaixar', `Rebaixou ${extractNumber(target)}`)
      } catch (e) {
        reply('Erro ao rebaixar: ' + e.message)
      }
      break
    }

    // === CARGO ===
    case 'cargo': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const target = getTarget()
      if (!target) return reply('Marque alguem e informe o cargo. Ex: #cargo @user mod')
      const role = args.find(a => ['admin', 'mod', 'aux', 'member'].includes(a.toLowerCase()))
      if (!role) return reply('Cargos disponiveis: admin, mod, aux, member')
      db.setRole(groupId, target, role.toLowerCase(), sender)
      const roleName = config.roles[role.toLowerCase()]?.name || role
      await replyMentions(`${mention(target)} agora e ${roleName}.`, [target])
      db.logActivity(groupId, sender, 'cargo', `Atribuiu ${role} para ${extractNumber(target)}`)
      break
    }

    // === TAGALL / TOTAG / HIDETAG ===
    case 'tagall':
    case 'marcar':
    case 'marcar2':
    case 'marcarwa': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const allJids = groupMeta.participants.map(p => p.id)
      let text = `${botHeader('MARCANDO TODOS')}\n${fullArgs || 'Atencao!'}\n\n`
      allJids.forEach(jid => { text += `${mention(jid)}\n` })
      text += botFooter()
      await replyMentions(text, allJids)
      break
    }

    case 'totag': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const allJids = groupMeta.participants.map(p => p.id)
      await replyMentions(fullArgs || 'Atencao!', allJids)
      break
    }

    case 'hidetag': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const allJids = groupMeta.participants.map(p => p.id)
      await sock.sendMessage(groupId, { text: fullArgs || '.', mentions: allJids })
      break
    }

    // === LINK DO GRUPO ===
    case 'linkgp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para gerar link. Promova o bot a admin primeiro.')
      const code = await sock.groupInviteCode(groupId)
      reply(`${botHeader('LINK DO GRUPO')}\nhttps://chat.whatsapp.com/${code}${botFooter()}`)
      break
    }

    // === NOME / DESC / FOTO DO GRUPO ===
    case 'nomegp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!fullArgs) return reply('Informe o novo nome. Ex: #nomegp Novo Nome')
      await sock.groupUpdateSubject(groupId, fullArgs)
      reply(`Nome do grupo alterado para: ${fullArgs}`)
      break
    }

    case 'descgp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!fullArgs) return reply('Informe a nova descricao.')
      await sock.groupUpdateDescription(groupId, fullArgs)
      reply('Descricao do grupo atualizada.')
      break
    }

    case 'fotogp':
    case 'setfotogp': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para mudar a foto. Promova o bot a admin primeiro.')
      if (!msg.quoted?.message?.imageMessage && !msg.message?.imageMessage) {
        return reply('Marque uma imagem ou envie com a legenda #fotogp')
      }
      try {
        const buffer = await ctx.downloadMediaMessage(ctx.rawMsg, 'buffer', {})
        await sock.updateProfilePicture(groupId, buffer)
        reply('Foto do grupo atualizada!')
      } catch (e) {
        reply('Erro ao atualizar foto: ' + e.message)
      }
      break
    }

    // === ABRIR / FECHAR GRUPO ===
    case 'fechargp':
    case 'colloportus': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para fechar o grupo. Promova o bot a admin primeiro.')
      try {
        await sock.groupSettingUpdate(groupId, 'announcement')
        reply(`${botHeader('GRUPO FECHADO')}\nApenas admins podem enviar mensagens agora.${botFooter()}`)
        db.logActivity(groupId, sender, 'fechargp', 'Fechou o grupo')
      } catch (e) {
        reply('Erro ao fechar grupo: ' + e.message)
      }
      break
    }

    case 'abrirgp':
    case 'alohomora': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para abrir o grupo. Promova o bot a admin primeiro.')
      try {
        await sock.groupSettingUpdate(groupId, 'not_announcement')
        reply(`${botHeader('GRUPO ABERTO')}\nTodos podem enviar mensagens agora.${botFooter()}`)
        db.logActivity(groupId, sender, 'abrirgp', 'Abriu o grupo')
      } catch (e) {
        reply('Erro ao abrir grupo: ' + e.message)
      }
      break
    }

    // === DELETAR MENSAGEM ===
    case 'deletar': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para deletar mensagens. Promova o bot a admin primeiro.')
      if (!msg.quoted) return reply('Cite a mensagem que deseja apagar.')
      try {
        await sock.sendMessage(groupId, { delete: { remoteJid: groupId, fromMe: false, id: msg.quoted.message?.key?.id || msg.key.id, participant: msg.quoted.sender } })
        await sock.sendMessage(groupId, { delete: msg.key })
      } catch (e) {
        reply('Erro ao deletar: ' + e.message)
      }
      break
    }

    // === SORTEIO ===
    case 'sorteio': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const allParticipants = groupMeta.participants.map(p => p.id)
      const winner = allParticipants[Math.floor(Math.random() * allParticipants.length)]
      await replyMentions(
        `${botHeader('SORTEIO')}\nO sorteado foi: ${mention(winner)}!${botFooter()}`,
        [winner]
      )
      break
    }

    // === BAN GHOST (sem foto de perfil) ===
    case 'banghost': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para remover membros. Promova o bot a admin primeiro.')
      let count = 0
      for (const p of groupMeta.participants) {
        if (p.admin) continue
        if (p.id === botNumber) continue
        try {
          await sock.profilePictureUrl(p.id, 'image')
        } catch {
          await sock.groupParticipantsUpdate(groupId, [p.id], 'remove')
          count++
        }
      }
      reply(`${count} membro(s) sem foto de perfil removidos.`)
      break
    }

    // === BAN FAKES ===
    case 'banfakes':
    case 'banfake': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para remover membros. Promova o bot a admin primeiro.')
      let count = 0
      for (const p of groupMeta.participants) {
        if (p.admin) continue
        const num = extractNumber(p.id)
        if (!num.startsWith('55')) {
          await sock.groupParticipantsUpdate(groupId, [p.id], 'remove')
          count++
        }
      }
      reply(`${count} numero(s) estrangeiro(s) removidos.`)
      break
    }

    // === INATIVOS ===
    case 'inativos': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const days = parseInt(args[0]) || config.inactiveDays
      const inactive = db.getInactiveMembers(groupId, days)
      if (inactive.length === 0) return reply('Nenhum membro inativo encontrado.')
      let text = `${botHeader('MEMBROS INATIVOS')}\nInativos ha mais de ${days} dias:\n\n`
      const mentions = []
      inactive.forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - Ultima atividade: ${formatDateBR(m.lastActive)}\n`
        mentions.push(m.userId)
      })
      text += `\nTotal: ${inactive.length}${botFooter()}`
      await replyMentions(text, mentions)
      break
    }

    // === NUKE ===
    case 'nuke': {
      if (!isOwner(sender)) return reply('Apenas a dona pode usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para remover membros. Promova o bot a admin primeiro.')
      for (const p of groupMeta.participants) {
        if (p.admin) continue
        if (p.id === botNumber) continue
        try {
          await sock.groupParticipantsUpdate(groupId, [p.id], 'remove')
        } catch {}
      }
      reply('Todos os membros nao-admin foram removidos.')
      break
    }

    // === LISTA NEGRA ===
    case 'listanegra': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o numero. Ex: #listanegra 5511999999999')
      const num = formatJid(args[0])
      const reason = args.slice(1).join(' ') || 'Banido pelo admin'
      db.addToBlacklist(num, reason, sender)
      reply(`${extractNumber(num)} adicionado a lista negra. Motivo: ${reason}`)
      break
    }

    case 'tirardalista': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o numero.')
      const num = formatJid(args[0])
      db.removeFromBlacklist(num)
      reply(`${extractNumber(num)} removido da lista negra.`)
      break
    }

    case 'listaban': {
      const list = db.getBlacklist()
      if (list.length === 0) return reply('Lista negra vazia.')
      let text = `${botHeader('LISTA NEGRA')}\n`
      list.forEach((item, i) => {
        text += `${i + 1}. ${extractNumber(item.userId)} - ${item.reason}\n`
      })
      text += botFooter()
      reply(text)
      break
    }

    // === LISTA BRANCA ===
    case 'listabranca':
    case 'antilinkwhite': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (args[0] === 'list') {
        const wl = db.getWhitelist(groupId)
        if (wl.length === 0) return reply('Lista branca vazia.')
        let text = `${botHeader('LISTA BRANCA')}\n`
        const mentions = []
        wl.forEach((item, i) => {
          text += `${i + 1}. ${mention(item.userId)}\n`
          mentions.push(item.userId)
        })
        text += botFooter()
        return await replyMentions(text, mentions)
      }
      const target = getTarget()
      if (!target) return reply('Marque alguem ou use "list" para ver.')
      db.addToWhitelist(groupId, target)
      await replyMentions(`${mention(target)} adicionado a lista branca (antilink).`, [target])
      break
    }

    case 'rmlistabranca': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      db.removeFromWhitelist(groupId, target)
      await replyMentions(`${mention(target)} removido da lista branca.`, [target])
      break
    }

    // === ACEITAR SOLICITACOES ===
    case 'aceitar':
    case 'aceitarmembro': {
      if (!isGroupAdmin && !isOwner(sender)) return reply('Apenas admins do grupo podem usar este comando.')
      if (!isBotAdmin) return reply('O bot precisa ser administrador do grupo para aceitar solicitacoes. Promova o bot a admin primeiro.')
      try {
        const pending = await sock.groupRequestParticipantsList(groupId)
        if (pending.length === 0) return reply('Nenhuma solicitacao pendente.')
        for (const p of pending) {
          await sock.groupRequestParticipantsUpdate(groupId, [p.jid], 'approve')
        }
        reply(`${pending.length} solicitacao(oes) aceita(s).`)
      } catch (e) {
        reply('Erro ao aceitar solicitacoes: ' + e.message)
      }
      break
    }

    // === ANOTACOES ===
    case 'anotar': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!fullArgs) return reply('Informe o texto da anotacao.')
      db.addNote(groupId, fullArgs, sender)
      reply('Anotacao salva com sucesso!')
      break
    }

    case 'anotacoes':
    case 'anotacao': {
      const notes = db.getNotes(groupId)
      if (notes.length === 0) return reply('Nenhuma anotacao.')
      let text = `${botHeader('ANOTACOES')}\n`
      notes.forEach((n, i) => {
        text += `*${i + 1}. [ID: ${n.odId}]* ${n.text}\n  _${formatDateBR(n.createdAt)}_\n\n`
      })
      text += botFooter()
      reply(text)
      break
    }

    case 'rmnota':
    case 'tirar_nota': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const id = parseInt(args[0])
      if (!id) return reply('Informe o ID da nota. Veja com #anotacoes')
      db.removeNote(id)
      reply('Anotacao removida.')
      break
    }

    // === STATUS DO GRUPO ===
    case 'status': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const s = grpSettings
      const toggles = [
        ['Welcome', s.welcome], ['Antilink', s.antilink], ['Adv Link', s.advlink],
        ['AntiLinkGP', s.antilinkgp], ['AntiFake', s.antifake],
        ['AntiFlood', s.antiflood], ['Adv Flood', s.advflood],
        ['AntiBots', s.antibots], ['AntiPalavra', s.antipalavra],
        ['AntiImg', s.antiimg], ['AntiVideo', s.antivideo],
        ['AntiAudio', s.antiaudio], ['AntiDoc', s.antidoc],
        ['AntiSticker', s.antisticker], ['AntiCatalogo', s.anticatalogo],
        ['AntiContato', s.anticontato], ['AntiLoc', s.antiloc],
        ['AntiNotas', s.antinotas], ['AntiMarcar', s.antimarcar],
        ['X9 ViewOnce', s.x9viewonce], ['X9 Adm', s.x9adm],
        ['So Admin', s.soadm], ['AutoSticker', s.autosticker],
        ['AutoBaixar', s.autobaixar], ['MultiPrefixo', s.multiprefixo],
        ['LimiteTexto', s.limittexto], ['LimitCmd', s.limitcmd],
        ['AutoBan', s.autoban], ['ModoParceria', s.modoparceria],
        ['Simih', s.simih], ['AutoResposta', s.autoresposta],
      ]
      let text = `${botHeader('STATUS DO GRUPO')}\n`
      text += `Grupo: ${groupMeta.subject}\n`
      text += `Membros: ${groupMeta.participants.length}\n`
      text += `Prefixo: ${s.prefix}\n`
      text += `Max Adv: ${s.maxWarnings}\n`
      text += `Cooldown: ${s.cmdCooldown}s\n\n`
      text += `*Funcionalidades:*\n`
      toggles.forEach(([name, val]) => {
        text += `${val ? '[ON]' : '[OFF]'} ${name}\n`
      })
      text += botFooter()
      reply(text)
      break
    }

    // === LOG DE ATIVIDADES ===
    case 'atividades':
    case 'atividade': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const logs = db.getActivityLog(groupId)
      if (logs.length === 0) return reply('Nenhuma atividade registrada.')
      let text = `${botHeader('ATIVIDADES RECENTES')}\n`
      logs.slice(0, 20).forEach(log => {
        text += `[${formatDateBR(log.timestamp)}] ${extractNumber(log.userId)}: ${log.action} ${log.details}\n`
      })
      text += botFooter()
      reply(text)
      break
    }

    // === TOGGLES ON/OFF ===
    case 'bemvindo': { db.toggleGroupSetting(groupId, 'welcome') ? reply('Boas-vindas ativadas.') : reply('Boas-vindas desativadas.'); break }
    case 'bemvindo2': { db.toggleGroupSetting(groupId, 'welcome2') ? reply('Boas-vindas 2 ativadas.') : reply('Boas-vindas 2 desativadas.'); break }
    case 'antilink': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antilink')
      reply(`Antilink ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'advlink': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'advlink')
      reply(`Advertencia por link ${v ? 'ativada' : 'desativada'}.`)
      break
    }
    case 'antilinkgp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antilinkgp')
      reply(`Anti link de grupo ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'advlinkgp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'advlinkgp')
      reply(`Adv link de grupo ${v ? 'ativada' : 'desativada'}.`)
      break
    }
    case 'antifake': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antifake')
      reply(`Antifake ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antiflood': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antiflood')
      reply(`Antiflood ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'advflood': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'advflood')
      reply(`Adv flood ${v ? 'ativada' : 'desativada'}.`)
      break
    }
    case 'antipalavra': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antipalavra')
      reply(`Anti palavrao ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antibots': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antibots')
      reply(`Anti bots ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antimarcar': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antimarcar')
      reply(`Anti marcacao ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antiimg': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antiimg')
      reply(`Anti imagem ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antivideo': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antivideo')
      reply(`Anti video ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antiaudio': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antiaudio')
      reply(`Anti audio ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antidoc': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antidoc')
      reply(`Anti documento ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antisticker': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antisticker')
      reply(`Anti sticker ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'anticatalogo': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'anticatalogo')
      reply(`Anti catalogo ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'anticontato': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'anticontato')
      reply(`Anti contato ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'antiloc': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antiloc')
      reply(`Anti localizacao ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'anti_notas':
    case 'antinotas': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'antinotas')
      reply(`Anti notas ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'anticallgp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'anticall')
      reply(`Anti call ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'so_adm':
    case 'soadm': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'soadm')
      reply(`Modo so admin ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'autobaixar':
    case 'autodl': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'autobaixar')
      reply(`Auto baixar ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'autosticker': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'autosticker')
      reply(`Auto sticker ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'x9viewonce':
    case 'x9visuunica': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'x9viewonce')
      reply(`X9 view once ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'x9adm': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'x9adm')
      reply(`X9 admin ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'multiprefixo':
    case 'multiprefix': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'multiprefixo')
      reply(`Multi prefixo ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'autoban':
    case 'admautoban': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'autoban')
      reply(`Auto ban na lista negra ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'limittexto': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'limittexto')
      reply(`Limite de texto ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'modoparceria': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'modoparceria')
      reply(`Modo parceria ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'simih':
    case 'simih2': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const setting = cmd === 'simih' ? 'simih' : 'simih2'
      const v = db.toggleGroupSetting(groupId, setting)
      reply(`Simi ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'modorpg': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'modoRpg')
      reply(`Modo RPG ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'modogamer': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'modoGamer')
      reply(`Modo Gamer ${v ? 'ativado' : 'desativado'}.`)
      break
    }
    case 'autoresposta': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'autoresposta')
      reply(`Auto resposta ${v ? 'ativada' : 'desativada'}.`)
      break
    }
    case 'nsfw': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const v = db.toggleGroupSetting(groupId, 'nsfw')
      reply(`NSFW ${v ? 'ativado' : 'desativado'}.`)
      break
    }

    // === PALAVRAS PROIBIDAS ===
    case 'addpalavra':
    case 'add_palavra': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!fullArgs) return reply('Informe a palavra. Ex: #addpalavra palavrao')
      db.addBannedWord(groupId, fullArgs)
      reply(`"${fullArgs}" adicionada as palavras proibidas.`)
      break
    }
    case 'delpalavra':
    case 'rm_palavra': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!fullArgs) return reply('Informe a palavra.')
      db.removeBannedWord(groupId, fullArgs)
      reply(`"${fullArgs}" removida das palavras proibidas.`)
      break
    }
    case 'listapalavrao': {
      const words = db.getBannedWords(groupId)
      if (words.length === 0) return reply('Nenhuma palavra proibida configurada.')
      reply(`${botHeader('PALAVRAS PROIBIDAS')}\n${words.join(', ')}${botFooter()}`)
      break
    }
    case 'limparpalavras': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.clearBannedWords(groupId)
      reply('Todas as palavras proibidas foram limpas.')
      break
    }

    // === PREFIXOS ===
    case 'prefixos': {
      const prefixes = db.getGroupPrefixes(groupId)
      const all = [...new Set([...config.prefixes, ...prefixes])]
      reply(`${botHeader('PREFIXOS')}\nPrefixos ativos: ${all.join(' ')}\nMultiprefixo: ${grpSettings.multiprefixo ? 'ON' : 'OFF'}${botFooter()}`)
      break
    }
    case 'add_prefixo': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o prefixo.')
      db.addGroupPrefix(groupId, args[0])
      reply(`Prefixo "${args[0]}" adicionado.`)
      break
    }
    case 'del_prefixo': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o prefixo.')
      db.removeGroupPrefix(groupId, args[0])
      reply(`Prefixo "${args[0]}" removido.`)
      break
    }

    // === LEGENDAS PERSONALIZAVEIS ===
    case 'legendabv': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaBv: fullArgs || 'Seja bem-vindo(a) ao grupo!' })
      reply('Legenda de boas-vindas atualizada.')
      break
    }
    case 'legendasaiu': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaSaiu: fullArgs || 'Saiu do grupo...' })
      reply('Legenda de saida atualizada.')
      break
    }
    case 'legendabv2': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaBv2: fullArgs })
      reply('Legenda de boas-vindas 2 atualizada.')
      break
    }
    case 'legendasaiu2': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaSaiu2: fullArgs })
      reply('Legenda de saida 2 atualizada.')
      break
    }
    case 'legenda_estrangeiro': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaEstrangeiro: fullArgs })
      reply('Legenda de estrangeiro atualizada.')
      break
    }
    case 'legenda_listanegra': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaListanegra: fullArgs })
      reply('Legenda da lista negra atualizada.')
      break
    }
    case 'legenda_imagem': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaImagem: fullArgs })
      reply('Legenda de imagem atualizada.')
      break
    }
    case 'legenda_documento': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaDocumento: fullArgs })
      reply('Legenda de documento atualizada.')
      break
    }
    case 'legenda_video': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { legendaVideo: fullArgs })
      reply('Legenda de video atualizada.')
      break
    }
    case 'setmsgban': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { msgBan: fullArgs })
      reply('Mensagem de ban atualizada.')
      break
    }

    // === LIMITE DE CARACTERES ===
    case 'limitecaracteres':
    case 'limitec':
    case 'setlimitec': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const limit = parseInt(args[0])
      if (!limit || limit < 100) return reply('Informe um limite valido (minimo 100). Ex: #limitec 3000')
      db.updateGroup(groupId, { maxChars: limit })
      reply(`Limite de caracteres definido para ${limit}.`)
      break
    }

    // === COOLDOWN DE COMANDOS ===
    case 'tempocmd':
    case 'cooldowncmd': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const seconds = parseInt(args[0])
      if (!seconds || seconds < 0) return reply('Informe os segundos. Ex: #tempocmd 5')
      db.updateGroup(groupId, { cmdCooldown: seconds })
      reply(`Cooldown de comandos definido para ${seconds}s.`)
      break
    }

    // === BLOQUEAR / LIBERAR COMANDOS ===
    case 'bloquearcmd':
    case 'desativarcmd':
    case 'restringircmd': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o comando. Ex: #bloquearcmd play')
      db.blockCmd(groupId, args[0])
      reply(`Comando "${args[0]}" bloqueado neste grupo.`)
      break
    }
    case 'liberarcmd': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o comando.')
      db.unblockCmd(groupId, args[0])
      reply(`Comando "${args[0]}" liberado.`)
      break
    }

    // === MENSAGENS AGENDADAS ===
    case 'mensagem-automatica': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!fullArgs) return reply('Use: #mensagem-automatica <cron> | <mensagem>\nEx: #mensagem-automatica 0 8 * * * | Bom dia!')
      const parts = fullArgs.split('|').map(s => s.trim())
      if (parts.length < 2) return reply('Formato: <cron> | <mensagem>')
      const [cronExpr, message] = parts
      db.addScheduledMessage(groupId, message, cronExpr, 'recurring', '', sender)
      reply(`Mensagem agendada com sucesso!\nCron: ${cronExpr}\nMsg: ${message}`)
      break
    }
    case 'listar-mensagens-automaticas':
    case 'mensagens-agendadas': {
      const scheduled = db.getScheduledMessages(groupId)
      if (scheduled.length === 0) return reply('Nenhuma mensagem agendada.')
      let text = `${botHeader('MENSAGENS AGENDADAS')}\n`
      scheduled.forEach((s, i) => {
        text += `${i + 1}. [ID: ${s.odId}] ${s.cronExpression} - ${s.message.substring(0, 50)}...\n`
      })
      text += botFooter()
      reply(text)
      break
    }
    case 'limpar-mensagens-automaticas':
    case 'limpar-agendadas': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.clearScheduledMessages(groupId)
      reply('Todas as mensagens agendadas foram removidas.')
      break
    }

    // === OPEN/CLOSE GP HORARIO ===
    case 'opengp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o horario. Ex: #opengp 06:00')
      db.updateGroup(groupId, { openHour: args[0] })
      reply(`Grupo abrira automaticamente as ${args[0]}.`)
      break
    }
    case 'closegp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o horario. Ex: #closegp 22:00')
      db.updateGroup(groupId, { closeHour: args[0] })
      reply(`Grupo fechara automaticamente as ${args[0]}.`)
      break
    }
    case 'rm_opengp':
    case 'tirar-fechar-abrirgp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.updateGroup(groupId, { openHour: '', closeHour: '' })
      reply('Horarios automaticos removidos.')
      break
    }

    // === PARCERIAS ===
    case 'add_parceria': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o link/id do grupo parceiro.')
      db.addPartnership(groupId, args[0], sender)
      reply('Parceria adicionada!')
      break
    }
    case 'del_parceria': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o grupo parceiro.')
      db.removePartnership(groupId, args[0])
      reply('Parceria removida.')
      break
    }
    case 'parceria': {
      const partners = db.getPartnerships(groupId)
      if (partners.length === 0) return reply('Nenhuma parceria registrada.')
      let text = `${botHeader('PARCERIAS')}\n`
      partners.forEach((p, i) => { text += `${i + 1}. ${p.partnerGroup}\n` })
      text += botFooter()
      reply(text)
      break
    }

    // === GOLD ADMIN ===
    case 'zerar_gold': {
      if (!isOwner(sender)) return reply('Apenas a dona.')
      db.resetGold(groupId)
      reply('Gold de todos os membros zerado.')
      break
    }
    case 'addgold': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const target = getTarget()
      const amount = parseInt(args.find(a => !isNaN(a))) || 100
      if (!target) return reply('Marque alguem. Ex: #addgold @user 500')
      db.addGold(groupId, target, amount)
      await replyMentions(`${mention(target)} recebeu ${amount} gold!`, [target])
      break
    }
    case 'addxp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const target = getTarget()
      const amount = parseInt(args.find(a => !isNaN(a))) || 100
      if (!target) return reply('Marque alguem. Ex: #addxp @user 500')
      db.addXp(groupId, target, amount)
      await replyMentions(`${mention(target)} recebeu ${amount} XP!`, [target])
      break
    }
    case 'resetlevel': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      db.resetLevels(groupId)
      reply('Niveis e XP de todos foram resetados.')
      break
    }
    case 'zerarrank': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      reply('Rank resetado.')
      break
    }

    // === BROADCAST ===
    case 'bc':
    case 'bcgp':
    case 'divmsg': {
      if (!isOwner(sender)) return reply('Apenas a dona.')
      if (!fullArgs) return reply('Informe a mensagem.')
      try {
        const groups = await sock.groupFetchAllParticipating()
        let count = 0
        for (const gid of Object.keys(groups)) {
          try {
            await sock.sendMessage(gid, { text: `${botHeader('COMUNICADO')}\n${fullArgs}${botFooter()}` })
            count++
          } catch {}
        }
        reply(`Mensagem enviada para ${count} grupos.`)
      } catch (e) {
        reply('Erro: ' + e.message)
      }
      break
    }

    // === JOIN / SAIR ===
    case 'join': {
      if (!isOwner(sender)) return reply('Apenas a dona.')
      if (!args[0]) return reply('Informe o link do grupo.')
      const link = args[0].replace('https://chat.whatsapp.com/', '')
      try {
        await sock.groupAcceptInvite(link)
        reply('Entrei no grupo!')
      } catch (e) {
        reply('Nao consegui entrar: ' + e.message)
      }
      break
    }
    case 'sairgp':
    case 'exitgp':
    case 'sairdogp': {
      if (!isOwner(sender)) return reply('Apenas a dona.')
      await reply('Saindo do grupo...')
      await sock.groupLeave(groupId)
      break
    }

    // === PERMISSOES ===
    case 'permissoes': {
      reply(`${botHeader('PERMISSOES')}\n` +
        'Nivel 0 - Membro: Comandos basicos\n' +
        'Nivel 1 - Auxiliar: Moderacao leve\n' +
        'Nivel 2 - Moderador: Moderacao completa\n' +
        'Nivel 3 - Admin: Gerenciamento total\n' +
        'Nivel 4 - Dona: Acesso absoluto\n' +
        `\nSeu nivel: ${permLevel}${botFooter()}`)
      break
    }

    // === COMANDOS COM GOLD ===
    case 'addcmdgold': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (args.length < 2) return reply('Use: #addcmdgold <cmd> <custo>')
      db.addGoldCmd(groupId, args[0], parseInt(args[1]) || 0)
      reply(`Comando "${args[0]}" agora custa ${args[1]} gold.`)
      break
    }
    case 'rmcmdgold':
    case 'delcmdgold': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      if (!args[0]) return reply('Informe o comando.')
      db.removeGoldCmd(groupId, args[0])
      reply(`Custo gold removido do comando "${args[0]}".`)
      break
    }

    // === REGRAS ===
    case 'regras': {
      const desc = groupMeta.desc || 'Sem descricao/regras definidas.'
      reply(`${botHeader('REGRAS DO GRUPO')}\n${desc}${botFooter()}`)
      break
    }

    // === CATCH ALL (toggles nao implementados) ===
    default: {
      reply(`Comando admin "${cmd}" recebido. Em desenvolvimentoo.`)
    }
  }
}
