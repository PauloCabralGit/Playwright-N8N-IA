#!/bin/bash
# Script para testar webhook N8N após importar workflow

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  🧪 TESTE DO WEBHOOK N8N + DISCORD                            ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}1️⃣  Verificando N8N...${NC}"
HEALTH=$(curl -s http://localhost:5678/api/v1/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ N8N está rodando!${NC}"
else
    echo -e "${RED}❌ N8N não está rodando!${NC}"
    echo "   Execute: docker-compose -f n8n-workflows/docker-compose.yml up -d"
    exit 1
fi

echo ""
echo -e "${CYAN}2️⃣  Verificando Test-Runner...${NC}"
RUNNER=$(curl -s http://localhost:9998/current-status)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test-Runner está rodando!${NC}"
else
    echo -e "${RED}❌ Test-Runner não está rodando!${NC}"
    echo "   Execute: npm run start-runner"
    exit 1
fi

echo ""
echo -e "${CYAN}3️⃣  Disparando webhook N8N...${NC}"
echo "   URL: http://localhost:5678/webhook/github-tests"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:5678/webhook/github-tests \
  -H "Content-Type: application/json" \
  -d '{"ambiente":"preprod","source":"teste-automatico"}')

if echo "$RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✅ Webhook disparado com sucesso!${NC}"
    echo ""
    echo -e "${CYAN}📊 Resposta:${NC}"
    echo "$RESPONSE" | jq . || echo "$RESPONSE"
    
    EXEC_ID=$(echo "$RESPONSE" | jq -r '.id // empty')
    if [ -n "$EXEC_ID" ]; then
        echo ""
        echo -e "${GREEN}✅ Execution ID: ${YELLOW}$EXEC_ID${NC}"
        echo ""
        echo -e "${CYAN}⏳ Aguardando conclusão (60 segundos)...${NC}"
        
        for i in {1..12}; do
            sleep 5
            STATUS=$(curl -s -H "Authorization: Bearer test-key-123" \
              http://localhost:9998/execution-details/$EXEC_ID | jq -r '.status // empty')
            
            if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
                echo -e "${GREEN}✅ Testes concluídos!${NC}"
                
                DETAILS=$(curl -s -H "Authorization: Bearer test-key-123" \
                  http://localhost:9998/execution-details/$EXEC_ID)
                
                echo ""
                echo -e "${CYAN}📈 Resultado:${NC}"
                echo "$DETAILS" | jq .
                
                EXIT_CODE=$(echo "$DETAILS" | jq -r '.exitCode // empty')
                if [ "$EXIT_CODE" = "0" ]; then
                    echo ""
                    echo -e "${GREEN}🎉 TESTES PASSARAM!${NC}"
                else
                    echo ""
                    echo -e "${RED}❌ TESTES FALHARAM!${NC}"
                fi
                exit 0
            else
                echo "   Status: $STATUS ⏳"
            fi
        done
        
        echo -e "${YELLOW}⏱️  Timeout - testes ainda estão rodando${NC}"
    fi
else
    if echo "$RESPONSE" | grep -q "404"; then
        echo -e "${RED}❌ Webhook não encontrado!${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Você precisa importar o workflow N8N:${NC}"
        echo ""
        echo "  1. Abra: http://localhost:5678"
        echo "  2. Clique em: Files (canto superior esquerdo)"
        echo "  3. Clique em: Import"
        echo "  4. Selecione: n8n-workflows/playwright-with-discord.json"
        echo "  5. Clique em: Import"
        echo "  6. Clique em: ACTIVATE (botão superior direito)"
        echo "  7. Volte aqui e execute novamente"
    else
        echo -e "${RED}❌ Erro ao disparar webhook!${NC}"
        echo "$RESPONSE"
    fi
    exit 1
fi
