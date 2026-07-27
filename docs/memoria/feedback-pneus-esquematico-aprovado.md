---
name: feedback-pneus-esquematico-aprovado
description: Layout esquemático da aba /pneus/Inspeção aprovado após muitas iterações — chassi vertical + travessas restritas + cubos radiais + pneus 42x70 coloridos
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 242b4137-de6d-41e3-b8e4-e2493565140b
---

Layout aprovado da aba Inspeção em `/pneus` (`frontend/src/pneus/AbaInspecao.jsx`) após ~20 iterações com o user:

- **Container do quadro**: fundo azul-clarinho (gradient `#dbeafe → #eef2f7`), border `1.5px solid #cbd5e1`, radius 12, overflow hidden
- **Cabine** só no cavalo, no topo: background gradient azul-navy (`#1e40af → #1a3a5c`), texto "◄ CABINE / FRENTE" branco 800 peso
- **Estepe** absoluto no canto superior direito: bloco tracejado com hachurado 45° (`repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, #f1f5f9 4px, #f1f5f9 8px)`), 32×52
- **Chassi vertical** no meio do corpo (`position: absolute; left: 50%; top: 20; bottom: 20; width: 16px`): gradient horizontal `#cbd5e1 → #94a3b8 → #cbd5e1`, borda `#64748b`
- **Cada eixo é uma linha grid `1fr 24px 1fr`** — coluna central de 24px é o mínimo necessário pro chassi passar (16px + 4px folga cada lado). NÃO usar 100px na coluna central — cria espaço vazio que separa cubos do chassi
- **Travessa horizontal do eixo**: dentro do container de cada lado (esquerda/direita) como elemento flex `flex: 0 1 60px`, altura 8px, gradient `#94a3b8 → #64748b`, border `#475569`. NUNCA usar position:absolute com `left:5% right:5%` — a travessa fica esticando além dos pneus
- **Cubo (roda)** de 24×24 circular, `radial-gradient(circle at 40% 40%, #94a3b8 20%, #334155 100%)`, border 2px `#1e293b`, marginLeft/Right -4px pra encostar no chassi
- **Pneu (CardPneu)**: 42×70, radius 8, gradient de fundo por status, borda 1px transparente, box-shadow interno pra dar volume, 2 sulcos decorativos horizontais (`::before/::after` com barrinha branca translúcida), rótulo do Fogo com background `rgba(0,0,0,.4)` em cima, posição embaixo — cores por sulco:
  - `>= 15mm`: verde (`linear-gradient(180deg, #22c55e, #15803d)`)
  - `6-15mm`: amarelo (`#eab308 → #a16207`)
  - `4-6mm`: laranja (`#f59e0b → #b45309`)
  - `< 4mm`: vermelho (`#dc2626 → #7f1d1d`) com animação `pulsePneu` piscando
  - vazio: hachurado 45° cinza claro com borda dashed
- **Click no pneu** abre `<ModalEditPneu>` com 3 campos (Nº Fogo autofocus, PSI, Sulco mm), botões Cancelar/Salvar
- **Odômetro** em barra laranja separada acima do desenho (não dentro do quadro esquemático), input livre, aviso "Manual" ao lado

**Why:** Sequência de iterações: user começou pedindo tabular, depois esquemático estilo Excel Controle de Pneus 3.0, depois disse pra tirar chassi/travessas/cubos (o preview ficou "amador" sem eles), depois voltou pedindo os 3 elementos DE VOLTA baseado numa foto real. Depois travessas passavam do pneu (bug de position:absolute) — resolvido movendo pra dentro do flex. Depois cubos ficavam separados do chassi (coluna central 100px muito larga) — resolvido reduzindo pra 24px. Aprovado com "ficou perfeito" no commit `21355c7`.

**How to apply:** Qualquer ajuste futuro do visual da aba Inspeção deve manter esses elementos. NÃO remover chassi/travessa/cubo mesmo que pareçam decorativos — são o que o user considera "profissional". Não usar position:absolute pra travessa (usa flex dentro). Manter coluna central do grid entre 20-30px máximo.

Relacionado: [[project-logistica-ia-frontend]] [[feedback-pneus-sem-sascar]]
