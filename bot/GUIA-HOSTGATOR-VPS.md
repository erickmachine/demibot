# Guia Completo: Instalando o DemiBot em uma VPS HostGator

> Guia passo a passo para quem nunca mexeu com VPS. Cada etapa e detalhada para voce conseguir colocar o bot para rodar sem dificuldade.

---

## Indice

1. [Contratando a VPS na HostGator](#1-contratando-a-vps-na-hostgator)
2. [Acessando a VPS pela primeira vez](#2-acessando-a-vps-pela-primeira-vez)
3. [Preparando o servidor](#3-preparando-o-servidor)
4. [Instalando o Node.js](#4-instalando-o-nodejs)
5. [Instalando o FFmpeg e yt-dlp](#5-instalando-o-ffmpeg-e-yt-dlp)
6. [Baixando o DemiBot do GitHub](#6-baixando-o-demibot-do-github)
7. [Configurando o Bot](#7-configurando-o-bot)
8. [Conectando ao WhatsApp (QR Code)](#8-conectando-ao-whatsapp-qr-code)
9. [Mantendo o bot rodando 24h com PM2](#9-mantendo-o-bot-rodando-24h-com-pm2)
10. [Comandos uteis do dia a dia](#10-comandos-uteis-do-dia-a-dia)
11. [Atualizando o bot](#11-atualizando-o-bot)
12. [Resolvendo problemas comuns](#12-resolvendo-problemas-comuns)
13. [Seguranca da VPS](#13-seguranca-da-vps)

---

## 1. Contratando a VPS na HostGator

### Qual plano escolher?

Acesse: https://www.hostgator.com.br/servidores/vps

O DemiBot roda com pouco recurso. O plano mais basico e suficiente:

| Recurso         | Minimo Recomendado |
|------------------|--------------------|
| CPU              | 1 vCPU             |
| RAM              | 1 GB               |
| Armazenamento   | 20 GB SSD          |
| Sistema          | **Ubuntu 22.04**   |

### Na hora de contratar:

1. Acesse hostgator.com.br e clique em **VPS**
2. Escolha o **plano basico** (Linux)
3. No sistema operacional, selecione **Ubuntu 22.04 LTS** (IMPORTANTE)
4. Complete o pagamento
5. Voce recebera um e-mail com:
   - **IP do servidor** (ex: `189.33.xx.xx`)
   - **Usuario** (geralmente `root`)
   - **Senha** (senha provisoria)

> Guarde esses dados! Voce vai precisar deles no proximo passo.

---

## 2. Acessando a VPS pela primeira vez

### No Windows (usando PuTTY)

1. Baixe o PuTTY: https://www.putty.org/
2. Abra o PuTTY
3. No campo **Host Name**, digite o **IP da VPS** que recebeu por e-mail
4. Porta: **22**
5. Clique em **Open**
6. Na tela preta que abrir:
   - login as: `root`
   - Password: *cole a senha do e-mail* (nao aparece nada na tela enquanto digita, e normal)
7. Aperte Enter

### No Mac/Linux (usando Terminal)

1. Abra o Terminal
2. Digite:

```bash
ssh root@SEU_IP_AQUI
```

3. Digite `yes` quando perguntar sobre fingerprint
4. Cole a senha e aperte Enter

### Pronto! Voce esta dentro da VPS.

A tela deve mostrar algo como:

```
root@vps:~#
```

Isso significa que voce tem controle total do servidor.

---

## 3. Preparando o servidor

Copie e cole cada comando abaixo **um por vez** no terminal e aperte Enter:

### Atualizar o sistema

```bash
apt update && apt upgrade -y
```

> Isso pode demorar uns 2-5 minutos. Aguarde terminar.

### Instalar ferramentas basicas

```bash
apt install -y curl wget git build-essential unzip
```

---

## 4. Instalando o Node.js

O DemiBot precisa do Node.js versao 18 ou superior. Vamos instalar a versao 20 (LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
```

```bash
apt install -y nodejs
```

### Verificar se instalou corretamente:

```bash
node -v
```

Deve aparecer algo como: `v20.x.x`

```bash
npm -v
```

Deve aparecer algo como: `10.x.x`

### Instalar o pnpm (gerenciador de pacotes mais rapido):

```bash
npm install -g pnpm
```

---

## 5. Instalando o FFmpeg e yt-dlp

O FFmpeg e necessario para figurinhas animadas e conversao de audio/video.
O yt-dlp e necessario para os comandos de download (YouTube, TikTok, etc).

### FFmpeg

```bash
apt install -y ffmpeg
```

Verificar:

```bash
ffmpeg -version
```

### yt-dlp

```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
```

Verificar:

```bash
yt-dlp --version
```

---

## 6. Baixando o DemiBot do GitHub

### Criar pasta para o bot

```bash
mkdir -p /home/bots
cd /home/bots
```

### Clonar o repositorio

Substitua `SEU_USUARIO` e `SEU_REPOSITORIO` pelo seu GitHub:

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git demibot
```

### Entrar na pasta

```bash
cd demibot
```

Se o codigo do bot esta dentro de uma subpasta `bot/`, entre nela:

```bash
cd bot
```

### Instalar as dependencias

```bash
pnpm install
```

> Isso vai baixar todas as bibliotecas que o bot precisa. Pode demorar 1-3 minutos.

Se der erro com `better-sqlite3`, execute:

```bash
apt install -y python3
npm rebuild better-sqlite3
```

---

## 7. Configurando o Bot

### Editar o arquivo de configuracao

```bash
nano config.js
```

O editor `nano` vai abrir o arquivo. Altere os seguintes campos:

```javascript
ownerNumber: '5511999999999@s.whatsapp.net',
// Troque pelo seu numero com DDI+DDD (sem espacos, sem tracos)
// Exemplo: 5521987654321@s.whatsapp.net

ownerName: 'Dona',
// Troque pelo seu nome ou apelido
```

### Se tiver chaves de API, configure tambem:

```javascript
apis: {
    removeBg: 'SUA_CHAVE_AQUI',    // remove.bg (remover fundo)
    openai: 'SUA_CHAVE_AQUI',       // ChatGPT
    gemini: 'SUA_CHAVE_AQUI',       // Google Gemini
    weather: 'SUA_CHAVE_AQUI',      // OpenWeather
    lastfm: 'SUA_CHAVE_AQUI',       // Last.fm
},
```

> As APIs sao opcionais. O bot funciona sem elas, so que os comandos que dependem delas nao vao funcionar.

### Salvar e sair do nano:

1. Aperte `Ctrl + O` (salvar)
2. Aperte `Enter` (confirmar)
3. Aperte `Ctrl + X` (sair)

---

## 8. Conectando ao WhatsApp (QR Code)

### Iniciar o bot pela primeira vez

```bash
node index.js
```

### Escanear o QR Code

1. Um **QR Code** vai aparecer no terminal (feito de caracteres)
2. No seu celular:
   - Abra o **WhatsApp**
   - Va em **Configuracoes** > **Dispositivos conectados**
   - Toque em **Conectar dispositivo**
   - **Escaneie o QR Code** que aparece no terminal
3. Aguarde a mensagem:

```
[DemiBot] Conectado com sucesso!
```

> Se o QR Code expirar, ele vai gerar outro automaticamente. Apenas escaneie de novo.

### Testar o bot

Envie em qualquer grupo onde o bot esta: `#menu`

Se o menu aparecer, esta tudo funcionando!

**Pare o bot por enquanto** com `Ctrl + C`. Vamos configurar ele para rodar 24 horas.

---

## 9. Mantendo o bot rodando 24h com PM2

O PM2 e um gerenciador de processos que mantem o bot rodando mesmo se voce fechar o terminal.

### Instalar o PM2

```bash
npm install -g pm2
```

### Iniciar o bot com PM2

Certifique-se de estar na pasta do bot:

```bash
cd /home/bots/demibot/bot
```

Iniciar:

```bash
pm2 start index.js --name demibot
```

### Configurar para iniciar automaticamente se a VPS reiniciar

```bash
pm2 startup
```

> O PM2 vai mostrar um comando. **Copie e cole** esse comando e aperte Enter.

Depois salve a configuracao:

```bash
pm2 save
```

### Verificar se esta rodando

```bash
pm2 status
```

Voce deve ver algo como:

```
+--------+---------+------+----------+-------+
| name   | status  | cpu  | mem      | uptime|
+--------+---------+------+----------+-------+
| demibot| online  | 0.5% | 85.0 MB  | 5m    |
+--------+---------+------+----------+-------+
```

Pronto! O bot esta rodando 24 horas.

---

## 10. Comandos uteis do dia a dia

Estes sao os comandos que voce mais vai usar para gerenciar o bot na VPS:

### Gerenciamento do bot (PM2)

| O que voce quer fazer          | Comando                        |
|--------------------------------|--------------------------------|
| Ver se o bot esta rodando      | `pm2 status`                   |
| Ver os logs (mensagens do bot) | `pm2 logs demibot`             |
| Ver os ultimos 100 logs        | `pm2 logs demibot --lines 100` |
| Reiniciar o bot                | `pm2 restart demibot`          |
| Parar o bot                    | `pm2 stop demibot`             |
| Iniciar o bot (se parado)      | `pm2 start demibot`            |
| Ver consumo de memoria/CPU     | `pm2 monit`                    |

### Gerenciamento do servidor

| O que voce quer fazer          | Comando                        |
|--------------------------------|--------------------------------|
| Ver espaco em disco            | `df -h`                        |
| Ver uso de memoria             | `free -h`                      |
| Ver processos rodando          | `htop` (instalar: `apt install htop`) |
| Reiniciar a VPS                | `reboot`                       |

### Navegacao de pastas

| O que voce quer fazer          | Comando                        |
|--------------------------------|--------------------------------|
| Ir para a pasta do bot         | `cd /home/bots/demibot/bot`    |
| Ver arquivos da pasta atual    | `ls -la`                       |
| Editar um arquivo              | `nano nome-do-arquivo.js`      |
| Voltar uma pasta               | `cd ..`                        |

---

## 11. Atualizando o bot

Quando voce fizer alteracoes no GitHub e quiser atualizar na VPS:

### Passo 1: Ir para a pasta do bot

```bash
cd /home/bots/demibot
```

### Passo 2: Baixar as atualizacoes

```bash
git pull origin main
```

> Se o branch principal for `master`, troque `main` por `master`.

### Passo 3: Instalar novas dependencias (se houver)

```bash
cd bot
pnpm install
```

### Passo 4: Reiniciar o bot

```bash
pm2 restart demibot
```

### Passo 5: Verificar se esta tudo OK

```bash
pm2 logs demibot --lines 20
```

---

## 12. Resolvendo problemas comuns

### "Nao aparece QR Code"

**Causa:** A sessao antiga pode estar corrompida.

**Solucao:**

```bash
pm2 stop demibot
rm -rf /home/bots/demibot/bot/auth
pm2 start demibot
pm2 logs demibot
```

Escaneie o novo QR Code que aparecer nos logs.

---

### "Bot desconecta toda hora"

**Causa:** Problema de conexao ou WhatsApp deslogou o dispositivo.

**Solucao:**

1. No celular, va em **Dispositivos conectados** e veja se o bot aparece
2. Se nao aparecer, delete a pasta `auth` e reconecte (como acima)
3. Verifique a internet da VPS:

```bash
ping -c 5 google.com
```

---

### "Erro: Cannot find module"

**Causa:** Dependencias nao foram instaladas.

**Solucao:**

```bash
cd /home/bots/demibot/bot
rm -rf node_modules
pnpm install
pm2 restart demibot
```

---

### "Erro com better-sqlite3"

**Causa:** O modulo nativo precisa ser compilado no sistema.

**Solucao:**

```bash
apt install -y python3 make g++
cd /home/bots/demibot/bot
npm rebuild better-sqlite3
pm2 restart demibot
```

---

### "Erro com sharp (figurinhas)"

**Causa:** O sharp precisa de bibliotecas do sistema.

**Solucao:**

```bash
apt install -y libvips-dev
cd /home/bots/demibot/bot
npm rebuild sharp
pm2 restart demibot
```

---

### "Bot esta lento / usando muita memoria"

**Solucao:**

```bash
pm2 restart demibot
```

Se continuar, verifique o consumo:

```bash
pm2 monit
```

Se a memoria estiver acima de 500MB, limpe os temporarios:

```bash
rm -rf /home/bots/demibot/bot/temp/*
pm2 restart demibot
```

---

### "yt-dlp nao funciona (download de videos)"

**Causa:** yt-dlp desatualizado.

**Solucao:**

```bash
yt-dlp -U
```

Ou reinstalar:

```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
pm2 restart demibot
```

---

## 13. Seguranca da VPS

### Trocar a senha do root (IMPORTANTE)

Faca isso logo no primeiro acesso:

```bash
passwd
```

Digite a nova senha duas vezes. Use uma senha forte (letras, numeros, simbolos).

### Criar um usuario separado (recomendado)

Evite usar `root` no dia a dia:

```bash
adduser botadmin
usermod -aG sudo botadmin
```

Depois, acesse a VPS com:

```bash
ssh botadmin@SEU_IP
```

### Ativar firewall basico

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Quando perguntar, digite `y` e aperte Enter.

### Manter o sistema atualizado

Execute a cada 1-2 semanas:

```bash
apt update && apt upgrade -y
```

---

## Resumo rapido (cola aqui na parede)

```
=== CHEAT SHEET DEMIBOT - VPS HOSTGATOR ===

Acessar VPS:       ssh root@SEU_IP
Ir para o bot:     cd /home/bots/demibot/bot
Ver status:        pm2 status
Ver logs:          pm2 logs demibot
Reiniciar bot:     pm2 restart demibot
Parar bot:         pm2 stop demibot
Atualizar bot:     cd /home/bots/demibot && git pull && cd bot && pnpm install && pm2 restart demibot
Reconectar WA:     pm2 stop demibot && rm -rf auth && pm2 start demibot && pm2 logs demibot
Editar config:     nano config.js
```

---

## Duvidas?

Se algo nao funcionar:

1. Veja os logs: `pm2 logs demibot --lines 50`
2. O erro geralmente aparece la com a explicacao
3. Copie a mensagem de erro e pesquise no Google
4. Se precisar de ajuda, abra uma **Issue** no repositorio do GitHub

---

*Guia criado para o DemiBot - Bot WhatsApp com tema Demi Lovato*
