---
name: project-modulo-vencimentos-existente
description: "Sistema Pontual JÁ TEM módulo de vencimentos em manutencao/AbaConjuntoVencimentos.jsx — não criar módulo novo, adicionar tipos no existente"
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Fato do sistema:** existe módulo `frontend/src/manutencao/AbaConjuntoVencimentos.jsx` que trata TODOS os vencimentos por conjunto (cavalo + carreta).

**Onde entra CIV / CIPP / CNH / licenciamento / seguro / TCH / tacógrafo / etc:**
Todos são "tipos de vencimento" registrados no mesmo módulo. Cada registro tem:
- Veículo/motorista
- Tipo (CIV, CIPP, CNH, licenciamento, ...)
- Data vencimento
- Status calculado (vencido, próximo, ok)

**Coleções Firestore relacionadas:**
- Provavelmente `manutencoes` ou coleção específica com campo `tipo` = "CIV" | "CIPP" | etc
- Consultar `AbaConjuntoVencimentos.jsx` pra ver estrutura exata

**Why:** User corrigiu 2026-07-15 16:35 — "não precisa de módulo, pois no vencimento do sistema tem, esqueceu?" — eu havia sugerido criar módulo novo pra CIV/CIPP sem consultar o código. Erro derivou de não checar antes de sugerir.

**How to apply:**
- Qualquer nova documentação relacionada a vencimento (CIV, CIPP, CNH, ANTT-RNTRC, seguro, tacógrafo, teste hidrostático) → **entra no módulo existente como novo tipo**, não como módulo novo
- Antes de sugerir CRIAR módulo, `grep -r` no `frontend/src/` pelo tema
- Arquivos relevantes: `manutencao/AbaConjuntoVencimentos.jsx`, `manutencao/AbaControleRotina.jsx`, `pages/Manutencao.jsx`, `pages/Motoristas.jsx` (vencimento CNH), `pages/Atrelamento.jsx` (vencimento conjunto)

Ver também: [[project-frota-pontual-eixos]] · [[project_carga_perigosa]] · [[project_excel_vencimentos_frota]]
