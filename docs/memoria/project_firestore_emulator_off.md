---
name: project-firestore-emulator-off
description: Firestore emulator local NÃO deve subir no setup dev — causa dessincronia com Cloud onde frontend escreve. Functions emulator usa service account pra ler Cloud direto.
metadata: 
  node_type: memory
  type: project
  originSessionId: be23c403-cf7a-4d17-a039-3fa116394f9b
---

**Bug crítico resolvido em 2026-06-10:**

No setup dev local da Pontual, o frontend (`db` em `frontend/src/firebase/config.js`) SEMPRE aponta pro Cloud Firestore — ele NUNCA conectou no Firestore emulator. Mas o `iniciar-sistema.bat` original subia `firebase emulators:start --only functions,firestore,auth`, o que fazia Functions emulator conversar com **Firestore emulator local (vazio)** em vez do Cloud.

Resultado: motorista marcado como "desligado" gravava no Cloud `motoristas_desligados` (29 docs), mas Function emulator filtrava lendo Firestore emulator vazio → desligado nunca saía da lista "Não iniciaram".

Sintoma típico: aba "Não iniciaram jornada" mostrava 34+ nomes em vez de 6, e botão "Desligado" não tinha efeito.

**Solução implementada (iniciar-sistema.bat):**
- Trocou `--only functions,firestore,auth` por `--only functions`
- Adicionou `set GOOGLE_APPLICATION_CREDENTIALS=%~dp0scripts\serviceAccountKey.json` antes do `firebase emulators:start`
- Functions emulator agora usa service account pra falar com Cloud Firestore real

**Why:** auditoria estática (ESLint, padrões React) nunca pega bug de integração entre emuladores e cloud. Lição: smoke test de fluxo crítico (login → ação → verificação) é essencial.

**How to apply:**
- Nunca recolocar `firestore` ou `auth` no `--only` do iniciar-sistema.bat sem alinhar config.js do frontend
- Se for adicionar Firestore emulator algum dia, frontend precisa de `connectFirestoreEmulator` E todos os scripts (incluindo seeds) precisam apontar pro emulator também
- Watchdog `watchdog.bat` dispara `iniciar-sistema.bat` automaticamente — qualquer mudança no bat propaga em até 2 min
- Pra reiniciar serviços: matar PIDs (precisa UAC), watchdog religa em até 2 min ou disparar `iniciar-sistema.bat` manual

Memória relacionada: [[project_estado_atual]] — comandos pra subir Vite+Functions+Tunnel

---

## Relacionado por tema

- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
