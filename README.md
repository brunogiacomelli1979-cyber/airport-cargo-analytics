<div align="center">

# Airport Cargo Analytics

### Inteligência operacional aplicada à logística aeroportuária

Dashboard interativo para analisar a jornada da carga aérea de importação — da chegada do voo à entrega — com foco em **performance, conformidade, qualidade documental, gargalos e rastreabilidade dos dados**.

**[▶ Explorar aplicação online](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/)** · **[Metodologia e indicadores](docs/kpi_definitions.md)** · **[Arquitetura e design](docs/architecture-and-design.md)**

[![Qualidade e publicação](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions/workflows/quality-and-pages.yml/badge.svg)](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions/workflows/quality-and-pages.yml)
![Versão](https://img.shields.io/badge/vers%C3%A3o-2.0-2368AD)
![Frontend](https://img.shields.io/badge/frontend-HTML%20%2B%20CSS%20%2B%20JS-102B46)
![Visualização](https://img.shields.io/badge/gr%C3%A1ficos-Apache%20ECharts-237766)

</div>

> [!IMPORTANT]
> **Projeto educacional e de portfólio.** Os sete conjuntos de dados são inteiramente **simulados**. Nenhum registro corresponde a operações reais de um aeroporto, companhia aérea, cliente ou órgão público. O prazo de encerramento utilizado é fictício e **não** representa interpretação jurídica de normas vigentes.

---

## Uma experiência de BI operacional na web

A versão 2 substituiu a página única anterior por uma aplicação de análise com **seis áreas**, navegação contextual, gráficos interativos, filtros persistentes e exploração da relação **voo → AWBs → ocorrências e demais registros**.

### Visão geral

Indicadores de volume, movimento mensal, conformidade de encerramento, qualidade e tempos operacionais.

[![Dashboard Airport Cargo Analytics — Visão geral, com indicadores de voos e AWBs e conformidade](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/screenshots/visao-geral.png)](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/)

### Performance operacional

Comparações entre companhias, etapas do processo e perfis de carga, além da distribuição do *cargo dwell time*.

[![Dashboard Airport Cargo Analytics — Performance operacional, com tempos médios e gráficos comparativos](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/screenshots/performance-operacional.png)](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/#performance)

<sub>As imagens da galeria são capturas automáticas das mesmas telas, produzidas pelo Playwright durante os testes e publicadas junto ao site no GitHub Pages. A publicação inclui somente as capturas aprovadas da versão desktop; o restante das evidências permanece nos artefatos do CI.</sub>

## Funcionalidades

| Área | O que permite investigar |
|:--|:--|
| **01 · Visão geral** | Voos, AWBs, volumes, peso, conformidade de prazo e evolução mensal |
| **02 · Performance operacional** | Tempos entre chegada, registro, encerramento e entrega; comparativos por companhia e natureza da carga |
| **03 · Conformidade e qualidade** | Erros de manifesto, divergências físicas e adequação de armazenagem |
| **04 · Gargalos e retrabalho** | Ocorrências, cargas afetadas, classificações de controlabilidade e tempo decorrido de resolução |
| **05 · Exploração de dados** | Busca, filtros combinados, oito colunas ordenáveis, paginação, detalhes de AWB e exportação CSV do conjunto filtrado |
| **06 · Metodologia e fontes** | Linhagem dos sete CSVs, definições, denominadores, critérios de qualidade e limitações |

**Recursos de interação:** filtros por período, companhia e perfil de carga; navegação responsiva; restauração da seleção pela URL; valores tabulares equivalentes aos gráficos; uso por teclado, mensagens de erro, estados vazios e nova tentativa de carregamento.

**Experimente um fluxo de investigação:** abra **[Exploração de dados](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/#explore)**, selecione um voo, examine seus AWBs, filtre por erro de manifesto, ordene os registros e exporte o CSV. Os filtros gerais repercutem nos painéis; busca e filtros internos da exploração delimitam apenas sua tabela e exportação.

## Indicadores validados

A base fictícia cobre **janeiro a março de 2026**, com oito companhias aéreas simuladas.

| Indicador | Resultado |
|:--|--:|
| Voos analisados | **120** |
| Cargas / AWBs | **1.111** |
| Volumes recebidos | **44.892** |
| Peso recebido | **1.384.521,66 kg** |
| Ocorrências registradas | **394**, em 350 cargas |
| Encerramentos dentro do limite simulado | **54 de 120 · 45,0%** |
| AWBs com erro de manifesto | **208 · 18,7%** |
| AWBs com retrabalho | **223 · 20,1%** |
| AWBs com armazenagem conforme | **1.021 · 91,9%** |
| Chegada → registro no depositário | **2,50 h**, média por AWB |
| Registro → encerramento | **9,82 h**, média por AWB |
| Chegada → encerramento | **12,28 h**, média por voo |
| Dwell total, chegada → entrega | **70,11 h**, média por AWB |

**Regras fundamentais de interpretação:**

- A conformidade é calculada pelas **datas e horas**, com **voos distintos** como denominador. Os 41 voos rotulados como “Próximo ao limite” estão fora do prazo ao comparar os horários simulados.
- Taxas de manifesto, retrabalho e armazenagem usam o **AWB**, e ocorrências 1:N são agregadas antes de computar indicadores de carga. Nenhum voo, peso ou volume é multiplicado por joins.
- “Responsabilidade” e “controlabilidade” são **classificações das ocorrências**, não comprovação de causalidade ou culpa pelos atrasos.
- O tempo de resolução de ocorrência é o intervalo entre detecção e fechamento, **não** horas trabalhadas ativamente.
- **Dwell operacional limpo**, ocupação em tempo real, necessidade efetiva de equipe e exportações **não são calculados**: faltam os dados de eventos necessários.

[Leia as definições e fórmulas](docs/kpi_definitions.md) · [Dicionário de dados](docs/data_dictionary.md) · [Relatório de validação](docs/validation_report.md)

## Engenharia, design e arquitetura

O produto mantém uma arquitetura **estática e gratuita**, sem backend obrigatório, CDN de runtime ou API paga. Os CSVs versionados são processados no navegador; SQL/MySQL e Power BI constituem camadas de estudo e modelagem separadas.

| Camada | Implementação |
|:--|:--|
| Interface | HTML semântico, CSS com tokens, JavaScript modular |
| Visualização | **Apache ECharts 6.1.0**, renderer SVG e licenças incluídas |
| Análise | Parser CSV, verificações de integridade e agregações em `assets/analytics.js` |
| Interações | Filtros, rotas, tabelas, detalhamento, exportação e acessibilidade em `assets/dashboard.js` |
| Testes | Python `unittest`, Node.js Test Runner, **Playwright** e **axe-core** |
| Publicação | GitHub Actions → **GitHub Pages**, com artefatos estáticos de produção |
| BI complementar | Modelo MySQL, Power Query, medidas DAX e tema para Power BI |

A direção de design foi orientada pelas skills **Frontend Design**, **UI UX Pro Max** e **Web Design Guidelines**. Foram aplicados hierarquia por tarefa, paleta institucional, tipografia com números tabulares, navegação lateral, tratamentos de responsividade e validações visuais. As decisões e versões de referência estão em [Arquitetura e design](docs/architecture-and-design.md); as correções de interface, em [Auditoria do redesign](docs/redesign-audit.md).

```text
airport-cargo-analytics/
├── index.html                 # navegação e estrutura de seis áreas
├── assets/
│   ├── dashboard.css          # design system e responsividade
│   ├── dashboard.js           # apresentação e interações
│   ├── analytics.js           # contratos e cálculos de dados
│   └── vendor/                # ECharts e avisos de licença
├── data/
│   ├── raw/                   # planilha original preservada
│   └── processed/csv/         # sete tabelas CSV simuladas
├── docs/                      # metodologia, dicionário e auditoria
├── sql/                       # modelo relacional e consultas MySQL 8
├── powerbi/                   # guia, Power Query, DAX e tema
├── scripts/                   # build, vendor e validação
├── tests/                     # testes Python, JS e Playwright
└── .github/workflows/         # CI e publicação de versão validada
```

## Executar localmente

**Requisitos:** Python 3.11+ para servir/validar os arquivos; Node.js 24 e npm apenas para desenvolver e rodar a suíte completa.

```bash
git clone https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics.git
cd airport-cargo-analytics
python -m http.server 8000
```

Abra **http://localhost:8000**. Não utilize `file://`, pois o navegador pode impedir a leitura dos CSVs.

Para executar os testes e produzir o pacote estático:

```bash
npm ci --ignore-scripts
npx playwright install chromium

python scripts/validate_data.py --output evidence/quality-summary.json
python -m unittest discover -s tests -v
npm test
npm run test:ui
npm audit --audit-level=high

npm run vendor
npm run build
```

No Linux/CI: `npx playwright install --with-deps chromium`. O teste de navegador cobre as seis áreas em **1920×1080, 1366×768, 768×1024 e 390×844**; verificações axe WCAG 2 A/AA e 2.1 AA; filtros e reconciliação; consulta voo/AWB; exportação; teclado; erros HTTP; estados vazios e URLs persistentes. Essa cobertura não equivale a uma certificação formal de acessibilidade.

O deploy publica apenas os arquivos de `dist/`. Duas capturas aprovadas de Playwright são inseridas em `dist/screenshots/` para manter a galeria do README alinhada ao site efetivamente testado.

## SQL e Power BI

- **MySQL 8:** [DDL e relacionamentos](sql/01_create_tables.sql) · [views e consultas](sql/02_analysis_queries.sql). A ordem de importação é `flights → cargo → demais tabelas`. O SQL foi revisado estaticamente, ainda sem execução em servidor MySQL nesta entrega.
- **Power BI:** [guia de implementação](powerbi/GUIA_DE_IMPLEMENTACAO.md) · [Power Query](powerbi/LoadCargoCsv.pq) · [colunas DAX](powerbi/columns.dax) · [medidas DAX](powerbi/measures.dax) · [tema](powerbi/theme.json).
- **Estado do PBIX:** o relatório `.pbix` nativo permanece **pendente** por indisponibilidade do Power BI Desktop na etapa anterior. Os artefatos DAX/M foram revisados estaticamente, mas não executados no motor nativo.

## Qualidade, entrega e documentação

**Versão web 2.0:** integrada à `main`, com **4 testes Python, 8 JavaScript e 8 Playwright** aprovados e deploy concluído no GitHub Pages. Os sete CSVs originais foram preservados.

[PR do redesign (#3)](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/pull/3) · [Workflow validado](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions/workflows/quality-and-pages.yml) · [Execução da versão 2](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions/runs/42388236322) · [Auditoria detalhada](docs/redesign-audit.md)

O CI verifica métricas, testes, acessibilidade e build antes de publicar. Screenshots adicionais e traces são mantidos nos artefatos de qualidade pelo prazo de retenção do workflow. Para reverter uma atualização: crie uma branch, reverta o commit de integração, abra uma PR e publique após os testes; **não** faça force-push na `main`.

---

<div align="center">

**Airport Cargo Analytics · v2.0**

Projeto de portfólio em análise de dados, Business Intelligence e inteligência operacional aeroportuária.

[**Abrir dashboard**](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/) · [**Explorar código**](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics)

</div>
