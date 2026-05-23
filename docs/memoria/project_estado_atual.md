---
name: project-estado-atual
description: "Estado atual do projeto Logística IA e como retomar trabalho após reboot do PC — comandos exatos, processos rodando, próximos passos"
metadata: 
  node_type: memory
  type: project
  originSessionId: bdcfcba3-82cf-4e31-b119-80741c712de4
---

Snapshot do projeto **Pontual Logística IA** em 2026-05-23.

**Why:** Wesley reinicia o PC com frequência e precisa retomar exatamente de onde parou — quais servidores subir, qual o estado de cada feature, o que estava sendo trabalhado.

**How to apply:** Ler este arquivo no início de cada sessão como primeiro passo. Atualizar AO TÉRMINO de mudanças significativas.

## 🔄 Como retomar após reiniciar o PC

Abrir 3 terminais (PowerShell, Git Bash ou Windows Terminal) — um pra cada serviço.

### Terminal 1 — Firebase Functions Emulator
```powershell
cd C:\Users\Logistica01\projetos\logistica-ia
firebase emulators:start --only functions --project pontual-logistica
```
Aguarde "All emulators ready". Mantém aberto.

### Terminal 2 — Vite dev server
```powershell
cd C:\Users\Logistica01\projetos\logistica-ia\frontend
npm run dev
```
Aguarde "ready in ... ms". Mantém aberto. URL local: http://localhost:5173

### Terminal 3 — Cloudflare Tunnel (opcional, só se quiser acesso de fora)
- Duplo clique em: `C:\Users\Logistica01\projetos\logistica-ia\scripts\iniciar-tunnel.bat`
- OU manual:
  ```powershell
  C:\Users\Logistica01\projetos\logistica-ia\scripts\bin\cloudflared.exe tunnel --url http://localhost:5173
  ```
- A URL `https://*.trycloudflare.com` que aparece **muda a cada vez** (versão gratuita Quick Tunnel)

## URLs de acesso

- **PC local**: http://localhost:5173/dashboard
- **Celular na rede da Pontual**: http://192.168.20.131:5173/dashboard (IP da estação dev)
- **De qualquer lugar** (quando tunnel ligado): URL impressa no terminal 3

## ✅ Features prontas (validadas)

- **Dashboard** com KPIs e cards de módulo
- **Frota** (38 cavalos cadastrados — SEF1H*, SES9I*, SFL4G*, BBE9*, AKD*, TBX*)
- **Motoristas** com vencimentos CNH/MOPP/NR-20/NR-35
- **Atrelamento** + **OC** + **Manutenção** (com aba nova "Ordens de Serviço")
- **Férias** com alerta eSocial 60d
- **Histórico**, **Permissões**, **Usuários**, **Setores**, **Cargos**
- **🆕 Rastreamento** (`/rastreamento`):
  - Mapa Leaflet + camada satélite Esri
  - 38 caminhões com posição real SASCAR (polling 30s, cache 30s)
  - Marker SVG rotacionado pela direção, placa + nome motorista logado visíveis
  - Pulso verde em movimento, esmaecido se sinal velho (>15min) ou cinza (>1h)
  - Status: EM_MOVIMENTO / PARADO_LIGADO / ESTACIONADO / SEM_DADOS
  - **NÃO usa campo `bloqueio` da SASCAR** (era enganoso — reflete saída elétrica padrão, não comando)
  - Popup completo + OC ativa (últimas 48h) + botões Street View / Google Maps
  - Busca por placa/cidade/motorista
  - KPIs clicáveis filtram (Em movimento / Parados / Estacionados / Sem comunicação)
  - Persistência em `sascar_posicoes/{idVeiculo}` (Firestore) — veículo não some mais
  - Acesso pela rede + celular funcionando
- **🆕 Cercas Eletrônicas** (`/cercas`) — editor visual com busca de endereço (Nominatim), polígono livre, área calculada, satélite, auto-fit. **Wesley achou a UX ruim — quer refazer estilo SASCAR (círculo: centro+raio).** Pendente.
- **🆕 Aba "Ordens de Serviço"** na Manutenção — número auto OS-NNNNN, data/hora auto, tipo (dropdown), placa manual, motorista (dropdown), obs
- **🆕 Botão "Baixar PDF"** na OC usando html2pdf.js
- **🆕 Cloudflare Tunnel** instalado em `scripts/bin/cloudflared.exe`
- **🆕 Responsivo mobile/tablet/desktop** (commit d10234b, 2026-05-18) — utility classes em index.css (`.grid-form-2/3/4`, `.modal-mobile-sheet`, `.layout-sidebar`, `.table-wrap`) sobrescrevem inline styles. 11 páginas tocadas. Ver [[project-responsivo-mobile]]
- **🆕 Animação suave de marker no Rastreamento** (commit fa5c37d, 2026-05-18) — `AnimatedTruckMarker` em `frontend/src/components/MapaFrota.jsx` interpola lat/lng via requestAnimationFrame + setLatLng (sem re-render React). Duração = distância Haversine / velocidade SASCAR, limite 1.5s-45s, teleport > 5km. CSS transition de 600ms removida (conflitava). Caminhões agora deslizam suave no ritmo real entre pacotes SASCAR.

## 🆕 Sessão 2026-05-19 manhã — mudanças aplicadas

1. **Regra 4h direção contínua** — alterado `LIMITES.direcaoContinuaMax` em `functions/src/sascar/jornada.js` de 5h30 (Lei 13.103) pra **4h** (regra interna Pontual, mais restritiva). Wesley confirmou. Teste rodado, infrações sendo detectadas corretamente. Ver [[project_jornada_motorista_plano]].
2. **Ordem alfabética por nome** na /jornada — `calcularJornadas` e `agregarJornadasPorMotorista` agora ordenam por `nomeMotorista.localeCompare('pt-BR')`. Tabela vai de ADAM a WEBERSON.
3. **Novo card "Horas extras (total)"** em `frontend/src/pages/Jornada.jsx` — soma extra50+extra100 do dia ou do período, com sub-texto mostrando cada faixa. Card "Motoristas com extras" continua mostrando contagem.
4. **Descoberta: SASCAR retenção curta** — `obterEventosTempoDirecao` só retorna últimos ~3-4 dias. Períodos antigos voltam vazios. Não é bug do código. Ver [[project_sascar_retencao_eventos]].
5. **Plano 3 fontes consolidado** — Tablet SasMDT + GPS SASCAR + VDO. Documentação completa em [[project_jornada_3fontes_plano]] com 5 telas por persona, cenários reais, regras de ouro.
6. **Pedido API VDO Fleet** — texto pronto pra Wesley mandar pro suporte Continental. Portal https://fleet.vdo-web.com/#!/filestorage. Ver [[project_vdo_api_solicitacao]].
7. **VDO ≠ SASCAR** — feedback registrado: são fornecedores diferentes, contratos separados. [[feedback_vdo_nao_sascar]]
8. **Sólides é só ADM** — feedback registrado: motorista é SASCAR (tablet+GPS+VDO), não Sólides. [[feedback_solides_so_adm]]

## 🆕 Sessão 2026-05-19 tarde — mudanças aplicadas

9. **CORREÇÃO CRÍTICA: SASCAR retorna em BRT, não UTC** — `obterEventosTempoDirecao` retorna em horário local Brasília. Wesley validou olhando o login real do ADAM (07:05:07). Reversões em `Jornada.jsx`, `exportJornadaCsv.js`, `exportJornadaPdf.js`. Janela do request mudou pra `00:00:00 → 23:59:59` BRT direto. Ver [[reference_sascar_api]].
10. **Pausa informal (Dirigindo→Jornada→Dirigindo) reseta direção contínua** — qualquer pausa entre direção, mesmo 5min, reseta o contador. Wesley validou no caso do ADAM. Resultado: 6 → 4 infrações reais.
11. **Status "Em andamento" na coluna Fim** — badge amarelo quando último evento ≠ "Encerrar". Campo backend: `encerrouJornada` + `ultimoEventoTipo`.
12. **KPI "Encerraram jornada" + "Não encerraram jornada"** — 2 cards clicáveis mutuamente exclusivos. 1 encerrou, 29 em andamento (problema cultural).
13. **Threshold direção contínua 4h aplicado em 3 lugares** — `Jornada.jsx`, `exportJornadaPdf.js`, rodapé legal do PDF.
14. **Pausas detalhadas no retorno** — campo `pausasDetalhe[]` lista cada pausa informal.
15. **KPI "Sem 30min de pausa" + tooltip + cor** — coluna Pausa colorida (verde se ≥30min, vermelho com `−mm:ss` faltante se <30min). Tooltip explicativo. Campo backend: `pausaDiariaSuficiente`, `pausaFaltanteMin`, `pausaFaltante`.
16. **Auto-refresh tempo real** — cache do backend caiu de 5min → **30s** pra dia atual. Frontend faz polling a cada 60s (pausa quando aba oculta). Badge verde pulsante "AO VIVO" no canto.
17. **Scripts de debug e monitoramento** — `scripts/debug-motorista.mjs` (mostra eventos brutos de um motorista) e `scripts/monitorar-frota.mjs` (notifica em tempo real mudanças: pausa completada, jornada encerrada, nova infração).

## 🆕 Sessão 2026-05-20 — mudanças aplicadas (tudo commitado + pushed)

18. **Regra 100% só domingo** — corrigido: na semana TODO excedente de 9h30 é extra 50% (nunca 100%). Acima de 11h30 ainda gera infração EXTRA_EXCESSIVA, mas pago 50%. Bug: MARCOS aparecia com 03:57 de 100% numa terça. Commit `2d55104`.
19. **Coluna "Ciclos"** — motorista que encerra e reabre jornada (ex: HAROLDO manhã+tarde) mostra contador "2×" clicável que expande os ciclos individuais. Campos backend: `quantidadeJornadas`, `multiJornada`, `ciclos[]`. Commit `2d55104`.
20. **HE destacada** — células Extra 50%/100% com fundo colorido (laranja/vermelho) quando > 0.
21. **Separação PX (PJ) × Interno (CLT)** — Commit `5377761`:
    - Campo "Tipo: Interno/PX" no cadastro (`Motoristas.jsx`)
    - **Toggle Interno⇄PX direto na /jornada** (botão ao lado do ID), salvo por `idMotorista` SASCAR na coleção `motoristas_classificacao` (Firestore, permanente)
    - Regra PX: jornada até **13h**, **SEM horas extras**, mas **COM** pausa 30min + direção contínua 4h (lei)
    - Infração `JORNADA_PX_EXCEDIDA` se PX passa de 13h
    - Colunas Extra mostram "—" pros PX
    - `jornadaDia` lê classificação fora do cache (recalcula na hora)
    - `firestore.rules`: coleção `motoristas_classificacao` (deployada)
22. **Cards de infração** — "infração legal" → "infração". Card "Com infração" nunca verde (vermelho se tem, cinza se 0). Novo card verde "Sem infração". Commits `842da48`.
23. **Filtro no card "Motoristas com extras"** — clicável, filtra quem está em HE. Commit `e5be70c`.

**2 PX já marcados (20/05):** MARCOS ANTONIO DA SILVA (ID 3918030) e CELSO LUIZ PONTAROLO (ID 3922446). Resto da frota = interno (default).

**Descoberta:** SASCAR retorna em **BRT** (não UTC) — corrigido fuso em todo o módulo jornada. Ver [[reference_sascar_api]].

## 🆕 Sessão 2026-05-23 — performance + mobile

28. **Cache offline Firestore multi-tab** (commit `56aa8a2`) — `frontend/src/firebase/config.js` trocou `getFirestore(app)` por `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`. A partir da 2ª carga, **TODAS** as páginas que leem Firestore (Frota, Motoristas, Manutenção, OC, Férias, Cercas, Histórico, Usuários, Setores, Cargos, Permissões) abrem instantâneo do IndexedDB e sincronizam em background. Confirmado funcionando.
29. **Render parcial KPIs Dashboard** (commit `56aa8a2`) — `Dashboard.jsx` trocou `Promise.all` por 5 queries independentes. Cada KPI pinta assim que sua coleção volta; falha numa coleção não trava as outras. `kpi` inicial mudou de `null` pra `{}` — todos os checks `kpi?.foo` viraram `kpi.foo != null` / `kpi.foo == null ? null : ...` pra evitar `undefined` na UI durante carregamento parcial.
30. **Code-splitting já existia** — `App.jsx` linhas 1, 10-25, 65 (Suspense). Leaflet/Rastreamento/Cercas/Jornada só carregam quando abertos. Não foi necessário tocar.
31. **Fix mobile — scroll horizontal global** (commit `cd63464`) — `index.css`: `html, body, #root { overflow-x: hidden; max-width: 100vw }`. Barreira anti-overflow: mesmo se algum elemento interno estourar largura, página não rola lateralmente.
32. **Fix mobile — tabela de ciclos da Jornada** (commit `cd63464`) — `Jornada.jsx` linha ~633: tabela interna que abre quando clica em "2×" (multi-jornada) ganhou wrapper `<div style={{ overflowX: "auto" }}>` + `minWidth: 560` na table. Antes estourava o card.
33. **Fix mobile — popup do caminhão enxuto** (commit `cd63464`) — `MapaFrota.jsx` + `index.css`: 6 campos secundários (Direção, Ignição, GPS, Área, Odômetro, Bateria) marcados com prop `extra` que aplica className `popup-row-extra`. CSS `@media (max-width: 640px) { .leaflet-popup-content .popup-row-extra { display: none } }`. Popup também ganhou `max-width: 80vw` em mobile. Em desktop continua mostrando os 11 campos.

**Pegadinha do Vite v8.0.11**: nessa sessão precisei limpar `frontend/node_modules/.vite` manualmente — navegador acusava "Failed to fetch dynamically imported module: ...Rastreamento.jsx" mesmo com Vite servindo HTTP 200. Sintoma: tela branca. Resolução: matar Vite, `rm -rf node_modules/.vite`, reiniciar `npm run dev`. Pode reaparecer se mexer em deps do Firebase ou react-leaflet.

## Sessão 2026-05-21 — card "Não iniciaram jornada"

24. **Card "Não iniciaram jornada"** na /jornada (só vista diária) — cruza cadastro SASCAR (`obterMotoristas`, 67 motoristas) com quem gerou evento de tempo-direção no dia. Quem não bateu "Jornada" no tablet aparece. Card clicável roxo → modal com lista alfabética + ID + botão "Copiar lista". Uso: Wesley vê quem não iniciou e **lança a folga manual na SASCAR** (a folga lançada na SASCAR NÃO volta pela API SasIntegra — confirmado: nenhum método/campo de folga/escala).
    - Backend: `obterMotoristas` novo em `functions/src/sascar/soap.js`; `jornadaDia` (index.js) retorna `naoIniciaram[]` + `totalCadastro`. Roster cacheado 30min (cadastro muda raro). Filtra genéricos.
    - Frontend: `useJornada.js` expõe `naoIniciaram`/`totalCadastro`; `Jornada.jsx` card + modal.
    - Escala de folga é montada seg/ter e lançada na SASCAR (não no nosso sistema).
26. **Jornada × GPS** (commit pendente) — cada evento de tempo-direção já traz lat/lng/cidade/UF/rua (confirmado: 282 eventos/dia, 100% com GPS). `jornada.js` agora preserva `timeline[]` por motorista; `Jornada.jsx` tem botão "📍 Trajeto" (só vista diária) que expande tabela hora×evento×duração×local + link Google Maps por ponto. Helpers `corEvento`/`thTraj`. Resolve auditoria de HE (prova ONDE foi refeição/pausa). Não precisou tocar index.js (jornadaDia repassa direto).

25. **Marcar motorista desligado** (resolve a falta de flag "ativo" na SASCAR) — coleção Firestore `motoristas_desligados` (doc id = idMotorista). Botão "Desligado" vermelho em cada linha do modal → `setDoc` + confirm + refetch, some na hora. `jornadaDia` lê desligados FORA do cache (reflete imediato) e exclui do roster + do `totalCadastro`. Regra `motoristas_desligados` em firestore.rules (read: logado, write: isAtivo) — **deployada em produção 2026-05-21**. Reversível: apagar o doc. Cadastro SASCAR = 67 motoristas (todos tipo F, zero genéricos).

27. **Regras de direção contínua — REGRA FINAL** (Wesley 2026-05-21, após 3 revisões):
    - **Direção contínua só ZERA com intervalo REAL de descanso ≥30min** (sem dirigir). Paradas/pausas curtas (<30min) NÃO zeram — o contador MANTÉM somando. Objetivo: pegar quem dirige >4h só com paradinhas curtas. Mecânica em `jornada.js`: `paradoAcum` soma tempo não-dirigindo desde a última direção; ao chegar a 30min, zera `direcaoContinua`. Driving resume → paradoAcum=0.
    - **PAUSA INFORMAL REMOVIDA** (Dirigindo→Jornada→Dirigindo não é mais deduzido). Só evento "Pausa" formal conta como pausa. SUPERA item 10 (ADAM).
    - **2 métricas distintas na tabela /jornada:** coluna **"Dirigindo"** = total dirigido no dia (soma, nunca zera); coluna **"Dir. contínua"** = maior trecho sem intervalo de 30min. Ex MARCIO: Dirigindo 9h17, Dir.contínua 8h00 (pausa de 15min não zerou).
    - Histórico das revisões (NÃO reverter sem perguntar): v1 só ≥30min zerava → v2 qualquer pausa zerava → v3 Parada/Esperar tb → **v4 (atual) volta pra só ≥30min, mas via paradoAcum (soma paradas curtas consecutivas)**. Removidos campos `pausasInformais`/`pausasDetalhe`.
    - Impacto hoje: 35 motoristas, 10 com infração, 8 com dir.contínua >4h. MARCIO=4h46 (pausa formal 15min, não mudou). ROGERIO SILVA=5h18 / LUCIO SCHUARTZ=4h40 (pausa 00:00, nunca bateram Pausa).
    - ⚠ "Parada"/"Esperar" continuam NÃO resetando — pendente decisão. **pausaDiariaSuficiente (30min) é cálculo separado, intacto.**

## ⏳ Aguardando decisão do Wesley

- ✅ **Parada/Esperar resetam direção contínua** — DECIDIDO E FEITO (commit 333640f). Agora Parada, Esperar, Pausa, Refeição e Encerrar todos resetam. Só "Dirigindo" acumula. Impacto: infrações 10→9.
- **⚠ SEGURANÇA — senhas master vazadas (PENDENTE: Wesley trocar):** `scripts/seed_masters.py` tinha 2 senhas em texto puro: Wesley (`silvasampaiowesley03@gmail.com`) + Gabriel (`gabrielneto327@gmail.com`), ambos master. Estava versionado e pushado no GitHub (repo privado `gabrielc-neto/sistema-gestao-operacional`).
  - ✅ FEITO: senhas removidas do código (lê de `MASTERS_JSON` env), commit `68d4f06` pushado. Código futuro limpo.
  - ❌ FALTA (Wesley faz no Firebase Console → Authentication → Users → Redefinir senha): **ROTACIONAR as 2 senhas**. Até trocar, as senhas continuam VÁLIDAS no histórico do Git (introduzidas em `9306d08`) — qualquer um com acesso ao repo (Gabriel) entra como Wesley/Gabriel.
  - Wesley OPTOU POR NÃO limpar o histórico (force-push quebraria clone do Gabriel; num repo privado com senha rotacionada não compensa). Decisão consciente. **O que falta é só a troca de senha.**

**Commits 2026-05-21 já no origin/master** (8e0e8dc..e2ad190): card não-iniciaram+desligado, trajeto GPS, modal não-encerrou, filtro sem-infração, regras de pausa, fix copiar http. Tudo testado (backend com dados reais + frontend via Playwright).

## 🚧 Em aberto — próxima sessão

### Pendências
- Wesley marcar os demais PX (só 2 de N marcados até agora) — é só clicar no toggle na /jornada
- Cruzar /jornada com GPS (mostrar onde cada parada aconteceu) — não iniciado
- Mostrar pausas detalhadas na UI (hoje só no JSON)
- Cercas estilo SASCAR (circular)
- Mandar texto pro suporte VDO ([[project_vdo_api_solicitacao]])

### Onde parou (fim do 19/05 tarde)
/jornada rodando 100% live:
- 30 motoristas no dia, em ordem alfabética
- Auto-refresh 60s, badge "AO VIVO"
- 4 motoristas faltando completar 30min de pausa (ADAM, CELSO, CLEVERSON, MAURO)
- 4 com infração real (CLAUDINOR, MARCOS, ISMAXON, VANDERSON)
- 2 encerraram jornada (HAROLDO, ELIZANDRO)
- Monitor de frota detectou ELIZANDRO encerrando em tempo real

### Próximas escolhas que Wesley precisa fazer
1. **Cruzar /jornada com GPS** (3-4h, sem dependência) — começou mas pausou pra fazer pausa de 30min. Retomar.
2. **Mostrar pausas detalhadas na UI** — hoje só vai no JSON. Pode ser tooltip ao expandir motorista.
3. **Adicionar pergunta de retenção SASCAR** na lista do suporte ([[project_sascar_ibutton_diagnostico]]).
4. **Cercas estilo SASCAR** (cerca circular) — pendência anterior.
5. **Mandar texto pro suporte VDO** pedindo API ([[project_vdo_api_solicitacao]]).

### Imediato (já pendente da sessão anterior)
1. **Refazer página `/cercas` estilo SASCAR**: cerca CIRCULAR como padrão (centro + raio em metros), polígono opcional. Wesley achou o editor atual "ruim demais". Comparou com SASCAR/SASGC.
2. **Proxy Vite pro Functions** se ele pedir Rastreamento via Cloudflare Tunnel (hoje só Firestore funciona de fora — emulator Functions é local).

### Decidido mas adiado
- **Subir pra produção (Blaze)** — auditoria pré-deploy feita 2026-05-18, secrets untracked (commit `9f58a44`), pausado pelo Wesley em "só dá pra ativar pagando?". Blaze exige cartão linkado (free tier cobre uso = R$ 0 real). Ver [[project-producao-deploy-pausado]] pra sequência exata de retomada.
- **Bloqueio remoto pela UI** — SASCAR usa API XML-RPC SEPARADA pra comandos (não SOAP/SasIntegra). Não temos doc. Adiar até ter doc do serviço de comandos. Wesley optou por PULAR essa feature por enquanto.

### Roadmap aprovado (ordem de impacto)
1. **OC completa** — adicionar status (emitida/carregando/trânsito/entregue), cliente vinculado, valor frete (~4h)
2. **Cadastro de clientes + rotas** — base pra portal cliente e faturamento (~3h)
3. **Histórico de trajeto no mapa** — subcoleção `sascar_posicoes/{id}/historico/{idPacote}`, linha colorida 24h (~2h)
4. **Romaneio por compartimento** — 4-7 tanques, lacre, compatibilidade gasolina/diesel/etanol (~4h)
5. **PDF Ficha de Emergência + Envelope (NBR 7503)** — obrigação legal (~3h)
6. **Custo por viagem + Faturamento + margem** (~8h)
7. **Score motorista** via campos SASCAR (~4h)
8. **App PWA motorista** — confirma entrega, foto (~12h)
9. **Portal cliente público** — Blaze obrigatório (~6h)
10. **WhatsApp/Email automático** — Z-API + SendGrid, Blaze obrigatório (~4h)

## 📁 Estrutura crítica de arquivos

```
C:\Users\Logistica01\projetos\logistica-ia\
├── frontend/                       (React + Vite)
│   ├── .env.local                  ← VITE_USE_FUNCTIONS_EMULATOR=true
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Rastreamento.jsx   ← novo (mapa)
│   │   │   ├── Cercas.jsx         ← novo (REFAZER estilo SASCAR)
│   │   │   ├── Manutencao.jsx     ← com aba OS adicionada
│   │   │   └── OC.jsx             ← com botão PDF
│   │   ├── components/
│   │   │   ├── MapaFrota.jsx      ← novo
│   │   │   └── CercaEletronica.jsx ← novo
│   │   ├── hooks/
│   │   │   ├── useSascarPosicoes.js ← novo
│   │   │   ├── useCercas.js        ← novo
│   │   │   └── useOcsAtivas.js     ← novo
│   │   └── firebase/config.js     ← exporta `functions`, detecta emulator
│   └── package.json
├── functions/                      (Cloud Functions v2 - Node 22)
│   ├── index.js                   ← sascarVeiculos, sascarPosicoes
│   ├── .secret.local              ← credenciais SASCAR (gitignored)
│   └── src/sascar/
│       ├── soap.js                ← cliente SOAP
│       └── cache.js               ← TTL 30s/1h
├── docs/
│   ├── 09-rastreamento.md         ← novo
│   ├── 10-sascar-integracao.md    ← novo
│   ├── sascar/                    ← PDF API oficial + texto extraído
│   └── conversas/                 ← backups de sessões (.jsonl)
├── scripts/
│   ├── bin/cloudflared.exe        ← túnel
│   ├── iniciar-tunnel.bat         ← duplo clique inicia túnel
│   ├── liberar-firewall-dev.bat   ← rodar 1x como admin
│   ├── test-sascar-*.mjs          ← scripts de teste isolados
│   └── serviceAccountKey.json     ← credenciais Firebase Admin (gitignored)
├── .env                           ← SASCAR_USUARIO + SASCAR_SENHA
├── firebase.json                  ← emulators host 0.0.0.0
└── firestore.rules                ← rules deployadas em 2026-05-14
```

## 🔐 Credenciais críticas (não compartilhar)

- **SASCAR**: usuário `PONTUALPONTUAL` — em `.env` e `functions/.secret.local`
- **Firebase Admin SDK**: `scripts/serviceAccountKey.json`
- **Firebase CLI** logado como: `logistica01pontualpetroleo@gmail.com`
- **Email super admin**: `silvasampaiowesley03@gmail.com` (Wesley)

## 🗄 Firestore — coleções ativas

Lista atualizada em [[reference-sascar-api]] e [[project-rastreamento-sascar-fase2]]:
- `usuarios`, `setores`, `cargos`, `permissoes_catalogo` (RBAC)
- `veiculos`, `motoristas`, `atrelamentos`, `ordens_carregamento`, `manutencoes`, `ferias`
- `sascar_posicoes` (live polling 30s, 38 docs)
- `cercas_eletronicas` (editor visual)
- `ordens_servico` (OS Manutenção)
- `historico` (auditoria)

## 💰 Custos esperados em produção

- Blaze cobre: ~R$ 60/mês básico
- Completo (com WhatsApp via Z-API + e-mails): ~R$ 170/mês
- Comparação: Cobli/Buonny SaaS = R$ 3.000-4.000/mês

Ver [[project-rastreamento-sascar-fase2]] seção "Custos esperados".
