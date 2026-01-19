import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Selectors para login
  readonly usernameSelectors = [
    'input#username',
    'input[name="username"]',
    'input[type="email"]'
  ];

  readonly passwordSelectors = [
    'input#password',
    'input[name="pw"]',
    'input[type="password"]'
  ];

  readonly loginButtonSelectors = [
    'input#Login',
    'input[title="Login"]',
    'button[name="Login"]',
    'button[type="submit"]'
  ];

  // Selectors para EMC (autenticação de segundo fator)
  readonly emcFieldSelector = 'input[name="emc"]';
  readonly emcButtonSelectors = [
    'input[title="Verificar"]',
    'input[value="Log In to Sandbox"]',
    'button[type="submit"]',
    'input[type="button"]',
    'button[name="login"]'
  ];

  // Selectors para validação de sucesso
  readonly successSearchSelector = '//input[@placeholder="Configuração de pesquisa"]';
  readonly successAppSelector = '//div[@aria-label="Aplicativo"]';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(url: string): Promise<void> {
    console.log(`🌐 Navegando para: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  async fillUsername(username: string): Promise<boolean> {
    for (const sel of this.usernameSelectors) {
      if (await this.page.locator(sel).count() > 0) {
        console.log(`✏️  Preenchendo username com: ${sel}`);
        await this.page.fill(sel, username);
        return true;
      }
    }
    console.warn('⚠️  Campo username não encontrado');
    return false;
  }

  async fillPassword(password: string): Promise<boolean> {
    for (const sel of this.passwordSelectors) {
      if (await this.page.locator(sel).count() > 0) {
        console.log(`✏️  Preenchendo password com: ${sel}`);
        await this.page.fill(sel, password);
        return true;
      }
    }
    console.warn('⚠️  Campo password não encontrado');
    return false;
  }

  async clickLoginButton(): Promise<boolean> {
    for (const sel of this.loginButtonSelectors) {
      if (await this.page.locator(sel).count() > 0) {
        console.log(`🔘 Clicando em: ${sel}`);
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
          this.page.click(sel).catch(() => {}),
        ]);
        return true;
      }
    }

    // Se nenhum botão foi clicado, tenta Enter no campo de password
    console.log('📌 Tentando tecla Enter no password...');
    for (const sel of this.passwordSelectors) {
      if (await this.page.locator(sel).count() > 0) {
        await this.page.locator(sel).press('Enter').catch(() => {});
        return true;
      }
    }

    console.warn('⚠️  Nenhum botão de login encontrado');
    return false;
  }

  async fillEMCCode(code: string): Promise<boolean> {
    if (await this.page.locator(this.emcFieldSelector).count() > 0) {
      console.log(`📱 Campo EMC detectado, preenchendo com código...`);
      await this.page.locator(this.emcFieldSelector).fill(code);
      return true;
    }
    return false;
  }

  async clickEMCButton(): Promise<boolean> {
    for (const sel of this.emcButtonSelectors) {
      if (await this.page.locator(sel).count() > 0) {
        console.log(`✅ Clicando em: ${sel}`);
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
          this.page.click(sel).catch(() => {}),
        ]);
        await this.page.waitForTimeout(2000);
        return true;
      }
    }
    console.warn('⚠️  Botão EMC não encontrado');
    return false;
  }

  async verifyLoginSuccess(): Promise<boolean> {
    const searchLocator = this.page.locator(this.successSearchSelector);
    const appLocator = this.page.locator(this.successAppSelector);

    const found = await Promise.race([
      searchLocator.waitFor({ timeout: 60000 }).then(() => true).catch(() => false),
      appLocator.waitFor({ timeout: 60000 }).then(() => true).catch(() => false),
    ]);

    const currentUrl = await this.page.url();
    const success = found || currentUrl !== undefined;

    if (success) {
      console.log('✅ Login realizado com sucesso!');
    } else {
      console.error('❌ Login falhou - elementos de sucesso não encontrados');
    }

    return success;
  }
}
