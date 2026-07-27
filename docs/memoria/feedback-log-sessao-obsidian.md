---
name: feedback-log-sessao-obsidian
description: Cada modificação (mesmo sem commit git) deve ser espelhada em docs/sessoes/YYYY-MM-DD.md do vault Obsidian
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Regra permanente:** Toda modificação de código, decisão técnica, comando executado ou passo relevante da sessão DEVE ser registrada em `docs/sessoes/YYYY-MM-DD.md` no repo `C:\Users\Logistica01\projetos\logistica-ia`.

**Why:** User falou explicitamente 2 vezes (2026-07-15 11:30 e 15:57):
- "às vezes fecho o terminal sem querer"
- "toda modificação, mesmo que eu não mande commitar, atualize no obsidian, para não perder o contexto de nada, assim não perde o andamento dos projetos"

Sem esse log, se o terminal fechar OU se abrir sessão nova em outro dia, perde-se o contexto real do que foi feito. O git commit sozinho não basta porque o user às vezes pede pra NÃO commitar (só testar) e ainda assim quer o registro.

**How to apply:**

**FAZER** — a cada bloco de trabalho concluído (não a cada arquivo, mas a cada ação lógica):

```markdown
## HH:MM — Título curto do que fiz

Descrição 2-3 linhas.

Arquivos: file1.jsx, file2.js
Resultado: OK / erro X / decisão Y
```

Append no fim do `docs/sessoes/YYYY-MM-DD.md` (não sobrescrever).

**Regras específicas:**
- **Fazer mesmo se user pedir "não commite"** — log local, não git
- **Fazer mesmo em correções pequenas** — 1 linha só é suficiente
- **Fazer antes de tentativas destrutivas** — pra ter registro do "antes"
- **Fazer ao fim de cada resposta longa/complexa** — não esperar user pedir
- **Cronologia crescente** — timestamps em ordem, um bloco por ação
- **Se arquivo do dia não existe** — criar com header + primeiro bloco

**NÃO FAZER:**
- Esperar autorização pra registrar
- Registrar só o commit — registrar TODA modificação
- Sobrescrever entradas anteriores

Ver também: [[feedback-abertura-sessao-consultar-contexto]] — próxima sessão vai LER esses logs pra continuar de onde parou.
