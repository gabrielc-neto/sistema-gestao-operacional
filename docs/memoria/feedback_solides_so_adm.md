---
name: feedback-solides-so-adm
description: Sólides é ponto SÓ pro pessoal ADM da Pontual. Motorista é controlado por SASCAR (tablet SasMDT + GPS + VDO). Não cruzar jornada de motorista com Sólides.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dad63364-1a18-4047-bcae-688259c317b0
---

Sólides só vale pra funcionário administrativo da Pontual. Motorista NÃO usa Sólides — controle de ponto/jornada do motorista é pelo SASCAR (tablet SasMDT + GPS + tacógrafo VDO).

**Why:** Wesley corrigiu em 2026-05-19. Memórias anteriores ([[project_logistica_rastreamento_levantamento]] Fase 3 e [[project_jornada_3fontes_plano]] Fase 4) mencionavam integração Sólides pra motorista — está errado. Sólides cobre só ADM.

**How to apply:**
- Ao desenhar features de jornada/ponto/HE de **motorista**, ignorar Sólides. Fontes são: tablet SasMDT (`obterEventosTempoDirecao`), GPS SASCAR (`obterPacotePosicoes`) e VDO (.DDD).
- Sólides volta a ser relevante SE/QUANDO Wesley pedir folha do pessoal ADM (escritório, financeiro, comercial).
- Em qualquer dúvida sobre "ponto desse funcionário" — primeiro perguntar se é motorista ou ADM antes de propor solução.

Relacionado: [[project_jornada_motorista_plano]], [[project_jornada_3fontes_plano]], [[project_logistica_rastreamento_levantamento]]
