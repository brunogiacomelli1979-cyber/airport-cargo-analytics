# Airport Cargo Analytics

Aplicação de inteligência operacional para carga aérea de importação. Sete bases **inteiramente simuladas**, com navegação por tarefa, indicadores rastreáveis, gráficos interativos e exploração de AWBs.

[Aplicação no GitHub Pages](https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/) · [Workflows e evidências de publicação](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions)

> Nenhum registro representa operação real. O prazo de encerramento é fictício e não é interpretação jurídica de regulamentação.

## Versão 2

- **Visão geral:** volume, conformidade do encerramento, qualidade, tempos e voos para investigação.
- **Performance operacional:** movimento mensal, companhias, etapas até encerramento, perfis e distribuição de dwell.
- **Conformidade e qualidade:** manifesto, divergências físicas, prazo e armazenagem por segmento.
- **Gargalos e retrabalho:** ocorrências, cargas afetadas, classificações e tempo decorrido de resolução.
- **Exploração:** busca, oito colunas ordenáveis, filtros combinados, paginação, voo→AWBs e detalhe das sete fontes relacionadas. Exporta o conjunto filtrado inteiro, além da página visível.
- **Metodologia:** arquivos de origem, contagens, fórmulas, denominadores e limitações.

Exemplo: selecione fevereiro e uma companhia, abra um voo em “Ver cargas”, refine os AWBs com erro de manifesto e exporte o CSV. A busca e a condição da exploração afetam apenas tabela/CSV; os filtros superiores afetam todos os indicadores e gráficos relacionados. O recorte permanece ao navegar entre áreas.

## Executar localmente

Requisitos: Python 3.11+ e Node.js 24 (CI), npm. O site já contém os arquivos de runtime e não precisa de instalação para servir.

```sh
python -m http.server 8000
```

Acesse http://localhost:8000. Não abra index.html como file://, pois isso pode bloquear fetch dos CSVs.

Para desenvolver e validar:

```sh
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

No Linux/CI, use `npx playwright install --with-deps chromium`. Playwright usa Chromium completo, gera screenshots das seis áreas nas quatro resoluções e relatório em playwright-report. O diretório de screenshots padrão é ../outputs; ajuste SCREENSHOT_DIR se necessário. Para a versão pública, use BASE_URL com o endereço do site (o servidor local não será iniciado).

## Tecnologias e manutenção

HTML semântico, CSS com tokens e JavaScript sem framework. **Apache ECharts 6.1.0**, Apache-2.0, servido localmente com LICENSE/NOTICE. Não há CDN, backend, API paga ou hospedagem além do GitHub Pages. **Playwright 1.65.0** e **axe-core/playwright 4.14.0** validam interface e acessibilidade. Dependências fixadas em package-lock.json.

Tabler, TanStack Table, Tremor Dashboard OSS e shadcn/ui foram avaliados. Servem de referência, sem inclusão de frameworks ou cópia integral de templates. [Justificativas e design system](docs/architecture-and-design.md).

Skills utilizadas: Frontend Design (Anthropic), UI UX Pro Max e Web Design Guidelines (Vercel), instaladas em .agents/skills no projeto com skills 1.7.6. [Revisões exatas, instalação e aplicação](docs/architecture-and-design.md#instalação-e-aplicação-das-skills). A skill validate-data orientou reconciliação e revisão metodológica.

## Dados e definições

| Tabela | Registros |
|---|---:|
| flights | 120 |
| cargo | 1.111 |
| manifest | 1.111 |
| operations | 1.111 |
| inconsistencies | 394 |
| release_process | 1.111 |
| delivery | 1.111 |

Chegadas: janeiro–março de 2026, oito companhias. Totais reconciliados: **44.892 volumes; 1.384.521,66 kg; 54/120 voos no prazo (45,0%); 208 AWBs com erro de manifesto; 223 com retrabalho; 1.021 com armazenagem conforme; 350 com ocorrências.** Dwell médio 70,107 h; chegada→registro 2,503 h; registro→encerramento 9,825 h por AWB; chegada→encerramento 12,283 h por voo; resolução média de ocorrência 3,444 h.

- Prazo: chegada ≤ encerramento ≤ limite fictício. Os 41 voos com texto “Próximo ao limite” estão fora pelo timestamp.
- Taxas de manifesto, retrabalho e armazenagem usam AWBs como denominador; prazo usa voos distintos.
- Dwell total é chegada da aeronave→entrega, incluindo dependências externas.
- Resolução de ocorrência é tempo decorrido, não tempo de trabalho ativo. Grupos não comprovam culpa por atraso.
- Sem warehouse_flow_events, exportações ou saldos: não calcular ocupação atual, necessidade de equipe ou dwell operacional limpo.
- Datas locais simuladas sem fuso declarado são preservadas. As fontes originais não foram alteradas.

[Definições e fórmulas](docs/kpi_definitions.md) · [Validação da base](docs/validation_report.md) · [Auditoria do redesign](docs/redesign-audit.md)

## Estrutura

```text
index.html                     estrutura e controles globais
assets/dashboard.css           tokens, componentes e responsividade
assets/analytics.js            parser, integridade, filtros, métricas e CSV
assets/dashboard.js            rotas, gráficos, tabela e detalhe
assets/vendor/                 ECharts fixado, licença e notice
data/raw/                      planilha original preservada
data/processed/csv/            sete fontes originais
scripts/                       validação Python, build e vendor
tests/                         Python, JavaScript e Playwright
sql/                           modelo MySQL 8 e views analíticas
powerbi/                       guia, Power Query, DAX e tema
docs/                          metodologia, decisões e auditoria
.github/workflows/             qualidade e deploy GitHub Pages
```

## SQL e Power BI

Modelo MySQL 8 em sql/01_create_tables.sql e consultas em sql/02_analysis_queries.sql. Importar flights→cargo→demais tabelas; CSV UTF-8 BOM, vírgula, cabeçalhos, decimais com ponto, datas yyyy-MM-dd HH:mm e vazios opcionais como NULL. As views agregam inconsistências antes da junção para não multiplicar pesos e volumes. SQL revisado estaticamente nesta versão; sem servidor MySQL configurado para validação de execução.

[Guia Power BI](powerbi/GUIA_DE_IMPLEMENTACAO.md), função [Power Query](powerbi/LoadCargoCsv.pq), [colunas](powerbi/columns.dax), [medidas](powerbi/measures.dax) e [tema](powerbi/theme.json) permitem montagem reproduzível. As medidas de voos incluem TREATAS para filtros de perfil. **PBIX nativo pendente:** Power BI Desktop não disponível nesta execução. DAX/M foram revisados como texto; não foi alegada execução no motor Power BI.

## Testes e evidências

Validação local: **4 testes Python, 8 JavaScript e 8 Playwright aprovados**, incluindo seis áreas em 1920×1080, 1366×768, 768×1024 e 390×844. Reconciliação independente JS/Python; combinações de filtros; limite exato de prazo; CSV inválido; duplicatas 1:1; exportação exata; busca, ordenação, paginação; teclado e diálogo; falha HTTP e recuperação; recorte vazio e movimento reduzido. Axe executado para WCAG 2 A/AA e 2.1 AA nas seis áreas e quatro tamanhos. Não equivale a certificação de acessibilidade.

A auditoria visual identificou e corrigiu eixos comprimidos, rótulos densos, filtros cortados e tabela rolável sem foco. Screenshots e traces ficam no artefato quality-evidence do workflow por 30 dias. Auditoria npm local: zero vulnerabilidades conhecidas. [Relatório de problemas e correções](docs/redesign-audit.md).

## Publicação e reversão

GitHub Pages deve estar configurado com Source = GitHub Actions. A PR executa o job de qualidade. Integre somente após aprovação dos testes. Push em main executa qualidade e depois configura Pages, publica apenas dist via actions/upload-pages-artifact@v3 e realiza **actions/deploy-pages@v4**. Falhas de configuração não são mascaradas como deploy bem-sucedido.

Para confirmar uma publicação: abra a execução do commit integrado, confira o job Pages e a etapa real de deploy e execute testes no endereço público. Workflow verde sem a etapa de deploy concluída não comprova publicação.

Para reverter: branch de main, `git revert -m 1 SHA_DO_MERGE`, PR, testes e integração; isso dispara nova publicação com o conteúdo restaurado. Não force-push em main. Consulte o histórico para recuperar a versão anterior d19b42e.

Pendências separadas: PBIX nativo e execução do modelo em servidor MySQL. Nenhuma delas é necessária ao funcionamento da versão web estática.
