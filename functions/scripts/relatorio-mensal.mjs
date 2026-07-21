#!/usr/bin/env node
// Gera relatório mensal automático (.pptx) da manutenção da frota
// Uso: node scripts/relatorio-mensal.mjs                 (mês anterior)
//      node scripts/relatorio-mensal.mjs --mes 2026-06   (mês específico YYYY-MM)
//      node scripts/relatorio-mensal.mjs --email          (também envia por email)
//      node scripts/relatorio-mensal.mjs --daemon         (fica rodando, gera dia 1 do mês)
//
// Saída: arquivo/relatorios-mensais/YYYY-MM.pptx

import admin from 'firebase-admin';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pptxgen from 'pptxgenjs';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SA_PATH = path.join(__dirname, '..', '..', 'scripts', 'serviceAccountKey.json');
const EMAIL_CONFIG_PATH = path.join(__dirname, 'email-config.json');
const OUT_DIR = path.join(__dirname, '..', '..', 'arquivo', 'relatorios-mensais');

// Flags
const IDX_MES = process.argv.indexOf('--mes');
const MES_MANUAL = IDX_MES !== -1 ? process.argv[IDX_MES + 1] : null;
const ENVIAR_EMAIL = process.argv.includes('--email');
const DAEMON = process.argv.includes('--daemon');

try {
  const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
} catch (e) {
  console.error('❌ Falha ao carregar service account:', e.message);
  process.exit(1);
}

const db = admin.firestore();

function fmtBRL(n) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseData(x) {
  if (!x) return null;
  if (typeof x === 'object' && typeof x.toMillis === 'function') return x.toMillis();
  const ms = Date.parse(x);
  return Number.isFinite(ms) ? ms : null;
}

function mesAnterior() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function rangeMes(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const inicio = Date.UTC(y, m - 1, 1);
  const fim = Date.UTC(y, m, 1);
  return { inicio, fim, label: `${String(m).padStart(2,'0')}/${y}` };
}

async function agregarDados(yyyymm) {
  const { inicio, fim, label } = rangeMes(yyyymm);

  const [osSnap, lancSnap, manutSnap] = await Promise.all([
    db.collection('ordens_servico').get(),
    db.collection('lancamentos_os').get().catch(() => ({ forEach: () => {} })),
    db.collection('manutencoes').get(),
  ]);

  const os = [];
  osSnap.forEach(d => os.push({ id: d.id, ...d.data() }));
  const lanc = [];
  lancSnap.forEach(d => lanc.push({ id: d.id, ...d.data() }));
  const manut = [];
  manutSnap.forEach(d => manut.push({ id: d.id, ...d.data() }));

  // Filtra por mês
  const osDoMes = os.filter(o => {
    const ts = parseData(o.criadoEm || o.dataHora);
    return ts && ts >= inicio && ts < fim;
  });
  const lancDoMes = lanc.filter(l => {
    const ts = parseData(l.data || l.criadoEm);
    return ts && ts >= inicio && ts < fim;
  });

  // KPIs
  const gastoTotal = [...osDoMes, ...lancDoMes].reduce((s, x) => s + (Number(x.valorTotal || x.valor) || 0), 0);
  const totalOS = osDoMes.length;
  const osFinalizadas = osDoMes.filter(o => o.status === 'finalizada').length;
  const osAbertas = osDoMes.filter(o => o.status !== 'finalizada').length;
  const placasAtendidas = new Set([...osDoMes.map(o => o.placa), ...lancDoMes.map(l => l.placa)].filter(Boolean));

  // Gasto por categoria (usa tipoServico/tipoLancamento)
  const porCategoria = {};
  osDoMes.forEach(o => {
    const k = o.tipoServico || 'Outros';
    porCategoria[k] = (porCategoria[k] || 0) + (Number(o.valorTotal) || 0);
  });
  lancDoMes.forEach(l => {
    const k = l.tipoLancamento || 'Outros';
    porCategoria[k] = (porCategoria[k] || 0) + (Number(l.valorTotal || l.valor) || 0);
  });
  const categoriasOrd = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Top 5 placas mais custosas do mês
  const porPlaca = {};
  osDoMes.forEach(o => {
    if (!o.placa) return;
    porPlaca[o.placa] = (porPlaca[o.placa] || 0) + (Number(o.valorTotal) || 0);
  });
  lancDoMes.forEach(l => {
    if (!l.placa) return;
    porPlaca[l.placa] = (porPlaca[l.placa] || 0) + (Number(l.valorTotal || l.valor) || 0);
  });
  const topPlacas = Object.entries(porPlaca).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Vencimentos que estouram nos próximos 30 dias (partir do fim do mês)
  const proximos30 = manut.filter(m => {
    const v = m.venc;
    if (!v) return false;
    const ts = Date.parse(v + 'T00:00:00');
    return Number.isFinite(ts) && ts >= fim && ts <= fim + 30 * 86400000;
  }).sort((a, b) => (a.venc || '').localeCompare(b.venc || ''));

  return {
    label, yyyymm,
    gastoTotal, totalOS, osFinalizadas, osAbertas,
    placasAtendidas: placasAtendidas.size,
    categoriasOrd, topPlacas, proximos30,
  };
}

function gerarPPT(dados, outPath) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = `Manutenção Frota Pontual ${dados.label}`;
  pres.author = 'Sistema Logística IA';

  // Slide 1 — Capa
  const s1 = pres.addSlide();
  s1.background = { color: '1A3A5C' };
  s1.addText('PONTUAL LOGÍSTICA', { x: 0.5, y: 2.5, w: 12, h: 0.6, fontSize: 32, color: 'FFFFFF', bold: true, align: 'center', fontFace: 'Manrope' });
  s1.addText('Relatório Mensal de Manutenção', { x: 0.5, y: 3.3, w: 12, h: 0.5, fontSize: 20, color: 'FFFFFF', align: 'center', fontFace: 'Manrope' });
  s1.addText(dados.label, { x: 0.5, y: 4.0, w: 12, h: 0.7, fontSize: 40, color: 'EA580C', bold: true, align: 'center', fontFace: 'Manrope' });
  s1.addText(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, { x: 0.5, y: 6.5, w: 12, h: 0.3, fontSize: 11, color: 'CCCCCC', align: 'center' });

  // Slide 2 — KPIs
  const s2 = pres.addSlide();
  s2.addText('KPIs do mês', { x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 22, color: '1A3A5C', bold: true });
  const kpis = [
    { label: 'Gasto total',      valor: fmtBRL(dados.gastoTotal), cor: '1A3A5C' },
    { label: 'OS abertas',       valor: String(dados.totalOS),   cor: '16A34A' },
    { label: 'OS finalizadas',   valor: String(dados.osFinalizadas), cor: '15803D' },
    { label: 'Placas atendidas', valor: String(dados.placasAtendidas), cor: '4338CA' },
  ];
  kpis.forEach((k, i) => {
    const x = 0.5 + i * 3.15;
    s2.addShape('rect', { x, y: 1.5, w: 3, h: 2, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 } });
    s2.addText(k.valor, { x, y: 1.7, w: 3, h: 1.1, fontSize: 40, color: k.cor, bold: true, align: 'center', valign: 'middle' });
    s2.addText(k.label, { x, y: 2.9, w: 3, h: 0.4, fontSize: 13, color: '64748B', align: 'center' });
  });

  // Slide 3 — Gasto por categoria (tabela + barras via shapes simples)
  const s3 = pres.addSlide();
  s3.addText('Gasto por categoria', { x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 22, color: '1A3A5C', bold: true });
  if (dados.categoriasOrd.length === 0) {
    s3.addText('Sem dados no mês.', { x: 0.5, y: 3, w: 12, h: 0.5, fontSize: 16, color: '94A3B8', align: 'center' });
  } else {
    const maxVal = dados.categoriasOrd[0][1];
    dados.categoriasOrd.forEach(([cat, val], i) => {
      const y = 1.3 + i * 0.6;
      s3.addText(cat, { x: 0.5, y, w: 3.5, h: 0.5, fontSize: 12, color: '1A3A5C', bold: true, valign: 'middle' });
      const pct = maxVal > 0 ? val / maxVal : 0;
      s3.addShape('rect', { x: 4.2, y: y + 0.12, w: 6.8 * pct, h: 0.26, fill: { color: '4338CA' } });
      s3.addText(fmtBRL(val), { x: 11.3, y, w: 1.5, h: 0.5, fontSize: 12, color: '1A3A5C', bold: true, valign: 'middle' });
    });
  }

  // Slide 4 — Top 5 placas
  const s4 = pres.addSlide();
  s4.addText('Top 5 placas mais custosas do mês', { x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 22, color: '1A3A5C', bold: true });
  if (dados.topPlacas.length === 0) {
    s4.addText('Sem dados.', { x: 0.5, y: 3, w: 12, h: 0.5, fontSize: 16, color: '94A3B8', align: 'center' });
  } else {
    const rows = [[{ text: '#', options: { bold: true, fill: 'F8FAFC' } }, { text: 'Placa', options: { bold: true, fill: 'F8FAFC' } }, { text: 'R$ Total', options: { bold: true, fill: 'F8FAFC' } }]];
    dados.topPlacas.forEach(([placa, val], i) => rows.push([String(i + 1), placa, fmtBRL(val)]));
    s4.addTable(rows, { x: 0.5, y: 1.3, w: 12, h: 4, colW: [1, 5, 6], fontSize: 14, border: { pt: 1, color: 'E2E8F0' } });
  }

  // Slide 5 — Vencimentos nos próximos 30 dias
  const s5 = pres.addSlide();
  s5.addText('Vencimentos próximos 30 dias', { x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 22, color: '1A3A5C', bold: true });
  if (dados.proximos30.length === 0) {
    s5.addText('Nenhum vencimento nos próximos 30 dias. ✅', { x: 0.5, y: 3, w: 12, h: 0.5, fontSize: 16, color: '15803D', align: 'center' });
  } else {
    const rows = [[
      { text: 'Item', options: { bold: true, fill: 'F8FAFC' } },
      { text: 'Placa', options: { bold: true, fill: 'F8FAFC' } },
      { text: 'Data', options: { bold: true, fill: 'F8FAFC' } },
    ]];
    dados.proximos30.slice(0, 15).forEach(m => rows.push([m.label || m.tipo, m.placa || '—', m.venc]));
    s5.addTable(rows, { x: 0.5, y: 1.3, w: 12, h: 5, colW: [5, 3, 4], fontSize: 12, border: { pt: 1, color: 'E2E8F0' } });
    if (dados.proximos30.length > 15) {
      s5.addText(`+${dados.proximos30.length - 15} outros. Ver /manutencao?aba=alertas`, { x: 0.5, y: 6.5, w: 12, h: 0.3, fontSize: 11, color: '94A3B8', italic: true });
    }
  }

  // Slide 6 — Recomendações automáticas
  const s6 = pres.addSlide();
  s6.addText('Insights & recomendações', { x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 22, color: '1A3A5C', bold: true });
  const insights = [];
  if (dados.gastoTotal === 0) insights.push('Sem gastos registrados no mês. Verifique se o registro de OS e lançamentos está sendo feito.');
  if (dados.osAbertas > 5) insights.push(`${dados.osAbertas} OS ficaram abertas ao fim do mês — cobrar mecânicos pra fechar rápido.`);
  if (dados.topPlacas.length > 0) {
    const [placaTop, valorTop] = dados.topPlacas[0];
    const pctTop = dados.gastoTotal > 0 ? ((valorTop / dados.gastoTotal) * 100).toFixed(1) : 0;
    insights.push(`${placaTop} representou ${pctTop}% do gasto total do mês (${fmtBRL(valorTop)}). Avaliar se é caso de substituição.`);
  }
  if (dados.categoriasOrd.length > 0) {
    const [catTop, valorCat] = dados.categoriasOrd[0];
    insights.push(`Categoria mais cara: ${catTop} (${fmtBRL(valorCat)}). Considere negociar preço melhor ou revisar fornecedor.`);
  }
  if (dados.proximos30.length >= 5) insights.push(`${dados.proximos30.length} vencimentos nos próximos 30 dias — planejar antecipação.`);
  if (insights.length === 0) insights.push('Sem insights automáticos gerados. Adicione mais dados no mês pra análise mais rica.');

  insights.forEach((txt, i) => {
    s6.addText(`• ${txt}`, { x: 0.7, y: 1.3 + i * 0.7, w: 12, h: 0.6, fontSize: 13, color: '1A3A5C', valign: 'middle' });
  });

  return pres.writeFile({ fileName: outPath });
}

async function enviarPorEmail(pptPath, dados) {
  if (!existsSync(EMAIL_CONFIG_PATH)) { console.log('⚠ sem email-config.json — pula envio'); return; }
  const cfg = JSON.parse(readFileSync(EMAIL_CONFIG_PATH, 'utf8'));
  const transp = nodemailer.createTransport({ service: 'gmail', auth: { user: cfg.gmailUser, pass: cfg.gmailAppPassword } });
  try {
    await transp.sendMail({
      from: `"Pontual Logística" <${cfg.gmailUser}>`,
      to: cfg.destinatarios.join(', '),
      subject: `📊 Relatório mensal ${dados.label} — Manutenção Pontual`,
      html: `<p>Segue o relatório mensal de manutenção da frota — <strong>${dados.label}</strong>.</p>
             <p>Gasto total: <strong>${fmtBRL(dados.gastoTotal)}</strong> · ${dados.totalOS} OS · ${dados.placasAtendidas} placas atendidas.</p>
             <p>Arquivo em anexo (.pptx).</p>`,
      attachments: [{ filename: path.basename(pptPath), path: pptPath }],
    });
    console.log(`✉️  Relatório enviado pra ${cfg.destinatarios.length} destinatário(s)`);
  } catch (e) { console.error('❌ envio email falhou:', e.message); }
}

async function gerar(yyyymm) {
  console.log(`\n📊 Gerando relatório de ${yyyymm}...`);
  const dados = await agregarDados(yyyymm);
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${yyyymm}.pptx`);
  await gerarPPT(dados, outPath);
  console.log(`✅ Salvo: ${outPath}`);
  console.log(`   ${dados.totalOS} OS · ${fmtBRL(dados.gastoTotal)} gasto · ${dados.placasAtendidas} placas`);
  if (ENVIAR_EMAIL) await enviarPorEmail(outPath, dados);
  return outPath;
}

async function main() {
  const yyyymm = MES_MANUAL || mesAnterior();
  await gerar(yyyymm);

  if (DAEMON) {
    console.log('\n📅 Daemon ativo — checa dia 1 do mês às 06:00 automaticamente');
    // Checa a cada 1h — se for dia 1 do mês entre 06:00-06:59, gera
    let ultimoGeradoMes = null;
    setInterval(async () => {
      const agora = new Date();
      const horaBRT = (agora.getUTCHours() - 3 + 24) % 24;
      const diaBRT = new Date(agora.getTime() - 3 * 3600 * 1000).getUTCDate();
      const mesBRT = new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 7);
      if (diaBRT === 1 && horaBRT === 6 && ultimoGeradoMes !== mesBRT) {
        try {
          await gerar(mesAnterior());
          ultimoGeradoMes = mesBRT;
        } catch (e) { console.error('erro daemon:', e.message); }
      }
    }, 60 * 60 * 1000);
    return;
  }
  process.exit(0);
}

main().catch(e => { console.error('fatal:', e); process.exit(1); });
