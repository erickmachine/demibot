// ============================================================
//  SISTEMA DE GOLD (moeda virtual)
//  Mineracao, apostas, cassino, loja, ranking, etc.
// ============================================================
import config from '../config.js'
import * as db from '../lib/database.js'
import { mention, extractNumber, botHeader, botFooter, canExecute, randomChoice, isOwner } from '../lib/utils.js'

// Cooldowns em memoria
const cooldowns = {
  mineracao: new Map(),
  daily: new Map(),
  roubo: new Map(),
}

function isOnCooldown(map, key, seconds) {
  const last = map.get(key) || 0
  const now = Date.now()
  if (now - last < seconds * 1000) {
    return { on: true, remaining: Math.ceil((seconds * 1000 - (now - last)) / 1000) }
  }
  map.set(key, now)
  return { on: false }
}

export async function handleGold(ctx) {
  const { sock, msg, rawMsg, cmd, args, fullArgs, groupId, sender,
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
    //  VER GOLD
    // ================================================================
    case 'gold': {
      const target = getTarget() || sender
      const member = db.getMember(groupId, target)
      reply(`${botHeader('GOLD')}\n${mention(target)}\n\nSaldo: *${member.gold || 0}* gold\nNivel: ${member.level || 1}\nXP: ${member.xp || 0}${botFooter()}`)
      break
    }

    // ================================================================
    //  RANKING GOLD
    // ================================================================
    case 'rankgold': {
      const ranking = db.getGoldRanking(groupId)
      if (ranking.length === 0) return reply('Nenhum membro com gold.')
      let text = `${botHeader('RANKING GOLD')}\n`
      const medals = ['🥇', '🥈', '🥉']
      const mentions = []
      ranking.slice(0, 15).forEach((m, i) => {
        const medal = medals[i] || `${i + 1}.`
        text += `${medal} ${mention(m.userId)} - ${m.gold} gold\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  DOAR GOLD
    // ================================================================
    case 'doargold': {
      const target = getTarget()
      if (!target) return reply('Marque alguem. Ex: #doargold @user 100')
      if (target === sender) return reply('Nao pode doar para si mesmo.')
      const amount = parseInt(args.find(a => !a.startsWith('@')) || args[1])
      if (!amount || amount <= 0) return reply('Informe a quantidade. Ex: #doargold @user 100')
      const senderMember = db.getMember(groupId, sender)
      if ((senderMember.gold || 0) < amount) return reply(`Gold insuficiente. Voce tem ${senderMember.gold || 0} gold.`)
      db.addGold(groupId, sender, -amount)
      db.addGold(groupId, target, amount)
      await replyMentions(
        `${botHeader('DOACAO')}\n${mention(sender)} doou *${amount} gold* para ${mention(target)}!${botFooter()}`,
        [sender, target]
      )
      break
    }

    // ================================================================
    //  MINERAR GOLD
    // ================================================================
    case 'minerar_gold': {
      const cd = isOnCooldown(cooldowns.mineracao, `${groupId}_${sender}`, 300) // 5 min
      if (cd.on) return reply(`Aguarde ${cd.remaining}s para minerar novamente.`)
      const amount = Math.floor(Math.random() * 50) + 10
      db.addGold(groupId, sender, amount)
      const member = db.getMember(groupId, sender)
      const msgs = [
        `Voce minerou *${amount} gold*! ⛏️`,
        `Encontrou *${amount} gold* na mina! 💰`,
        `A mineracao rendeu *${amount} gold*! 🪨`,
      ]
      reply(`${botHeader('MINERACAO')}\n${randomChoice(msgs)}\nSaldo: ${member.gold} gold${botFooter()}`)
      break
    }

    // ================================================================
    //  ROUBAR GOLD
    // ================================================================
    case 'roubargold': {
      const target = getTarget()
      if (!target) return reply('Marque alguem para roubar.')
      if (target === sender) return reply('Nao pode roubar de si mesmo.')
      const cd = isOnCooldown(cooldowns.roubo, `${groupId}_${sender}`, 600) // 10 min
      if (cd.on) return reply(`Aguarde ${cd.remaining}s para roubar novamente.`)
      const success = Math.random() < 0.4 // 40% de chance
      if (success) {
        const targetMember = db.getMember(groupId, target)
        const maxSteal = Math.min(targetMember.gold || 0, 50)
        if (maxSteal <= 0) return reply('A vitima nao tem gold para roubar!')
        const amount = Math.floor(Math.random() * maxSteal) + 1
        db.addGold(groupId, target, -amount)
        db.addGold(groupId, sender, amount)
        await replyMentions(
          `${botHeader('ROUBO')}\n${mention(sender)} roubou *${amount} gold* de ${mention(target)}! 🦹${botFooter()}`,
          [sender, target]
        )
      } else {
        const penalty = Math.floor(Math.random() * 30) + 5
        db.addGold(groupId, sender, -penalty)
        await replyMentions(
          `${botHeader('ROUBO FALHOU')}\n${mention(sender)} tentou roubar ${mention(target)} mas foi pego!\nPerdeu *${penalty} gold* de multa! 👮${botFooter()}`,
          [sender, target]
        )
      }
      break
    }

    // ================================================================
    //  VINGANCA GOLD
    // ================================================================
    case 'vingancagold': {
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      const success = Math.random() < 0.5
      if (success) {
        const amount = Math.floor(Math.random() * 40) + 10
        db.addGold(groupId, target, -amount)
        db.addGold(groupId, sender, amount)
        await replyMentions(`${botHeader('VINGANCA')}\n${mention(sender)} se vingou de ${mention(target)} e pegou *${amount} gold*! ⚔️${botFooter()}`, [sender, target])
      } else {
        reply(`${mention(sender)} tentou vinganca mas falhou miseravelmente!`)
      }
      break
    }

    // ================================================================
    //  DAILY (recompensa diaria)
    // ================================================================
    case 'daily': {
      const cd = isOnCooldown(cooldowns.daily, `${groupId}_${sender}`, 86400) // 24h
      if (cd.on) {
        const hours = Math.floor(cd.remaining / 3600)
        const mins = Math.floor((cd.remaining % 3600) / 60)
        return reply(`Voce ja coletou seu daily hoje! Volte em ${hours}h ${mins}min.`)
      }
      const amount = Math.floor(Math.random() * 100) + 50
      db.addGold(groupId, sender, amount)
      const member = db.getMember(groupId, sender)
      reply(`${botHeader('DAILY')}\nVoce coletou *${amount} gold*! 🎁\nSaldo: ${member.gold} gold${botFooter()}`)
      break
    }

    // ================================================================
    //  CASSINO
    // ================================================================
    case 'cassino':
    case 'apostargold': {
      const amount = parseInt(args[0])
      if (!amount || amount <= 0) return reply('Informe a aposta. Ex: #cassino 50')
      const member = db.getMember(groupId, sender)
      if ((member.gold || 0) < amount) return reply(`Gold insuficiente. Voce tem ${member.gold} gold.`)
      const slots = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐']
      const r1 = randomChoice(slots)
      const r2 = randomChoice(slots)
      const r3 = randomChoice(slots)
      let multiplier = 0
      let result = 'Perdeu!'
      if (r1 === r2 && r2 === r3) {
        multiplier = r1 === '💎' ? 10 : r1 === '7️⃣' ? 7 : 5
        result = `JACKPOT! x${multiplier}!`
      } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        multiplier = 2
        result = 'Par! x2!'
      }
      const winnings = amount * multiplier
      const net = winnings - amount
      db.addGold(groupId, sender, net)
      const newMember = db.getMember(groupId, sender)
      reply(`${botHeader('CASSINO')}\n\n| ${r1} | ${r2} | ${r3} |\n\n${multiplier > 0 ? `*${result}* Ganhou ${winnings} gold!` : `*${result}* Perdeu ${amount} gold.`}\nSaldo: ${newMember.gold} gold${botFooter()}`)
      break
    }

    // ================================================================
    //  DOUBLE GOLD
    // ================================================================
    case 'doublegold': {
      const amount = parseInt(args[0])
      if (!amount || amount <= 0) return reply('Informe a aposta. Ex: #doublegold 50')
      const member = db.getMember(groupId, sender)
      if ((member.gold || 0) < amount) return reply('Gold insuficiente.')
      const win = Math.random() < 0.45 // 45% chance
      if (win) {
        db.addGold(groupId, sender, amount)
        reply(`${botHeader('DOUBLE')}\n*VERDE!* 🟢\nVoce dobrou e ganhou *${amount * 2} gold*!\nSaldo: ${(member.gold || 0) + amount} gold${botFooter()}`)
      } else {
        db.addGold(groupId, sender, -amount)
        reply(`${botHeader('DOUBLE')}\n*VERMELHO!* 🔴\nPerdeu *${amount} gold*.\nSaldo: ${(member.gold || 0) - amount} gold${botFooter()}`)
      }
      break
    }

    // ================================================================
    //  JACKPOT GOLD
    // ================================================================
    case 'jackpotgold': {
      const amount = parseInt(args[0])
      if (!amount || amount <= 0) return reply('Informe a aposta. Ex: #jackpotgold 100')
      const member = db.getMember(groupId, sender)
      if ((member.gold || 0) < amount) return reply('Gold insuficiente.')
      const roll = Math.random()
      let multiplier = 0
      let emoji = ''
      if (roll < 0.01) { multiplier = 50; emoji = '💎💎💎' }
      else if (roll < 0.05) { multiplier = 10; emoji = '⭐⭐⭐' }
      else if (roll < 0.15) { multiplier = 3; emoji = '🍒🍒🍒' }
      else if (roll < 0.35) { multiplier = 1.5; emoji = '🍋🍋' }
      const net = Math.floor(amount * multiplier) - amount
      db.addGold(groupId, sender, net)
      if (multiplier > 0) {
        reply(`${botHeader('JACKPOT')}\n${emoji}\n*x${multiplier}!* Ganhou ${Math.floor(amount * multiplier)} gold!\nSaldo: ${(member.gold || 0) + net} gold${botFooter()}`)
      } else {
        db.addGold(groupId, sender, -amount)
        reply(`${botHeader('JACKPOT')}\n😢\nPerdeu *${amount} gold*.\nSaldo: ${(member.gold || 0) - amount} gold${botFooter()}`)
      }
      break
    }

    // ================================================================
    //  ROLETA DA SORTE
    // ================================================================
    case 'roletadasorte': {
      const amount = parseInt(args[0]) || 10
      const member = db.getMember(groupId, sender)
      if ((member.gold || 0) < amount) return reply('Gold insuficiente.')
      const prizes = [
        { label: '0 gold', mult: 0, weight: 30 },
        { label: 'x1 (empate)', mult: 1, weight: 25 },
        { label: 'x2', mult: 2, weight: 20 },
        { label: 'x3', mult: 3, weight: 12 },
        { label: 'x5', mult: 5, weight: 8 },
        { label: 'x10', mult: 10, weight: 4 },
        { label: 'JACKPOT x25', mult: 25, weight: 1 },
      ]
      const totalWeight = prizes.reduce((s, p) => s + p.weight, 0)
      let rand = Math.random() * totalWeight
      let chosen = prizes[0]
      for (const prize of prizes) {
        rand -= prize.weight
        if (rand <= 0) { chosen = prize; break }
      }
      const net = Math.floor(amount * chosen.mult) - amount
      db.addGold(groupId, sender, net)
      reply(`${botHeader('ROLETA DA SORTE')}\n\n🎰 *${chosen.label}*\n${net >= 0 ? `Ganhou ${Math.floor(amount * chosen.mult)} gold!` : `Perdeu ${amount} gold.`}\nSaldo: ${(member.gold || 0) + net} gold${botFooter()}`)
      break
    }

    // ================================================================
    //  AVIATOR GOLD
    // ================================================================
    case 'aviatorgold': {
      const amount = parseInt(args[0])
      if (!amount || amount <= 0) return reply('Informe a aposta. Ex: #aviatorgold 50')
      const member = db.getMember(groupId, sender)
      if ((member.gold || 0) < amount) return reply('Gold insuficiente.')
      const multiplier = (Math.random() * 5 + 0.1).toFixed(2)
      const crash = (Math.random() * 5 + 0.5).toFixed(2)
      if (parseFloat(multiplier) < parseFloat(crash)) {
        const winnings = Math.floor(amount * parseFloat(multiplier))
        db.addGold(groupId, sender, winnings - amount)
        reply(`${botHeader('AVIATOR')}\n✈️ Voou ate *${multiplier}x*!\nCrash em ${crash}x\n\n*Ganhou ${winnings} gold!*\nSaldo: ${(member.gold || 0) + (winnings - amount)} gold${botFooter()}`)
      } else {
        db.addGold(groupId, sender, -amount)
        reply(`${botHeader('AVIATOR')}\n💥 Crash em *${crash}x*!\nVoce saiu em ${multiplier}x\n\n*Perdeu ${amount} gold.*\nSaldo: ${(member.gold || 0) - amount} gold${botFooter()}`)
      }
      break
    }

    // ================================================================
    //  CAIXA MISTERIOSA
    // ================================================================
    case 'caixamisteriosagold': {
      const cost = 30
      const member = db.getMember(groupId, sender)
      if ((member.gold || 0) < cost) return reply(`Custo: ${cost} gold. Voce tem ${member.gold || 0}.`)
      const prizes = [
        { label: '10 gold', amount: 10 },
        { label: '25 gold', amount: 25 },
        { label: '50 gold', amount: 50 },
        { label: '100 gold', amount: 100 },
        { label: '0 gold (caixa vazia)', amount: 0 },
        { label: '-20 gold (armadilha!)', amount: -20 },
        { label: '200 gold (raro!)', amount: 200 },
      ]
      const prize = randomChoice(prizes)
      const net = prize.amount - cost
      db.addGold(groupId, sender, net)
      reply(`${botHeader('CAIXA MISTERIOSA')}\n📦 Voce abriu a caixa e encontrou...\n\n*${prize.label}!*\nSaldo: ${(member.gold || 0) + net} gold${botFooter()}`)
      break
    }

    // ================================================================
    //  QUIZ NUMERO
    // ================================================================
    case 'quiznumero': {
      const number = Math.floor(Math.random() * 10) + 1
      reply(`${botHeader('QUIZ')}\n\nAdivinhe o numero de 1 a 10!\nAposte com: #sequenciagold <numero> <valor>\n\n(O numero sera revelado com a aposta)${botFooter()}`)
      // Armazenamos em gold map temp
      const key = `${groupId}_quiz`
      cooldowns.mineracao.set(key, number) // reusando o map
      break
    }

    // ================================================================
    //  SORTEIOGOLD
    // ================================================================
    case 'sorteiogold': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const amount = parseInt(args[0]) || 50
      const participants = groupMeta.participants.map(p => p.id)
      const winner = randomChoice(participants)
      db.addGold(groupId, winner, amount)
      await replyMentions(
        `${botHeader('SORTEIO GOLD')}\n\nO sorteado foi: ${mention(winner)}!\nGanhou *${amount} gold*!${botFooter()}`,
        [winner]
      )
      break
    }

    // ================================================================
    //  LOJA GOLD
    // ================================================================
    case 'lojagold': {
      reply(`${botHeader('LOJA GOLD')}\n` +
        `1. VIP por 1 dia - 500 gold\n` +
        `2. Premium por 1 dia - 1000 gold\n` +
        `3. Figurinha exclusiva - 200 gold\n` +
        `4. Titulo personalizado - 300 gold\n` +
        `5. Cargo VIP no grupo - 800 gold\n\n` +
        `Use: #ccgold <numero> para comprar${botFooter()}`)
      break
    }

    case 'ccgold': {
      const item = parseInt(args[0])
      const member = db.getMember(groupId, sender)
      const prices = { 1: 500, 2: 1000, 3: 200, 4: 300, 5: 800 }
      const names = { 1: 'VIP 1 dia', 2: 'Premium 1 dia', 3: 'Figurinha exclusiva', 4: 'Titulo personalizado', 5: 'Cargo VIP' }
      if (!prices[item]) return reply('Item invalido. Veja #lojagold')
      if ((member.gold || 0) < prices[item]) return reply(`Gold insuficiente. Precisa de ${prices[item]} gold.`)
      db.addGold(groupId, sender, -prices[item])
      if (item === 1 || item === 2) {
        const type = item === 1 ? 'vip' : 'premium'
        db.updateMember(groupId, sender, { [type]: 1 })
      }
      reply(`${botHeader('COMPRA')}\nVoce comprou: *${names[item]}*!\nCusto: ${prices[item]} gold\nSaldo: ${(member.gold || 0) - prices[item]} gold${botFooter()}`)
      break
    }

    // ================================================================
    //  PREMIUM
    // ================================================================
    case 'premium':
    case 'serpremium': {
      const member = db.getMember(groupId, sender)
      reply(`${botHeader('PREMIUM')}\n${mention(sender)}\nStatus: ${member.premium ? 'PREMIUM ⭐' : 'Normal'}\n\nCompre premium na #lojagold ou fale com a dona.${botFooter()}`)
      break
    }

    // ================================================================
    //  ADD GOLD (admin)
    // ================================================================
    case 'addgold': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3) && !isOwner(sender)) return reply('Apenas admins/dona.')
      const target = getTarget()
      if (!target) return reply('Marque alguem. Ex: #addgold @user 100')
      const amount = parseInt(args.find(a => !a.startsWith('@')) || args[1])
      if (!amount) return reply('Informe a quantidade.')
      db.addGold(groupId, target, amount)
      const member = db.getMember(groupId, target)
      await replyMentions(`${mention(target)} recebeu *${amount} gold*. Saldo: ${member.gold}`, [target])
      break
    }

    // ================================================================
    //  ADD XP (admin)
    // ================================================================
    case 'addxp': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3) && !isOwner(sender)) return reply('Apenas admins/dona.')
      const target = getTarget()
      if (!target) return reply('Marque alguem. Ex: #addxp @user 50')
      const amount = parseInt(args.find(a => !a.startsWith('@')) || args[1])
      if (!amount) return reply('Informe a quantidade.')
      db.addXp(groupId, target, amount)
      const member = db.getMember(groupId, target)
      await replyMentions(`${mention(target)} recebeu *${amount} XP*. Level: ${member.level} | XP: ${member.xp}`, [target])
      break
    }

    // ================================================================
    //  ZERAR GOLD (admin)
    // ================================================================
    case 'zerar_gold': {
      if (!canExecute(groupId, sender, isGroupAdmin, 3)) return reply('Apenas admins.')
      const target = getTarget()
      if (target) {
        db.updateMember(groupId, target, { gold: 0 })
        await replyMentions(`Gold de ${mention(target)} zerado.`, [target])
      } else {
        reply('Marque alguem para zerar o gold.')
      }
      break
    }

    // ================================================================
    //  BOLAO GOLD
    // ================================================================
    case 'bolaogold': {
      reply(`${botHeader('BOLAO GOLD')}\nFuncao em desenvolvimento. Em breve!\nDica: Junte-se com amigos e apostem juntos.${botFooter()}`)
      break
    }

    // ================================================================
    //  RANKING JOGOS GOLD
    // ================================================================
    case 'rankingjogosgold': {
      const ranking = db.getGoldRanking(groupId)
      if (ranking.length === 0) return reply('Ranking vazio.')
      let text = `${botHeader('RANKING JOGOS GOLD')}\n`
      const mentions = []
      ranking.slice(0, 10).forEach((m, i) => {
        text += `${i + 1}. ${mention(m.userId)} - ${m.gold} gold | Lvl ${m.level}\n`
        mentions.push(m.userId)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    default:
      reply(`Comando gold "${cmd}" em desenvolvimento.`)
  }
}
