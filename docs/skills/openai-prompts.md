---
name: openai-prompts
description: >
  Skill completa sobre OpenAI: modelos, custos, system prompts, few-shot, controle de temperatura,
  tokens, funções/tools, streaming e boas práticas de integração. Use sempre que o usuário mencionar
  OpenAI, GPT, gpt-4o, gpt-4o-mini, system prompt, temperatura, tokens, completions, chat API,
  função OpenAI, tools, embeddings, custo por token, otimizar prompt, melhorar resposta da IA,
  ou qualquer integração com a API da OpenAI. Acionar também para "como reduzir custo OpenAI",
  "qual modelo usar", "prompt não está funcionando", "resposta muito longa", "IA saindo do contexto".
---

# OpenAI — Prompts, Modelos e Integração

## Modelos e Custos (referência)

| Modelo | Input (1M tokens) | Output (1M tokens) | Uso ideal |
|--------|-------------------|---------------------|-----------|
| gpt-4o | $2.50 | $10.00 | Tarefas complexas, raciocínio |
| gpt-4o-mini | $0.15 | $0.60 | Uso geral, custo-benefício ✅ |
| gpt-4-turbo | $10.00 | $30.00 | Contexto longo |
| gpt-3.5-turbo | $0.50 | $1.50 | Tarefas simples, barato |

> **Padrão recomendado:** `gpt-4o-mini` para produção com controle de custo.

---

## System Prompt — Boas Práticas

```javascript
const SYSTEM_PROMPT = `
Você é um assistente especializado em [DOMÍNIO].

COMPORTAMENTO:
- Responda sempre em português
- Seja objetivo e direto
- Se não souber, diga que não sabe

RESTRIÇÕES:
- Não invente informações
- Não saia do contexto de [DOMÍNIO]
- Limite respostas a no máximo 300 palavras

FORMATO:
- Use linguagem simples
- Evite jargões técnicos desnecessários
`.trim();
```

### Técnicas de System Prompt

**1. Persona + Domínio**
```
Você é um especialista em atendimento ao cliente de e-commerce.
Seu objetivo é resolver problemas rapidamente e com empatia.
```

**2. Chain of Thought (raciocínio passo a passo)**
```
Antes de responder, pense passo a passo:
1. Entenda o que o usuário quer
2. Identifique a melhor solução
3. Responda de forma clara
```

**3. Few-shot (exemplos no prompt)**
```
Exemplos de resposta esperada:

Usuário: "Quero cancelar meu pedido"
Assistente: "Entendido! Vou verificar o status do pedido #XXXX para você."

Usuário: "Onde está minha entrega?"
Assistente: "Vou rastrear agora! Pode me informar o número do pedido?"
```

**4. Output estruturado (JSON)**
```
Responda APENAS com JSON válido, sem texto extra:
{
  "intencao": "string",
  "entidades": {},
  "resposta": "string",
  "confianca": 0.0-1.0
}
```

---

## Parâmetros Importantes

```javascript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  
  // Controle de criatividade (0 = determinístico, 2 = muito criativo)
  temperature: 0.7,        // padrão recomendado para conversas
  // temperature: 0.0,     // para classificação/extração
  // temperature: 1.2,     // para geração criativa
  
  // Limite de tokens na resposta
  max_tokens: 500,
  
  // Evitar repetição (0 = desligado, 2 = máximo)
  frequency_penalty: 0.3,
  presence_penalty: 0.3,
  
  // Parar em palavra específica
  stop: ["\n\n", "FIM"],
  
  // Resposta em JSON (gpt-4o e gpt-4o-mini)
  response_format: { type: "json_object" },
});
```

---

## Contagem de Tokens

```javascript
// Estimativa rápida: 1 token ≈ 4 caracteres em inglês, ≈ 3 em português
function estimarTokens(texto) {
  return Math.ceil(texto.length / 3.5);
}

// Ver tokens usados na resposta
const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;
console.log({ prompt_tokens, completion_tokens, total_tokens });

// Calcular custo (gpt-4o-mini)
const custo = (prompt_tokens * 0.00000015) + (completion_tokens * 0.0000006);
console.log(`Custo: $${custo.toFixed(6)}`);
```

---

## Histórico de Conversa (Multi-turn)

```javascript
// Estrutura do histórico
const historico = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: "Olá!" },
  { role: "assistant", content: "Olá! Como posso ajudar?" },
  { role: "user", content: "Quero saber sobre meu pedido" },
];

// Limitar histórico para controlar tokens
function limitarHistorico(historico, maxMensagens = 10) {
  const system = historico.filter(m => m.role === "system");
  const restante = historico.filter(m => m.role !== "system");
  const ultimas = restante.slice(-maxMensagens);
  return [...system, ...ultimas];
}
```

---

## Tratamento de Erros OpenAI

```javascript
try {
  const completion = await openai.chat.completions.create({...});
} catch (err) {
  if (err.status === 429) {
    // Rate limit — aguardar e tentar de novo
    await new Promise(r => setTimeout(r, 2000));
    // retry...
  } else if (err.status === 503) {
    // Serviço indisponível
    return response(503, { erro: "OpenAI indisponível, tente em instantes" });
  } else if (err.status === 400) {
    // Prompt inválido ou contexto muito longo
    return response(400, { erro: "Mensagem inválida ou muito longa" });
  } else {
    throw err;
  }
}
```

---

## Streaming (resposta em tempo real)

```javascript
const stream = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || "";
  process.stdout.write(delta); // ou enviar via WebSocket
}
```

---

## Checklist de Otimização

- [ ] Usar `gpt-4o-mini` em vez de `gpt-4o` quando possível (16x mais barato)
- [ ] Definir `max_tokens` para evitar respostas longas desnecessárias
- [ ] Usar `temperature: 0` para tarefas de extração/classificação
- [ ] Limitar histórico a últimas 10 mensagens
- [ ] Logar `total_tokens` por requisição no CloudWatch
- [ ] Usar `response_format: json_object` para saídas estruturadas
- [ ] Testar prompt com casos extremos antes de ir pra produção
