// ============================================================
//  DEMIBOT - CONFIGURACAO PRINCIPAL
//  Identidade Visual: Demi Lovato
// ============================================================

export default {
  // Informacoes do Bot
  botName: 'DemiBot',
  ownerNumber: '559299652961@s.whatsapp.net', // Numero da dona do grupo
  ownerName: 'Dona',
  
  // Prefixos aceitos (multiprefixo)
  prefixes: ['#', '/', '.', '!'],
  
  // Limites
  maxWarnings: 3, // Maximo de advertencias antes do ban
  inactiveDays: 7, // Dias de inatividade antes de aviso
  inactiveRemoveDays: 14, // Dias antes de remocao automatica
  maxCharLimit: 5000, // Limite de caracteres por mensagem
  floodLimit: 10, // Mensagens por minuto = flood
  cmdCooldown: 3, // Cooldown padrao de comandos (segundos)
  
  // Links permitidos (antilink)
  allowedLinks: [
    'instagram.com',
    'youtube.com',
    'youtu.be',
    'tiktok.com',
    'vm.tiktok.com',
  ],
  
  // Anti palavrao - palavras iniciais (admin pode adicionar mais)
  defaultBannedWords: [],
  
  // Identidade visual Demi Lovato
  demiTheme: {
    emoji: '👻',
    greeting: '𝐃𝐞𝐦𝐢𝐁𝐨𝐭',
    separator: '━━━━━━━━━━━━━━━',
    headerDecor: '⎨⎟⟐⃟➪',
    footerDecor: '╰━━─ ≪ •❈• ≫ ─━━╯',
  },
  
  // Mensagens de bom dia (rotativas)
  goodMorningMessages: [
    '🌅 Bom dia, galera! Que hoje seja incrivel!',
    '☀️ Acorda, pessoal! Mais um dia lindo pela frente!',
    '🌻 Bom dia! Sejam a melhor versao de voces hoje!',
    '💜 Bom dia! Demi Lovato diria: "Stay strong!"',
    '🦋 Bom dia! Lembrem-se: voces sao incriveis!',
  ],
  
  // Horarios de bom dia
  goodMorningCron: '0 7 * * *', // 7h todo dia
  
  // Cargos e permissoes
  roles: {
    owner: { level: 4, name: 'Dona' },
    admin: { level: 3, name: 'Administrador(a)' },
    mod: { level: 2, name: 'Moderador(a)' },
    aux: { level: 1, name: 'Auxiliar' },
    member: { level: 0, name: 'Membro' },
  },
  
  // APIs externas (configurar conforme necessario)
  apis: {
    removeBg: 'MgL7kTucQvneKm211qbDddgB', // API key removebg
    openai: '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', // API key OpenAI/GPT
    gemini: 'AIzaSyBY2Oh8M4Bw_hpbwst3xwb58RCbFgk24Y0', // API key Google Gemini
    weather: '', // API key OpenWeather
    lastfm: '3286e8a06165ff26aef320ebad156f9f', // API key Last.fm
  },
}
