# Controle de Paletes Aeronáuticos

Cloudflare Workers Free + D1 Free. Branch exclusiva: `paletes-cloudflare-free` do repositório `brunogiacomelli1979-cyber/airport-cargo-analytics`. Main e paletes-railway-prod não foram alteradas.

## Implantação em 03/11/2026

- URL HTTPS publicada: https://controle-paletes-aeronauticos.bruno-giacomelli1979.workers.dev
- Worker: `controle-paletes-aeronauticos`.
- D1: `paletes-producao`, ID público `1bc139d5-6d9a-4e93-9b83-511099dd3753`, binding `DB`.
- Esquema existente inspecionado: havia apenas `bloqueios_acesso`. Foram criados `registros` e os três índices da migração, sem apagar dados. Não reaplicar cegamente uma migração já executada pelo console.
- Teste HTTPS real: saúde e D1 OK; dois logins independentes; escrita concorrente resultou em HTTP 201 e HTTP 409; os dois clientes leram o mesmo registro com CIA `001`.
- CSV de relatório e backup autenticados verificados. O único lançamento TESTCODEX foi excluído logicamente no mesmo dia; zero registros ativos após os testes. Sua linha permanece no backup para auditoria.
- O código temporário de teste deve ser substituído pelo código operacional em **Settings → Variables and Secrets → ACCESS_CODE → Secret**, diretamente no Cloudflare, antes do uso. Nunca publicar o valor no GitHub, chat ou logs.
- `SESSION_SECRET` foi gerado criptograficamente e enviado diretamente ao Cloudflare Secrets, sem gravar seu valor em arquivos. Não é necessário recuperá-lo; para revogar todas as sessões, substitua-o por outro segredo aleatório de pelo menos 32 caracteres.
- Publicação por Wrangler autenticado; não foi criada integração de builds GitHub. Deploys futuros são feitos manualmente a partir desta branch.

## Operação

A data vem do servidor em America/Sao_Paulo. O operador seleciona somente 08:00 ou 20:00. Palete: 1–30 caracteres ASCII alfanuméricos, persistidos em maiúsculas. CIA é texto de três dígitos; `001` é preservado no banco e na API.

A lista dos últimos 80 registros ativos do dia atualiza a cada 15 segundos enquanto a tela está visível, e ao retornar à tela. Não se trata de atualização instantânea por WebSocket. Sem conexão, não há fila de salvamento offline. Se a resposta da gravação for perdida, a interface informa salvamento não confirmado e orienta verificar a lista; o índice único impede duplicidade numa nova tentativa.

O índice parcial único `(data, turno, palete) WHERE ativo=1` garante deduplicação atômica entre dispositivos, independentemente da CIA. Correção é exclusão lógica somente no dia atual, com timestamp e identificador do dispositivo, seguida de novo lançamento. Não há exclusão física automática nem contas individuais: todos que conhecem o código têm o mesmo acesso. A auditoria identifica dispositivo, não pessoa.

Cada coleta representa 12 horas. As duas primeiras consecutivas na mesma CIA são isentas; a terceira e seguintes geram um período faturável cada. Um turno ausente ou troca de CIA reinicia a isenção. O SQL considera meses anteriores para continuidade e cobra somente no mês do turno faturável. Os relatórios mostram apenas paletes com cobrança, sem calcular reais por não haver tarifa.

## Backup e CSV

Em Relatórios, selecione o mês e use **Backup do mês (todos os registros)**. O botão também funciona em meses sem registros ativos. O CSV contém ativos e excluídos, datas, CIA, dispositivo e auditoria da exclusão. Guarde cópias protegidas ao menos mensalmente e, de preferência, também no meio do mês.

O relatório por CIA permite CSV e Imprimir / PDF. No navegador, escolha Salvar como PDF. Ao abrir CSV em Excel ou similares, importe a coluna CIA como **Texto**, para que o programa não converta `001` em número. Fórmulas em células CSV são neutralizadas. Não há preço monetário configurado.

## Marca

Arte original PNG obtida no site institucional e servida localmente: `public/static/brand/viracopos-oficial.png`. O solicitante confirmou autorização para uso neste sistema interno em 03/11/2026. Procedência e SHA-256 em `public/static/brand/ORIGEM_E_USO_DA_MARCA.md`. A marca branca é exibida em fundo azul escuro no acesso, coleta, relatórios e impressão. A reconstrução `viracopos-referencia.svg` não é usada pela interface.

## Desenvolvimento e publicação

Node.js 22.13+ (validado com Node 24), Python 3 e npm. Wrangler fixado em versão exata, com package-lock.json reproduzível.

```sh
npm ci
npm test
python -m unittest discover -s tests -p 'test_*.py'
npx wrangler deploy --dry-run
npx wrangler login
npx wrangler deploy
```

Para desenvolvimento local, copie `.dev.vars.example` para `.dev.vars` e preencha segredos locais. O arquivo é ignorado pelo Git. Depois execute `npm run db:local` e `npm run dev`. Não usar dados locais como fonte de cobrança de produção.

Segredos de produção são configurados por **Settings → Variables and Secrets**, tipo Secret, ou pelos prompts interativos abaixo (não passar o valor na linha de comando):

```sh
npx wrangler secret put ACCESS_CODE
npx wrangler secret put SESSION_SECRET
npx wrangler secret list
```

ACCESS_CODE exige pelo menos 8 caracteres, e SESSION_SECRET pelo menos 32. Cookies: HttpOnly, Secure, SameSite=Lax. API privada sem cache; SQL parametrizado; proteção de origem e cabeçalho de mutação; CSP; bloqueio de tentativas de acesso; erros sem conteúdo sensível em logs.

Antes de qualquer migração futura, inspecione o esquema e o histórico. `npm run db:remote` aplica migrações pendentes, mas a primeira migração desta implantação foi aplicada pelo console e não tem registro no histórico do Wrangler. Não confundir a ausência desse histórico com ausência das tabelas.

## Evidências e limites

41 testes JavaScript e 15 testes SQL Python aprovados, incluindo integração da API com SQLite real isolado, cobrança entre meses/anos, mudança de CIA, turno ausente, exclusão lógica, dois clientes e concorrência. Testes de faturamento usam banco isolado; não foram inseridas sequências históricas artificiais no banco de produção. `npm install` com Wrangler 4.157.0: zero vulnerabilidades apontadas.

O teste remoto automatizado usa dois clientes HTTP com logins separados. A validação física em Android/iOS, instalação da PWA e saída de impressão/PDF continuam sendo verificações manuais; não confundir dois clientes HTTP com dois aparelhos físicos. Sem plano pago, cartão ou upgrade ativado por esta implantação.

Custo esperado: R$0 dentro das cotas Free da conta. Workers: 100 mil requisições/dia compartilhadas na conta. D1: 5 milhões de linhas lidas/dia, 100 mil linhas gravadas/dia, 500 MB por banco e 5 GB totais. Polling usa até 480 requisições/hora por tela visível (duas consultas a cada 15 s); monitore o uso da conta. Ao exceder o Free, o serviço pode recusar requisições/consultas; não habilitar plano pago automaticamente.

Fontes oficiais: https://developers.cloudflare.com/workers/platform/limits/ e https://developers.cloudflare.com/d1/platform/pricing/.

## Endpoints

`GET /api/saude`, `POST /api/acesso/entrar`, `POST /api/acesso/sair`, `GET /api/contexto`, `GET/POST /api/registros`, `DELETE /api/registros/{id}`, `GET /api/cias?mes=AAAA-MM`, `GET /api/relatorios?mes=AAAA-MM&cia=001`, `GET /api/relatorios/csv?mes=AAAA-MM&cia=001`, `GET /api/backup/csv?mes=AAAA-MM`.
