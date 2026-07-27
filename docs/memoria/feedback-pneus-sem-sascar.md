---
name: feedback-pneus-sem-sascar
description: "No módulo Gestão de Pneus do logistica-ia, todos os campos de KM/odômetro são preenchidos manualmente — nunca puxar da API SASCAR"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 242b4137-de6d-41e3-b8e4-e2493565140b
---

Todos os campos de KM/odômetro dentro do módulo **Gestão de Pneus** (`/pneus`) devem ser **preenchidos manualmente** pelo responsável. Não implementar `useOdometrosSascar`, `resolverKmSascar` nem nenhum auto-preenchimento SASCAR nas seguintes situações:

- Odômetro na ficha de inspeção (cavalo + cada carreta atrelada)
- KM da instalação de pneu no veículo
- KM do rodízio de pneu entre posições
- KM da remoção/envio pra recapagem
- KM em qualquer movimentação do pneu

**Why:** User pediu explicitamente que a Gestão de Pneus opere com controle manual de KM. Ao contrário do módulo Manutenção (Abertura de OS e Lançamento de NF) onde ele aprovou auto-SASCAR + fallback carreta→cavalo, no módulo Pneus ele considera que a responsabilidade da leitura visual do odômetro pelo borracheiro é parte do procedimento e não deve ser automatizada.

**How to apply:** No React, campos de odômetro ficam apenas como `<input type="number">` livres. Zero hooks SASCAR importados nos componentes do módulo `/pneus`. Ao criar formulários novos dentro dessa área, começar com `defaultValue=""` e nunca com valor puxado de posição SASCAR do veículo/cavalo.

**Onde SASCAR CONTINUA valendo (não confundir):** módulo Manutenção — Abertura de OS e Lançamento de NF mantêm auto-preenchimento SASCAR + fallback carreta→cavalo aprovado em `[[feedback-hodometro-sascar-carreta-cavalo]]` ou padrão similar já implementado.

Relacionado: [[project-logistica-ia-frontend]]
