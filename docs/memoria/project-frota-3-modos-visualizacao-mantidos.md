---
name: project-frota-3-modos-visualizacao-mantidos
description: "Página /frota tem 3 modos de visualização (Cards/Tabela/Split) — decisão user 2026-07-22: manter os 3, cada usuário escolhe. NÃO remover nenhum dos 3 modos sem pedido explícito."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

A página `/frota` tem **3 modos de visualização** disponíveis via toggle na toolbar:

1. **Cards** (padrão) — flip 3D, formato original
2. **Tabela** — SAP/Totvs-like, denso, 8 colunas
3. **Split** — Salesforce-like, lista + painel de detalhes

**Preferência salva em `localStorage.frota_view`** — cada usuário escolhe uma vez e sistema lembra.

## Decisão da user

Rosilda 2026-07-22: *"deixa os 3, ai cada um usa o que quer"*

Motivo: cada operador tem preferência diferente. Motorista/oficina prefere Cards
(visual). Karine/despachantes preferem Tabela (dados denso pra comparar).
Wesley pode preferir Split (foco em 1 veículo por vez).

## Regra pra qualquer Claude futuro

**NÃO remover nenhum dos 3 modos sem pedido explícito da user.**

Se algum Claude achar que "está poluído" ou "usuário confuso" — ignorar. User validou os 3.

Se user pedir pra remover algum específico ("tira o Split") — aí sim faz.

## Estrutura técnica

- Arquivo: `frontend/src/pages/Frota.jsx`
- State: `const [modoView, setModoView] = useState(() => localStorage.getItem("frota_view") || "cards")`
- Render condicional: `modoView === "cards"` OR `"tabela"` OR `"split"`
- Toggle: 3 botões na toolbar principal (após tabs Ativos/Inativos)

Ver também: [[feedback-so-mudar-o-que-user-pediu]] · [[project-abas-timeline-multas-desativadas]]
