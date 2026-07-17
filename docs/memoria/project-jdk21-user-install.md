---
name: project-jdk21-user-install
description: JDK 21 instalado em user-level no projeto logistica-ia para Firebase emulators
metadata: 
  node_type: memory
  type: project
  originSessionId: 625be965-04d1-4c15-9e20-ef898e2ff626
---

JDK 21 instalado em `C:\Users\Logistica01\jdk21\jdk-21.0.11+10` (user-level, sem admin) em 2026-06-29 pra destravar Firebase emulators no projeto [[project-logistica-ia-frontend]]. Bat de boot: `C:\Users\Logistica01\projetos\logistica-ia\start-emulators-jdk21.bat`.

**Why:** firebase-tools deixou de suportar Java <21. Máquina só tinha JRE 1.8 (Oracle), e Program Files exige admin que esta conta não tem.

**How to apply:** Pra subir emuladores neste projeto, rodar `start-emulators-jdk21.bat` (já seta JAVA_HOME local). O `iniciar-sistema.bat` original aponta pra path Microsoft que não existe — está quebrado, considerar atualizar pro path user-level.
