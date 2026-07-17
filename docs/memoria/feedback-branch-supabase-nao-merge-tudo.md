---
name: feedback-branch-supabase-nao-merge-tudo
description: "Branch feat/migracao-supabase removeu módulos críticos (Pneus completo, Vencimentos, Manutenção). Nunca merge inteiro — só cherry-pick seletivo"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Regra

**NUNCA fazer merge inteiro da branch `feat/migracao-supabase` pro master.** Só cherry-pick de arquivos específicos.

## Why

Análise em 2026-07-17 mostrou que a branch está 7 commits à frente com 7018 inserções / 10800 remoções (líquido -3782 linhas). O problema é **o que foi removido**:

- ❌ **Módulo Pneus INTEIRO** — Dashboard, Compras, Estoque, Frota, **Inspeção**, Recapagem, esquemas, movimentações. Layout de Inspeção custou ~20 iterações pra ser aprovado. Ver [[feedback-pneus-esquematico-aprovado]]
- ❌ **`AbaConjuntoVencimentos.jsx`** — o módulo de vencimentos existente. Ver [[project-modulo-vencimentos-existente]]
- ❌ **`AbaControleRotina.jsx`** + **`AbaEstoque.jsx`** (Manutenção)
- ❌ **`FichaPneu.jsx`**
- ❌ **`Manutencao.jsx`** perdeu 3130 linhas
- ❌ **Dados lavagem/calibragem** (70 registros já importados)
- ❌ **Hook `useOdometrosSascar.js`** (KM automático dos veículos)
- ❌ `utils/pdfInspecao.js` + `utils/pdfOS.js`
- ❌ `start-emulators-jdk21.bat` (script Firebase local em uso)

A branch começou como migração de banco (Firestore → Supabase) mas junto veio redesign visual + limpeza "pra começar do zero" que apagou coisas essenciais.

## How to apply

**Trazer da supabase (cherry-pick):**
1. Módulo **Compras** (`Compras.jsx` 1023 linhas + `utils/compras.js` 80)
2. Módulo **Intranet** (`IntranetArea.jsx` + `ConfiguracoesIntranet.jsx` + `PropostaConvite.jsx`)
3. **ExportBar.jsx** + `utils/exportacao.js` (útil em todas as telas)
4. **GraficoEvolucaoCustos.jsx**
5. **MenuNavegacao.jsx** + **ModuleHeader.jsx** (padronização visual)
6. Migration SQL como referência

**Ignorar:**
- Redesign do Login (o fullbleed atual já foi aprovado — ver [[feedback-login-fullbleed-cta-pattern]])
- Todas as remoções listadas acima
- Setup Supabase inteiro (vamos pra Laravel/MySQL Hostinger, não Supabase — ver [[project-migracao-laravel-hostinger]])

Ver também: [[project-modulo-compras-branch-supabase]] · [[project-branches-github-multiplas]]
