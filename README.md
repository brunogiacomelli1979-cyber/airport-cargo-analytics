# Controle de Paletes Aeronáuticos — implantação GRATUITA no Cloudflare

Aplicação web para uso simultâneo por vários celulares, com banco **Cloudflare D1** compartilhado (SQLite), servidor **Cloudflare Workers**, PWA e relatórios por companhia aérea. Sem contas individuais. O acesso operacional é protegido por um código compartilhado, armazenado **somente nos segredos do servidor**.

## O que funciona

- Data sempre fornecida pelo servidor no fuso `America/Sao_Paulo`; coleta 08:00/20:00, selecionada na tela.
- Palete de 1 a 30 letras/números sem espaços, sempre salvo em **maiúsculas**; CIA com **exatamente 3 dígitos**, incluindo zeros à esquerda.
- Registro centralizado e concorrente. O mesmo palete não pode ser salvo duas vezes no mesmo dia/turno, independentemente da CIA.
- Exclusão apenas de lançamentos do dia, **lógica e auditável**. Excluir e relançar é possível; alterações posteriores ao dia exigem procedimento administrativo e não estão disponíveis na tela.
- Apuração mensal por CIA: duas primeiras coletas consecutivas gratuitas; terceiro período e seguintes geram **12h por período**. Falta de coleta interrompe a sequência. A troca de companhia também interrompe. Continuidade entre meses é respeitada sem faturar período duas vezes.
- Relatório web por CIA, CSV de cobrança, impressão/PDF e **backup CSV mensal completo** (registros ativos/excluídos, para arquivamento).
- Compatível com Android e iPhone, adicionar à tela inicial via navegador. É preciso estar online para registrar.

## Publicar em zero reais (Cloudflare Workers Free + D1 Free)

> Atenção: ainda não está implantado na Cloudflare. Para publicar, é necessário acesso à sua conta Cloudflare. **Não publique senhas nem códigos operacionais em arquivos do GitHub.**

### 1) Criar o banco (no navegador)

1. Entre em <https://dash.cloudflare.com/> com uma conta Free.
2. Entre em **Storage & databases → D1 SQL database → Create database**.
3. Nome do banco: `paletes-producao`.
4. Abra o banco criado, copie seu `Database ID` (identificador UUID, não é uma senha).
5. Na aba **Console**, cole o conteúdo completo de [`migrations/0001_schema.sql`](migrations/0001_schema.sql) e clique **Execute**. Confirme que surgiram as tabelas `registros` e `bloqueios_acesso`.

### 2) Atualizar o identificador do banco no GitHub

1. Abra o repositório GitHub e a **branch** `paletes-cloudflare-free`.
2. Abra o arquivo [`wrangler.jsonc`](wrangler.jsonc) e clique no lápis (**Edit**).
3. Substitua **somente** o texto `SUBSTITUIR_PELO_ID_DO_D1` pelo `Database ID` copiado, e salve na **mesma branch**.
4. Não mude `binding`: ele precisa continuar como `DB`; nem `database_name`: `paletes-producao`.

### 3) Publicar o aplicativo grátis

1. Cloudflare → **Workers & Pages → Create application → GitHub** (conecte sua conta se necessário).
2. Escolha o repositório `brunogiacomelli1979-cyber/airport-cargo-analytics`.
3. Escolha **production branch** `paletes-cloudflare-free` (nunca `main` ou `paletes-railway-prod`). Se a tela inicial não permitir, altere depois em **Settings → Build → Branch control**.
4. Nome do Worker: `controle-paletes-aeronauticos`. O nome deve ser idêntico ao de `wrangler.jsonc`.
5. Diretório-raiz: `/` (vazio). Build command: opcional/vazio; Deploy command: `npx wrangler deploy`.
6. Em **Settings → Variables & Secrets**, crie os segredos de tempo de execução:
   - `ACCESS_CODE`: código operacional compartilhado de **no mínimo 8 caracteres**, difícil de adivinhar.
   - `SESSION_SECRET`: texto aleatório, **no mínimo 32 caracteres**, único; guarde com segurança.
7. Se os segredos forem adicionados depois do primeiro deploy, execute **Redeploy**. Em **Bindings**, confirme que `DB` aponta para `paletes-producao`.
8. Ative o subdomínio gratuito `*.workers.dev` fornecido pela Cloudflare. **Nunca use a versão local dos dados como fonte de cobrança depois da implantação.**
9. Abra `/api/saude` para confirmar `{"status":"ok"}`. Acesse `/entrar`, digite o código e faça um lançamento de teste. Verifique se outro celular visualiza o mesmo lançamento. Gere e confira o relatório. Corrija ou exclua o lançamento de teste no mesmo dia.

Se o painel da Cloudflare mostrar etapas ligeiramente diferentes, a documentação oficial de [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) traz a sequência atualizada. O processo não exige cartão de crédito para contratar plano pago; **sempre selecione o plano gratuito**.

## Testes locais

Instale Node.js LTS e depois, na pasta do projeto:

```bash
npm install
npm test
python -m unittest discover -s tests -p 'test_*.py'
```

Se quiser simular o Worker e o banco localmente, antes de `npm run dev`:

1. Configure o `database_id` em `wrangler.jsonc` ou siga a configuração local do Wrangler.
2. Copie `.dev.vars.example` para `.dev.vars` e substitua os exemplos por segredos locais.
3. Execute `npm run db:local` e `npm run dev`.

Para migrações futuras em um projeto já publicado, use `npm run db:remote`; não reexecute uma migração que já foi aplicada manualmente no console.

## Cuidados de operação e limites gratuitos

- **Cloudflare Workers Free**: até 100 mil requisições/dia. **Cloudflare D1 Free**: 5 milhões de linhas lidas/dia, 100 mil linhas gravadas/dia, **até 500 MB por banco** e **5 GB no total da conta** (limites públicos consultados em novembro/2026).
- Dados não são apagados ao fechar navegador nem trocar de celular, mas o serviço online depende de disponibilidade da Cloudflare e dos limites da conta gratuita.
- D1 Free oferece recuperação Time Travel de até **7 dias**; baixe o **backup CSV mensal**, preferencialmente também um backup adicional no meio do mês. Guarde cópias em lugar protegido.
- Qualquer pessoa com o código compartilhado consegue ver relatórios e corrigir registros do dia. Se isso deixar de ser adequado, evoluir para acesso separado de coleta e administração.
- Não há armazenamento offline: falta de conexão significa que **nada é gravado**; a tela avisa a falha de conexão.
- A data de registro é a data atual do servidor. A escolha do turno 08h/20h é permitida a qualquer momento do dia, conforme a regra solicitada.
- Relatório não calcula valores em reais: tarifa ainda não definida.
- Se uma coleta for esquecida, a contagem sequencial é interrompida conforme critério original. Se a regra real de cobrança for diferente, valide-a antes da primeira cobrança oficial.

## Endpoints

`GET /api/saude` (saúde), `POST /api/acesso/entrar`, `GET /api/contexto`, `POST /api/registros`, `GET /api/registros`, `DELETE /api/registros/{id}`, `GET /api/cias?mes=AAAA-MM`, `GET /api/relatorios?mes=AAAA-MM&cia=001`, `GET /api/relatorios/csv?mes=AAAA-MM&cia=001`, `GET /api/backup/csv?mes=AAAA-MM`.

Código principal em [`src/worker.mjs`](src/worker.mjs), SQL inicial em [`migrations/0001_schema.sql`](migrations/0001_schema.sql) e cálculo SQL em [`src/report-query.sql`](src/report-query.sql). `src/report-sql.mjs` contém a mesma consulta como módulo importável.
