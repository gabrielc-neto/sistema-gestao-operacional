"""
Slide único — Operação de viagem
Logo Pontual (white) + foto da carreta tanque + rota Araucária x Maringá + carga LOTAÇÃO.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

NAVY   = tpl.NAVY
NAVY_D = tpl.NAVY_D
GOLD   = tpl.GOLD
WHITE  = tpl.WHITE
GRAY   = RGBColor(0x33, 0x36, 0x4A)
GRAY_L = RGBColor(0x7A, 0x7E, 0x92)
ICE    = RGBColor(0xEE, 0xF1, 0xFB)

# ---- arquivos ----
LOGO = r"C:\Users\Logistica01\projetos\logistica-ia\frontend\public\pontual-logo-white.png"
FOTO = r"C:\Users\Logistica01\Downloads\ChatGPT Image 29 de jul. de 2026, 10_12_41.png"

FOTO_RATIO = 1023/1473   # W/H (retrato, imagem atualizada 10_12_41)
LOGO_RATIO = 1849/504    # W/H (paisagem, faixa)

prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = prs.slides.add_slide(prs.slide_layouts[6])
tpl.add_rect(s, 0, 0, SW, SH, WHITE)

# HEADER navy com LOGO + TITULO
HH = Inches(1.35)
tpl.add_rect(s, 0, 0, SW, HH, NAVY)
tpl.add_rect(s, 0, 0, Inches(0.08), HH, GOLD)

logo_h = Inches(0.85)
logo_w = int(logo_h * LOGO_RATIO)
s.shapes.add_picture(LOGO, Inches(0.5), Inches(0.25), logo_w, logo_h)

# TITULO
tpl.add_text(s, Inches(0.5)+logo_w+Inches(0.5), Inches(0.3),
             SW - (Inches(0.5)+logo_w+Inches(0.5)) - Inches(0.5),
             Inches(0.9),
             "EXEMPLO DE PRECIFICAÇÃO DE FRETE",
             size=26, bold=True, color=WHITE, font=tpl.FONTE_TITULO,
             align=PP_ALIGN.RIGHT)

# FOTO (esquerda) — imagem grande da planilha
foto_h = Inches(5.6)
foto_w = int(foto_h * FOTO_RATIO)
foto_x = Inches(0.6)
foto_y = Inches(1.55)
s.shapes.add_picture(FOTO, foto_x, foto_y, foto_w, foto_h)

# FRASE grande à direita (no espaço em branco)
col_x = foto_x + foto_w + Inches(0.7)
col_w = SW - col_x - Inches(0.5)

# frase em 3 blocos empilhados pra ficar impactante
tpl.add_text(s, col_x, Inches(2.3), col_w, Inches(1.0),
             "CONHEÇA OS", size=42, bold=True, color=NAVY_D,
             font=tpl.FONTE_TITULO)
tpl.add_text(s, col_x, Inches(3.05), col_w, Inches(1.0),
             "SEUS NÚMEROS.", size=42, bold=True, color=NAVY_D,
             font=tpl.FONTE_TITULO)

# linha amarela divisora
tpl.add_rect(s, col_x, Inches(4.1), Inches(1.8), Emu(45000), GOLD)

tpl.add_text(s, col_x, Inches(4.35), col_w, Inches(1.0),
             "SÓ ASSIM VOCÊ", size=36, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
tpl.add_text(s, col_x, Inches(4.95), col_w, Inches(1.0),
             "TRANSPORTA", size=36, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
tpl.add_text(s, col_x, Inches(5.55), col_w, Inches(1.2),
             "LUCRO.", size=64, bold=True, color=GOLD,
             font=tpl.FONTE_TITULO)

out = r"C:\Users\Logistica01\Downloads\Exemplo_Precificacao_Frete_2026-07-29_v2.pptx"
prs.save(out)
print(f"OK: {out}")
