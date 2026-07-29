"""
Slide "Resumo por Período" — replicando o print enviado pelo user
Padrão Pontual + tabela nativa. Atualizado com Jun-Jul (21/06 a 20/07).
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

# ---- helpers de tempo ----
def to_sec(h, m, s): return h*3600 + m*60 + s
def fmt(t):
    h = t // 3600; m = (t % 3600) // 60; s = t % 60
    return f"{h}:{m:02d}:{s:02d}"

# ---- cores extras (fiéis ao print) ----
NAVY_TBL = RGBColor(0x1A, 0x23, 0x66)   # header da tabela
ZEBRA_A  = RGBColor(0xFF, 0xFF, 0xFF)
ZEBRA_B  = RGBColor(0xF3, 0xF5, 0xFA)
BORDER   = RGBColor(0xCF, 0xD4, 0xE2)
TXT_DK   = RGBColor(0x1B, 0x1F, 0x2E)
TXT_MUTED= RGBColor(0x8A, 0x8A, 0x8A)
RED      = RGBColor(0xC0, 0x39, 0x2B)
GREEN    = RGBColor(0x1E, 0x7A, 0x34)
AMBER    = RGBColor(0xC7, 0x8C, 0x00)

# ---- dados (mesma ordem do print + Jun-Jul atualizado) ----
LINHAS = [
    # (periodo, he50_sec, he100_sec)  |  None = ainda sem dado
    ("Dez/25-Jan/26", to_sec(710, 0, 0),  to_sec(739,33,36)),
    ("Jan-Fev/26",    to_sec(785,12,36), to_sec(838,38,24)),
    ("Fev-Mar/26",    to_sec(763,19,48), to_sec(514,12, 0)),
    ("Mar-Abril",     to_sec(880,53, 8), to_sec(806,34,24)),
    ("Abril-Mai",     to_sec(729,40,54), to_sec(774, 7,59)),
    ("Mai-Jun",       to_sec(849,51,45), to_sec(737,46,44)),
    ("Jun-Jul",       to_sec(907,14, 8), to_sec(694,56,58)),   # NOVO
    ("Jul-Ago",       None, None),
    ("Ago-Set",       None, None),
    ("Set-Out",       None, None),
    ("Out-Nov",       None, None),
    ("Nov-Dez",       None, None),
]

def status(var):
    if var is None:               return ("Referência", TXT_DK,  None)
    if var >  3.0:                return ("Aumento ↑",  RED,     f"{var:+.1f}%")
    if var < -3.0:                return ("Redução ↓",  GREEN,   f"{var:+.1f}%")
    return                              ("Estável →",  AMBER,   f"{var:+.1f}%")

# ---- monta linhas com variação vs anterior (só quando ambos existem) ----
rows = []
prev_total = None
for periodo, he50, he100 in LINHAS:
    if he50 is None:
        rows.append([periodo, "—", "—", "—", "—", ("Aguardando", TXT_MUTED, None), True])
        prev_total = None
        continue
    total = he50 + he100
    var = None if prev_total is None else (total - prev_total) / prev_total * 100
    lbl, cor, var_txt = status(var)
    rows.append([
        periodo,
        fmt(he50),
        fmt(he100),
        fmt(total),
        var_txt if var_txt is not None else "—",
        (lbl, cor, var_txt),
        False,
    ])
    prev_total = total

# ---- deck ----
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = tpl.novo_slide(prs)
tpl.header(s, "Resumo por Período",
              "Hora Extra · Frota Pontual Brasil Petróleo · Atualizado 21/06 - 20/07",
              SW)

# ---- tabela ----
cols_w = [Inches(1.7), Inches(1.9), Inches(1.9), Inches(1.9),
          Inches(1.7), Inches(1.9)]        # soma ~11.0"
tbl_x  = (SW - sum(cols_w, Emu(0))) / 2
tbl_y  = Inches(1.5)
row_h  = Inches(0.42)
head_h = Inches(0.5)

headers = ["Período", "HE 50%", "HE 100%", "Total (h)", "Variação %", "Status"]

# header
x_cursor = tbl_x
for i, htxt in enumerate(headers):
    tpl.add_rect(s, x_cursor, tbl_y, cols_w[i], head_h, NAVY_TBL,
                 line=BORDER)
    tpl.add_text(s, x_cursor, tbl_y+Inches(0.13), cols_w[i], Inches(0.28),
                 htxt, size=12, bold=True, color=tpl.WHITE,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)
    x_cursor += cols_w[i]

# linhas
y = tbl_y + head_h
for idx, row in enumerate(rows):
    fill = ZEBRA_B if idx % 2 else ZEBRA_A
    x_cursor = tbl_x
    periodo, he50, he100, tot, var_txt, (status_lbl, status_cor, var_val), placeholder = row
    for i, cell in enumerate([periodo, he50, he100, tot, var_txt, status_lbl]):
        tpl.add_rect(s, x_cursor, y, cols_w[i], row_h, fill, line=BORDER)

        # cor / estilo por coluna
        if i == 0:
            cor = TXT_MUTED if placeholder else TXT_DK
            bold = not placeholder
            align = PP_ALIGN.CENTER
        elif i in (1, 2, 3):
            cor  = TXT_MUTED if placeholder else TXT_DK
            bold = False
            align = PP_ALIGN.CENTER
        elif i == 4:
            cor  = TXT_MUTED if placeholder or var_val is None else \
                   (RED if var_val.startswith("+") else GREEN if var_val.startswith("-") else AMBER)
            # exceção: refª e estável → cor do status
            if var_val is None or placeholder:
                cor = TXT_MUTED
            elif status_lbl == "Estável →":
                cor = AMBER
            bold = True
            align = PP_ALIGN.CENTER
        else:  # status
            cor  = status_cor
            bold = True
            align = PP_ALIGN.CENTER

        tpl.add_text(s, x_cursor, y+Inches(0.09), cols_w[i], Inches(0.28),
                     cell, size=11, bold=bold, color=cor,
                     align=align,
                     font=tpl.FONTE_CORPO if not placeholder else tpl.FONTE_TITULO)
        x_cursor += cols_w[i]
    y += row_h

tpl.footer(s, "Fonte: controle interno de jornada · Pontual Brasil Petróleo",
           SW, SH)

out = r"C:\Users\Logistica01\Downloads\HE_Resumo_por_Periodo_Jun-Jul_2026.pptx"
prs.save(out)
print(f"OK: {out}")
