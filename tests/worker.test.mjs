import test from 'node:test';
import assert from 'node:assert/strict';
import app,{validateEntry,monthBounds,localClock,csvCell} from '../src/worker.mjs';

const sample = {turno:'08:00',palete:'pmc123',cia:'001'};
test('salva sigla em maiusculas',()=>assert.deepEqual(validateEntry(sample),{...sample,palete:'PMC123'}));
for(const pallet of ['','P MC1','ABC-12','ABC_12','ÁBC123','A'.repeat(31)]) {
 test(`rejeita palete invalido ${pallet.slice(0,12)}`,()=>assert.throws(()=>validateEntry({...sample,palete:pallet})));
}
for(const company of ['01','0001','1a2','1 2','999x','']) {
 test(`rejeita cia invalida ${company}`,()=>assert.throws(()=>validateEntry({...sample,cia:company})));
}
for(const shift of ['07:00','08','09:00','20','']) {
 test(`rejeita turno invalido ${shift}`,()=>assert.throws(()=>validateEntry({...sample,turno:shift})));
}
test('mes janeiro',()=>assert.deepEqual(monthBounds('2026-01'),{first:'2026-01-01',nextMonth:'2026-02-01'}));
test('mes dezembro cruza o ano',()=>assert.deepEqual(monthBounds('2026-12'),{first:'2026-12-01',nextMonth:'2027-01-01'}));
for(const bad of ['2026-00','2026-13','2026-1','2026-99','1999-01','2026/09'])test(`rejeita mes ${bad}`,()=>assert.throws(()=>monthBounds(bad)));
test('fuso horario de Sao Paulo: 2026-11-03 UTC+3',()=>assert.equal(localClock(new Date('2026-11-04T02:00:00Z')).data,'2026-11-03'));
test('seleciona turno sugerido de 08 e de 20',()=>{
 assert.equal(localClock(new Date('2026-11-03T12:00:00Z')).turno_sugerido,'08:00');
 assert.equal(localClock(new Date('2026-11-03T19:00:00Z')).turno_sugerido,'20:00');
});
test('protege CSV delimitado',()=>assert.equal(csvCell('ab;"cd"'),'"ab;""cd"""'));
test('recusa sem variaveis de producao',async()=>{
 const response=await app.fetch(new Request('https://teste.workers.dev/api/saude'),{});
 assert.equal(response.status,503);
});
test('recusa mutacao sem header',async()=>{
 const response=await app.fetch(new Request('https://teste.workers.dev/api/registros',{method:'POST'}),
   {DB:{},ACCESS_CODE:'minimo1234',SESSION_SECRET:'x'.repeat(32)});
 assert.equal(response.status,403);
});
test('recusa login de origem diferente',async()=>{
 const response=await app.fetch(new Request('https://teste.workers.dev/api/acesso/entrar',
   {method:'POST',headers:{Origin:'https://vilao.com','X-Paletes-Action':'1'}}),
   {DB:{},ACCESS_CODE:'minimo1234',SESSION_SECRET:'x'.repeat(32)});
 assert.equal(response.status,403);
});

test('login gera cookie assinado e autoriza segundo aparelho/navegador',async()=>{
  const db={prepare:(_sql)=>({bind:(..._args)=>({first:async()=>null,run:async()=>({meta:{changes:1}})})})};
  const env={DB:db,ACCESS_CODE:'codigoForte123456',SESSION_SECRET:'z'.repeat(48)};
  const login=await app.fetch(new Request('https://teste.workers.dev/api/acesso/entrar',{method:'POST',
    headers:{'X-Paletes-Action':'1','Content-Type':'application/json'},body:JSON.stringify({codigo:env.ACCESS_CODE})}),env);
  assert.equal(login.status,200);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  assert.match(cookie,/^paletes_acesso=/);
  const allowed=await app.fetch(new Request('https://teste.workers.dev/api/contexto',{headers:{Cookie:cookie}}),env);
  assert.equal(allowed.status,200);
  assert.ok((await allowed.json()).data);
  const denied=await app.fetch(new Request('https://teste.workers.dev/api/contexto',{headers:{Cookie:cookie+'corrompido'}}),env);
  assert.equal(denied.status,401);
});
