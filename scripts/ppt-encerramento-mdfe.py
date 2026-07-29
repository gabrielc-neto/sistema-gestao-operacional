"""
Slide único — Piloto Encerramento Automático MDF-e via macro SASCAR
Padrão Pontual + screenshot enviado pelo user.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ---- paleta ----
NAVY   = tpl.NAVY
NAVY_D = tpl.NAVY_D
GOLD   = tpl.GOLD
WHITE  = tpl.WHITE
GRAY   = RGBColor(0x33, 0x36, 0x4A)
GRAY_L = RGBColor(0x7A, 0x7E, 0x92)
ICE    = RGBColor(0xEE, 0xF1, 0xFB)
GREEN  = RGBColor(0x1E, 0x7A, 0x34)

SCREENSHOT = r"C:\Users\Logistica01\Pictures\Screenshots\Screenshot 2026-07-28 180153.png"

# ---- placas em teste (extraídas do print) ----
PLACAS = [
    ("SES9I57", "Mercedes-Benz",   "24 V"),
    ("SFL4G87", "Volvo FH 460",    "25 V"),
    ("SFL4G89", "Volvo FH 460",    "24 V"),
    ("TBX5H14", "Mercedes",        "24 V"),
]

# ---- fluxo do processo (4 etapas) ----
FLUXO = [
    ("1", "MOTORISTA",     "aperta a macro\n\"ENCERRAMENTO MDFE\"\nno teclado SasMDT"),
    ("2", "SASCAR",        "recebe a macro\ne envia evento\nao servidor Pontual"),
    ("3", "SISTEMA PONTUAL","identifica o MDF-e\naberto vinculado ao\nveículo/motorista"),
    ("4", "ENCERRAMENTO",  "dispara o encerramento\nautomático do MDF-e\n(sem ação humana)"),
]

# =============================================================
# HELPERS
# =============================================================
def novo_slide(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    tpl.add_rect(s, 0, 0, prs.slide_width, prs.slide_height, WHITE)
    return s
def header_modelo(slide, titulo, subtitulo, sw):
    tpl.add_rect(slide, 0, 0, sw, Inches(1.28), NAVY)
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

def step_card(slide, x, y, w, h, num, titulo, desc):
    """Card de etapa do fluxo."""
    tpl.add_rect(slide, x, y, w, h, ICE, corner=0.05)
    # bolha do número em navy
    bx = x + Inches(0.2); by = y + Inches(0.2)
    tpl.add_rect(slide, bx, by, Inches(0.55), Inches(0.55), NAVY, corner=0.5)
    tpl.add_text(slide, bx, by+Inches(0.08), Inches(0.55), Inches(0.4),
                 num, size=18, bold=True, color=GOLD,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)
    # título
    tpl.add_text(slide, x+Inches(0.9), y+Inches(0.25), w-Inches(1.1), Inches(0.3),
                 titulo, size=11, bold=True, color=NAVY, font=tpl.FONTE_TITULO)
    # descrição (3 linhas curtas)
    tf_box = slide.shapes.add_textbox(x+Inches(0.2), y+Inches(0.9),
                                       w-Inches(0.4), h-Inches(1.0))
    tf = tf_box.text_frame
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    tf.word_wrap = True
    for i, linha in enumerate(desc.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        r = p.add_run(); r.text = linha
        r.font.name = tpl.FONTE_CORPO
        r.font.size = Pt(9); r.font.color.rgb = GRAY

def placa_card(slide, x, y, w, h, placa, modelo, bateria):
    tpl.add_rect(slide, x, y, w, h, NAVY, corner=0.05)
    tpl.add_rect(slide, x, y, w, Inches(0.06), GOLD)
    tpl.add_text(slide, x+Inches(0.2), y+Inches(0.2), w-Inches(0.4), Inches(0.5),
                 placa, size=22, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_PLACA)
    tpl.add_text(slide, x+Inches(0.2), y+Inches(0.72), w-Inches(0.4), Inches(0.25),
                 modelo, size=10, color=RGBColor(0xC5,0xCC,0xE0),
                 align=PP_ALIGN.CENTER)
    tpl.add_text(slide, x+Inches(0.2), y+Inches(0.98), w-Inches(0.4), Inches(0.25),
                 f"Bateria {bateria}", size=9, color=GOLD,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)

# =============================================================
# DECK
# =============================================================
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = novo_slide(prs)
header_modelo(s, "Encerramento Automático do MDF-e",
              "Piloto via macro SASCAR · 4 caminhões em teste · 28/07/2026", SW)

# =============================================================
# PRINT PROTAGONISTA — ocupa quase toda a área central
# =============================================================
tpl.add_text(s, Inches(0.5), Inches(1.45), Inches(12), Inches(0.32),
             "MACRO \"TECLADO SASMDT · ENCERRAMENTO MDFE\" — RECEBIDA EM 28/07/2026",
             size=13, bold=True, color=NAVY, font=tpl.FONTE_TITULO)

# imagem GRANDE (largura quase máxima do slide)
img_w = Inches(12.6)
img_h = int(img_w / 3.537)   # mantém proporção do PNG
img_x = (SW - img_w) / 2
img_y = Inches(1.9)
s.shapes.add_picture(SCREENSHOT, img_x, img_y, img_w, img_h)
# moldura navy discreta
tpl.add_rect(s, img_x, img_y, img_w, img_h,
             RGBColor(0xFF,0xFF,0xFF), line=NAVY)

# legenda embaixo da foto
tpl.add_text(s, Inches(0.5), img_y + img_h + Inches(0.05),
             SW - Inches(1.0), Inches(0.28),
             f"Fonte: tela SASCAR · 4 veículos enviaram a macro no mesmo dia — "
             f"sinal de que o disparo está funcionando na frota-piloto",
             size=10, color=GRAY_L, align=PP_ALIGN.CENTER)

# =============================================================
# BLOCO INFERIOR — resumo curto (1 linha do fluxo + 4 placas)
# =============================================================
y_bloco = Inches(5.5)

# banner de 1 linha do fluxo
tpl.add_rect(s, Inches(0.5), y_bloco, SW - Inches(1.0), Inches(0.55), ICE,
             corner=0.05)
fluxo_txt = ("MOTORISTA APERTA MACRO   →   SASCAR ENVIA EVENTO   →   "
             "SISTEMA PONTUAL IDENTIFICA MDF-e   →   ENCERRAMENTO AUTOMÁTICO")
tpl.add_text(s, Inches(0.5), y_bloco+Inches(0.14), SW - Inches(1.0), Inches(0.3),
             fluxo_txt, size=11, bold=True, color=NAVY,
             align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)

# 4 mini-cards das placas (finos, alinhados embaixo)
y_placas = Inches(6.2); h_placas = Inches(0.85); gap = Inches(0.15)
cwp = (SW - Inches(1.0) - gap*3) / 4
for i, (placa, modelo, bat) in enumerate(PLACAS):
    x = Inches(0.5) + (cwp + gap) * i
    tpl.add_rect(s, x, y_placas, cwp, h_placas, NAVY, corner=0.05)
    tpl.add_rect(s, x, y_placas, cwp, Inches(0.05), GOLD)
    tpl.add_text(s, x+Inches(0.15), y_placas+Inches(0.12),
                 cwp*0.55, Inches(0.35),
                 placa, size=15, bold=True, color=WHITE,
                 font=tpl.FONTE_PLACA)
    tpl.add_text(s, x+Inches(0.15), y_placas+Inches(0.48),
                 cwp-Inches(0.3), Inches(0.25),
                 modelo, size=9, color=RGBColor(0xC5,0xCC,0xE0))
    tpl.add_text(s, x+cwp-Inches(1.1), y_placas+Inches(0.15),
                 Inches(0.95), Inches(0.3),
                 f"{bat}", size=11, bold=True, color=GOLD,
                 align=PP_ALIGN.RIGHT, font=tpl.FONTE_TITULO)
    tpl.add_text(s, x+cwp-Inches(1.1), y_placas+Inches(0.42),
                 Inches(0.95), Inches(0.25),
                 "bateria", size=8, color=RGBColor(0xC5,0xCC,0xE0),
                 align=PP_ALIGN.RIGHT)

footer_modelo(s,
    "Objetivo: eliminar encerramento manual do MDF-e no XADM · "
    "Status: em validação · Fonte: SASCAR macros · Pontual Brasil Petróleo",
    SW, SH)

out = r"C:\Users\Logistica01\Downloads\Encerramento_Automatico_MDFe_Julho_2026_v2.pptx"
prs.save(out)
print(f"OK: {out}")
