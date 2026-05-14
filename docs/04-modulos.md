# 04 — Módulos do Sistema

[← Voltar para o índice](README.md)

Cada módulo é uma página React em `frontend/src/pages/` (ou `frontend/src/pages/admin/`), com sua coleção própria no Firestore.

## Login (`/`)

`frontend/src/pages/Login.jsx`

- Autenticação via Firebase Authentication (email/senha)
- Limite de **5 tentativas** com mensagem progressiva
- Trata erros específicos: `auth/too-many-requests`, `auth/user-disabled`
- Toggle de visibilidade de senha
- Redireciona para `/dashboard` em caso de sucesso
- `PublicRoute` no `App.jsx` redireciona logados de volta para `/dashboard`

## Dashboard (`/dashboard`)

`frontend/src/pages/Dashboard.jsx`

Tela inicial após login.

**Componentes:**
- **6 KPIs** com card colorido (Frota Ativa, Bloqueados, Motoristas Ativos, OCs Hoje, Em Férias Hoje, Manutenções Pendentes)
- **Painel "Últimas OCs"** — top 5 mais recentes
- **Grid de módulos** — cards que respeitam permissões do usuário

**Atualização automática:**
- Refresh ao voltar a aba ficar visível (`visibilitychange`)
- Polling de 60 segundos

**Visibilidade dos módulos:**
```js
m.perm ? temPermissao(m.perm)       // RBAC novo
       : m.module ? canView(m.module)  // RBAC legado
       : isAdmin
```

## Frota (`/frota`)

`frontend/src/pages/Frota.jsx`

Gestão de cavalos mecânicos (caminhões) e carretas.

**Recursos:**
- CRUD de veículos
- Tipo: `cavalo` ou `carreta`
- Status: ativo, disponível, em viagem, manutenção, inativo
- Atrelamento: cavalo guarda placas `c1` e `c2` (carretas)
- **Bloqueio**: campo `bloqueio.ativo = true` com motivo catalogado
- Busca de motorista com filtro de **férias ativas** (não permite atrelar quem está de férias)
- Cores por fabricante (Mercedes azul, Volvo azul-marinho, Scania, DAF laranja)

**Tipos de conjunto:**
- `LS` — caminhão simples (1 carreta)
- `Bitrem` — 2 carretas
- `Rodotrem` — 2 carretas + dolly
- `4° Eixo` — configuração específica

**Permissões:** `frota.ver`, `frota.criar`, `frota.editar`, `frota.excluir`.

## Motoristas (`/motoristas`)

`frontend/src/pages/Motoristas.jsx`

Cadastro de motoristas com documentos de habilitação.

**Recursos:**
- CRUD com busca por nome
- Filtro por status (ativo / inativo / desligado / todos)
- 4 documentos com data de vencimento: CNH, MOPP, NR-20, NR-35
- Status calculado por documento: `ok` (verde), `alerta` (laranja, ≤30 dias), `vencido` (vermelho), `sem_data` (cinza)

**Permissões:** `motoristas.ver`, `motoristas.criar`, `motoristas.editar`, `motoristas.excluir`.

## Atrelamento (`/atrelamento`)

`frontend/src/pages/Atrelamento.jsx`

Histórico de operações de atrelamento de carretas.

**Operações:**
- `ATRELAMENTO` — atrela carreta(s) ao cavalo
- `DESATRELAMENTO` — desatrela
- `SUBSTITUIÇÃO` — troca uma carreta por outra

**Numeração automática:** `ATR-0001`, `ATR-0002`, ...

**Recursos:**
- Status do registro: CONCLUÍDO / PENDENTE / CANCELADO
- Indicador visual (bolinha colorida) ao lado da placa mostrando status dos documentos da carreta:
  - Vermelho = vencido
  - Laranja = alerta (≤30 dias)
  - Verde = ok
- Filtros por operação, status e busca textual
- Exportação para CSV

**Permissões:** `atrelamento.ver`, `atrelamento.criar`, `atrelamento.editar`, `atrelamento.excluir`.

## Ordens de Carregamento — OC (`/oc`)

`frontend/src/pages/OC.jsx`

O coração da operação. Substitui o controle anterior em Excel.

**Numeração automática:** `OC-0001`, sequencial baseado no maior `num` existente (não na contagem, para evitar duplicação após exclusões).

**Campos:**
- Data, hora, base de carregamento (PONTUAL / REPLAN / OUTROS)
- Cavalo (placa) + carretas C1/C2 (preenchidas do veículo)
- Motorista (apenas ativos, filtrados via Firestore `where status == "ativo"`)
- Responsável pelo despacho
- **Entregas múltiplas** — cada uma com: destino (cliente), produto, volume em litros, número de requisição

**Total de litros** calculado em tempo real.

**Filtros:** por data (todas, hoje, 7 dias, 30 dias) e busca textual (cavalo, motorista, destino).

**Permissões:** `oc.ver`, `oc.criar`, `oc.editar`, `oc.aprovar`, `oc.excluir`.

## Manutenção (`/manutencao`)

`frontend/src/pages/Manutencao.jsx`

Centraliza vencimentos de **27 tipos** de itens.

### Grupos catalogados

**Documentação (veículo):**
- CIV — Certificado de Inspeção Veicular
- CIPP — Certificado de Inspeção para Produtos Perigosos
- CRLV — Certificado de Registro e Licenciamento do Veículo
- Tacógrafo — Calibração INMETRO
- Extintor — validade e recarga
- RNTRC — Registro ANTT
- Seguro
- Licença Paraná (bitrem)
- Licença Federal DNIT
- AET — Autorização Especial de Trânsito

**Motorista:**
- Validade CNH
- ASO — Atestado de Saúde Ocupacional
- Exame Toxicológico (Lei 13.103/2015, validade 2,5 anos)
- MOPP — Movimentação Operacional de Produtos Perigosos
- NR-20 — Segurança com Inflamáveis
- NR-35 — Trabalho em Altura

**Mecânica:**
- Troca de Óleo, Bateria, Engraxe Geral, Pneus, Freios, Suspensão, Alinhamento, Arrefecimento, Embreagem, Diferencial/Câmbio, Preventiva

**Campos por item** (variáveis conforme tipo): data_realiz, venc, local, numero_doc, km_atual, resp, obs.

**Status calculado:**
- `vencido` (vermelho)
- `alerta` (laranja, ≤30 dias)
- `ok` (verde)
- `sem_data` (cinza)

**Permissões:** `manutencao.ver`, `manutencao.criar`, `manutencao.editar`, `manutencao.excluir`.

### Aba "Ordens de Serviço" (OS)

Aba adicional na página Manutenção. Cadastro de OSs mecânicas com numeração automática.

**Campos:**
- Tipo de serviço (dropdown: tipos mecânicos do catálogo + "Reparo geral", "Limpeza", "Borracharia", "Elétrica", "Lanternagem / Pintura", "Outro")
- Placa (input manual, uppercase automático)
- Motorista (dropdown dos motoristas ativos)
- Observações (textarea livre)
- Data/hora: preenchida automaticamente no momento de salvar
- Número: `OS-00001` sequencial

**Permissões:** `manutencao.ver` (leitura), `manutencao.criar` ou usuário ativo (criar), super admin (excluir).

**Coleção:** `ordens_servico` (ver [`03-modelo-dados.md`](03-modelo-dados.md)).

## Rastreamento (`/rastreamento`)

`frontend/src/pages/Rastreamento.jsx`

Mapa ao vivo da frota integrado à API SASCAR. Centro do diferencial da operação.

**Recursos visuais:**
- Mapa **Leaflet + OpenStreetMap** (gratuito, sem API key)
- Camada **Satélite** alternativa (Esri World Imagery, gratuito)
- Markers SVG de caminhão **rotacionados pela direção** real (`direcao` do pacote SASCAR)
- **Placa + nome do motorista logado** sempre visíveis em cima do ícone
- **Badge verde com km/h** quando em movimento
- **Pulso animado** em caminhões em movimento
- **Marker esmaecido** quando sinal velho (>15 min) ou cinza+grayscale (>1h)
- Polígonos de cercas eletrônicas renderizados em sobreposição

**Status (cores):**
| Status | Cor | Critério |
|---|---|---|
| EM_MOVIMENTO | Verde | ignição=1 + velocidade>0 |
| PARADO_LIGADO | Amarelo | ignição=1 + velocidade=0 |
| ESTACIONADO | Cinza | ignição=0 |
| SEM_DADOS | Cinza claro | veículo cadastrado mas sem pacote no Firestore |

> **Não usa o campo `bloqueio` da SASCAR.** Ver [`09-rastreamento.md`](09-rastreamento.md) seção "Decisões".

**KPIs clicáveis (filtram o mapa):**
- Em movimento
- Parados / ligados
- Estacionados
- Sem comunicação (alerta laranja se ≥1)

**Busca:** placa, cidade ou nome do motorista (case-insensitive, parcial).

**Toggle Mapa / Tabela:** alterna a visualização. Tabela tem 7 colunas (placa, motorista, status, velocidade, cidade/UF, endereço, última posição).

**Popup do caminhão (clique):**
- Status (badge colorido)
- Motorista logado
- Velocidade, direção (bússola N/NE/L/SE/S/SO/O/NO + graus)
- Ignição (ligada/desligada)
- GPS (sinal OK / sem sinal)
- Área (qual cerca o caminhão está dentro, se for o caso)
- Local (cidade/UF)
- Endereço (rua), referência
- Última posição (tempo decorrido)
- Odômetro (formatado em km)
- Bateria (vermelho se < 11V)
- **OC ativa** (se houver OC das últimas 48h pra essa placa): número, responsável, total de litros, base, hora — com link "Abrir OC →"
- Botões externos: 📷 **Street View** (Google Maps panorâmica), 🗺️ **Google Maps** (mapa convencional)

**Auto-refresh:** 30 segundos. Refetch quando aba volta a ficar visível.

**Permissões:** acessível para qualquer usuário autenticado (sem permissão dedicada hoje).

**Hooks:**
- `useSascarPosicoes` — polling automático da Cloud Function `sascarPosicoes`
- `useOcsAtivas` — busca OCs das últimas 48h em `ordens_carregamento`, indexa por placa
- `useCercas` — `onSnapshot` da coleção `cercas_eletronicas` (live update)

**Componentes:**
- `MapaFrota.jsx` — encapsula MapContainer, markers SVG, popups, layers
- `CercaEletronica.jsx` — renderiza polígonos + função `areaDoPonto(lat, lon, cercas)` (ray casting)

Detalhes técnicos completos: [`09-rastreamento.md`](09-rastreamento.md).

## Cercas Eletrônicas (`/cercas`)

`frontend/src/pages/Cercas.jsx`

Editor visual de polígonos geográficos usados pelo módulo Rastreamento.

**Recursos:**
- Mapa Leaflet em tela cheia
- Modo desenho: clica no mapa pra adicionar vértices (mínimo 3)
- Polígono parcial renderizado em tempo real
- Marker em cada vértice (bolinha azul)
- Modal de salvar: nome, tipo (Base / Cliente / Restrita / Outro), cor (5 opções)
- Sidebar com lista das cercas existentes (mostra nome, tipo, contagem de pontos)
- Excluir cerca (botão lixeira por item)

**Live sync:** usa `onSnapshot` — qualquer alteração reflete em todas as sessões abertas.

**Permissões:** qualquer usuário ativo (`isAtivo`) pode criar/editar/excluir (rule no Firestore).

**Coleção:** `cercas_eletronicas` (ver [`03-modelo-dados.md`](03-modelo-dados.md)).

## Férias (`/ferias`)

`frontend/src/pages/Ferias.jsx`

Controle de férias de motoristas com integração planejada com eSocial.

**Status calculado** pela data atual:
- `agendada` — início no futuro
- `em_ferias` — hoje entre início e fim
- `concluida` — fim no passado

**Alertas:**
- Lista férias que começam em **até 60 dias** com `esocial: false` (precisa informar ao eSocial)

**Integração com Frota:**
- Frota usa coleção `ferias` para bloquear atrelamento de motorista de férias

**Permissões:** `ferias.ver`, `ferias.criar`, `ferias.editar`, `ferias.excluir`.

## Histórico (`/historico`)

`frontend/src/pages/Historico.jsx`

Vista unificada de eventos do sistema.

**Fontes consolidadas:**
- Atrelamentos
- Ordens de Carregamento
- Manutenções

**Paginação:** 50 itens por página (`startAfter`).

**Filtros:**
- Por tipo (atrelamento / OC / manutenção / todos)
- Por período (hoje / 7 dias / 30 dias / todos)
- Busca textual

**Permissões:** `historico.ver`, `historico.exportar`.

## Usuários (`/usuarios`)

`frontend/src/pages/Usuarios.jsx`

CRUD de usuários do sistema.

**Recursos:**
- Cria usuário no Firebase Auth + documento em `usuarios/{uid}` em uma operação
- **Setor → Cargo carregamento dinâmico**: ao selecionar setor, os cargos do setor aparecem
- Toggle **Super Admin** (bypassa permissões)
- Ativar/desativar acesso sem deletar (preserva histórico)
- Cria em uma instância Auth auxiliar (`initializeApp` com nome único) para não fazer logout do admin

**Permissões:** `usuarios.ver`, `usuarios.criar`, `usuarios.editar`, `usuarios.excluir`.

## Setores (`/admin/setores`)

`frontend/src/pages/admin/Setores.jsx`

CRUD de departamentos da empresa.

**Campos:** nome, descrição, status (ativo/inativo).

**Permissões:** `setores.ver`, `setores.criar`, `setores.editar`, `setores.excluir`.

## Cargos & Permissões (`/admin/cargos`)

`frontend/src/pages/admin/Cargos.jsx`

Tela em duas colunas:

**Esquerda:** lista de cargos agrupados por setor. Clique seleciona o cargo.

**Direita:** árvore de checkboxes de permissões (agrupadas por módulo). Botões "Marcar tudo" e "Limpar" por módulo.

**Campos do cargo:** nome, setor, nível (1-10, para hierarquia visual), descrição, status, permissões[].

**Permissões:** `cargos.ver`, `cargos.criar`, `cargos.editar`, `cargos.excluir`, `permissoes.editar` (para alterar as permissões de um cargo já existente).

## Permissões legado (`/permissoes`)

`frontend/src/pages/Permissoes.jsx`

Matriz role × módulo com 3 níveis: sem acesso / ver / editar.

**Status:** legado. Mantido até que todos os usuários estejam com `setor_id` + `cargo_id` preenchidos. Conta agora consulta o RBAC novo via wrapper.

## Importação Admin (`/import`)

`frontend/src/pages/ImportAdmin.jsx`

Tela administrativa para importar dados em lote (CSV, JSON). Bundle separado (~102 kB) — só carrega sob demanda.

## Componentes compartilhados

### `LogoPontual.jsx`
Logo SVG da Pontual Logística. Aceita prop `height`.

### `SettingsMenu.jsx`
Botão de engrenagem ⚙ no header com menu dropdown:
- Nome do usuário + cargo (ROLE_LABEL legado)
- Alternar tema claro/escuro
- Sair (logout)

### `ThemeContext`
Provider de tema dark/light. Persiste no `localStorage`. Aplica via CSS Custom Properties (`var(--bg)`, `var(--text)`, etc.).

## Padrão de página

Todas as páginas seguem o mesmo esqueleto:

```jsx
const VAZIO = { ... };  // form inicial vazio

export default function MinhaPagina() {
  const navigate = useNavigate();
  const { temPermissao } = useRBAC();

  // Estado
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");

  // Carregar
  async function carregar() { ... }
  useEffect(() => { carregar(); }, []);

  // Salvar
  async function salvar(e) { ... }

  // Excluir
  async function excluir(item) { ... }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <LogoPontual height={36} />
        <span style={s.titulo}>Título</span>
        <ProtegerPor permissao="x.criar">
          <button onClick={abrirNovo}>+ Novo</button>
        </ProtegerPor>
        <button onClick={() => navigate("/dashboard")}>← Dashboard</button>
      </header>

      <div style={s.body}>
        {/* Lista + modal */}
      </div>
    </div>
  );
}

const s = { /* styles inline */ };
```
