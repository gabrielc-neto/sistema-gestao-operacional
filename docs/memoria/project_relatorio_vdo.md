---
name: Relatórios VDO — Picos de Velocidade
description: Automação de picos de velocidade — caminhos, estrutura e regras da automação
type: project
originSessionId: c865e68b-6eb1-4697-afb5-a2728911b1d2
---
## Pasta central da automação (REDE)
`F:\Users\Logistica\LOGÍSTICA 2026\WESLEY\AUTOMAMACAO`

## Estrutura
```
AUTOMAMACAO\
  PICOS DE VELOCIDADE\
    Pontual_Picos_Velocidade.xlsx   ← banco de dados principal
    processados.json                ← controle de arquivos já processados
    PDFs\
      2026-03\   ← PDFs organizados por ano-mês
      2026-04\
  LOGS\
    relatorio-auto.log              ← log diário da automação
```

## Fluxo da automação
1. Wesley salva PDFs de picos no Downloads
2. Todo dia às 05:00 o script roda automaticamente
3. Detecta PDFs novos no Downloads
4. Identifica se é relatório VDO (valida o conteúdo)
5. Move o PDF do Downloads para AUTOMAMACAO\PICOS DE VELOCIDADE\PDFs\ANO-MES\
6. Extrai os dados e atualiza o Excel na rede
7. Downloads fica limpo — tudo vai para a rede

## Script principal
`C:\Users\Logistica01\Downloads\pedagio-work\auto-picos.js`

## Tarefa agendada Windows
Nome: `Pontual_AutoPicos` — roda todo dia às **05:00**

## Regras importantes
- A automação SÓ acessa a pasta AUTOMAMACAO na rede — nada fora dela
- PDFs de imagem (sem texto) são ignorados automaticamente — Wesley pode me passar manualmente
- Excel deve estar fechado às 05:00 para a automação salvar

**Why:** Wesley quer tudo organizado e centralizado na rede, com Downloads sempre limpo.
**How to apply:** Sempre que Wesley mencionar nova automação, ela vai para AUTOMAMACAO na rede. Nunca criar arquivos fora dessa pasta.

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **cta**: [[feedback-windows-file-watcher]] · [[project_estado_atual]] · [[project_levantamento_logistica]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **planilha**: [[feedback_auto_skills]] · [[feedback_dados_reais]] · [[feedback_nao_inventar_colunas]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
