// Puxa abastecimentos de UM dia direto da API CTA e imprime resumo.
// Uso: node scripts/cta-relatorio-dia.mjs 14/07/2026
import { XMLParser } from '../node_modules/fast-xml-parser/src/fxp.js';

const DIA   = process.argv[2] || '14/07/2026';
const TOKEN = process.env.CTA_TOKEN || 'bEsu0JDwbL';
const URL   = `https://ctasmart.com.br:8443/SvWebSincronizaAbastecimentos?token=${TOKEN}&data_inicio=${encodeURIComponent(DIA)}&data_fim=${encodeURIComponent(DIA)}&confirmar=false`;

const arr = v => v == null ? [] : Array.isArray(v) ? v : [v];
const num = v => { if (v == null || v === '') return null; const n = Number(String(v).replace(/\./g,'').replace(',','.')); return Number.isFinite(n) ? n : null; };
const txt = v => v == null || typeof v === 'object' ? '' : String(v).trim();

const res = await fetch(URL);
const xml = await res.text();
const parsed = new XMLParser({ trimValues: true, parseTagValue: false }).parse(xml);
const root = parsed?.CTAPLUS || {};
const status = root.STATUS || {};

console.log(`Data: ${DIA}   status: ${txt(status.CODIGO)} ${txt(status.MENSAGEM)}`);
const lista = arr(root.ABASTECIMENTOS?.ABASTECIMENTO);
if (!lista.length) { console.log('Nenhum abastecimento retornado.'); process.exit(0); }

const rows = lista.map(a => ({
  placa: txt(a.VEICULO?.PLACA),
  frota: txt(a.VEICULO?.FROTA),
  motorista: txt(a.MOTORISTA?.NOME),
  posto: txt(a.POSTO?.NOME),
  postoUf: txt(a.POSTO?.UF),
  comercial: String(txt(a.POSTO?.POSTO_COMERCIAL)).toLowerCase() === 'true',
  dataInicio: txt(a.DATA_INICIO) + ' ' + txt(a.HORA_INICIO),
  volumeL: num(a.VOLUME_FIXED) ?? num(a.VOLUME),
  custoTotal: num(a.CUSTO),
  custoUnit: num(a.CUSTO_UNITARIO),
  odom: num(a.ODOMETRO),
  combustivel: txt(a.COMBUSTIVEL?.DESCRICAO),
}));

const total = rows.reduce((s, r) => s + (r.volumeL || 0), 0);
const totalR = rows.reduce((s, r) => s + (r.custoTotal || 0), 0);
const externos = rows.filter(r => r.comercial);
const patio    = rows.filter(r => !r.comercial);

console.log(`\nTotal: ${rows.length} abastecimentos · ${total.toFixed(1)} L · R$ ${totalR.toFixed(2)}`);
console.log(`  Pátio interno: ${patio.length} (${patio.reduce((s,r)=>s+(r.volumeL||0),0).toFixed(1)} L)`);
console.log(`  Postos externos: ${externos.length} (${externos.reduce((s,r)=>s+(r.volumeL||0),0).toFixed(1)} L, R$ ${externos.reduce((s,r)=>s+(r.custoTotal||0),0).toFixed(2)})`);

console.log('\n=== por placa ===');
const porPlaca = {};
rows.forEach(r => {
  const k = r.placa || '(sem placa)';
  if (!porPlaca[k]) porPlaca[k] = { qtd: 0, L: 0, R: 0, frota: r.frota, motorista: r.motorista };
  porPlaca[k].qtd += 1;
  porPlaca[k].L   += r.volumeL || 0;
  porPlaca[k].R   += r.custoTotal || 0;
});
Object.entries(porPlaca)
  .sort((a, b) => b[1].L - a[1].L)
  .forEach(([placa, s]) => console.log(`  ${placa.padEnd(9)} ${String(s.frota).padEnd(6)} ${s.qtd}x  ${s.L.toFixed(1).padStart(8)} L  R$ ${s.R.toFixed(2).padStart(9)}  ${s.motorista}`));

console.log('\n=== detalhe ===');
rows.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
    .forEach(r => console.log(`  ${r.dataInicio}  ${r.placa.padEnd(9)} ${(r.volumeL||0).toFixed(1).padStart(7)}L  R$ ${(r.custoTotal||0).toFixed(2).padStart(9)}  ${r.comercial ? 'EXT' : 'PAT'}  ${r.posto}`));
