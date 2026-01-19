# 🤖 Configuração do Discord para N8N + Playwright

## Passo 1: Criar um Servidor Discord (se não tiver)

1. Abra [Discord](https://discord.com)
2. Clique em "+" no lado esquerdo
3. Selecione "Criar um servidor"
4. Escolha um nome (ex: "Testes Playwright")

## Passo 2: Criar um Canal para Notificações

1. Entre no seu servidor Discord
2. Clique em "+" ao lado de "Canais de Texto"
3. Escolha um nome (ex: "testes-resultados")
4. Clique em "Criar Canal"

## Passo 3: Gerar o Webhook URL

### Via Web Discord:

1. Clique com **botão direito** no nome do canal "testes-resultados"
2. Selecione **"Editar Canal"**
3. Vá em **"Integrações"** (lado esquerdo)
4. Clique em **"Webhooks"**
5. Clique em **"Criar Webhook"**
6. Dê um nome (ex: "Playwright Bot")
7. Clique em **"Copiar URL do Webhook"**

✅ **Você agora tem a URL do webhook Discord**

Ela parecerá assim:
```
https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

## Passo 4: Configurar no N8N

### Via Workflow N8N:

1. Acesse N8N em `http://localhost:5678`
2. Vá até o workflow **"Playwright Tests + Discord Notification"**
3. Procure pelos nós de **Discord Success** e **Discord Failure**
4. Substitua a URL do webhook:
   - Clique no nó "Discord Success"
   - Na URL, deixe como: `{{ $env.DISCORD_WEBHOOK_URL }}`
5. Salve o workflow

### Via Variáveis de Ambiente:

1. Abra o arquivo `n8n-workflows/.env`:

```bash
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/SEU_ID/SEU_TOKEN
```

2. Substitua `SEU_ID` e `SEU_TOKEN` pela URL que você copiou
3. Salve o arquivo

## Passo 5: Configurar no GitHub Actions (Opcional)

Se quiser que o GitHub Actions dispare seu N8N e receba notificações:

### 5.1. Copie a URL do Webhook do N8N

1. Vá para o workflow **"Playwright Tests + Discord Notification"** no N8N
2. Clique no nó **"GitHub Webhook"**
3. Você verá uma URL como: `http://localhost:5678/webhook/github-tests`

Se está rodando remotamente:
```
https://seu-dominio.com/webhook/github-tests
```

### 5.2. Configure os Secrets no GitHub

1. Vá para seu repositório GitHub
2. Clique em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Crie os seguintes secrets:

| Nome | Valor |
|------|-------|
| `N8N_WEBHOOK_URL` | `http://localhost:5678/webhook/github-tests` (ou sua URL remota) |
| `SF_URL` | Sua URL Salesforce |
| `SF_LOGIN` | Seu email Salesforce |
| `SF_PASSWORD` | Sua senha Salesforce |
| `DISCORD_WEBHOOK_URL` | A URL do webhook Discord criada acima |

### 5.3. Teste o Workflow

1. Vá para a aba **Actions** do seu repositório
2. Selecione **"Playwright Tests via N8N"**
3. Clique em **"Run workflow"**
4. Aguarde a execução

Você deve receber uma mensagem no Discord quando os testes terminarem! ✨

## Passo 6: Importar o Workflow no N8N

1. Abra N8N em `http://localhost:5678`
2. Clique em **"Import workflow"** (ou vá em *Files* → *Import*)
3. Selecione o arquivo `n8n-workflows/playwright-with-discord.json`
4. Clique em **"Import"**
5. Clique em **"Activate"** no workflow importado

## Testando Manualmente

### Teste via PowerShell (Local):

```powershell
$WEBHOOK_URL = "http://localhost:5678/webhook/github-tests"
$PAYLOAD = @{
    ambiente = "preprod"
    source = "manual-test"
} | ConvertTo-Json

Invoke-RestMethod -Uri $WEBHOOK_URL -Method Post -Body $PAYLOAD -ContentType "application/json"
```

### Teste via cURL (Linux/Mac):

```bash
curl -X POST http://localhost:5678/webhook/github-tests \
  -H "Content-Type: application/json" \
  -d '{"ambiente":"preprod","source":"manual-test"}'
```

## 🎨 Customizando a Mensagem do Discord

O workflow atual envia:
- ✅ Mensagem verde se testes passarem
- ❌ Mensagem vermelha se testes falharem
- Status, código de saída e ID de execução

Para customizar:

1. Abra o workflow no N8N
2. Edite o nó **"Discord Success"** ou **"Discord Failure"**
3. Modifique o JSON do corpo da mensagem

Exemplo de customização:

```json
{
  "content": "🎯 **Seus Testes Personalizados**",
  "embeds": [
    {
      "title": "Resultados",
      "color": 3066993,
      "fields": [
        {
          "name": "Seu Campo",
          "value": "Seu Valor",
          "inline": true
        }
      ]
    }
  ]
}
```

## Troubleshooting

### ❌ Não recebo mensagens no Discord

1. Verifique se o webhook Discord está ativo (não revogado)
2. Verifique a variável de ambiente `DISCORD_WEBHOOK_URL`
3. Teste a URL manualmente com cURL
4. Verifique os logs do N8N em `http://localhost:5678`

### ❌ GitHub Actions não dispara N8N

1. Verifique se `N8N_WEBHOOK_URL` está configurado nos secrets do GitHub
2. Se N8N está local, use um serviço como **ngrok** para expor a URL
3. Teste a URL manualmente com cURL

### ❌ Webhook do N8N não funciona

1. Verifique se o workflow está **Activado**
2. Clique no webhook para ver a URL gerada
3. Teste com PowerShell/cURL
4. Verifique os logs do N8N

## Links Úteis

- 🔗 [Documentação Discord Webhooks](https://discord.com/developers/docs/resources/webhook)
- 🔗 [Documentação N8N Webhooks](https://docs.n8n.io/nodes/n8n-nodes-base.webhook/)
- 🔗 [Documentação GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
