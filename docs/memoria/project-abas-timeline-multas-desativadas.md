---
name: project-abas-timeline-multas-desativadas
description: Abas Timeline, Multas e Vistoria/DVIR do módulo /manutencao foram DESATIVADAS por decisão da user 2026-07-21. Arquivos AbaTimeline.jsx, AbaMultas.jsx e AbaVistoria.jsx mantidos em /manutencao/ pra reativar futuramente sem redoar.
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

**Timeline, Multas e Vistoria/DVIR — REMOVIDAS do menu do /manutencao em 2026-07-21.**

Decisão da user (Rosilda):
- **Timeline** (`/manutencao?aba=timeline`) — "acho que não precisa dele, mais para frente"
- **Multas** (`/manutencao?aba=multas`) — "as multas pode remover"
- **Vistoria/DVIR** (`/manutencao?aba=vistoria`) — "vistoriaDVIR pode remover"
  - Motivo: motoristas não vão preencher checklist no celular; papel/nada é o padrão atual da Pontual

## O que foi feito

**No código:**
- NavTabs removidos do menu de Manutenção
- Renders `{aba === "timeline"/multas"}` deletados
- Imports `AbaTimeline` e `AbaMultas` removidos de Manutencao.jsx
- Retiradas de `ABAS_VALIDAS` (URL direta não valida mais)
- **Arquivos preservados** em `frontend/src/manutencao/AbaTimeline.jsx` e `AbaMultas.jsx` — código completo, pronto pra reativar sem redoar.

**Coleções Firestore mantidas:**
- `multas` — dados já existentes (se houver) permanecem intactos
- Timeline não tem coleção própria (só agrega OS + manutencoes + multas + abastecimentos)

## Why

Rosilda avaliou o valor imediato:
- **Multas:** já não desconta do motorista ([[project-pontual-nao-desconta-multa-motorista]]) e o volume não é crítico pra ter aba dedicada.
- **Timeline:** consolidação de eventos é overkill pro cotidiano dela — pega as infos direto em cada aba original quando precisa.

Regra: não sobrecarregar UI com features "úteis em tese" — só o que ela USA de verdade fica no menu principal.

## How to apply

**Se qualquer Claude quiser reativar:**
1. Confirmar com a user antes (não fazer sozinho)
2. Restaurar linhas em Manutencao.jsx:
   - Import: `import AbaMultas from "../manutencao/AbaMultas";` + AbaTimeline idem
   - ABAS_VALIDAS: add "multas" e "timeline"
   - NavTab: Multas em grupo Manutenção · Timeline em grupo Visão
   - Render: `{aba === "multas" && <AbaMultas .../>}` + Timeline idem
3. Ver commit anterior à decisão pra pegar código exato (git log)

**Se user perguntar features de multa/histórico:**
- Multa: sugerir aba Estoque com filtro OR outros. Ou reativar.
- Timeline/histórico: buscar dado direto em cada aba (por veículo em `/manutencao?aba=veiculo`).

## Regras aparentadas

- [[project-pontual-nao-desconta-multa-motorista]] — política que reduz necessidade de multa integrada ao fluxo
- [[feedback-jamais-emoji-sempre-icones]] — regra de UI

Ver também: [[feedback-abertura-sessao-consultar-contexto]]
