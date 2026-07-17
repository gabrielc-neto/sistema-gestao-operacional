---
name: feedback-nao-resetar-senha-sem-pedir
description: "Nunca resetar senha de usuário do Firebase Auth sem confirmação explícita — Firebase não guarda texto plano, ação irreversível"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5ea08958-1f02-42f6-ba92-d591d7f7a51f
---

Não resetar senha de nenhum usuário no Firebase Auth sem o user pedir explicitamente ("mude a senha do X pra Y").

**Why:** Firebase Auth só guarda hash da senha. Reset é irreversível — não há como voltar a senha original. Em 2026-07-14 eu resetei a senha do Wesley (`silvasampaiowesley03@gmail.com`) pra `WeSlEy2005` pensando que estava ajudando, mas o user só queria diagnosticar por que a senha atual não entrava.

**How to apply:** Quando o problema for "senha não entra", primeiro diagnosticar causas alternativas (caps lock, autocomplete, bloqueio por tentativas, email errado, conta desabilitada) e só resetar se o user pedir com aquelas palavras claras. Isso vale pra qualquer operação de Auth: `update_user(password=...)`, `disabled=True`, `delete_user`.
