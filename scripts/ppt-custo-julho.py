"""
Slide único — Custo Operacional Julho/2026
Padrão Pontual (template oficial docs/templates/ppt-pontual-template.py)
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from pptx.util import Inches, Pt

# ---- dados ----
CUSTOS = [
    ("PEÇAS",         65160.85),
    ("MANUTENÇÃO",    39490.35),
    ("PNEUS",         36465.00),
    ("ESTOQUE",       23768.20),
    ("DOCUMENTAÇÃO",   9161.00),
    ("LAVAGEM",        7120.00),
    ("SOCORRO",        2760.00),
]
TOTAL = sum(v for _, v in CUSTOS)   # 183.925,40

# ---- deck ----
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = tpl.novo_slide(prs)
tpl.header(s, "Custo Operacional — Julho / 2026",
              "Distribuição por categoria · Frota Pontual Brasil Petróleo", SW)

# ---- card destaque navy (topo, largura total) ----
tpl.kpi_card_navy(s, Inches(0.5), Inches(1.35),
                  SW - Inches(1.0), Inches(1.05),
                  tpl.brl(TOTAL), "TOTAL GERAL DO MÊS")

# ---- ranking (barras) ----
tpl.secao_titulo(s, Inches(0.5), Inches(2.65), Inches(10),
                 "Ranking por Categoria",
                 "Ordenado do maior para o menor · % sobre o total")

y = Inches(3.15)
row_h = Inches(0.42)
gap   = Inches(0.06)
maior = CUSTOS[0][1]

for i, (nome, valor) in enumerate(CUSTOS, start=1):
    pct = valor / TOTAL * 100
    tpl.ranking_row(
        s,
        x=Inches(0.5),
        y=y,
        w=SW - Inches(1.0),
        pos=i,
        nome=nome,
        sub_txt=f"{pct:.1f}% do custo total",
        valor_texto=tpl.brl(valor),
        valor_bar=valor,
        valor_max=maior,
    )
    y += row_h + gap

tpl.footer(s, "Fonte: sistema interno Pontual · Consolidado 01→31 Julho 2026",
           SW, SH)

# ---- save ----
out = r"C:\Users\Logistica01\Downloads\Custo_Operacional_Julho_2026.pptx"
prs.save(out)
print(f"OK: {out}")
print(f"Total: {tpl.brl(TOTAL)}")
