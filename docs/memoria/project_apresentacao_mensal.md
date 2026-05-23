---
name: apresentacao-mensal
description: "Como montar a apresentação mensal do sistema de logística — formato, local e o impedimento do agente presentation-curator"
metadata: 
  node_type: memory
  type: project
  originSessionId: b2f56e6a-b33b-49b1-8dd1-efd07d708b3f
---

Apresentação mensal do sistema (manutenção, rastreio, jornada) para o setor / Wesley.

**Fato:** A regra global `presentation.md` manda delegar toda apresentação ao agente `presentation-curator`, mas esse agente NÃO está instalado neste ambiente (não aparece na lista do Agent tool). Não existe pasta `presentation/` em lugar nenhum — apresentações são criadas do zero.

**Decisão do Wesley (2026-05-20):** Quando o curator não estiver disponível, gerar a apresentação em **PowerPoint (.pptx)** salvo na **Área de Trabalho** (`C:\Users\Logistica01\Desktop`).

**Como gerar:** `python-pptx` 1.0.2 está instalado. LibreOffice e markitdown NÃO estão. Para QA visual, usar PowerPoint via `win32com` (pywin32 disponível) exportando slides como PNG — `POWERPNT.EXE` em `C:\Program Files\Microsoft Office\root\Office16`.

**Why:** Apresentação recorrente mensal do diretor para alinhar o setor (gestão à vista).
**How to apply:** Ao pedir "apresentação desse mês", tentar o curator primeiro; se ausente, oferecer .pptx no Desktop. Paleta navy+âmbar funcionou bem. Não inventar métricas/números não fornecidos — deixar para o Wesley preencher.

**Aprovado pelo Wesley (2026-05-20):** o resultado da primeira versão "ficou bom" — design/estrutura/paleta validados, manter esse padrão como base. O Wesley vai pedir MAIS MODIFICAÇÕES em cima desse arquivo. Editar/iterar o `.pptx` existente em vez de recriar do zero, preservando o estilo aprovado.

Maio/2026: primeira entrega — entrada do colaborador Thiago (gestão de manutenção, OS, lançamento de notas, novos fornecedores). Arquivo: `Desktop\Apresentacao_Sistema_Maio2026.pptx`. Status: aprovado, em iteração.
