---
name: project-conjuntos-akd5988-bbe9588
description: Conjuntos atuais dos cavalos AKD5988 (simples com AKC4906) e BBE9588 (rodotrem com AQR9387+AQR9374) — dados do Firestore em 2026-07-17
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Conjuntos ativos (consulta Firestore em 2026-07-17)

### AKD5988 · Cavalo simples

- Mercedes-Benz **Axor 2536 S/LS** 2017/2018
- Empresa: PONTUAL · Rota: NORTE · Status: `em_viagem`
- Motorista: `PX` (placeholder — sem motorista real atribuído)
- **7 bocas** de 5000L = **35.000 L**
- Média: 2,2 km/L · SASCAR 17321683 · Chassi 9BM958443JB075488
- **Conjunto → carreta AKC4906** (LS/semirreboque, 2002)
- Bloqueio: liberado por Wesley em 2026-06-05

### BBE9588 · Cavalo 6x4

- **DAF XF105 FTT 510A** 2017
- Empresa: PONTUAL · sem rota atribuída
- Motorista: **COSME DA SILVA**
- Config: **RODOTREM** (2 carretas)
- **2 bocas** = 26.000 + 36.000 = **62.000 L**
- Média: 1,5 km/L · SASCAR 461646263 · Chassi 98PTT47MSHB101571
- **Conjunto → carretas AQR9387 + AQR9374** (ambas 2008)

## Why

User consultou em 17/07 quais eram os conjuntos dessas placas. Registrar pra consultas futuras sem precisar rodar Firestore de novo.

## How to apply

- Se surgir dúvida sobre "qual carreta anda com X", consultar esta memória primeiro
- Se `updatedAt` do doc Firestore for muito antigo (> 30 dias), rodar `scripts/consultar-veiculo.mjs [PLACA]` pra atualizar
- **BBE9588 é conjunto 9 eixos** (3 do cavalo + 3 da AQR9387 + 3 da AQR9374) — precisa **licença ambiental** (ver [[project-frota-pontual-eixos]])
- Documentos pendentes: BBE9588 sem CRONOTACÓGRAFO + LICENÇA AMB + CIV vencido; AKD5988 sem CRONOTACÓGRAFO. Ver [[docs/frota-FALTANTES-veiculos]]

## Campo `tipo_conjunto` está `null` nos dois

Sistema exibe config pelo campo `t1`/`t2` (LS pro AKD, Rodotrem pro BBE). Preencher `tipo_conjunto` = "Simples" / "Rodotrem" tornaria a UI mais consistente.

Ver também: [[project-frota-pontual-eixos]] · [[reference_sascar_api]]
