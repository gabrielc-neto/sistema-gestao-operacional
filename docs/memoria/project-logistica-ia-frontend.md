---
name: project-logistica-ia-frontend
description: "logistica-ia frontend stack — Vite + React, common ports and restart pattern"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2f7e3d50-3571-4b84-bb8a-7b9e0bfbd827
---

Projeto `logistica-ia` tem frontend em `C:\Users\Logistica01\projetos\logistica-ia\frontend\` rodando Vite v8.0.11 + React (main.jsx).

**Why:** Sessão 2026-06-15 — dev server ficou acumulando zumbis (5173, 5174, 5175). Vite escolhe próxima porta livre. Backend Firebase Functions emulator roda em `127.0.0.1:5001` (callable `sascarPosicoes` etc). Stack do projeto está em `C:\Users\Logistica01\projetos\logistica-ia\CLAUDE.md` (Firebase Firestore + RBAC + multi-tenancy). Network address LAN: `192.168.68.67`.

**Porta atual do Vite dev (atualizar quando reiniciar):** 5175 (em 2026-06-15 17:40)

**How to apply:**
- Quando user fala "dev server" / "frontend" sem dar path, assumir esse projeto
- Comando de start (rodar EU mesmo em background): `cd "C:/Users/Logistica01/projetos/logistica-ia/frontend" && npm run dev > vite-bg.log 2>&1 &`
- Backend emulator: validar com `curl -X POST http://127.0.0.1:5001/pontual-logistica/southamerica-east1/sascarPosicoes -H "Content-Type: application/json" -H "x-dev-bypass: true" -d '{"data":null}'`
- `.env.local` precisa ter `VITE_USE_FUNCTIONS_EMULATOR=true` pra `callFunction.js` bater no emulator em vez de produção
- Se HMR não atualizar, ver [[feedback-windows-file-watcher]]
- Rotas exigem login via `<PrivateRoute>` (Firebase Auth) — `/rastreamento` redireciona pra `/` se não logado

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **rbac**: [[feedback_sem_permissao]] · [[project_apresentacao_mensal]] · [[project_estado_atual]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]] | [[project_carga_perigosa]]
