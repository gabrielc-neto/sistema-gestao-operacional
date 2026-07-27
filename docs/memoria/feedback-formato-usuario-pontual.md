---
name: feedback-formato-usuario-pontual
description: "Sempre que sistema mostrar 'quem fez' uma ação (criadoPor, atualizadoPor, salvoPor, editadoPor, responsavel etc), usar formato NOME.PONTUAL — ex: THIAGO.PONTUAL, ROSILDA.PONTUAL. Não usar email nem nome completo. Regra permanente da Rosilda 2026-07-23."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Regra

Todo campo que registra QUEM fez uma ação no sistema deve mostrar no formato:

```
NOME.PONTUAL
```

Exemplos:
- ✅ `THIAGO.PONTUAL`
- ✅ `ROSILDA.PONTUAL`
- ✅ `WESLEY.PONTUAL`
- ❌ `thiago@pontual.com` (email cru — não usar)
- ❌ `Thiago Silva` (nome completo — não usar)
- ❌ `Thiago` (primeiro nome sem sufixo — não usar)

## Onde aplicar

Todos os campos de "quem" no sistema, incluindo:

- `criadoPor` (quem criou o registro)
- `atualizadoPor` / `editadoPor` (quem alterou)
- `finalizadoPor` (quem finalizou)
- `bloqueadoPor` / `desbloqueadoPor` (bloqueio de veículo)
- `salvoPor` / `responsavel` / `usuario`
- `aprovadoPor` / `rejeitadoPor` (requisições, propostas)
- Qualquer campo que registra a autoria de uma ação

## Como implementar

Criar helper em `frontend/src/utils/format.js`:

```javascript
export function usuarioPontual(profile) {
  const nome = profile?.nome || profile?.displayName || profile?.email || "";
  // Pega primeira palavra do nome
  const primeira = String(nome).trim().split(/[\s@.]+/)[0];
  if (!primeira) return "USUARIO.PONTUAL";
  return `${primeira.toUpperCase()}.PONTUAL`;
}
```

Usar em vez de `profile?.nome || profile?.email` em todo lugar que grava/exibe autoria.

## Reason

Rosilda 2026-07-23: pediu padronizar. Facilita auditoria — todos os registros de "quem" ficam consistentes, fácil de bater com pessoa real (basta olhar antes do `.PONTUAL`).

## How to apply

- **Novos códigos:** SEMPRE usar `usuarioPontual(profile)` em vez de acessar `profile.nome`/`profile.email` diretamente.
- **Código legado:** substituir gradualmente conforme for mexendo em cada arquivo.
- **Backend (VPS Node):** quando salvar `criadoPor` no PG, aplicar mesma transformação server-side (ou receber pronto do frontend).
- **Dados antigos:** deixar como estão (retrocompat) — só novos registros seguem o padrão.

Ver também: [[feedback-so-mudar-o-que-user-pediu]] · [[feedback-jamais-emoji-sempre-icones]]
