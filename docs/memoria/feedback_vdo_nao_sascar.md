---
name: feedback-vdo-nao-sascar
description: "VDO (tacógrafo) e SASCAR (rastreamento) são fornecedores DIFERENTES da Pontual. Contratos separados, APIs separadas. Nunca tratar como mesma empresa."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dad63364-1a18-4047-bcae-688259c317b0
---

VDO e SASCAR são empresas/fornecedores diferentes da Pontual. Não confundir.

- **SASCAR** (Michelin Connected Fleet) — fornece: GPS rastreador LMU4230/MSC830 + tablet SasMDT em cabine + portal SASCAR + API SasIntegra
- **VDO** — fornece tacógrafo digital DTCO. É marca tradicional da Continental (Continental VDO), mas o integrador/contrato pode ser outro (oficina credenciada, distribuidor, software como Tachoscan/VDO Fleet).

**Why:** Wesley corrigiu em 2026-05-19. Antes desse esclarecimento, a memória [[project_jornada_3fontes_plano]] tratava as 3 fontes sem distinguir fornecedor — corria risco de planejar integração VDO via API SASCAR (impossível, são serviços separados).

**How to apply:**
- Ao planejar integração VDO, lembrar que **não passa pela API SasIntegra**. Contrato separado, possivelmente:
  - Pen drive físico → upload manual no nosso TMS
  - Software desktop da oficina (Tachoscan etc) com export
  - API/portal próprio do fornecedor VDO (se Pontual contratar)
- Confirmar com Wesley QUAL empresa entrega o VDO e QUAL software lê os .DDD hoje antes de codar Fase 2.
- Custo, contrato e suporte do VDO são separados do SASCAR — não misturar negociações.

Relacionado: [[project_jornada_3fontes_plano]], [[reference_sascar_api]]
