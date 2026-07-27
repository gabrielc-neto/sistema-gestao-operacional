---
name: feedback-trocar-imagem-em-slide-flatten
description: "Quando user pede pra trocar SÓ a foto num slide-imagem-flatten (PNG composto), usar PIL para substituir só o bbox da foto, nunca recompor layout do zero"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 629325ed-eb29-4732-9536-fc9ae6081bf3
---

Quando slide PowerPoint é uma única imagem PNG flatten (todo o layout — logo, textos, tabelas, foto — fundido num só pixel), e o user pede pra "trocar SÓ a foto do caminhão/produto/etc": NÃO recompor layout via python-pptx. Substituir só a região da foto via PIL.

**Why:** user explícito disse "atualize SOMENTE isso" e ficou irritado quando recompus visual inteiro com python-pptx perdendo design original. Solução PIL preserva 100% pixel-perfect do logo, textos e tabelas.

**How to apply:**
1. Unpack pptx (ele é um zip)
2. Detectar bbox da foto via análise de pixels: procurar transições de cor (faixas separadoras coloridas, mudança nítida de saturação) — `numpy.array(img)` + varredura por linha/coluna
3. Center-crop foto nova pro aspect ratio do bbox detectado
4. `Image.paste(photo, (x1, y1))` na imagem composta
5. Re-zipar pptx via `zipfile.ZIP_DEFLATED`
6. Validar exportando PNG via PowerPoint COM (PowerPoint não está em PATH; usar `powershell.exe ... PowerPoint.Application $pres.SaveAs($out, 18)`)

Conexão Canva MCP existe nessa sessão (`mcp__claude_ai_Canva__*`), mas só funciona se o design estiver na conta Canva do user — nem sempre é o caso.

**NUNCA inverter ordem de fotos sem o user pedir.** Se ele especificou "foto A no slide X, foto B no slide Y", manter exatamente assim mesmo se tecnicamente A ficar melhor no Y. Resolver problemas de contraste ajustando o crop (`h_offset_pct` no `replace_region`), nunca trocando a foto. User ficou irritado quando inverti por iniciativa própria.
