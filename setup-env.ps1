# Configurar Discord + N8N + GitHub Actions
# Script simplificado para Windows PowerShell

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🤖 Configurador Discord + N8N" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# 1. Discord Webhook URL
Write-Host "1️⃣  DISCORD WEBHOOK" -ForegroundColor Cyan
Write-Host "Obtenha em: Discord > Clique direito no canal > Editar > Integrações > Webhooks" -ForegroundColor Gray
Write-Host ""

$DISCORD_WEBHOOK_URL = Read-Host "Cole a URL do Discord Webhook"

if ([string]::IsNullOrWhiteSpace($DISCORD_WEBHOOK_URL)) {
    Write-Host "Webhook é obrigatório!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Discord webhook configurado" -ForegroundColor Green
Write-Host ""

# 2. N8N Webhook
Write-Host "2️⃣  N8N WEBHOOK URL" -ForegroundColor Cyan
$N8N_WEBHOOK_URL = "http://localhost:5678/webhook/github-tests"
Write-Host "URL padrão: $N8N_WEBHOOK_URL" -ForegroundColor Gray
$input = Read-Host "Pressione Enter para manter padrão, ou digite outro"
if (-not [string]::IsNullOrWhiteSpace($input)) {
    $N8N_WEBHOOK_URL = $input
}
Write-Host "✓ N8N webhook: $N8N_WEBHOOK_URL" -ForegroundColor Green
Write-Host ""

# 3. Salesforce
Write-Host "3️⃣  SALESFORCE CREDENTIALS" -ForegroundColor Cyan
Write-Host ""

$SF_URL = Read-Host "URL Salesforce"
$SF_LOGIN = Read-Host "Email Salesforce"
$SF_PASSWORD = Read-Host "Senha Salesforce" -AsSecureString
$SF_PASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($SF_PASSWORD))

Write-Host "✓ Credenciais Salesforce configuradas" -ForegroundColor Green
Write-Host ""

# 4. Criar .env
Write-Host "📝 Criando arquivo .env..." -ForegroundColor Cyan

$envContent = "SF_URL=$SF_URL`nSF_LOGIN=$SF_LOGIN`nSF_PASSWORD=$SF_PASSWORD_PLAIN`nN8N_WEBHOOK_URL=$N8N_WEBHOOK_URL`nDISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL`nRUNNER_API_KEY=test-key-123`nRUNNER_URL=http://localhost:9998"

Set-Content -Path ".env" -Value $envContent -Encoding UTF8

Write-Host "✓ Arquivo .env criado" -ForegroundColor Green
Write-Host ""

# 5. Exibir resumo
Write-Host "=================================" -ForegroundColor Green
Write-Host "✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Importe o workflow N8N:" -ForegroundColor Cyan
Write-Host "   http://localhost:5678" -ForegroundColor White
Write-Host "   Files > Import > playwright-with-discord.json" -ForegroundColor White
Write-Host ""

Write-Host "2. Ative o workflow:" -ForegroundColor Cyan
Write-Host "   Clique no botão 'Activate' no workflow" -ForegroundColor White
Write-Host ""

Write-Host "3. Configure GitHub Secrets:" -ForegroundColor Cyan
Write-Host "   Repository > Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host ""
Write-Host "   Adicione:" -ForegroundColor Gray
Write-Host "   - DISCORD_WEBHOOK_URL: $DISCORD_WEBHOOK_URL" -ForegroundColor White
Write-Host "   - N8N_WEBHOOK_URL: $N8N_WEBHOOK_URL" -ForegroundColor White
Write-Host "   - SF_URL: $SF_URL" -ForegroundColor White
Write-Host "   - SF_LOGIN: $SF_LOGIN" -ForegroundColor White
Write-Host "   - SF_PASSWORD: (sua senha)" -ForegroundColor White
Write-Host ""

Write-Host "4. Teste no GitHub:" -ForegroundColor Cyan
Write-Host "   Actions > Playwright Tests via N8N > Run workflow" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Tudo pronto!" -ForegroundColor Green
