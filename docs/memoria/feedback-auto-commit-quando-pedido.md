---
name: feedback-auto-commit-quando-pedido
description: User autorizou commit + push sem pedir confirmação adicional quando ele pedir explicitamente
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2f7e3d50-3571-4b84-bb8a-7b9e0bfbd827
---

Quando o user disser "commita", "sobe", "manda pro github", "push", "comita" ou variantes, executar `git add` + `git commit -m "<mensagem>"` + `git push` direto, sem etapa de confirmação intermediária.

**Why:** Sessão 2026-06-16 no projeto `logistica-ia` — user pediu "sempre que eu mandar você comita automaticamente" depois de configurar gh CLI. Repo é privado, só ele e o sócio Gabriel têm acesso. Confirmar a cada commit cria fricção que ele não quer.

**How to apply:**
1. **Só commitar quando o user pedir explicitamente** — não inferir de "ficou perfeito" ou outras aprovações de feature
2. Antes de commitar:
   - Rodar `git status` rápido pra montar mensagem boa (não pra confirmar — só pra contexto)
   - Mensagem em português, descritiva do que mudou
   - Conventional Commits NÃO é obrigatório, mas usar prefixos `feat:`, `fix:`, `chore:` ajuda
3. Stage seletivo: usar `git add <arquivos>` específicos, não `git add -A` (evita acidentalmente subir `.env`, `node_modules`, lixo)
4. Push direto pra `origin/master` (branch padrão do projeto) — não criar branch separada salvo se ele pedir
5. Mensagem final pro user: 1 linha confirmando push + URL do commit se possível

**Exceções:**
- **NÃO commitar `.env`, credenciais, segredos** mesmo se ele pedir "manda tudo"
- **NÃO commitar arquivos suspeitos** que apareceram em git status sem ele saber — avisar antes
- Se houver conflito com remote, fazer `git pull --rebase` antes do push

Relacionado: [[project-logistica-ia-frontend]]


## Mesma categoria (feedback)

[[feedback-login-split-pattern]] | [[feedback-svg-logo-iteration-cost]] | [[feedback-windows-file-watcher]] | [[feedback_analise_esportiva_checklist]] | [[feedback_arquivo_explicito_obrigatorio]]
