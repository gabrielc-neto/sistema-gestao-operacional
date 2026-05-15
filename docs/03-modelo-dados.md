# 03 — Modelo de Dados

[← Voltar para o índice](README.md)

Todas as coleções vivem no Firestore root do projeto `pontual-logistica`. Não há subcoleções no momento (a estrutura por tenant ainda não foi ativada).

## Tabela-mapa das coleções

| Coleção | Propósito | Documento ID | Cardinalidade |
|---|---|---|---|
| `usuarios` | Usuários do sistema | UID do Firebase Auth | 1 por pessoa |
| `setores` | Departamentos da empresa | auto | 6 (seed) |
| `cargos` | Funções dentro do setor | auto | 12 (seed) |
| `permissoes_catalogo` | Lista mestre de permissões | `<modulo>.<acao>` | 60 (seed) |
| `veiculos` | Frota: cavalos e carretas | auto | ~37 |
| `motoristas` | Motoristas | auto | conforme cadastro |
| `clientes` | Postos (clientes) | auto | 60+ |
| `produtos` | Combustíveis e similares | auto | ~6 |
| `usinas` | Origens de carga | auto | conforme cadastro |
| `pedidos` | Pedidos de clientes | auto | conforme operação |
| `ordens_carregamento` | OCs | auto | numeração OC-NNNN |
| `viagens` | Execução de OC pelo motorista | auto | 1 por OC |
| `atrelamentos` | Histórico ATR/DES/SUB | auto | numeração ATR-NNNN |
| `manutencoes` | Itens com vencimento (doc/mec) | auto | múltiplos por veículo |
| `ferias` | Férias dos motoristas | auto | múltiplos por motorista |
| `historico` | Log de auditoria | auto | um por ação |
| `config` | Configurações globais | `permissions`, etc. | poucos |
| `permissoes` | Matriz legada role × módulo | livre | em deprecação |
| `sascar_posicoes` | Última posição GPS persistida por veículo | `idVeiculo` (string) | 1 por veículo SASCAR |
| `cercas_eletronicas` | Geofences (base, cliente, restrita) — polígono ou círculo | auto | conforme desenho |
| `cercas_eventos` | Eventos ENTRADA/SAÍDA gerados pelo callable `sascarPosicoes` | composto `{idVeiculo}_{cercaId}_{idPacote}_{E|S}` | 1 por cruzamento de borda |
| `ordens_servico` | OS de manutenção mecânica | auto | numeração OS-NNNNN |

## Coleções RBAC

### `setores`

```
{
  nome: string,                        // "Logística"
  descricao: string,                   // "Operação logística e despacho"
  status: "ativo" | "inativo",
  created_at: timestamp,
  updated_at: timestamp
}
```

### `cargos`

```
{
  setor_id: string,                    // FK para setores
  nome: string,                        // "Supervisor"
  nivel: number,                       // 1 (baixo) a 5 (alto)
  descricao: string,
  status: "ativo" | "inativo",
  permissoes: string[],                // ["frota.ver","oc.editar",...] — denormalizado
  created_at: timestamp,
  updated_at: timestamp
}
```

**Decisão**: o array `permissoes` está dentro do cargo (denormalizado). Vantagem: 1 leitura traz o cargo + todas as permissões. Desvantagem: se uma permissão for renomeada globalmente, precisa atualizar em N cargos.

### `permissoes_catalogo`

Doc ID = nome da permissão (`<modulo>.<acao>`).

```
{
  nome: string,                        // igual ao ID, repetido para queries
  descricao: string,                   // "Editar Frota"
  modulo: string,                      // "frota"
  acao: string,                        // "editar"
  created_at: timestamp
}
```

### `usuarios`

Doc ID = UID gerado pelo Firebase Authentication.

```
{
  nome: string,
  email: string,                       // lowercase
  setor_id: string | null,             // FK para setores
  cargo_id: string | null,             // FK para cargos
  is_super_admin: boolean,             // ignora qualquer permissão se true
  ativo: boolean,                      // false bloqueia login
  role: string,                        // legado: "master" | "admin" | etc.
  created_at: timestamp,
  updated_at: timestamp
}
```

## Coleções operacionais

### `veiculos`

```
{
  placa: string,                       // "ABC1D23" (sem traço, uppercase)
  tipo: "cavalo" | "carreta",
  status: "ativo" | "disponivel" | "em_viagem" | "manutencao" | "inativo",
  modelo: string,                      // "Actros 2651"
  fabricante: string,                  // "MERCEDES-BENZ"
  ano_modelo: string,
  ano_fab: string,
  chassi: string,
  renavam: string,
  tara: string,                        // peso vazio em kg

  // Cavalos:
  cap: string,                         // capacidade total em litros
  comp: string,                        // composição (LS, Bitrem, Rodotrem, 4° Eixo)
  motorista: string,                   // nome do motorista atrelado
  c1: string,                          // placa da carreta 1
  t1: string,                          // tipo da carreta 1
  c2: string,                          // placa da carreta 2 (opcional)
  t2: string,                          // tipo da carreta 2

  // Bloqueio:
  bloqueio: {
    ativo: boolean,
    motivo: string,                    // "CIV" | "CIPP" | "Manutenção" | "Documentos vencidos" | "Revisão" | "Outro"
    obs: string
  } | null,

  obs: string
}
```

### `motoristas`

```
{
  nome: string,
  cnh: string,
  cat: string,                         // categoria CNH (D, E)
  tel: string,
  status: "ativo" | "inativo" | "desligado",
  obs: string,

  // Documentação com data de vencimento:
  cnh_venc: string,                    // "YYYY-MM-DD"
  mopp_venc: string,
  nr20_venc: string,
  nr35_venc: string
}
```

### `ordens_carregamento`

```
{
  num: string,                         // "OC-0001"
  data: string,                        // "YYYY-MM-DD"
  hora: string,                        // "HH:MM"
  base: "PONTUAL" | "REPLAN" | "OUTROS",
  cavalo: string,                      // placa
  motorista: string,
  motoristaNome: string,
  cavaloPlaca: string,
  resp: string,                        // responsável pelo despacho
  c1: string,                          // placa carreta 1
  t1: string,                          // tipo carreta 1
  c2: string,                          // placa carreta 2 (opcional)
  t2: string,
  obs: string,
  entregas: [
    {
      dest: string,                    // destino (cliente)
      prod: string,                    // produto
      vol: string,                     // volume em litros
      req: string                      // número de requisição
    }
  ],
  createdAt: timestamp,
  createdBy: string                    // UID
}
```

### `atrelamentos`

Histórico de operações ATR (atrelamento), DES (desatrelamento), SUB (substituição).

```
{
  num: string,                         // "ATR-0001"
  data: string,
  hora: string,
  op: "ATRELAMENTO" | "DESATRELAMENTO" | "SUBSTITUIÇÃO",
  cavalo: string,
  km: string,
  c1: string,                          // placa carreta 1 (antes ou atual)
  t1: string,
  c2: string,                          // placa carreta 2
  t2: string,
  motorista: string,
  local: string,
  status: "CONCLUÍDO" | "PENDENTE" | "CANCELADO",
  obs: string,
  createdAt: timestamp
}
```

### `manutencoes`

Item de manutenção/documentação com data de validade. Cada veículo pode ter dezenas.

```
{
  placa: string,                       // veículo
  tipo: string,                        // ver lista abaixo
  data_realiz: string,                 // data da última realização "YYYY-MM-DD"
  venc: string,                        // próximo vencimento "YYYY-MM-DD"
  local: string,                       // oficina/laboratório
  numero_doc: string,
  km_atual: string,                    // para itens mecânicos
  resp: string,
  obs: string,
  createdAt: timestamp
}
```

**Tipos disponíveis** (27 catalogados):

| Grupo | IDs |
|---|---|
| Documentação | civ, cipp, crlv, tacografo, extintor, rntrc, seguro, licenca_parana, licenca_federal, aet |
| Motorista | cnh_venc, aso, toxicologico, mopp, nr20, nr35 |
| Mecânica | oleo, bateria, engraxe, pneus, freios, suspensao, alinhamento, arrefecimento, embreagem, diferencial, preventiva |

Status calculado pelo `venc`: `vencido` (< hoje), `alerta` (até 30 dias), `ok`, `sem_data`.

### `ferias`

```
{
  motorista: string,                   // nome
  inicio: string,                      // "YYYY-MM-DD"
  fim: string,                         // "YYYY-MM-DD"
  obs: string,
  esocial: boolean,                    // true = informado ao eSocial
  createdAt: timestamp
}
```

Status calculado:
- `agendada` — início no futuro
- `em_ferias` — hoje entre início e fim
- `concluida` — fim no passado

Alertas: férias que começam em até 60 dias e `esocial = false`.

### `historico`

Log de auditoria. Atualmente unificado a partir de `atrelamentos`, `ordens_carregamento` e `manutencoes` em tempo de leitura (não há uma coleção `historico` separada com todos os eventos — a tela `Historico.jsx` consolida).

```
{
  tipo: "ATRELAMENTO" | "OC" | "MANUTENÇÃO",
  data: string,
  hora: string,
  descricao: string,
  usuario: string,
  raw: { ... }                         // doc original
}
```

### `pedidos`

```
{
  cliente: string,                     // FK para clientes
  produto: string,                     // FK para produtos
  litros: number,
  data_solicitada: string,
  status: string,
  nfe_vinculada: string                // futura
}
```

### `clientes` (postos)

```
{
  razao_social: string,
  cnpj: string,
  endereco: string,
  coordenadas: { lat: number, lng: number },
  contato: string
}
```

### `produtos`

```
{
  nome: string,                        // "Diesel S10"
  codigo_anp: string,
  unidade: "litros"
}
```

### `usinas`

```
{
  nome: string,
  endereco: string,
  coordenadas: { lat, lng },
  produtos_disponiveis: string[]
}
```

### `sascar_posicoes`

Última posição GPS de cada veículo da frota, persistida pela Cloud Function `sascarPosicoes`. Resolve o problema de "veículo sumir" quando a SASCAR retorna apenas pacotes recentes. Doc ID = `String(idVeiculo)` da SASCAR.

```
{
  idVeiculo: number,                   // 1870210
  placa: string,                       // "SEF1H36"
  idEquipamentoDesc: string | null,    // "LMU4230" ou "MSC830"
  atualizadoEm: timestamp,             // serverTimestamp
  ultimaPosicao: {
    idPacote: number,                  // identificador único do pacote SASCAR
    dataPosicao: string,               // "2026-05-14T11:45:28.0"
    dataPacote: string,
    latitude: number,                  // -25.5504296
    longitude: number,                 // -49.3682615
    direcao: number,                   // 0-359 (graus)
    velocidade: number,                // km/h
    ignicao: number,                   // 0 ou 1
    gps: number,                       // 0 (inválido) ou 1 (sinal ok)
    odometro: number,
    horimetro: number,
    tensao: number,                    // V da bateria
    uf: string,
    cidade: string,
    rua: string,
    pontoReferencia: string,
    idMotorista: number,               // 0 = ninguém logado via iButton
    nomeMotorista: string,             // pode vir vazio
    motoristaLogado: string | null,    // nomeMotorista normalizado (null se vazio)
    statusTexto: "EM_MOVIMENTO" | "PARADO_LIGADO" | "ESTACIONADO" | "SEM_DADOS",
    dentroDe: string[]                 // cercaIds em que o veículo está agora (Fase 1 — Cercas)
  }
}
```

**Status calculado por `statusFromPacote` em `functions/index.js`:**
- `EM_MOVIMENTO` — ignição=1 + velocidade>0
- `PARADO_LIGADO` — ignição=1 + velocidade=0
- `ESTACIONADO` — ignição=0
- `SEM_DADOS` — veículo cadastrado mas sem pacote algum no Firestore (caso especial, gerado no resultado, não persistido)

> **Nota importante:** o campo `bloqueio` da SASCAR **não** é usado como status. Ele reflete o estado da saída elétrica do equipamento (geralmente sempre armada como padrão de fábrica), não comando pendente. Vide [`09-rastreamento.md`](09-rastreamento.md) para detalhes.

### `cercas_eletronicas`

Geofences usadas em rastreamento. Suportam dois formatos: polígono ou círculo. Cercas legadas sem `formato` são tratadas como polígono.

```
{
  nome: string,                        // "Base PONTUAL", "Replan", "Cliente XYZ"
  tipo: "Base" | "Cliente" | "Restrita" | "Posto" | "Refinaria" | "Oficina" | "Outro",
  cor: string,                         // hex "#2563eb"
  formato: "poligono" | "circulo",     // adicionado na Fase 1; ausente = poligono

  // Quando formato = "poligono"
  pontos?: number[][],                 // [[lat, lng], ...] (≥3)

  // Quando formato = "circulo"
  centro?: { lat: number, lng: number },
  raio?: number,                       // metros (50-50000)

  criadoEm: timestamp,
  criadoPor: string,                   // email
  atualizadoEm?: timestamp,            // setado em updateDoc (edição)
  atualizadoPor?: string
}
```

Algoritmos em `frontend/src/components/CercaEletronica.jsx` e espelhados em `functions/src/sascar/geofence.js`:
- `pontoEmCerca(lat, lng, cerca)` — round-robin entre formatos
- Polígono: ray-casting
- Círculo: distância haversine ≤ raio

Detalhes completos em [`11-cercas-eletronicas.md`](11-cercas-eletronicas.md).

### `cercas_eventos`

Eventos de cruzamento de borda gerados pela Cloud Function `sascarPosicoes`. Cliente lê via `useEventosCerca` (snapshot live) — só Functions escreve.

```
{
  tipo: "ENTRADA" | "SAIDA",
  idVeiculo: number,
  placa: string,
  cercaId: string,                     // FK lógica para cercas_eletronicas/{id}
  cercaNome: string,                   // denormalizado
  cercaTipo: string,                   // denormalizado
  latitude: number,
  longitude: number,
  idPacote: number | null,             // pacote SASCAR que disparou
  dataPosicao: string | null,          // "2026-05-15T09:12:34.0" (data da SASCAR)
  timestamp: serverTimestamp,          // ordenação canônica
  criadoEmMs: number                   // Date.now() do servidor — usado em where>=X
}
```

Doc ID composto pra idempotência: `{idVeiculo}_{cercaId}_{idPacote}_{E|S}`.

Detecção: comparando `dentroDe` da nova posição com `dentroDe` da posição persistida anterior.

### `ordens_servico`

OS de manutenção mecânica criadas na aba "Ordens de Serviço" do módulo Manutenção. Não confundir com `ordens_carregamento` (OC).

```
{
  numero: string,                      // "OS-00001"
  dataHora: string,                    // ISO automática
  tipoServico: string,                 // "Troca de Óleo", "Freios", "Borracharia", etc.
  placa: string,                       // input manual maiúsculo
  motoristaId: string,                 // FK motoristas
  motoristaNome: string,               // denormalizado
  obs: string,
  criadoPor: string,                   // email
  criadoEm: string                     // ISO
}
```

Numeração automática: maior número existente + 1 (zero-padded 5 dígitos).

### `viagens`

```
{
  ordem_id: string,                    // FK para ordens_carregamento
  motorista_id: string,                // FK para usuários (motorista)
  status: "aguardando" | "carregando" | "em_rota" | "vazio" | "concluida",
  posicao_sascar: { lat, lng, timestamp },
  historico_eventos: []
}
```

## Relacionamentos

```
setores 1 ─── N cargos
cargos  1 ─── N usuarios
cargos  N ─── M permissoes_catalogo (denormalizado em cargos.permissoes[])

usuarios 1 ─── 1 motorista (mesmo nome — não há FK estrita ainda)

veiculos (cavalo) 1 ─── 1 motorista (campo motorista no cavalo)
veiculos (cavalo) 1 ─── 0..2 veiculos (carretas) (campos c1, c2)

veiculos 1 ─── N atrelamentos
veiculos 1 ─── N manutencoes
veiculos 1 ─── N ordens_carregamento

motoristas 1 ─── N ferias
motoristas 1 ─── N manutencoes (cnh_venc, aso, etc.)

ordens_carregamento 1 ─── 1 viagens
ordens_carregamento 1 ─── N pedidos (via entregas[])

veiculos 1 ─── 1 sascar_posicoes (por idVeiculo SASCAR)
cercas_eletronicas (independente — sem FK)

veiculos 1 ─── N ordens_servico (via placa)
motoristas 1 ─── N ordens_servico (via motoristaId)
```

## Convenções de campos

| Convenção | Exemplo | Motivo |
|---|---|---|
| Datas como ISO `YYYY-MM-DD` | `"2026-05-13"` | string ordenável, fácil de comparar |
| Timestamps com `serverTimestamp()` | `created_at` | hora do servidor, evita relógio errado do cliente |
| Placas normalizadas | `"ABC1D23"` | uppercase, sem traço, sem espaços |
| Nomes próprios | `"Wesley Silva"` | capitalização preservada |
| Email | `"wesley@..."` | sempre lowercase |
| Status como string | `"ativo"`, `"inativo"` | nunca booleano em status (mais legível, mais valores) |
| Boolean ativo | `ativo: true` | flag simples on/off |

## Strings mágicas: catalogadas

Para evitar typos, valores enumerados estão em constantes em cada página. Exemplos:

| Constante | Onde | Valores |
|---|---|---|
| `TIPOS` | Frota, OC, Atrelamento | `"LS"`, `"Bitrem"`, `"Rodotrem"`, `"4° Eixo"` |
| `STATUS_OPTS` (frota) | Frota | `"ativo"`, `"disponivel"`, `"em_viagem"`, `"manutencao"`, `"inativo"` |
| `BASES` (OC) | OC | `"PONTUAL"`, `"REPLAN"`, `"OUTROS"` |
| `PRODUTOS` (OC) | OC | 6 combustíveis catalogados |
| `MOTIVOS_BLOQUEIO` (frota) | Frota | 6 motivos catalogados |
| `OPERACOES` (atrelamento) | Atrelamento | `"ATRELAMENTO"`, `"DESATRELAMENTO"`, `"SUBSTITUIÇÃO"` |

## Índices Firestore

Atualmente nenhum índice composto explicitamente declarado em `firestore.indexes.json` (Firestore cria índices simples automaticamente). Quando aparecer o erro "needs an index", criar via console.
