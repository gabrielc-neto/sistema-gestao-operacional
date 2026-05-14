// Teste obterClientes — verifica qual conta SASCAR estamos acessando
// Uso: node scripts/test-sascar-clientes.mjs

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
  console.error('ERRO: credenciais ausentes no .env');
  process.exit(1);
}

const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:web="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <web:obterClientes>
      <usuario>${USUARIO}</usuario>
      <senha>${SENHA}</senha>
      <quantidade>1000</quantidade>
      <idCliente>0</idCliente>
    </web:obterClientes>
  </soapenv:Body>
</soapenv:Envelope>`;

console.log(`[obterClientes] endpoint: ${ENDPOINT}`);
console.log(`[obterClientes] usuario:  ${USUARIO}`);
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

  console.log(`HTTP ${res.status} ${res.statusText} (${elapsed}ms) — ${body.length} bytes`);
  console.log('---');

  if (!res.ok) {
    console.error('FALHA HTTP. Corpo:');
    console.error(body.slice(0, 2000));
    process.exit(2);
  }

  if (body.includes('<faultstring>')) {
    const fault = body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] ?? '(sem detalhe)';
    console.error('FAULT SOAP:', fault);
    process.exit(3);
  }

  // Parse simples por regex (cada <return> tem um cliente)
  const blocks = [...body.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => m[1]);

  console.log(`Clientes retornados: ${blocks.length}`);
  console.log('---');
  console.log('idCliente  | CNPJ                | CPF             | Nome');
  console.log('-----------+---------------------+-----------------+----------------------------------');

  for (const b of blocks) {
    const id = b.match(/<idCliente>([^<]*)<\/idCliente>/)?.[1] ?? '';
    const cnpj = b.match(/<cnpj>([^<]*)<\/cnpj>/)?.[1] ?? '';
    const cpf = b.match(/<cpf>([^<]*)<\/cpf>/)?.[1] ?? '';
    const nome = b.match(/<nome>([^<]*)<\/nome>/)?.[1] ?? '';
    console.log(`${id.padEnd(10)} | ${cnpj.padEnd(19)} | ${cpf.padEnd(15)} | ${nome}`);
  }

  // Procura especificamente Pontual
  console.log('---');
  const pontuais = blocks.filter(b => /pontual/i.test(b));
  if (pontuais.length) {
    console.log(`✓ ${pontuais.length} cliente(s) contém "Pontual" no nome — conta correta`);
  } else {
    console.log(`⚠ Nenhum cliente com "Pontual" no nome — verifique se é a conta certa`);
  }
} catch (err) {
  console.error('ERRO de rede ou TLS:', err.message);
  process.exit(4);
}
