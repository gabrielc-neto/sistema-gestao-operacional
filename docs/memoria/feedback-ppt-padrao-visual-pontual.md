---
name: feedback-ppt-padrao-visual-pontual
description: Identidade visual oficial da Pontual para PowerPoint — sempre usar em apresentações internas
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 10ac2ed4-91d5-42ab-ac4a-b62cdcc2453e
---

Toda apresentação PowerPoint da Pontual segue o padrão institucional. NÃO inventar paleta nova a cada apresentação.

**Why:** User aprovou em 2026-07-24 depois de comparar com modelo `Downloads/capa apresentação julho.pptx`. Consistência visual é obrigatória — a apresentação é do escritório e circula com diretoria/clientes.

**How to apply:** Ao criar qualquer PPT novo, carregar template pronto em `C:\Users\Logistica01\projetos\logistica-ia\docs\templates\ppt-pontual-template.py`. Não redesenhar do zero.

## Paleta oficial (accent-700 do design system frontend)

| Elemento | Cor | Hex |
|---|---|---|
| Navy institucional | NAVY | `#18216E` |
| Navy escuro (accent-900) | NAVY_D | `#0F1443` |
| Ice (accent-100) | ICE | `#DDE3F7` |
| Ice muito claro (accent-50) | ICE2 | `#EEF1FB` |
| Amarelo Pontual (destaque) | GOLD | `#F5B800` |
| Azul médio | AZUL_M | `#5F80CD` |
| Cinza texto | GRAY | `#4A4A4A` |
| Cinza claro sub | GRAY_L | `#8A8A8A` |

## Estrutura obrigatória de slide

1. **Header:** faixa NAVY altura 1.05" + faixa GOLD altura 0.06" logo abaixo
2. **Título:** CAIXA ALTA branco Calibri 24pt bold à esquerda do header
3. **Subtítulo:** ICE 12pt logo abaixo do título
4. **Fundo geral:** branco puro
5. **Rodapé:** GRAY_L 9pt uma linha, canto inferior esquerdo (metodologia + fonte + "Pontual Brasil Petróleo")

## Cards padronizados

- **KPI card ICE (topo):** cantos arredondados, label CAIXA ALTA NAVY 10pt, valor NAVY 22pt bold, sub GRAY_L 9pt
- **KPI card NAVY (destaque):** cantos arredondados, número GOLD 26pt bold, label branco 10pt CAIXA ALTA embaixo
- **Ranking:** posição em card quadrado (1º sempre GOLD com texto NAVY, resto NAVY com texto branco), nome CAIXA ALTA, barra proporcional (1º amarela, resto navy sobre ice)

## Regras de texto

- Rotas: eixo bidirecional agrupado, "x" **minúsculo** entre cidades ("Araucária x Irati", nunca "X")
- Nomes de empresa/rota em CAIXA ALTA nos rankings, Title Case nos subtítulos
- Valores: sempre `brl()` (R$ 1.234,56) — usar `brk()` só em gráficos apertados (R$ 34,5k)

## Template pronto para reuso

Copiar `docs/templates/ppt-pontual-template.py` e adaptar:
- Estruturas prontas: `header()`, `footer()`, `kpi_card_ice()`, `kpi_card_navy()`, `add_rect()`, `add_text()`
- Slide widescreen 13.333 x 7.5 pol
- Fonte Calibri (fallback Consolas apenas para placas)

Links: [[project-pontual-logo-white-aprovada]] · [[feedback-jamais-emoji-sempre-icones]]
