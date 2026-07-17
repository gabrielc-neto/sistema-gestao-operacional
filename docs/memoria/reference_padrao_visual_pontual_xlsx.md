---
name: reference-padrao-visual-pontual-xlsx
description: Paleta visual Pontual oficial pra planilhas Excel — usar como base em qualquer xlsx novo
metadata: 
  node_type: memory
  type: reference
  originSessionId: 913c58eb-0a98-47dc-929a-56fdd089ef8b
---

Padrao visual oficial da Pontual pra planilhas xlsx, extraido de `Downloads\CONTROLE_DE_PNEUS_V5_atualizado_3.xlsx` (referencia aprovada por Wesley). Confirmado em 2026-06-05 na planilha Controle_Vencimentos_Frota.xlsx.

**Paleta:**
- Azul marinho primario: `#0B1D55` (title bar, headers principais)
- Azul marinho secundario: `#122580` (subtitle, headers alternados)
- Amarelo Pontual: `#F5C800` (logo, totais, destaque, data HOJE)
- Zebra: `#EBF0FF` (linha par) / `#FFFFFF` (linha impar)
- Subtitulo: `#D5DAE8` (texto sobre azul)
- Texto body: `#0B1D55` bold (sobre zebra)
- Bordas: `#D5DAE8` finas

**Status / cores acessorias:**
- Verde sucesso/OK: `#1E8449`
- Vermelho vencido/saida: `#C0392B`  (bg claro `#FFF5F5`)
- Laranja alerta/IPEM: `#E67E22`     (bg claro `#FFF8E1`)

**Tipografia:**
- Fonte: **Arial** (NAO Calibri)
- Titulo principal: Arial 20 bold amarelo `#F5C800`
- Subtitulo: Arial 10 italic `#D5DAE8`
- Header tabela: Arial 10 bold branco (ou azul `#0B1D55` se header amarelo)
- Body: Arial 10 bold azul `#0B1D55`
- KPI numero: Arial 24 bold branco sobre fundo azul `#0B1D55`
- Total: Arial 12 bold amarelo

**Layout:**
- Coluna A vazia, largura 2 — margem decorativa azul a esquerda
- Linha 1: title bar (altura 54.75) com emoji + nome + pipe + secao
- Linha 2: subtitle (altura 21.75) com descricao curta italic
- Linha 3: espaco vazio (altura 8)
- Linha 4: header tabela (altura 31.5) com cores variadas por funcao
- Linha 5+: dados zebrados
- `showGridLines = False` em TODAS as abas
- Freeze panes na linha 5 (header sempre visivel)
- Filtro auto no header
- Card "HOJE" no canto direito da title bar com `=TEXT(TODAY(),"DD/MM/AAAA")` (Wesley quer ver data ao abrir)
- Title bar de cada aba: emoji + nome maiusculas + pipe + subsecao (`🚛  CAVALO  |  CIV · CRONOTACÓGRAFO · EXTINTOR`)
- Print setup: paisagem, fit to width, print_title_rows = "1:4"

**Headers de tabela colorem por funcao:**
- Identificacao principal (placa/nome): azul primario `#0B1D55`
- Datas de vencimento: azul secundario `#122580`
- Status calculados: vermelho `#C0392B` (texto branco)
- Destaque/agendamento: amarelo `#F5C800` (texto azul)
- Alertas especificos (tipo IPEM): laranja `#E67E22`

**Formatacao condicional de status (string-based):**
- `LEFT(cell,7)="VENCIDO"` ou `cell="VENCE HOJE"` → fundo `#FFF5F5` texto vermelho bold
- `LEFT(cell,5)="vence"` → fundo `#FFF8E1` texto laranja bold
- `LEFT(cell,2)="OK"` → fundo `#EAF7EE` texto verde

**Pegadinha critica (Excel PT-BR):**
- Dentro de `TEXT()/TEXTO()`: usar `"DD/MM/AAAA"` (NAO `YYYY` — vira literal e some o ano)
- Em `number_format` de celula: `"DD/MM/YYYY"` funciona normal (openpyxl traduz)
- Em `WEEKDAY(...,2)` PT-BR usar `CHOOSE(... ,"segunda-feira","terça-feira",...)`

Script gerador funcional: `C:\Users\Logistica01\Desktop\gerar_controle_vencimentos.py` (referencia pra clonar layout em outras planilhas).

Relacionado: [[feedback_nao_inventar_colunas]] (visual desse padrao OK aplicar sem pedir; campos de dado NAO).

---

## Relacionado por tema

- **pneus**: [[project_logistica_rastreamento_levantamento]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **planilha**: [[feedback_auto_skills]] · [[feedback_dados_reais]] · [[feedback_nao_inventar_colunas]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]


## Mesma categoria (reference)

[[reference_firestore_cache_offline]] | [[reference_sascar_api]]
