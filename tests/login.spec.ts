import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { LoginPage } from '../pages/LoginPage';

// Carregar variáveis do .env (prioridade) ou .env.example (fallback)
const envPath = path.resolve(__dirname, '..', '.env');
const envExamplePath = path.resolve(__dirname, '..', '.env.example');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envExamplePath)) {
  console.warn('⚠️  Arquivo .env não encontrado, usando .env.example como template');
  dotenv.config({ path: envExamplePath });
} else {
  console.error('❌ Nenhum arquivo .env ou .env.example encontrado!');
}

function loadConfig() {
  const cfgPath = path.resolve(__dirname, '..', 'config', 'config.yaml');
  if (!fs.existsSync(cfgPath)) return null;
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const doc: any = yaml.load(raw);
  return doc?.settings ?? null;
}

test.describe('Salesforce Login', () => {
  const settings = loadConfig();
  test.setTimeout(120000);

  test('faz login no Salesforce com EMC', async ({ page }) => {
    // Carregar credenciais
    const url = process.env.SALESFORCE_URL || process.env.SF_URL || settings?.url_SF_preprod || settings?.url_SF_uat || settings?.url_SF_dev;
    const username = process.env.SALESFORCE_EMAIL || process.env.SF_LOGIN || settings?.Login;
    const password = process.env.SALESFORCE_PASSWORD || process.env.SF_PASSWORD || settings?.Senha;
    const emcCode = process.env.EMC_CODE || '123456';

    if (!url || !username || !password) {
      throw new Error('Missing credentials or URL. Set SALESFORCE_URL, SALESFORCE_EMAIL and SALESFORCE_PASSWORD in .env file or set SF_URL, SF_LOGIN and SF_PASSWORD as env vars');
    }

    console.log('\n🔐 Credenciais carregadas:');
    console.log(`   URL: ${url}`);
    console.log(`   Email: ${username}`);
    console.log(`   EMC Code: ${emcCode}\n`);

    // Inicializar Page Object
    const loginPage = new LoginPage(page);

    // Passo 1: Navegar para o Salesforce
    await loginPage.navigate(url);

    // Passo 2: Preencher login
    await loginPage.fillUsername(username);
    await loginPage.fillPassword(password);

    // Passo 3: Clicar no botão de login
    await loginPage.clickLoginButton();

    // Passo 4: Verificar e preencher EMC se necessário
    const emcFound = await loginPage.fillEMCCode(emcCode);
    if (emcFound) {
      await loginPage.clickEMCButton();
    }

    // Passo 5: Validar sucesso do login
    const loginSuccess = await loginPage.verifyLoginSuccess();
    expect(loginSuccess).toBeTruthy();
  });
});
