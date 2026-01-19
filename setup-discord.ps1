# Configurador de Discord + N8N + GitHub Actions
# Script PowerShell para Windows

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🤖 Configurador Discord + N8N" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se .env existe
if (Test-Path ".env") {
    Write-Host "✓ Arquivo .env encontrado" -ForegroundColor Green
    Get-Content .env | Where-Object { $_ -match "^[A-Z]" } | ForEach-Object {
        $parts = $_ -split "="
        if ($parts.Count -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
        }
    }
} else {
    Write-Host "⚠️  Arquivo .env não encontrado, será criado" -ForegroundColor Yellow
}

# 1. Discord Webhook
Write-Host ""
Write-Host "1️⃣  DISCORD WEBHOOK" -ForegroundColor Cyan
Write-Host "Obtenha em: Discord → Clique direito no canal → Editar → Integrações → Webhooks" -ForegroundColor Gray
Write-Host ""

$DISCORD_WEBHOOK_URL = Read-Host "Digite a URL do Discord Webhook"

if ([string]::IsNullOrWhiteSpace($DISCORD_WEBHOOK_URL)) {
    Write-Host "✗ Discord Webhook URL é obrigatório" -ForegroundColor Red
    exit 1
}

# 2. N8N Webhook
Write-Host ""
Write-Host "2️⃣  N8N WEBHOOK URL" -ForegroundColor Cyan
Write-Host "Local:   http://localhost:5678/webhook/github-tests" -ForegroundColor Gray
Write-Host "Remoto:  https://seu-dominio.com/webhook/github-tests" -ForegroundColor Gray
Write-Host ""

$N8N_WEBHOOK_URL = Read-Host "Digite a URL do N8N Webhook [http://localhost:5678/webhook/github-tests]"
if ([string]::IsNullOrWhiteSpace($N8N_WEBHOOK_URL)) {
    $N8N_WEBHOOK_URL = "http://localhost:5678/webhook/github-tests"
}

# 3. Salesforce Credentials
Write-Host ""
Write-Host "3️⃣  SALESFORCE CREDENTIALS" -ForegroundColor Cyan
Write-Host ""

$SF_URL = Read-Host "Salesforce URL [${env:SF_URL}]"
if ([string]::IsNullOrWhiteSpace($SF_URL)) {
    $SF_URL = $env:SF_URL
}

$SF_LOGIN = Read-Host "Salesforce Login [${env:SF_LOGIN}]"
if ([string]::IsNullOrWhiteSpace($SF_LOGIN)) {
    $SF_LOGIN = $env:SF_LOGIN
}

Write-Host "Digite a senha (não será exibida):" -NoNewline
$SF_PASSWORD_INPUT = Read-Host -AsSecureString
$SF_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($SF_PASSWORD_INPUT))

if ([string]::IsNullOrWhiteSpace($SF_PASSWORD)) {
    $SF_PASSWORD = $env:SF_PASSWORD
}

# 4. Criar/Atualizar .env
Write-Host ""
Write-Host "📝 Atualizando .env..." -ForegroundColor Cyan

$envContent = @"
# Salesforce Credentials
SF_URL=$SF_URL
SF_LOGIN=$SF_LOGIN
SF_PASSWORD=$SF_PASSWORD

# N8N Configuration
N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL

# Test Runner
RUNNER_API_KEY=test-key-123
RUNNER_URL=http://localhost:9998

# GitHub Actions (configure nos secrets do GitHub)
# - DISCORD_WEBHOOK_URL
# - N8N_WEBHOOK_URL
# - SF_URL
# - SF_LOGIN
# - SF_PASSWORD
"@

Set-Content -Path ".env" -Value $envContent -Encoding UTF8
Write-Host "✓ Arquivo .env atualizado" -ForegroundColor Green

# 5. Resumo
Write-Host ""
Write-Host "=================================" -ForegroundColor Green
Write-Host "✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 RESUMO:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Discord Webhook: $($DISCORD_WEBHOOK_URL.Substring(0, [Math]::Min(50, $DISCORD_WEBHOOK_URL.Length)))..."
Write-Host "  N8N Webhook:     $N8N_WEBHOOK_URL"
Write-Host "  Salesforce User: $SF_LOGIN"
Write-Host ""

Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Adicione os Secrets no GitHub:" -ForegroundColor Cyan
Write-Host "   Settings → Secrets and variables → Actions" -ForegroundColor Gray
Write-Host ""
Write-Host "   Adicione estes secrets:" -ForegroundColor Gray
Write-Host "     - DISCORD_WEBHOOK_URL = $DISCORD_WEBHOOK_URL" -ForegroundColor White
Write-Host "     - N8N_WEBHOOK_URL = $N8N_WEBHOOK_URL" -ForegroundColor White
Write-Host "     - SF_URL = $SF_URL" -ForegroundColor White
Write-Host "     - SF_LOGIN = $SF_LOGIN" -ForegroundColor White
Write-Host "     - SF_PASSWORD = ••••••••" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  Importe o workflow no N8N:" -ForegroundColor Cyan
Write-Host "   http://localhost:5678 → Files → Import → playwright-with-discord.json" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Ative o workflow:" -ForegroundColor Cyan
Write-Host "   Abra o workflow → Clique em 'Activate'" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Teste manualmente:" -ForegroundColor Cyan
Write-Host "   GitHub → Actions → 'Playwright Tests via N8N' → Run workflow" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 Tudo pronto!" -ForegroundColor Green
Write-Host ""

# Pergunta se quer copiar os secrets para clipboard
Write-Host ""
$confirm = Read-Host "Deseja copiar os secrets do GitHub para o clipboard? (s/n)"

if ($confirm -eq 's' -or $confirm -eq 'S') {
    $secrets = @"
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL
SF_URL=$SF_URL
SF_LOGIN=$SF_LOGIN
SF_PASSWORD=$SF_PASSWORD
"@
    
    $secrets | Set-Clipboard
    Write-Host "✓ Secrets copiados para o clipboard!" -ForegroundColor Green
}
