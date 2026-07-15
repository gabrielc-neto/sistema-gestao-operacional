---
name: onboarding-usuario
description: >
  Skill completa para fluxo de onboarding de usuários: cadastro, boas-vindas, coleta de perfil
  via chatbot, primeira experiência, tutorial guiado e ativação. Use sempre que o usuário mencionar
  onboarding, cadastro, primeiro acesso, boas-vindas, tutorial, ativação, coleta de dados do
  usuário, perfil inicial, fluxo de entrada, ou quando pedir "criar fluxo de cadastro",
  "primeira mensagem do bot", "coletar nome do usuário", "guiar novo usuário", "ativar conta",
  "fluxo de boas-vindas", "bot de onboarding", "perguntar dados ao usuário".
---

# Onboarding — Fluxo Completo

## Fluxo de Onboarding via Chatbot

```
1. Novo usuário → mensagem inicial
2. Bot coleta nome → salva no perfil
3. Bot coleta objetivo/contexto → personaliza experiência
4. Bot apresenta funcionalidades
5. Usuário começa a usar → onboarding concluído
```

---

## Estados do Onboarding

```javascript
// onboarding.js
const ESTADOS = {
  NOVO: "novo",
  AGUARDANDO_NOME: "aguardando_nome",
  AGUARDANDO_OBJETIVO: "aguardando_objetivo",
  APRESENTANDO_FEATURES: "apresentando_features",
  CONCLUIDO: "concluido",
};

const MENSAGENS = {
  BOAS_VINDAS: `👋 Olá! Seja bem-vindo!

Sou seu assistente virtual e estou aqui para ajudar você.

Para começar, como posso te chamar?`,

  AGUARDANDO_OBJETIVO: (nome) => `Prazer, ${nome}! 😊

Para te ajudar melhor, me conta: qual é o principal objetivo que você quer alcançar com minha ajuda?

Exemplos:
• Tirar dúvidas rápidas
• Ajuda com textos e conteúdo
• Suporte técnico
• Outro (me conte!)`,

  APRESENTANDO_FEATURES: (nome, objetivo) => `Perfeito! Vou focar em te ajudar com: *${objetivo}*

Aqui está o que posso fazer por você:
✅ Responder perguntas
✅ Ajudar com textos
✅ Dar sugestões e ideias
✅ Resolver problemas

É só me mandar uma mensagem quando quiser! Como posso te ajudar hoje?`,

  JA_CADASTRADO: (nome) => `Olá, ${nome}! Como posso ajudar você hoje?`,
};
```

---

## Handler com Fluxo de Onboarding

```javascript
const { ESTADOS, MENSAGENS } = require("./onboarding");

exports.handler = async (event) => {
  const { userId, mensagem } = JSON.parse(event.body || "{}");

  const perfil = await carregarPerfil(userId);
  const estado = perfil.onboardingEstado || ESTADOS.NOVO;

  let resposta;
  let novoEstado = estado;
  const updates = {};

  switch (estado) {
    case ESTADOS.NOVO:
    case ESTADOS.AGUARDANDO_NOME:
      // Salvar nome
      const nome = mensagem.trim().split(" ")[0]; // primeiro nome
      updates.nome = nome;
      updates.onboardingEstado = ESTADOS.AGUARDANDO_OBJETIVO;
      novoEstado = ESTADOS.AGUARDANDO_OBJETIVO;
      resposta = MENSAGENS.AGUARDANDO_OBJETIVO(nome);
      break;

    case ESTADOS.AGUARDANDO_OBJETIVO:
      // Salvar objetivo
      updates.objetivo = mensagem.trim();
      updates.onboardingEstado = ESTADOS.APRESENTANDO_FEATURES;
      novoEstado = ESTADOS.APRESENTANDO_FEATURES;
      resposta = MENSAGENS.APRESENTANDO_FEATURES(perfil.nome, mensagem.trim());

      // Marcar onboarding como concluído após mostrar features
      setTimeout(async () => {
        await atualizarPerfil(userId, { onboardingEstado: ESTADOS.CONCLUIDO });
      }, 100);
      break;

    case ESTADOS.CONCLUIDO:
    default:
      // Usuário já passou pelo onboarding — processar normalmente com IA
      if (perfil.nome) {
        resposta = await processarComIA(userId, mensagem, perfil);
      } else {
        // Fallback: iniciar onboarding
        updates.onboardingEstado = ESTADOS.AGUARDANDO_NOME;
        resposta = MENSAGENS.BOAS_VINDAS;
      }
      break;
  }

  // Atualizar perfil se necessário
  if (Object.keys(updates).length > 0) {
    await atualizarPerfil(userId, updates);
  }

  return resp(200, {
    resposta,
    onboardingConcluido: novoEstado === ESTADOS.CONCLUIDO,
    perfil: { nome: perfil.nome || updates.nome },
  });
};
```

---

## Primeira Mensagem (Detectar novo usuário)

```javascript
async function carregarOuCriarPerfil(userId) {
  const perfil = await carregarPerfil(userId);

  if (!perfil) {
    // Novo usuário — criar perfil e iniciar onboarding
    const novoPerfil = {
      userId,
      onboardingEstado: "aguardando_nome",
      criadoEm: new Date().toISOString(),
      historico: [],
      tokens: {},
    };
    await salvarPerfil(userId, novoPerfil);
    return { perfil: novoPerfil, ehNovo: true };
  }

  return { perfil, ehNovo: false };
}
```

---

## Personalizar IA após Onboarding

```javascript
function montarSystemPrompt(perfil) {
  let prompt = `Você é um assistente virtual prestativo.`;

  if (perfil.nome) {
    prompt += ` Você está conversando com ${perfil.nome}.`;
  }
  if (perfil.objetivo) {
    prompt += ` O principal objetivo do usuário é: ${perfil.objetivo}.`;
    prompt += ` Foque em ajudar com isso sempre que possível.`;
  }

  prompt += ` Responda sempre em português, de forma clara e amigável.`;
  return prompt;
}
```

---

## Dados Salvos no DynamoDB após Onboarding

```json
{
  "userId": "whatsapp:+5541999999999",
  "nome": "João",
  "objetivo": "Tirar dúvidas técnicas sobre AWS",
  "onboardingEstado": "concluido",
  "criadoEm": "2025-01-15T10:00:00Z",
  "plano": "free",
  "historico": [],
  "tokens": {}
}
```

---

## Boas Práticas de Onboarding

- Máximo 3 perguntas no onboarding (não cansar o usuário)
- Permitir pular etapas (`/pular` ou "não sei")
- Salvar estado a cada etapa (não perder progresso)
- Onboarding deve ser concluído em menos de 2 minutos
- Após concluído, nunca repetir as perguntas de onboarding
- Permitir atualizar nome/objetivo depois via comando (`/perfil`)
