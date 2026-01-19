# 📸 GUIA VISUAL - Como Importar o Workflow N8N

## 🎯 Você está aqui: http://localhost:5678

### PASSO 1: Clique em "Files"

```
┌─────────────────────────────────────────────────────┐
│  N8N Interface                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [⊕] [⚙️ Files] [⚡] [📊]  ← CLIQUE AQUI EM "Files"    │
│                                                     │
│  Workflows / Projects / Credentials                │
│                                                     │
│  ────────────────────────────────────────────       │
│                                                     │
│  [Workflow 1]  [Workflow 2]                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### PASSO 2: Clique em "Import"

```
┌─────────────────────────────────────────────────────┐
│  Files Menu                                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  My Workflows                                       │
│                                                     │
│  [+ New] [Import] ← CLIQUE AQUI EM "Import"       │
│                                                     │
│  ────────────────────────────────────────────       │
│                                                     │
│  (lista de workflows)                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### PASSO 3: Selecione o arquivo

```
┌─────────────────────────────────────────────────────┐
│  Escolher arquivo                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Selecione este arquivo:                            │
│                                                     │
│  n8n-workflows/                                     │
│    └─ playwright-with-discord.json                 │
│       ↑ SELECIONE ESTE                             │
│                                                     │
│  [Cancelar] [Importar]                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### PASSO 4: Clique em "Importar"

A página recarregará e o workflow será importado.

### PASSO 5: Clique em "ACTIVATE"

```
┌─────────────────────────────────────────────────────┐
│  Playwright Tests + Discord Notification           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [◯ ACTIVATE] [Save] [Duplicate] ← CLIQUE AQUI    │
│                                                     │
│  [Webhook] ──→ [Start] ──→ [Wait] ──→ [Poll]      │
│                                                     │
│  ── Loop ──────────→ [Success] / [Failure]         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### ✅ Pronto!

O workflow está agora ativo. 

**Agora execute no terminal:**
```powershell
npm run test-webhook
```

---

## 🎬 Video Passo a Passo (Descrição)

1. **Vá para http://localhost:5678**
   - Você deve ver a interface N8N

2. **Clique em "Files"** (canto superior esquerdo)
   - Você verá a lista de workflows

3. **Clique em "+ New" ou "Import"**
   - Uma janela de seleção de arquivo aparecerá

4. **Navegue até: `n8n-workflows/playwright-with-discord.json`**
   - Selecione o arquivo

5. **Clique em "Importar" ou "Import"**
   - O workflow será importado e aberto

6. **Clique em "ACTIVATE"** (botão azul no topo)
   - O workflow será ativado

7. **Volte ao terminal e execute:**
   ```powershell
   npm run test-webhook
   ```

---

## ✨ Resultado Esperado

Ao executar o teste, você verá:

```
✅ Webhook disparado com sucesso!

📊 Resposta:
{
  "id": "67838a23-707d-448a-96e6-a09ba5cfc8f7",
  "status": "running",
  "startTime": "2026-01-19T19:20:52.612Z",
  ...
}

⏳ Aguardando conclusão...
Status: running ⏳
Status: running ⏳
✅ Testes concluídos!

📈 Resultado:
{
  "status": "completed",
  "exitCode": 0,
  "message": "Testes executados com sucesso"
}

🎉 TESTES PASSARAM!
```

---

## 🆘 Troubleshooting

### Se receber: "404 - webhook not registered"
- ✅ O workflow **não está ativado**
- ✅ Clique em ACTIVATE no N8N
- ✅ Tente novamente

### Se o teste não responder
- ✅ Verifique se N8N está realmente rodando
- ✅ Verifique se está em http://localhost:5678
- ✅ Recarregue a página

### Se receber erro de credenciais
- ✅ Verifique o arquivo `.env`
- ✅ Verifique se SF_URL, SF_LOGIN, SF_PASSWORD estão corretos
- ✅ Verifique se o test-runner está rodando

---

**Próximo passo: Importe o workflow e teste! 🚀**
