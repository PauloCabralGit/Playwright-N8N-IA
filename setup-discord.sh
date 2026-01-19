#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🤖 Configurador de Discord + N8N + GitHub Actions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Verificar variáveis existentes
if [ -f ".env" ]; then
    echo -e "${YELLOW}✓ Arquivo .env encontrado${NC}"
    source .env
else
    echo -e "${YELLOW}⚠ Arquivo .env não encontrado, será criado${NC}"
fi

# 2. Solicitar Discord Webhook URL
echo ""
echo -e "${BLUE}1️⃣  DISCORD WEBHOOK${NC}"
echo "Você pode obter este valor em:"
echo "  1. Discord → Clique direito no canal → Editar Canal"
echo "  2. Integrações → Webhooks → Criar Webhook"
echo "  3. Copie a URL"
echo ""
read -p "Digite a URL do Discord Webhook: " DISCORD_WEBHOOK_URL

if [ -z "$DISCORD_WEBHOOK_URL" ]; then
    echo -e "${RED}✗ Discord Webhook URL é obrigatório${NC}"
    exit 1
fi

# 3. Configurar N8N Webhook URL
echo ""
echo -e "${BLUE}2️⃣  N8N WEBHOOK URL${NC}"
echo ""
echo "Opções:"
echo "  1. Local: http://localhost:5678/webhook/github-tests"
echo "  2. Remoto: https://seu-dominio.com/webhook/github-tests"
echo ""
read -p "Digite a URL do N8N Webhook [http://localhost:5678/webhook/github-tests]: " N8N_WEBHOOK_URL
N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL:-http://localhost:5678/webhook/github-tests}

# 4. Solicitar Credenciais Salesforce
echo ""
echo -e "${BLUE}3️⃣  SALESFORCE CREDENTIALS${NC}"
echo ""
read -p "Salesforce URL [${SF_URL:-https://...}]: " SF_URL_INPUT
SF_URL=${SF_URL_INPUT:-$SF_URL}

read -p "Salesforce Login [${SF_LOGIN:-...}]: " SF_LOGIN_INPUT
SF_LOGIN=${SF_LOGIN_INPUT:-$SF_LOGIN}

read -sp "Salesforce Password: " SF_PASSWORD_INPUT
SF_PASSWORD=${SF_PASSWORD_INPUT:-$SF_PASSWORD}
echo ""

# 5. Configurar arquivo .env
echo ""
echo -e "${BLUE}📝 Atualizando .env...${NC}"

cat > .env << EOF
# Salesforce Credentials
SF_URL=${SF_URL}
SF_LOGIN=${SF_LOGIN}
SF_PASSWORD=${SF_PASSWORD}

# N8N Configuration
N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}
DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL}

# Test Runner
RUNNER_API_KEY=test-key-123
RUNNER_URL=http://localhost:9998

# GitHub Actions (configure nos secrets do GitHub)
# - DISCORD_WEBHOOK_URL
# - N8N_WEBHOOK_URL
# - SF_URL
# - SF_LOGIN
# - SF_PASSWORD
EOF

echo -e "${GREEN}✓ Arquivo .env atualizado${NC}"

# 6. Resumo da configuração
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ CONFIGURAÇÃO CONCLUÍDA!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Resumo:"
echo ""
echo -e "  Discord Webhook: ${YELLOW}${DISCORD_WEBHOOK_URL:0:50}...${NC}"
echo -e "  N8N Webhook: ${YELLOW}${N8N_WEBHOOK_URL}${NC}"
echo -e "  Salesforce User: ${YELLOW}${SF_LOGIN}${NC}"
echo ""

echo "📋 Próximos passos:"
echo ""
echo "1️⃣  Adicione os Secrets no GitHub:"
echo "   Repository → Settings → Secrets and variables → Actions"
echo ""
echo "   Adicione:"
echo "     - DISCORD_WEBHOOK_URL = ${DISCORD_WEBHOOK_URL}"
echo "     - N8N_WEBHOOK_URL = ${N8N_WEBHOOK_URL}"
echo "     - SF_URL = ${SF_URL}"
echo "     - SF_LOGIN = ${SF_LOGIN}"
echo "     - SF_PASSWORD = ••••••••••"
echo ""
echo "2️⃣  Importe o workflow no N8N:"
echo "   N8N → Files → Import → playwright-with-discord.json"
echo ""
echo "3️⃣  Ative o workflow:"
echo "   N8N → Abra o workflow → Clique em 'Activate'"
echo ""
echo "4️⃣  Teste manualmente:"
echo "   No GitHub → Actions → 'Playwright Tests via N8N' → Run workflow"
echo ""
echo -e "${GREEN}Tudo pronto! 🚀${NC}"
