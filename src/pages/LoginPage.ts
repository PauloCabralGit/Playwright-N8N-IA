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
    'input[type="password"]',
    'input.password',
    'input[placeholder*="senha"]',
    'input[placeholder*="password"]',
    'input[data-test*="password"]',
    'input[id*="password"]',
    'input[name*="password"]',
    'input[type=password]'
  ];

  readonly loginButtonSelectors = [
    'input#Login',
    'input[title="Logi"]',
    'button[name="Logi"]',
    'button[type="submi"]'
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
    console.log('🔍 Iniciando busca pelo campo de senha...');
    
    // Tenta cada seletor da lista
    for (const selector of this.passwordSelectors) {
      try {
        console.log(`🔎 Tentando seletor: "${selector}"`);
        const element = this.page.locator(selector);
        const count = await element.count();
        
        if (count > 0) {
          console.log(`✅ Encontrado ${count} elemento(s) com o seletor: "${selector}"`);
          console.log(`✏️  Preenchendo senha usando: "${selector}"`);
          
          // Tenta preencher o campo
          await element.fill(password);
          
          // Verifica se o valor foi preenchido corretamente
          const filledValue = await element.inputValue();
          if (filledValue === password) {
            console.log('✅ Senha preenchida com sucesso!');
            return true;
          } else {
            console.warn(`⚠️  O campo foi preenchido, mas o valor não corresponde ao esperado`);
          }
        } else {
          console.log(`ℹ️  Nenhum elemento encontrado com: "${selector}"`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao tentar preencher com "${selector}":`, errorMessage);
      }
    }
    
    // Se chegou aqui, nenhum seletor funcionou
    console.error('❌ Nenhum dos seletores de senha funcionou. Tentando abordagem alternativa...');
    
    // Tenta uma abordagem mais genérica
    try {
      const allInputs = await this.page.$$('input');
      console.log(`🔍 Encontrados ${allInputs.length} campos de input na página`);
      
      for (const input of allInputs) {
        try {
          const inputType = await input.getAttribute('type');
          if (inputType === 'password') {
            const inputId = await input.getAttribute('id') || await input.getAttribute('name') || 'sem-id';
            console.log(`🔑 Encontrado campo de senha com type="password" (id/name: ${inputId})`);
            await input.fill(password);
            console.log('✅ Senha preenchida com sucesso usando busca genérica!');
            return true;
          }
        } catch (error) {
          // Continua para o próximo input
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro na abordagem genérica:', errorMessage);
    }
    
    console.error('❌ Nenhum campo de senha pôde ser preenchido');
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
