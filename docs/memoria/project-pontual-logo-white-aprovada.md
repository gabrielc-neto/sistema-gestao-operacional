---
name: project-pontual-logo-white-aprovada
description: Logo branca da Pontual no Dashboard — versão final aprovada em 2026-06-16
metadata: 
  node_type: memory
  type: project
  originSessionId: 2f7e3d50-3571-4b84-bb8a-7b9e0bfbd827
---

A versão de produção do logo white usado em fundo azul-marinho (Dashboard) é:

- **Arquivo**: `frontend/public/pontual-logo-white.png`
- **Componente**: `frontend/src/components/LogoPontual.jsx` com `variant="white"`
- **Cache-bust**: constante `ASSET_VERSION` no topo do componente; bumpar string ao trocar foto

**Composição visual aprovada:**
- Texto PONTUAL: branco italic bold (gerado por troca de pixels azul→branco do `pontual-logo.png`)
- Swoosh: gradient horizontal verde→amarelo (4 stops):
  - 0% → `rgb(78,138,42)`
  - 40% → `rgb(142,198,63)`
  - 70% → `rgb(200,192,29)`
  - 100% → `rgb(245,195,24)`
- Fundo: transparente (não usar PNG com fundo branco sólido)

**Why:** Itera+ções de 2026-06-15/16 na sessão `logistica-ia` — user fez sair de 5 versões diferentes antes de aprovar. Lições gravadas em [[feedback-svg-logo-iteration-cost]].

**How to apply:**
- Se precisar regenerar: o `pontual-logo.png` (logo COLORIDA original com fundo transparente) é a base. Script é troca-pixels azul→branco + recolorir amarelo via LUT do gradient acima. Quem quiser regenerar, ver bash python no histórico desta sessão.
- **NÃO tentar corte central transparente** no swoosh — testado e fica serrilhado pixel-a-pixel. Só perfeito com SVG vetorial.
- Pra futura logo Pontual: pedir asset vetorial (SVG/AI) ou PNG já finalizado pelo user.

Relacionado: [[project-logistica-ia-frontend]], [[feedback-svg-logo-iteration-cost]]

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]] | [[project_carga_perigosa]]
