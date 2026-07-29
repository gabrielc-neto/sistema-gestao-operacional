"""
Escaneia Downloads/frota/ e gera preview de docs de veículo pra revisão.
Não grava nada no sistema — só produz preview-docs-frota.xlsx.

Regras (definidas com user 2026-07-28):
- Ignora pastas: veloe, venda atv, saveiros
- Pastas (DESLIGADO): processa veículos normalmente
- Arquivo "LICENÇA DER SÃO PAULO": ignora (não vai pra SP)
- Arquivos motorista (CNH/MOPP/NR20/NR35/comp-endereco): ignora
- Placas: mercosul (AAA0A00) + antiga (AAA0000)
"""
import os
import re
import sys
from pathlib import Path
from datetime import datetime

# Windows: força stdout em UTF-8 pra evitar crash com → çãí etc
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import openpyxl
except ImportError:
    print("openpyxl não instalado. rodar: pip install openpyxl pypdf")
    sys.exit(1)

try:
    from pypdf import PdfReader
    PDF_OK = True
except ImportError:
    PDF_OK = False
    print("[aviso] pypdf não instalado")

try:
    import fitz  # pymupdf
    FITZ_OK = True
except ImportError:
    FITZ_OK = False

# OCR sob demanda (carrega devagar, só quando precisar)
_OCR_READER = None
def get_ocr():
    global _OCR_READER
    if _OCR_READER is None:
        try:
            import easyocr
            print("[info] carregando easyocr (1x, ~15s)...")
            _OCR_READER = easyocr.Reader(['pt'], gpu=False, verbose=False)
        except Exception as e:
            print(f"[erro ocr] {e}")
            _OCR_READER = False
    return _OCR_READER if _OCR_READER else None

FROTA = Path("C:/Users/Logistica01/Downloads/frota")
OUT_XLSX = Path("C:/Users/Logistica01/projetos/logistica-ia/scripts/preview-docs-frota.xlsx")
VEICULOS_CSV = Path("C:/Users/Logistica01/projetos/logistica-ia/scripts/tmp-veiculos.csv")

IGNORAR_PASTAS = {"veloe", "venda atv", "saveiros"}
IGNORAR_ARQUIVO_KEYWORDS = ["LICENÇA DER SÃO PAULO", "LICENÇA DER SP", "LICENCA DER SAO PAULO", "LICENCA DER SP", "LICENSA DER SP"]

# ────────────────────────── Regex ──────────────────────────
PLACA_MERC = re.compile(r"(?<![A-Z0-9])([A-Z]{3})[- ]?(\d)([A-Z])(\d{2})(?![A-Z0-9])")
PLACA_ANTIGA = re.compile(r"(?<![A-Z0-9])([A-Z]{3})[- ]?(\d{4})(?![A-Z0-9])")

# usa lookahead/lookbehind ao invés de \b porque _ é word char e nomes tipo CRLV_AWA6090 quebravam \b
def _rx(p):
    return re.compile(r"(?<![A-Z0-9])(?:" + p + r")(?![A-Z])", re.I)

# NF de veículo — pode substituir CIV se chassi bater + emissão < 1 ano (regra user 2026-07-28)
NF_KEYWORDS = re.compile(
    r"(?<![A-Z0-9])(?:NF|NFE|NOTA[- _]?FISCAL|NORDICA)(?![A-Z])",
    re.I,
)

TIPO_MAP = [
    (_rx(r"CRLV|CLRV"), "crlv"),
    (_rx(r"CIPP|CTPP"), "cipp"),
    (_rx(r"CIV"), "civ"),
    (_rx(r"AFERI[CÇ][AÃ]O|IPEM"), "ipem"),
    (_rx(r"CRONOTAC[OÓ]GRAFO|TAC[OÓ]GRAFO"), "tacografo"),
    (_rx(r"EXTINTOR"), "extintor"),
    (_rx(r"FEDERAL|DNIT"), "licenca_federal"),
    (_rx(r"PARAN[AÁ]"), "licenca_parana"),
    (_rx(r"AET"), "aet"),
    (_rx(r"RNTRC"), "rntrc"),
    (NF_KEYWORDS, "nf"),  # NF: pode substituir CIV se chassi bater + < 1 ano
    (re.compile(r"certificado[_ -]*final", re.I), "certificado_generico"),
]

MOTORISTA_KEYWORDS = re.compile(
    r"(?<![A-Z0-9])(?:CNH|MOPP|MOOP|NR[- ]?01|NR[- ]?20|NR[- ]?35|COMPROVANTE|COMP[.\s]*ENDERE|TOXICOL|ASO|RESID[EÊ]NCIA|ENDERECO|ENDERE[CÇ]O|INTEGRA[CÇ][AÃ]O)(?![A-Z])",
    re.I,
)
# Anexos que ignoro sempre (não são doc)
IGNORAR_ARQUIVO_TIPO = re.compile(
    r"(?<![A-Z0-9])(?:OR[CÇ]AMENTO|BOLETO|RECIBO|LICEN[CÇ]A\s+SP|LICEN[CÇ]A\s+S[AÃ]O\s+PAULO)(?![A-Z])",
    re.I,
)
EXT_IGNORAR = {".pptx", ".xlsx", ".docx", ".txt", ".zip", ".rar"}

# Chassi VIN — 17 caracteres alfanuméricos, sem I/O/Q. Ex: 9BSRPP0002R123456
CHASSI_RX = re.compile(r"(?<![A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?![A-Z0-9])")

def anos_desde(data):
    if not data: return None
    hoje = datetime.now().date()
    return (hoje - data).days / 365.25

DATA_VEC_NOME = re.compile(r"(?:vec|venc(?:e|imento)?)[-_ ]*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})", re.I)
DATA_GENERICA = re.compile(r"(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})")

DATA_PDF_PATTERNS = [
    re.compile(r"v[aá]lid[oa]?\s*(?:at[eé])?[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"vencimento[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"venc(?:imento)?\.?\s*(?:em)?[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"validade[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"pr[oó]xim[oa]\s+(?:inspe[cç][aã]o|afer[ií][cç][aã]o|revis[aã]o)[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})", re.I),
    re.compile(r"exerc[ií]cio[:\s]*(20\d{2})", re.I),  # CRLV: exercício = 31/12/ano
]

# Última linha de fallback: data mais no futuro encontrada no texto
DATA_QUALQUER = re.compile(r"(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})")

# ────────────────────── Utils ──────────────────────
def normaliza_placa(p):
    return re.sub(r"[^A-Z0-9]", "", (p or "").upper())

def carrega_veiculos():
    veics = {}
    if not VEICULOS_CSV.exists():
        print(f"[erro] {VEICULOS_CSV} não existe. Rode a query PG antes.")
        sys.exit(1)
    with open(VEICULOS_CSV, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or "|" not in line:
                continue
            placa, tipo = line.split("|", 1)
            veics[normaliza_placa(placa)] = tipo.strip()
    return veics

def extrai_placas(texto):
    """Retorna set de placas normalizadas encontradas no texto."""
    achadas = set()
    for m in PLACA_MERC.finditer(texto.upper()):
        achadas.add(f"{m.group(1)}{m.group(2)}{m.group(3)}{m.group(4)}")
    for m in PLACA_ANTIGA.finditer(texto.upper()):
        # antiga: 3 letras + 4 números
        p = f"{m.group(1)}{m.group(2)}"
        # rejeita se for na verdade mercosul (já pegou acima)
        if not any(p == a for a in achadas):
            achadas.add(p)
    return achadas

def detecta_tipo(nome):
    for pat, tipo in TIPO_MAP:
        if pat.search(nome):
            return tipo
    return None

def extrai_data_do_nome(nome):
    m = DATA_VEC_NOME.search(nome)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        if len(y) == 2:
            y = "20" + y
        try:
            dt = datetime(int(y), int(mo), int(d))
            return dt.date(), "nome(vec-)"
        except ValueError:
            return None, None
    m = DATA_GENERICA.search(nome)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        try:
            dt = datetime(int(y), int(mo), int(d))
            return dt.date(), "nome(generico)"
        except ValueError:
            return None, None
    return None, None

def _extrai_texto_pypdf(caminho):
    if not PDF_OK: return ""
    try:
        reader = PdfReader(str(caminho))
        texto = ""
        for pg in reader.pages[:3]:
            try: texto += pg.extract_text() or ""
            except Exception: pass
        return texto
    except Exception:
        return ""

OCR_DISABLED = "--sem-ocr" in sys.argv

def _extrai_texto_ocr(caminho):
    """Renderiza pdf/imagem e roda easyocr. Retorna texto ou ''. Faz cleanup agressivo."""
    if OCR_DISABLED: return ""
    reader = get_ocr()
    if not reader: return ""
    import gc
    texto = ""
    doc = None
    try:
        # tenta abrir como PDF via pymupdf
        if FITZ_OK:
            try:
                doc = fitz.open(str(caminho))
                paginas_ok = min(1, len(doc))  # só 1 pág pra economizar memória
                for pg_idx in range(paginas_ok):
                    pix = doc[pg_idx].get_pixmap(dpi=150)  # dpi menor
                    png_bytes = pix.tobytes("png")
                    del pix
                    try:
                        results = reader.readtext(png_bytes, detail=0, paragraph=True)
                        texto += "\n".join(results) + "\n"
                    except Exception as e:
                        print(f"    [ocr-fail] {caminho.name}: {e.__class__.__name__}", flush=True)
                    del png_bytes
            except Exception as e_fitz:
                # arquivo pode ser jpeg com extensão .pdf
                try:
                    with open(caminho, "rb") as f:
                        img_bytes = f.read()
                    if len(img_bytes) < 15_000_000:  # <15MB, senão skip
                        results = reader.readtext(img_bytes, detail=0, paragraph=True)
                        texto += "\n".join(results) + "\n"
                    del img_bytes
                except Exception as e2:
                    print(f"    [img-fail] {caminho.name}: {e2.__class__.__name__}", flush=True)
    finally:
        try:
            if doc is not None: doc.close()
        except Exception: pass
        gc.collect()
    return texto

def _procura_data_no_texto(texto):
    """Tenta padrões específicos, senão pega a data mais no futuro."""
    for pat in DATA_PDF_PATTERNS:
        m = pat.search(texto)
        if m:
            grupos = m.groups()
            if len(grupos) == 3:
                d, mo, y = grupos
                try:
                    dt = datetime(int(y), int(mo), int(d))
                    return dt.date(), "regex-especifico"
                except ValueError:
                    continue
            elif len(grupos) == 1:
                y = int(grupos[0])
                dt = datetime(y, 12, 31)
                return dt.date(), "exercicio-ano"

    # fallback: data mais no futuro (a partir de hoje)
    hoje = datetime.now().date()
    melhor = None
    for m in DATA_QUALQUER.finditer(texto):
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
            if dt > hoje and (melhor is None or dt > melhor):
                melhor = dt
        except ValueError:
            continue
    if melhor:
        return melhor, "data-mais-futura"
    return None, None

def extrai_data_do_pdf(caminho):
    # 1) tenta texto nativo do PDF
    texto = _extrai_texto_pypdf(caminho)
    if texto:
        data, fonte = _procura_data_no_texto(texto)
        if data:
            return data, f"pdf-texto({fonte})"

    # 2) fallback OCR (mais lento)
    texto = _extrai_texto_ocr(caminho)
    if texto:
        data, fonte = _procura_data_no_texto(texto)
        if data:
            return data, f"pdf-ocr({fonte})"
        return None, "ocr-sem-data-detectada"
    return None, "sem-texto-nem-ocr"

def _texto_completo_pdf(caminho):
    """Retorna texto completo do PDF (nativo, cai pra OCR se vazio)."""
    t = _extrai_texto_pypdf(caminho)
    if t and len(t) > 50:
        return t
    return _extrai_texto_ocr(caminho) or t

def extrai_chassi_e_emissao(caminho):
    """Pra NF/CRLV: retorna (chassi, data_emissao) ou (None, None)."""
    texto = _texto_completo_pdf(caminho)
    if not texto:
        return None, None
    # chassi (VIN 17 chars)
    chassi = None
    for m in CHASSI_RX.finditer(texto.upper()):
        chassi = m.group(1)
        break
    # data emissão: pega primeira data plausível no PDF
    emissao = None
    for m in DATA_QUALQUER.finditer(texto):
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
            # aceita datas de 2015 até hoje (emissão realista)
            if datetime(2015, 1, 1).date() <= dt <= datetime.now().date():
                emissao = dt
                break
        except ValueError:
            continue
    return chassi, emissao

def resolve_placa_alvo(placas_arq, placas_pasta, tipo_doc, veiculos):
    """
    Decide pra qual placa o documento vale:
    - Se arquivo tem 1 placa clara → usa
    - Se arquivo tem várias placas → prioriza a que bate com tipo_doc:
      - CIPP/IPEM/AFERIÇÃO → sempre CARRETA (não tem em cavalo)
      - CRLV/CIV/CRONOTACÓGRAFO/AET/FEDERAL/PARANA → o veículo em que tá anexado
    - Se arquivo não tem placa → pega das placas da pasta
    """
    candidatas = placas_arq if placas_arq else placas_pasta
    if not candidatas:
        return None, "sem-placa-detectada"

    # filtra apenas placas que existem no cadastro
    cad = [p for p in candidatas if p in veiculos]
    if not cad:
        return None, f"placas {candidatas} nao cadastradas"

    if len(cad) == 1:
        return cad[0], "unica"

    # múltiplas — usa tipo pra desambiguar
    if tipo_doc in ("cipp", "ipem"):
        carretas = [p for p in cad if veiculos[p] == "carreta"]
        if len(carretas) == 1:
            return carretas[0], "tipo→carreta"
        if len(carretas) > 1:
            return None, f"ambiguo carretas={carretas}"
    if tipo_doc in ("tacografo",):
        cavalos = [p for p in cad if veiculos[p] == "cavalo"]
        if len(cavalos) == 1:
            return cavalos[0], "tipo→cavalo"
        if len(cavalos) > 1:
            return None, f"ambiguo cavalos={cavalos}"

    # sem regra clara: retorna primeira, marca ambíguo
    return cad[0], f"ambiguo entre {cad}"

# ────────────────────── Checkpoint ──────────────────────
def _salvar_checkpoint(linhas):
    """Salva xlsx parcial pra não perder progresso se crashar"""
    try:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Preview"
        headers = ["pasta", "arquivo", "placa", "placa_motivo", "tipo", "vencimento", "fonte_data", "confianca", "motivo"]
        ws.append(headers)
        for l in linhas:
            ws.append([l.get(h, "") for h in headers])
        wb.save(OUT_XLSX)
    except Exception as e:
        print(f"  [ckp-fail] {e}", flush=True)

# ────────────────────── Main ──────────────────────
def main():
    if not FROTA.exists():
        print(f"[erro] {FROTA} não existe")
        sys.exit(1)

    veiculos = carrega_veiculos()
    print(f"[info] {len(veiculos)} veículos cadastrados")

    linhas = []
    total_arq = 0
    ignorados = 0

    for pasta in sorted(FROTA.iterdir()):
        if not pasta.is_dir():
            continue
        nome_pasta_low = pasta.name.lower()
        if any(x in nome_pasta_low for x in IGNORAR_PASTAS):
            print(f"[skip pasta] {pasta.name}")
            continue

        placas_pasta = extrai_placas(pasta.name)

        for arq in sorted(pasta.iterdir()):
            if not arq.is_file() or arq.name.lower() == "thumbs.db":
                continue
            if arq.suffix.lower() in EXT_IGNORAR:
                ignorados += 1
                continue
            total_arq += 1
            nome = arq.name

            # ignora licença SP
            if any(kw in nome.upper() for kw in [k.upper() for k in IGNORAR_ARQUIVO_KEYWORDS]):
                ignorados += 1
                continue

            # ignora arquivos de motorista
            if MOTORISTA_KEYWORDS.search(nome):
                ignorados += 1
                continue

            # ignora NF/orçamento/boleto/etc (não são doc de veículo)
            if IGNORAR_ARQUIVO_TIPO.search(nome):
                ignorados += 1
                continue

            tipo = detecta_tipo(nome)
            # "certificado_generico": resolve pelo tipo do veículo
            if tipo == "certificado_generico":
                pl_temp = extrai_placas(nome)
                cad = [p for p in pl_temp if p in veiculos]
                if cad and veiculos[cad[0]] == "cavalo":
                    tipo = "tacografo"
                elif cad and veiculos[cad[0]] == "carreta":
                    tipo = "cipp"
                else:
                    tipo = None  # sem placa → deixa user resolver

            if not tipo:
                linhas.append({
                    "pasta": pasta.name,
                    "arquivo": nome,
                    "placa": "",
                    "placa_motivo": "",
                    "tipo": "",
                    "vencimento": "",
                    "fonte_data": "",
                    "confianca": "baixa",
                    "motivo": "tipo-nao-detectado",
                })
                continue

            placas_arq = extrai_placas(nome)
            # Regra especial NF: sempre associa ao cavalo da pasta (chassi de cavalo)
            if tipo == "nf":
                cavalos_pasta = [p for p in placas_pasta if p in veiculos and veiculos[p] == "cavalo"]
                if len(cavalos_pasta) == 1:
                    placa, placa_motivo = cavalos_pasta[0], "nf→cavalo-pasta"
                elif len(cavalos_pasta) > 1:
                    placa, placa_motivo = None, f"nf ambigua entre cavalos {cavalos_pasta}"
                else:
                    placa, placa_motivo = None, "nf sem cavalo na pasta"
            else:
                placa, placa_motivo = resolve_placa_alvo(placas_arq, placas_pasta, tipo, veiculos)

            data, fonte = extrai_data_do_nome(nome)
            if not data:
                data, fonte = extrai_data_do_pdf(arq)

            # print progresso a cada 25 arquivos + checkpoint a cada 50
            if total_arq % 25 == 0:
                print(f"  ... processados {total_arq} arquivos", flush=True)
            if total_arq % 50 == 0 and total_arq > 0:
                _salvar_checkpoint(linhas)

            # confiança
            if placa and data and fonte and "nome" in fonte:
                conf = "alta"
            elif placa and data:
                conf = "media"
            else:
                conf = "baixa"

            motivo = []
            if not placa: motivo.append(placa_motivo)
            if not data: motivo.append(fonte or "sem-data")
            if "ambiguo" in (placa_motivo or ""): motivo.append(placa_motivo)

            linhas.append({
                "pasta": pasta.name,
                "arquivo": nome,
                "placa": placa or "",
                "placa_motivo": placa_motivo,
                "tipo": tipo,
                "vencimento": data.strftime("%Y-%m-%d") if data else "",
                "fonte_data": fonte or "",
                "confianca": conf,
                "motivo": " | ".join(motivo),
            })

    # === Segunda passada: resolve NF → substitui CIV do cavalo se chassi bater e < 1 ano ===
    from collections import defaultdict
    por_pasta = defaultdict(list)
    for l in linhas:
        por_pasta[l["pasta"]].append(l)

    for pasta_nome, itens in por_pasta.items():
        # Identifica NFs e CIVs de cavalos na pasta
        cavalos_da_pasta = [p for p in extrai_placas(pasta_nome) if p in veiculos and veiculos[p] == "cavalo"]
        if not cavalos_da_pasta:
            continue  # sem cavalo na pasta, NF não vira CIV
        for cavalo in cavalos_da_pasta:
            civs = [l for l in itens if l["tipo"] == "civ" and l["placa"] == cavalo]
            if civs:
                # tem CIV real → marca NFs como "ignorar (já tem CIV real)"
                for l in itens:
                    if l["tipo"] == "nf" and l.get("_chassi_cavalo") in (None, ""):
                        pass
                continue

            # Não tem CIV do cavalo → tenta usar NF
            nfs = [l for l in itens if l["tipo"] == "nf"]
            crlvs_cavalo = [l for l in itens if l["tipo"] == "crlv" and l["placa"] == cavalo]
            if not nfs:
                continue
            # extrai chassi do CRLV do cavalo
            chassi_crlv = None
            if crlvs_cavalo:
                cam = Path(FROTA) / pasta_nome / crlvs_cavalo[0]["arquivo"]
                if cam.exists():
                    chassi_crlv, _ = extrai_chassi_e_emissao(cam)

            for nf in nfs:
                cam_nf = Path(FROTA) / pasta_nome / nf["arquivo"]
                chassi_nf, emissao_nf = extrai_chassi_e_emissao(cam_nf) if cam_nf.exists() else (None, None)
                nf["_chassi_nf"] = chassi_nf or ""
                nf["_chassi_crlv"] = chassi_crlv or ""

                if not chassi_nf:
                    nf["motivo"] = "NF sem chassi legível"
                    nf["confianca"] = "baixa"
                    continue
                if not chassi_crlv:
                    nf["motivo"] = f"chassi NF={chassi_nf[-6:]} | sem CRLV cavalo pra comparar"
                    nf["confianca"] = "baixa"
                    continue
                if chassi_nf != chassi_crlv:
                    nf["motivo"] = f"chassi NF={chassi_nf[-6:]} != CRLV={chassi_crlv[-6:]} — não é deste cavalo"
                    nf["confianca"] = "baixa"
                    continue
                if not emissao_nf:
                    nf["motivo"] = "NF sem data de emissão legível"
                    nf["confianca"] = "baixa"
                    continue

                anos = anos_desde(emissao_nf)
                if anos > 1:
                    # NF vencida como substituta — marca alerta mas não vira CIV
                    nf["placa"] = cavalo
                    nf["tipo"] = "civ"
                    nf["vencimento"] = (emissao_nf.replace(year=emissao_nf.year + 1)).strftime("%Y-%m-%d")
                    nf["fonte_data"] = f"NF-substituindo-CIV (VENCIDO)"
                    nf["motivo"] = f"chassi OK, mas NF de {emissao_nf} — CIV expirou {anos:.1f}a, precisa CIV real"
                    nf["confianca"] = "media"
                else:
                    # NF vira CIV — vencimento = emissao + 1 ano
                    nf["placa"] = cavalo
                    nf["tipo"] = "civ"
                    nf["vencimento"] = (emissao_nf.replace(year=emissao_nf.year + 1)).strftime("%Y-%m-%d")
                    nf["fonte_data"] = f"NF-substituindo-CIV (emissao {emissao_nf})"
                    nf["motivo"] = f"chassi bate, NF < 1 ano → substitui CIV"
                    nf["confianca"] = "alta"

    # gera xlsx
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Preview"
    headers = ["pasta", "arquivo", "placa", "placa_motivo", "tipo", "vencimento", "fonte_data", "confianca", "motivo"]
    ws.append(headers)
    for l in linhas:
        ws.append([l.get(h, "") for h in headers])
    # ajusta largura
    for col_i, h in enumerate(headers, 1):
        col_letter = openpyxl.utils.get_column_letter(col_i)
        max_len = max([len(str(h))] + [len(str(l.get(h, ""))) for l in linhas])
        ws.column_dimensions[col_letter].width = min(max_len + 2, 60)
    wb.save(OUT_XLSX)

    print(f"\n[ok] preview em {OUT_XLSX}")
    print(f"     arquivos escaneados: {total_arq}")
    print(f"     arquivos ignorados (motorista/SP): {ignorados}")
    print(f"     linhas no preview: {len(linhas)}")
    alta = sum(1 for l in linhas if l["confianca"] == "alta")
    media = sum(1 for l in linhas if l["confianca"] == "media")
    baixa = sum(1 for l in linhas if l["confianca"] == "baixa")
    print(f"     confiança: alta={alta} · média={media} · baixa={baixa}")

if __name__ == "__main__":
    main()
