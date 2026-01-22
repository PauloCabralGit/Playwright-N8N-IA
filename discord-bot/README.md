# Discord Bot para n8n

## Configuração

1. Edite o arquivo `.env` e substitua:
   - `SEU_BOT_TOKEN_AQUI` pelo token do seu bot Discord
   - A URL do webhook já está configurada para o n8n

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Execute o bot:
   ```bash
   npm start
   ```

## Comandos

- `!deploy` - Envia comando para o n8n executar o workflow

## Hospedagem

- **Replit**: Crie um Repl Node.js → upload dos arquivos → Run
- **Glitch**: Import project → Run
- **Servidor próprio**: Use `pm2 start index.js` para manter ativo 24/7
