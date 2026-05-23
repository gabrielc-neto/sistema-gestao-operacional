---
name: Frota Pontual — HTML App de Controle de Frota
description: App HTML single-file completo para controle de frota da PONTUAL LOGÍSTICA, salvo em C:\Users\Logistica01\Desktop\frota_pontual.html
type: project
originSessionId: 808a9bc5-a1ad-42c2-a59f-996e2732e531
---
App HTML standalone (sem servidor) para controle de frota da distribuidora de combustíveis PONTUAL LOGÍSTICA.

**Why:** Substitui planilha Excel, facilita geração de OC (Ordem de Carregamento) e rastreamento de atrelamentos.

**How to apply:** Qualquer pedido de ajuste na frota ou OC — ler o arquivo antes de editar: `C:\Users\Logistica01\Desktop\frota_pontual.html`

## Arquivo
- Caminho: `C:\Users\Logistica01\Desktop\frota_pontual.html`
- ~302KB, single-file HTML+CSS+JS com logo embutida em base64
- Dados persistidos em `localStorage` (prefixo `pt_`)

## Identidade visual (aprovada)
- Logo: `C:\Users\Logistica01\Downloads\Logo Pontual 2.png` — embutida como PNG transparente 600px
- Tema: fundo branco, header branco com sombra leve, tabs brancas com underline azul marinho
- Cores: `--primary:#1a3a5c` (azul marinho), `--accent:#f5c318` (amarelo Pontual)
- Botões primários: fundo amarelo `#f5c318`, texto azul marinho `#1a3a5c`

## Fonte dos dados originais
- `C:\Users\Logistica01\Downloads\PLANILHA FROTA ATUALIZADA.xlsx` — dados reais de cavalo, carreta, motorista
- `C:\Users\Logistica01\Downloads\pontual_frota.db` — SQLite com motoristas (tabela jornada)

## Estrutura do app (4 abas)
1. **🚛 Frota** — cards de todos os 38 veículos; busca global por placa/motorista/carreta; editar/novo/CSV
2. **🔗 Atrelamento** — histórico de atrelamento/desatrelamento/substituição com filtros, stats, modal de registro, CSV
3. **📋 Nova OC** — formulário de Ordem de Carregamento; auto-preenche motorista/carretas ao selecionar cavalo; múltiplas entregas por OC (cliente/produto/volume/req por entrega); base padrão = PONTUAL
4. **📜 Histórico OC** — lista todas OCs salvas; reimprimir; exportar CSV (uma linha por entrega)

## OC — detalhes importantes
- Base padrão: PONTUAL (empresa vende e armazena combustível próprio)
- Entregas: lista dinâmica, múltiplos clientes por OC (motoristas fazem várias entregas)
- Campo "Nº Requisição" mantido por entrega
- Impressão: tabela de entregas com total em litros
- Export CSV: expande cada entrega em linha separada

## Dados principais (38 caminhões — state: DEFAULT_TRUCKS)
- Modelos: Volvo FH 460, M.Benz Actros 2548S/2653S, M.Benz AXOR 2544S/2536S, DAF XF105
- Tipos carreta: Simples, Bitrem, Rodotrem, 4° Eixo
- PX = Prestador Externo (AKD-5988 e AKD-5A88)
- TBX-5H14 = FABIO ANTONIO MALACOSKI | TBX-5H17 = ELIZANDRO DE OLIVEIRA
- SEF-1H24, SEF-1H25 = ARLA 32 | BBE-9594 = UREIA

## State JS
```js
let trucks     = JSON.parse(localStorage.getItem('pt_trucks')||'null') || DEFAULT_TRUCKS;
let ocs        = JSON.parse(localStorage.getItem('pt_ocs')   ||'[]');
let atrs       = JSON.parse(localStorage.getItem('pt_atrs')  ||'[]');
let ocN        = parseInt(localStorage.getItem('pt_ocn') ||'1');
let atrN       = parseInt(localStorage.getItem('pt_atrn')||'1');
let ocEntregas = [{dest:'',prod:'',vol:'',req:''}]; // array dinâmico por OC
```

## Responsáveis na operação
- VANDERLEIA e LS (hardcoded nos selects de responsável)
- OC = Ordem de Carregamento | ATR = registro de Atrelamento
