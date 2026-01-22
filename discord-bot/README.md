# Discord Bot para n8n

Bot Discord que escuta comandos e envia para workflows do n8n, permitindo disparar GitHub Actions via Discord.

## 🚀 Funcionalidades

- **Comando `!deploy`**: Envia sinal para o n8n executar workflow
- **Integração com n8n**: Envia payload JSON com dados do usuário e comando
- **Respostas automáticas**: Confirmação de envio ou erro
- **Docker support**: Containerizado para fácil deployment

## 📋 Pré-requisitos

- Node.js 18+
- Docker & Docker Compose
- Token de bot Discord
- Webhook do n8n configurado

## 🔧 Configuração

### 1. Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o `.env`:
```env
DISCORD_TOKEN=SEU_BOT_TOKEN_AQUI
N8N_WEBHOOK_URL=https://pauloqa.app.n8n.cloud/webhook/discord-command
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Executar Localmente
```bash
npm start
```

### 4. Executar com Docker (Recomendado)
```bash
# Subir o container
docker compose up -d

# Ver logs
docker logs discord-bot-discord-bot-1

# Parar
docker compose down
```

## 📡 Configuração do n8n

1. **Criar Webhook Trigger**:
   - **Path**: `discord-command`
   - **Method**: POST
   - **Response Code**: 200
   - **Response Body**: `{"status": "received"}`

2. **Payload Recebido**:
```json
{
  "command": "deploy",
  "user": "username",
  "channel": "channel_id",
  "message": "!deploy"
}
```

3. **Conectar ao Fluxo**:
   - Use os dados do payload para disparar GitHub Actions
   - Configure HTTP Request node para chamar `workflow_dispatch`

## 🔄 Fluxo Completo

```
Discord (!deploy) 
    ↓
Bot Discord 
    ↓
Webhook n8n 
    ↓
GitHub Actions 
    ↓
Execução dos Testes 
    ↓
Webhook de Volta (já configurado) 
    ↓
Notificação no Discord
```

## 🐛 Troubleshooting

### Container reiniciando
Verifique os logs:
```bash
docker logs discord-bot-discord-bot-1
```

### Erro de token
- Verifique se o token está correto no `.env`
- Confirme se o bot tem permissões no servidor Discord

### Webhook não funciona
- Confirme o path `discord-command` no n8n
- Verifique se o workflow está ativo (toggle verde)

## 🚀 Deployment

### Produção
```bash
# Build e subir
docker compose -f docker-compose.prod.yml up -d --build
```

### Cloud Options
- **Replit**: Importe os arquivos e rode
- **Glitch**: Remix do projeto
- **VPS**: Use PM2 para manter online 24/7

## 📝 Logs

O bot inclui logging para debug:
- Payload enviado para n8n
- Respostas HTTP
- Erros de conexão

## 🤝 Contribuição

1. Fork
2. Feature branch
3. Commit
4. Pull Request

## 📄 Licença

MIT
