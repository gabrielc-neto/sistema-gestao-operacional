---
name: project-nf-nordica-substitui-civ
description: NF Nordica em cavalo novo substitui CIV por 1 ano (vencimento = emissão + 365 dias)
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

**Regra de negócio Pontual:**

## NF Nordica (fabricante de tanque/carroceria)
- **Substitui SÓ o CIV** (nunca CIPP)
- Vale como CIV **PROVISÓRIO** por **12 meses após emissão**
- Depois de 1 ano com NF → **obrigatório fazer CIV oficial (INMETRO)**
- Se cavalo tem CIV oficial válido → CIV oficial prevalece sobre NF
- Se cavalo tem SÓ NF Nordica > 12 meses e sem CIV oficial → **VENCIDO CRÍTICO**

## CIPP
- **NF nunca substitui CIPP** — CIPP tem que ser oficial sempre
- Vale 12 meses (padrão ANTT)

## IPEM (aferição do tanque)
- **PDF tem data emissão E vencimento explícitos** — extração deve funcionar bem via regex
- Prazo típico: 12 meses (aferição volumétrica anual)

## Regra geral
- **TODOS os documentos têm validade** — nada é vitalício
- Se doc não tem data extraída, marcar como "requer OCR" (não "vencimento indefinido")

**Why:** User esclareceu em 2026-07-15 17:15 e 17:20 as regras exatas. Corrigi entendimento inicial errado.

**How to apply:**

No script `extrair-vencimentos-frota.py`:
```python
# NF Nordica → CIV provisório
if 'nordica' in nome_arquivo.lower():
    tipo = 'CIV_PROVISORIO_NF'  # não é CIV oficial
    emissao = parse_data_emissao_da_nf(texto)
    vencimento = emissao + timedelta(days=365)
    # marcar campo 'requer_civ_oficial_apos' = vencimento

# Se veículo tem BOTH: NF Nordica + CIV oficial válido → CIV oficial prevalece
# Se veículo tem SÓ NF Nordica vencida → CRÍTICO

# CIPP → sempre pela validade oficial no PDF (VÁLIDO ATÉ)
# IPEM → data emissão + data vencimento explícitas
```

Ver também: [[project-frota-pontual-eixos]] · [[project_carga_perigosa]] · [[project-modulo-vencimentos-existente]]

Ver também: [[project-frota-pontual-eixos]] · [[project_carga_perigosa]] · [[project-modulo-vencimentos-existente]]
