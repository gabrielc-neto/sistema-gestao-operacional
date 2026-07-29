"""
2 slides — Preventiva Embreagem New Actros com placa + círculos vermelhos
nas áreas destacadas pelo user (localizadas via template matching).

Slide 1: placa SES9I57 · foto 084032 · 2 círculos
Slide 2: placa SES9I82 · foto 084640 · 3 círculos
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

import cv2
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

NAVY = tpl.NAVY; GOLD = tpl.GOLD; WHITE = tpl.WHITE
RED  = RGBColor(0xE0, 0x1F, 0x1F)

# ---- entradas ----
DIR = r"C:\Users\Logistica01\Pictures\Screenshots"
SLIDES = [
    {
        "placa":  "SES9I57",
        "big":    os.path.join(DIR, "Screenshot 2026-07-29 084032.png"),
        "crops":  [
            os.path.join(DIR, "Screenshot 2026-07-29 084516.png"),
            os.path.join(DIR, "Screenshot 2026-07-29 084524.png"),
        ],
    },
    {
        "placa":  "SES9I82",
        "big":    os.path.join(DIR, "Screenshot 2026-07-29 084640.png"),
        "crops":  [
            os.path.join(DIR, "Screenshot 2026-07-29 084704.png"),
            os.path.join(DIR, "Screenshot 2026-07-29 084710.png"),
            os.path.join(DIR, "Screenshot 2026-07-29 084716.png"),
        ],
    },
]

# ---- template matching (multi-scale) ----
def localiza(big_path, crop_path):
    big  = cv2.imread(big_path,  cv2.IMREAD_COLOR)
    crop = cv2.imread(crop_path, cv2.IMREAD_COLOR)
    best = None
    for scale in [1.0, 0.75, 0.85, 1.15, 1.25, 1.5, 2.0]:
        h_c, w_c = crop.shape[:2]
        w_r = int(w_c * scale); h_r = int(h_c * scale)
        if w_r >= big.shape[1] or h_r >= big.shape[0] or w_r < 20 or h_r < 20:
            continue
        crop_r = cv2.resize(crop, (w_r, h_r), interpolation=cv2.INTER_AREA)
        res = cv2.matchTemplate(big, crop_r, cv2.TM_CCOEFF_NORMED)
        _, maxv, _, maxloc = cv2.minMaxLoc(res)
        if best is None or maxv > best[0]:
            best = (maxv, maxloc, (w_r, h_r))
    if best is None:
        return None
    score, (x, y), (w, h) = best
    return {"score": score, "x": x, "y": y, "w": w, "h": h}

# ---- deck: 1 slide com as 2 fotos lado a lado ----
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

s = prs.slides.add_slide(prs.slide_layouts[6])
tpl.add_rect(s, 0, 0, SW, SH, WHITE)

# header
tpl.add_rect(s, 0, 0, SW, Inches(1.15), NAVY)
tpl.add_rect(s, 0, 0, Inches(0.08), Inches(1.15), GOLD)
tpl.add_text(s, Inches(0.5), Inches(0.35), SW-Inches(1), Inches(0.55),
             "MANUTENÇÃO PREVENTIVA EMBREAGEM NEW ACTROS",
             size=24, bold=True, color=WHITE, font=tpl.FONTE_TITULO)

# calcula geometria comum (mesma altura pras 2 fotos)
FOTO_H  = Inches(5.4)     # altura das 2 fotos
gap     = Inches(0.6)     # espaço entre fotos
label_h = Inches(0.5)     # altura do label "Placa XXX"

# calcula larguras individuais preservando proporções
foto_ws = []
for cfg in SLIDES:
    im = cv2.imread(cfg["big"])
    H_PX, W_PX = im.shape[:2]
    foto_ws.append(int(FOTO_H * W_PX / H_PX))

total_w = foto_ws[0] + foto_ws[1] + gap
start_x = (SW - total_w) // 2
foto_y  = Inches(1.55)

# desenha cada foto + placa acima + círculos
xs = [start_x, start_x + foto_ws[0] + gap]
for cfg, foto_w, foto_x in zip(SLIDES, foto_ws, xs):
    im = cv2.imread(cfg["big"])
    H_PX, W_PX = im.shape[:2]

    # label PLACA acima da foto
    tpl.add_rect(s, foto_x, foto_y - label_h - Inches(0.08),
                 foto_w, label_h, GOLD, corner=0.15)
    tpl.add_text(s, foto_x, foto_y - label_h,
                 foto_w, Inches(0.35),
                 f"PLACA  {cfg['placa']}",
                 size=15, bold=True, color=NAVY, align=PP_ALIGN.CENTER,
                 font=tpl.FONTE_PLACA)

    # foto
    s.shapes.add_picture(cfg["big"], foto_x, foto_y, foto_w, FOTO_H)

    # círculos nos crops
    for cp in cfg["crops"]:
        r = localiza(cfg["big"], cp)
        if not r:
            print(f"  FAIL {cp}")
            continue
        pad_w = int(r["w"] * 0.10)
        pad_h = int(r["h"] * 0.10)
        px = r["x"] - pad_w
        py = r["y"] - pad_h
        pw = r["w"] + 2*pad_w
        ph = r["h"] + 2*pad_h
        emu_x = foto_x + int(foto_w * px / W_PX)
        emu_y = foto_y + int(FOTO_H * py / H_PX)
        emu_w = int(foto_w * pw / W_PX)
        emu_h = int(FOTO_H * ph / H_PX)
        shape = s.shapes.add_shape(MSO_SHAPE.OVAL, emu_x, emu_y, emu_w, emu_h)
        shape.fill.background()
        shape.line.color.rgb = RED
        shape.line.width = Pt(3.5)
        shape.shadow.inherit = False
        print(f"  OK {cfg['placa']} <- {os.path.basename(cp)} score={r['score']:.3f}")

out = r"C:\Users\Logistica01\Downloads\Preventiva_Embreagem_NewActros_placas_v2.pptx"
prs.save(out)
print(f"\nOK: {out}")
