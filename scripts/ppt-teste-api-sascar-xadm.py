"""
Slide único — Teste API SASCAR × X-ADM (encerramento automático MDFe)
Frase de contexto + PDF "MACRO MDFE" renderizado como imagem.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

import fitz  # pymupdf
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

NAVY   = tpl.NAVY
NAVY_D = tpl.NAVY_D
GOLD   = tpl.GOLD
WHITE  = tpl.WHITE
GRAY   = RGBColor(0x33, 0x36, 0x4A)
GRAY_L = RGBColor(0x7A, 0x7E, 0x92)
ICE    = RGBColor(0xEE, 0xF1, 0xFB)

# =============================================================
# 1) converte PDF -> PNG (alta resolução)
# =============================================================
PDF_PATH = r"C:\Users\Logistica01\Downloads\MACRO MDFE.pdf"
PNG_PATH = os.path.join(os.path.dirname(__file__), "_macro_mdfe.png")

doc = fitz.open(PDF_PATH)
page = doc[0]
# 3× a resolução default (~300 DPI equivalente)
mat = fitz.Matrix(3, 3)
pix = page.get_pixmap(matrix=mat, alpha=False)
pix.save(PNG_PATH)
PDF_W, PDF_H = page.rect.width, page.rect.height   # 842 x 595 (paisagem)
doc.close()

RATIO = PDF_W / PDF_H   # ~1.415 (paisagem)

# =============================================================
# 2) slide
# =============================================================
FRASE = ("Iniciamos os testes da API SASCAR × X-ADM. "
         "O Marcelos está analisando se não está ocorrendo nenhum erro de comunicação. "
         "Assim que estiver tudo certo, o encerramento automático do MDF-e será iniciado.")

prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = prs.slides.add_slide(prs.slide_layouts[6])
tpl.add_rect(s, 0, 0, SW, SH, WHITE)

# ---- header compacto ----
HEADER_H = Inches(0.9)
tpl.add_rect(s, 0, 0, SW, HEADER_H, NAVY)
tpl.add_rect(s, 0, 0, Inches(0.08), HEADER_H, GOLD)
tpl.add_text(s, Inches(0.5), Inches(0.16), SW-Inches(1), Inches(0.45),
             "TESTE DA API · SASCAR × X-ADM  ·  ENCERRAMENTO AUTOMÁTICO DO MDF-e",
             size=18, bold=True, color=WHITE, font=tpl.FONTE_TITULO)
tpl.add_text(s, Inches(0.5), Inches(0.55), SW-Inches(1), Inches(0.28),
             "Piloto via macro do teclado SasMDT",
             size=11, color=RGBColor(0xC5,0xCC,0xE0), font=tpl.FONTE_TITULO)

# ---- frase (banner compacto amarelo) ----
fx = Inches(0.5); fy = Inches(1.05); fw = SW - Inches(1.0); fh = Inches(0.95)
tpl.add_rect(s, fx, fy, fw, fh, ICE, corner=0.04)
tpl.add_rect(s, fx, fy, Inches(0.1), fh, GOLD)

tf = s.shapes.add_textbox(fx+Inches(0.3), fy+Inches(0.12),
                          fw-Inches(0.5), fh-Inches(0.2)).text_frame
tf.margin_left = tf.margin_right = Emu(0)
tf.margin_top = tf.margin_bottom = Emu(0)
tf.word_wrap = True
p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT; p.line_spacing = 1.2
r = p.add_run(); r.text = FRASE
r.font.name = tpl.FONTE_CORPO
r.font.size = Pt(13); r.font.color.rgb = NAVY_D; r.font.bold = True

# ---- PDF GRANDE (protagonista) ----
titulo_y = Inches(2.15)
tpl.add_text(s, Inches(0.5), titulo_y, Inches(11), Inches(0.28),
             "MACRO MDF-e · DOCUMENTO ANEXADO",
             size=11, bold=True, color=NAVY, font=tpl.FONTE_TITULO)

# imagem GRANDE do PDF
avail_h = SH - Inches(2.55) - Inches(0.35)   # sobra pro título e footer
avail_w = SW - Inches(1.0)
img_h = avail_h
img_w = int(img_h * RATIO)
if img_w > avail_w:
    img_w = avail_w
    img_h = int(img_w / RATIO)
img_x = (SW - img_w) // 2
img_y = Inches(2.55)

s.shapes.add_picture(PNG_PATH, img_x, img_y, img_w, img_h)
tpl.add_rect(s, img_x, img_y, img_w, img_h,
             RGBColor(0xFF,0xFF,0xFF), line=NAVY)

# O anexo real do PDF é feito depois via PowerPoint COM (etapa abaixo do save)
# Aqui só marca a área com uma legenda visual pro user saber onde vai aparecer.
ole_placeholder_x = Inches(0.5)
ole_placeholder_y = SH - Inches(1.9)
ole_placeholder_w = Inches(1.3)
ole_placeholder_h = Inches(1.7)
tpl.add_text(s, Inches(1.9), SH-Inches(1.5), Inches(4), Inches(0.35),
             "PDF anexado abaixo — duplo-clique para abrir",
             size=11, bold=True, color=NAVY, font=tpl.FONTE_TITULO)

# footer
tpl.add_text(s, Inches(6.5), SH-Inches(0.4), Inches(6.3), Inches(0.25),
             "Status: em teste (Marcelos) · Fonte: MACRO MDFE.pdf",
             size=9, color=GRAY_L, align=PP_ALIGN.RIGHT)

out = r"C:\Users\Logistica01\Downloads\Teste_API_SASCAR_XADM_MDFe_v4.pptx"
prs.save(out)
print(f"salvo base:  {out}")

# =============================================================
# 3) Abre com PowerPoint COM e anexa o PDF de verdade (OLE Package correto)
# =============================================================
import win32com.client
import pythoncom

ppt = win32com.client.DispatchEx("PowerPoint.Application")
try:
    pres = ppt.Presentations.Open(os.path.abspath(out), WithWindow=False)
    slide = pres.Slides(1)

    # coordenadas em pontos (1 inch = 72 pt)
    def pt_from_emu(v): return v / 914400 * 72
    ole_left = pt_from_emu(ole_placeholder_x)
    ole_top  = pt_from_emu(ole_placeholder_y)
    ole_w    = pt_from_emu(ole_placeholder_w)
    ole_h    = pt_from_emu(ole_placeholder_h)

    # Shapes.AddOLEObject com DisplayAsIcon=True embute o arquivo real como pacote
    shape = slide.Shapes.AddOLEObject(
        Left=ole_left, Top=ole_top, Width=ole_w, Height=ole_h,
        FileName=os.path.abspath(PDF_PATH),
        DisplayAsIcon=True,
        IconLabel="MACRO MDFE.pdf",
    )
    print(f"  OLE inserido via COM: {shape.Name}")

    pres.Save()
    pres.Close()
    print(f"OK final: {out}")
finally:
    ppt.Quit()

# valida
import zipfile
with zipfile.ZipFile(out) as z:
    embeds = [(n, z.getinfo(n).file_size)
              for n in z.namelist() if "embed" in n.lower()]
    print("  embeddings dentro do pptx:")
    for n, sz in embeds:
        print(f"    {n} -> {sz} bytes")

# limpa temp
if os.path.exists(PNG_PATH): os.remove(PNG_PATH)
