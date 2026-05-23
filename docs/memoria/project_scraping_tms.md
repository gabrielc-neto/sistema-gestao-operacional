---
name: project-scraping-tms
description: "Onde web scraping (Scrapling) ajuda de verdade no TMS da Pontual — análise honesta API vs scraping. Foco: enriquecer precificação de frete (pedágio, diesel, piso ANTT)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6724ac89-4074-45e1-a2c6-093d41392374
---

Análise feita 2026-05-22: o que web scraping (Scrapling) pode ou não fazer pelo TMS ([[project_migracao_postgresql_tms]]).

**Why:** Wesley quer saber, sem hype, onde scraping agrega valor real. Conclusão central pra não desperdiçar esforço: **scraping é plano B — só vale quando a fonte NÃO tem API/dado aberto.** Muita coisa que parece scraping (CNPJ, CEP, NF-e) tem API oficial mais robusta.

**How to apply:** scraping NÃO toca o núcleo do TMS (rastreamento/jornada = SASCAR API). Entra como **enriquecimento pra precificar frete com custo real** — o módulo comercial (fase 5 do doc 12), que é o diferencial de venda vs SaaS de mercado.

**3 nichos legítimos de scraping** (todos ligados a custo/preço de frete, sem API decente):
1. **Pedágio por rota** (concessionárias/ANTT — só HTML/PDF)
2. **Restrição de tráfego de caminhão** (feriados, rodízio SP — ANTT/PRF/DNIT em HTML/PDF)
3. **Piso mínimo de frete ANTT** (obrigação legal) + **preço diesel/combustível ANP** (parte é CSV aberto, parte HTML por posto)

**Usar API oficial, NÃO scraping:**
- CNPJ → cliente (razão social, endereço, CNAE, situação) = BrasilAPI / ReceitaWS (grátis)
- CEP → endereço = ViaCEP (já usado nas cercas)
- NF-e / CT-e / MDF-e = webservice SOAP da SEFAZ
- Trânsito tempo real = Google/Waze API (não scrapear DNIT/PRF)

**Não vale / evitar:**
- SASCAR — já é API SOAP, NUNCA scrapear ([[reference_sascar_api]])
- DETRAN multas/débitos — captcha+login, frágil, varia por estado, cinza juridicamente
- Preço de frete de concorrente — não é público

Skill disponível: `scrapling-skill` (CLI extrai HTML/Markdown/texto). PoC oferecida e não iniciada: puxar tabela de pedágio de uma rota OU preço ANP do diesel pra validar antes de virar módulo.
