import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

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

test.describe('Login Salesforce', () => {
  const settings = loadConfig();
  // increase test timeout for slow environments
  test.setTimeout(120000);

  test('faz login no Salesforce (preprod)', async ({ page }) => {
    // Prefer environment variables (for CI / secrets). Fallback to config file when not present.
    const url = process.env.SALESFORCE_URL || process.env.SF_URL || settings?.url_SF_preprod || settings?.url_SF_uat || settings?.url_SF_dev;
    const username = process.env.SALESFORCE_EMAIL || process.env.SF_LOGIN || settings?.Login;
    const password = process.env.SALESFORCE_PASSWORD || process.env.SF_PASSWORD || settings?.Senha;
    const vendedor = process.env.VENDEDOR || 'Fernanda Pinho';
    const cpf = process.env.CPF || '16064201606';
    const cep = process.env.CEP || '13057520';
    const estado = process.env.ESTADO || 'SP';
    const emcCode = process.env.EMC_CODE || '123456'; // Código para autenticação EMC

    if (!url || !username || !password) {
      throw new Error('Missing credentials or URL. Set SALESFORCE_URL, SALESFORCE_EMAIL and SALESFORCE_PASSWORD in .env file or set SF_URL, SF_LOGIN and SF_PASSWORD as env vars');
    }

    console.log('🔐 Usando credenciais:');
    console.log(`   URL: ${url}`);
    console.log(`   Email: ${username}`);
    console.log(`   Vendedor: ${vendedor}`);
    console.log(`   CPF: ${cpf}`);
    console.log(`   CEP: ${cep}`);
    console.log(`   Estado: ${estado}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Salesforce standard selectors - try a few common ones
    const usernameSelectors = ['input#username', 'input[name="username"]', 'input[type="email"]'];
    const passwordSelectors = ['input#password', 'input[name="pw"]', 'input[type="password"]'];
    const loginButtonSelectors = ['input#Login', 'input[title="Login"]', 'button[name="Login"]', 'button[type="submit"]'];

    // Helper to fill if present
    for (const sel of usernameSelectors) {
      if (await page.locator(sel).count() > 0) {
        await page.fill(sel, username);
        break;
      }
    }
    for (const sel of passwordSelectors) {
      if (await page.locator(sel).count() > 0) {
        await page.fill(sel, password);
        break;
      }
    }

    // Click login button (try selectors)
    let clicked = false;
    for (const sel of loginButtonSelectors) {
      if (await page.locator(sel).count() > 0) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
          page.click(sel).catch(() => {}),
        ]);
        clicked = true;
        break;
      }
    }

    // If no button clicked, try pressing Enter in password field
    if (!clicked) {
      for (const sel of passwordSelectors) {
        if (await page.locator(sel).count() > 0) {
          await page.locator(sel).press('Enter').catch(() => {});
          break;
        }
      }
    }

    // After login we expect to see an element used in the old Robot tests
    // e.g. search input with placeholder "Configuração de pesquisa" or app container
    const searchLocator = page.locator('//input[@placeholder="Configuração de pesquisa"]');
    const appLocator = page.locator('//div[@aria-label="Aplicativo"]');

    // Aguardar pelo menos um dos elementos ou verificar se campo EMC aparece
    let emcFieldFound = false;
    const emcLocator = page.locator('input[name="emc"]');
    
    // Verificar se o campo EMC aparece (pode aparecer como segunda autenticação)
    if (await emcLocator.count() > 0) {
      console.log('📱 Campo EMC detectado, preenchendo com código...');
      emcFieldFound = true;
      await emcLocator.fill(emcCode);
      
      // Procurar botão de confirmação do EMC (pode variar)
      const emcButtonSelectors = ['input[title="Verificar"]', 'input[value="Log In to Sandbox"]', 'button[type="submit"]', 'input[type="button"]', 'button[name="login"]'];
      for (const sel of emcButtonSelectors) {
        if (await page.locator(sel).count() > 0) {
          console.log(`✅ Clicando em: ${sel}`);
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
            page.click(sel).catch(() => {}),
          ]);
          break;
        }
      }
      
      // Aguardar confirmação de sucesso
      await page.waitForTimeout(2000);
    }

    const found = await Promise.race([
      searchLocator.waitFor({ timeout: 60000 }).then(() => true).catch(() => false),
      appLocator.waitFor({ timeout: 60000 }).then(() => true).catch(() => false),
    ]);

    // Basic check: URL changed or one of the expected locators is visible
    const currentUrl = await page.url();
    expect(found || currentUrl !== url).toBeTruthy();
  });
});
