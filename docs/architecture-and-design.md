# Decisões de arquitetura e design da versão 2

## Auditoria anterior

Base: main d19b42e, 07/11/2026. README, sete CSVs, SQL, Python, documentação, Power BI e workflow examinados. Não há AGENTS.md aplicável no repositório ou nos ancestrais consultados. Trabalho isolado em feat/operational-intelligence-redesign.

A versão anterior preservava os grãos corretamente, mas tinha uma única página longa, seis cartões de mesma hierarquia, barras sem exploração contextual, ranking limitado a 15 voos e ausência de busca, ordenação, paginação ou detalhe de AWB. A metodologia estava fora do fluxo principal. Os rótulos de grupos eram truncados no mobile. Os testes de JavaScript eram apenas de sintaxe e a publicação podia ficar verde com deploy pulado.

Capturas anteriores desktop 1920×1080 e mobile 390×844 foram preservadas no pacote de evidências entregue. Não se usam essas capturas como prova da qualidade nova.

## Direção visual antes da implementação

Público: analista e gestor de logística aeroportuária. Tarefa principal: encontrar um desvio, segmentar seu contexto e investigar AWBs relacionados.

Paleta: marinho #102B46 (navegação), branco #FFFFFF (superfícies), cinza #F3F6F9 (contexto), azul #2368AD (dados e ações), verde #237766 (segunda série), âmbar #A26108 (alertas). Sem gradientes ou sombras decorativas. Tipografia Segoe UI/Arial, números tabulares, escala 11/12/14/16/19/26/32. Espaçamento 4/8/12/16/24/32; raio 8 para painéis, 5–6 para controles. Foco azul visível.

Composição alinhada à esquerda: navegação fixa no desktop, contexto e filtros no cabeçalho, faixa compacta de volume, conformidade em um bloco de leitura própria, taxas de qualidade em linhas e gráficos comparáveis abaixo. A investigação parte de voo e chega ao AWB. O símbolo original usa traços de uma aeronave/rota; não reproduz marca de terceiros.

Revisão da proposta: a busca UI UX Pro Max retornou Data-Dense Dashboard e uma paleta azul/âmbar apropriadas, mas também uma composição comercial Enterprise Gateway e Fira Code. Essas duas recomendações foram rejeitadas por não servirem ao produto analítico; adotados controles nativos e tipografia do sistema para clareza e carregamento local.

## Bibliotecas avaliadas

| Fonte oficial | Avaliação e decisão |
|---|---|
| https://github.com/tabler/tabler | Referência de navegação, cabeçalhos e tabelas. Não carregar Bootstrap/Tabler: CSS próprio atende ao escopo com menos dependências. |
| https://github.com/apache/echarts | Adotado 6.1.0, Apache-2.0, servido localmente, renderer SVG, tooltips, tabelas equivalentes e redimensionamento. LICENSE e NOTICE preservados. |
| https://github.com/TanStack/table | Recursos úteis para grids maiores, porém busca, ordenação e paginação de 1.111 linhas cabem em funções puras pequenas. Não adotado. |
| https://github.com/tremorlabs/template-dashboard-oss | Referência de separação entre métricas, exploração e comparação. Nenhum template copiado. |
| https://github.com/shadcn-ui/ui | Referência de controles e estados. Migração React e pipeline de componentes não trazem benefício proporcional. Não adotado. |

Sem migração de stack, API, serviço pago ou CDN em runtime. ECharts é a única dependência direta da interface. Playwright 1.65.0 e axe-core/playwright 4.14.0 são dependências de teste. A distribuição estática usa apenas index.html, assets e CSVs processados; exclui código de desenvolvimento, skills e arquivos brutos.

## Instalação e aplicação das skills

Node 24.15.0 e npm 11.12.1. Instalador skills 1.7.6, requisito >=22.20.0. Instalação de projeto, sem -g, scripts npm desabilitados. Fontes oficiais clonadas para inspeção; houve falha transitória de rede e a instalação final usou os clones oficiais locais. npx skills list confirmou as três skills. Estão disponíveis no projeto para a próxima interação; as instruções já foram lidas e aplicadas nesta execução.

| Skill | Revisão da fonte | Uso |
|---|---|---|
| frontend-design | anthropics/skills @ 2c5958ecac7cee2b583967a2c4981d0f4a75c579 | Plano de composição, identidade original, hierarquia e crítica visual |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill @ b7d5353e0130feb8c5574ef1251f8a1db1873ccb | Busca local design-system, layout analítico, controles, contraste e responsividade |
| web-design-guidelines | vercel-labs/agent-skills @ 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62; metadata 1.0.0 | Auditoria de semântica, foco, teclado, formulários e tabelas; regras atuais em https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md |

As duas primeiras fontes não declaram versão semântica no SKILL.md; a revisão Git acima identifica a versão. skills-lock.json mantém os hashes da instalação local. Não redistribuir o conteúdo completo das skills no site. Para reinstalar: npx skills@1.7.6 add anthropics/skills --skill frontend-design -a codex -y; repetir com nextlevelbuilder/ui-ux-pro-max-skill / ui-ux-pro-max e vercel-labs/agent-skills / web-design-guidelines.

O código Python de busca usa arquivos CSV locais e biblioteca padrão; seus módulos e dependências foram inspecionados. Não foram executados refreshers, ferramentas pagas ou integrações que exijam credenciais. A skill validate-data orientou a reconciliação independente e os limites de inferência.

## Contratos de dados e interação

assets/analytics.js contém parser CSV, validação relacional, seleção, agregação, exploração e exportação como funções testáveis. assets/dashboard.js trata apresentação e controles. Um AWB aparece uma vez nos indicadores; ocorrências são agrupadas por cargo_id em mapa antes do cálculo de flags. Os mesmos registros refinados da tabela alimentam o CSV, sem limitar à página atual. Strings com prefixos de fórmula são neutralizadas na exportação.

A rota hash preserva navegação Voltar/Avançar e links de seções; filtros persistem entre seções da sessão. No mobile, seletor nativo oferece acesso explícito às seis seções. Dados ausentes, carregamento e erro têm mensagens próprias e nova tentativa. Não há imputação de eventos.

## Publicação e reversão

Qualidade inclui testes Python, JavaScript, interface, acessibilidade e auditoria npm; é pré-requisito do deploy. actions/configure-pages e actions/deploy-pages@v4 falham se indisponíveis, sem mascarar deploy pulado. O pacote público é gerado em dist. A integração usa PR e merge após o job de qualidade aprovado.

Para reverter, crie branch a partir de main e reverta o commit de merge da PR (git revert -m 1 SHA_DO_MERGE), abra PR, execute os testes e integre. Se for urgente restaurar o pacote anterior, a execução bem-sucedida anterior pode ser reexecutada pela interface Actions, confirmando commit e artefato; a reversão em Git ainda deve registrar a mudança. Não usar reset --hard ou force-push em main.

## Pendências externas

PBIX não criado: Power BI Desktop não encontrado. Power Query, DAX e tema são artefatos de montagem, não relatório nativo executado. SQL revisado estaticamente; não há servidor MySQL configurado nesta execução. A aplicação web independe dele.
