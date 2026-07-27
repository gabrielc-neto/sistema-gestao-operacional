---
name: project-producao-deploy-pausado
description: "Deploy de produção do Pontual Logística IA pausado em 2026-05-18 aguardando decisão sobre cartão pro Blaze. Auditoria de segurança feita, secrets untracked, rotação pendente."
metadata: 
  node_type: memory
  type: project
  originSessionId: d29c5874-9e88-4ca1-88a6-7f2ed9083a46
---

Tentativa de subir o sistema pra produção iniciada em 2026-05-18 e pausada aguardando decisão de o usuário (Wesley) sobre vincular cartão pro plano Blaze.

**Why:** o usuário (Wesley) quer que `192.168.20.131:5173/dashboard` funcione com o PC desligado. Única solução é deploy Firebase Hosting + Functions, que exige Blaze. Blaze tem free tier folgado mas exige cartão linkado pra ativar (política do Google, não dá pra contornar).

**How to apply:** Ler antes de retomar o deploy de produção. Não repetir auditoria, não desfazer o que já foi feito.

## ✅ Já executado

1. **Auditoria pré-deploy completa** — código compila, firebase.json OK, CLI logado, projeto `pontual-logistica` ativo.
2. **Secrets untracked do git** (commit `9f58a44`) — `functions/.secret.local` e `scripts/serviceAccountKey.json` removidos do tracking. Permanecem no disco (emulator local continua funcionando).
3. **Animação do marker com velocidade real** (commit `fa5c37d`) — `AnimatedTruckMarker` em `frontend/src/components/MapaFrota.jsx`, interpolação RAF + Haversine. Duração = distância/velocidade SASCAR, limitada 1.5s-45s.

## ⏸ Pausado aqui

o usuário (Wesley) perguntou se Blaze ativa sem pagar. Resposta: cartão é obrigatório linkar, mas cobrança real fica em R$ 0 dentro do free tier. Pontual usa 4-15% dos limites.

**Decisão dele pendente entre:**
- Vincular cartão (recomendado, R$ 0 real esperado)
- Usar cartão de outro sócio/cartão da empresa (o usuário (Wesley) tem cartão jurídico)
- Cartão pré-pago R$ 10 só pra passar validação
- Migrar backend pra Vercel/Cloudflare Workers (free, sem cartão, mas ~2-3 dias retrabalho)
- VPS Contabo/Oracle Free Tier
- Continuar com PC sempre ligado (paliativo, não atende "PC desligado")

## ⚠️ Pendências de segurança (NÃO fazer agora)

Decisão do o usuário (Wesley): "só untrack agora, deixa rotação pra depois". Quando deploy de produção for retomado:

1. **Rotacionar Service Account Firebase** — gerar nova key em GCP Console → atualizar `scripts/serviceAccountKey.json`. A chave antiga AINDA está no histórico do git (commit `9306d08`) e tem permissão admin total.
2. **Rotacionar senha SASCAR** — pedir reset à SASCAR, atualizar `functions/.secret.local` e Secret Manager.
3. **(Opcional) Limpar histórico git** — usar `git filter-repo` ou BFG pra apagar `.secret.local` e `serviceAccountKey.json` de todos os commits passados. Force push. Avisar Gabriel (gabrielc-neto) que terá que re-clonar.

Repo é privado (`github.com/gabrielc-neto/sistema-gest-o-operacional` retorna 404 sem auth) — risco mitigado mas não eliminado.

## 🚀 Quando retomar deploy

Sequência exata (após Blaze ativo):

```bash
# 1. Push commits locais pro GitHub (4 commits ahead)
git push origin master

# 2. Gravar secrets no Secret Manager (interativo, pede valor)
firebase functions:secrets:set SASCAR_USUARIO   # responder: PONTUALPONTUAL
firebase functions:secrets:set SASCAR_SENHA     # responder: <senha real>

# 3. Deploy Functions (~3-5min)
firebase deploy --only functions --project pontual-logistica

# 4. Build frontend (~30s)
cd frontend && npm run build

# 5. Deploy Hosting (~1min)
firebase deploy --only hosting --project pontual-logistica

# 6. Teste: https://pontual-logistica.web.app/dashboard
```

**IMPORTANTE:** NÃO precisa criar `.env.production` no frontend. `frontend/src/firebase/config.js:26` gate o emulator via `import.meta.env.DEV` — build automaticamente NÃO conecta no emulator.

**Sugestão antes do `firebase deploy --only functions`:** adicionar `maxInstances: 10` no `setGlobalOptions` em `functions/index.js` pra blindar contra cobrança absurda em caso de loop infinito.

## 💰 Custo esperado pós-deploy

Free tier Blaze cobre folgado:
- Functions invocações: 2M/mês — Pontual ~86k (4%)
- Functions GB-segundos: 400k — ~5k (1%)
- Hosting transferência: 360MB/dia — ~30MB (8%)
- Firestore reads: 50k/dia — ~5k (10%)
- Firestore writes: 20k/dia — ~3k (15%)

Conta esperada: **R$ 0,00/mês**. Configurar alerta de orçamento em R$ 10 no Console GCP.

## 📌 Notas pra próxima sessão

- Link ativação Blaze: https://console.firebase.google.com/project/pontual-logistica/usage/details
- Branch `master` está 4 commits ahead de `origin/master`
- Remote: `github.com/gabrielc-neto/sistema-gest-o-operacional` (privado)
- Owner Firebase CLI: logistica01pontualpetroleo@gmail.com
- Email super admin: silvasampaiowesley03@gmail.com (o usuário (Wesley))

Memórias relacionadas: [[project-estado-atual]], [[project-rastreamento-sascar-fase2]], [[project-logistica-ia]]

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **cta**: [[feedback-windows-file-watcher]] · [[project_estado_atual]] · [[project_levantamento_logistica]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **rbac**: [[feedback_sem_permissao]] · [[project-logistica-ia-frontend]] · [[project_apresentacao_mensal]]
