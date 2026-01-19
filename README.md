# Playwright Salesforce Automation

Automação de testes Playwright para login no Salesforce com suporte a autenticação EMC.

## 📋 Requisitos

- Node.js 18+
- npm ou yarn
- Credenciais válidas do Salesforce

## 🚀 Instalação

```bash
npm install
npx playwright install --with-deps
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado em `.env.example`:

```env
SALESFORCE_URL=https://seu-instance.sandbox.lightning.force.com/
SALESFORCE_EMAIL=seu-email@dominio.com
SALESFORCE_PASSWORD=sua-senha
EMC_CODE=seu-codigo-emc
VENDEDOR=Nome do Vendedor
CPF=seu-cpf
CEP=seu-cep
ESTADO=SP
```

## 📁 Estrutura do Projeto

```
.
├── src/
│   ├── pages/          # Page Objects
│   │   └── LoginPage.ts
│   ├── utils/          # Utilitários
│   └── fixtures/       # Dados de teste
├── tests/
│   ├── specs/          # Arquivos de teste
│   └── login.spec.ts
├── .env.example        # Template de variáveis
├── playwright.config.ts # Configuração Playwright
└── package.json
```

## 🧪 Executar Testes

### Modo headless (sem interface)
```bash
npm test
```

### Modo headed (com navegador visível)
```bash
npm run test:headed
```

### Modo interativo (UI)
```bash
npx playwright test --ui
```

### Ver relatório
```bash
npm run test:report
```

## 🔒 Segurança

- ⚠️ **NUNCA** commite o arquivo `.env` com credenciais reais
- Use GitHub Secrets para CI/CD
- O arquivo `.env` está no `.gitignore`

## 🔄 CI/CD

Este projeto está configurado com GitHub Actions:

- **Automático**: Executa ao fazer push na branch `main`
- **Manual**: Dispare via **Actions** → **Run workflow**

Os secrets devem estar configurados em **Settings** → **Secrets and variables** → **Actions**

## 📝 Testes Disponíveis

### Login Salesforce
- Navega até o Salesforce
- Realiza login com email e senha
- Se aparecer campo EMC, preenche com código de autenticação
- Valida sucesso do login

## 🛠️ Desenvolvimento

### Adicionar Novo Page Object

```typescript
// src/pages/NovaPage.ts
import { Page } from '@playwright/test';

export class NovaPage {
  constructor(page: Page) {
    this.page = page;
  }

  async minhaAcao() {
    // implementar
  }
}
```

### Criar Novo Teste

```typescript
// tests/specs/novo.spec.ts
import { test } from '@playwright/test';
import { NovaPage } from '../src/pages/NovaPage';

test('descrição do teste', async ({ page }) => {
  const novaPage = new NovaPage(page);
  await novaPage.minhaAcao();
});
```

## 📊 Relatórios

Depois de executar os testes, visualize o relatório:

```bash
npm run test:report
```

Os relatórios ficarão em `playwright-report/`

## 🐛 Troubleshooting

### Credenciais não encontradas
- Verifique se `.env` existe e está preenchido
- Ou configure variáveis de ambiente do sistema

### Elemento não encontrado
- Verifique os seletores em `src/pages/LoginPage.ts`
- Use `npx playwright codegen` para gerar seletores

### Timeout
- Aumentar timeout em `playwright.config.ts`
- Verificar conexão de internet

## 📞 Suporte

Para dúvidas ou problemas, verifique:
- [Documentação Playwright](https://playwright.dev)
- [Configuração de variáveis](https://github.com/motdotla/dotenv)

## 📄 Licença

Este projeto é privado.
