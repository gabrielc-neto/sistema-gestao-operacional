---
name: feedback-login-fullbleed-cta-pattern
description: "Login pattern approved 2026-07-02 for logistica-ia — full-bleed background photo, empty landing with single \"Entrar\" CTA top-right, overlay card that appears on click"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 242b4137-de6d-41e3-b8e4-e2493565140b
---

Padrão de login aprovado pelo user em 2026-07-02 no `logistica-ia` (substitui o padrão split `[[feedback-login-split-pattern]]`):

- **Foto institucional full-bleed** como background (`position: fixed; inset: 0; object-fit: cover`) — no caso, `/login-aerea.jpg` (vista aérea da base Pontual)
- **`brightness(1.15) saturate(1.05)`** direto na `<img>` do fundo
- **Overlay gradient** navy bem sutil (opacidade máx 0.25) só pra legibilidade — não escurece a foto
- **Tela abre limpa**: só a foto + botão pill "Entrar" (glass, `backdrop-filter: blur(16px) saturate(180%)`) no canto superior direito. Sem logo, sem título, sem nada mais
- **Card do form escondido** por default (`useState mostrarLogin = false`). Só renderiza após clicar Entrar
- **Card branco sólido** (não glass) ancorado à esquerda com `padding-left: clamp(32px, 8vw, 120px)` no shell — não centralizado
- **Backdrop escuro** `rgba(0,0,0,0.35)` atrás do card quando aberto, com animação `fadeIn` + `popIn`
- **Três formas de fechar** o card: X no canto, clique no backdrop, tecla ESC
- **Mobile** (`<480px`): shell volta a `justify-content: center`, botão CTA menor

**Why:** User queria a foto da base Pontual respirando ("aparecendo a base"), sem elementos institucionais poluindo a landing. Layout split anterior competia com a foto; liquid glass ficou "carregado demais". Solução: foto = protagonista, form = ação secundária invocada sob demanda. Aprovado com "ficou otimo" após 2 iterações rápidas (glass → card sólido → toggle CTA).

**How to apply:** Em qualquer tela de entrada branded futura:
1. Foto real da empresa como fundo full-bleed antes de qualquer decoração
2. `brightness` filter direto na `<img>` é mais barato que 2ª camada — sempre testa antes de gradient extra
3. CTA glass no canto funciona porque contrasta com foto sem competir com ela
4. Card = decisão do user, não do designer — landing limpa + toggle explícito respeita quem ainda não decidiu logar
5. Card sólido branco venceu glass sobre foto real (contraste inequívoco > vibe premium)
6. Manter ESC + click-outside + botão X sempre juntos — user aprendeu um, aciona o outro

Assets: `frontend/public/login-aerea.jpg` (6 MB, foto oficial), `pontual-logo-white.png` (logo branca — não usada mais no login, só no dashboard depois de logar).

Relacionado: [[project-logistica-ia-frontend]] [[feedback-login-split-pattern]] [[project-pontual-logo-white-aprovada]]
