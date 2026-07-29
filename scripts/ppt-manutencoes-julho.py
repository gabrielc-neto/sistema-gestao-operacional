"""
Slide único — Manutenções Julho/2026 (por tipo + interno x externo)
Padrão Pontual (docs/templates/ppt-pontual-template.py)
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# ---- dados ----
TIPOS = [
    ("Corretiva",   60),
    ("Preventiva",  47),
    ("Lavagem",     30),
    ("Inspeção",    11),   # corrigido: era 10 no print, correto é 11
    ("Instalação",   4),
    ("Extintor",     1),
    ("Reforma",      1),
]
TOTAL = sum(q for _, q in TIPOS)   # 154

INTERNO   = 45
EXTERNO   = 79
LAVAGEM   = 30
assert INTERNO + EXTERNO + LAVAGEM == TOTAL, "quebra INT/EXT/LAV não fecha!"

pct = lambda v: f"{v/TOTAL*100:.1f}%".replace(".", ",")

# ---- deck ----
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = tpl.novo_slide(prs)
tpl.header(s, "Manutenções — Julho / 2026",
              "Distribuição por tipo · Interno x Externo · Frota Pontual",
              SW)

# =============================================================
# LINHA 1 — 4 cards (INTERNO / EXTERNO / LAVAGEM / TOTAL)
# =============================================================
y0  = Inches(1.35)
h0  = Inches(1.35)
gap = Inches(0.2)
cw  = (SW - Inches(1.0) - gap*3) / 4

tpl.kpi_card_ice(s, Inches(0.5),               y0, cw, h0,
                 "Interno", str(INTERNO), sub=f"{pct(INTERNO)} do total")
tpl.kpi_card_ice(s, Inches(0.5)+cw+gap,        y0, cw, h0,
                 "Externo", str(EXTERNO), sub=f"{pct(EXTERNO)} do total")
tpl.kpi_card_ice(s, Inches(0.5)+(cw+gap)*2,    y0, cw, h0,
                 "Lavagem", str(LAVAGEM), sub=f"{pct(LAVAGEM)} do total")
tpl.kpi_card_navy(s, Inches(0.5)+(cw+gap)*3,   y0, cw, h0,
                  str(TOTAL), "TOTAL DE MANUTENÇÕES")

# =============================================================
# LINHA 2 — ranking por tipo (barras)
# =============================================================
tpl.secao_titulo(s, Inches(0.5), Inches(3.05), Inches(12),
                 "Ranking por Tipo de Manutenção",
                 "Ordenado do maior para o menor · % sobre o total de 154")

y = Inches(3.55)
row_h = Inches(0.42)
gap_r = Inches(0.06)
maior = TIPOS[0][1]

for i, (nome, qtd) in enumerate(TIPOS, start=1):
    tpl.ranking_row(
        s,
        x=Inches(0.5),
        y=y,
        w=SW - Inches(1.0),
        pos=i,
        nome=nome,
        sub_txt=f"{pct(qtd)} do total",
        valor_texto=f"{qtd}",
        valor_bar=qtd,
        valor_max=maior,
    )
    y += row_h + gap_r

tpl.footer(s, "Fonte: sistema interno Pontual · Consolidado 01→31 Julho 2026",
           SW, SH)

out = r"C:\Users\Logistica01\Downloads\Manutencoes_Julho_2026.pptx"
prs.save(out)
print(f"OK: {out}")
print(f"Total: {TOTAL} · Interno: {INTERNO} ({pct(INTERNO)}) · Externo: {EXTERNO} ({pct(EXTERNO)}) · Lavagem: {LAVAGEM} ({pct(LAVAGEM)})")
