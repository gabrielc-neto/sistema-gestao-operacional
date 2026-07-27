---
name: feedback-so-mudar-o-que-user-pediu
description: "REGRA ABSOLUTA: mudar SOMENTE o que a user pediu, nada além. Zero refactor por conta própria, zero melhorias silenciosas, zero limpezas colaterais mesmo se o código próximo estiver 'ruim'. User (Rosilda) explicitou 2026-07-21 após várias mudanças extras não pedidas."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2026-07-21-limite-escopo
---

## Regra

**Editar SOMENTE o que a user pediu no prompt atual. Nada mais.**

Proibido, mesmo se parecer "melhoria óbvia":
- Trocar emoji `✕` por `<Trash2/>` quando o pedido é outro
- Adicionar hints coloridos além da lógica pedida
- Refatorar variáveis próximas
- Corrigir warnings/console.log fora do escopo
- Reorganizar imports não relacionados
- Ajustar espaçamento/estilo em elementos vizinhos
- "Aproveitar a visita" pra melhorar código adjacente
- Aplicar convenção do sistema (mesmo emoji-free, mesmo Lucide) em código legado que não faz parte da tarefa

Permitido:
- Bug fix ESTRITAMENTE necessário pro pedido funcionar
- Import de biblioteca nova SE a tarefa exige (ex: user pede feature X que precisa lib Y)
- Salvar memória sobre a decisão da user

Se ver algo "ruim" próximo → **APONTAR pra user** em texto, não corrigir sozinho:
> "notei que X também está assim — quer que eu ajuste em outro passo?"

## Why

Rosilda 2026-07-21 disse: *"pedi para arrumar uma coisa e vai la e muda outra"* → *"então, so mude o que eu mandar, nada alem disso"*.

Padrão dela: pede feature específica → recebe feature + "melhorias" não pedidas → precisa gastar tempo entendendo o que mudou → perde confiança no diff.

**Custo do escopo violado:** confusão + retrabalho + perda de confiança no que foi mudado.
**Benefício percebido de "aproveitar":** zero (ela não pediu).

## How to apply

**Ao editar código:**
1. Ler o pedido literal
2. Fazer ESSE ajuste específico
3. Parar. Commit.
4. Se ver algo mais que "podia melhorar", **listar em texto** pra ela decidir

**Ao revisar diff antes de commitar:**
- Todo hunk deve mapear pra um pedido explícito
- Se tem hunk sem pedido correspondente → reverter aquele hunk

**Ao criar componente novo:**
- Fazer o mínimo que responde o pedido, não overengineering (props opcionais, styling extra, features "úteis em tese")

**Ao remover algo:**
- Remove SÓ isso. Não aproveita pra reorganizar arquivos vizinhos.

Ver também: [[feedback-sugerir-direto-quando-opiniao-formada]] · [[feedback-jamais-emoji-sempre-icones]]
