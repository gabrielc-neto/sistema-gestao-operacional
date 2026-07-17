---
name: project-excel-vencimentos-frota
description: "Planilha Excel de controle de vencimentos da frota — estrutura, scripts Python, lições aprendidas, sessão 12/06/2026"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3603771b-f396-4273-b3a5-60a9cc1e8c37
---

Planilha de controle de vencimentos de documentos da frota Pontual Brasil Petróleo.

**Why:** Controle manual de vencimentos de CIV, CIPP, IPEM, Extintor (carretas), CIV/Cronotac/Extintor (cavalos), CNH/MOPP (motoristas). Dashboard com hyperlinks para lista de vencidos.

**How to apply:** Ao trabalhar nessa planilha, usar o BACKUP como fonte e gerar nova versão numerada. Nunca editar o BACKUP.

---

## Caminhos dos arquivos

```
C:\Users\Logistica01\Downloads\
├── CONTROLE LOGISTICO  DE VENCIMENTO FROTA_BACKUP.xlsx   ← fonte (nunca modificar)
├── CONTROLE LOGISTICO  DE VENCIMENTO FROTA_V7.xlsx       ← versão atual (12/06/2026)
├── fix_vencidos_drill.py                                  ← script principal
├── fix_dashboard.py                                       ← legado (V2)
└── fix_ipem_efetivo.py                                    ← legado (V4)
```

Para regenerar V7 após atualizar dados no BACKUP:
```powershell
python "C:/Users/Logistica01/Downloads/fix_vencidos_drill.py"
```

---

## Mapeamento de colunas

### Aba CARRETA (dados linha 5 a 301)
| Col | Conteúdo |
|-----|----------|
| B | Placa 1ª |
| C | Placa 2ª |
| D | CIV Vencimento |
| E | Status CIV |
| F | CIPP Vencimento |
| G | Status CIPP |
| H | IPEM Vencimento (data original) |
| I | Status IPEM (usa col M) |
| J | Agendamento IPEM / Prorrogação |
| K | Extintor Vencimento |
| L | Status Extintor |
| **M** | **Data Efetiva IPEM** (coluna adicionada pelo script) |

### Aba CAVALO (dados linha 5 a 300)
B=Placa, C=CIV Venc, D=Status CIV, E=Cronotac Venc, F=Status Cronotac, G=Extintor Venc, H=Status Extintor

### Aba MOTORISTA (dados linha 5 a 300)
B=Nome, C=CNH Venc, D=Status CNH, E=MOPP Venc, F=Status MOPP

---

## Fórmulas-chave

**Col M — Data Efetiva IPEM:**
```
=IF(H5="","",IF(J5="",H5,IF(J5>H5,J5,H5)))
```
Regra: se tem prorrogação (J) e ela é posterior ao vencimento original (H) → usa J; senão usa H.

**Status IPEM (col I) — usa M:**
```
=IF(H5="","-",IF(NOT(ISNUMBER(H5)),"-",
  IF(M5<TODAY(),"VENCIDO ha "&(TODAY()-M5)&"d",
  IF(M5=TODAY(),"VENCE HOJE",
  IF(M5<=TODAY()+60,"vence em "&(M5-TODAY())&"d",
  "OK ("&(M5-TODAY())&"d)")))))
```

**Dashboard linha 16 (IPEM Carreta) — usa M:**
- C16: `=COUNT(CARRETA!H5:H301)`
- D16: `=COUNTIFS(CARRETA!M5:M301,"<="&TODAY())`

---

## O que foi feito (sessão 12/06/2026)

1. **Corrigiu dashboard** — colunas CARRETA erradas (C→D, E→F, J→K)
2. **Adicionou col M** — Data Efetiva IPEM com lógica de prorrogação
3. **Corrigiu 262 falsos vencidos** — col M retornava 0 para H vazio → COUNTIFS contava. Fix: `=IF(H="","",...)` 
4. **Seção Agendamento IPEM** no dashboard (linhas 32-48)
5. **Aba "📋 VENCIDOS"** com lista de vencidos por categoria + hyperlinks clicáveis no dashboard
6. **Removeu seção Motorista CNH** da aba VENCIDOS (pedido Wesley)

---

## Lição crítica — AGGREGATE cross-sheet com col fórmula não funciona

Tentativa V5/V6: usar fórmulas AGGREGATE na aba VENCIDOS referenciando colunas de outras abas.

**Problema:** quando a coluna referenciada é ela mesma uma fórmula (ex: col M adicionada pelo Python), o Excel pode não ter calculado essa coluna ainda quando a VENCIDOS tenta avaliá-la → lista aparece vazia.

**Solução usada no V7:** calcular os vencidos diretamente em Python (lendo o BACKUP com `data_only=True`) e escrever valores estáticos na aba VENCIDOS. Garantido funcionar ao abrir o arquivo.

```python
wb_data = load_workbook(path_in, data_only=True)
wb.calculation.fullCalcOnLoad = True  # força recálculo do dashboard
```

A aba VENCIDOS é snapshot do dia da geração. Dashboard continua dinâmico (COUNTIFS recalculam).

---

## Veículos com exceção (sem IPEM/CIV/CIPP)

- ARLA e Carroceria Aberta: não têm IPEM, CIV nem CIPP
- Essas linhas ficam com H vazio → col M retorna "" → não aparecem como vencidas ✓

---

## Resultado em 12/06/2026

- CARRETA IPEM: **AKC-4906** venceu em 12/06/2026 (vence hoje, 0 dias)
- Todas as outras categorias: nenhum vencido

---
*Ver também: [[MEMORY|Índice de memórias]] · [[INDICE|Dashboard]] · [[CLAUDE|Contexto Pontual]]*

---

## Relacionado por tema

- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **pontual**: [[feedback-login-split-pattern]] · [[feedback-svg-logo-iteration-cost]] · [[feedback_arquivo_explicito_obrigatorio]]
- **planilha**: [[feedback_auto_skills]] · [[feedback_dados_reais]] · [[feedback_nao_inventar_colunas]]
- **roteirizacao**: [[feedback-svg-logo-iteration-cost]] · [[feedback_falar_inviavel_cedo]] · [[feedback_nodejs_only]]


## Mesma categoria (project)

[[project-logistica-ia-frontend]] | [[project-pendrive-backup]] | [[project-pontual-logo-white-aprovada]] | [[project_apresentacao_mensal]] | [[project_banco_aws_decidido]]
