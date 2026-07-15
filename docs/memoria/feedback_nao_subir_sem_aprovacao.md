---
name: ""
metadata: 
  node_type: memory
  originSessionId: 2b318981-841e-428b-b054-c01fa87b1df5
---

Quando Wesley diz "não subir ainda" (ou variações: "não sobe", "ainda não publica", "só quando aprovar"):

- ❌ NÃO editar arquivos do projeto que o Vite pega (qualquer .jsx/.js/.css em `projetos/logistica-ia/frontend/src` ou `functions/src`)
  → O Vite HMR reflete na hora em `http://192.168.20.131:5173`, então edit no disco = mudança no sistema dele
- ❌ NÃO rodar `git commit`
- ❌ NÃO rodar `firebase deploy` / `deploy.bat` / qualquer publicação
- ✅ PODE mandar plano em texto (chat)
- ✅ PODE inspecionar código (Read, Grep, Glob)
- ✅ PODE mexer em arquivos FORA do projeto que ele aprovou pelo nome (ex: xlsx no Desktop quando ele pediu mudança nominal)
- ✅ PODE rodar smoke_test.py e outros checks sem efeito colateral

**Why:** Wesley quer validar o desenho/escopo ANTES de qualquer linha de código entrar no sistema dele — mesmo local. Se quebrar local, ele perde tempo recarregando; se commitar/deployar, vira problema real. Regra refinada em 2026-06-05 no desenho do módulo Programação de Carga: ele disse explicitamente "só quando aprovar que pode por no sistema http://192.168.20.131:5173/dashboard".

**How to apply:** Em features novas/grandes, fluxo certo é:
1. Mandar plano em texto (bullets, sem código)
2. Esperar Wesley dizer "OK, faz" ou "muda X"
3. Aí sim editar arquivos
4. Mostrar o que mudou, esperar ele dizer "ok, commita" / "ok, sobe"
5. Só então git commit / firebase deploy

Em fixes pequenos óbvios (ex: trocar texto de 1 botão que ele pediu pelo nome), pular passo 1-2. Em qualquer dúvida, perguntar antes de editar. Relacionado a [[project_producao_deploy_pausado]] (deploy global pausado por questão de cartão Blaze).

---

## Relacionado por tema

- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **planilha**: [[feedback_auto_skills]] · [[feedback_dados_reais]] · [[feedback_nao_inventar_colunas]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]]
