---
name: project-sascar-cercas-api-bloqueada
description: "Cercas via API SASCAR (obterPontosReferencia) está BLOQUEADA pro usuário PONTUALPONTUAL — pedido de liberação pendente pro suporte. Wesley quer cerca via SASCAR, não no nosso editor."
metadata: 
  node_type: memory
  type: project
  originSessionId: 046be443-e9c3-4c9d-aad5-51f750abbc8c
---

Wesley decidiu (2026-05-21): **cerca eletrônica vai ser gerenciada na SASCAR**, não no nosso editor `/cercas`. O sistema só vai **ler** as cercas via API e mostrar no mapa. O editor `/cercas` antigo (que ele achou ruim) sai de cena.

**Why:** evita manter editor duplicado — cadastra uma vez na SASCAR, o sistema reflete.

**⛔ BLOQUEIO:** testei `obterPontosReferencia` ao vivo (2026-05-21) → SOAP Fault HTTP 500: **"Atencao: acesso nao permitido a esta operacao!"**. O usuário de integração `PONTUALPONTUAL` NÃO tem permissão pra essa operação. Não é bug — é liberação que a SASCAR controla no lado deles (mesma situação dos comandos/bloqueio remoto). Liberados pro usuário: obterVeiculos, obterMotoristas, obterEventosTempoDirecao, posições. Bloqueados: obterPontosReferencia, provavelmente obterRotas.

**How to apply:** antes de codar leitura de cercas, a SASCAR precisa liberar a operação. Texto pronto pro suporte:
> Solicito liberação das operações `obterPontosReferencia` e `obterRotas` no WebService SasIntegra para o usuário de integração PONTUALPONTUAL. Hoje retornam "acesso não permitido a esta operação". Os demais métodos já estão liberados para este usuário.

**Detalhes técnicos quando liberar (~2h de código):**
- `obterPontosReferencia(usuario, senha)` retorna List<PontoReferencia>: idPontoReferencia, codigo, descricao, nome, endereco, data, **latitudeS/longitudeS (canto superior) + latitudeI/longitudeI (canto inferior)** → é **RETÂNGULO** (2 cantos), NÃO círculo+raio. Desenhar como retângulo no mapa Leaflet (/rastreamento).
- Só vêm pontos marcados como **"embarcável"** no SASGC.
- Evento 658 (Ancora) = entrada/saída de cerca, se quiser eventos depois.

Junto dos outros bloqueios de suporte SASCAR: [[project_sascar_ibutton_diagnostico]] (iButton 6/66), [[project_sascar_retencao_eventos]] (retenção curta). Ver [[reference_sascar_api]].
