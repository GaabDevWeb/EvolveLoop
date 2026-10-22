# Achados de comunidade e de benches públicos

Consulta 2026-10-21. Nenhum destes números foi reproduzido no EvolveLoop. Classe de cada fonte em [sources.md](sources.md).

## JetBrains × Caveman (primária)

Post de Denis Shiryaev, blog JetBrains AI, julho de 2026: [Speak to AI agents like cavemen](https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/).

| Item | Valor publicado |
|---|---|
| Harness | Harbor 0.17, Docker, verificadores da tarefa |
| Agente | Claude Code 2.1.200, headless, `bypassPermissions` |
| Modelo | `claude-sonnet-5`, effort `low` |
| Tarefas | SkillsBench, 86 de 87; análise cheia em 82 pares |
| Braço B | Skill forçada em toda resposta (“best case”) |
| Tokens de saída | 592k → 542k, **−8,5%** |
| Qualidade | Notas médias 0,326 vs 0,311; teste de sinal p = 0,82 nos 18 não-empates |
| Custo agregado | Um único trial estourou a faixa de contexto longo e inverteu o total em dólares (skill mais cara no agregado cru, apesar do corte de tokens por tarefa) |

O texto explica o mecanismo: Caveman deixa código, diff, tool call e erro intactos. Só a narração encolhe. Em trabalho agêntico a narração é a fatia menor. Uma corrida pequena inicial mostrou −29,5% e **não** se sustentou.

InfoWorld (2026) republica o mesmo resultado. Não é uma medição nova.

O que isso autoriza a dizer: para aquele harness, forçar o estilo não derrubou a nota de forma detectável e também não entregou −65%. O que isso não autoriza: prever a fatura de uma sessão Cursor/EvolveLoop, nem afirmar que o proxy Caveman 4.x (abaixo) tem o mesmo efeito.

## O autor do Caveman sobre o próprio número (comunitária + mantenedor)

Threads de 2026-08-13:

- [r/LLMDevs](https://www.reddit.com/r/LLMDevs/comments/1vnabcg/my_caveman_65_outputtoken_claim_got_85_in_an/)
- [r/ClaudeCode](https://www.reddit.com/r/ClaudeCode/comments/1vn9xyo/jetbrains_called_bullshit_on_cavemans_65_they/)

O autor (conta VeryVexxy) aceita os 8,5% da JetBrains para o modo de fala e descreve um proxy local novo: comprime contexto **antes** da chamada ao provedor, guarda o original recuperável, e publica um bench próprio de 54 runs com **−33,2% de tokens de entrada reportados pelo provedor** e 18/18 checagens de resposta exata. Ele mesmo escreve que checagem exata cobre uma superfície estreita.

Isso é alegação de mantenedor posterior ao bench da JetBrains. Não foi reexecutada aqui. Não substitui o −8,5% no que diz respeito ao modo “fale pouco”. São produtos diferentes dentro do mesmo repositório (skill de voz vs proxy 4.x, release `v4.0.1` em 2026-10-13).

Um comentário na thread relata um sumarizador local que achatou logs e fez o agente inventar paths. É um caso, não uma taxa.

## Benchmark comunitário de ferramentas de código (conflito de interesse)

[r/LLMDevs, 2026-08-05](https://www.reddit.com/r/LLMDevs/comments/1vgdwfz/i_benchmarked_5_codebase_tools_across_claude_code/) e variante em r/vibecoding (2026-09-24). Autor declara trabalhar em Repowise. Setup declarado: 15 perguntas Django tiradas do SWE-bench, cinco tipos escolhidos antes, mesmo commit, índice fresco, 90 runs por harness.

Números que o post atribui a **tokens de saída por pergunta**:

| Ferramenta | Claude Code (sonnet-5) | Codex |
|---|---|---|
| Sem ferramenta | 2877 (baseline) | 1790 |
| Graphify | 2878 (0%; chamada em 3/15; p=1) | 1593 (−11%; 15/15; p=0,095) |
| Serena | 2551 (−11,3%; 4/15; p=1) | 1505 (−15,9%; p=0,011) |
| Repowise | 2420 (−15,9%; 15/15; p=0,035) | 1165 (−34,9%; p=0,001) |

O post diz que a dispersão de qualidade (0,38 pontos de juiz) ficou abaixo do ruído do juiz (0,69). Também diz que o Claude Code deixou de chamar várias ferramentas em repetições, e que adoção depende do harness.

Leitura cautelosa: mesmo aceitando a tabela, **ninguém mediu −60% a −90% de tokens de sessão**, Graphify não foi diferente do baseline no Claude Code dessa amostra, e o melhor resultado ainda é de dois dígitos baixos em tokens de **saída**, com o autor interessado no próprio produto. Índice de Graphify nessa corrida: 141,5 s. Isso é custo de inicialização, não de query.

O claim “71,5× fewer tokens” do post de lançamento ([r/ClaudeAI, 2026-04-21](https://www.reddit.com/r/ClaudeAI/comments/1ss28rj/i_built_a_graphify_skill_for_claude_code_that/)) é mantenedor, anterior, e não é o que essa corrida posterior mediu. O post de abril também cita 25 linguagens e 32k stars; o README/skill atuais falam em 36 linguagens no `llms-full.txt` e a API mostra ~131k stars. O produto mudou. O claim de abril não descreve o binário `v0.9.93` (2026-10-20) sem uma medição nova.

## RTK (contexto, não candidato)

O mesmo blog JetBrains, na série, trata um compressor de saída de comando (RTK) cujo claim de −60% a −90% não se confirmou como redução de custo de tarefa; em um braço o custo mediano subiu. Fonte secundária Magica e o índice do blog JetBrains AI. Não é candidato da V2.2. Serve como aviso: comprimir stdout de ferramenta pode aumentar turnos ou estourar contexto por outro caminho.

## Padrão que se repete

1. O percentual grande nasce num microbench de prosa ou de “uma query contra o arquivo inteiro”.
2. Na sessão agêntica, arquivo, tool, histórico e raciocínio dominam.
3. Forçar a ferramenta não garante que o agente a chame (Claude Code vs Codex no post do Repowise).
4. Qualidade precisa de verificador da tarefa. Juiz LLM teve ruído maior que o efeito.
5. Um outlier de contexto longo muda a fatura sem mudar a média de tokens de um jeito estável.

## O que os relatos não dão

- Taxa de alucinação do Graphify em monorepo TypeScript do EvolveLoop.
- Custo em tokens da passagem semântica (PDF/imagem) do Graphify.
- Efeito do proxy Caveman 4.x sobre diffs e tool calls do Execution Engine.
- Se uma wiki `.ai/` pequena reduz arquivos lidos. Isso é hipótese local, `NOT_MEASURED`.

## X / Twitter

Não houve leitura direta. O gist de Karpathy (2026-04-04) é a fonte usada para o padrão de wiki. Uma página Hatchdoor cita o tweet `https://x.com/karpathy/status/2039805659525644595` (2026-04-02) como anúncio. Essa URL **não** foi aberta aqui. Fica como referência secundária não confirmada nesta sessão.
