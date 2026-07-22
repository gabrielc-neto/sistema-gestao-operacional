---
name: project-roadmap-macros-sascar-tempo-real
description: "ROADMAP FUTURO — quando Pontual instalar macros SASCAR (botões no tablet do motorista), o sistema deve mostrar em tempo real o status operacional de cada veículo: Em manutenção · Chegada cliente carregado · Viagem vazio · etc. NÃO implementar antes da user pedir."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

Rosilda planeja instalar **macros SASCAR** (botões customizados no tablet SasMDT do motorista) e quer que o sistema:
- Receba os eventos em tempo real
- Mostre visualmente o **status atual** de cada veículo por macro apertada
- Dê painel operacional consolidado

**Status típicos que virão:**
- Em manutenção (macro do motorista OU vinculado à OS aberta)
- Chegada em cliente carregado
- Início descarga
- Fim descarga
- Viagem vazio (retornando ao pátio ou pra próxima carga)
- Almoço/refeição
- Abastecimento
- Outros que ela definir

## Why

Mudança de escopo importante — data ainda não definida. User disse
2026-07-21: *"mais para frente vou por macros, ai quero em tempo real,
quem está em manutenção, chegada cliente carregado, viagem vazio e etc"*.

Regra: **não implementar antes dela pedir explicitamente.** Ela está
me avisando pra planejamento, não pra codar agora.

## How to apply

**Quando ela pedir "agora":**
1. Confirmar quais macros foram configuradas na SASCAR
2. Confirmar formato dos eventos (SasIntegra provavelmente traz via
   `obterEventosMacros` ou similar — verificar SDK)
3. Alinhar quais status mostrar no painel
4. Onde renderizar (novo card no Dashboard? Sub-aba em Rastreamento?
   Nova aba dedicada?)
5. Refresh: polling (a cada X min) ou realtime (via cache atualizado
   como já é pras posições)

**Referências técnicas úteis:**
- `functions/src/sascar/soap.js` já tem `obterEventosTempoDirecao` — só
  eventos de jornada. Pra macros, provavelmente é outro endpoint SOAP.
- CTA Smart tem categoria separada; macros só valem pra frota rastreada
  SASCAR.
- Coleção sugestão: `sascar_macros` (armazenar histórico) + `sascar_status`
  (último status por veículo, sobrescreve).

**O que NÃO fazer agora:**
- Não sugerir/implementar essa feature em outros momentos
- Não confundir com posições SASCAR (que já existe)
- Não criar aba fantasma no menu

Ver também: [[reference-cta-smart-api]] · [[project-sascar-api-paginacao-antigo-primeiro]]
