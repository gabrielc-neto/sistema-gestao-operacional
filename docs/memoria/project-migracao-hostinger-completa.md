---
name: project-migracao-hostinger-completa
description: Sistema Pontual 100% na VPS Hostinger (frontend+backend+auth+uploads+SASCAR+CTA). Firebase desconectado mas intacto.
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

Concluído 2026-07-23. Firebase Auth+Firestore+Storage+Functions eliminados como dependência ativa.

**Fica na VPS (srv1464919.hstgr.cloud, IP 72.60.8.135):**
- Frontend: Apache serve /var/pontual/frontend/
- Backend: Node/Express pm2 `pontual-backend` porta 3000 (proxy Apache /api/*)
- Auth: JWT próprio (jsonwebtoken) tabela `usuarios_auth` PostgreSQL. Sem mais Firebase Admin.
- Dados: PostgreSQL 16 (`pontual` DB) — tabelas específicas + generic `documents(collection,id,data)`
- Uploads: multer disk `/var/pontual/uploads/` (376GB livres)
- SASCAR/Jornada/CTA: rotas /api/sascar/*, /api/jornada/*, /api/cta/* via cron interno (setInterval)
- Intranet gate: /api/intranet-gate (replicou Firebase Function)

**Firebase Project pontual-logistica:** desconectado, NÃO apagado. Pode reativar em emergência. Blaze NUNCA ativado.

**Wrappers frontend hard-coded VPS:**
- `services/genericDataSource.js` USE_VPS=true fixo
- `services/frotaDataSource.js` USE_VPS=true fixo
- `services/manutencaoDataSource.js` USE_VPS=true fixo
- `firebase/config.js` + `contexts/AuthContext.jsx` USE_VPS_AUTH=true fixo

**Ainda usa Firebase (protegido, código intocado):**
- `pages/Compras.jsx` + `pages/PropostaConvite.jsx` — Gabriel, não migrar
- `manutencao/AbaMultas.jsx` — aba desativada do menu

**How to apply:** Não sugerir migrar mais nada sem pedido. Se aparecer bug no frontend, consultar logs `pm2 logs pontual-backend` no VPS + `pontual_access.log` no Apache. Novas features seguem padrão VPS.

Ver [[project-vps-http-puro-sem-ssl]] · [[project-gabriel-parceiro-sistemas-coexistem]] · [[feedback-rosilda-nao-ativar-firebase-blaze]]
