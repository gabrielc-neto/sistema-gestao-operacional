#!/bin/bash
# ============================================================
# Setup HOMOLOG — ambiente pontualpetroleo.tech
# Rodar UMA vez no VPS (srv1464919.hstgr.cloud)
# Nao afeta producao (pontual em /var/pontual + porta 3000 + banco pontual)
# ============================================================
set -e

echo ">>> [1/8] Criando pasta /var/pontual-homolog e clonando repo..."
sudo mkdir -p /var/pontual-homolog
sudo chown -R $USER:$USER /var/pontual-homolog
cd /var/pontual-homolog
git clone https://github.com/r4xsamp/logistica-ia.git .
# (mesmo repo do prod — deploy do homolog pega master igual, so pasta/banco/porta diferentes)

echo ">>> [2/8] Instalando deps do backend..."
cd /var/pontual-homolog/backend-vps
npm install --production

echo ">>> [3/8] Instalando deps + build do frontend..."
cd /var/pontual-homolog/frontend
npm install
# .env do frontend precisa apontar pro backend homolog
cat > .env.production <<EOF
VITE_API_URL=https://pontualpetroleo.tech/api
VITE_ENVIRONMENT=homolog
EOF
npm run build
# Vite gera em dist/ — mover pra raiz do frontend pra apache servir
sudo rm -rf /var/pontual-homolog/frontend-dist
mv dist /var/pontual-homolog/frontend-dist
# Trocar DocumentRoot no vhost apontando pra /var/pontual-homolog/frontend-dist
# (ver apache-pontual-homolog.conf)

echo ">>> [4/8] Criando pasta de uploads..."
sudo mkdir -p /var/pontual-homolog/uploads/contratos
sudo chown -R $USER:$USER /var/pontual-homolog/uploads

echo ">>> [5/8] Criando banco pontual_homolog (mesmo PG do prod, banco separado)..."
sudo -u postgres psql <<SQL
CREATE DATABASE pontual_homolog OWNER pontual_app;
GRANT ALL PRIVILEGES ON DATABASE pontual_homolog TO pontual_app;
SQL

echo ">>> [6/8] Aplicando schema atual do prod no homolog (base zerada)..."
# Rodar todas as migracoes 001..005 no banco novo
for f in /var/pontual-homolog/backend-vps/schema/*.sql; do
  echo "   aplicando: $f"
  PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U pontual_app -d pontual_homolog -f "$f"
done

echo ">>> [7/8] Criando .env do backend homolog..."
cat > /var/pontual-homolog/backend-vps/.env <<EOF
NODE_ENV=homolog
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=pontual_homolog
DB_USER=pontual_app
DB_PASS=${DB_PASS}
JWT_SECRET=$(openssl rand -hex 32)
UPLOADS_DIR=/var/pontual-homolog/uploads
OPENAI_API_KEY=${OPENAI_API_KEY}
CTA_API_TOKEN=${CTA_API_TOKEN}
EOF
chmod 600 /var/pontual-homolog/backend-vps/.env

echo ">>> [8/8] Registrando processo PM2 pontual-api-homolog na porta 3001..."
cd /var/pontual-homolog/backend-vps
pm2 start src/server.js --name pontual-api-homolog --update-env
pm2 save

echo ""
echo ">>> Ativando vhost Apache..."
sudo cp /var/pontual-homolog/backend-vps/deploy/apache-pontual-homolog.conf \
        /etc/apache2/sites-available/pontual-homolog.conf
sudo a2ensite pontual-homolog.conf
sudo a2enmod ssl proxy proxy_http rewrite headers
sudo systemctl reload apache2

echo ""
echo "============================================================"
echo "SETUP HOMOLOG OK"
echo "============================================================"
echo "Backend  : http://127.0.0.1:3001/health   (interno)"
echo "Frontend : https://pontualpetroleo.tech    (apos DNS apontar)"
echo "Banco    : pontual_homolog @ 127.0.0.1:5432"
echo "PM2      : pm2 logs pontual-api-homolog"
echo ""
echo "Proximos passos manuais:"
echo "  1. DNS: registrar pontualpetroleo.tech + apontar A record pra 72.60.8.135"
echo "  2. Certbot: sudo certbot --apache -d pontualpetroleo.tech -d www.pontualpetroleo.tech"
echo "  3. Testar: curl -k https://pontualpetroleo.tech/health"
echo "============================================================"
