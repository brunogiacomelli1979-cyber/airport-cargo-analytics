# Auditoria da interface versão 2

Inspeção e testes em 07/11/2026. Escopo: seis áreas, quatro resoluções e fluxos de exploração.

| Critério / skill | Achado | Correção e evidência |
|---|---|---|
| Frontend Design | Página longa sem hierarquia entre volume, qualidade e tempos | Navegação por tarefa; faixa de volume, bloco próprio de conformidade, linhas de qualidade, comparação por etapas e investigação de voo |
| Frontend Design | Uso repetitivo de cartões e decoração escura | Superfícies claras, marinho contextual, âmbar reservado a alerta, sem gradientes; capturas antes/depois inspecionadas |
| UI UX Pro Max | Eixos comprimidos em tablet/mobile | Margens adaptadas à largura, três divisões principais no eixo numérico, altura proporcional às categorias |
| UI UX Pro Max | Filtros com texto cortado no mobile | Uma coluna para os filtros; seletor nativo de navegação com todas as seções |
| UI UX Pro Max | Rótulos de ocorrências com sobreposição | Quebra de rótulos e 36 px por categoria nos gráficos densos |
| Web Design Guidelines | Tabela metodológica rolável não recebia foco no mobile | Contêineres com tabindex=0, role=region e nome acessível; falha detectada pelo axe, corrigida e reexecutada |
| Web Design Guidelines | Dados de gráfico acessíveis apenas por interação visual | Tabela de valores equivalente em cada gráfico e texto alternativo no contêiner |
| Web Design Guidelines | Ordenação, diálogo e estados precisavam de semântica | aria-sort, botões nativos, dialog com Escape, foco visível, status ao vivo, erro com nova tentativa |
| Dados | Guia Power BI citava TREATAS sem implementação | Medidas explícitas com interseção cargo→voos; ressalva de execução DAX pendente |
| Dados | Definições antigas sugeriam causa de atraso e trabalho ativo | Fórmulas vigentes reescritas; propostas sem eventos identificadas como futuras |

Validações locais: 4 testes Python, 8 testes JavaScript e 8 testes Playwright aprovados. As quatro verificações de resolução percorrem todas as seis áreas e executam axe com wcag2a, wcag2aa e wcag21aa. Isso não substitui certificação de acessibilidade ou avaliação com todas as tecnologias assistivas.

Playwright cobre 1920×1080, 1366×768, 768×1024 e 390×844. Capturas de cada área são preservadas e inspecionadas. Testes adicionais cobrem reconciliação de filtros com CSV, drilldown de voo, detalhe de AWB por teclado, Escape, ordenação, busca, paginação, CSV com conjunto exato, HTTP 503 e recuperação, recorte vazio e redução de movimento.

Auditoria npm: zero vulnerabilidades conhecidas no momento da execução. Dados brutos e CSVs originais não alterados. Sem erros de execução JavaScript observados nas seis áreas testadas. A validação em produção é registrada separadamente no relatório final de entrega, com PR e execução do deploy.

A rodada final também cobre URLs que restauram período, companhia, perfil e estado da exploração ao recarregar. Formulários receberam nomes e autocomplete apropriados; licenças transitivas ZRender e tslib acompanham o runtime. A ordenação de peso decimal é numérica e possui teste com 9,11 < 9,9 < 100,1.
