// Atualiza Firebase authorized domains no projeto pontual-logistica.
// Uso:
//   node add-authorized-domain.js                            → usa TUNNEL_URL do env
//   node add-authorized-domain.js https://xyz.trycloudflare.com   → arg direto
//
// Mantém localhost + domínios firebaseapp/web.app.
// Remove QUALQUER trycloudflare.com anterior (só a URL vigente fica).

const { GoogleAuth } = require('C:/Users/Logistica01/projetos/logistica-ia/functions/node_modules/google-auth-library');
const path = require('path');

const PROJECT_ID = 'pontual-logistica';
const KEY = path.resolve(__dirname, 'serviceAccountKey.json');
const PERMANENTES = ['localhost', 'pontual-logistica.firebaseapp.com', 'pontual-logistica.web.app'];

function extrairHost(input) {
  if (!input) return null;
  return String(input).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

const argUrl = process.argv[2];
const envUrl = process.env.TUNNEL_URL;
const NEW_DOMAIN = extrairHost(argUrl || envUrl);

if (!NEW_DOMAIN) {
  console.error('Uso: node add-authorized-domain.js <url> (ou TUNNEL_URL=... env)');
  process.exit(1);
}

(async () => {
  const auth = new GoogleAuth({
    keyFile: KEY,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`;

  const cfg = (await client.request({ url: base })).data;
  const current = cfg.authorizedDomains || [];
  console.log('BEFORE:', current);

  // Mantém permanentes + adiciona o novo, remove trycloudflare antigos
  const next = [
    ...PERMANENTES,
    ...current.filter(d => !PERMANENTES.includes(d) && !d.endsWith('.trycloudflare.com')),
    NEW_DOMAIN,
  ];
  // Dedup preservando ordem
  const seen = new Set();
  const clean = next.filter(d => (seen.has(d) ? false : (seen.add(d), true)));

  const patched = (await client.request({
    url: `${base}?updateMask=authorizedDomains`,
    method: 'PATCH',
    data: { authorizedDomains: clean },
  })).data;
  console.log('AFTER:', patched.authorizedDomains);
})().catch(e => {
  console.error('ERR', e.response?.data || e.message);
  process.exit(1);
});
