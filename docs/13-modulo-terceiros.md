# 13 — Módulo Transportadoras Terceiras

[← voltar ao índice](README.md)

> **Status:** DESENHO (2026-05-22). Nada implementado. Serve pra Pontual e pro produto SaaS (doc 12).

## 1. Para que serve

Pontual usa **frota própria** E contrata **transportadoras terceiras** (frota delas) pra parte das cargas. Confirmado 2, ambas empresa/CNPJ: **E C STANYTCHYL TRANSPORTES** e **LODI E SCHUSARZ TRANSPORTADORA LTDA**.

O módulo gerencia: cadastro da transportadora, alocação numa OC, **frete pago** e o **CT-e que elas emitem** pra Pontual (tomador).

## 2. Contexto fiscal (ver doc 12 e memória)

- Frota própria → Pontual emite **MDF-e** (sem CT-e, carga própria).
- Terceiro empresa → **o terceiro emite CT-e + MDF-e**; Pontual é **tomador** e **recebe o CT-e**.
- **Pontual nunca emite CT-e. CIOT = nunca** (só contrata empresa, jamais autônomo pessoa física). Vale-pedágio obrigatório: não.

## 3. Como encaixa

```
        ┌────────────────────────┐
        │   OC (Ordem Carreg.)   │
        │  campo: tipo transporte│
        └───────┬────────┬───────┘
         própria│        │terceiro
                ▼        ▼
   ┌─────────────┐   ┌────────────────────────┐
   │ Frota própria│   │ Transportadora terceira │◄─ cadastro
   │ SASCAR/MDF-e │   │  + frete contratado     │
   │ jornada/GPS  │   │  + CT-e recebido (delas) │
   └──────┬───────┘   └───────────┬─────────────┘
          └──────────┬────────────┘
                     ▼
        ┌────────────────────────┐
        │  Custo por viagem       │
        │ própria: diesel+pedágio │
        │ terceiro: frete pago    │
        └────────────────────────┘
```

## 4. Dados — PostgreSQL (Supabase), padrão do TMS

> Banco do TMS = **PostgreSQL multi-tenant** (ver doc 12). Toda tabela tem `empresa_id` + política RLS de isolamento. *(O Firestore é só o sistema legado da Pontual, fora do TMS novo.)*

```sql
-- Cadastro da transportadora terceira
create table transportadoras (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id),      -- TENANT
  cnpj            text not null,                              -- auto-preenche via BrasilAPI
  razao_social    text,
  nome_fantasia   text,
  rntrc           text,                                       -- registro ANTT (obrigatório)
  contato         jsonb,                                      -- {telefone, email, responsavel}
  dados_bancarios jsonb,                                      -- opcional (pagar frete)
  situacao_receita text,                                      -- ativo/inapto (BrasilAPI)
  ativo           boolean default true,
  obs             text,
  criado_em       timestamptz default now(),
  unique (empresa_id, cnpj)
);

-- Colunas novas na OC
alter table ordens_carregamento
  add column tipo_transporte   text check (tipo_transporte in ('propria','terceiro')) default 'propria',
  add column transportadora_id uuid references transportadoras(id),
  add column placa_terceiro    text,        -- texto livre (não está na SASCAR)
  add column motorista_terceiro text,
  add column frete_contratado  numeric(12,2);

-- CT-e recebido do terceiro (Pontual é tomador)
create table ctes_recebidos (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas(id),
  oc_id            uuid references ordens_carregamento(id),
  transportadora_id uuid references transportadoras(id),
  numero           text,
  chave            text,                     -- chave de acesso (44 dígitos)
  valor            numeric(12,2),
  xml_url          text,                     -- arquivo no Storage
  recebido_em      timestamptz default now()
);

-- RLS (todas as tabelas): isola por empresa do usuário logado
-- using (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid)
```

Índices: `transportadoras(empresa_id)`, `ordens_carregamento(empresa_id, transportadora_id)`, `ctes_recebidos(empresa_id, oc_id)`.

## 5. Telas
1. **Lista de transportadoras** — CRUD, busca, badge ativo/inapto, alerta RNTRC vencido
2. **Cadastro** — digita CNPJ → auto-preenche (BrasilAPI) → completa RNTRC/contato/banco
3. **Dentro da OC** — toggle Própria/Terceiro; se terceiro: escolhe transportadora + placa/motorista + frete + anexa CT-e
4. **Painel de terceiros** — gasto com frete por período/transportadora, % terceirizado × próprio, ranking

## 6. Regras de negócio
- **Terceiro NÃO aparece no rastreamento por GPS** — frota não é da Pontual, sem SASCAR. Status da entrega é **manual** (ou pelo CT-e/comprovante). Deixar claro na tela.
- **Jornada não se aplica** a motorista de terceiro (não é da casa, sem tablet SASCAR).
- **Custo da viagem terceirizada = frete pago** (sem diesel/pedágio próprio).
- **Validação RNTRC + situação CNPJ** — alerta se RNTRC vencido ou CNPJ inapto (contratar irregular = risco ANTT/fiscal).
- **Fiscal**: Pontual não emite nada — só **recebe e guarda o CT-e** deles.

## 7. Fases (MVP primeiro)
| Fase | Entrega |
|---|---|
| **MVP** | Cadastro de transportadora (auto-CNPJ) + campo Própria/Terceiro na OC + frete contratado |
| **2** | Registrar/anexar CT-e recebido + painel de gasto com terceiros |
| **3** | Validação RNTRC/CNPJ + alertas |
| **4** | Puxar CT-e automático via SEFAZ/Focus NFe (manifestação do tomador) |

---

*Relacionados: `12-migracao-postgresql-tms.md`, `04-modulos.md`. Memória: `project_tms_mapa_completo`.*

---

## Relacionado

- Anterior: [[12-migracao-postgresql-tms]]
- Próximo: [[14-levantamento-logistica]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
