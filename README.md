# Controle de Paletes Aeronáuticos — Web PWA, PostgreSQL, Railway

Versão 2.0: aplicativo funcional para **vários celulares usando o mesmo banco de dados**. Não há cadastro de operadores nem contas individuais. O acesso é protegido por **um código operacional compartilhado**; após digitá-lo uma vez no aparelho, a sessão fica ativa por até 30 dias.

## Funcionalidades

- Data gerada pelo **servidor** no fuso `America/Sao_Paulo` (não pode ser adulterada pelo relógio do celular).
- Horários selecionáveis apenas **08:00** e **20:00**.
- Palete/sigla aceita exclusivamente 1–30 letras e números, sem espaço; convertido para MAIÚSCULAS no servidor.
- Código de companhia com **exatos 3 dígitos** (ex.: `001`).
- Um palete não pode ter dois registros no mesmo dia e turno, nem em companhias diferentes; proteção com índice exclusivo no banco central, inclusive sob concorrência de aparelhos.
- Histórico dos lançamentos do dia e exclusão lógica com data/hora e ID do dispositivo; exclusão somente no próprio dia.
- Permanência: registros consecutivos de 12h; os **dois primeiros registros são isentos**, o 3º é **1 período faturável**, o 4º é **2 períodos cumulativos**, e assim por diante. Lacuna na coleta ou mudança de companhia reinicia a contagem.
- Apuração por competência (mês) e por companhia, com sequência atravessando o mês, mas sem refaturar meses anteriores.
- Relatório responsivo na web, exportação CSV e impressão / "Salvar como PDF".
- Instalável como PWA no Android e no iPhone.
- O app **não salva lançamentos offline** nem simula salvamento: sem rede ele informa que não salvou.

## Publicação definitiva no Railway (interface web, sem CLI)

### A. Criar repositório dedicado no GitHub

1. Extraia este ZIP, abra a pasta `controle-paletes`.
2. Entre em https://github.com/new; crie o repositório **`controle-paletes-aeronauticos`** como *privado*, se a sua conta Railway tiver permissão de importar repositórios privados.
3. No repositório vazio, use **uploading an existing file**, arraste **todos os arquivos e pastas de dentro de `controle-paletes`** (não o ZIP fechado). Faça o commit na branch `main`.
4. Nunca envie ao GitHub os valores reais de `ACCESS_CODE`, `SESSION_SECRET` e `DATABASE_URL`. O arquivo `.env.example` possui somente exemplos/instruções.

### B. Criar aplicação e PostgreSQL no Railway

1. Abra https://railway.com/dashboard e escolha **New Project → Deploy from GitHub repo**. Escolha o repositório anterior. O Railway reconhecerá `Dockerfile` e `railway.json`.
2. No mesmo projeto, use **New → Database → PostgreSQL**. Aguarde a criação do serviço Postgres.
3. No serviço **web** (não no Postgres), abra **Variables** e configure:

| Chave | Valor |
|---|---|
| `DATABASE_URL` | Referência à variável do serviço PostgreSQL: `${{Postgres.DATABASE_URL}}`. Troque `Postgres` pelo nome real do serviço, se diferente. Preferir a sugestão de referência oferecida pela UI Railway. |
| `ACCESS_CODE` | Código compartilhado **forte** com pelo menos 8 caracteres. **Defina fora do GitHub.** |
| `SESSION_SECRET` | Sequência aleatória secreta com pelo menos 32 caracteres. Gere com `python -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `PRODUCTION` | `1` |
| `COOKIE_SECURE` | `1` |

4. Railway > **Service → Settings → Networking → Generate Domain** para obter o endereço HTTPS.
5. Aguarde a implantação e acesse `https://SEU-ENDERECO.railway.app/api/saude`, que deve responder `{"status":"ok"}`.
6. Acesse a URL principal, informe o código operacional e teste pelo celular. Instale o app na tela inicial pelo navegador.
7. No serviço PostgreSQL, **ative backups e verifique a política de retenção**. Banco de dados é persistente entre reinicializações da aplicação, mas *não substitui backup*.
8. Caso apareça o erro "banco indisponível" ou falha de implantação, confirme se a referência `DATABASE_URL` aponta para o PostgreSQL dentro do mesmo projeto.

**IMPORTANTE:** O projeto necessita de duas partes no Railway: **serviço web + serviço PostgreSQL**. GitHub Pages sozinho NÃO hospeda esse servidor nem substitui o banco de dados.

## Teste de aceitação (após a publicação)

1. Abra o mesmo endereço HTTPS em dois celulares. Entre com o mesmo código operacional.
2. No celular A registre `pmc123`, companhia `001`, turno `08:00`. O servidor salva `PMC123`. Confira se o registro aparece no celular B após atualizar a página.
3. No celular B tente repetir `PMC123` em `08:00` na mesma data. Deve aparecer mensagem de duplicidade, sem nova gravação.
4. Faça um cadastro de teste em dia atual, com outra sigla; exclua se necessário. Exclusões são lógicas/auditadas.
5. Para validar a cobrança em datas históricas, rode os testes locais automatizados; o app público não permite retroagir a data, para evitar erro de auditoria.
6. No fim do mês, escolha a competência e companhia em **Relatórios**, exporte CSV e/ou PDF.

## Desenvolvimento / Codex

Python 3.12 recomendado. Localmente a versão pode executar com SQLite em modo de desenvolvimento (sem definir `PRODUCTION` e `DATABASE_URL`):

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt pytest httpx
# Configure ACCESS_CODE e SESSION_SECRET no ambiente de execução:
# ex.: ACCESS_CODE="COLETA-FORTE-1234" SESSION_SECRET="umsegredoaleatorio-de-pelo-menos-32-caracteres" COOKIE_SECURE=0 uvicorn app.main:app --reload
pytest -q tests/
```

Para testar com PostgreSQL, defina `DATABASE_URL` de um banco de desenvolvimento (NUNCA produção). A aplicação cria a tabela e os índices se não existirem.

### Arquitetura

- `app/main.py`: FastAPI, autenticação, endpoints e rotas web.
- `app/database.py`: schema SQLAlchemy e conexão PostgreSQL.
- `app/services.py`: validação, sequência e apuração mensal.
- `app/security.py`: código compartilhado e cookie de sessão assinado.
- `static/`: páginas mobile, CSS, JavaScript, manifest e service worker.
- `tests/`: validações funcionais e de segurança.
- `Dockerfile`, `railway.json`: implantação.

### Limites e decisões explícitas

- `08:00` e `20:00` são **turnos de referência**, não a hora de envio; é possível escolher o turno do dia atual. O servidor registra o instante real de criação para auditoria.
- Se o palete não for informado em um dos turnos, sua sequência se encerra e eventual permanência posterior inicia contagem nova. **Validar com o processo físico** antes de cobrar; coleta não comprovada pode não significar retirada física.
- Alterar código compartilhado ou segredo de sessão requer atualização de variável. Alterar segredo invalida sessões existentes.
- **Não há cobrança em R$**: o aplicativo apura número de períodos e horas. Informe a tarifa para acrescentar valor financeiro.
- Como não há usuários individuais, o histórico indica apenas o ID do aparelho; esse código não substitui auditoria por identidade humana.
- A API usa cookies com HttpOnly/SameSite, cabeçalho anti-CSRF, tentativas de acesso limitadas e `no-store` nas APIs.
- Testes automatizados locais não provam disponibilidade de hospedagem nem recuperabilidade de backup, que precisam ser validados no Railway.
