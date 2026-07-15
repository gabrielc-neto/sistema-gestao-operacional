# 08 — Desenvolvimento

[← Voltar para o índice](README.md)

## Setup local — primeira vez

```bash
# 1. Clonar (ou navegar para o repositório)
cd C:\Users\Logistica01\projetos\logistica-ia

# 2. Instalar dependências do frontend
cd frontend
npm install

# 3. Firebase CLI (se ainda não tiver)
npm install -g firebase-tools
firebase login

# 4. (Opcional) Python + firebase-admin para scripts
pip install firebase-admin
```

## Rodar em modo dev

```bash
cd frontend
npm run dev
```

Vite sobe em http://localhost:5173 com HMR (atualiza ao salvar).

A configuração do Firebase em `frontend/src/firebase/config.js` aponta direto para o projeto **de produção** (`pontual-logistica`). Quaisquer alterações em dados no dev **afetam produção**. Cuidado.

> Para isolar dev em um projeto Firebase separado, criar `pontual-logistica-dev` no console, exportar `firebaseConfig` distinto e usar variáveis de ambiente. Não está montado hoje.

## Comandos comuns

```bash
# Frontend
cd frontend
npm run dev          # dev server (HMR)
npm run build        # build de produção em dist/
npm run preview      # preview do build local
npm run lint         # ESLint

# Deploy (a partir da raiz)
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy                    # tudo

# Atalho Windows
deploy.bat           # build + deploy hosting
```

## Estrutura de uma nova página

1. Criar arquivo em `frontend/src/pages/MinhaPagina.jsx` (ou `pages/admin/`)
2. Seguir o esqueleto padrão (ver [04-modulos.md](04-modulos.md) — Padrão de página)
3. Adicionar rota em `App.jsx`:
   ```jsx
   const MinhaPagina = lazy(() => import("./pages/MinhaPagina"));

   <Route path="/minha-pagina" element={
     <Privada permissao="minhapagina.ver">
       <MinhaPagina />
     </Privada>
   } />
   ```
4. Adicionar card no Dashboard (`frontend/src/pages/Dashboard.jsx`) na constante `MODULES`
5. Adicionar permissões em `frontend/src/rbac/permissoes-catalogo.js` (MODULOS) **e** `scripts/seed_rbac.py`
6. Rodar `python scripts/seed_rbac.py` para popular o catálogo

## Padrões de código

### Imports
Ordem: React → libs externas → firebase → contextos/rbac → componentes → assets.

```jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";

import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useRBAC } from "../rbac/RBACContext";
import ProtegerPor from "../rbac/ProtegerPor";

import LogoPontual from "../components/LogoPontual";
```

### Estado
Estado local com `useState`. Estado compartilhado entre páginas: Context.

```jsx
const [form, setForm] = useState(VAZIO);
const [salvando, setSalvando] = useState(false);
const [erro, setErro] = useState("");
```

### Estilos
CSS inline em objeto `const s = { ... }` no fim do arquivo. Usa CSS Variables (`var(--bg)`, `var(--text)`, `var(--card-bg)`, `var(--border)`) que respeitam o tema.

```jsx
return <div style={s.wrap}>...</div>;

const s = {
  wrap:    { minHeight: "100vh", background: "var(--bg)", fontFamily: "system-ui, sans-serif" },
  header:  { background: "#1a3a5c", padding: "10px 24px", ... },
  ...
};
```

### Cores institucionais Pontual

| Cor | Hex | Uso |
|---|---|---|
| Azul institucional | `#1a3a5c` | Header, títulos |
| Amarelo destaque | `#f5c318` | Botões principais |
| Verde | `#3d6b47`, `#6aaa5e` | Gradiente da borda do header |
| Verde-claro | `#b5d947` | Gradiente |
| Laranja | `#f0a500` | Gradiente |

Gradiente do header: `linear-gradient(90deg, #3d6b47, #6aaa5e, #b5d947, #f5c318, #f0a500)`.

### Datas
Sempre **`YYYY-MM-DD`** no banco. Para exibir, helpers locais:

```js
function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
```

### Nomes
- Variáveis e funções: `camelCase`
- Constantes globais: `UPPER_SNAKE_CASE`
- Componentes: `PascalCase`
- Coleções Firestore: `snake_case` (`ordens_carregamento`)
- Campos Firestore: snake_case ou camelCase (inconsistente — uniformizar gradualmente; atual mistura)

### Tratamento de erro
```jsx
try {
  await operacao();
} catch (err) {
  if (err.code === "auth/email-already-in-use") setErro("Já existe");
  else setErro("Erro: " + err.message);
}
```

## Adicionando uma nova permissão

1. **Catálogo (frontend)** — `frontend/src/rbac/permissoes-catalogo.js`:
   ```js
   const EXTRAS = [
     // ...
     { nome: "modulo.acao", descricao: "Descrição clara", modulo: "modulo", acao: "acao" },
   ];
   ```
2. **Catálogo (Python)** — `scripts/seed_rbac.py`, lista `EXTRAS`:
   ```python
   EXTRAS = [
     # ...
     ("modulo.acao", "Descricao clara", "modulo", "acao"),
   ]
   ```
3. **Rodar seed:**
   ```bash
   python scripts/seed_rbac.py
   ```
4. **Atribuir aos cargos** que devem ter a permissão — em `/admin/cargos`
5. **Usar no código:**
   ```jsx
   <ProtegerPor permissao="modulo.acao">...</ProtegerPor>
   ```
6. **Atualizar regra Firestore** se a permissão controla escrita/leitura no banco:
   ```javascript
   match /minha_colecao/{id} {
     allow update: if temPermissao('modulo.acao');
   }
   ```
   Deploy: `firebase deploy --only firestore:rules`.

## Adicionando uma nova coleção

1. Definir o shape dos documentos no `docs/03-modelo-dados.md`
2. Criar regra em `firestore.rules`:
   ```javascript
   match /nova_colecao/{id} {
     allow read:   if temPermissao('novo.ver');
     allow create: if temPermissao('novo.criar');
     allow update: if temPermissao('novo.editar');
     allow delete: if temPermissao('novo.excluir');
   }
   ```
3. Deploy de regras
4. Criar página de CRUD seguindo o padrão

## Convenções de commit

(Não há hook formal hoje, mas padronizar para facilitar git log.)

```
feat: adiciona modulo de relatorios
fix: corrige calculo de litros total na OC
docs: atualiza secao de deploy
refactor: extrai logica de status para helper
style: ajusta padding da tabela de motoristas
chore: atualiza firebase-admin para 6.x
```

## Troubleshooting comum

### Tela em branco após deploy
- Hard refresh: `Ctrl + Shift + R`
- Aba anônima: `Ctrl + Shift + N`
- DevTools (F12) → Console — procurar erros vermelhos

### "Missing or insufficient permissions"
- Usuário não tem a permissão da coleção que está tentando acessar
- Verificar com `check_rbac.py` se os dados estão lá
- Verificar em `/admin/cargos` se o cargo do usuário tem a permissão necessária
- Se for Super Admin novo, garantir que `is_super_admin: true` está no doc

### `npm run dev` não recarrega ao salvar
- Pode ser cache do node_modules: `rm -rf node_modules && npm install`
- Verificar se Vite está em modo HMR (deve ser, é o default)

### Build falha em produção mas funciona em dev
- Diferente comportamento de imports — verificar paths case-sensitive (`./Pages` vs `./pages`)
- Tree-shaking quebra um import — usar `import * as` se necessário

### `npm install` muito lento
- `npm cache verify`
- Usar `npm ci` se tiver `package-lock.json` válido (instala mais rápido)

### Usuário não consegue logar
1. Confirmar que o usuário existe em `Firebase Authentication` (Console → Authentication)
2. Confirmar que tem doc em `usuarios/{uid}` (Console → Firestore)
3. Confirmar `ativo !== false` no doc
4. Se errou senha 5x, esperar ~1h ou redefinir no console

### Mudança em `firestore.rules` quebrou produção
```bash
# Reverter para versão anterior (em git)
git show HEAD~1:firestore.rules > firestore.rules
firebase deploy --only firestore:rules
```

### Permissão dada no admin não funciona
- O `RBACContext` carrega permissões **uma vez ao logar**. Logoff/login para refresh, ou:
- Apertar F5 — o profile é recarregado
- Para refresh automático sem F5, implementar `onSnapshot` no carregamento do cargo (futura melhoria)

### `firebase deploy` falha com "API not enabled"
1. Firebase Console → Configurações → Detalhes do projeto
2. Ativar APIs:
   - Cloud Firestore API
   - Firebase Hosting API
   - Identity Toolkit API

## Como debuggar

### Frontend
- Chrome DevTools (F12)
- React DevTools (extensão do navegador)
- `console.log` está liberado durante o dev — limpar antes de commit

### Firestore
- Firebase Console → Firestore → consulta direta nos documentos
- Indicadores de uso e regras na aba "Uso" e "Regras"

### Auth
- Firebase Console → Authentication → Users → ver UIDs, datas de criação, último login

## Roadmap de melhorias técnicas

Sem prazo definido — backlog conforme a operação cresce:

| Item | Prioridade | Esforço |
|---|---|---|
| Migrar para `onSnapshot` (real-time) nas telas críticas | Alta | Médio |
| Adicionar TypeScript incrementalmente | Média | Alto |
| Substituir CSS inline por Tailwind ou CSS Modules | Baixa | Alto |
| Adicionar testes (Vitest + Testing Library) | Alta | Alto |
| Multi-tenancy ativa (subcoleções por empresa) | Alta (quando vender) | Alto |
| PWA do motorista | Alta (Fase 2A) | Alto |
| Integração SASCAR | Alta (Fase 2B) | Alto |
| Relatórios PDF/Excel | Média | Médio |
| Logs estruturados de auditoria | Média | Médio |
| Dark mode em todas as telas (algumas faltam) | Baixa | Baixo |
| Limpar campos legados (`role` em usuários) após migração RBAC completa | Baixa | Baixo |

---

## Relacionado

- Anterior: [[07-scripts]]
- Próximo: [[09-rastreamento]]
- [[INDICE|🏠 Voltar ao índice]]
- [[CLAUDE|📖 Contexto do sistema]]
- [[MEMORY|🧠 Memórias]]
