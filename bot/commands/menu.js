// ============================================================
//  COMANDOS DE MENU
//  Recebe ctx padrao e envia o menu como mensagem
// ============================================================
import config from '../config.js'
import { buildMenu, botHeader, botFooter } from '../lib/utils.js'

export async function handleMenu(ctx) {
  const { sock, cmd, args, groupId, grpSettings } = ctx

  const reply = async (text) => sock.sendMessage(groupId, { text })

  // Prefixo que sera exibido nos menus
  const p = grpSettings?.prefix || config.prefix || '#'

  const menus = {
    menu: {
      title: 'MENU PRINCIPAL',
      items: [
        `${p}menu figurinhas`,
        `${p}menu brincadeiras`,
        `${p}menu efeitos`,
        `${p}menu adm`,
        `${p}menu gold`,
        `${p}menu downloads`,
        `${p}menu info`,
        `${p}menu jogos`,
        `${p}menu grupo`,
        `${p}menu anime`,
        `${p}menu logos`,
        `${p}menu sticker`,
        `${p}menu marcar`,
        `${p}listanegra`,
        `${p}admins`,
        `${p}rankativos`,
        `${p}rankfigurinhas`,
      ],
    },

    figurinhas: {
      title: 'MENU FIGURINHAS',
      items: [
        `${p}s / ${p}f - Criar figurinha`,
        `${p}take - Roubar figurinha`,
        `${p}rgtake - Registrar take`,
        `${p}rmtake - Remover take`,
        `${p}ttp <texto> - Texto para figurinha`,
        `${p}attp <texto> - Texto animado`,
        `${p}toimg - Figurinha para imagem`,
        `${p}togif - Figurinha para GIF`,
        `${p}tomp4 - Figurinha para MP4`,
        `${p}fig - Figurinha aleatoria`,
        `${p}figanime - Fig anime`,
        `${p}figmeme - Fig meme`,
        `${p}figroblox - Fig roblox`,
        `${p}figemoji - Fig emoji`,
        `${p}figcoreana - Fig coreana`,
        `${p}figraiva - Fig raiva`,
        `${p}figengracada - Fig engracada`,
        `${p}figdesenho - Fig desenho`,
        `${p}rename <pack/autor> - Renomear`,
        `${p}smartsticker - Sticker inteligente`,
        `${p}qc <texto> - Quote chat`,
        `${p}emoji <emoji> - Emoji para figurinha`,
        `${p}emoji-mix - Misturar emojis`,
        `${p}addstickercmd - Salvar figurinha cmd`,
        `${p}getstickercmd - Usar figurinha salva`,
        `${p}delstickercmd - Remover figurinha salva`,
        `${p}liststickerscmd - Listar figurinhas salvas`,
        `${p}autofigu - Auto figurinha ON/OFF`,
      ],
    },

    brincadeiras: {
      title: 'MENU BRINCADEIRAS',
      items: [
        `${p}ppt - Pedra Papel Tesoura`,
        `${p}akinator - Akinator`,
        `${p}damas - Jogo de damas`,
        `${p}jogodavelha - Jogo da velha`,
        `${p}iniciar_forca - Forca`,
        `${p}rv - Roleta russa`,
        `${p}roleta - Roleta`,
        `${p}fakemsg - Mensagem falsa`,
        `${p}eujaeununca - Eu ja e eu nunca`,
        `${p}porcentagem <algo> - Porcentagem`,
        `${p}chance <algo> - Chance de algo`,
        `${p}sorte - Sua sorte do dia`,
        `${p}rankgay - Rank gay`,
        `${p}rankgado - Rank gado`,
        `${p}rankcorno - Rank corno`,
        `${p}rankgostoso - Rank gostoso`,
        `${p}rankgostosa - Rank gostosa`,
        `${p}gadometro - Gadometro`,
        `${p}signo <signo> - Horoscopo`,
        `${p}pergunta - Pergunta aleatoria`,
        `${p}sn - Sim ou Nao`,
        `${p}cantadas - Cantada aleatoria`,
        `${p}fatos - Fato aleatorio`,
        `${p}conselho - Conselho aleatorio`,
        `${p}duelo @user - Iniciar duelo`,
        `${p}votar_duelo 1/2 - Votar no duelo`,
        `${p}iniciar_votacao - Criar votacao`,
        `${p}votar - Votar`,
      ],
    },

    efeitos: {
      title: 'MENU EFEITOS',
      items: [
        `${p}kiss @user - Beijo`,
        `${p}ship @user - Ship`,
        `${p}slap @user - Tapa`,
        `${p}triggered - Triggered`,
        `${p}jail - Na prisao`,
        `${p}wasted - Wasted`,
        `${p}blur - Borrar imagem`,
        `${p}greyscale - Preto e branco`,
        `${p}sepia - Efeito sepia`,
        `${p}invert - Inverter cores`,
        `${p}clown - Palhaco`,
        `${p}beautiful - Beautiful`,
        `${p}totext - Audio para texto`,
        `${p}grave - Efeito grave`,
        `${p}bass - Efeito bass`,
        `${p}estourar - Estourar audio`,
        `${p}fast - Audio rapido`,
        `${p}slow - Audio lento`,
        `${p}esquilo - Voz de esquilo`,
        `${p}reverse - Audio ao contrario`,
        `${p}deep - Voz grave`,
        `${p}speedup - Acelerar`,
      ],
    },

    adm: {
      title: 'MENU ADMINISTRACAO',
      items: [
        `${p}ban @user - Banir membro`,
        `${p}add <numero> - Adicionar membro`,
        `${p}advertir @user - Advertir`,
        `${p}checkwarnings @user - Ver advertencias`,
        `${p}removewarnings @user - Remover adv`,
        `${p}clearwarnings - Limpar todas adv`,
        `${p}mute @user - Silenciar`,
        `${p}desmute @user - Dessilenciar`,
        `${p}promover @user - Promover`,
        `${p}rebaixar @user - Rebaixar`,
        `${p}cargo @user <cargo> - Atribuir cargo`,
        `${p}tagall - Marcar todos`,
        `${p}totag - Marcar com mensagem`,
        `${p}hidetag <msg> - Marcar oculto`,
        `${p}linkgp - Link do grupo`,
        `${p}nomegp <nome> - Mudar nome`,
        `${p}descgp <desc> - Mudar descricao`,
        `${p}fotogp - Mudar foto (marcar img)`,
        `${p}fechargp - Fechar grupo`,
        `${p}abrirgp - Abrir grupo`,
        `${p}deletar - Apagar msg marcada`,
        `${p}sorteio - Sortear membro`,
        `${p}banghost - Banir sem foto de perfil`,
        `${p}banfakes - Banir numeros fakes`,
        `${p}inativos - Ver membros inativos`,
        `${p}nuke - Remover todos membros`,
        `${p}listanegra <num> - Add lista negra`,
        `${p}listaban - Ver lista negra`,
        `${p}listabranca @user - Add lista branca`,
        `${p}aceitar - Aceitar solicitacoes`,
        `${p}anotar <texto> - Fazer anotacao`,
        `${p}anotacoes - Ver anotacoes`,
        `${p}rmnota <id> - Remover nota`,
        `${p}status - Status do grupo`,
        `${p}atividades - Log de atividades`,
        `${p}bemvindo - Ativar boas vindas`,
        `${p}antilink - Anti link ON/OFF`,
        `${p}antifake - Anti fake ON/OFF`,
        `${p}antiflood - Anti flood ON/OFF`,
        `${p}antipalavra - Anti palavrao ON/OFF`,
        `${p}addpalavra <palavra> - Add palavra proibida`,
        `${p}delpalavra <palavra> - Remover palavra`,
        `${p}listapalavrao - Listar palavras`,
        `${p}so_adm - Modo so adm ON/OFF`,
        `${p}autobaixar - Auto download ON/OFF`,
        `${p}x9viewonce - Revelar view once ON/OFF`,
        `${p}mensagem-automatica - Agendar msg`,
        `${p}listar-mensagens-automaticas - Ver agendadas`,
        `${p}fechar-abrirgp <h:m> - Horario auto`,
        `${p}opengp <hora> - Abrir automatico`,
        `${p}closegp <hora> - Fechar automatico`,
      ],
    },

    gold: {
      title: 'MENU GOLD',
      items: [
        `${p}gold - Ver seu gold`,
        `${p}rankgold - Ranking de gold`,
        `${p}doargold @user <qtd> - Doar gold`,
        `${p}minerar_gold - Minerar gold`,
        `${p}roubargold @user - Roubar gold`,
        `${p}daily - Gold diario`,
        `${p}lojagold - Loja de gold`,
        `${p}cassino <qtd> - Cassino`,
        `${p}apostargold <qtd> - Apostar`,
        `${p}doublegold <qtd> - Double`,
        `${p}jackpotgold <qtd> - Jackpot`,
        `${p}roletadasorte <qtd> - Roleta da sorte`,
        `${p}aviatorgold <qtd> - Aviator`,
        `${p}caixamisteriosagold - Caixa misteriosa`,
        `${p}sequenciagold - Sequencia gold`,
        `${p}combinegold - Combine gold`,
        `${p}quiznumero - Quiz numero`,
        `${p}sorteiogold - Sorteio gold`,
      ],
    },

    downloads: {
      title: 'MENU DOWNLOADS',
      items: [
        `${p}play <nome> - Baixar musica`,
        `${p}playvideo <nome> - Baixar video`,
        `${p}playdoc <nome> - Baixar como doc`,
        `${p}tiktok <url> - Baixar TikTok`,
        `${p}instagram <url> - Baixar Instagram`,
        `${p}twitter <url> - Baixar Twitter`,
        `${p}facebook <url> - Baixar Facebook`,
        `${p}pinterest <texto> - Buscar Pinterest`,
        `${p}spotify <url> - Baixar Spotify`,
        `${p}mediafire <url> - Baixar MediaFire`,
        `${p}ytmp4 <url> - YouTube MP4`,
        `${p}ytmp3 <url> - YouTube MP3`,
        `${p}ytsearch <nome> - Buscar no YouTube`,
        `${p}lyrics <nome> - Letra de musica`,
        `${p}gitclone <url> - Clonar repositorio`,
        `${p}tomp3 - Video para MP3`,
        `${p}download-link <url> - Baixar qualquer link`,
      ],
    },

    info: {
      title: 'MENU INFORMACOES',
      items: [
        `${p}info - Info do bot`,
        `${p}ping - Velocidade do bot`,
        `${p}dono - Info da dona`,
        `${p}idiomas - Idiomas disponiveis`,
        `${p}tabela - Tabela do grupo`,
        `${p}tabelagp - Info do grupo`,
        `${p}gpinfo - Info completa grupo`,
        `${p}perfil - Seu perfil`,
        `${p}me - Suas estatisticas`,
        `${p}check @user - Info do membro`,
        `${p}admins - Lista de admins`,
        `${p}infocmd <cmd> - Info do comando`,
        `${p}configurar-bot - Como configurar`,
      ],
    },

    jogos: {
      title: 'MENU JOGOS',
      items: [
        `${p}ppt - Pedra Papel Tesoura`,
        `${p}jogodavelha @user - Jogo da velha`,
        `${p}damas @user - Damas`,
        `${p}iniciar_forca - Jogo da forca`,
        `${p}rv - Roleta russa`,
        `${p}akinator - Akinator`,
      ],
    },

    grupo: {
      title: 'MENU GRUPO',
      items: [
        `${p}rankativos - Rank de ativos`,
        `${p}rankativosg - Rank ativos gold`,
        `${p}checkativo @user - Checar atividade`,
        `${p}rankfigurinhas - Rank de figurinhas`,
        `${p}ultimosativos - Ultimos ativos`,
        `${p}rankinativo - Rank de inativos`,
      ],
    },

    anime: {
      title: 'MENU ANIME',
      items: [
        `${p}pinterest <tema> - Buscar imagem`,
        `${p}animeinfo <nome> - Info do anime`,
        `${p}waifu - Waifu aleatoria`,
        `${p}neko - Neko aleatoria`,
        `${p}loli - Loli aleatoria`,
        `${p}goku / ${p}nezuko / ${p}makima / etc`,
      ],
    },

    logos: {
      title: 'MENU LOGOS & EFEITOS DE TEXTO',
      items: [
        `${p}shadow <txt> - Efeito shadow`,
        `${p}neon <txt> - Efeito neon`,
        `${p}fire <txt> - Efeito fogo`,
        `${p}smoke <txt> - Efeito fumaca`,
        `${p}matrix <txt> - Efeito matrix`,
        `${p}blood <txt> - Efeito sangue`,
        `${p}lava <txt> - Efeito lava`,
        `${p}gelo <txt> - Efeito gelo`,
        `${p}3dgold <txt> - Efeito 3D gold`,
        `${p}rainbow <txt> - Efeito arco-iris`,
        `${p}carbon <txt> - Efeito carbon`,
        `${p}horror <txt> - Efeito horror`,
        `${p}berry <txt> - Efeito berry`,
        `${p}luxury <txt> - Efeito luxury`,
        `${p}toxic <txt> - Efeito toxico`,
      ],
    },

    sticker: {
      title: 'MENU STICKER',
      items: [
        `${p}s - Criar sticker de imagem/video`,
        `${p}f - Criar sticker (alias)`,
        `${p}toimg - Sticker para imagem`,
        `${p}togif - Sticker para GIF`,
        `${p}take <pack> <autor> - Roubar sticker`,
        `${p}rename <pack/autor> - Renomear`,
        `${p}attp <txt> - Texto animado`,
        `${p}ttp <txt> - Texto para sticker`,
        `${p}qc <txt> - Quote chat`,
        `${p}sfundo - Remover fundo`,
      ],
    },

    marcar: {
      title: 'MENU MARCAR',
      items: [
        `${p}lixo @user - Lixo`,
        `${p}lgbt @user - LGBT`,
        `${p}preso @user - Preso`,
        `${p}procurado @user - Procurado`,
        `${p}deletem @user - Delete`,
        `${p}morto @user - Morto`,
      ],
    },

    vip: {
      title: 'MENU VIP',
      items: [
        `${p}premium - Ver status premium`,
        `${p}lojagold - Comprar VIP com gold`,
      ],
    },

    game: {
      title: 'MENU GAMES',
      items: [
        `${p}ppt - Pedra Papel Tesoura`,
        `${p}jogodavelha - Jogo da velha`,
        `${p}iniciar_forca - Forca`,
        `${p}roleta - Roleta russa`,
        `${p}cassino - Cassino gold`,
      ],
    },

    dono: {
      title: 'MENU DONO',
      items: [
        `${p}bc <msg> - Broadcast para todos os grupos`,
        `${p}join <link> - Entrar em grupo`,
        `${p}sairgp - Sair do grupo`,
        `${p}nuke - Remover todos membros`,
        `${p}addgold @user <qtd> - Dar gold`,
        `${p}addxp @user <qtd> - Dar XP`,
        `${p}listanegra <num> - Lista negra`,
        `${p}block @user - Bloquear`,
      ],
    },
  }

  // Resolve o sub-menu a partir do comando
  let subMenu = 'menu'

  if (cmd === 'menu') {
    // Se veio argumento como "menu figurinhas", extrai a chave
    subMenu = args[0]?.toLowerCase() || 'menu'
  } else if (cmd === 'configurarbot' || cmd === 'configurar-bot') {
    subMenu = 'adm'
  } else {
    // Comandos como "menufigurinhas" -> remove "menu" do inicio
    subMenu = cmd.replace('menu', '')
  }

  // Aliases para nomes com acento ou abreviacao
  const aliases = {
    fig: 'figurinhas',
    figurinhas: 'figurinhas',
    menufigurinhas: 'figurinhas',
    brincadeiras: 'brincadeiras',
    efeitos: 'efeitos',
    adm: 'adm',
    gold: 'gold',
    download: 'downloads',
    downloads: 'downloads',
    baixar: 'downloads',
    info: 'info',
    jogos: 'jogos',
    grupo: 'grupo',
    anime: 'anime',
    logos: 'logos',
    sticker: 'sticker',
    marcar: 'marcar',
    vip: 'vip',
    game: 'game',
    dono: 'dono',
    rpg: 'jogos',
  }

  const resolvedKey = aliases[subMenu] || subMenu
  const menu = menus[resolvedKey] || menus['menu']

  await reply(buildMenu(menu.title, menu.items))
}
