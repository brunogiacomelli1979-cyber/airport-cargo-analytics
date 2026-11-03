# Instrução para o Codex — Controle de Paletes Aeronáuticos

Atue como engenheiro full-stack responsável por este repositório. A aplicação já existe, foi testada e deve ser **implantada**, não reescrita do zero. Preserve visual, endpoints e regras de negócio. Prioridade: implantação web de produção no Railway com PostgreSQL central e acesso simultâneo de celulares.

Procedimento:

1. Leia `README.md`, `app/`, `tests/` e `railway.json`.
2. Rode `pytest -q tests/` e registre resultado. Se houver erro, corrija antes de subir.
3. Confirme que `DATABASE_URL` recebe a referência do serviço Postgres, que `PRODUCTION=1`, `COOKIE_SECURE=1`, `ACCESS_CODE` e `SESSION_SECRET` foram configurados como variáveis privadas. Nunca commit secrets.
4. Publique o serviço web com Dockerfile na Railway. Gere domínio HTTPS. Verifique `/api/saude`, login com código compartilhado, escrita, leitura de outro dispositivo e bloqueio de duplicidade.
5. Ative backups do PostgreSQL e documente restore test. Não exponha o PostgreSQL à internet.
6. Teste geração mensal por companhia e CSV, inclusive continuidade de 31/01 a 01/02 e interrupção de turno.
7. Somente informe 'em produção' após confirmar domínio público, saúde e escrita/consulta real no Postgres. Do contrário, informe exatamente o bloqueio.

Regra de cobrança imutável sem autorização: 08h, 20h, 08h seguinte = 3 registros consecutivos = 1 período faturável de 12 horas; 2 primeiros isentos; mudança de cia e lacuna de turno quebram sequência. Na virada do mês, cada cobrança entra somente na competência do turno faturável.

Não crie logins por operador. Exija apenas código operacional compartilhado na primeira abertura do dispositivo. Não permita arquivamento de novos dados em localStorage; operações dependem de PostgreSQL online.
