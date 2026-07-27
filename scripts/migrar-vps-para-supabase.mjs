// Migra os dados do PostgreSQL da VPS para o Supabase.
//
//   node scripts/migrar-vps-para-supabase.mjs [--dry-run]
//
// Variáveis necessárias:
//   VPS_HOST         host SSH da VPS            (ex.: root@72.60.8.135)
//   VPS_SSH_KEY      caminho da chave SSH       (ex.: ~/.ssh/pontual_homolog)
//   VPS_DB           banco na VPS               (padrão: pontual)
//   SUPABASE_DB_URL  string de conexão Postgres do projeto Supabase
//                    (Project Settings > Database > Connection string > URI)
//
// O que faz, em ordem:
//   1. pg_dump --data-only das 6 tabelas, direto pelo SSH;
//   2. carrega no Supabase dentro de UMA transação;
//   3. confere a contagem de linhas dos dois lados.
//
// O que NÃO faz: criar as contas do Supabase Auth. Senha é hash bcrypt e não se
// transfere — ver `migrar-usuarios-supabase.mjs`, que convida cada pessoa a
// definir a sua.
//
// Idempotente: cada tabela é limpa antes de receber a carga, e tudo acontece na
// mesma transação. Se qualquer passo falhar, nada é aplicado — o pior caso é o
// Supabase continuar como estava, nunca um estado pela metade.

import { execFileSync, execSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DRY = process.argv.includes("--dry-run");

const VPS_HOST = process.env.VPS_HOST || "root@72.60.8.135";
const VPS_KEY  = process.env.VPS_SSH_KEY || `${process.env.HOME || process.env.USERPROFILE}/.ssh/pontual_homolog`;
const VPS_DB   = process.env.VPS_DB || "pontual";
const SUPA_URL = process.env.SUPABASE_DB_URL;

// Ordem importa pouco aqui (não há FK entre elas), mas mantém a leitura previsível.
const TABELAS = [
  "documents",
  "veiculos",
  "manutencoes",
  "ordens_servico",
  "lancamentos_os",
  "tipos_manutencao_custom",
];

function ssh(comando) {
  return execFileSync("ssh", ["-i", VPS_KEY, VPS_HOST, comando], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,   // o dump de documents passa de 2 MB e cresce
  });
}

function contarNaVps() {
  const sql = TABELAS.map((t) => `select '${t}' t, count(*) n from ${t}`).join(" union all ");
  const saida = ssh(`sudo -u postgres psql -d ${VPS_DB} -qtAF'|' -c "${sql}"`);
  return Object.fromEntries(
    saida.trim().split("\n").filter(Boolean).map((l) => {
      const [t, n] = l.split("|");
      return [t, Number(n)];
    })
  );
}

function main() {
  if (!SUPA_URL && !DRY) {
    console.error("Faltou SUPABASE_DB_URL (Project Settings > Database > Connection string).");
    process.exit(1);
  }

  console.log(`VPS:      ${VPS_HOST} (banco ${VPS_DB})`);
  console.log(`Supabase: ${SUPA_URL ? SUPA_URL.replace(/:[^:@]+@/, ":***@") : "(dry-run)"}\n`);

  console.log("1. Contando o que existe na VPS…");
  const antes = contarNaVps();
  for (const t of TABELAS) console.log(`   ${t.padEnd(24)} ${antes[t] ?? 0}`);

  console.log("\n2. Extraindo (pg_dump --data-only)…");
  const args = TABELAS.map((t) => `-t ${t}`).join(" ");
  const dump = ssh(`sudo -u postgres pg_dump --data-only --no-owner --no-privileges -d ${VPS_DB} ${args}`);
  console.log(`   ${(dump.length / 1024 / 1024).toFixed(1)} MB`);

  if (DRY) {
    console.log("\n--dry-run: nada foi escrito no Supabase.");
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "pontual-migra-"));
  const arquivo = join(dir, "dados.sql");
  try {
    // TRUNCATE + COPY na MESMA transação: se a carga falhar no meio, o rollback
    // devolve o Supabase ao estado anterior. Sem isso, um erro no meio deixaria
    // as tabelas vazias — pior que não ter migrado.
    writeFileSync(
      arquivo,
      ["begin;", `truncate ${TABELAS.join(", ")};`, dump, "commit;"].join("\n"),
      "utf8"
    );

    console.log("\n3. Carregando no Supabase (transação única)…");
    execSync(`psql "${SUPA_URL}" -v ON_ERROR_STOP=1 -q -f "${arquivo}"`, { stdio: "inherit" });

    console.log("\n4. Conferindo os dois lados…");
    const sql = TABELAS.map((t) => `select '${t}' t, count(*) n from ${t}`).join(" union all ");
    const saida = execSync(`psql "${SUPA_URL}" -qtAF'|' -c "${sql}"`, { encoding: "utf8" });
    const depois = Object.fromEntries(
      saida.trim().split("\n").filter(Boolean).map((l) => {
        const [t, n] = l.split("|");
        return [t, Number(n)];
      })
    );

    let divergiu = false;
    for (const t of TABELAS) {
      const a = antes[t] ?? 0, d = depois[t] ?? 0;
      const marca = a === d ? "ok  " : "ERRO";
      if (a !== d) divergiu = true;
      console.log(`   ${marca} ${t.padEnd(24)} VPS ${String(a).padStart(6)}  →  Supabase ${String(d).padStart(6)}`);
    }
    console.log(divergiu
      ? "\nAs contagens NÃO batem. Investigue antes de virar a chave VITE_DATA_BACKEND."
      : "\nContagens conferem. Pode virar VITE_DATA_BACKEND=supabase.");
    process.exit(divergiu ? 1 : 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
