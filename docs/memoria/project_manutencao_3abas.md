---
name: manutencao-3abas
description: Modulo Manutencao tem 3 abas separadas — Abertura de OS / Lancamento de OS (conclusao) / Lancamento de NF (financeiro). Fluxo segue planilha real Pontual.
metadata: 
  node_type: memory
  type: project
  originSessionId: 2899166c-546d-4ca0-ad27-bfa83d8cb768
---

Em 2026-06-03 o modulo Manutencao foi reorganizado em **3 abas distintas** que seguem o controle real da Pontual (planilhas `manutencao_completa_pontual.xlsx` aba OS + `Controle_NF_de_Frota_2026_updated.xlsx`):

| Aba | Quando usa | Bloqueia veiculo? | Campos |
|-----|------------|-------------------|--------|
| **Abertura de OS** | Caminhao entra na oficina | Sim | Tipo manut, Placa, Motorista, KM entrada, Obs |
| **Lancamento de OS** | Caminhao pronto, fechar OS | Libera | KM saida, Mecanico, Oficina, Servico executado |
| **Lancamento de NF** | NF do fornecedor chega | Nao | Valor, Fornecedor, Centro custo, Classificacao, NFE (financeiro) |

**Why:** O codigo original misturava abertura+conclusao+custo em uma so aba "Lancamento de OS" — Wesley disse que era conceitualmente errado. Custo so fecha quando NF chega (pode ser dias depois). Operacionalmente sao 3 momentos distintos com responsaveis distintos.

**How to apply:**
- Botão "Finalizar" rapido foi REMOVIDO da aba Abertura. Unico jeito de finalizar OS é pela aba "Lançamento de OS" → botão "Concluir" abre modal pedindo KM saida + mecanico + oficina + servico executado. Força registro completo.
- Schema OS no Firestore (`ordens_servico`) ganhou campos opcionais: `kmSaida`, `mecanico`, `oficina`, `servicoExecutado`, `finalizadaEm`, `finalizadaPor`. Preenchidos so na conclusao.
- A colecao `lancamentos` (renomeada conceitualmente pra NF) NAO foi migrada — codigo segue gravando em `lancamentos`. Refactor de collection name fica pra outro dia.
- Commits: `858a0e0` (renomeacao abas), `e226426` (estrutura 3 abas + conclusao com modal). Validados via Playwright criando OS de teste.
- INCIDENTE relacionado: [[manutencao-arquivo-zerado-incidente]] — o arquivo Manutencao.jsx ficou zerado de 01-jun a 03-jun ate o smoke test do Playwright detectar.

---

## Relacionado por tema

- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **planilha**: [[feedback_auto_skills]] · [[feedback_dados_reais]] · [[feedback_nao_inventar_colunas]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
