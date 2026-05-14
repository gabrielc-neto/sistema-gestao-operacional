// Teste de conectividade com SasIntegra Web Service (SASCAR)
// Executa obterVeiculos (sem rate limit) — valida credencial e mostra os 5 primeiros veiculos
// Uso: node scripts/test-sascar-api.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const USUARIO = env.SASCAR_USUARIO;
const SENHA = env.SASCAR_SENHA;
const ENDPOINT = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';

if (!USUARIO || !SENHA) {
  console.error('ERRO: SASCAR_USUARIO ou SASCAR_SENHA ausente no .env');
  process.exit(1);
}

const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <web:obterVeiculos>
      <usuario>${USUARIO}</usuario>
      <senha>${SENHA}</senha>
      <quantidade>5</quantidade>
      <idVeiculo>0</idVeiculo>
    </web:obterVeiculos>
  </soapenv:Body>
</soapenv:Envelope>`;

console.log(`[SASCAR test] endpoint: ${ENDPOINT}`);
console.log(`[SASCAR test] usuario:  ${USUARIO}`);
console.log(`[SASCAR test] method:   obterVeiculos (quantidade=5)`);
console.log('---');

const t0 = Date.now();

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
      'Accept': 'text/xml',
    },
    body: envelope,
  });

  const elapsed = Date.now() - t0;
  const body = await res.text();

  console.log(`HTTP ${res.status} ${res.statusText} (${elapsed}ms)`);
  console.log(`Tamanho da resposta: ${body.length} bytes`);
  console.log('---');

  if (!res.ok) {
    console.error('FALHA HTTP. Corpo:');
    console.error(body.slice(0, 2000));
    process.exit(2);
  }

  if (body.includes('<faultstring>') || body.includes('<faultcode>')) {
    const fault = body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] ?? '(sem detalhe)';
    console.error('FAULT SOAP:', fault);
    console.error('--- corpo (primeiros 1500 chars) ---');
    console.error(body.slice(0, 1500));
    process.exit(3);
  }

  // Quantos <return> retornaram (cada um e um veiculo)
  const returns = body.match(/<return>/g) ?? [];
  console.log(`Veículos retornados: ${returns.length}`);

  // Extrai placa e idVeiculo de cada retorno
  const placas = [...body.matchAll(/<placa>([^<]+)<\/placa>/g)].map(m => m[1]);
  const ids = [...body.matchAll(/<idVeiculo>([^<]+)<\/idVeiculo>/g)].map(m => m[1]);

  console.log('---');
  console.log('Amostra (placa | idVeiculo):');
  for (let i = 0; i < Math.min(placas.length, 5); i++) {
    console.log(`  ${placas[i]} | ${ids[i] ?? '?'}`);
  }

  console.log('---');
  console.log('OK — credencial válida, API respondendo.');
} catch (err) {
  console.error('ERRO de rede ou TLS:', err.message);
  console.error(err);
  process.exit(4);
}
