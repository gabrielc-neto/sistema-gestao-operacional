const { GoogleAuth } = require('C:/Users/Logistica01/projetos/logistica-ia/functions/node_modules/google-auth-library');
const path = require('path');

const NEW_DOMAIN = 'gotten-yoga-ant-protect.trycloudflare.com';
const OLD_DOMAIN = 'attachments-montreal-flu-reaches.trycloudflare.com';
const PROJECT_ID = 'pontual-logistica';
const KEY = path.resolve(__dirname, 'serviceAccountKey.json');

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

  const next = current.filter(d => d !== OLD_DOMAIN);
  if (!next.includes(NEW_DOMAIN)) next.push(NEW_DOMAIN);

  const patched = (await client.request({
    url: `${base}?updateMask=authorizedDomains`,
    method: 'PATCH',
    data: { authorizedDomains: next },
  })).data;
  console.log('AFTER:', patched.authorizedDomains);
})().catch(e => {
  console.error('ERR', e.response?.data || e.message);
  process.exit(1);
});
