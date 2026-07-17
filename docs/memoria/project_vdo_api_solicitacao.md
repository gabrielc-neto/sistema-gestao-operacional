---
name: project-vdo-api-solicitacao
description: Pedido formal de API/integração pro suporte VDO Fleet (Continental). Texto pronto + 3 caminhos de integração + plano enquanto API não chega.
metadata: 
  node_type: memory
  type: project
  originSessionId: dad63364-1a18-4047-bcae-688259c317b0
---

# Solicitação de API VDO Fleet — pendente Wesley contatar suporte

Status: **Texto pronto. Aguardando Wesley enviar pro suporte VDO/parceiro Continental.** Criado 2026-05-19.

**Why:** Pra Fase 2 do plano de jornada (cruzamento com tacógrafo VDO), precisamos puxar `.DDD` do portal https://fleet.vdo-web.com/#!/filestorage. Manual via upload já funciona, mas API automática é melhor. Wesley precisa pedir/contratar a integração com a Continental.

**How to apply:** Wesley diz "vou pedir API VDO" → usar este arquivo pra montar o e-mail/contato. Quando retorno chegar, atualizar este arquivo com o que descobriu e revisar [[project_jornada_3fontes_plano]] Fase 2.

## Portal VDO Fleet
- URL: https://fleet.vdo-web.com/#!/filestorage
- Cliente: PONTUAL BRASIL PETRÓLEO LTDA (CNPJ 02.886.685/0001-40)
- Frota coberta: 38 cavalos com tacógrafo VDO DTCO

## Texto pronto pra enviar ao suporte

```
Assunto: Solicitação de API/Integração — VDO Fleet (filestorage)

Olá,

Somos a PONTUAL BRASIL PETRÓLEO LTDA (CNPJ 02.886.685/0001-40),
cliente VDO Fleet. Usamos hoje o portal https://fleet.vdo-web.com
pra baixar os arquivos .DDD da nossa frota de 38 cavalos.

Estamos desenvolvendo um TMS interno integrado com a SASCAR
(rastreamento) e queremos cruzar os dados do tacógrafo com a
jornada do motorista pra cálculo automático de horas extras
e detecção de infrações.

Precisamos saber:

1. A VDO Fleet disponibiliza API REST/SOAP pra:
   a) Listar arquivos .DDD novos por motorista/veículo/período?
   b) Baixar o conteúdo dos arquivos .DDD?
   c) Obter atividades parseadas (Direção/Pausa/Disponibilidade)
      direto em JSON, sem precisar parsear .DDD na nossa ponta?

2. Existe export agendado dos .DDD pra FTP / S3 / e-mail?
3. Existe webhook que avise quando novo .DDD chega no filestorage?
4. Qual é o nosso plano contratado hoje (Light / Standard /
   Professional)? A API/integração exige upgrade?
5. Qual o custo adicional pra ativar a integração?
6. Existe documentação técnica da API (Swagger / Postman)?
7. Tem ambiente de sandbox/staging pra desenvolvimento?
8. Como funciona autenticação — API key, OAuth, JWT?
9. Tem rate limit por requisição?
10. Tem cliente ativo no Brasil usando essa API pra referência?
```

## O que esperar no retorno

| Probabilidade | Item | Decisão |
|---|---|---|
| Alta | Contrato/aditivo de integração | Aceitar, mas pedir valor primeiro |
| Alta | Pagamento extra mensal (~R$ 200-500/mês — referência mercado) | Wesley avalia custo×benefício |
| Média | Reunião com integrador local | Aceitar, levar perguntas técnicas |
| Média | NDA antes da documentação | Aceitar (padrão Continental) |
| Baixa | Não ter API pra cliente | Cai pro Caminho 1 (upload manual) ou Caminho 2 (export FTP/email) |

## 3 caminhos de integração (resumo)

1. **Upload manual** — Wesley baixa .DDD no portal, sobe no TMS. **Sempre funciona, não depende da Continental.** Pode codar imediatamente (4-6h).
2. **Export agendado** — VDO Fleet manda .DDD pra FTP/email/pasta automaticamente. Script Node monitora. (+3h após cobertura por Caminho 1)
3. **API REST** — Cron diário chama API VDO Fleet, baixa .DDD novos. Requer contrato. (+6h após cobertura por Caminho 1)

**Estratégia:** Codar Caminho 1 enquanto API não chega. Quando chegar, troca o "como baixa", parser e cruzamento já estão prontos.

## Como retomar

Wesley retorna com info do suporte VDO → atualizar este arquivo com:
- Plano contratado
- Existe API? (sim/não)
- Custo extra
- Próximo passo (assinar aditivo, agendar reunião, ou seguir caminho 1)

E revisar [[project_jornada_3fontes_plano]] Fase 2 com o caminho escolhido.

Relacionado: [[project_jornada_3fontes_plano]], [[feedback_vdo_nao_sascar]], [[project_jornada_motorista_plano]]

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
