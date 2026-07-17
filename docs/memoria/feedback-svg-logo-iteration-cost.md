---
name: feedback-svg-logo-iteration-cost
description: "Não iterar SVG/PNG de marca a olho — se 2ª tentativa falhar, oferecer alternativa textual e parar"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2f7e3d50-3571-4b84-bb8a-7b9e0bfbd827
---

Quando user pede ajuste visual de logo/marca e a 1ª tentativa não fica fiel, **NÃO insistir com mais iterações desenhando swoosh/letras** sem o asset original em mão.

**Why:** Sessão 2026-06-15/16 no `logistica-ia` — user pediu logo Pontual branca pro Dashboard. Eu desenhei SVG do swoosh à mão, ficou diferente; tentei processar pixels do PNG, ficou ruim; tentei outra vez com Python+Pillow desenhando, italic não pegou. User cansou e disse "deixa só o texto PONTUAL LOGÍSTICA / Sistema de Gestão Operacional". Lição: cada iteração visual sem feedback rápido do browser custa **mais paciência do user que tempo de código**.

**How to apply:**
1. **1ª tentativa**: SVG/PNG meu — OK arriscar
2. **Se user reclamar**: pedir o asset oficial (PNG/SVG existente no projeto, em `frota_pontual.html` embutido, ou no Desktop scripts `_logo_*`) — extrair em vez de redesenhar
3. **Se ainda assim ficar ruim na 2ª**: PARAR e oferecer alternativa textual (só texto/título sem logo). Não tentar 3ª vez desenhando.
4. **Asset de marca não é coisa que se "chuta" iterativamente** — ou tem o oficial, ou substitui por texto puro

Relacionado: [[project-logistica-ia-frontend]]

---

## Relacionado por tema

- **pontual**: [[feedback-login-split-pattern]] · [[feedback_arquivo_explicito_obrigatorio]] · [[feedback_arquivos_downloads]]
- **roteirizacao**: [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]] · [[feedback_projeto]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]] | [[feedback_arquivo_explicito_obrigatorio]]
