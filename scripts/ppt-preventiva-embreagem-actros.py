"""
Slide único — Manutenção Preventiva Embreagem New Actros
Foto real da peça inspecionada + descrição técnica do procedimento.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# ---- paleta ----
NAVY   = tpl.NAVY
NAVY_D = tpl.NAVY_D
GOLD   = tpl.GOLD
WHITE  = tpl.WHITE
GRAY   = RGBColor(0x33, 0x36, 0x4A)
GRAY_L = RGBColor(0x7A, 0x7E, 0x92)
ICE    = RGBColor(0xEE, 0xF1, 0xFB)
ICE2   = RGBColor(0xF6, 0xF8, 0xFC)
GREEN  = RGBColor(0x1E, 0x7A, 0x34)
AMBER  = RGBColor(0xC7, 0x8C, 0x00)

FOTO = r"C:\Users\Logistica01\Pictures\Screenshots\Screenshot 2026-07-29 082318.png"

# =============================================================
# CONTEÚDO (descrição técnica)
# =============================================================
CABECALHO_INFO = [
    ("Componente",    "Conjunto de embreagem (disco + platô)"),
    ("Veículo",       "Mercedes-Benz New Actros — cavalo 3 eixos"),
    ("Tipo de OS",    "PREVENTIVA"),
    ("Intervalo",     "250.000 - 400.000 km ou por desgaste"),
]

PROCEDIMENTO = [
    "Desconectar cardan, escapamento traseiro e caixa de câmbio",
    "Remover platô e disco de embreagem — inspecionar visualmente",
    "Medir espessura do material de fricção (mín. 1,5 mm sobre rebites)",
    "Verificar molas do platô (integridade, sem fadiga ou empeno)",
    "Inspecionar rolamento hidráulico (CSC) e vedação — trocar se com folga",
    "Trocar retentor traseiro do motor e retentor dianteiro da caixa",
    "Instalar disco + platô novos com pinos-guia (torque conforme manual)",
    "Sangrar o sistema hidráulico da embreagem e testar pedal",
    "Rodar veículo em pátio, verificar engate e ausência de patinagem",
]

PONTOS_INSPECAO = [
    ("Disco",          "material de fricção acima do rebite, sem carbonização"),
    ("Platô",          "molas íntegras, superfície plana, sem trincas ou empeno"),
    ("Rolamento CSC",  "sem vazamento hidráulico, movimento suave"),
    ("Volante do motor","superfície lisa, sem sulcos ou pontos azulados"),
    ("Retentores",     "sem vazamento de óleo motor/câmbio"),
]

SINTOMAS_ALERTA = [
    "Patinagem sob carga (subida, arrancada com peso)",
    "Pedal duro, alto ou baixo demais",
    "Trepidação no engate da 1ª ou ré",
    "Ruído metálico ao pisar / soltar o pedal",
    "Cheiro de queimado após subida longa",
    "Dificuldade de engatar marchas com motor ligado",
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
                 titulo.upper(), size=24, bold=True, color=WHITE,
                 font=tpl.FONTE_TITULO)
    tpl.add_text(slide, Inches(0.5), Inches(0.82), sw-Inches(1), Inches(0.35),
                 subtitulo, size=12, color=RGBColor(0xC5,0xCC,0xE0),
                 font=tpl.FONTE_TITULO)
def footer_modelo(slide, txt, sw, sh):
    tpl.add_text(slide, Inches(0.5), sh-Inches(0.4), sw-Inches(1), Inches(0.25),
                 txt, size=9, color=GRAY_L)

def add_bullets(slide, x, y, w, h, items, size=10, bullet_color=None,
                gap=Inches(0.05), line_h=Inches(0.28)):
    """Lista com bullet quadrado amarelo/navy."""
    bullet_color = bullet_color or GOLD
    for i, txt in enumerate(items):
        row_y = y + (line_h + gap) * i
        # bullet
        tpl.add_rect(slide, x, row_y+Inches(0.09), Inches(0.09), Inches(0.09),
                     bullet_color)
        # texto
        tpl.add_text(slide, x+Inches(0.18), row_y, w-Inches(0.18), line_h,
                     txt, size=size, color=GRAY)

def info_row(slide, x, y, w, label, valor, label_w=Inches(1.35)):
    """Linha 'Label : valor' compacta."""
    tpl.add_text(slide, x, y, label_w, Inches(0.26),
                 label.upper(), size=9, bold=True, color=NAVY,
                 font=tpl.FONTE_TITULO)
    tpl.add_text(slide, x+label_w, y, w-label_w, Inches(0.26),
                 valor, size=10, color=GRAY)

# =============================================================
# DECK
# =============================================================
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = novo_slide(prs)
header_modelo(s,
    "Descrição de Manutenção Preventiva · Embreagem New Actros",
    "Frota Pontual Brasil Petróleo · 29/07/2026",
    SW)

# =============================================================
# COLUNA ESQUERDA — Foto + info da peça
# =============================================================
# foto (proporção original 0.555 W/H — retrato)
foto_h = Inches(4.7)
foto_w = int(foto_h * 0.555)   # ~2.6"
foto_x = Inches(0.55)
foto_y = Inches(1.55)
s.shapes.add_picture(FOTO, foto_x, foto_y, foto_w, foto_h)
# moldura navy
tpl.add_rect(s, foto_x, foto_y, foto_w, foto_h,
             RGBColor(0xFF,0xFF,0xFF), line=NAVY)

# legenda embaixo da foto
tpl.add_text(s, foto_x, foto_y+foto_h+Inches(0.08), foto_w, Inches(0.24),
             "PEÇA INSPECIONADA · PLATÔ DA EMBREAGEM",
             size=9, bold=True, color=NAVY, align=PP_ALIGN.CENTER,
             font=tpl.FONTE_TITULO)
tpl.add_text(s, foto_x, foto_y+foto_h+Inches(0.32), foto_w, Inches(0.24),
             "molas visíveis · disco de fricção ao redor",
             size=9, color=GRAY_L, align=PP_ALIGN.CENTER)

# CARD info da peça (abaixo da foto)
card_x = foto_x; card_y = foto_y + foto_h + Inches(0.7)
card_w = foto_w;  card_h = Inches(1.35)
tpl.add_rect(s, card_x, card_y, card_w, card_h, ICE, corner=0.05)
y = card_y + Inches(0.15)
for label, valor in CABECALHO_INFO:
    info_row(s, card_x+Inches(0.15), y, card_w-Inches(0.3), label, valor,
             label_w=Inches(0.95))
    y += Inches(0.28)

# =============================================================
# COLUNA CENTRAL — Procedimento
# =============================================================
col2_x = foto_x + foto_w + Inches(0.35)
col2_w = Inches(4.7)

# títulozinho
tpl.add_text(s, col2_x, Inches(1.55), col2_w, Inches(0.28),
             "PROCEDIMENTO DA PREVENTIVA", size=12, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
tpl.add_rect(s, col2_x, Inches(1.85), Inches(0.7), Emu(20000), GOLD)

add_bullets(s, col2_x, Inches(1.98), col2_w, Inches(3.5),
            PROCEDIMENTO, size=10, bullet_color=NAVY,
            gap=Inches(0.06), line_h=Inches(0.35))

# pontos de inspeção (abaixo do procedimento)
p2_y = Inches(5.05)
tpl.add_text(s, col2_x, p2_y, col2_w, Inches(0.28),
             "PONTOS DE INSPEÇÃO", size=12, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
tpl.add_rect(s, col2_x, p2_y+Inches(0.3), Inches(0.7), Emu(20000), GOLD)

p2_y += Inches(0.5)
for i, (item, desc) in enumerate(PONTOS_INSPECAO):
    row_y = p2_y + i * Inches(0.32)
    tpl.add_text(s, col2_x, row_y, Inches(1.4), Inches(0.28),
                 item.upper(), size=10, bold=True, color=NAVY_D)
    tpl.add_text(s, col2_x+Inches(1.4), row_y, col2_w-Inches(1.4), Inches(0.28),
                 desc, size=9, color=GRAY)

# =============================================================
# COLUNA DIREITA — Sintomas de alerta + destaque
# =============================================================
col3_x = col2_x + col2_w + Inches(0.35)
col3_w = SW - col3_x - Inches(0.5)

# card navy — sintomas de alerta
alrt_y = Inches(1.55); alrt_h = Inches(4.15)
tpl.add_rect(s, col3_x, alrt_y, col3_w, alrt_h, NAVY, corner=0.05)
tpl.add_text(s, col3_x+Inches(0.25), alrt_y+Inches(0.2), col3_w-Inches(0.5),
             Inches(0.3),
             "SINTOMAS DE ALERTA", size=12, bold=True, color=GOLD,
             font=tpl.FONTE_TITULO)
tpl.add_text(s, col3_x+Inches(0.25), alrt_y+Inches(0.55), col3_w-Inches(0.5),
             Inches(0.28),
             "sinais que indicam necessidade de intervenção imediata",
             size=9, color=RGBColor(0xC5,0xCC,0xE0))

y = alrt_y + Inches(1.05)
for i, txt in enumerate(SINTOMAS_ALERTA):
    tpl.add_rect(s, col3_x+Inches(0.25), y+Inches(0.11),
                 Inches(0.09), Inches(0.09), GOLD)
    tpl.add_text(s, col3_x+Inches(0.42), y, col3_w-Inches(0.6), Inches(0.5),
                 txt, size=10, color=WHITE)
    y += Inches(0.5)

# card amarelo — ganho/objetivo
obj_y = Inches(5.85); obj_h = Inches(1.05)
tpl.add_rect(s, col3_x, obj_y, col3_w, obj_h, GOLD, corner=0.05)
tpl.add_text(s, col3_x+Inches(0.25), obj_y+Inches(0.13), col3_w-Inches(0.5),
             Inches(0.25),
             "OBJETIVO DA PREVENTIVA", size=10, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
tpl.add_text(s, col3_x+Inches(0.25), obj_y+Inches(0.42), col3_w-Inches(0.5),
             Inches(0.5),
             "Evitar parada em rota, troca em ambiente controlado,\n"
             "custo previsível e menor tempo de veículo parado.",
             size=10, color=NAVY_D)

footer_modelo(s,
    "Fonte: manual Mercedes-Benz New Actros · Procedimento OS Pontual · "
    "Frota Pontual Brasil Petróleo",
    SW, SH)

out = r"C:\Users\Logistica01\Downloads\Preventiva_Embreagem_NewActros_2026_v2.pptx"
prs.save(out)
print(f"OK: {out}")
