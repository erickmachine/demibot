<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/Baileys-6.7-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</p>

<h1 align="center">DemiBot - Bot para WhatsApp</h1>

<p align="center">
  Bot completo para gerenciamento de grupos no WhatsApp com identidade visual inspirada em Demi Lovato.<br/>
  +200 comandos | Multi-prefixo | Sistema de Gold | Jogos | Downloads | Figurinhas | Painel Web
</p>

---

## Sobre

O **DemiBot** e um bot robusto para WhatsApp construido em Node.js usando a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys). Ele oferece gerenciamento completo de grupos com sistema de cargos, economia virtual (gold), jogos interativos, criacao de figurinhas, downloads de midia e muito mais.

---

## Funcionalidades

### Gerenciamento de Grupo
- **Anti-link** - Remove links nao autorizados (com lista branca configuravel)
- **Anti-link de grupo** - Remove convites de outros grupos
- **Anti-fake** - Bloqueia numeros estrangeiros/fakes
- **Anti-flood** - Detecta e pune spam de mensagens
- **Anti-palavrao** - Filtra palavras proibidas (lista configuravel por grupo)
- **Anti-midia** - Bloqueia imagens, videos, audios, documentos, stickers, contatos, localizacao
- **Anti-catalogo** - Bloqueia mensagens de catalogo
- **Anti-marcacao** - Bloqueia mencoes excessivas
- **Anti-notas** - Bloqueia notas de voz
- **Anti-bots** - Bloqueia outros bots no grupo
- **X9 ViewOnce** - Revela mensagens de visualizacao unica
- **X9 Adm** - Reporta acoes suspeitas de admins
- **Modo So Admin** - Restringe envio de mensagens apenas para admins
- **Abrir/Fechar grupo automatico** - Horarios programados

### Sistema de Cargos e Permissoes
| Nivel | Cargo | Descricao |
|-------|-------|-----------|
| 4 | Dona | Acesso total ao bot |
| 3 | Administrador(a) | Gerencia o grupo |
| 2 | Moderador(a) | Modera membros |
| 1 | Auxiliar | Ajuda na moderacao |
| 0 | Membro | Acesso basico |

### Sistema de Advertencias
- Advertir membros com motivo
- Maximo configuravel de advertencias antes do ban automatico
- Visualizar, remover e limpar advertencias
- Historico completo com datas e motivos

### Sistema Gold (Economia Virtual)
- **Minerar gold** - Ganhe gold periodicamente
- **Daily** - Recompensa diaria
- **Doar gold** - Transfira para outros membros
- **Roubar gold** - Tente roubar (com chance de falha)
- **Cassino** - Aposte no cassino
- **Double Gold** - Dobre ou perca
- **Jackpot Gold** - Jackpot progressivo
- **Roleta da Sorte** - Gire a roleta
- **Aviator Gold** - Estilo aviator
- **Caixa Misteriosa** - Premios aleatorios
- **Sequencia Gold** - Acerte a sequencia
- **Combine Gold** - Combine simbolos
- **Quiz Numero** - Acerte o numero
- **Sorteio Gold** - Sorteio entre participantes
- **Loja Gold** - Compre itens com gold
- **Rank Gold** - Ranking dos mais ricos

### Figurinhas (Stickers)
- Criar figurinhas de **imagem**, **video** e **GIF**
- **Take** - Roubar figurinhas com nome/autor personalizado
- **TTP** - Texto para figurinha
- **ATTP** - Texto animado para figurinha
- **Emoji** - Emoji para figurinha
- **Emoji Mix** - Misturar dois emojis
- **Quote Chat (QC)** - Mensagem estilizada como figurinha
- **Smart Sticker** - Figurinha inteligente com IA
- **Remover fundo** - Remove fundo de imagens
- Converter: **toimg**, **togif**, **tomp4**
- Figurinhas aleatorias por categoria: anime, meme, roblox, emoji, coreana, raiva, engracada, desenho
- **Comandos de figurinha salvos** - Salve e use figurinhas com comandos customizados
- **Auto figurinha** - Converte automaticamente imagens enviadas

### Downloads
- **YouTube** - Musica (MP3), video (MP4), documento
- **TikTok** - Videos sem marca d'agua
- **Instagram** - Reels, posts, stories
- **Twitter/X** - Videos e imagens
- **Facebook** - Videos
- **Pinterest** - Busca e download de imagens
- **Spotify** - Musicas
- **MediaFire** - Arquivos
- **Git Clone** - Repositorios do GitHub
- **Lyrics** - Letra de musicas
- **Download generico** - Qualquer URL

### Efeitos de Imagem e Audio
**Imagem:**
- Kiss, Ship, Slap, Triggered, Jail, Wasted
- Blur, Greyscale, Sepia, Invert
- Clown, Beautiful, Procurado, Preso, LGBT

**Audio:**
- Grave, Bass, Estourar
- Fast, Slow, Esquilo, Reverse, Deep, Speedup
- Audio para texto (transcricao)

### Efeitos de Texto / Logos
- Shadow, Neon, Fire, Smoke, Matrix
- Blood, Lava, Gelo, 3D Gold, Rainbow
- Carbon, Horror, Berry, Luxury, Toxic

### Jogos e Brincadeiras
- **Pedra Papel Tesoura** - Jogo classico
- **Jogo da Velha** - Contra outro membro
- **Damas** - Jogo de damas
- **Forca** - Adivinhe a palavra
- **Roleta Russa** - Sorte ou azar
- **Akinator** - O genio da lampada
- **Duelos** - Desafie outros membros com votacao
- **Votacoes** - Crie enquetes no grupo
- Porcentagem, Chance, Sorte do dia
- Ranks divertidos: gay, gado, corno, gostoso/gostosa, gadometro
- Horoscopo por signo
- Perguntas aleatorias, Sim ou Nao, Cantadas, Fatos, Conselhos

### Boas-vindas e Despedida
- Mensagens personalizaveis com variaveis (`{user}`, `{group}`, `{desc}`)
- Imagem de fundo customizavel
- **Welcome 1** - Boas-vindas simples
- **Welcome 2** - Boas-vindas com imagem
- Mensagem de despedida configuravel

### Agendamento de Mensagens
- **Bom dia automatico** - Mensagens rotativas todo dia as 7h
- **Mensagens agendadas** - Agende mensagens por cron expression
- Suporte a mensagens unicas e recorrentes
- Suporte a midia nas mensagens agendadas

### Anotacoes
- Criar, listar e remover anotacoes do grupo
- Uteis para regras, lembretes e informacoes fixas

### Rankings e Estatisticas
- **Rank Ativos** - Membros mais ativos por mensagens
- **Rank Figurinhas** - Quem mais criou figurinhas
- **Rank Gold** - Mais ricos do grupo
- **Rank Level** - Maiores niveis de XP
- **Rank Inativos** - Membros menos ativos
- **Ultimos Ativos** - Atividade recente
- **Perfil** - Estatisticas individuais completas
- **Novatos do dia** - Quem entrou hoje

### Parcerias
- Modo parceria ON/OFF
- Adicionar e remover grupos parceiros
- Listar parcerias ativas

### Outras Funcionalidades
- **Multi-prefixo** - Aceita `#`, `/`, `.`, `!` (configuravel por grupo)
- **Cooldown de comandos** - Anti-spam de comandos
- **Lista negra global** - Banir usuarios de todos os grupos
- **Lista branca** - Usuarios isentos do antilink
- **Bloquear comandos** - Desativar comandos especificos por grupo
- **AFK** - Marque-se como ausente com motivo
- **Nick** - Defina um apelido
- **Aniversario** - Registre sua data de nascimento
- **Feedback** - Avalie o bot
- **Casamentos** - Case-se com outro membro
- **Fake message** - Gere mensagens falsas divertidas

---

## Estrutura do Projeto

```
demibot-whatsapp/
├── index.js                # Entrada principal do bot
├── config.js               # Configuracoes gerais
├── package.json            # Dependencias
├── commands/
│   ├── menu.js             # Menus interativos
│   ├── admin.js            # Comandos de administracao
│   ├── sticker.js          # Criacao de figurinhas
│   ├── download.js         # Downloads de midia
│   ├── games.js            # Jogos e brincadeiras
│   ├── gold.js             # Sistema de economia
│   ├── effects.js          # Efeitos de imagem/audio
│   ├── info.js             # Informacoes e utilidades
│   └── group.js            # Rankings e estatisticas
├── lib/
│   ├── database.js         # Banco de dados SQLite
│   └── utils.js            # Funcoes utilitarias
├── panel/
│   └── server.js           # Painel web de configuracao
└── data/
    └── demibot.db          # Banco SQLite (gerado automaticamente)
```

---

## Pre-requisitos

- **Node.js** 18 ou superior
- **npm** ou **pnpm**
- **FFmpeg** instalado no sistema (para processamento de audio/video)
- **yt-dlp** instalado no sistema (para downloads do YouTube)

### Instalacao do FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg -y
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Baixe em [ffmpeg.org](https://ffmpeg.org/download.html) e adicione ao PATH.

### Instalacao do yt-dlp

```bash
# Via pip
pip install yt-dlp

# Ou via npm (ja incluso como dependencia)
# O pacote yt-dlp-exec cuida disso automaticamente
```

---

## Instalacao

1. **Clone o repositorio:**
```bash
git clone https://github.com/seu-usuario/demibot-whatsapp.git
cd demibot-whatsapp
```

2. **Instale as dependencias:**
```bash
npm install
```

3. **Configure o bot:**

Edite o arquivo `config.js` com suas informacoes:

```javascript
// Numero da dona do bot (com codigo do pais)
ownerNumber: '5511999999999@s.whatsapp.net',

// Nome da dona
ownerName: 'SeuNome',

// Prefixos aceitos
prefixes: ['#', '/', '.', '!'],

// Maximo de advertencias antes do ban
maxWarnings: 3,

// APIs externas (opcional)
apis: {
  removeBg: 'SUA_API_KEY',    // remove.bg
  openai: 'SUA_API_KEY',      // OpenAI
  gemini: 'SUA_API_KEY',      // Google Gemini
  weather: 'SUA_API_KEY',     // OpenWeather
  lastfm: 'SUA_API_KEY',      // Last.fm
},
```

4. **Inicie o bot:**
```bash
npm start
```

5. **Escaneie o QR Code** que aparecera no terminal com seu WhatsApp.

---

## Uso

### Primeiros Passos
Apos escanear o QR Code, o bot estara ativo. Adicione-o a um grupo e promova-o a **administrador** para que ele possa gerenciar o grupo.

### Comandos Basicos

| Comando | Descricao |
|---------|-----------|
| `#menu` | Menu principal com todos os sub-menus |
| `#menu figurinhas` | Menu de figurinhas |
| `#menu adm` | Menu de administracao |
| `#menu gold` | Menu do sistema gold |
| `#menu downloads` | Menu de downloads |
| `#menu brincadeiras` | Menu de jogos e brincadeiras |
| `#menu efeitos` | Menu de efeitos |
| `#menu info` | Menu de informacoes |
| `#ping` | Verificar se o bot esta online |
| `#info` | Informacoes do bot |

### Exemplos de Uso

**Criar figurinha:**
```
# Envie uma imagem com a legenda:
#s

# Ou responda a uma imagem com:
#s
```

**Banir membro:**
```
#ban @membro
```

**Sistema Gold:**
```
#daily          # Receber gold diario
#gold           # Ver seu saldo
#cassino 100    # Apostar 100 gold
#doargold @user 50  # Doar 50 gold
```

**Downloads:**
```
#play nome da musica
#tiktok https://vm.tiktok.com/xxx
#instagram https://instagram.com/p/xxx
```

---

## Painel Web

O bot inclui um painel web para configuracao visual:

```bash
npm run panel
```

Acesse `http://localhost:3000` para gerenciar configuracoes do grupo, ver estatisticas e ajustar funcionalidades sem precisar usar comandos.

---

## Banco de Dados

O DemiBot usa **SQLite** via `better-sqlite3` para armazenamento local. O banco e criado automaticamente na pasta `data/` na primeira execucao.

### Tabelas Principais

| Tabela | Descricao |
|--------|-----------|
| `groups` | Configuracoes de cada grupo |
| `members` | Dados dos membros (gold, xp, level, msgs, etc.) |
| `blacklist` | Lista negra global |
| `whitelist` | Lista branca (antilink) |
| `banned_words` | Palavras proibidas por grupo |
| `scheduled_messages` | Mensagens agendadas |
| `notes` | Anotacoes do grupo |
| `sticker_cmds` | Comandos de figurinha salvos |
| `blocked_cmds` | Comandos bloqueados por grupo |
| `custom_roles` | Cargos personalizados |
| `activity_log` | Log de atividades |
| `polls` | Votacoes |
| `duels` | Duelos |
| `marriages` | Casamentos |
| `partnerships` | Parcerias entre grupos |
| `feedback` | Avaliacoes do bot |
| `daily_newcomers` | Novatos do dia |

---

## APIs Externas (Opcional)

Algumas funcionalidades requerem APIs externas:

| API | Funcionalidade | Link |
|-----|---------------|------|
| remove.bg | Remover fundo de imagens | [remove.bg](https://www.remove.bg/api) |
| OpenAI | Smart Sticker, respostas IA | [openai.com](https://platform.openai.com) |
| Google Gemini | Alternativa de IA | [ai.google.dev](https://ai.google.dev) |
| OpenWeather | Previsao do tempo | [openweathermap.org](https://openweathermap.org/api) |
| Last.fm | Informacoes de musicas | [last.fm/api](https://www.last.fm/api) |

---

## Hospedagem

### VPS (Recomendado)
```bash
# Use PM2 para manter o bot rodando
npm install -g pm2
pm2 start index.js --name demibot
pm2 save
pm2 startup
```

### Termux (Android)
```bash
pkg update && pkg upgrade
pkg install nodejs git ffmpeg python
git clone https://github.com/seu-usuario/demibot-whatsapp.git
cd demibot-whatsapp
npm install
node index.js
```

---

## Solucao de Problemas

| Problema | Solucao |
|----------|---------|
| QR Code nao aparece | Verifique se o Node.js 18+ esta instalado |
| Figurinhas nao funcionam | Instale o `sharp` e `ffmpeg` corretamente |
| Downloads falham | Verifique se o `yt-dlp` esta instalado e atualizado |
| Bot desconecta | Use PM2 para reinicio automatico |
| Erro de permissao | Promova o bot a admin do grupo |
| Banco corrompido | Delete `data/demibot.db` e reinicie (dados serao perdidos) |

---

## Contribuindo

1. Faca um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudancas (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## Licenca

Este projeto esta licenciado sob a licenca MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## Aviso Legal

Este bot e apenas para fins educacionais e de entretenimento. O uso do WhatsApp com bots automatizados pode violar os Termos de Servico do WhatsApp. Use por sua conta e risco. Os desenvolvedores nao se responsabilizam pelo uso indevido desta ferramenta.

---

<p align="center">
  Feito com Node.js e Baileys
</p>
