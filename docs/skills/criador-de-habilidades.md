---
name: criador-de-habilidades
description: "Crie novas habilidades, modifique e melhore as existentes e meça o desempenho das habilidades. Use quando os usuários quiserem criar uma habilidade do zero, editar ou otimizar uma habilidade existente, execute avaliações para testar uma habilidade, compare o desempenho da habilidade com análise de variância ou otimize a descrição de uma habilidade para melhor precisão nos disparos."
---

Uma habilidade para criar novas habilidades e melhorá-las iterativamente.

Em um nível geral, o processo de criação de uma habilidade é o seguinte:

Decida o que você quer que a habilidade faça e mais ou menos como ela deve ser feita
Escreva um rascunho da habilidade
Crie alguns prompts de teste e execute o Claude com acesso à habilidade neles
Ajudar o usuário a avaliar os resultados tanto qualitativamente quanto quantitativamente
Enquanto as execuções acontecem em segundo plano, faça algumas avaliações quantitativas se não houver (se houver, você pode usar como está ou modificar se sentir que algo precisa mudar). Depois, explique para o usuário (ou, se já existiam, explique os que já existem)
Use o script para mostrar ao usuário os resultados para que ele possa analisar, e também deixe que ele olhe para as métricas quantitativaseval-viewer/generate_review.py
Reescreva a habilidade com base no feedback da avaliação do usuário sobre os resultados (e também se houver falhas evidentes que fiquem evidentes nos benchmarks quantitativos)
Repita até ficar satisfeito
Expanda o conjunto de testes e tente novamente em escala maior
Seu trabalho ao usar essa habilidade é descobrir em que ponto o usuário está nesse processo e então entrar para ajudá-lo a avançar nessas etapas. Por exemplo, talvez eles digam "Quero criar uma habilidade para X". Você pode ajudar a restringir o que eles querem dizer, escrever um rascunho, escrever os casos de teste, descobrir como eles querem avaliar, rodar todos os prompts e repetir.

Por outro lado, talvez eles já tenham um rascunho da habilidade. Nesse caso, você pode ir direto para a parte de avaliação/iteração do loop.

Claro, você deve sempre ser flexível e, se o usuário disser "Não preciso fazer várias avaliações, só sinta a sintonia comigo", você pode fazer isso em vez disso.

Depois que a habilidade termina (mas, novamente, a ordem é flexível), você também pode rodar o skill description improver, para o qual temos um script totalmente separado, para otimizar o disparo da habilidade.

Legal? Legal.

Comunicação com o usuário
O criador de habilidades pode ser usado por pessoas com ampla familiaridade com jargão de programação. Se você ainda não ouviu (e como poderia, só muito recentemente começou), há uma tendência agora em que o poder do Claude está inspirando encanadores a abrir seus terminais, pais e avós a pesquisar no Google "como instalar o npm". Por outro lado, a maioria dos usuários provavelmente é bastante alfabetizada em informática.

Então, por favor, preste atenção ao contexto para entender como formular sua comunicação! No caso padrão, só para te dar uma ideia:

"avaliação" e "referência" são borderline, mas ok
para "JSON" e "assertion", você quer ver pistas sérias do usuário de que ele sabe o que são essas coisas antes de usá-las sem explicá-las
Tudo bem explicar brevemente os termos se você estiver em dúvida, e sinta-se à vontade para esclarecer termos com uma definição curta se não tiver certeza se o usuário vai entender.

Criando uma habilidade
Intenção de Captura
Comece entendendo a intenção do usuário. A conversa atual pode já conter um fluxo de trabalho que o usuário quer capturar (por exemplo, se eles dizem "transforme isso em uma habilidade"). Se sim, extraia as respostas primeiro do histórico de conversas — as ferramentas usadas, a sequência de passos, as correções feitas pelo usuário, os formatos de entrada/saída observados. O usuário pode precisar preencher as lacunas e deve confirmar antes de prosseguir para a próxima etapa.

O que essa habilidade deveria permitir que Claude faça?
Quando essa habilidade deve ser ativada? (quais frases/contextos de usuário)
Qual é o formato de saída esperado?
Devemos criar casos de teste para verificar se a habilidade funciona? Habilidades com resultados objetivamente verificáveis (transformações de arquivos, extração de dados, geração de código, etapas fixas do fluxo de trabalho) se beneficiam dos casos de teste. Habilidades com resultados subjetivos (estilo de escrita, arte) muitas vezes não precisam delas. Sugira o padrão apropriado com base no tipo de habilidade, mas deixe o usuário decidir.
Entrevista e Pesquisa
Faça perguntas proativamente sobre casos extremos, formatos de entrada/saída, arquivos de exemplo, critérios de sucesso e dependências. Espere para escrever os prompts de teste até resolver essa parte.

Verifique os MCPs disponíveis – se for útil para pesquisa (pesquisando documentos, encontrando habilidades semelhantes, pesquisando boas práticas), pesquise em paralelo via subagentes se disponíveis, caso contrário inline. Venha preparado com contexto para reduzir o peso do usuário.

Escreva a SKILL.md
Com base na entrevista com o usuário, preencha estes componentes:

nome: Identificador de habilidade
Descrição: Quando acionar, o que ele faz. Esse é o principal mecanismo de gatilho – inclua tanto o que a habilidade faz Quanto contextos específicos para quando usá-la. Todas as informações de "quando usar" estão aqui, não no corpo. Nota: atualmente Claude tem tendência a "subativar" habilidades — a não usá-las quando seriam úteis. Para combater isso, por favor, deixe as descrições das habilidades um pouco "insistentes". Por exemplo, em vez de "Como construir um painel simples e rápido para exibir dados internos de Anthropic.", você pode escrever "Como construir um dashboard simples e rápido para exibir dados internos de Anthropic. Certifique-se de usar essa habilidade sempre que o usuário mencionar dashboards, visualização de dados, métricas internas ou quiser exibir qualquer tipo de dado da empresa, mesmo que não peça explicitamente um 'dashboard'."
compatibilidade: Ferramentas e dependências necessárias (opcionais, raramente necessárias)
O restante da habilidade :)
Guia de Escrita de Habilidades
Anatomia de uma Habilidade
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
Divulgação Progressiva
As habilidades utilizam um sistema de carregamento de três níveis:

Metadados (nome + descrição) - Sempre em contexto (~100 palavras)
SKILL.md corpo - No contexto sempre que a habilidade é ativada (<500 linhas ideal)
Recursos agrupados - conforme necessário (ilimitado, scripts podem ser executados sem carregar)
Essas contagem de palavras são aproximadas e você pode ficar mais longo, se necessário.

Padrões principais:

Mantenha SKILL.md abaixo de 500 linhas; Se você estiver chegando a esse limite, adicione uma camada adicional de hierarquia junto com indicadores claros sobre para onde o modelo que usa a habilidade deve ir a seguir para acompanhar.
Arquivos de referência claramente de SKILL.md com orientações sobre quando lê-los
Para arquivos de referência grandes (>300 linhas), inclua um sumário
Organização de domínio: Quando uma habilidade suporta múltiplos domínios/frameworks, organize por variante:

cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
Claude lê apenas o arquivo de referência relevante.

Princípio da Falta de Surpresa
Isso é óbvio, mas as habilidades não devem conter malware, código de exploração ou qualquer conteúdo que possa comprometer a segurança do sistema. O conteúdo de uma habilidade não deve surpreender o usuário em sua intenção se for descrito. Não aceite pedidos para criar habilidades enganosas ou habilidades projetadas para facilitar acessos não autorizados, exfiltração de dados ou outras atividades maliciosas. Coisas como "interpretar como um XYZ" são aceitáveis.

Padrões de Escrita
Prefira usar o formulário imperativo nas instruções.

Definindo formatos de saída - Você pode fazer assim:

## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
Exemplo de padrão - É útil incluir exemplos. Você pode formatá-los assim (mas se "Entrada" e "Saída" estiverem nos exemplos, talvez queira desviar um pouco):

## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
Estilo de Escrita
Tente explicar ao modelo por que as coisas são importantes em vez de MUST pesados e mofados. Use a teoria da mente e tente tornar a habilidade geral, sem se restringir a exemplos específicos. Comece escrevendo um rascunho e depois olhe com olhos novos e melhore.

Casos de Teste
Depois de escrever o rascunho da habilidade, crie 2-3 prompts realistas para testes — do tipo que um usuário real realmente diria. Compartilhe-as com o usuário: [você não precisa usar exatamente essa linguagem] "Aqui estão alguns casos de teste que eu gostaria de testar. Esses parecem certos ou preferem adicionar mais?" Então roda eles.

Salve casos de teste em . Não escreva afirmações ainda — apenas os prompts. Você vai redigir as declarações na próxima etapa enquanto as sequências estão em andamento.evals/evals.json

{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
Veja o esquema completo (incluindo o campo, que você adicionará depois).references/schemas.mdassertions

Execução e avaliação de casos de teste
Esta seção é uma sequência contínua — não pare no meio do caminho. NÃO use nem use nenhuma outra habilidade de teste./skill-test

Coloque resultados como irmãos no diretório de habilidades. Dentro do espaço de trabalho, organize os resultados por iteração (, , etc.) e, dentro disso, cada caso de teste recebe um diretório (, , etc.). Não crie tudo isso logo de cara — apenas crie diretórios conforme avança.<skill-name>-workspace/iteration-1/iteration-2/eval-0/eval-1/

Passo 1: Faça aparecer todas as sequências (com habilidade E base) no mesmo turno
Para cada caso de teste, faça aparecer dois subagentes no mesmo turno — um com a habilidade, outro sem. Isso é importante: não faça as runs com habilidade primeiro e depois volte para as bases depois. Inicie tudo de uma vez para que tudo termine mais ou menos ao mesmo tempo.

Corrida com habilidade:

Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <eval files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs to save: <what the user cares about — e.g., "the .docx file", "the final CSV">
Execução de referência (mesmo prompt, mas a linha de base depende do contexto):

Criar uma nova habilidade: nenhuma habilidade. Mesmo prompt, sem caminho de habilidade, salve para .without_skill/outputs/
Melhorando uma habilidade existente: a versão antiga. Antes de editar, faça um snapshot da habilidade (), depois aponte o subagente de referência para o snapshot. Salve em .cp -r <skill-path> <workspace>/skill-snapshot/old_skill/outputs/
Escreva um para cada caso de teste (as asserções podem ficar vazias por enquanto). Dê a cada avaliação um nome descritivo baseado no que está testando — não apenas "avaliação-0". Use esse nome para o diretório também. Se essa iteração usar prompts de avaliação novos ou modificados, crie esses arquivos para cada novo diretório de avaliação — não presuma que eles são transferidos de iterações anteriores.eval_metadata.json

{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
Passo 2: Enquanto as corridas estão em andamento, relabore as afirmações
Não espere apenas as passagens terminarem — você pode usar esse tempo de forma produtiva. Elabore afirmações quantitativas para cada caso de teste e explique para o usuário. Se as asserções já existirem em , revise-as e explique o que elas verificam.evals/evals.json

Boas afirmações são objetivamente verificáveis e têm nomes descritivos — elas devem ser vistas claramente no visualizador de benchmarks para que alguém que analise os resultados entenda imediatamente o que cada uma verifica. Habilidades subjetivas (estilo de escrita, qualidade do design) são melhor avaliadas qualitativamente — não force asserções em coisas que precisam de julgamento humano.

Atualize os arquivos e as afirmações assim que estiverem redigidas. Também explique ao usuário o que ele verá no visualizador — tanto os resultados qualitativos quanto o benchmark quantitativo.eval_metadata.jsonevals/evals.json

Passo 3: À medida que as execuções terminam, capture os dados de temporização
Quando cada tarefa do subagente é concluída, você recebe uma notificação contendo e . Salve esses dados imediatamente no diretório run:total_tokensduration_mstiming.json

{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
Essa é a única oportunidade de capturar esses dados — eles vêm pela notificação de tarefa e não são mantidos em outros lugares. Processe cada notificação conforme ela chega, em vez de tentar agrupá-las.

Passo 4: Avalie, agregue e inicie o visualizador
Após todas as corridas terminadas:

Grade cada execução — gera um subagente avaliador (ou grade inline) que lê e avalia cada asserção em relação às saídas. Salve os resultados em cada diretório de execução. O array de expectativas grading.json deve usar os campos , , e (não // ou outras variantes) — o visualizador depende desses nomes exatos de campos. Para asserções que podem ser verificadas programaticamente, escreva e execute um script em vez de apenas visualizá-lo — scripts são mais rápidos, mais confiáveis e podem ser reutilizados ao longo das iterações.agents/grader.mdgrading.jsontextpassedevidencenamemetdetails

Agregue em benchmark — execute o script de agregação a partir do diretório skill-creator:

python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
Isso produz e com pass_rate, tempo e tokens para cada configuração, com média ± stddev e o delta. Se estiver gerando benchmark.json manualmente, veja o esquema exato que o visualizador espera. Coloque cada versão with_skill antes da sua versão base.benchmark.jsonbenchmark.mdreferences/schemas.md

Faça um passe de analista — leia os dados de referência e os padrões de superfície que as estatísticas agregadas possam esconder. Veja (na seção "Analisando Resultados de Benchmarks") o que observar — coisas como asserções que sempre passam independentemente da habilidade (não discriminatória), avaliações de alta variância (possivelmente instáveis) e compensações tempo/token.agents/analyzer.md

Inicie o espectador com resultados qualitativos e dados quantitativos:

nohup python <skill-creator-path>/eval-viewer/generate_review.py \
  <workspace>/iteration-N \
  --skill-name "my-skill" \
  --benchmark <workspace>/iteration-N/benchmark.json \
  > /dev/null 2>&1 &
VIEWER_PID=$!
Para a iteração 2+, também passe .--previous-workspace <workspace>/iteration-<N-1>

Ambientes de cowork / headless: Se não estiver disponível ou o ambiente não tiver exibição, use para escrever um arquivo HTML independente em vez de iniciar um servidor. O feedback será baixado como um arquivo quando o usuário clicar em "Enviar Todas as Avaliações". Após o download, copie para o diretório do workspace para que a próxima iteração seja retirada.webbrowser.open()--static <output_path>feedback.jsonfeedback.json

Nota: por favor, use generate_review.py para criar o visualizador; não há necessidade de escrever HTML personalizado.

Diga ao usuário algo como: "Abri os resultados no seu navegador. Existem duas abas — 'Outputs' permite clicar em cada caso de teste e deixar feedback, 'Benchmark' mostra a comparação quantitativa. Quando terminar, volte aqui e me avise."
O que o usuário vê no visualizador
A aba "Outputs" mostra um caso de teste por vez:

Prompt: a tarefa que foi dada
Saída: os arquivos produzidos pela habilidade, renderizados em linha quando possível
Saída Anterior (iteração 2+): seção colapsada mostrando a saída da última iteração
Notas formais (se a avaliação foi executada): seção colapsada mostrando a afirmação aprovado/reprovado
Feedback: uma caixa de texto que salva automaticamente enquanto digitam
Feedback Anterior (iteração 2+): os comentários deles da última vez, mostrados abaixo da caixa de texto
A aba "Benchmark" mostra o resumo das estatísticas: taxas de aprovação, timing e uso de tokens para cada configuração, com divisões por avaliação e observações dos analistas.

A navegação é feita por botões anteriores/próximos ou setas de tecla. Quando termina, eles clicam em "Enviar Todas as Avaliações", que salva todo o feedback em .feedback.json

Passo 5: Leia o feedback
Quando o usuário disser que terminou, leia:feedback.json

{
  "reviews": [
    {"run_id": "eval-0-with_skill", "feedback": "the chart is missing axis labels", "timestamp": "..."},
    {"run_id": "eval-1-with_skill", "feedback": "", "timestamp": "..."},
    {"run_id": "eval-2-with_skill", "feedback": "perfect, love this", "timestamp": "..."}
  ],
  "status": "complete"
}
Feedback vazio significa que o usuário achou que estava tudo bem. Foque suas melhorias nos casos de teste em que o usuário teve reclamações específicas.

Desative o servidor de visualização quando terminar de usá-lo:

kill $VIEWER_PID 2>/dev/null
Aprimorando a habilidade
Esse é o coração do ciclo. Você executou os casos de teste, o usuário revisou os resultados, e agora precisa melhorar a habilidade com base no feedback dele.

Como pensar sobre melhorias
Generalize a partir do feedback. O ponto geral que está acontecendo aqui é que estamos tentando criar habilidades que possam ser usadas um milhão de vezes (talvez literalmente, talvez até mais, quem sabe) em muitos temas diferentes. Aqui você e o usuário iteram apenas em alguns exemplos repetidamente porque isso ajuda a avançar mais rápido. O usuário conhece esses exemplos de forma detalhada e é rápido para ele avaliar novos resultados. Mas se a habilidade que você e o usuário estão co-desenvolvendo funciona apenas para esses exemplos, ela é inútil. Em vez de colocar mudanças minuciosas de excesso de elegância ou OBRIGAÇÕES opressivamente restritivas, se houver algum problema teimoso, você pode tentar expandir e usar metáforas diferentes, ou recomendar padrões de trabalho diferentes. É relativamente barato tentar e talvez você encontre algo ótimo.

Mantenha o enxuto no prompt. Remova coisas que não estão fazendo sua parte. Certifique-se de ler as transcrições, não apenas os resultados finais — se parecer que a habilidade está fazendo o modelo perder muito tempo fazendo coisas improdutivas, você pode tentar eliminar as partes da habilidade que estão fazendo isso acontecer e ver o que acontece.

Explique o porquê. Tente explicar o porquê de tudo que você está pedindo para o modelo fazer. Os LLMs de hoje são inteligentes. Eles têm boa teoria de mente e, quando recebem um bom arnês, podem ir além das instruções mecânicas e realmente fazer as coisas acontecerem. Mesmo que o feedback do usuário seja conciso ou frustrado, tente realmente entender a tarefa e por que o usuário está escrevendo o que escreveu e o que realmente escreveu, e então transmita esse entendimento para as instruções. Se você se pegar escrevendo SEMPRE ou NUNCA em letras maiúsculas, ou usando estruturas super rígidas, isso é um sinal amarelo — se possível, reformule e explique o raciocínio para que o modelo entenda por que aquilo que você está pedindo é importante. Essa é uma abordagem mais humana, poderosa e eficaz.

Procure trabalhos repetidos entre os casos de teste. Leia as transcrições dos testes e perceba se os subagentes escreveram scripts auxiliares semelhantes de forma independente ou adotaram a mesma abordagem em múltiplas etapas para algo. Se os 3 casos de teste resultaram no subagente escrevendo a ou a , esse é um sinal forte de que a habilidade deve agrupar esse script. Escreva uma vez, coloque e diga à habilidade para usar. Isso poupa toda invocação futura de reinventar a roda.create_docx.pybuild_chart.pyscripts/

Essa tarefa é bem importante (estamos tentando criar bilhões por ano em valor econômico aqui!) e seu tempo de reflexão não é o obstáculo; Vá com calma e realmente pense sobre as coisas. Eu sugeriria escrever um rascunho de revisão e depois olhar de novo para fazer melhorias. Faça o seu melhor para entrar na cabeça do usuário e entender o que ele quer e precisa.

O ciclo de iteração
Depois de melhorar a habilidade:

Aplique suas melhorias à habilidade
Reexecute todos os casos de teste em um novo diretório, incluindo execuções base. Se você está criando uma nova habilidade, a linha de base é sempre (sem habilidade) — que permanece a mesma entre as iterações. Se você está aprimorando uma habilidade existente, use seu julgamento sobre o que faz sentido como base: a versão original que o usuário trouxe, ou a versão anterior.iteration-<N+1>/without_skill
Inicie o revisor apontando para a versão anterior--previous-workspace
Espere o usuário avaliar e dizer que terminou
Leia o novo feedback, melhore novamente, repita
Continue até:

O usuário diz que está feliz
O feedback está todo vazio (tudo parece bom)
Você não está fazendo progresso significativo
Avançado: Comparação às cegas
Para situações em que você quer uma comparação mais rigorosa entre duas versões de uma habilidade (por exemplo, o usuário pergunta "a nova versão é realmente melhor?"), existe um sistema de comparação cega. Leia e para os detalhes. A ideia básica é: dar dois resultados a um agente independente sem dizer qual é qual, e deixe-o julgar a qualidade. Depois, analise por que o vencedor venceu.agents/comparator.mdagents/analyzer.md

Isso é opcional, requer subagentes, e a maioria dos usuários não vai precisar. O ciclo de revisão humana geralmente é suficiente.

Descrição Otimização
O campo de descrição em SKILL.md frontmatter é o mecanismo principal que determina se Claude invoca uma habilidade. Depois de criar ou aprimorar uma habilidade, ofereça otimizar a descrição para melhor precisão nos disparos.

Passo 1: Gerar consultas de avaliação de gatilhos
Crie 20 consultas de avaliação — uma mistura de 'deveria-ativar' e não-deveria-disparar. Salve como JSON:

[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
As consultas devem ser realistas e algo que um Claude Code ou Claude.ai usuário realmente digitaria. Não pedidos abstratos, mas pedidos concretos, específicos e com bastante detalhe. Por exemplo, caminhos de arquivos, contexto pessoal sobre o trabalho ou situação do usuário, nomes e valores de colunas, nomes de empresas, URLs. Um pouco de contexto. Algumas podem estar em minúsculas ou conter abreviações, erros de digitação ou fala casual. Use uma mistura de diferentes comprimentos e foque nos casos limites, em vez de deixá-los claros (o usuário terá a chance de aprová-los).

Ruim: , , "Format this data""Extract text from PDF""Create a chart"

Bom: "ok so my boss just sent me this xlsx file (its in my downloads, called something like 'Q4 sales final FINAL v2.xlsx') and she wants me to add a column that shows the profit margin as a percentage. The revenue is in column C and costs are in column D i think"

Para as consultas que devem ser acionadas (8-10), pense na cobertura. Você quer frases diferentes com a mesma intenção — algumas formais, outras casuais. Inclua casos em que o usuário não nomeia explicitamente a habilidade ou o tipo de arquivo, mas claramente precisa dele. Inclua alguns casos de uso incomuns e situações em que essa habilidade compete com outra, mas deve vencer.

Para as consultas que não deveriam ser acionadas (8-10), as mais valiosas são as quase-missões — consultas que compartilham palavras-chave ou conceitos com a habilidade, mas que na verdade precisam de algo diferente. Pense em domínios adjacentes, frases ambíguas onde uma correspondência ingênua de palavras-chave seria acionada, mas não deveria, e casos em que a consulta toca em algo que a habilidade faz, mas em um contexto onde outra ferramenta é mais apropriada.

O ponto chave a evitar: não torne consultas que não deveriam ser acionadas obviamente irrelevantes. "Escrever uma função de Fibonacci" como teste negativo para uma habilidade de PDF é fácil demais — não testa nada. Os casos negativos devem ser realmente complicados.

Passo 2: Revise com o usuário
Apresente o conjunto de avaliações ao usuário para revisão usando o modelo HTML:

Leia o modelo em assets/eval_review.html
Substitua os marcadores temporários:
__EVAL_DATA_PLACEHOLDER__ → o array JSON dos itens de avaliação (sem aspas — é uma atribuição de variável JS)
__SKILL_NAME_PLACEHOLDER__ → o nome da habilidade
__SKILL_DESCRIPTION_PLACEHOLDER__ → a descrição atual da habilidade
Escreva em um arquivo temporário (por exemplo, ) e abra-o: /tmp/eval_review_<skill-name>.htmlopen /tmp/eval_review_<skill-name>.html
O usuário pode editar consultas, alternar entre deveria e disparar, adicionar/remover entradas e então clicar em "Exportar Avaliar Conjunto"
O arquivo é baixado para — verifique a pasta Downloads para a versão mais recente caso haja várias (por exemplo, ~/Downloads/eval_set.jsoneval_set (1).json)
Essa etapa é importante — consultas de avaliação ruins levam a descrições ruins.

Passo 3: Execute o ciclo de otimização
Diga ao usuário: "Isso vai levar um tempo — vou rodar o loop de otimização em segundo plano e verificar periodicamente."

Salve o conjunto de avaliação no workspace e execute em segundo plano:

python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
Use o ID do modelo do seu prompt do sistema (aquele que alimenta a sessão atual) para que o teste de disparo corresponda ao que o usuário realmente experimenta.

Enquanto ele roda, periodicamente acompanhe a saída para atualizar o usuário sobre em qual versão está e como são as pontuações.

Isso lida automaticamente com todo o ciclo de otimização. Ele divide o conjunto de avaliação em 60% de teste de treinamento e 40% de teste de retenção, avalia a descrição atual (rodando cada consulta 3 vezes para obter uma taxa de disparo confiável), e então liga para Claude para propor melhorias baseadas no que falhou. Ele reavalia cada nova descrição tanto no treino quanto no teste, iterando até 5 vezes. Quando termina, ele abre um relatório HTML no navegador mostrando os resultados por iteração e retorna o JSON — selecionado pela pontuação do teste em vez da pontuação do treino para evitar superajuste.best_description

Como funciona o disparo de habilidades
Entender o mecanismo de disparo ajuda a criar consultas de avaliação melhores. As habilidades aparecem na lista de Claude com seu nome + descrição, e Claude decide se deve consultar uma habilidade com base nessa descrição. O importante é saber que Claude só consulta habilidades para tarefas que não consegue lidar facilmente sozinho — consultas simples e de um passo como "leia este PDF" podem não acionar uma habilidade mesmo que a descrição coincida perfeitamente, porque Claude pode lidar diretamente com ferramentas básicas. Consultas complexas, de múltiplas etapas ou especializadas ativam habilidades de forma confiável quando a descrição coincide.available_skills

Isso significa que suas dúvidas de avaliação devem ser substanciais o suficiente para que Claude realmente se beneficie de consultar uma habilidade. Consultas simples como "ler o arquivo X" são casos de teste ruins — elas não vão acionar habilidades independentemente da qualidade da descrição.

Passo 4: Aplicar o resultado
Pegue do resultado JSON e atualize o conteúdo SKILL.md da habilidade na frente. Mostre ao usuário antes/depois e informe as pontuações.best_description

Pacote e Presente (somente se a ferramenta estiver disponível)present_files
Verifique se você tem acesso à ferramenta. Se não souber, pule essa etapa. Se você fizer isso, empacote a skill e apresente o arquivo .skill ao usuário:present_files

python -m scripts.package_skill <path/to/skill-folder>
Após a embalagem, direcione o usuário para o caminho do arquivo resultante para que ele possa instalá-lo..skill

Instruções específicas do Claude.ai
Em Claude.ai, o fluxo de trabalho principal é o mesmo (rascunho → teste → revisão → melhorar → repetir), mas como Claude.ai não tem subagentes, algumas mecânicas mudam. Veja o que adaptar:

Casos de teste em execução: Sem subagentes, não há execução paralela. Para cada caso de teste, leia o SKILL.md da habilidade e siga suas instruções para realizar o prompt do teste por conta própria. Faça um de cada vez. Isso é menos rigoroso do que subagentes independentes (você escreveu a habilidade e também a executa, então tem todo o contexto), mas é um teste útil de sanidade — e a etapa de revisão humana compensa. Pule as corridas básicas — apenas use a habilidade para completar a tarefa conforme solicitado.

Revisando resultados: Se você não conseguir abrir um navegador (por exemplo, a VM do Claude.ai não tem exibição, ou você está em um servidor remoto), pule completamente o revisor do navegador. Em vez disso, o presente resulta diretamente na conversa. Para cada caso de teste, mostre o prompt e a saída. Se a saída for um arquivo que o usuário precisa ver (como um .docx ou .xlsx), salve-o no sistema de arquivos e diga onde está para que possam baixá-lo e inspecioná-lo. Peça feedback de forma inline: "Como isso parece? Mudaria alguma coisa?"

Benchmarking: Evite o benchmarking quantitativo — ele depende de comparações de referência que não são significativas sem subagentes. Foque no feedback qualitativo do usuário.

O ciclo de iteração: Igual ao de antes — melhorar a habilidade, reexecutar os casos de teste, pedir feedback — só que sem o revisor do navegador no meio. Você ainda pode organizar os resultados em diretórios de iteração no sistema de arquivos, se tiver um.

Otimização da descrição: Esta seção requer a ferramenta CLI (especificamente ), que está disponível apenas no Claude Code. Pule se estiver no Claude.ai.claudeclaude -p

Comparação cega: Requer subagentes. Pula isso.

Embalagem: O script funciona em qualquer lugar com Python e um sistema de arquivos. No Claude.ai, você pode executá-lo e o usuário pode baixar o arquivo resultante.package_skill.py.skill

Atualizando uma habilidade existente: O usuário pode estar pedindo para você atualizar uma habilidade existente, não criar uma nova. Neste caso:

Preserve o nome original. Anote o nome do diretório da habilidade e o campo frontmatter — use-os sem alterações. Por exemplo, se a habilidade instalada for , output (não ).nameresearch-helperresearch-helper.skillresearch-helper-v2
Copie para um local que possa ser gravado antes de editar. O caminho de habilidade instalado pode ser somente leitura. Copie para , edite lá, e pacote a partir da cópia./tmp/skill-name/
Se for empacotado manualmente, introduza o /tmp/ primeiro e depois copie para o diretório de saída — gravações diretas podem falhar devido a permissões.
Instruções Específicas para o Cowork
Se você está no Cowork, as principais coisas para saber são:

Você tem subagentes, então o fluxo de trabalho principal (gerar casos de teste em paralelo, rodar linhas de base, graduar, etc.) funciona todo. (No entanto, se você tiver problemas sérios com timeouts, tudo bem rodar os prompts de teste em série em vez de paralelos.)
Você não tem navegador ou display, então ao gerar o visualizador de avaliação, use para escrever um arquivo HTML independente em vez de iniciar um servidor. Depois, ofereça um link para que o usuário possa clicar para abrir o HTML no navegador.--static <output_path>
Por algum motivo, a configuração do Cowork parece desmotivar o Claude de gerar o visualizador de avaliação após rodar os testes, então só para reforçar: seja no Cowork ou no Claude Code, após rodar os testes, você sempre deve gerar o visualizador de avaliação para que o humano veja exemplos antes de revisar a habilidade por conta própria e tentar fazer correções, Usando (não escrevendo seu próprio código html boutique). Desculpe desde já, mas vou ficar em maiúsculas aqui: GERE O VISUALIZADOR DE AVALIAÇÃO ANTES de avaliar as entradas você mesmo. Você quer colocá-los na frente do humano o quanto antes!generate_review.py
O feedback funciona de forma diferente: como não há servidor rodando, o botão "Enviar Todas as Avaliações" do espectador será baixado como um arquivo. Você pode então ler a partir daí (talvez precise solicitar acesso primeiro).feedback.json
O empacotamento funciona — só precisa de Python e um sistema de arquivos.package_skill.py
A otimização de descrições ( / ) deve funcionar bem no Cowork, já que ele usa via subprocesso, não um navegador, mas por favor salve até terminar totalmente de criar a habilidade e o usuário concordar que está em bom estado.run_loop.pyrun_eval.pyclaude -p
Atualizando uma habilidade existente: O usuário pode estar pedindo para você atualizar uma habilidade existente, não criar uma nova. Siga as orientações de atualização na seção claude.ai acima.
Arquivos de referência
Os agentes/diretório contêm instruções para subagentes especializados. Leia quando precisar gerar o subagente relevante.

agents/grader.md — Como avaliar asserções em relação aos resultados
agents/comparator.md — Como fazer comparação cega A/B entre duas saídas
agents/analyzer.md — Como analisar por que uma versão venceu outra
As referências/diretório têm documentação adicional:

references/schemas.md — Estruturas JSON para evals.json, grading.json, etc.
