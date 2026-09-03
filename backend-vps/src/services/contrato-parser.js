// Parser hibrido de contrato PDF de compra de combustivel.
//
// Estrategia:
//   1) Extrai texto do PDF (pdfjs-dist — puro JS, sem binario)
//   2) Detecta emissor pelo CNPJ/header no texto
//   3) Se conhecido → parser regex especifico (CPA/Coopcana, etc)
//      Se desconhecido → fallback OpenAI (GPT-4o-mini com schema JSON)
//
// Retorna: { fornecedor: {...}, contrato: {...}, metodo: "regex_cpa"|"openai_mini" }
//
// Nao acessa banco. Quem chama (routes/contratos.js) decide o que fazer com o resultado.

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Normaliza numeros no formato brasileiro (1.234.567,89 → 1234567.89)
function parseNumBR(s) {
  if (s == null) return null;
  const clean = String(s).replace(/\./g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

// Data BR (03/08/2026 → 2026-08-03)
function parseDataBR(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Extrai texto do PDF (todas as paginas concatenadas com \n)
export async function extrairTextoPdf(buffer) {
  // pdfjs-dist rejeita Buffer explicitamente — precisa converter pra Uint8Array puro
  // (mesmo Buffer sendo subclasse). new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const uint8 = new Uint8Array(buffer.buffer || buffer, buffer.byteOffset || 0, buffer.byteLength || buffer.length);
  const doc = await getDocument({ data: uint8, disableWorker: true }).promise;
  let texto = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map(it => it.str).join(" ") + "\n";
  }
  return texto;
}

// Detecta emissor pelo header/CNPJ
function detectarEmissor(texto) {
  const t = texto.toUpperCase();
  if (t.includes("78.340.270/0002-10") || t.includes("COOPCANA") || t.includes("CPA")
      || t.includes("COOPERATIVA AGRICOLA REGIONAL DE PRODUTORES DE CANA")) {
    return "CPA_COOPCANA";
  }
  return null;
}

// ------------------------------------------------------------------
// Parser regex especifico: CPA/COOPCANA (formato F-MIN-001)
// ------------------------------------------------------------------
function parseCPA(texto) {
  const t = texto.replace(/\s+/g, " ");

  function pick(regex) {
    const m = t.match(regex);
    return m ? m[1].trim() : null;
  }

  const numero            = pick(/N[uú]mero\s+Contrato:?\s*([\d]+)/i);
  const protocolo         = pick(/Protocolo:?\s*(\d+)/i);
  const dataContrato      = parseDataBR(pick(/Data:?\s*(\d{2}\/\d{2}\/\d{4})/i));
  const operador          = pick(/Operador:?\s*([A-Z][A-Za-zÀ-ÿ\s]+?)(?:\s+F-|$)/i);
  const tipoFormulario    = pick(/(F-MIN-\d+)/i);

  // Produto (ETANOL ANIDRO / HIDRATADO / etc)
  const produtoRaw        = pick(/Produto:?\s*([A-Z][A-Za-zÀ-ÿ\s]+?)(?:\s+Volume|$)/i);
  let produto = "OUTRO";
  if (produtoRaw) {
    const p = produtoRaw.toUpperCase();
    if (p.includes("ANIDRO"))    produto = "ETANOL_ANIDRO";
    else if (p.includes("HIDRATADO")) produto = "ETANOL_HIDRATADO";
    else if (p.includes("S10"))  produto = "DIESEL_S10";
    else if (p.includes("S500")) produto = "DIESEL_S500";
    else if (p.includes("GASOLINA")) produto = "GASOLINA";
  }

  const volumeM3          = parseNumBR(pick(/Volume\s*\(m3?\)\s*([\d.,]+)/i));
  const precoM3           = parseNumBR(pick(/Pre[çc]o\s*C\/?Impostos[^\d]*?([\d.,]+)/i));
  const icmsM3            = parseNumBR(pick(/ICMS\s*R\$\/M3?\s*([\d.,]+)/i));
  const valorTotal        = parseNumBR(pick(/Valor\s*\(R\$?\)\s*([\d.,]+)/i));
  const dataPagamento     = parseDataBR(pick(/Data\s*P[a-z]+amento:?\s*(\d{2}\/\d{2}\/\d{4})/i));
  const formaPagamento    = pick(/Forma\s+de\s+Pa[gs]amento:?\s*([A-ZÀ-Ÿ][^:]{5,120})(?:Condi|Modalidade|$)/i);
  const condicoesRetirada = pick(/Condi[çc][õo]es\s+de\s+Retirada:?\s*([A-ZÀ-Ÿ][^:]{5,120})(?:Modalidade|Local|$)/i);
  const modalidade        = pick(/Modalidade\s+da\s+Venda:?\s*([A-Z0-9\/]+)/i);
  const localRetirada     = pick(/Local\s+de\s+Retirada:?\s*([^:]+?)(?:Observa|$)/i);
  // Observacoes: para no primeiro delimitador conhecido (tolerante a corrupcao de fonte)
  //   "DADOS BANC", "Banco ", "CONDIÇÕES GERAIS", "coNDrçÕEs", "CoNDIÇÕES"
  const obsRaw            = pick(/Observa[çc][õo]es:?\s*(.+?)(?:DAD[oO]s\s+[sSbB][aA][nN]|Banco\s+[A-Z]|[cC][oO][nN][DdRr][ıiIí][çc]|$)/is);
  // Detecta corrupcao de fonte: MUITAS palavras com caixa aleatoria
  //   (ex: "coNTRATO", "UTttlZADO", "CEPEA-ESATQ", "Rs/M!")
  // Se >15% das palavras longas tem padrao suspeito → considera texto ilegivel e nao preenche
  function textoCorrupto(txt) {
    if (!txt) return false;
    const palavras = txt.split(/\s+/).filter(p => p.length >= 4);
    if (palavras.length < 5) return false;
    const suspeitas = palavras.filter(p =>
      /[a-z][A-Z][a-z]/.test(p) ||          // caixa alternada tipo "coNTRATO"
      /[a-z]{2}[A-Z]{2,}/.test(p) ||        // tipo "UTttlZADO"
      /[0-9][a-zA-Z][0-9]/.test(p) ||       // tipo "2.04s,40"
      /[A-Z][a-z]{2,}[A-Z]/.test(p)         // tipo "PoNÍuAt"
    ).length;
    return (suspeitas / palavras.length) > 0.15;
  }
  const observacoes = textoCorrupto(obsRaw) ? null : obsRaw;
  const safra             = pick(/SAFRA\s+(\d{2}\/\d{2})/i);
  const indiceRef         = pick(/[IÍ]NDICE\s+([A-Z][A-Za-zÀ-ÿ0-9\s\-]+?)(?:\(|$)/i);

  // Vendedor (usina)
  const usinaRazao        = pick(/DADOS\s+DA\s+USINA[^A-Z]*?Raz[aã]o\s+social\s+([A-ZÀ-Ÿ][^n]+?)\s+Endere[çc]o/i);
  const usinaCnpj         = pick(/DADOS\s+DA\s+USINA.*?CNPJ\s+([\d\.\/\-]+)/i);
  const usinaIe           = pick(/DADOS\s+DA\s+USINA.*?Inscri[çc][aã]o\s+estadual\s+([\d\.\/\-]+)?/i);
  const usinaCep          = pick(/DADOS\s+DA\s+USINA.*?CEP:?\s*([\d\-]+)/i);
  const usinaCidadeRaw    = pick(/DADOS\s+DA\s+USINA.*?[Cc]idade\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s]+?)\s+UF/i);
  const usinaUfRaw        = pick(/DADOS\s+DA\s+USINA.*?UF\s*Estado:?\s*([A-Za-z]{2})/i);
  const usinaEndRaw       = pick(/DADOS\s+DA\s+USINA.*?Endere[çc]o\s+(.+?)\s+n[oº]/i);
  // Se endereco veio contaminado com texto do PDF inteiro (>80 chars é sinal), descarta
  const usinaEnd = usinaEndRaw && usinaEndRaw.length <= 80 ? usinaEndRaw : null;

  // ---- Normalizacoes pra corrigir texto corrompido conhecido ----
  // 1) UF sempre uppercase (extrai "pR" → "PR")
  const usinaUf = usinaUfRaw ? usinaUfRaw.toUpperCase() : null;

  // 2) Cidade: title-case ("sÃo caRLos oo tvAÍ" → "São Carlos Oo Tvaí")
  //    Nao resolve letras trocadas, mas melhora caixa
  const usinaCidade = usinaCidadeRaw
    ? usinaCidadeRaw.toLowerCase().replace(/(^|\s)(\S)/g, (_, sp, ch) => sp + ch.toUpperCase())
    : null;

  // 3) Fornecedores conhecidos por CNPJ — preenche nome real mesmo se o parser
  //    nao conseguiu extrair (font corrompida)
  const FORNECEDORES_CONHECIDOS = {
    "78.340.270/0002-10": {
      razaoSocial: "COOPERATIVA AGRICOLA REGIONAL DE PRODUTORES DE CANA LTDA",
      nomeFantasia: "COOPCANA / CPA",
      cidade: "São Carlos do Ivaí",
      uf: "PR",
      cep: "87770-000",
    },
    "78.340.270/0001-39": {
      razaoSocial: "COOPERATIVA AGRICOLA REGIONAL DE PRODUTORES DE CANA LTDA",
      nomeFantasia: "COOPCANA / CPA (matriz)",
      cidade: "Sarandi",
      uf: "PR",
    },
  };
  const conhecido = usinaCnpj && FORNECEDORES_CONHECIDOS[usinaCnpj];

  // Banco
  const banco             = pick(/DADOS\s+BANC[AÁ]RIOS.*?Banco\s+([A-Z][A-Za-zÀ-ÿ\s]+?)\s+/i);
  const bancoCnpj         = pick(/DADOS\s+BANC[AÁ]RIOS.*?CNPJ\s+([\d\.\/\-]+)/i);
  const bancoAg           = pick(/Agencia\s+(\d+)/i);
  const bancoConta        = pick(/Conta\s+([\d\-]+)/i);

  // === Politica sem OpenAI: campos numericos/data do contrato NAO sao auto-preenchidos ===
  // Porque a fonte corrompida gera valores errados (ex: pega "2.045,40" do indice CEPEA em vez
  // do preco real "2.452,37"; volume "292,oooo" vira 292 mas nao ha certeza; data "0310812026"
  // fica ambigua). User preenche manual. Deixamos so o que sobreviveu 100% limpo.
  return {
    fornecedor: {
      // Prefere nome conhecido se o CNPJ bate (evita "null" quando fonte corrompida)
      razaoSocial: (conhecido && conhecido.razaoSocial) || usinaRazao,
      nomeFantasia: (conhecido && conhecido.nomeFantasia) || null,
      cnpj: usinaCnpj,
      inscricaoEstadual: usinaIe,
      endereco: usinaEnd,
      cidade: (conhecido && conhecido.cidade) || usinaCidade,
      uf: (conhecido && conhecido.uf) || usinaUf,
      cep: (conhecido && conhecido.cep) || usinaCep,
      banco, bancoAgencia: bancoAg, bancoConta, bancoCnpj,
    },
    contrato: {
      // Campos manuais (parser sem OpenAI nao confia neles no PDF corrompido):
      numero:            null,
      dataContrato:      null,
      produto:           null,
      produtoDescricao:  null,
      volumeTotalLitros: null,
      precoPorM3:        null,
      icmsPorM3:         null,
      valorTotal:        null,
      dataPagamento:     null,
      // Campos que sobrevivem limpos (texto puro no PDF):
      protocolo, operadorFornecedor: operador, tipoFormulario,
      formaPagamento, modalidade,
      condicoesRetirada, localRetiradaNome: localRetirada,
      safra, indiceReferencia: indiceRef, observacoes,
    },
  };
}

// ------------------------------------------------------------------
// Fallback: OpenAI GPT-4o-mini (funciona pra qualquer distribuidora)
// ------------------------------------------------------------------
async function parseComOpenAI(texto) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY nao configurada");

  const schema = {
    type: "object",
    properties: {
      fornecedor: {
        type: "object",
        properties: {
          razaoSocial: { type: ["string","null"] },
          cnpj: { type: ["string","null"] },
          inscricaoEstadual: { type: ["string","null"] },
          registroAnp: { type: ["string","null"] },
          endereco: { type: ["string","null"] },
          cidade: { type: ["string","null"] },
          uf: { type: ["string","null"] },
          cep: { type: ["string","null"] },
          banco: { type: ["string","null"] },
          bancoAgencia: { type: ["string","null"] },
          bancoConta: { type: ["string","null"] },
          bancoCnpj: { type: ["string","null"] },
        }
      },
      contrato: {
        type: "object",
        properties: {
          numero: { type: ["string","null"] },
          protocolo: { type: ["string","null"] },
          dataContrato: { type: ["string","null"], description: "ISO YYYY-MM-DD" },
          operadorFornecedor: { type: ["string","null"] },
          tipoFormulario: { type: ["string","null"] },
          produto: {
            type: "string",
            enum: ["ETANOL_ANIDRO","ETANOL_HIDRATADO","DIESEL_S10","DIESEL_S500","GASOLINA","OUTRO"]
          },
          produtoDescricao: { type: ["string","null"] },
          volumeTotalLitros: { type: ["number","null"], description: "sempre em LITROS (1 m3 = 1000 L)" },
          precoPorM3: { type: ["number","null"] },
          icmsPorM3: { type: ["number","null"] },
          valorTotal: { type: ["number","null"] },
          dataPagamento: { type: ["string","null"], description: "ISO YYYY-MM-DD" },
          formaPagamento: { type: ["string","null"] },
          modalidade: { type: ["string","null"] },
          condicoesRetirada: { type: ["string","null"] },
          localRetiradaNome: { type: ["string","null"] },
          safra: { type: ["string","null"] },
          indiceReferencia: { type: ["string","null"] },
          observacoes: { type: ["string","null"] },
        },
        required: ["produto"]
      }
    },
    required: ["fornecedor","contrato"]
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_schema", json_schema: {
        name: "contrato_extraido",
        strict: false,
        schema
      }},
      messages: [
        { role: "system", content:
          "Voce extrai dados de contratos brasileiros de compra e venda de combustivel. " +
          "Volume SEMPRE em litros (converta m3 * 1000). Datas em ISO. Valores em decimal com ponto." },
        { role: "user", content: `Extraia os campos do contrato abaixo:\n\n${texto.slice(0, 8000)}` }
      ]
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI erro ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI nao retornou content");
  return JSON.parse(content);
}

// Calcula % de campos criticos preenchidos (numero, produto, volume, preco, valor)
function taxaConfiabilidadeCPA(dados) {
  const c = dados.contrato || {};
  const criticos = [c.numero, c.dataContrato, c.volumeTotalLitros, c.precoPorM3, c.valorTotal];
  const ok = criticos.filter(v => v != null && v !== "").length;
  return ok / criticos.length;
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------
export async function parseContratoPdf(buffer) {
  const texto = await extrairTextoPdf(buffer);
  const emissor = detectarEmissor(texto);

  // Tenta regex especifico se emissor conhecido
  if (emissor === "CPA_COOPCANA") {
    const dados = parseCPA(texto);
    const taxa = taxaConfiabilidadeCPA(dados);
    // Se pegou >= 60% dos campos criticos → confia no regex
    if (taxa >= 0.6) {
      return { ...dados, textoExtraido: texto, metodo: "regex_cpa", taxaConfiabilidade: taxa };
    }
    // PDF com texto corrompido (font subsetting ruim) → cai pro LLM
  }

  // Fallback LLM (funciona pra qualquer emissor + resolve texto corrompido)
  try {
    const dados = await parseComOpenAI(texto);
    return { ...dados, textoExtraido: texto, metodo: "openai_mini" };
  } catch (e) {
    // Ultimo recurso: devolve regex CPA parcial mesmo com taxa baixa
    if (emissor === "CPA_COOPCANA") {
      const dados = parseCPA(texto);
      return { ...dados, textoExtraido: texto, metodo: "regex_cpa_parcial", erro: e.message };
    }
    return {
      fornecedor: {}, contrato: {},
      textoExtraido: texto,
      metodo: "falhou",
      erro: e.message,
    };
  }
}
