"""
3 slides — Manutenções Julho/2026 (modelo idêntico aos prints do user)
  1) Gastos em Manutenções (ranking + card total)
  2) Total de Manutenções (contagem + card int/ext)
  3) Comparativo Junho x Julho
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ---- paleta (mesma do print) ----
NAVY   = tpl.NAVY
NAVY_D = tpl.NAVY_D
GOLD   = tpl.GOLD
WHITE  = tpl.WHITE
GRAY   = RGBColor(0x33, 0x36, 0x4A)
GRAY_L = RGBColor(0x7A, 0x7E, 0x92)
ICE    = RGBColor(0xEE, 0xF1, 0xFB)
GREEN  = RGBColor(0x22, 0x8B, 0x3D)
RED    = RGBColor(0xC0, 0x39, 0x2B)
BAR_BG = RGBColor(0xB6, 0xBE, 0xD5)   # trilha da mini-barra

# =============================================================
# DADOS
# =============================================================
# Gastos (categoria monetária) — dados enviados anteriormente
GASTOS = [
    ("Peças",         66754.85),   # atualizado
    ("Manutenção",    39490.35),
    ("Pneus",         36465.00),
    ("Estoque",       23768.20),
    ("Documentação",   9161.00),
    ("Lavagem",        7120.00),
    ("Socorro",        2760.00),
]
TOTAL_GASTO_JUL = sum(v for _, v in GASTOS)     # 185.519,40

# Contagem por tipo — dados corrigidos
TIPOS = [
    ("Corretiva",   60),
    ("Preventiva",  47),
    ("Lavagem",     30),
    ("Inspeção",    11),
    ("Instalação",   4),
    ("Extintor",     1),
    ("Reforma",      1),
]
TOTAL_MANUT   = sum(q for _, q in TIPOS)   # 154
INT_MANUT     = 45
EXT_MANUT     = 79
LAV_MANUT     = 30

# Comparativo com Junho (Junho vem do próprio print do user)
TOTAL_GASTO_JUN = 148451.95

# =============================================================
# HELPERS
# =============================================================
def brl(v):
    return f"R$ {v:,.2f}".replace(",","X").replace(".",",").replace("X",".")
def brl_ent(v):
    return f"R$ {int(round(v)):,}".replace(",",".")

def novo_slide_full(prs):
    """Slide branco sem faixa amarela (modelo do print — só header navy chapado)."""
    s = prs.slides.add_slide(prs.slide_layouts[6])
    tpl.add_rect(s, 0, 0, prs.slide_width, prs.slide_height, WHITE)
    return s

def header_modelo(slide, titulo, subtitulo, sw):
    """Header do modelo: navy + faixa amarela fininha só embaixo (accent)."""
    tpl.add_rect(slide, 0, 0, sw, Inches(1.28), NAVY)
    # accent amarelo curto na lateral esquerda (barrinha vertical) — como no print
    tpl.add_rect(slide, 0, 0, Inches(0.08), Inches(1.28), GOLD)
    tpl.add_text(slide, Inches(0.5), Inches(0.25), sw-Inches(1), Inches(0.55),
                 titulo.upper(), size=26, bold=True, color=WHITE,
                 font=tpl.FONTE_TITULO)
    tpl.add_text(slide, Inches(0.5), Inches(0.82), sw-Inches(1), Inches(0.35),
                 subtitulo, size=13, color=RGBColor(0xC5, 0xCC, 0xE0),
                 font=tpl.FONTE_TITULO)

def footer_modelo(slide, txt, sw, sh):
    tpl.add_text(slide, Inches(0.5), sh-Inches(0.4), sw-Inches(1), Inches(0.25),
                 txt, size=9, color=GRAY_L)

def bar_row(slide, x_label, x_bar, y, label, valor, valor_max, bar_wmax,
            valor_texto, size_label=11, size_val=11):
    """Uma linha do gráfico horizontal do modelo."""
    # nome à esquerda (alinhado à direita, colado na barra)
    tpl.add_text(slide, x_label, y+Inches(0.05), x_bar-x_label-Inches(0.15),
                 Inches(0.3), label.upper(), size=size_label, bold=True,
                 color=GRAY, align=PP_ALIGN.RIGHT)
    # barra
    bw = int(bar_wmax * (valor / valor_max))
    tpl.add_rect(slide, x_bar, y+Inches(0.06), bw, Inches(0.28), NAVY)
    # valor à direita da barra
    tpl.add_text(slide, x_bar+bw+Inches(0.08), y+Inches(0.06),
                 Inches(1.5), Inches(0.3),
                 valor_texto, size=size_val, bold=True, color=GRAY)

def card_navy_detalhe(slide, x, y, w, h):
    """Retorna o retângulo do card lateral navy (com cantos arredondados)."""
    tpl.add_rect(slide, x, y, w, h, NAVY, corner=0.06)

def linha_amarela(slide, x, y, w):
    tpl.add_rect(slide, x, y, w, Emu(15000), GOLD)

def detalhe_categoria(slide, x, y, w, nome, valor_txt, pct, pct_val, pct_max):
    """Uma linha do painel direito: nome + valor + % + mini barra dupla."""
    # nome à esquerda
    tpl.add_text(slide, x, y, w*0.7, Inches(0.24),
                 nome.upper(), size=11, bold=True, color=WHITE)
    # % à direita
    tpl.add_text(slide, x, y, w, Inches(0.24),
                 f"{pct:.2f}%".replace(".",","),
                 size=13, bold=True, color=GOLD, align=PP_ALIGN.RIGHT,
                 font=tpl.FONTE_TITULO)
    # valor abaixo do nome
    tpl.add_text(slide, x, y+Inches(0.24), w, Inches(0.22),
                 valor_txt, size=10, bold=True, color=GOLD)
    # mini barra dupla
    bar_y = y + Inches(0.5)
    bar_h = Inches(0.06)
    # trilha
    tpl.add_rect(slide, x, bar_y, w, bar_h, BAR_BG)
    # preenchimento amarelo
    fill_w = int(w * (pct_val / pct_max))
    tpl.add_rect(slide, x, bar_y, fill_w, bar_h, GOLD)


# =============================================================
# DECK
# =============================================================
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

# =============================================================
# SLIDE 1 — GASTOS EM MANUTENÇÕES · JULHO 2026
# =============================================================
s1 = novo_slide_full(prs)
header_modelo(s1, "Gastos em Manutenções · Julho 2026",
                  "Ranking por categoria (do maior ao menor gasto)", SW)

# título seção esquerda
tpl.add_text(s1, Inches(0.5), Inches(1.55), Inches(8), Inches(0.3),
             "DISTRIBUIÇÃO DOS GASTOS / LANÇAMENTO NFS", size=12, bold=True,
             color=NAVY, font=tpl.FONTE_TITULO)

# gráfico à esquerda
gx_label = Inches(0.5)
gx_bar   = Inches(2.05)
bar_wmax = Inches(5.3)
maior_gasto = max(v for _, v in GASTOS)
y = Inches(2.05)
for nome, valor in GASTOS:
    bar_row(s1, gx_label, gx_bar, y, nome, valor, maior_gasto, bar_wmax,
            valor_texto=brl_ent(valor))
    y += Inches(0.55)

# card direita
cx = Inches(8.9); cy = Inches(1.55); cw = Inches(4.0); ch = Inches(5.35)
card_navy_detalhe(s1, cx, cy, cw, ch)
pad = Inches(0.28)
tpl.add_text(s1, cx+pad, cy+Inches(0.2), cw-pad*2, Inches(0.25),
             "TOTAL · JULHO 2026", size=10, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)
tpl.add_text(s1, cx+pad, cy+Inches(0.45), cw-pad*2, Inches(0.7),
             brl(TOTAL_GASTO_JUL), size=28, bold=True, color=GOLD,
             font=tpl.FONTE_TITULO)
linha_amarela(s1, cx+pad, cy+Inches(1.22), cw-pad*2)
tpl.add_text(s1, cx+pad, cy+Inches(1.32), cw-pad*2, Inches(0.25),
             "DETALHAMENTO POR CATEGORIA", size=9, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)

# linhas do detalhe
dy = cy+Inches(1.65)
row_step = Inches(0.6)
for nome, valor in GASTOS:
    pct = valor / TOTAL_GASTO_JUL * 100
    detalhe_categoria(s1, cx+pad, dy, cw-pad*2,
                      nome, brl(valor), pct, valor, maior_gasto)
    dy += row_step

footer_modelo(s1, "Fonte: controle interno de manutenção · Referência: gráfico Julho 2026",
              SW, SH)

# =============================================================
# SLIDE 2 — TOTAL DE MANUTENÇÕES · JULHO 2026
# =============================================================
s2 = novo_slide_full(prs)
header_modelo(s2, "Total de Manutenções · Julho 2026",
                  "Ranking por tipo (do maior ao menor volume)", SW)

tpl.add_text(s2, Inches(0.5), Inches(1.55), Inches(8), Inches(0.3),
             "DISTRIBUIÇÃO POR TIPO / PLANILHA O.S MÊS", size=12, bold=True,
             color=NAVY, font=tpl.FONTE_TITULO)

# gráfico à esquerda
maior_tipo = max(q for _, q in TIPOS)
y = Inches(2.05)
for nome, qtd in TIPOS:
    bar_row(s2, gx_label, gx_bar, y, nome, qtd, maior_tipo, bar_wmax,
            valor_texto=str(qtd))
    y += Inches(0.5)

# card direita
card_navy_detalhe(s2, cx, cy, cw, ch)
tpl.add_text(s2, cx+pad, cy+Inches(0.2), cw-pad*2, Inches(0.25),
             "TOTAL · JULHO 2026", size=10, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)
tpl.add_text(s2, cx+pad, cy+Inches(0.45), cw-pad*2, Inches(0.5),
             f"{EXT_MANUT} manutenções externas", size=18, bold=True,
             color=GOLD, font=tpl.FONTE_TITULO)
tpl.add_text(s2, cx+pad, cy+Inches(0.85), cw-pad*2, Inches(0.5),
             f"{INT_MANUT} manutenções internas", size=18, bold=True,
             color=GOLD, font=tpl.FONTE_TITULO)
tpl.add_text(s2, cx+pad, cy+Inches(1.32), cw-pad*2, Inches(0.25),
             f"+ {LAV_MANUT} lavagens · TOTAL {TOTAL_MANUT} OS",
             size=10, color=RGBColor(0xC5, 0xCC, 0xE0))
linha_amarela(s2, cx+pad, cy+Inches(1.66), cw-pad*2)
tpl.add_text(s2, cx+pad, cy+Inches(1.76), cw-pad*2, Inches(0.25),
             "DETALHAMENTO POR TIPO", size=9, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)

dy = cy+Inches(2.05)
row_step = Inches(0.48)
for nome, qtd in TIPOS:
    pct = qtd / TOTAL_MANUT * 100
    # variação do detalhe: valor curto "N eventos"
    valor_txt = f"{qtd} eventos"
    detalhe_categoria(s2, cx+pad, dy, cw-pad*2,
                      nome, valor_txt, pct, qtd, maior_tipo)
    dy += row_step

footer_modelo(s2, "Fonte: controle interno de manutenção · Referência: apuração Julho 2026",
              SW, SH)

# =============================================================
# SLIDE 3 — COMPARATIVO MENSAL · JUNHO x JULHO 2026
# =============================================================
s3 = novo_slide_full(prs)
header_modelo(s3, "Comparativo Mensal · Junho x Julho 2026",
                  "Variação do gasto total em manutenções", SW)

# 2 cards no topo (Junho cinza + Julho navy) com seta entre eles
col_y = Inches(1.7)
col_h = Inches(2.3)
col_w = Inches(5.85)
gap_x = Inches(0.7)   # espaço pra seta

# Junho (cinza claro, accent lateral cinza escuro)
jx = Inches(0.5)
tpl.add_rect(s3, jx, col_y, col_w, col_h, ICE, corner=0.05)
tpl.add_rect(s3, jx, col_y, Inches(0.13), col_h, RGBColor(0x7A, 0x82, 0xA5))
tpl.add_text(s3, jx+Inches(0.35), col_y+Inches(0.2), col_w-Inches(0.7), Inches(0.3),
             "JUNHO / 2026", size=11, bold=True, color=GRAY,
             font=tpl.FONTE_TITULO)
tpl.add_text(s3, jx+Inches(0.35), col_y+Inches(0.5), col_w-Inches(0.7), Inches(0.9),
             brl(TOTAL_GASTO_JUN), size=32, bold=True, color=NAVY_D,
             font=tpl.FONTE_TITULO)
tpl.add_text(s3, jx+Inches(0.35), col_y+Inches(1.55), col_w-Inches(0.7), Inches(0.3),
             "Total consolidado de manutenções", size=11, color=GRAY_L)
tpl.add_text(s3, jx+Inches(0.35), col_y+col_h-Inches(0.55), col_w-Inches(0.7), Inches(0.3),
             "Base de comparação", size=10, bold=True, color=GRAY_L)

# seta entre os cards (vermelha porque houve aumento)
seta_x = jx + col_w + Inches(0.05)
seta_shape = s3.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW,
                                 seta_x, col_y+col_h/2-Inches(0.3),
                                 gap_x-Inches(0.1), Inches(0.6))
seta_shape.fill.solid(); seta_shape.fill.fore_color.rgb = RED
seta_shape.line.fill.background()
seta_shape.shadow.inherit = False

# Julho (navy escuro, accent lateral amarelo)
julx = jx + col_w + gap_x
tpl.add_rect(s3, julx, col_y, col_w, col_h, NAVY, corner=0.05)
tpl.add_rect(s3, julx, col_y, Inches(0.13), col_h, GOLD)
tpl.add_text(s3, julx+Inches(0.35), col_y+Inches(0.2), col_w-Inches(0.7), Inches(0.3),
             "JULHO / 2026", size=11, bold=True, color=GOLD,
             font=tpl.FONTE_TITULO)
tpl.add_text(s3, julx+Inches(0.35), col_y+Inches(0.5), col_w-Inches(0.7), Inches(0.9),
             brl(TOTAL_GASTO_JUL), size=32, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)
tpl.add_text(s3, julx+Inches(0.35), col_y+Inches(1.55), col_w-Inches(0.7), Inches(0.3),
             "Total consolidado de manutenções", size=11,
             color=RGBColor(0xC5, 0xCC, 0xE0))
tpl.add_text(s3, julx+Inches(0.35), col_y+col_h-Inches(0.55), col_w-Inches(0.7), Inches(0.3),
             "Mês corrente", size=10, bold=True, color=GOLD)

# card grande de variação (VERMELHO — porque teve aumento)
delta = TOTAL_GASTO_JUL - TOTAL_GASTO_JUN
var_pct = delta / TOTAL_GASTO_JUN * 100
seta = "↑" if delta > 0 else "↓"
lbl_titulo = "AUMENTO DE JUNHO PARA JULHO" if delta > 0 else "REDUÇÃO DE JUNHO PARA JULHO"
cor_bg = RED if delta > 0 else GREEN

bx = Inches(0.5); by = Inches(4.35); bw = SW - Inches(1.0); bh = Inches(1.35)
tpl.add_rect(s3, bx, by, bw, bh, cor_bg, corner=0.05)
tpl.add_text(s3, bx+Inches(0.35), by+Inches(0.18), bw-Inches(0.7), Inches(0.3),
             f"{seta} {lbl_titulo}", size=12, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)
tpl.add_text(s3, bx+Inches(0.35), by+Inches(0.5), bw-Inches(6), Inches(0.7),
             brl(abs(delta)), size=30, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)
tpl.add_text(s3, bx+Inches(0.35), by+Inches(1.02), bw-Inches(6), Inches(0.28),
             f"Gasto adicional de {brl(abs(delta))} no mês em relação a Junho "
             f"({var_pct:+.2f}% de variação)".replace(".",","),
             size=10, color=WHITE)
tpl.add_text(s3, bx+bw-Inches(3.0), by+Inches(0.45), Inches(2.5), Inches(0.7),
             f"{seta} {abs(var_pct):.2f}%".replace(".",","),
             size=32, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
             font=tpl.FONTE_TITULO)

# card amarelo destaque (categoria maior do mês = PEÇAS)
dx = Inches(0.5); dy = Inches(5.9); dw = SW - Inches(1.0); dh = Inches(1.05)
tpl.add_rect(s3, dx, dy, dw, dh, GOLD, corner=0.05)
tpl.add_text(s3, dx+Inches(0.35), dy+Inches(0.15), dw-Inches(0.7), Inches(0.3),
             "PEÇAS · CATEGORIA DE MAIOR IMPACTO EM JULHO",
             size=11, bold=True, color=NAVY, font=tpl.FONTE_TITULO)
pct_pecas = 66754.85 / TOTAL_GASTO_JUL * 100
tpl.add_text(s3, dx+Inches(0.35), dy+Inches(0.48), Inches(6), Inches(0.5),
             brl(66754.85), size=22, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
tpl.add_text(s3, dx+dw-Inches(5.5), dy+Inches(0.48), Inches(5.2), Inches(0.5),
             f"{pct_pecas:.2f}% do total do mês".replace(".",","),
             size=18, bold=True, color=NAVY, align=PP_ALIGN.RIGHT,
             font=tpl.FONTE_TITULO)

# ---- save ----
out = r"C:\Users\Logistica01\Downloads\Manutencoes_Julho_2026_MODELO.pptx"
prs.save(out)
print(f"OK: {out}")
print(f"Slide 1: total gasto R$ {TOTAL_GASTO_JUL:.2f}")
print(f"Slide 2: {TOTAL_MANUT} OS ({EXT_MANUT} ext + {INT_MANUT} int + {LAV_MANUT} lav)")
print(f"Slide 3: Jun {TOTAL_GASTO_JUN:.2f} -> Jul {TOTAL_GASTO_JUL:.2f} = {var_pct:+.2f}%")
