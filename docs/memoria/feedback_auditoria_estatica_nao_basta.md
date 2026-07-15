---
name: feedback-auditoria-estatica-nao-basta
description: "Auditoria estática (ESLint, código morto, padrões) não pega bug de integração runtime. Sempre fazer smoke test do fluxo crítico end-to-end."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: be23c403-cf7a-4d17-a039-3fa116394f9b
---

Auditoria de qualidade estática (ESLint, código morto, antipatterns) NÃO substitui smoke test de fluxo de negócio. Em 2026-06-10 fiz auditoria com 12 fixes (ESLint 23 → 0 erros, build -538kB, etc) mas falhei em pegar bug crítico:

- Marcar motorista como "Desligado" não fazia ele sumir da aba "Não iniciaram"
- Causa: Firestore emulator local desincronizado com Cloud Firestore (ver [[project-firestore-emulator-off]])
- Esse bug só aparece em runtime, percorrendo o fluxo end-to-end

**Why:** Wesley perguntou direto "como você não identificou o erro?" — minha auditoria foi escaneamento de superfície, não validação de comportamento. Custou tempo dele.

**How to apply:** ao fazer auditoria de sistema em produção:
1. NÃO se limitar a ESLint + grep + overview de símbolos
2. Listar os 3-5 fluxos críticos de negócio (login, cadastro, ação principal, relatório)
3. Para cada fluxo: identificar onde frontend escreve, onde backend lê, se há cache intermediário, se há emuladores envolvidos
4. Sugerir smoke test ou rodar manualmente um fluxo end-to-end pra cravar que funciona
5. Quando identificar bug de integração, **ir direto no banco** (Firebase Admin SDK, query direto) pra confirmar estado real antes de teorizar

Em projetos como TMS Pontual onde tem emulators + cloud + functions + frontend rodando junto, SEMPRE perguntar: "quem escreve aqui, quem lê aqui, esses dois lados conversam?"

---

## Relacionado por tema

- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **firebase**: [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]]
