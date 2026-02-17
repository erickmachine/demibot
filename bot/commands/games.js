// ============================================================
//  COMANDOS DE JOGOS E BRINCADEIRAS
//  PPT, Damas, Jogo da Velha, Forca, Roleta, Duelos, etc.
// ============================================================
import config from '../config.js'
import * as db from '../lib/database.js'
import { mention, extractNumber, botHeader, botFooter, canExecute, randomChoice, formatJid } from '../lib/utils.js'

// Estado em memoria para jogos ativos
const activeGames = {
  ppt: new Map(),       // pedra papel tesoura
  velha: new Map(),     // jogo da velha
  forca: new Map(),     // forca
  damas: new Map(),     // damas
  duelos: new Map(),    // duelos
  votacoes: new Map(),  // votacoes
  casamentos: new Map(),
}

// ====== HELPERS ======
const pptEmoji = { pedra: '✊', papel: '✋', tesoura: '✌️' }
const pptWin = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' }

function velhaBoard(board) {
  const symbols = { 'X': '❌', 'O': '⭕', '': '⬜' }
  let text = ''
  for (let i = 0; i < 9; i += 3) {
    text += `${symbols[board[i]] || (i + 1)} ${symbols[board[i + 1]] || (i + 2)} ${symbols[board[i + 2]] || (i + 3)}\n`
  }
  return text
}

function checkVelhaWinner(board) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  if (board.every(cell => cell !== '')) return 'empate'
  return null
}

export async function handleGames(ctx) {
  const { sock, msg, rawMsg, cmd, args, fullArgs, groupId, sender,
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
    //  PEDRA PAPEL TESOURA
    // ================================================================
    case 'ppt': {
      const choice = args[0]?.toLowerCase()
      if (!['pedra', 'papel', 'tesoura'].includes(choice)) {
        return reply('Use: #ppt pedra/papel/tesoura')
      }
      const botChoice = randomChoice(['pedra', 'papel', 'tesoura'])
      let result
      if (choice === botChoice) {
        result = 'Empate!'
      } else if (pptWin[choice] === botChoice) {
        result = 'Voce ganhou!'
        db.addGold(groupId, sender, 5)
      } else {
        result = 'Voce perdeu!'
      }
      reply(`${botHeader('PEDRA PAPEL TESOURA')}\nVoce: ${pptEmoji[choice]} ${choice}\nBot: ${pptEmoji[botChoice]} ${botChoice}\n\n*${result}*${botFooter()}`)
      break
    }

    // PPT contra outro jogador
    case 'ppt2': {
      const target = getTarget()
      if (!target) return reply('Marque alguem para jogar. Ex: #ppt2 @user')
      const gameKey = `${groupId}_ppt`
      const existing = activeGames.ppt.get(gameKey)
      if (existing && existing.player2 === sender && !existing.choice2) {
        const choice = args[1]?.toLowerCase() || args[0]?.toLowerCase()
        if (!['pedra', 'papel', 'tesoura'].includes(choice)) return reply('Escolha: pedra/papel/tesoura')
        existing.choice2 = choice
        const c1 = existing.choice1
        const c2 = existing.choice2
        let result
        if (c1 === c2) {
          result = 'Empate!'
        } else if (pptWin[c1] === c2) {
          result = `${mention(existing.player1)} ganhou!`
          db.addGold(groupId, existing.player1, 10)
        } else {
          result = `${mention(existing.player2)} ganhou!`
          db.addGold(groupId, existing.player2, 10)
        }
        await replyMentions(
          `${botHeader('PPT - RESULTADO')}\n${mention(existing.player1)}: ${pptEmoji[c1]}\n${mention(existing.player2)}: ${pptEmoji[c2]}\n\n*${result}*${botFooter()}`,
          [existing.player1, existing.player2]
        )
        activeGames.ppt.delete(gameKey)
      } else {
        const choice = args[1]?.toLowerCase()
        if (!['pedra', 'papel', 'tesoura'].includes(choice)) return reply('Use: #ppt2 @user pedra/papel/tesoura')
        activeGames.ppt.set(gameKey, { player1: sender, player2: target, choice1: choice, choice2: null })
        await replyMentions(
          `${botHeader('PPT')}\n${mention(sender)} desafiou ${mention(target)}!\n${mention(target)}, responda com: #ppt2 @desafiante pedra/papel/tesoura${botFooter()}`,
          [sender, target]
        )
      }
      break
    }

    // ================================================================
    //  JOGO DA VELHA
    // ================================================================
    case 'jogodavelha': {
      const target = getTarget()
      if (!target) return reply('Marque alguem para jogar. Ex: #jogodavelha @user')
      if (target === sender) return reply('Voce nao pode jogar contra si mesmo.')
      const gameKey = `${groupId}_velha`
      if (activeGames.velha.has(gameKey)) return reply('Ja existe um jogo ativo. Terminem o atual primeiro.')
      const board = Array(9).fill('')
      activeGames.velha.set(gameKey, { player1: sender, player2: target, board, turn: sender, symbol1: 'X', symbol2: 'O' })
      await replyMentions(
        `${botHeader('JOGO DA VELHA')}\n${mention(sender)} (X) vs ${mention(target)} (O)\n\n${velhaBoard(board)}\n${mention(sender)}, sua vez! Use: #jv <1-9>${botFooter()}`,
        [sender, target]
      )
      break
    }

    // Jogada do jogo da velha (comando interno)
    // O usuario digita o numero no chat e o index.js redireciona para ca
    // Mas como comando: pode ser #jv 5
    case 'jv': {
      const gameKey = `${groupId}_velha`
      const game = activeGames.velha.get(gameKey)
      if (!game) return reply('Nenhum jogo da velha ativo. Inicie com #jogodavelha @user')
      if (sender !== game.turn) return reply('Nao e sua vez!')
      const pos = parseInt(args[0]) - 1
      if (isNaN(pos) || pos < 0 || pos > 8) return reply('Escolha uma posicao de 1 a 9.')
      if (game.board[pos] !== '') return reply('Posicao ja ocupada!')
      const symbol = sender === game.player1 ? game.symbol1 : game.symbol2
      game.board[pos] = symbol
      const winner = checkVelhaWinner(game.board)
      if (winner) {
        activeGames.velha.delete(gameKey)
        if (winner === 'empate') {
          await replyMentions(`${botHeader('JOGO DA VELHA')}\n${velhaBoard(game.board)}\n*EMPATE!*${botFooter()}`, [game.player1, game.player2])
        } else {
          const winnerJid = winner === game.symbol1 ? game.player1 : game.player2
          db.addGold(groupId, winnerJid, 15)
          await replyMentions(
            `${botHeader('JOGO DA VELHA')}\n${velhaBoard(game.board)}\n*${mention(winnerJid)} venceu!* (+15 gold)${botFooter()}`,
            [game.player1, game.player2]
          )
        }
      } else {
        game.turn = sender === game.player1 ? game.player2 : game.player1
        const nextSymbol = game.turn === game.player1 ? game.symbol1 : game.symbol2
        await replyMentions(
          `${botHeader('JOGO DA VELHA')}\n${velhaBoard(game.board)}\n${mention(game.turn)} (${nextSymbol}), sua vez! Use: #jv <1-9>${botFooter()}`,
          [game.turn]
        )
      }
      break
    }

    // ================================================================
    //  FORCA
    // ================================================================
    case 'iniciar_forca': {
      const gameKey = `${groupId}_forca`
      if (activeGames.forca.has(gameKey)) return reply('Ja existe um jogo de forca ativo!')
      const palavras = [
        'ABACAXI', 'BORBOLETA', 'CHOCOLATE', 'DINOSSAURO', 'ELEFANTE',
        'FUTEBOL', 'GUITARRA', 'HORIZONTE', 'INTERNET', 'JACARANDA',
        'KARAOKE', 'LABIRINTO', 'MACARRONADA', 'NATUREZA', 'ORQUIDEA',
        'PARABENS', 'QUEIJO', 'RELAMPAGO', 'SAUDADE', 'TARTARUGA',
        'UNIVERSO', 'VAGALUME', 'XADREZ', 'ZOOLOGICO', 'DIAMANTE',
        'ASTRONAUTA', 'BICICLETA', 'COMPUTADOR', 'DESMISTIFICAR',
      ]
      const word = randomChoice(palavras)
      const game = {
        word,
        guessed: [],
        wrong: 0,
        maxWrong: 6,
        display: word.split('').map(() => '_'),
      }
      activeGames.forca.set(gameKey, game)
      const hangman = ['', '😐', '😟', '😨', '😰', '😱', '💀']
      reply(`${botHeader('FORCA')}\n${hangman[0]} Vidas: ${'❤️'.repeat(6)}\n\n${game.display.join(' ')}\n\nDigite #rv-forca <letra> para jogar!${botFooter()}`)
      break
    }

    case 'rv-forca':
    case 'rv': {
      const gameKey = `${groupId}_forca`
      const game = activeGames.forca.get(gameKey)
      if (!game) return reply('Nenhum jogo de forca ativo. Use #iniciar_forca')
      const letter = args[0]?.toUpperCase()
      if (!letter || letter.length !== 1 || !/[A-Z]/.test(letter)) return reply('Informe uma letra valida.')
      if (game.guessed.includes(letter)) return reply(`Letra "${letter}" ja foi usada!`)
      game.guessed.push(letter)
      const hangman = ['', '😐', '😟', '😨', '😰', '😱', '💀']
      if (game.word.includes(letter)) {
        game.word.split('').forEach((l, i) => {
          if (l === letter) game.display[i] = letter
        })
        if (!game.display.includes('_')) {
          activeGames.forca.delete(gameKey)
          db.addGold(groupId, sender, 20)
          return reply(`${botHeader('FORCA - VITORIA!')}\n\n${game.display.join(' ')}\n\nPalavra: *${game.word}*\n${mention(sender)} acertou! (+20 gold)${botFooter()}`)
        }
        reply(`${botHeader('FORCA')}\n${hangman[game.wrong]} Vidas: ${'❤️'.repeat(6 - game.wrong)}${'🖤'.repeat(game.wrong)}\n\n${game.display.join(' ')}\n\nLetras usadas: ${game.guessed.join(', ')}${botFooter()}`)
      } else {
        game.wrong++
        if (game.wrong >= game.maxWrong) {
          activeGames.forca.delete(gameKey)
          return reply(`${botHeader('FORCA - GAME OVER')}\n${hangman[6]}\n\nA palavra era: *${game.word}*${botFooter()}`)
        }
        reply(`${botHeader('FORCA')}\n${hangman[game.wrong]} Vidas: ${'❤️'.repeat(6 - game.wrong)}${'🖤'.repeat(game.wrong)}\n\n${game.display.join(' ')}\n\nLetras usadas: ${game.guessed.join(', ')}${botFooter()}`)
      }
      break
    }

    // ================================================================
    //  ROLETA RUSSA
    // ================================================================
    case 'roleta': {
      const bullet = Math.floor(Math.random() * 6)
      const shot = Math.floor(Math.random() * 6)
      if (bullet === shot) {
        reply(`${botHeader('ROLETA RUSSA')}\n*BANG!* 💥🔫\n${mention(sender)} levou um tiro!${botFooter()}`)
      } else {
        reply(`${botHeader('ROLETA RUSSA')}\n*Click!* 🔫\n${mention(sender)} sobreviveu! (${6 - 1}/6 chances)${botFooter()}`)
      }
      break
    }

    // ================================================================
    //  FAKE MSG
    // ================================================================
    case 'fakemsg': {
      const target = getTarget()
      if (!target) return reply('Marque alguem e escreva a mensagem fake. Ex: #fakemsg @user mensagem')
      const fakeText = fullArgs.replace(/@\d+/g, '').trim()
      if (!fakeText) return reply('Escreva a mensagem fake.')
      await sock.sendMessage(groupId, {
        text: fakeText,
        mentions: [target],
      }, {
        quoted: {
          key: { remoteJid: groupId, fromMe: false, id: '', participant: target },
          message: { conversation: '' },
        }
      })
      break
    }

    // ================================================================
    //  EU JA / EU NUNCA
    // ================================================================
    case 'eujaeununca': {
      const perguntas = [
        'Eu ja dormi em sala de aula',
        'Eu nunca menti para minha mae',
        'Eu ja fingi estar doente para nao ir na escola',
        'Eu nunca fui pego colando',
        'Eu ja mandei mensagem para a pessoa errada',
        'Eu nunca stalkei alguem no Instagram',
        'Eu ja ri de algo serio',
        'Eu nunca chorei vendo filme',
        'Eu ja fingi que sabia cozinhar',
        'Eu nunca fui a uma festa sem ser convidado',
        'Eu ja cantei no chuveiro',
        'Eu nunca bati o carro',
        'Eu ja fui expulso de algum lugar',
        'Eu nunca comi algo do chao',
        'Eu ja bloqueei alguem no WhatsApp por raiva',
      ]
      reply(`${botHeader('EU JA / EU NUNCA')}\n\n*${randomChoice(perguntas)}*\n\nReajam: 👍 se ja / 👎 se nunca${botFooter()}`)
      break
    }

    // ================================================================
    //  PORCENTAGEM / CHANCE / SORTE
    // ================================================================
    case 'porcentagem':
    case 'chance':
    case 'sorte': {
      if (!fullArgs) return reply('Informe algo. Ex: #chance de eu ser rico')
      const pct = Math.floor(Math.random() * 101)
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10))
      reply(`${botHeader('PORCENTAGEM')}\n"${fullArgs}"\n\n[${bar}] *${pct}%*${botFooter()}`)
      break
    }

    // ================================================================
    //  RANKS ALEATORIOS (gay, gado, corno, etc.)
    // ================================================================
    case 'rankgay': case 'rankgado': case 'rankcorno': case 'rankgostoso':
    case 'rankgostosa': case 'rankkenga': case 'rankhetero': case 'ranknazista':
    case 'rankgolpe': case 'rankotaku': case 'rankpau': case 'rankbct': {
      const labels = {
        rankgay: 'GAY', rankgado: 'GADO', rankcorno: 'CORNO', rankgostoso: 'GOSTOSO',
        rankgostosa: 'GOSTOSA', rankkenga: 'KENGA', rankhetero: 'HETERO',
        ranknazista: 'NAZISTA', rankgolpe: 'GOLPISTA', rankotaku: 'OTAKU',
        rankpau: 'PAU', rankbct: 'BCT',
      }
      const label = labels[cmd] || cmd.replace('rank', '').toUpperCase()
      const participants = groupMeta.participants.map(p => p.id)
      // Pega 5 aleatorios
      const shuffled = [...participants].sort(() => Math.random() - 0.5).slice(0, 5)
      let text = `${botHeader(`RANK ${label}`)}\n`
      const mentions = []
      shuffled.forEach((p, i) => {
        const pct = Math.floor(Math.random() * 101)
        text += `${i + 1}. ${mention(p)} - ${pct}%\n`
        mentions.push(p)
      })
      text += botFooter()
      await replyMentions(text, mentions)
      break
    }

    // ================================================================
    //  GADOMETRO
    // ================================================================
    case 'gadometro': {
      const pct = Math.floor(Math.random() * 101)
      const levels = [
        [0, 20, 'Nem um pouco gado 😎'],
        [21, 40, 'Um pouquinho gado 🤔'],
        [41, 60, 'Gado mediano 🐄'],
        [61, 80, 'Gado forte! 🐂'],
        [81, 100, 'GADO SUPREMO! 🐮👑'],
      ]
      const level = levels.find(([min, max]) => pct >= min && pct <= max)?.[2] || ''
      reply(`${botHeader('GADOMETRO')}\n${mention(sender)}\n\n🐄 ${pct}% gado\n${level}${botFooter()}`)
      break
    }

    // ================================================================
    //  SIGNO
    // ================================================================
    case 'signo': {
      if (!args[0]) return reply('Informe seu signo. Ex: #signo leao')
      const signos = {
        aries: 'Voce tera um dia cheio de energia! Aproveite para iniciar novos projetos.',
        touro: 'Estabilidade financeira esta a caminho. Tenha paciencia.',
        gemeos: 'Comunicacao sera sua arma hoje. Conversas importantes virao.',
        cancer: 'Cuide das suas emocoes. Dia propicio para ficar com a familia.',
        leao: 'Brilhe! Hoje seu carisma esta em alta.',
        virgem: 'Organizacao sera fundamental. Preste atencao aos detalhes.',
        libra: 'Equilibrio e harmonia. Bom dia para resolver conflitos.',
        escorpiao: 'Misterios serao revelados. Confie na sua intuicao.',
        sagitario: 'Aventuras te esperam! Dia ideal para sair da rotina.',
        capricornio: 'Trabalho duro sera recompensado. Foco nos objetivos.',
        aquario: 'Inovacao e criatividade em alta. Ideias brilhantes virao.',
        peixes: 'Sensibilidade aumentada. Bom dia para arte e espiritualidade.',
      }
      const signo = args[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const previsao = signos[signo]
      if (!previsao) return reply(`Signo nao encontrado. Signos: ${Object.keys(signos).join(', ')}`)
      reply(`${botHeader(`SIGNO - ${signo.toUpperCase()}`)}\n\n${previsao}${botFooter()}`)
      break
    }

    // ================================================================
    //  PERGUNTA / SN / CANTADAS / FATOS / CONSELHO
    // ================================================================
    case 'pergunta':
    case 'sn': {
      const perguntas = [
        'Voce ja se apaixonou por alguem do grupo?',
        'Qual seu maior medo?',
        'Se pudesse ter um superpoder, qual seria?',
        'Qual seu filme favorito de todos os tempos?',
        'Voce ja mentiu hoje?',
        'Qual a coisa mais louca que ja fez?',
        'Prefere praia ou montanha?',
        'Ja ficou com alguem do grupo?',
        'Qual foi a vergonha mais recente que passou?',
        'Se pudesse viajar no tempo, para onde iria?',
      ]
      reply(`${botHeader('PERGUNTA')}\n\n*${randomChoice(perguntas)}*${botFooter()}`)
      break
    }

    case 'cantadas': {
      const cantadas = [
        'Voce e wi-fi? Porque to sentindo uma conexao.',
        'Se beleza fosse tempo, voce seria a eternidade.',
        'Voce acredita em amor a primeira vista ou devo passar de novo?',
        'Ta frio? Posso ser seu cobertor.',
        'Voce e delivery? Porque ja chegou no meu coracao.',
        'Se voce fosse uma fruta, seria a minha predileta.',
        'Voce nao e Google, mas tem tudo que eu procuro.',
        'Quer ser meu GPS? Porque sem voce eu to perdido.',
        'Se eu fosse gato, gastaria as 7 vidas te olhando.',
        'Me empresta um beijo? Prometo que devolvo.',
      ]
      reply(`${botHeader('CANTADA')}\n\n${randomChoice(cantadas)}${botFooter()}`)
      break
    }

    case 'fatos': {
      const fatos = [
        'O mel nunca estraga. Arqueologos encontraram mel comestivel em tumbas egipcias de 3000 anos.',
        'Os golfinhos dormem com um olho aberto.',
        'Uma pessoa media passa 6 meses da vida esperando semaforos vermelhos.',
        'O coracao de um camarao fica na cabeca.',
        'As formigas nunca dormem.',
        'Uma nuvem media pesa cerca de 500 toneladas.',
        'Voce nao consegue respirar e engolir ao mesmo tempo.',
        'O DNA humano e 60% identico ao de uma banana.',
        'Plutao nao completou uma volta ao redor do Sol desde que foi descoberto.',
        'Os olhos do avestruz sao maiores que seu cerebro.',
      ]
      reply(`${botHeader('FATO CURIOSO')}\n\n${randomChoice(fatos)}${botFooter()}`)
      break
    }

    case 'conselho': {
      const conselhos = [
        'Nao se compare com os outros. Sua jornada e unica.',
        'Beba agua. Serio, beba agua agora.',
        'Tudo passa, ate os momentos mais dificeis.',
        'Nao va dormir com raiva. Resolva primeiro.',
        'Economize pelo menos 10% do que ganha.',
        'Leia mais livros e menos fofocas.',
        'Exercite-se, seu corpo agradece.',
        'Diga as pessoas que voce as ama antes que seja tarde.',
        'Aprenda a dizer nao sem sentir culpa.',
        'Invista em experiencias, nao em coisas.',
      ]
      reply(`${botHeader('CONSELHO')}\n\n${randomChoice(conselhos)}${botFooter()}`)
      break
    }

    case 'conselhobiblico': {
      const versos = [
        '"Tudo posso naquele que me fortalece." - Filipenses 4:13',
        '"O Senhor e meu pastor, nada me faltara." - Salmos 23:1',
        '"Entrega o teu caminho ao Senhor, confia nele e ele agira." - Salmos 37:5',
        '"Porque Deus amou o mundo de tal maneira..." - Joao 3:16',
        '"O amor e paciente, o amor e bondoso." - 1 Corintios 13:4',
        '"Busquem em primeiro lugar o Reino de Deus e a sua justica." - Mateus 6:33',
        '"Nao andem ansiosos por coisa alguma." - Filipenses 4:6',
        '"Eu sou o caminho, a verdade e a vida." - Joao 14:6',
      ]
      reply(`${botHeader('CONSELHO BIBLICO')}\n\n${randomChoice(versos)}${botFooter()}`)
      break
    }

    // ================================================================
    //  DUELO
    // ================================================================
    case 'duelo': {
      const target = getTarget()
      if (!target) return reply('Marque alguem para duelar. Ex: #duelo @user')
      if (target === sender) return reply('Voce nao pode duelar consigo mesmo.')
      const gameKey = `${groupId}_duelo`
      activeGames.duelos.set(gameKey, {
        challenger: sender,
        opponent: target,
        votes: { challenger: [], opponent: [] },
        started: Date.now(),
      })
      await replyMentions(
        `${botHeader('DUELO')}\n${mention(sender)} desafiou ${mention(target)}!\n\nVotem:\n#votar_duelo 1 - para ${mention(sender)}\n#votar_duelo 2 - para ${mention(target)}\n\nVotacao encerra em 2 minutos!${botFooter()}`,
        [sender, target]
      )
      setTimeout(async () => {
        const game = activeGames.duelos.get(gameKey)
        if (game) {
          const v1 = game.votes.challenger.length
          const v2 = game.votes.opponent.length
          let result
          if (v1 > v2) result = `${mention(game.challenger)} venceu com ${v1} votos!`
          else if (v2 > v1) result = `${mention(game.opponent)} venceu com ${v2} votos!`
          else result = 'Empate!'
          await replyMentions(
            `${botHeader('DUELO - RESULTADO')}\n${mention(game.challenger)}: ${v1} votos\n${mention(game.opponent)}: ${v2} votos\n\n*${result}*${botFooter()}`,
            [game.challenger, game.opponent]
          )
          activeGames.duelos.delete(gameKey)
        }
      }, 120000)
      break
    }

    case 'votar_duelo': {
      const gameKey = `${groupId}_duelo`
      const game = activeGames.duelos.get(gameKey)
      if (!game) return reply('Nenhum duelo ativo.')
      const vote = parseInt(args[0])
      if (vote !== 1 && vote !== 2) return reply('Vote 1 ou 2.')
      if ([...game.votes.challenger, ...game.votes.opponent].includes(sender)) return reply('Voce ja votou!')
      if (vote === 1) game.votes.challenger.push(sender)
      else game.votes.opponent.push(sender)
      reply(`Voto registrado! (1: ${game.votes.challenger.length} | 2: ${game.votes.opponent.length})`)
      break
    }

    // ================================================================
    //  VOTACAO GENERICA
    // ================================================================
    case 'iniciar_votacao': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      if (!fullArgs) return reply('Informe a pergunta. Ex: #iniciar_votacao Devemos mudar o nome do grupo?')
      const gameKey = `${groupId}_votacao`
      activeGames.votacoes.set(gameKey, {
        question: fullArgs,
        yes: [],
        no: [],
        starter: sender,
      })
      reply(`${botHeader('VOTACAO')}\n\n*${fullArgs}*\n\n#votar sim - para SIM\n#votar nao - para NAO${botFooter()}`)
      break
    }

    case 'votar': {
      const gameKey = `${groupId}_votacao`
      const game = activeGames.votacoes.get(gameKey)
      if (!game) return reply('Nenhuma votacao ativa.')
      const vote = args[0]?.toLowerCase()
      if (!['sim', 'nao'].includes(vote)) return reply('Vote: #votar sim ou #votar nao')
      if ([...game.yes, ...game.no].includes(sender)) return reply('Voce ja votou!')
      if (vote === 'sim') game.yes.push(sender)
      else game.no.push(sender)
      reply(`Voto registrado! SIM: ${game.yes.length} | NAO: ${game.no.length}`)
      break
    }

    case 'terminar_votacao': {
      if (!canExecute(groupId, sender, isGroupAdmin, 2)) return reply('Sem permissao.')
      const gameKey = `${groupId}_votacao`
      const game = activeGames.votacoes.get(gameKey)
      if (!game) return reply('Nenhuma votacao ativa.')
      const result = game.yes.length > game.no.length ? 'SIM venceu!' : game.no.length > game.yes.length ? 'NAO venceu!' : 'Empate!'
      reply(`${botHeader('VOTACAO - RESULTADO')}\n*${game.question}*\n\nSIM: ${game.yes.length}\nNAO: ${game.no.length}\n\n*${result}*${botFooter()}`)
      activeGames.votacoes.delete(gameKey)
      break
    }

    // ================================================================
    //  INTERACOES SOCIAIS (beijo, tapa, chute, abraco, etc.)
    // ================================================================
    case 'matar': case 'beijo': case 'tapa': case 'chute': case 'abraco':
    case 'corno': case 'gado': case 'gostoso': case 'gostosa': case 'gay':
    case 'vesgo': case 'bebado': case 'feio': case 'nazista': case 'golpe':
    case 'dogolpe': case 'hetero': case 'sigma': {
      const target = getTarget()
      if (!target) return reply('Marque alguem.')
      const acoes = {
        matar: 'matou', beijo: 'beijou', tapa: 'deu um tapa em', chute: 'chutou',
        abraco: 'abracou', corno: 'chifrou', gado: 'declarou que e gado por',
        gostoso: 'acha gostoso(a)', gostosa: 'acha gostosa(o)',
        gay: 'acha muito gay', vesgo: 'deixou vesgo(a)', bebado: 'embebedou',
        feio: 'chamou de feio(a)', nazista: 'acusou de nazismo',
        golpe: 'levou golpe de', dogolpe: 'aplicou um golpe em',
        hetero: 'declarou hetero demais', sigma: 'e um sigma com',
      }
      const acao = acoes[cmd] || cmd
      await replyMentions(
        `${botHeader(cmd.toUpperCase())}\n${mention(sender)} ${acao} ${mention(target)}!${botFooter()}`,
        [sender, target]
      )
      break
    }

    // ================================================================
    //  CASAMENTO
    // ================================================================
    case 'casamento':
    case 'casal': {
      const target = getTarget()
      if (!target) return reply('Marque alguem para casar.')
      if (target === sender) return reply('Voce nao pode casar consigo mesmo!')
      const gameKey = `${groupId}_casamento`
      activeGames.casamentos.set(gameKey, { proposer: sender, proposed: target })
      await replyMentions(
        `${botHeader('CASAMENTO')}\n${mention(sender)} pediu ${mention(target)} em casamento!\n\n${mention(target)}, digite #entrar para aceitar ou #recusar para recusar.${botFooter()}`,
        [sender, target]
      )
      break
    }

    case 'entrar': {
      const gameKey = `${groupId}_casamento`
      const game = activeGames.casamentos.get(gameKey)
      if (!game || game.proposed !== sender) return reply('Nenhum pedido de casamento para voce.')
      activeGames.casamentos.delete(gameKey)
      await replyMentions(
        `${botHeader('CASAMENTO')}\n${mention(game.proposer)} e ${mention(sender)} estao casados!\n\nParabens ao casal!${botFooter()}`,
        [game.proposer, sender]
      )
      break
    }

    case 'recusar': {
      const gameKey = `${groupId}_casamento`
      const game = activeGames.casamentos.get(gameKey)
      if (!game || game.proposed !== sender) return reply('Nenhum pedido de casamento para voce.')
      activeGames.casamentos.delete(gameKey)
      await replyMentions(
        `${botHeader('CASAMENTO')}\n${mention(sender)} recusou o pedido de ${mention(game.proposer)}...${botFooter()}`,
        [game.proposer, sender]
      )
      break
    }

    // ================================================================
    //  IMC
    // ================================================================
    case 'imc': {
      if (args.length < 2) return reply('Use: #imc <peso> <altura>\nEx: #imc 70 1.75')
      const peso = parseFloat(args[0])
      const altura = parseFloat(args[1])
      if (isNaN(peso) || isNaN(altura) || altura <= 0) return reply('Valores invalidos.')
      const imc = (peso / (altura * altura)).toFixed(1)
      let categoria
      if (imc < 18.5) categoria = 'Abaixo do peso'
      else if (imc < 25) categoria = 'Peso normal'
      else if (imc < 30) categoria = 'Sobrepeso'
      else if (imc < 35) categoria = 'Obesidade Grau I'
      else if (imc < 40) categoria = 'Obesidade Grau II'
      else categoria = 'Obesidade Grau III'
      reply(`${botHeader('IMC')}\nPeso: ${peso}kg\nAltura: ${altura}m\n\n*IMC: ${imc}*\nCategoria: ${categoria}${botFooter()}`)
      break
    }

    // ================================================================
    //  CEU / INFERNO
    // ================================================================
    case 'ceu':
    case 'inferno': {
      const pct = Math.floor(Math.random() * 101)
      const destino = cmd === 'ceu' ? 'CEU' : 'INFERNO'
      reply(`${botHeader(destino)}\n${mention(sender)} tem *${pct}%* de chance de ir para o ${destino}!${botFooter()}`)
      break
    }

    // ================================================================
    //  ANAGRAMA
    // ================================================================
    case 'anagrama': {
      const palavras = ['PROGRAMADOR', 'BORBOLETA', 'CHOCOLATE', 'WHATSAPP', 'UNIVERSO', 'DINOSSAURO', 'GUITARRA', 'FUTEBOL']
      const word = randomChoice(palavras)
      const shuffled = word.split('').sort(() => Math.random() - 0.5).join('')
      reply(`${botHeader('ANAGRAMA')}\n\nDescubra a palavra:\n\n*${shuffled}*\n\nUse #revelar_anagrama para ver a resposta.${botFooter()}`)
      // Salva resposta temporariamente
      activeGames.ppt.set(`${groupId}_anagrama`, { answer: word })
      break
    }

    case 'revelar_anagrama': {
      const game = activeGames.ppt.get(`${groupId}_anagrama`)
      if (!game) return reply('Nenhum anagrama ativo.')
      reply(`A resposta era: *${game.answer}*`)
      activeGames.ppt.delete(`${groupId}_anagrama`)
      break
    }

    // ================================================================
    //  CACHACA
    // ================================================================
    case 'enviarcachaca': {
      const target = getTarget()
      if (!target) return reply('Marque alguem para enviar cachaca.')
      await replyMentions(`${botHeader('CACHACA')}\n${mention(sender)} enviou uma cachaca para ${mention(target)}! 🍺🥃${botFooter()}`, [sender, target])
      break
    }

    // ================================================================
    //  SIMI / BOT (respostas inteligentes)
    // ================================================================
    case 'simi':
    case 'bot': {
      if (!fullArgs) return reply('Diga algo para o bot.')
      const respostas = [
        'Hmm, interessante...', 'Com certeza!', 'Nao sei responder isso.',
        'Talvez sim, talvez nao...', 'Concordo!', 'Discordo totalmente!',
        'Voce e engraçado(a)!', 'Preciso pensar sobre isso...',
        'Isso me lembra uma coisa...', 'Serio? Conta mais!',
        'Nao me perturba!', 'Ai ai...', 'Boa pergunta!',
        'Passa la no privado', 'Verdade ne?!',
      ]
      reply(randomChoice(respostas))
      break
    }

    default:
      reply(`Comando de jogo "${cmd}" em desenvolvimento.`)
  }
}
