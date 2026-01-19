# ✅ INTEGRAÇÃO GITHUB ACTIONS + N8N + DISCORD - COMPLETA!

## 🎯 O que foi criado:

### 1. **Workflow N8N com Discord** 
📄 `n8n-workflows/playwright-with-discord.json`

Este workflow:
- ✅ Recebe webhook do GitHub Actions
- ✅ Dispara testes Playwright via test-runner
- ✅ Aguarda conclusão dos testes
- ✅ Envia mensagem **VERDE** 🟢 se sucesso
- ✅ Envia mensagem **VERMELHA** 🔴 se falhar
- ✅ Inclui detalhes: status, código de saída, ID execução

### 2. **GitHub Actions Workflow**
📄 `.github/workflows/playwright-via-n8n.yml`

Este workflow:
- ✅ Dispara no push/PR para `main`
- ✅ Dispara manualmente (workflow_dispatch)
- ✅ Chama o webhook do N8N
- ✅ Passa credenciais via secrets
- ✅ Exibe URL para monitoramento

### 3. **Scripts de Setup**

#### Windows:
📄 `setup-env.ps1`
```powershell
.\setup-env.ps1
```

#### Linux/Mac:
📄 `setup-discord.sh` (chmod +x e executar)

### 4. **Documentação**

📄 `DISCORD_SETUP.md` - Guia completo com imagens
📄 `N8N_GITHUB_ACTIONS_SETUP.md` - Guia passo a passo

---

## 🚀 EXECUTAR AGORA

### Passo 1: Configurar Variáveis

**Windows PowerShell:**
```powershell
cd "c:\Projeto_Solar\Playwright-N8N-IA"
.\setup-env.ps1
```

Você será solicitado a informar:
- ✅ Discord Webhook URL
- ✅ N8N Webhook URL
- ✅ Salesforce URL, Login, Password

Será criado um arquivo `.env` com todas as variáveis

### Passo 2: Importar Workflow N8N

1. Abra `http://localhost:5678`
2. Clique em **Files** (canto superior esquerdo)
3. Clique em **Import**
4. Selecione `n8n-workflows/playwright-with-discord.json`
5. Clique em **Import**
6. **Clique no botão "Activate"** (canto superior direito)

### Passo 3: Configurar GitHub Secrets

1. Acesse seu repositório GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Crie estes 5 secrets:

```
DISCORD_WEBHOOK_URL    = https://discord.com/api/webhooks/...
N8N_WEBHOOK_URL        = http://localhost:5678/webhook/github-tests
SF_URL                 = https://...sandbox.lightning.force.com/
SF_LOGIN               = seu-email@globalhitss.com.br.preprod
SF_PASSWORD            = sua-senha-salesforce
```

### Passo 4: Teste no GitHub Actions

1. Vá para **Actions** no seu repo
2. Selecione **"Playwright Tests via N8N"**
3. Clique em **"Run workflow"**
4. Aguarde execução

### Passo 5: Verifique No Discord

Você receberá uma mensagem no canal Discord com:

**✅ Se testes passarem:**
```
✅ Testes Playwright Executados com Sucesso!

Status: completed
Código de Saída: 0
Duração: Aproximadamente 1 minuto
Execution ID: 67838a23-707d-448a-96e6-a09ba5cfc8f7
```

**❌ Se testes falharem:**
```
❌ Testes Playwright Falharam!

Status: failed
Código de Saída: 1
Mensagem: Test failed...
Erro: [stack trace]
```

---

## 📋 FLUXO COMPLETO

```
┌─────────────────────┐
│  GitHub Push/PR     │
│  ou Manual Trigger  │
└──────────┬──────────┘
           ↓
┌─────────────────────────────────┐
│ GitHub Actions Workflow         │
│ - Injeta secrets                │
│ - Chama N8N Webhook             │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ N8N Webhook Recebe              │
│ - GitHub Webhook triggers       │
│ - Extrai dados                  │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ Dispara Test-Runner             │
│ POST /run-tests                 │
│ - Credenciais Salesforce        │
│ - Ambiente: preprod             │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ Test-Runner Executa             │
│ - Playwright Tests              │
│ - Login test preprod            │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ N8N Polling                     │
│ GET /execution-details/:id      │
│ Aguarda conclusão               │
└──────────┬──────────────────────┘
           ↓
┌──────────────────────────────────┐
│ ✅ SUCESSO ou ❌ FALHA            │
└──────────┬───────────────────────┘
           ↓
┌──────────────────────────────────┐
│ Discord Notification             │
│ - Mensagem Colorida              │
│ - Status, Código, ID Execução    │
│ - Timestamp                      │
└──────────────────────────────────┘
```

---

## 🔧 COMPONENTES EM EXECUÇÃO

Antes de rodar tudo, garanta que está tudo ativo:

### ✅ N8N (Docker)
```powershell
docker-compose -f n8n-workflows/docker-compose.yml up -d
```

Deve estar rodando em `http://localhost:5678`

### ✅ Test-Runner (Node.js)
```powershell
npm run start-runner
```

Deve estar rodando em `http://localhost:9998`

### ✅ Verifique status:
```powershell
# Test-Runner
curl -s http://localhost:9998/current-status | ConvertFrom-Json

# N8N
curl -s http://localhost:5678/api/v1/health | ConvertFrom-Json
```

---

## 🎨 CUSTOMIZAÇÕES

### Mudar cor da mensagem Discord

No workflow N8N, edite os nós "Discord Success" e "Discord Failure":

```json
"color": 3066993  // Verde para sucesso
"color": 15158332 // Vermelho para falha
```

Cores Discord:
- Verde: `3066993`
- Vermelho: `15158332`
- Azul: `3447003`
- Amarelo: `15844367`

### Adicionar mais campos à mensagem

Edite o JSON do embed:

```json
{
  "name": "Seu Campo",
  "value": "{{ $json.seu_valor }}",
  "inline": true
}
```

### Agendar execuções automáticas

1. No N8N, remova o nó "GitHub Webhook"
2. Adicione um nó "Cron"
3. Configure frequência (diária, hourária, etc)

---

## 📊 MONITORAMENTO

### Real-time no N8N:
- Acesse `http://localhost:5678`
- Abra o workflow ativo
- Veja dados passando em tempo real

### Logs do Test-Runner:
```powershell
# Obter Job ID
Get-Job | Where-Object Name -Like "*playwright*"

# Ver output
Get-Job -Id 5 | Receive-Job -Newest 50
```

### Logs do GitHub Actions:
- Repository → Actions → Workflow → Execução → Logs

---

## 🐛 TROUBLESHOOTING

### Webhook N8N não funciona
1. Verifique se workflow está **Ativado**
2. URL: `http://localhost:5678/webhook/github-tests`
3. Teste com PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5678/webhook/github-tests" `
  -Method Post -Body '{}' -ContentType "application/json"
```

### Teste não executa
1. Verifique se test-runner está rodando: `npm run start-runner`
2. Verifique credenciais Salesforce no `.env`
3. Teste manualmente: `npm test`

### Mensagem não chega Discord
1. Verifique URL do webhook Discord
2. Teste com cURL:
```powershell
$discordUrl = "https://discord.com/api/webhooks/..."
$payload = @{ content = "Teste" } | ConvertTo-Json
Invoke-RestMethod -Uri $discordUrl -Method Post -Body $payload -ContentType "application/json"
```

---

## ✨ PRÓXIMAS MELHORIAS

- 🔔 Adicionar notificações Slack
- 📧 Enviar relatório por Email
- 🔐 Adicionar autenticação OAuth GitHub
- 📈 Dashboard de resultados
- 🔄 Retry automático em falhas
- 📱 Notificação WhatsApp/Telegram

---

## 📞 CHECKLIST FINAL

Antes de fazer push para produção:

- [ ] Setup script executado (`setup-env.ps1`)
- [ ] Arquivo `.env` criado com variáveis
- [ ] Discord webhook gerado e testado
- [ ] N8N workflow importado e ativado
- [ ] GitHub secrets configurados (5 secrets)
- [ ] Test-runner rodando (`npm run start-runner`)
- [ ] N8N rodando (`docker-compose up -d`)
- [ ] Teste manual no GitHub Actions passou
- [ ] Mensagem Discord recebida
- [ ] Todos os logs limpos

---

**🎉 TUDO PRONTO! Seu pipeline de testes com notificações Discord está completo!**

Qualquer dúvida, verifique a documentação em `DISCORD_SETUP.md` ou `N8N_GITHUB_ACTIONS_SETUP.md`
