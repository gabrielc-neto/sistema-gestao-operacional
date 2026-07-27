---
name: feedback-jamais-emoji-sempre-icones
description: "REGRA PERMANENTE: nunca usar emoji em UI (nem em labels, badges, botões, modals, alertas). Sempre usar ícones da biblioteca Lucide-React (já instalada). Emojis são inconsistentes visualmente e não escalam com design system."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2026-07-21-manutencao-features
---

## Regra

**Em NENHUMA hipótese usar emoji em UI do sistema Pontual.**

Emojis proibidos em:
- Labels de botão (❌ "📷 Fotos" ✅ `<Camera /> Fotos`)
- Badges de status (❌ "🔴 crítico" ✅ `<Circle fill="red" />` ou `<AlertCircle />`)
- Ícones inline em tabelas
- Modais e headers
- Chips de filtro
- Insights/alerts (❌ "💡 dica" ✅ `<Lightbulb />`)

**Sempre usar ícones do Lucide-React** (`lucide-react` já instalado no `frontend/`).

## Why

User (Rosilda) corrigiu 2026-07-21 após demo das features novas — várias telas com emoji ficaram inconsistentes com o resto do sistema (que usa Lucide em 100% dos outros componentes). Preferência dela é clara: **sistema profissional visual precisa consistência de ícones**.

Emojis renderam diferente em cada OS/browser (Windows tem uma versão, Mac outra, Linux outra), quebram alinhamento vertical, e não respeitam tema/cor do design system.

## How to apply

**Padrão substituição:**

| Emoji | Ícone Lucide | Uso |
|---|---|---|
| 🔴 | `<Circle fill="#dc2626" stroke="none" size={10} />` OU `<AlertCircle size={14} color="#dc2626" />` | Status crítico |
| 🟡 | `<Circle fill="#eab308" stroke="none" size={10} />` OU `<AlertTriangle size={14} color="#eab308" />` | Alerta |
| 🟢 | `<Circle fill="#16a34a" stroke="none" size={10} />` OU `<CheckCircle2 size={14} color="#16a34a" />` | OK |
| 📷 | `<Camera size={14} />` | Fotos |
| 📄 | `<FileText size={14} />` ou `<FileUp size={14} />` | Documento/upload |
| 📤 | `<Upload size={14} />` | Upload |
| 🗑️ | `<Trash2 size={14} />` | Deletar |
| 💡 | `<Lightbulb size={14} />` | Dica/insight |
| 🥇 | `<Trophy size={14} />` ou `<Award size={14} />` | Ranking top |
| 💸 | `<TrendingUp size={14} />` | Custo alto |
| 📅 | `<Calendar size={14} />` | Data |
| ⏳ | `<Loader size={14} className="animate-spin" />` | Loading |
| ✅ | `<Check size={14} />` ou `<CheckCircle2 />` | Confirmação |
| ❌ | `<X size={14} />` ou `<XCircle />` | Erro |
| ⚠️ | `<AlertTriangle size={14} />` | Aviso |

**Import padrão:**
```javascript
import { Camera, FileText, Circle, AlertCircle, CheckCircle2, Trash2, Lightbulb } from "lucide-react";
```

## Escopo desta regra

- ✅ Vale pra UI do sistema (React frontend)
- ⚠️ **Comunicação em chat/log/sessão pode ter emoji** — economiza espaço e é o meu canal padrão
- ⚠️ **Toast Windows/notif OS-level** — pode usar emoji (PowerShell não renderiza SVG)
- ⚠️ **Email** — pode usar emoji no subject line se ajudar (Gmail renderiza)

Ver também: [[project-logistica-ia-frontend]] · [[feedback-login-fullbleed-cta-pattern]]
