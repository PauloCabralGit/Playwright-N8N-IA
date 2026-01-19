# 🚀 GitHub Actions + N8N + Discord Integration

Setup completo para executar testes Playwright via GitHub Actions, disparar N8N e receber notificações no Discord.

## 📋 Pré-requisitos

- ✅ N8N rodando em `http://localhost:5678` (ou URL remota)
- ✅ Test-runner Playwright rodando em `http://localhost:9998`
- ✅ Discord Server com webhook configurado
- ✅ GitHub Repository com secrets configurados

## 🚀 Início Rápido

### Windows PowerShell:

```powershell
.\setup-discord.ps1
```

### Linux/Mac (bash):

```bash
chmod +x setup-discord.sh
./setup-discord.sh
```

O script irá:
1. ✅ Solicitar Discord Webhook URL
2. ✅ Configurar N8N Webhook URL
3. ✅ Solicitar credenciais Salesforce
4. ✅ Criar/atualizar arquivo `.env`
5. ✅ Exibir próximos passos

## ⚙️ Configuração Manual

Se preferir configurar manualmente, siga estes passos:

### 1. Discord Webhook

1. Abra Discord
2. Clique com **botão direito** no canal de testes
3. **Editar Canal** → **Integrações** → **Webhooks**
4. **Criar Webhook**
5. **Copiar URL do Webhook**

Exemplo de URL:
```
https://discord.com/api/webhooks/123456789/abcdefghijklmnop
```

### 2. N8N Workflow

1. Acesse `http://localhost:5678`
2. Vá em **Files** → **Import**
3. Selecione `n8n-workflows/playwright-with-discord.json`
4. Clique em **Import**
5. Clique em **Activate** para ativar o workflow

### 3. GitHub Secrets

1. Acesse seu repositório GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**

Crie estes secrets:

| Segredo | Valor | Exemplo |
|---------|-------|---------|
| `DISCORD_WEBHOOK_URL` | URL do webhook Discord | `https://discord.com/api/webhooks/...` |
| `N8N_WEBHOOK_URL` | URL do webhook N8N | `http://localhost:5678/webhook/github-tests` |
| `SF_URL` | URL do Salesforce | `https://...sandbox.lightning.force.com/` |
| `SF_LOGIN` | Email Salesforce | `seu-email@globalhitss.com.br.preprod` |
| `SF_PASSWORD` | Senha Salesforce | `Sua@Senha123` |

## 📁 Arquivos Criados

```
.
├── setup-discord.ps1                          # Script setup para Windows
├── setup-discord.sh                           # Script setup para Linux/Mac
├── DISCORD_SETUP.md                           # Guia completo de setup
├── n8n-workflows/
│   ├── playwright-with-discord.json           # Workflow com Discord notification
│   └── docker-compose.yml                     # Docker compose N8N
├── .github/
│   └── workflows/
│       ├── playwright.yml                     # Workflow original (local)
│       └── playwright-via-n8n.yml             # Novo workflow (dispara N8N)
└── .env                                       # Variáveis de ambiente
```

## 🔄 Workflow - O que Acontece

```
GitHub Actions (push/PR)
        ↓
   Trigger N8N
        ↓
  N8N Webhook recebe
        ↓
Dispara Test-Runner
        ↓
Aguarda Conclusão
        ↓
   ✅ Sucesso ❌ Falha
        ↓         ↓
   Mensagem  Mensagem
   Verde no  Vermelha
   Discord   no Discord
```

## 🧪 Testar Manualmente

### Via PowerShell:

```powershell
# Teste o webhook do N8N
$WEBHOOK_URL = "http://localhost:5678/webhook/github-tests"
$PAYLOAD = @{
    environment = "preprod"
    source = "manual-test"
} | ConvertTo-Json

Invoke-RestMethod -Uri $WEBHOOK_URL -Method Post -Body $PAYLOAD -ContentType "application/json"
```

### Via cURL (Linux/Mac):

```bash
curl -X POST http://localhost:5678/webhook/github-tests \
  -H "Content-Type: application/json" \
  -d '{"environment":"preprod","source":"manual-test"}'
```

## 📊 Monitorar Execução

### No N8N:
- Acesse `http://localhost:5678`
- Clique no workflow ativo
- Veja os dados passando em tempo real

### No Discord:
- Acesse o canal configurado
- Você receberá uma mensagem com:
  - Status (✅ Sucesso / ❌ Falha)
  - Código de saída
  - ID da execução
  - Tempo de execução

### No GitHub Actions:
- Acesse seu repo → **Actions**
- Selecione **"Playwright Tests via N8N"**
- Clique na execução para ver logs

## 🛠️ Troubleshooting

### ❌ "N8N_WEBHOOK_URL not configured"

**Solução:**
- Adicione `N8N_WEBHOOK_URL` nos secrets do GitHub
- Ou defina em `.env` localmente

### ❌ Não recebo mensagem no Discord

**Verificar:**
1. URL do Discord webhook está válida?
2. Variável `DISCORD_WEBHOOK_URL` está configurada no N8N?
3. Workflow está **Ativado** no N8N?
4. Verifique os logs do N8N para erros

### ❌ "Authorization failed" no N8N

**Solução:**
- Verifique se o test-runner está rodando:
  ```powershell
  Get-Job | Where-Object { $_.Name -eq "playwright-test-runner" }
  ```
- Se não estiver, inicie:
  ```powershell
  npm run start-runner
  ```

### ❌ Webhook não é chamado

**Verificar:**
1. N8N está rodando? (http://localhost:5678)
2. Workflow está **Ativado**?
3. URL do webhook está correta?
4. Se remoto, use ngrok para tunnel:
   ```bash
   ngrok http 5678
   ```

## 📚 Arquivos de Referência

- **[DISCORD_SETUP.md](./DISCORD_SETUP.md)** - Guia detalhado de setup Discord
- **[.github/workflows/playwright-via-n8n.yml](./.github/workflows/playwright-via-n8n.yml)** - Workflow do GitHub
- **[n8n-workflows/playwright-with-discord.json](./n8n-workflows/playwright-with-discord.json)** - Workflow do N8N

## 🚀 Próximos Passos

1. ✅ Execute `setup-discord.ps1` ou `setup-discord.sh`
2. ✅ Adicione os secrets no GitHub
3. ✅ Importe o workflow no N8N
4. ✅ Ative o workflow
5. ✅ Teste via GitHub Actions
6. ✅ Receba notificações no Discord 🎉

## 💡 Dicas

- **Customizar mensagens Discord:** Edite o JSON nos nós "Discord Success" e "Discord Failure"
- **Adicionar mais testes:** Expanda `tests/` com novos `.spec.ts`
- **Agendar execuções:** Use Cron trigger no N8N em vez de Webhook
- **Integrar Slack:** Adicione nós HTTP para Slack webhook
- **Notificações Email:** Adicione nós de Email no N8N

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do N8N: `http://localhost:5678`
2. Verifique os logs do test-runner:
   ```powershell
   Get-Job | Select-Object Id,Name,State
   ```
3. Teste as URLs manualmente com cURL/PowerShell
4. Verifique os logs do GitHub Actions

---

**Criado com ❤️ para automação de testes Playwright + N8N + Discord**
