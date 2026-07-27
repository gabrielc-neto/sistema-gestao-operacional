---
name: reference-vps-acesso-http-forcar-url-completa
description: PC de novo usuário não abre srv1464919.hstgr.cloud — solução é digitar http:// completo ou limpar HSTS
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

Enquanto VPS estiver em HTTP puro (sem SSL/HTTPS — ver [[project-vps-http-puro-sem-ssl]]), Edge/Chrome de PCs corporativos convertem `srv1464919.hstgr.cloud` sem `http://` explícito em `https://srv1464919.hstgr.cloud` → erro de conexão porque não existe HTTPS.

**Diagnóstico rápido pra confirmar que é HTTPS forçado:**
Pedir pro user rodar no CMD do PC:
```
ping srv1464919.hstgr.cloud
ping 72.60.8.135
curl -v http://72.60.8.135/
```
Se todos retornam OK (HTTP 200) mas o browser não abre → é HSTS/HTTPS-only do navegador.

**Solução — 4 caminhos em ordem:**
1. Digitar URL COMPLETA: `http://srv1464919.hstgr.cloud/` (com `http://`)
2. Se persistir: limpar HSTS em `chrome://net-internals/#hsts` (ou `edge://...`) — Delete domain: `srv1464919.hstgr.cloud`
3. Aba anônima (Ctrl+Shift+N)
4. Testar outro navegador

**Confirmado com PC do Thiago (2026-07-25):** ping OK + curl 200, mas browser tentava HTTPS. Digitou `http://` completo → funcionou.

**Solução definitiva futura:** comprar `logisticapontual.com` + Let's Encrypt (HTTPS válido). Ver [[project-migracao-hostinger-completa]].
