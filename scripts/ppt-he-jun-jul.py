"""
Slide único — Hora Extra período 21/06 a 20/07/2026
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
def to_sec(h, m, s): return h*3600 + m*60 + s
def fmt_hms(t):
    h = t // 3600; m = (t % 3600) // 60; s = t % 60
    return f"{h}:{m:02d}:{s:02d}"

HE50_JJ  = to_sec(907, 14,  8)   # 21/06 - 20/07
HE100_JJ = to_sec(694, 56, 58)
TOT_JJ   = HE50_JJ + HE100_JJ    # 1602:11:06

HE50_MJ  = to_sec(849, 51, 45)   # Mai-Jun
HE100_MJ = to_sec(737, 46, 44)
TOT_MJ   = HE50_MJ + HE100_MJ    # 1587:38:29

var50   = (HE50_JJ  - HE50_MJ ) / HE50_MJ  * 100   # +6.8%
var100  = (HE100_JJ - HE100_MJ) / HE100_MJ * 100   # -5.8%
var_tot = (TOT_JJ   - TOT_MJ  ) / TOT_MJ   * 100   # +0.9%

RED   = RGBColor(0xC0, 0x39, 0x2B)
GREEN = RGBColor(0x27, 0x8B, 0x3D)

# ---- deck ----
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = tpl.novo_slide(prs)
tpl.header(s, "Hora Extra — 21/06 a 20/07 / 2026",
              "Comparativo com período anterior (Mai-Jun) · Frota Pontual", SW)

# ---- linha de 3 KPI cards no topo ----
y0   = Inches(1.35)
h0   = Inches(1.55)
gap  = Inches(0.2)
cw   = (SW - Inches(1.0) - gap*2) / 3

# HE 50%
tpl.kpi_card_ice(s, Inches(0.5), y0, cw, h0,
                 "HE 50%", fmt_hms(HE50_JJ), sub="horas no período")

# HE 100%
tpl.kpi_card_ice(s, Inches(0.5)+cw+gap, y0, cw, h0,
                 "HE 100%", fmt_hms(HE100_JJ), sub="horas no período")

# TOTAL (navy destaque)
tpl.kpi_card_navy(s, Inches(0.5)+(cw+gap)*2, y0, cw, h0,
                  fmt_hms(TOT_JJ), "TOTAL 21/06 - 20/07")

# ---- variações vs período anterior ----
tpl.secao_titulo(s, Inches(0.5), Inches(3.15), Inches(12),
                 "Variação vs Mai-Jun (período anterior)")

def var_card(x, w, titulo, valor_ant, valor_atu, var_pct):
    card_y = Inches(3.65); card_h = Inches(2.4)
    tpl.add_rect(s, x, card_y, w, card_h, tpl.ICE2, corner=0.08)

    tpl.add_text(s, x+Inches(0.3), card_y+Inches(0.15), w-Inches(0.6), Inches(0.3),
                 titulo.upper(), size=11, bold=True, color=tpl.NAVY)

    tpl.add_text(s, x+Inches(0.3), card_y+Inches(0.55), w-Inches(0.6), Inches(0.22),
                 "Mai-Jun (anterior)", size=9, color=tpl.GRAY_L)
    tpl.add_text(s, x+Inches(0.3), card_y+Inches(0.78), w-Inches(0.6), Inches(0.35),
                 fmt_hms(valor_ant), size=16, bold=True, color=tpl.GRAY)

    tpl.add_text(s, x+Inches(0.3), card_y+Inches(1.22), w-Inches(0.6), Inches(0.22),
                 "21/06 - 20/07 (atual)", size=9, color=tpl.GRAY_L)
    tpl.add_text(s, x+Inches(0.3), card_y+Inches(1.45), w-Inches(0.6), Inches(0.35),
                 fmt_hms(valor_atu), size=18, bold=True, color=tpl.NAVY)

    cor  = RED if var_pct > 0 else GREEN
    seta = "↑" if var_pct > 0 else "↓"
    txt  = f"{seta} {abs(var_pct):.1f}%"
    bw = Inches(1.5); bh = Inches(0.4)
    bx = x + w - bw - Inches(0.3)
    by = card_y + card_h - bh - Inches(0.2)
    tpl.add_rect(s, bx, by, bw, bh, cor, corner=0.3)
    tpl.add_text(s, bx, by+Inches(0.06), bw, Inches(0.28),
                 txt, size=13, bold=True, color=tpl.WHITE,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)

var_card(Inches(0.5),            cw, "HE 50%",  HE50_MJ,  HE50_JJ,  var50)
var_card(Inches(0.5)+cw+gap,     cw, "HE 100%", HE100_MJ, HE100_JJ, var100)
var_card(Inches(0.5)+(cw+gap)*2, cw, "TOTAL",   TOT_MJ,   TOT_JJ,   var_tot)

tpl.footer(s, "Fonte: controle interno de jornada · Consolidado 21/06 - 20/07 · Pontual Brasil Petróleo",
           SW, SH)

out = r"C:\Users\Logistica01\Downloads\Hora_Extra_21-06_a_20-07_2026.pptx"
prs.save(out)
print(f"OK: {out}")
print(f"Total: {fmt_hms(TOT_JJ)} · Var: {var_tot:+.1f}%")
