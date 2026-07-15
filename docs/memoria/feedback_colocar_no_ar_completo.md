---
name: feedback-colocar-no-ar-completo
description: "Quando Wesley pedir \"colocar no ar\" ou \"subir o sistema\", fazer checklist completo sem precisar pedir cada item separado"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: de6bd5aa-02f3-4d4f-ad22-4600e0b4b7a3
---

Quando Wesley pedir "coloque no ar", "sobe o sistema", "está no ar?", "verifica se está rodando" — fazer checklist completo automático sem esperar pedido de cada item.

**Why:** Wesley não quer pedir cada verificação separada. Quer resposta completa de uma vez.

**How to apply:** Verificar TODOS os itens abaixo e reportar status de cada um:

## Checklist "Coloque no ar" — Pontual Logística

### 1. Portas de rede (netstat -an)
- `5173` → Vite dev server (frontend React)
- `5001` → Firebase Functions emulator
- `4000` → Firebase Emulator UI
- `9099` → Firestore emulator (NÃO deve estar ativo — só --only functions)

### 2. API SASCAR
- Testar conectividade: `curl https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl`
- HTTP 200 = online
- Executar `node scripts/test-sascar-posicoes.mjs` no diretório do projeto para confirmar dados reais

### 3. serviceAccountKey.json
- Verificar se existe em `scripts/serviceAccountKey.json`
- Sem ele, Functions emulator não acessa Firestore cloud

### 4. Emulador Firebase
- Deve rodar com `--only functions` (sem Firestore local)
- `GOOGLE_APPLICATION_CREDENTIALS` deve apontar para serviceAccountKey.json

### Formato de resposta esperado
Reportar cada item com ✅ OK / ❌ ERRO / ⚠️ ATENÇÃO + o que fazer se algo falhou.

### Se algo não estiver rodando
Subir com `iniciar-sistema.bat` em `C:/Users/Logistica01/projetos/logistica-ia/`

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **sascar**: [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]] · [[feedback_solides_so_adm]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_falar_inviavel_cedo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (feedback)

[[feedback-auto-commit-quando-pedido]] | [[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]]
