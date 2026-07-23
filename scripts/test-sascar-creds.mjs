// Testa credenciais SASCAR SasIntegra chamando obterVeiculos.
import { obterVeiculos } from "../backend-vps/src/integracoes/sascar/soap.js";

const combos = [
  { usuario: "ADM", senha: "LOGISTICA2025" },
  { usuario: "PONTUAL790", senha: "LOGISTICA2025" },
];

for (const c of combos) {
  process.stdout.write(`Testando usuario=${c.usuario}, senha=${c.senha} ... `);
  try {
    const vs = await obterVeiculos({ ...c, quantidade: 5 });
    console.log(`✓ OK — ${vs.length} veículos retornados`);
    if (vs.length > 0) console.log(`  ex: ${vs[0].placa}`);
    process.exit(0);
  } catch (e) {
    console.log(`✗ FALHOU: ${e.message.slice(0, 100)}`);
  }
}
console.log("\nNENHUM combo funcionou — pedir usuário/senha correto.");
process.exit(1);
