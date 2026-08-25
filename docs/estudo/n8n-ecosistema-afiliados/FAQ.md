# ❓ FAQ — Dúvidas Comuns

## Setup

### 1. "Docker Desktop trava no meu PC"
- Windows Home precisa **WSL2 habilitado**. Roda no PowerShell admin: `wsl --install`
- Reinicia
- Instala Docker Desktop → configura pra usar WSL2 backend
- Se PC ≤ 8GB RAM: aumenta swap do WSL editando `C:\Users\SEUUSER\.wslconfig`:
  ```
  [wsl2]
  memory=4GB
  swap=8GB
  ```

### 2. "Container n8n reinicia toda hora"
- Ver log: `docker logs n8n-main`
- Causa comum: `N8N_ENCRYPTION_KEY` mudou. Nunca mude essa chave depois de criar contas.

### 3. "Não consigo acessar http://localhost:5678"
- Windows Firewall bloqueando. Adiciona exceção pra Docker Desktop.
- Antivírus (Kaspersky, Avast) — desativa por 5min e testa.

### 4. "n8n pede login, mas eu esqueci a senha"
```bash
docker exec -it n8n-main sh
n8n user-management:reset
```

---

## Workflows

### 5. "Node Postgres pede credencial. O que coloco?"
- Host: `postgres` (nome do container, não `localhost`)
- Database: `n8n`
- User: `n8n`
- Password: valor do `.env` (`POSTGRES_PASSWORD`)
- Port: `5432`
- SSL: **desabilitado**

### 6. "Nó Gemini retorna 429 (Too Many Requests)"
- Passou de 1.500/dia. Espera reset amanhã, ou:
- Adiciona **fallback pra Groq** — duplicar o node HTTP apontando pra Groq (`https://api.groq.com/openai/v1/chat/completions`) com header `Authorization: Bearer {{ $env.GROQ_API_KEY }}`

### 7. "Amazon PA-API retorna 401/403"
- Precisa de ≥3 vendas nos últimos 30 dias pra ativar API.
- Enquanto isso, use **scraper alternativo** (workflow separado) ou comece pelos outros programas.

### 8. "Shopee retorna HTML em vez de JSON"
- Foi bloqueado por bot detection. Troque User-Agent no header do node HTTP.
- Ou usa Puppeteer com um proxy residencial grátis (Scrapoxy).

---

## Telegram

### 9. "Bot manda mensagem privada mas não posta no canal"
- Bot precisa ser **admin do canal** (não só membro)
- Verifica se `TELEGRAM_CHANNEL_ID` está correto (com `@` na frente pra público, ou `-100...` pra privado)

### 10. "Como converter canal privado em ID numérico?"
Manda `/getid` pro seu bot dentro do grupo (bot precisa estar lá) — ele responde com ID tipo `-1001234567890`.

### 11. "Telegram bloqueou meu bot"
- Você passou 30 msgs/segundo — spam detectado
- Rate limit oficial: **~30 msg/s** e **20 msg/min por chat**
- Nosso workflow 07 já espera 30s entre posts pra prevenir

---

## Legal e comissão

### 12. "Preciso emitir nota fiscal?"
- Amazon Associates paga via depósito comum ou PIX — pra pessoa física, é rendimento comum (declara no IR anual)
- Se acumular > R$ 30k/ano, considere abrir **MEI** (comércio eletrônico)
- Consulta um contador — 30min resolve tudo

### 13. "Alguém copia meus links e troca?"
- É a "guerra dos afiliados" — todo mundo faz. Focar em:
  - **Ser o primeiro** a postar
  - Nichos menos concorridos (ex: pet específico, hobbies)
  - **Comunidade** ao redor (grupo com engajamento, não só broadcast)

### 14. "Amazon suspendeu minha conta"
- Causas comuns:
  - Muitos cliques sem venda
  - Tráfego suspeito (usa VPN sempre no mesmo IP)
  - Postar link em spam pra desconhecidos
- Recurso: painel Amazon → **Contact Us** → explica é canal Telegram próprio, tem N membros orgânicos, disclosure feito

---

## Performance

### 15. "Quanto RAM/CPU o stack consome?"
- Idle: ~800 MB RAM, 3-5% CPU
- Rodando 7 workflows: ~2 GB RAM, 15-20% CPU
- **Recomendado**: 4 GB RAM livre no mínimo

### 16. "Backup no PC dá pra restaurar em outro?"
Sim:
```bash
# No PC velho:
docker exec n8n-postgres pg_dump -U n8n -d n8n > backup.sql
docker cp n8n-main:/home/node/.n8n ./n8n-backup

# No PC novo (depois de subir stack):
docker exec -i n8n-postgres psql -U n8n -d n8n < backup.sql
docker cp ./n8n-backup n8n-main:/home/node/.n8n
docker restart n8n-main
```

### 17. "Quero rodar em Raspberry Pi 4"
- Funciona (com ajuste)
- Use imagem ARM64 do n8n
- Desabilita Evolution (pesado pra Pi)
- Usa SQLite em vez de Postgres pra economizar

---

## Escala

### 18. "5000 membros, quanto ganho mais ou menos?"
Média histórica canais bem-tratados:
- 1-3% dos membros compra algo por semana
- Ticket médio: R$ 80-200
- Comissão média: 6-10%
- **5000 × 2% × R$120 × 8% = R$ 960/semana ≈ R$ 3.800/mês**

Pode ser mais (canal viral) ou menos (nicho apertado).

### 19. "Quero abrir 2º canal de nicho diferente"
- Faça — cada canal é grátis
- Reaproveita mesmo n8n, só cria segundo workflow apontando pra outro `TELEGRAM_CHANNEL_ID`
- **Não copia posts entre canais** — cada um curado pro nicho dele

### 20. "Quero adicionar Instagram/WhatsApp"
- **Instagram**: usa node Instagram Graph API (grátis) — só posta em conta profissional/business
- **WhatsApp**: já tem Evolution API no stack — só criar workflow que puxa oferta e envia pra lista de números que se cadastraram no seu canal
