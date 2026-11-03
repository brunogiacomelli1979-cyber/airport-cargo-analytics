import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import app, { localClock } from '../src/worker.mjs';

// Banco isolado por teste; nenhuma credencial ou escrita de produção.
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_schema.sql', import.meta.url), 'utf8'));
  const DB = { prepare(sql) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args) ?? null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() {
        const r = db.prepare(sql).run(...args);
        return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
      }
    };
    return statement;
  } };
  const env = { DB, ACCESS_CODE: crypto.randomUUID(), SESSION_SECRET: crypto.randomUUID() };
  const call = (path, { cookie, body, method = 'GET', origin } = {}) => app.fetch(new Request('https://paletes.test' + path, {
    method, headers: { 'X-Paletes-Action': '1', 'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }), env);
  const login = async () => {
    const response = await call('/api/acesso/entrar', { method: 'POST', body: { codigo: env.ACCESS_CODE } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
    return response.headers.get('Set-Cookie').split(';')[0];
  };
  return { db, call, login };
}

test('dois logins, concorrência, CIA 001, backup e correção lógica no mesmo banco', async () => {
  const { db, call, login } = fixture();
  try {
    const [a, b] = await Promise.all([login(), login()]);
    const body = { palete: 'pmc123', cia: '001', turno: '08:00', data: '2001-01-01' };
    const responses = await Promise.all([a, b].map(cookie => call('/api/registros', { method: 'POST', cookie, body })));
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    const saved = await responses.find(r => r.status === 201).json();
    assert.equal(saved.data, localClock().data);
    assert.equal(saved.palete, 'PMC123');
    for (const cookie of [a, b]) {
      const list = await (await call('/api/registros', { cookie })).json();
      assert.equal(list.itens.length, 1);
      assert.equal(list.itens[0].cia, '001');
    }
    const mes = localClock().mes;
    assert.deepEqual((await (await call(`/api/cias?mes=${mes}`, { cookie: b })).json()).cias, ['001']);
    assert.equal((await call(`/api/backup/csv?mes=${mes}`)).status, 401);
    assert.equal((await call(`/api/relatorios/csv?mes=${mes}&cia=001`)).status, 401);
    assert.equal((await call(`/api/registros/${saved.id}`, { method: 'DELETE', cookie: a })).status, 200);
    const backup = await call(`/api/backup/csv?mes=${mes}`, { cookie: b });
    assert.equal(backup.headers.get('Cache-Control'), 'no-store');
    assert.match(await backup.text(), /PMC123;001;.*;0;/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM registros').get().n, 1);
  } finally { db.close(); }
});

test('relatório usa SQL real: continuidade entre meses e sem dupla cobrança', async () => {
  const { db, call, login } = fixture();
  try {
    const cookie = await login();
    for (const [data, turno] of [['2026-10-31','08:00'],['2026-10-31','20:00'],['2026-11-01','08:00']]) {
      db.prepare('INSERT INTO registros(data,turno,palete,cia,criado_em) VALUES(?,?,?,?,?)').run(data,turno,'PMC123','001',data);
    }
    const report = await (await call('/api/relatorios?mes=2026-11&cia=001', { cookie })).json();
    assert.equal(report.total_periodos, 1);
    assert.equal(report.total_horas, 12);
    assert.equal(report.itens[0].maior_sequencia, 3);
    assert.equal((await (await call('/api/relatorios?mes=2026-10&cia=001', { cookie })).json()).total_periodos, 0);
    const csv = await call('/api/relatorios/csv?mes=2026-11&cia=001', { cookie });
    assert.match(await csv.text(), /2026-11;001;PMC123;1;3;1;12/);
    assert.equal((await call('/api/registros/1', { method: 'DELETE', cookie })).status, 404);
  } finally { db.close(); }
});

test('JSON nulo é rejeitado, sessão adulterada não acessa exportações', async () => {
  const { db, call, login } = fixture();
  try {
    const cookie = await login();
    assert.equal((await call('/api/registros', { method: 'POST', cookie, body: null })).status, 422);
    assert.equal((await call('/api/backup/csv?mes=2026-11', { cookie: cookie+'x' })).status, 401);
    assert.equal((await call('/api/registros', { method: 'POST', cookie, body: {}, origin: 'https://example.org' })).status, 403);
  } finally { db.close(); }
});
