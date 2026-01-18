import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { test, expect } from '@playwright/test';

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
    test.skip(!settings, 'config/config.yaml não encontrado');

    // Prefer environment variables (for CI / secrets). Fallback to config file when not present.
    const url = process.env.SF_URL || settings?.url_SF_preprod || settings?.url_SF_uat || settings?.url_SF_dev;
    const username = process.env.SF_LOGIN || settings?.Login;
    const password = process.env.SF_PASSWORD || settings?.Senha;

    if (!url || !username || !password) {
      test.skip(true, 'Missing credentials or URL: set SF_URL, SF_LOGIN and SF_PASSWORD as env vars or fill config/config.yaml');
    }

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

    const found = await Promise.race([
      searchLocator.waitFor({ timeout: 60000 }).then(() => true).catch(() => false),
      appLocator.waitFor({ timeout: 60000 }).then(() => true).catch(() => false),
    ]);

    // Basic check: URL changed or one of the expected locators is visible
    const currentUrl = await page.url();
    expect(found || currentUrl !== url).toBeTruthy();
  });
});
