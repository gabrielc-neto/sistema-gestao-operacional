---
name: project-sessao-2026-07-17-mudancas
description: "Sessão 17/07 — migração seletiva supabase, Dashboard novo, Login cards, mobile iOS restaurado, remoção Rotas/Locais (features canceladas)"
metadata: 
  node_type: memory
  type: project
  originSessionId: ec87d97d-a4d7-4509-9654-960896e86b66
---

## Resumo do dia (2026-07-17)

### Migrações da branch `feat/migracao-supabase` pro master

**Trazido:**
- Dashboard novo — KPIs tempo real (Frota total/Em movimento/Bloqueados/Sem comunicação) + Donut de frota + Gráfico evolução de custos + busca embutida no widget do mapa
- Login novo — 10 cards de sistemas Pontual (Gestão Operacional, Integridade, Service Desk, POPs, Projetos, Apresentações, Espaço, Compras, Externos, Intranet). Splash removida a pedido
- Módulo **Compras** (Compras.jsx 1023 linhas)
- Módulo **Intranet** (IntranetArea + ConfiguracoesIntranet + PropostaConvite)
- Componentes: MenuNavegacao (drawer lateral), ModuleHeader (só nos módulos supabase), ExportBar, GraficoEvolucaoCustos
- Cloud Function `intranetGate` no functions/index.js
- Nova identidade visual (index.css redesenhado)

**Preservado 100% intacto:**
- Manutencao.jsx (4764 linhas — todas as abas)
- Pneus.jsx + AbaInspecao esquemático (aprovado após ~20 iterações)
- AbaConjuntoVencimentos.jsx, AbaControleRotina.jsx, AbaEstoque.jsx
- dadosLavagemCalibragem.js, hooks/useOdometrosSascar.js
- SASCAR + CTA Smart integração

### Fixes técnicos

- **Bug menu vazando sobre mapa** — solução: JS aplica `filter: blur(4px) grayscale(0.4)` direto no `.leaflet-container` + `visibility: hidden` na `.mapa-legenda`. CSS backdrop-filter não funciona em Edge InPrivate. Ver [[feedback-menu-blur-mapa-fix]]
- **Bug FitBounds** — remoção de prop `key` reservada do React (era gerando warning)
- **Bug títulos de menu cortados** — hardcode "OPERAÇÃO"/"MONITORAMENTO"/"ADMINISTRAÇÃO" + `text-transform: none` (fonte tinha kerning ruim)
- **Backdrop drawer transparente demais** — de 50% pra 78% + blur 8px
- **iOS layout quebrado** — 14 media queries responsivas restauradas do backup (Pneus/Conjunto/Estepe/Cadastros) + 5 novas específicas do Dashboard mobile (título wrap, campo busca 100%, font-size 16px pra não fazer zoom)

### Correção de regra

- **Eixos LS: 3 (não 2)** — cavalo + carreta LS carregado = 6 eixos totais. Ver [[project-pontual-eixos-ls-6-corrigido]] (SUPERSEDE [[project-frota-pontual-eixos]])

### Removido (feature cancelada)

Módulo **Rotas & Distâncias** + **Locais Favoritos** — user avaliou que as APIs grátis (Nominatim/Valhalla/OSRM) não calculam pedágio bem o suficiente. Aguardando API paga melhor (Google Maps/HERE/MapBox). Removidos 12 arquivos: pages, services (pedagios/cpk/geocoding/violacaoRota/locais/anpPrecos/openMeteo), data (pedagios-antt/locais-fixos), components (BuscaEndereco).

Preservado `utils/roteamento.js` (usado pelo MapaFrota pra desenhar rota veículo→destino OC).

### 4 hooks Stop novos ficam registrando tudo automaticamente

- `salvar-conversa-realtime.mjs` — exporta conversa em `docs/conversas-claude/*.md`
- `auto-sessao-log.mjs` — bloco resumido em `docs/sessoes/YYYY-MM-DD.md`
- `auto-memoria-sync.mjs` — sync `.claude/.../memory/` → `docs/memoria/`
- `salvar-prompt-user.mjs` (UserPromptSubmit) — cada mensagem em `docs/prompts-user/`

Ver também: [[feedback-branch-supabase-nao-merge-tudo]] · [[feedback-nao-aplicar-moduleheader-telas-antigas]] · [[feedback-menu-blur-mapa-fix]] · [[project-migracao-laravel-hostinger]]
