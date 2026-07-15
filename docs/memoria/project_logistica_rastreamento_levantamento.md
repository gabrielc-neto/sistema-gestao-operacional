---
name: Levantamento Logística & Rastreamento — Pontual
description: Mapeamento completo de funcionalidades TMS/rastreamento para transportadora de combustível, organizado por fase e dependência de API
type: project
originSessionId: aa056d7a-4096-4359-8dfb-a0aba1233f5b
---
Levantamento aprovado pelo Wesley para guiar evolução do sistema.

**Why:** Transportadora de combustível (carga perigosa Classe 3 ONU) tem obrigações legais específicas (ANTT, ANP, INMETRO, NBR 7500/7503) além do TMS padrão.

**How to apply:** Consultar ao planejar novos módulos. Respeitar ordem das fases.

---

## FASE 1 — Agora, só Firebase (sem API externa)

### Operacional OC
- Romaneio por compartimento da carreta (produto, volume, lacre por tanque)
- Compatibilidade de produto — bloqueia carregar gasolina em tanque que teve etanol
- Registro lavagem/desgaseificação ao trocar produto
- Ciclo de vida OC: Programada → Carregando → Em Trânsito → Entregue
- Quebra de volume: litros saída vs litros entregues (perda por viagem)

### Documentação obrigatória
- Ficha de Emergência + Envelope de Transporte PDF automático por OC (NBR 7503 — obrigatório na cabine)
- Placa laranja ONU por produto vinculada à OC: diesel 1202/30, gasolina 1203/33, etanol 1170/33
- Alerta vencimento: RNTRC, apólice seguro, CIV, CIPP, MOPP (parcialmente feito)

### Segurança pré-viagem
- Checklist digital pré-viagem com foto (pneus, extintor, kit NBR 9735, lacres, EPI, hodômetro)
- App motorista PWA: recebe OC, envia checklist/fotos, confirma entrega com assinatura cliente

### Manutenção
- Plano preventiva por KM (alerta ao atingir KM cadastrado)
- Vida útil pneu por posição
- Inspeção periódica tanque (corrosão, válvulas, respiros — NBR 7505)

---

## FASE 2 — Com API SASCAR (aguarda credencial)

- Mapa ao vivo — posição dos 38 cavalos
- Cerca eletrônica — entrada/saída PONTUAL, Replan, clientes
- Parada não programada → alerta imediato (suspeita roubo)
- Desvio de rota — trajeto real vs planejado
- Bloqueio remoto motor pela central
- Sensor abertura tampa bocal em movimento
- Botão pânico motorista
- Telemetria condução: frenagem brusca, curva agressiva (crítico com carga líquida)
- Tempo espera pátio Replan (dado para negociação)
- Identificação motorista por iButton

---

## FASE 3 — Com VDO (aguarda integração)

- Jornada real do tacógrafo digital (arquivo .DDD)
- Cálculo automático Lei 13.103: tempo direção, pausa 30 min, descanso 11h
- Contador regressivo na OC: "motorista tem X horas antes do descanso obrigatório"
- Bloqueio nova OC quando motorista não cumpriu descanso
- Regra empresa: 2 semanas consecutivas → motorista obrigado folgar
- Espelho ponto → folha de pagamento, HE, adicional noturno (de motorista, pelo próprio TMS — **Sólides é só ADM**, ver [[feedback_solides_so_adm]])

---

## FASE 4 — Integrações comerciais

| Funcionalidade | API |
|---|---|
| Controle abastecimento frota (anti-fraude) | Ticket Log / Edenred |
| ValePedágio eletrônico (Lei 10.209 — obrigatório) | SemParar / ConectCar |
| Notificação WhatsApp cliente (saída/chegada) | Z-API / Meta Cloud |
| Portal cliente — acompanhar entrega | Firebase puro |
| Consulta RNTRC automática | Webservice ANTT |

---

## Perguntas em aberto (confirmar com Wesley)

1. Transportador puro ou TRR/Distribuidor? (muda obrigação ANP/SIMP)
2. Subcontratam frete? (se sim, CT-e/MDF-e voltam)
3. Apólice exige rota homologada e janela de horário?
4. VDO já instalado nos 38 cavalos?
5. Abastecimento frota: bomba própria na base ou cartão frota?

---

## Obrigações legais específicas combustível

- NBR 7500/7501/7503/7504 — sinalização, ficha emergência, envelope transporte
- NBR 9735 — kit emergência obrigatório cabine (extintor, calço, cone, EPI)
- ANTT Res. 5.998/2022 (RTPP) — transporte produtos perigosos
- MOPP motorista (validade 5 anos)
- CIPP carreta (anual, INMETRO)
- CIV cavalo (anual)
- RNTRC (ANTT)
- Apólice RCTR-C + RCF-DC obrigatória (carga perigosa — Decreto 61.867)
- ValePedágio obrigatório (Lei 10.209)
- Tacógrafo digital obrigatório (CONTRAN 1.111/2024)

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **cta**: [[feedback-windows-file-watcher]] · [[project_estado_atual]] · [[project_levantamento_logistica]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **pneus**: [[reference_padrao_visual_pontual_xlsx]]
