# N8N Workflow: GitHub Tests to Discord

Workflow que dispara testes Playwright no GitHub e envia resultados para Discord.

## 📋 Fluxo Teste

```
GitHub Webhook
    ↓
Check Branch (main)
    ↓
Trigger Playwright Tests
    ↓
Wait for Tests
    ↓
Extract Result
    ↓
Build Discord Message
    ↓
Send to Discord
```

## 🔧 Configuração

### 1. Secrets N8N

Configure estas variáveis no N8N:

```
GITHUB_WEBHOOK_SECRET=seu-secret-do-webhook
GITHUB_TOKEN=ghp_seu-token-github
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/seu-webhook
```

### 2. GitHub Setup

#### a) Gerar Token GitHub
1. Vá para: **GitHub** → **Settings** → **Developer settings** → **Personal access tokens**
2. Gere um token com permissões:
   - `repo` (acesso aos repositórios)
   - `workflow` (acesso ao GitHub Actions)
3. Copie o token para `GITHUB_TOKEN` no N8N

#### b) Criar Webhook GitHub
1. Vá para: **Seu Repositório** → **Settings** → **Webhooks**
2. Clique em **Add webhook**
3. Configure:
   - **Payload URL**: `https://seu-n8n.com/webhook/github-webhook`
   - **Content type**: `application/json`
   - **Secret**: Gere uma senha forte e copie para `GITHUB_WEBHOOK_SECRET`
   - **Events**: Selecione `Push events`
4. Clique em **Add webhook**

### 3. Discord Setup

#### a) Criar Webhook Discord
1. Vá para seu servidor Discord
2. Acesse **Server Settings** → **Integrations** → **Webhooks**
3. Clique em **Create Webhook**
4. Nomeie (ex: "Playwright Tests")
5. Copie a **Webhook URL** para `DISCORD_WEBHOOK_URL`

#### b) Testar Webhook
```bash
curl -X POST https://discord.com/api/webhooks/SEU_ID/SEU_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"content":"✅ Webhook funcionando!"}'
```

## 🚀 Como Usar

### Disparar Manualmente

No N8N:
1. Abra o workflow
2. Clique em **Execute Workflow**
3. Ele acionará os testes e enviará resultado para Discord

### Disparar Automaticamente

Ao fazer push na branch `main`:
1. O webhook do GitHub dispara automaticamente
2. N8N recebe o evento
3. Testes são executados
4. Resultado é enviado para Discord

## 📊 Mensagem Discord

A mensagem enviada inclui:
- ✅ ou ❌ Status (verde ou vermelho)
- Repository info
- Branch
- Status do workflow
- Link para ver detalhes
- Timestamp

## 🔍 Troubleshooting

### Webhook não dispara
- Verifique se o GitHub consegue acessar N8N (URL pública)
- Verifique o secret no GitHub vs N8N
- Veja os logs do webhook no GitHub

### Testes não disparam
- Verifique o token GitHub com permissões `workflow`
- Confirme que o workflow `playwright.yml` existe
- Veja os logs N8N para erros

### Discord não recebe mensagem
- Verifique a Webhook URL do Discord
- Confirme que o bot tem permissão no canal
- Veja erros nos logs N8N

## 📝 Variáveis Disponíveis

```json
{
  "repository": {
    "name": "Playwright-N8N-IA",
    "owner": {
      "login": "PauloCabralGit"
    }
  },
  "ref": "refs/heads/main",
  "pusher": {
    "name": "seu-usuario"
  }
}
```

## 🛠️ Personalização

### Alterar Branch
Edite o node **Trigger Playwright Tests**:
```json
"ref": "main"  // mude para sua branch
```

### Adicionar Mais Testes
Adicione mais nodes GitHub para disparar outros workflows

### Mudar Formato Discord
Edite o node **Send to Discord** para personalizar a mensagem

## 📚 Links Úteis

- [N8N GitHub Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.github/)
- [N8N Discord Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.discord/)
- [GitHub Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [Discord Webhooks](https://discord.com/developers/docs/resources/webhook)

## ⚠️ Notas

- O workflow aguarda até 30 minutos pelos testes
- Se os testes durarem mais, ajuste o timeout
- Credenciais devem estar como secrets do N8N, nunca hardcoded
