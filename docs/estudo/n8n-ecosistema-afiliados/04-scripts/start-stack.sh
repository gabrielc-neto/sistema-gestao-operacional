#!/bin/bash
# =====================================================
# Ecossistema n8n Afiliados - Iniciar Stack (Linux/Mac)
# =====================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../02-docker"

if [ ! -f ".env" ]; then
    echo "[ERRO] Arquivo .env nao encontrado!"
    echo "Copie .env.example para .env e preencha suas chaves."
    exit 1
fi

if ! docker ps >/dev/null 2>&1; then
    echo "[ERRO] Docker nao esta rodando. Inicie o Docker Desktop/daemon."
    exit 1
fi

echo "[OK] Docker rodando"
echo "[OK] .env encontrado"
echo ""
echo "Subindo containers..."
docker compose up -d

echo ""
echo "Aguardando Postgres ficar pronto (30s)..."
sleep 30

echo ""
echo "Criando tabelas do banco..."
docker exec -i n8n-postgres psql -U n8n -d n8n < init-postgres.sql || echo "[AVISO] Tabelas podem ja existir."

echo ""
echo "========================================================"
echo "  STACK PRONTO!"
echo "========================================================"
echo ""
echo "  n8n:            http://localhost:5678"
echo "  Evolution API:  http://localhost:8080"
echo ""
echo "  Proximo passo: importar os 7 workflows em 03-workflows/"
echo ""
