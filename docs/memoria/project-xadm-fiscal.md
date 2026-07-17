---
name: xadm-fiscal-mdfe
description: "MDF-e (e provavelmente outros docs fiscais) é feito no XADM 7.12 G19, ERP legado em ZIM — sistema novo NÃO deve reimplementar"
metadata: 
  node_type: memory
  type: project
  originSessionId: 49412f19-da7c-4759-a7ed-c8f54c60756b
---

MDF-e da Pontual é emitido pelo **XADM 7.12 G19** (`F:\XAdm712G19`), ERP fiscal legado baseado em ZIM DB. Reports em `F:\XAdmRelatorios`.

**Why:** Duplicar homologação SEFAZ que o XADM já cobre é desperdício de tempo (3-6 meses) e risco fiscal (rejeição/multas).

**How to apply:** No roadmap do `logistica-ia`, tratar XADM como sistema-de-registro fiscal. Integrações possíveis se precisar de dados:
- Exportar CSV/TXT do XADM e importar no sistema novo (padrão atual da Pontual — já usa Excel manualmente)
- Ler ZIM DB direto (arriscado — legado)
- Ficar totalmente separado: XADM cuida do fiscal (NF-e/MDF-e/CT-e/SPED), sistema novo cuida da operação (despacho, jornada, frota, pneus, KPIs)

Confirmar com user quais docs além de MDF-e o XADM cobre (NF-e? CT-e? SPED?) antes de planejar homologação de qualquer documento fiscal no sistema novo.

Relacionado: [[project-logistica-ia-frontend]]
