# 📏 Regras de Trabalho — Como conduzir a conversa

> Compilado das correções e feedbacks acumulados. Ler ANTES de responder.

## 🎯 Princípios (não negociáveis)

### 1. Consultar antes de agir
- Antes de sugerir criar módulo/coleção/tela → **`grep -r`** no `frontend/src` pra ver se já existe
- Antes de perguntar contexto → ler `docs/sessoes/` mais recente
- Antes de repetir informação → ler `docs/memoria/MEMORY.md`

### 2. Ler CONTEÚDO, não só o nome
- Documento PDF/planilha → abrir e ler texto (com OCR se for imagem)
- Nome de arquivo pode estar errado (ex: "CIPP xxx.pdf" que é CRLV)
- Extrair placa/data/tipo do texto real

### 3. Registrar tudo em tempo real
- Cada modificação → append em `docs/sessoes/YYYY-MM-DD.md` com timestamp `## HH:MM`
- Cada decisão importante → nova memória em `docs/memoria/`
- Hooks técnicos (SessionStart + UserPromptSubmit + Stop) já garantem — mas EU também devo confirmar

### 4. Sugerir com opinião formada
- ❌ Ruim: "Opção A, B ou C — qual prefere?"
- ✅ Bom: "Recomendo B porque X, Y, Z. Se preferir outro caminho me diz"
- User já disse: "sugerir direto quando opinião formada, não listar opções neutras"

## 💬 Tom e cadência

- **Respostas curtas** — 3-5 frases + tabela quando útil
- **Português direto** — sem enrolação
- **Emojis moderados** — 🎯 ✅ 🔴 ⚠️ 📁 pra sinalizar visualmente
- **Tabelas Markdown** — quando comparar coisas ou listar categorias
- **Bloco de código** — pra caminhos, comandos, snippets
- **Sem despedidas longas** — termina com o resultado

## 🚦 Fluxo padrão de trabalho

### Ao receber pedido:
1. **Leio pendências** da última sessão
2. **Confirmo entendimento** em 1 frase se for ambíguo
3. **Executo** — sem perguntar autorização pra cada micro-passo
4. **Reporto** — o que fiz, onde salvou, próximo passo

### Ao encontrar erro:
1. **Diagnostico** — mostro qual é o problema
2. **Explico causa** — por que aconteceu
3. **Ofereço fix** — recomendo caminho + alternativas
4. **NÃO uso** destrutivo (rm -rf, force push, etc) sem pedir

### Ao ficar em dúvida:
1. **Pergunta 1x** — com opções concretas + minha recomendação
2. **Registra no log** que fiquei em dúvida
3. **NÃO chuta** — se não tem dado, pergunta

## 🛠 Uso de ferramentas

- **Bash** — comandos curtos, sempre com paths absolutos entre aspas
- **Write/Edit** — SEMPRE ler antes de escrever em arquivo existente
- **Background jobs** — pra tarefas > 30s (OCR, robocopy) + watchdog pra notificar
- **Múltiplas tools em paralelo** — quando não há dependência

## 📁 Onde salvar cada coisa

| Tipo de conteúdo | Onde |
|---|---|
| Log editorial da sessão | `docs/sessoes/YYYY-MM-DD.md` (append) |
| Decisão/regra permanente | `docs/memoria/[tipo]_nome.md` + `.claude/projects/.../memory/` |
| Prompt do user (auto via hook) | `docs/prompts-user/YYYY-MM-DD.md` |
| Conversa completa (auto via hook Stop) | `docs/conversas-claude/*.md` |
| Script novo | `scripts/nome.py` ou `functions/scripts/nome.mjs` |
| Doc técnica formal | `docs/NN-tema.md` (numerado) |
| Templates Obsidian | `docs/templates/` |
| Arquivos auxiliares (planilhas, PPTs, PDFs) | `arquivo/desktop/` ou `arquivo/documents-fiscal/` |
| Backup do pendrive | `arquivo/pendrive-completo/` |
| Downloads recentes do PC | **NÃO ENTRA NO OBSIDIAN** — deixa em `arquivo/downloads-pontual/` (gitignored) |

## 🔴 Coisas que NUNCA fazer

1. **Deletar sem confirmar** — nem `rm -rf`, nem `git reset --hard`, nem `git push --force`
2. **Commitar credenciais** — `.env`, service account, senhas
3. **Modificar disco F:** — regra do Wesley, intocável
4. **Perguntar "onde paramos?"** — está no vault
5. **Resetar senha Firebase** sem pedido explícito
6. **Criar módulo** sem verificar se já existe
7. **Classificar por nome de arquivo** — sempre por conteúdo
8. **Confundir cavalo com carreta** — Pontual usa 3 eixos no cavalo, 5/7/9 no conjunto
9. **Indexar Downloads no Obsidian** — regra permanente
10. **Subir dados novos no Firestore** enquanto a migração pra Hostinger não for decidida

## ✅ Coisas que SEMPRE fazer

1. **Ler contexto antes de responder** (SessionStart hook já faz o dump pra mim)
2. **Registrar no log** cada bloco de trabalho
3. **Manter Obsidian atualizado** — hook `Stop` roda auto, mas eu confirmo se falhar
4. **Fazer OCR** quando PDF for imagem
5. **Verificar antes de agir** — `grep`, `ls`, `git status` antes de mudanças grandes
6. **Reportar link/caminho** — quando salvar algo, dizer onde está no disco
7. **Salvar como memória** decisões que valem pra próximas sessões
8. **Testar hook** quando criar/modificar automação

## 🧠 Multi-Claude — modo continuidade

User usa várias IAs. Se você é a segunda/terceira Claude na conversa:

1. **NÃO se apresente** — ele já sabe
2. **NÃO peça contexto** — leia [[BRAIN]] + última sessão + última conversa
3. **Continue no tom** que a IA anterior estava usando
4. **Assuma o trabalho** — não critique o que outra IA fez
5. **Alerta apenas se detectar erro** — pontual, não editorial

---

*Estas regras evoluem. Quando o user corrige algo novo, adicionar aqui + em `docs/memoria/`.*
