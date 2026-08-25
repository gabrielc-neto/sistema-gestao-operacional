# ☁️ Deploy grátis pra sempre no Oracle Cloud

**Objetivo:** tirar o stack do PC de casa e rodar 24/7 num servidor grátis.

## Por que Oracle Cloud?

- **2 VMs ARM Ampere GRÁTIS pra sempre** (não é trial)
- Cada VM: 4 vCPU + 24 GB RAM + 200 GB disco
- Total: 8 vCPU + 48 GB RAM (mais que Servidor Pontual!)
- Sem cartão obrigatório pra rodar

## Passo 1 — Criar conta

1. Acessa: https://www.oracle.com/cloud/free/
2. **Start for free**
3. Preenche (usa CPF Brasil normal)
4. Pede cartão pra "verificação" (NÃO cobra)
5. Aprovação: 5-30min

## Passo 2 — Criar VM (Always Free)

1. Menu **Compute** → **Instances** → **Create Instance**
2. **Name:** `n8n-ecosistema`
3. **Image:** Ubuntu 22.04 Minimal (Always Free)
4. **Shape:** clicar **Change shape** → **Ampere** → **VM.Standard.A1.Flex** → 4 OCPU + 24 GB RAM
5. **Networking:** cria VCN nova, subnet pública
6. **SSH:** faz upload da sua chave `.pub` OU deixa gerar (baixa o `.key`)
7. **Create**

Aguarda 2min. Vai aparecer IP público (ex: `132.226.xx.xx`).

## Passo 3 — Liberar portas 5678 e 8080

1. **Networking** → **VCN** → **Security List** default
2. **Add Ingress Rule**:
   - Source: `0.0.0.0/0`
   - Port: `5678`
3. Repete pra porta `8080` (Evolution)

## Passo 4 — Setup do servidor

```bash
# No seu PC (Git Bash ou WSL):
ssh -i sua-chave.key ubuntu@132.226.xx.xx

# Já dentro da VM:
sudo apt update && sudo apt upgrade -y

# Instala Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Instala docker-compose plugin
sudo apt install docker-compose-plugin -y

# Instala firewall simples
sudo apt install ufw -y
sudo ufw allow 22
sudo ufw allow 5678
sudo ufw allow 8080
sudo ufw --force enable

# Limita porta interna do Ubuntu (Oracle usa iptables)
sudo iptables -I INPUT -p tcp --dport 5678 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save

# Copia sua pasta pro VPS (do seu PC):
# scp -i sua-chave.key -r /caminho/n8n-ecosistema-afiliados ubuntu@132.226.xx.xx:~/
```

## Passo 5 — Subir stack

```bash
cd ~/n8n-ecosistema-afiliados/02-docker
cp .env.example .env
nano .env  # preencha suas chaves

docker compose up -d
sleep 30
docker exec -i n8n-postgres psql -U n8n -d n8n < init-postgres.sql
```

## Passo 6 — Acessar

- n8n: `http://132.226.xx.xx:5678`
- Evolution: `http://132.226.xx.xx:8080`

## Bônus — Domínio grátis + HTTPS

1. Registra domínio grátis em https://www.duckdns.org (subdomínio tipo `wesleyofertas.duckdns.org`)
2. Aponta pro IP da VM
3. Instala Caddy (auto HTTPS):

```bash
# /etc/caddy/Caddyfile
wesleyofertas.duckdns.org {
    reverse_proxy localhost:5678
}
```

```bash
sudo apt install caddy -y
sudo systemctl restart caddy
```

Pronto: `https://wesleyofertas.duckdns.org` com HTTPS válido, grátis.

---

## Custo total mensal na Oracle Cloud

**R$ 0,00** para sempre (contanto que não passe dos limites Always Free).

## Se quiser, pode até rodar 2 stacks (uma pra você, uma pra vender pra amigo).
