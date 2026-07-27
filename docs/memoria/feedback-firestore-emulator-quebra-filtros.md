---
name: firestore-emulator-quebra-filtros
description: Subir Firestore emulator junto com Functions emulator quebra qualquer Cloud Function que cruza dados com coleções em produção — Functions emulator roteia auto pro Firestore emulator (vazio) e filtros viram no-op
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a0e2f265-231e-486d-9bd6-06625c0f5ec7
---

Subir Firestore emulator (8080) junto com Functions emulator (5001) faz o Functions emulator detectar e rotear AUTO pro Firestore emulator local. Como o emulator está vazio, qualquer `db.collection(...).get()` retorna snapshot vazio — filtros que cruzam com coleções (ex: `motoristas_desligados`) viram no-op silencioso (catch engole).

**Sintoma observado em [[project-logistica-ia-frontend]]**: motoristas desligados há meses voltaram à aba "não iniciaram" da tela Jornada. `totalCadastro` ficou 71 (deveria 42).

**Why:** Firebase emulator suite força integração entre os serviços. Se Firestore emulator está rodando, Functions emulator sempre rota pra ele — não há flag pra "use functions emulator + firestore produção" no startup.

**How to apply:**
- Quando o frontend já usa Firestore produção (`config.js` sem `connectFirestoreEmulator`), **NÃO subir** Firestore emulator. Manter só functions+auth no `firebase emulators:start --only`.
- Caminho oposto (subir Firestore emulator) só vale com seed/import explícito de dados produção (`firebase emulators:export` → import).
- Para o projeto Pontual, `start-emulators-jdk21.bat` deve usar `--only functions,auth`.
