---
name: feedback-nao-inventar-colunas
description: "Wesley pede planilha/cadastro com colunas X — entregar X, nunca X + Y + Z \"achando que ajuda\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 913c58eb-0a98-47dc-929a-56fdd089ef8b
---

Quando Wesley pede campos/colunas/formulario com lista especifica, entregar APENAS o que ele pediu. NAO adicionar campos "uteis" tipo telefone, marca/modelo, observacao, EAR, MOPP, eixos, capacidade, tipo, etc.

**Why:** Em 2026-06-05 fiz planilha de vencimento e inventei colunas: Marca/Modelo, Ano, Renavam, Motorista habitual, Telefone, Tipo, Capacidade, Eixos, EAR, MOPP, CPF, Categoria CNH, Funcao. Wesley reclamou: "não me inventa moda, não foi isso que te pedi". Ele pediu literalmente: Cavalo (placa, CIV, cronotacografo), Carreta (placa, CIV, CIPP, IPEM, agendamento IPEM), Motorista (nome, CNH). Ponto. Acrescentar campo "porque pode ser util" vira ruido — ele tem que apagar coluna ou conviver com lixo.

**How to apply:**
- Lista de colunas/campos pedida = contrato literal. Repetir igual no codigo, nada alem.
- Status calculado de vencimento ESTA OK adicionar quando ele pede "alerta" — e funcao do que foi pedido.
- Padrao visual (cores Pontual, header, formatacao condicional) ESTA OK aplicar mesmo sem pedir explicito — e padrao da casa, nao campo de dado.
- Se eu acho que falta algo importante: PERGUNTAR antes ("quer que eu adicione X?"), nao incluir e esperar reacao.
- Vale pra planilhas, cadastros, formularios, schemas Firestore, telas React, tabelas TMS.

Relacionado: [[feedback_falar_inviavel_cedo]] (perguntar antes em vez de tentar adivinhar).

---

## Relacionado por tema

- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **planilha**: [[feedback_auto_skills]] · [[feedback_dados_reais]] · [[feedback_nao_subir_sem_aprovacao]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]]
