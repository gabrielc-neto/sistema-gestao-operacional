// Espera cache expirar e dispara segunda chamada pra verificar persistência
const URL = 'http://127.0.0.1:5001/pontual-logistica/southamerica-east1/sascarPosicoes';

async function call() {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dev-bypass': 'true' },
    body: JSON.stringify({ data: {} }),
  });
  return (await res.json()).result;
}

console.log('Aguardando expirar cache 30s...');
while (true) {
  const r = await call();
  if (r.cache.fresh) {
    const sem = r.posicoes.filter(p => p.statusTexto === 'SEM_DADOS').length;
    console.log(`OK — cache fresh | total: ${r.total} | SEM_DADOS: ${sem} | com pos: ${r.total - sem} | writes: ${r.gravadosNoFirestore}`);
    break;
  }
  await new Promise(r => setTimeout(r, 5000));
}
