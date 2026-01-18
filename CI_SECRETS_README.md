Configurar GitHub Actions - Secrets

Para executar os testes Playwright em CI sem deixar credenciais no repositório, adicione os seguintes Secrets nas configurações do repositório (Settings > Secrets and variables > Actions):

- SF_URL: URL do Salesforce a ser usada nos testes (ex: https://cec-claro--preprod.sandbox.lightning.force.com/)
- SF_LOGIN: usuário de login (ex: paulo.cabral.3@...)
- SF_PASSWORD: senha do usuário

- RUNNER_URL: (opcional) URL do test-runner remoto que o workflow pode chamar (ex: http://runner-host:9998). Se não fornecido, o workflow executará os testes localmente no runner do Actions.
- RUNNER_API_KEY: (recomendado quando RUNNER_URL é usado) chave secreta que autentica requests do GitHub Actions ao test-runner. Defina este secret no repositório e também configure o mesmo valor como variável de ambiente `RUNNER_API_KEY` no servidor onde o test-runner roda.

Depois de adicionar os secrets, o workflow `.github/workflows/playwright.yml` irá injetá-los nas variáveis de ambiente do passo que roda os testes.

Rodando localmente

Se você quiser rodar os testes localmente usando as mesmas variáveis de ambiente (recomendado para evitar colocar credenciais em arquivos), execute no PowerShell:

```powershell
$env:SF_URL = 'https://...' ;
$env:SF_LOGIN = 'usuario' ;
$env:SF_PASSWORD = 'senha' ;
npx playwright test

Se você estiver testando o `test-runner-server.js` localmente e quiser forçar autenticação (recomendado), defina a variável `RUNNER_API_KEY` antes de iniciar o servidor e inclua o header Authorization nas requisições:

```powershell
$env:RUNNER_API_KEY = 'minha-chave-secreta'
node test-runner-server.js
# Em outro terminal:
Invoke-RestMethod -Uri 'http://localhost:9998/run-tests' -Method Post -Body (ConvertTo-Json @{ambiente='preprod'}) -ContentType 'application/json' -Headers @{ Authorization = "Bearer minha-chave-secreta" }
```
```

Nota: Não comite arquivos com credenciais. Use sempre GitHub Secrets em CI.
