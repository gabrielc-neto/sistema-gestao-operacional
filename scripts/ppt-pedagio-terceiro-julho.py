"""
2 slides — Pedágios Terceiros ACUMULADO Jan-Jul 2026 (modelo dos prints)
  1) Pedágios · Terceiros Contratados (KPIs + ranking Jan-Jul)
  2) Evolução Mensal · Rotas e Frota (7 barras + rotas + top frota)

Fontes:
  - Jan-Jun: Downloads/pedagios terceiro/resumo.json  (já consolidado)
  - Jul:     Downloads/Julho gasto terceiro.xlsx      (extrato STP)
"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "docs", "templates"))
from importlib import import_module
tpl = import_module("ppt-pontual-template")

from openpyxl import load_workbook
from collections import defaultdict
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# =============================================================
# PALETA
# =============================================================
NAVY   = tpl.NAVY
NAVY_D = tpl.NAVY_D
GOLD   = tpl.GOLD
WHITE  = tpl.WHITE
GRAY   = RGBColor(0x33, 0x36, 0x4A)
GRAY_L = RGBColor(0x7A, 0x7E, 0x92)
ICE    = RGBColor(0xEE, 0xF1, 0xFB)
BAR_BG = RGBColor(0xD8, 0xDE, 0xEC)

# =============================================================
# 1) BASE Jan-Jun (resumo.json)
# =============================================================
with open(r"C:\Users\Logistica01\Downloads\pedagios terceiro\resumo.json",
          "r", encoding="utf-8") as f:
    base = json.load(f)

# terceiros Jan-Jun
JANJUN_TERC = {r["nome"]: {"valor": r["valor"], "pass": r["qtd"]}
               for r in base["ranking_terceiro"]}
# rotas Jan-Jun (bidirecionais "A <> B")
JANJUN_ROTAS = {r["rota"]: {"valor": r["valor"], "pass": r["qtd"]}
                for r in base["rotas"]}
# placas Jan-Jun
JANJUN_PLACAS = {p["placa"]: {"valor": p["gasto"], "viagens": p["viagens"]}
                 for p in base["placas"]}

# meses Jan-Jun (ignora o Julho antigo do json — vamos recalcular)
MESES = [(m["mes"][:3], m["valor"]) for m in base["meses"] if m["mes"] != "Julho"]

TOTAL_JANJUN     = sum(v for _, v in MESES)
PASSAGENS_JANJUN = base["total_passagens"]
VIAGENS_JANJUN   = base["total_viagens"]

# =============================================================
# 2) JULHO — extrato STP
# =============================================================
XLSX = r"C:\Users\Logistica01\Downloads\Julho gasto terceiro.xlsx"
wb   = load_workbook(XLSX, data_only=True)
ws   = wb["DADOS"]

pas_jul = []
for row in ws.iter_rows(min_row=8, values_only=True):
    acao, desc, deb, transp, placa, rota, data_pass = \
        row[3], row[4], row[7], row[14], row[16], row[18], row[12]
    if acao != "DEBITO" or desc != "UTILIZACAO DE VALE PEDAGIO": continue
    if deb is None: continue
    pas_jul.append({
        "valor":  abs(float(deb)),
        "transp": (transp or "").strip(),
        "placa":  (placa  or "").strip(),
        "rota":   (rota   or "").strip(),
        "data":   str(data_pass or ""),
    })

TOTAL_JUL     = sum(p["valor"] for p in pas_jul)
PASSAGENS_JUL = len(pas_jul)
VIAGENS_JUL   = len({(p["placa"], p["data"]) for p in pas_jul})

# terceiros julho
jul_terc = defaultdict(lambda: {"valor":0, "pass":0})
for p in pas_jul:
    jul_terc[p["transp"]]["valor"] += p["valor"]
    jul_terc[p["transp"]]["pass"]  += 1

# rotas julho (normalizar pra "A <> B" — junta A x B com B x A)
def norm_rota(r):
    r = (r or "").strip()
    if not r: return None
    partes = [x.strip() for x in r.replace("x", " x ").split(" x ")]
    partes = [p for p in partes if p]
    if len(partes) < 2: return None
    # remove acentos e caixa alta pra chave
    key = " <> ".join(sorted(p.upper() for p in partes))
    return key

jul_rotas = defaultdict(lambda: {"valor":0, "pass":0})
for p in pas_jul:
    k = norm_rota(p["rota"])
    if not k: continue
    jul_rotas[k]["valor"] += p["valor"]
    jul_rotas[k]["pass"]  += 1

# placas julho
jul_placas = defaultdict(lambda: {"valor":0, "viagens":set()})
for p in pas_jul:
    jul_placas[p["placa"]]["valor"] += p["valor"]
    jul_placas[p["placa"]]["viagens"].add(p["data"])

# =============================================================
# 3) ACUMULADO Jan-Jul
# =============================================================
ACUM_TERC = defaultdict(lambda: {"valor":0, "pass":0})
for n, d in JANJUN_TERC.items():
    ACUM_TERC[n]["valor"] += d["valor"]; ACUM_TERC[n]["pass"] += d["pass"]
for n, d in jul_terc.items():
    ACUM_TERC[n]["valor"] += d["valor"]; ACUM_TERC[n]["pass"] += d["pass"]

ACUM_ROTAS = defaultdict(lambda: {"valor":0, "pass":0})
for r, d in JANJUN_ROTAS.items():
    ACUM_ROTAS[r]["valor"] += d["valor"]; ACUM_ROTAS[r]["pass"] += d["pass"]
for r, d in jul_rotas.items():
    ACUM_ROTAS[r]["valor"] += d["valor"]; ACUM_ROTAS[r]["pass"] += d["pass"]

ACUM_PLACAS = defaultdict(lambda: {"valor":0, "viagens":0})
for p, d in JANJUN_PLACAS.items():
    ACUM_PLACAS[p]["valor"] += d["valor"]; ACUM_PLACAS[p]["viagens"] += d["viagens"]
for p, d in jul_placas.items():
    ACUM_PLACAS[p]["valor"] += d["valor"]; ACUM_PLACAS[p]["viagens"] += len(d["viagens"])

TOTAL_ACUM     = TOTAL_JANJUN + TOTAL_JUL
PASSAGENS_ACUM = PASSAGENS_JANJUN + PASSAGENS_JUL
VIAGENS_ACUM   = VIAGENS_JANJUN   + VIAGENS_JUL
TICKET_ACUM    = TOTAL_ACUM / VIAGENS_ACUM
TRANSPS_ACUM   = len(ACUM_TERC)
PLACAS_ACUM    = len(ACUM_PLACAS)

RANK_TERC   = sorted(ACUM_TERC.items(),   key=lambda x: -x[1]["valor"])
RANK_ROTAS  = sorted(ACUM_ROTAS.items(),  key=lambda x: -x[1]["pass"])[:6]
RANK_PLACAS = sorted(ACUM_PLACAS.items(), key=lambda x: -x[1]["viagens"])[:6]
TOP_TERC_NOME  = RANK_TERC[0][0]
CONC_1         = RANK_TERC[0][1]["valor"] / TOTAL_ACUM * 100
ROTA_TOP_NOME  = RANK_ROTAS[0][0]
ROTA_TOP_PASS  = RANK_ROTAS[0][1]["pass"]

# evolução mensal com Jul incluso
EVOLUCAO = [(m[:3], v) for m, v in MESES] + [("Jul", TOTAL_JUL)]
MES_PICO = max(EVOLUCAO, key=lambda x: x[1])
MES_ANT  = EVOLUCAO[-2]
VAR_ANT  = (TOTAL_JUL - MES_ANT[1]) / MES_ANT[1] * 100

# =============================================================
# 4) HELPERS DE DESENHO
# =============================================================
def brl(v):
    return f"R$ {v:,.2f}".replace(",","X").replace(".",",").replace("X",".")
def brl_k(v):
    return f"R$ {v/1000:.1f}k".replace(".",",")
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
def kpi_ice_grande(slide, x, y, w, h, label, valor, sub=""):
    tpl.add_rect(slide, x, y, w, h, ICE, corner=0.05)
    tpl.add_text(slide, x+Inches(0.25), y+Inches(0.18), w-Inches(0.5), Inches(0.25),
                 label.upper(), size=9, bold=True, color=NAVY, font=tpl.FONTE_TITULO)
    tpl.add_text(slide, x+Inches(0.25), y+Inches(0.45), w-Inches(0.5), Inches(0.55),
                 valor, size=20, bold=True, color=NAVY_D, font=tpl.FONTE_TITULO)
    if sub:
        tpl.add_text(slide, x+Inches(0.25), y+h-Inches(0.35), w-Inches(0.5), Inches(0.25),
                     sub, size=9, color=GRAY_L)
def kpi_navy_num(slide, x, y, w, h, valor_amarelo, label):
    tpl.add_rect(slide, x, y, w, h, NAVY, corner=0.05)
    tpl.add_text(slide, x+Inches(0.25), y+Inches(0.15), w-Inches(0.5), Inches(0.55),
                 valor_amarelo, size=26, bold=True, color=GOLD, font=tpl.FONTE_TITULO)
    tpl.add_text(slide, x+Inches(0.25), y+h-Inches(0.4), w-Inches(0.5), Inches(0.3),
                 label, size=10, bold=True, color=WHITE, font=tpl.FONTE_TITULO)
def rank_row_pedagio(slide, x, y, w, pos, nome, sub, valor_txt, valor, valor_max):
    fill  = GOLD if pos == 1 else NAVY
    txt_c = NAVY if pos == 1 else WHITE
    tpl.add_rect(slide, x, y, Inches(0.55), Inches(0.42), fill, corner=0.1)
    tpl.add_text(slide, x, y+Inches(0.06), Inches(0.55), Inches(0.32),
                 f"{pos}º", size=13, bold=True, color=txt_c,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)
    nx = x + Inches(0.7)
    tpl.add_text(slide, nx, y, Inches(3.6), Inches(0.24),
                 nome.upper()[:38], size=10, bold=True, color=NAVY)
    tpl.add_text(slide, nx, y+Inches(0.22), Inches(3.6), Inches(0.22),
                 sub, size=9, color=GRAY_L)
    bar_x    = x + Inches(4.5)
    bar_wmax = w - Inches(6.2)
    tpl.add_rect(slide, bar_x, y+Inches(0.14), bar_wmax, Inches(0.15), BAR_BG)
    fill_w = int(bar_wmax * (valor / valor_max))
    fill_c = GOLD if pos == 1 else NAVY
    tpl.add_rect(slide, bar_x, y+Inches(0.14), fill_w, Inches(0.15), fill_c)
    tpl.add_text(slide, x + w - Inches(1.6), y+Inches(0.09),
                 Inches(1.6), Inches(0.28),
                 valor_txt, size=11, bold=True, color=NAVY, align=PP_ALIGN.RIGHT)

# =============================================================
# DECK
# =============================================================
prs = tpl.novo_deck()
SW, SH = prs.slide_width, prs.slide_height

# ---- SLIDE 1 — Pedágios Terceiros Contratados (acumulado Jan-Jul) ----
s1 = novo_slide(prs)
header_modelo(s1, "Pedágios · Terceiros Contratados",
              "Consumo de vale-pedágio · Janeiro a Julho de 2026", SW)

y0 = Inches(1.5); h0 = Inches(1.15); gap = Inches(0.2)
cw = (SW - Inches(1.0) - gap*3) / 4
kpi_ice_grande(s1, Inches(0.5),               y0, cw, h0,
               "Total gasto", brl(TOTAL_ACUM), f"{PASSAGENS_ACUM} passagens")
kpi_ice_grande(s1, Inches(0.5)+cw+gap,        y0, cw, h0,
               "Viagens realizadas", str(VIAGENS_ACUM), "mesma placa+dia = 1 viagem")
kpi_ice_grande(s1, Inches(0.5)+(cw+gap)*2,    y0, cw, h0,
               "Ticket médio / viagem", brl(TICKET_ACUM), "gasto médio por viagem completa")
kpi_ice_grande(s1, Inches(0.5)+(cw+gap)*3,    y0, cw, h0,
               "Concentração 1º colocado",
               f"{CONC_1:.1f}%".replace(".",","), TOP_TERC_NOME[:32])

y1 = Inches(2.85); h1 = Inches(1.1)
cw3 = (SW - Inches(1.0) - gap*2) / 3
kpi_navy_num(s1, Inches(0.5),               y1, cw3, h1,
             str(TRANSPS_ACUM), "TRANSPORTADORES TERCEIROS")
kpi_navy_num(s1, Inches(0.5)+cw3+gap,        y1, cw3, h1,
             f"{PLACAS_ACUM}+", "PLACAS COM MOVIMENTO")
kpi_navy_num(s1, Inches(0.5)+(cw3+gap)*2,    y1, cw3, h1,
             f"{ROTA_TOP_PASS}x", f"ROTA TOP · {ROTA_TOP_NOME[:28]}")

tpl.add_text(s1, Inches(0.5), Inches(4.2), Inches(10), Inches(0.3),
             "RANKING DE TERCEIROS · SALDO CONSUMIDO SEM PARAR",
             size=12, bold=True, color=NAVY, font=tpl.FONTE_TITULO)

y = Inches(4.65)
row_step = Inches(0.5)
maior_terc = RANK_TERC[0][1]["valor"]
for i, (nome, d) in enumerate(RANK_TERC[:6], start=1):
    rank_row_pedagio(s1, Inches(0.5), y, SW - Inches(1.0), i,
                     nome, f"{d['pass']} passagens",
                     brl(d["valor"]), d["valor"], maior_terc)
    y += row_step

footer_modelo(s1,
    f"Total geral: {brl(TOTAL_ACUM)} · Terceiro dominante: {TOP_TERC_NOME} "
    f"({CONC_1:.1f}% do total)".replace(".",",") +
    " · Fonte: extratos STP Sem Parar (vale-pedágio) · Pontual Brasil Petróleo",
    SW, SH)

# ---- SLIDE 2 — Evolução Mensal · Rotas e Frota ----
s2 = novo_slide(prs)
header_modelo(s2, "Evolução Mensal · Rotas e Frota",
              "Gasto mês a mês, rotas mais frequentes e placas com maior uso", SW)

tpl.add_text(s2, Inches(0.5), Inches(1.5), Inches(8), Inches(0.3),
             "EVOLUÇÃO MENSAL DO GASTO COM PEDÁGIO",
             size=11, bold=True, color=NAVY, font=tpl.FONTE_TITULO)

bar_area_x = Inches(0.7)
bar_area_y = Inches(2.0)
bar_area_w = Inches(7.7)
bar_area_h = Inches(2.3)

maior_mes = max(v for _, v in EVOLUCAO)
n = len(EVOLUCAO)
slot_w = bar_area_w / n
bar_w  = int(slot_w * 0.5)

for i, (mes, v) in enumerate(EVOLUCAO):
    bh = int(bar_area_h * (v / maior_mes))
    bx = int(bar_area_x + slot_w * i + (slot_w - bar_w)/2)
    by = int(bar_area_y + bar_area_h - bh)
    cor = GOLD if (mes, v) == MES_PICO else NAVY
    tpl.add_rect(s2, bx, by, bar_w, bh, cor)
    tpl.add_text(s2, int(bx - Inches(0.2)), int(by - Inches(0.32)),
                 int(bar_w + Inches(0.4)), Inches(0.28),
                 brl_k(v), size=9, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
    tpl.add_text(s2, int(bx - Inches(0.2)),
                 int(bar_area_y + bar_area_h + Inches(0.05)),
                 int(bar_w + Inches(0.4)), Inches(0.25),
                 mes, size=10, bold=True, color=GRAY,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)

# card MÊS PICO
cx = Inches(9.0); cy = Inches(1.6); cw = Inches(3.9); ch = Inches(2.9)
tpl.add_rect(s2, cx, cy, cw, ch, NAVY, corner=0.05)
pad = Inches(0.28)
tpl.add_text(s2, cx+pad, cy+Inches(0.18), cw-pad*2, Inches(0.25),
             "MÊS PICO DO PERÍODO", size=9, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)
nome_pico_full = {"Jan":"Janeiro","Fev":"Fevereiro","Mar":"Março","Abr":"Abril",
                  "Mai":"Maio","Jun":"Junho","Jul":"Julho"}[MES_PICO[0]]
tpl.add_text(s2, cx+pad, cy+Inches(0.45), cw-pad*2, Inches(0.7),
             nome_pico_full, size=32, bold=True, color=WHITE,
             font=tpl.FONTE_TITULO)
tpl.add_text(s2, cx+pad, cy+Inches(1.2), cw-pad*2, Inches(0.5),
             brl(MES_PICO[1]), size=22, bold=True, color=GOLD,
             font=tpl.FONTE_TITULO)
nome_ant_full = {"Jan":"Janeiro","Fev":"Fevereiro","Mar":"Março","Abr":"Abril",
                 "Mai":"Maio","Jun":"Junho","Jul":"Julho"}[MES_ANT[0]]
tpl.add_text(s2, cx+pad, cy+Inches(1.85), cw-pad*2, Inches(0.35),
             f"{VAR_ANT:+.1f}% vs {nome_ant_full}".replace(".",","),
             size=13, bold=True, color=WHITE, font=tpl.FONTE_TITULO)
tpl.add_text(s2, cx+pad, cy+Inches(2.25), cw-pad*2, Inches(0.3),
             "maior consumo mensal do período",
             size=10, color=RGBColor(0xC5, 0xCC, 0xE0))

# rotas mais frequentes
tpl.add_text(s2, Inches(0.5), Inches(4.9), Inches(6), Inches(0.3),
             "ROTAS MAIS FREQUENTES", size=11, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
y = Inches(5.3)
maior_rota = RANK_ROTAS[0][1]["pass"]
for i, (nome, d) in enumerate(RANK_ROTAS, start=1):
    tpl.add_text(s2, Inches(0.5), y, Inches(0.3), Inches(0.24),
                 f"{i}.", size=10, bold=True, color=NAVY, font=tpl.FONTE_TITULO)
    tpl.add_text(s2, Inches(0.85), y, Inches(3.5), Inches(0.24),
                 nome[:36], size=10, bold=True, color=NAVY)
    bar_x = Inches(4.3); bar_wmax = Inches(2.6)
    tpl.add_rect(s2, bar_x, y+Inches(0.08), bar_wmax, Inches(0.1), BAR_BG)
    fill_w = int(bar_wmax * (d["pass"] / maior_rota))
    tpl.add_rect(s2, bar_x, y+Inches(0.08), fill_w, Inches(0.1), NAVY)
    tpl.add_text(s2, Inches(0.85), y+Inches(0.22), Inches(3.5), Inches(0.2),
                 f"{d['pass']} passagens", size=8, color=GRAY_L)
    tpl.add_text(s2, Inches(6.4), y+Inches(0.02), Inches(1.6), Inches(0.24),
                 brl(d["valor"]), size=10, bold=True, color=NAVY,
                 align=PP_ALIGN.RIGHT)
    y += Inches(0.38)

# top frota
tpl.add_text(s2, Inches(8.5), Inches(4.9), Inches(5), Inches(0.3),
             "VIAGENS POR PLACA · TOP FROTA", size=11, bold=True, color=NAVY,
             font=tpl.FONTE_TITULO)
y = Inches(5.3)
maior_placa = RANK_PLACAS[0][1]["viagens"]
for i, (placa, d) in enumerate(RANK_PLACAS, start=1):
    fill = GOLD if i == 1 else NAVY
    txtc = NAVY if i == 1 else WHITE
    tpl.add_rect(s2, Inches(8.5), y, Inches(0.4), Inches(0.24), fill, corner=0.1)
    tpl.add_text(s2, Inches(8.5), y+Inches(0.02), Inches(0.4), Inches(0.22),
                 str(i), size=9, bold=True, color=txtc,
                 align=PP_ALIGN.CENTER, font=tpl.FONTE_TITULO)
    tpl.add_text(s2, Inches(9.0), y-Inches(0.02), Inches(1.3), Inches(0.28),
                 placa, size=11, bold=True, color=NAVY, font=tpl.FONTE_PLACA)
    tpl.add_text(s2, Inches(9.0), y+Inches(0.22), Inches(1.5), Inches(0.2),
                 f"{d['viagens']} viagens", size=8, color=GRAY_L)
    bar_x = Inches(10.4); bar_wmax = Inches(1.6)
    tpl.add_rect(s2, bar_x, y+Inches(0.08), bar_wmax, Inches(0.1), BAR_BG)
    fill_w = int(bar_wmax * (d["viagens"] / maior_placa))
    tpl.add_rect(s2, bar_x, y+Inches(0.08), fill_w, Inches(0.1), NAVY if i>1 else GOLD)
    tpl.add_text(s2, Inches(12.1), y+Inches(0.02), Inches(1.1), Inches(0.24),
                 brl(d["valor"]), size=9, bold=True, color=NAVY,
                 align=PP_ALIGN.RIGHT)
    y += Inches(0.38)

footer_modelo(s2,
    "Metodologia: mesma placa + mesma data = 1 viagem (paradas somadas) · "
    "Fonte: extratos STP Sem Parar · Pontual Brasil Petróleo",
    SW, SH)

out = r"C:\Users\Logistica01\Downloads\Pedagios_Terceiros_Jan-Jul_2026.pptx"
prs.save(out)
print(f"OK: {out}")
print(f"Acumulado Jan-Jul: {brl(TOTAL_ACUM)} · {PASSAGENS_ACUM} pass · {VIAGENS_ACUM} viagens")
print(f"Julho isolado: {brl(TOTAL_JUL)} ({VAR_ANT:+.1f}% vs Junho) — {'NOVO MÊS PICO' if MES_PICO[0]=='Jul' else 'Junho segue como pico'}")
