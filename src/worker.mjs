/** Controle de Paletes — Cloudflare Workers + D1, sem usuario individual. */
import { reportSQL } from './report-sql.mjs';

const COOKIE = 'paletes_acesso';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',...headers}
});
const error = (detail,status=422) => json({detail},status);
const headerPolicy = {
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};

export function validateEntry(input = {}) {
  const {turno,palete,cia} = input ?? {};
  if (typeof palete !== 'string' || !/^[A-Za-z0-9]{1,30}$/.test(palete)) throw new Error('O palete deve conter de 1 a 30 letras ou números, sem espaços ou símbolos.');
  if (typeof cia !== 'string' || !/^[0-9]{3}$/.test(cia)) throw new Error('O código da companhia aérea deve conter exatamente 3 números.');
  if (turno !== '08:00' && turno !== '20:00') throw new Error('O horário deve ser 08:00 ou 20:00.');
  return {turno, palete:palete.toUpperCase(), cia};
}
export function monthBounds(mes) {
  if (typeof mes !== 'string' || !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(mes)) throw new Error('Mês inválido: utilize AAAA-MM entre 2000 e 2100.');
  const [year,month] = mes.split('-').map(Number);
  const first = `${year}-${String(month).padStart(2,'0')}-01`;
  const nextMonth = month === 12 ? `${year+1}-01-01` : `${year}-${String(month+1).padStart(2,'0')}-01`;
  return {first,nextMonth};
}
export function localClock(at = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'
  }).formatToParts(at).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const data = `${parts.year}-${parts.month}-${parts.day}`;
  return {data,data_legivel:`${parts.day}/${parts.month}/${parts.year}`,mes:`${parts.year}-${parts.month}`,
    turno_sugerido:Number(parts.hour)<14?'08:00':'20:00',fuso:'America/Sao_Paulo'};
}
export function csvCell(x) {let v=String(x ?? '');if (/^[=+@\-\t\r]/.test(v)) v="'"+v;return /[;"\n\r]/.test(v)?`"${v.replaceAll('"','""')}"`:v;}
const csvRow = items => items.map(csvCell).join(';');
function base64url(bytes) {return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))));
}
async function sha256(value) {return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
function safeCompare(a,b) {if(typeof a!=='string'||typeof b!=='string')return false;let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0;}
function getCookie(request) {return request.headers.get('Cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) ?? '';}
async function authorized(request,env) {
  const token=getCookie(request);const match=/^(\d{10,11})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if(!match || Number(match[1])<Math.floor(Date.now()/1000))return false;
  return safeCompare(match[2],await hmac(env.SESSION_SECRET,'paletes:'+match[1]));
}
async function makeCookie(env) {
  const expires=String(Math.floor(Date.now()/1000)+SESSION_SECONDS);
  return `${COOKIE}=${expires}.${await hmac(env.SESSION_SECRET,'paletes:'+expires)}; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}
function safeDevice(request) {const d=request.headers.get('X-Device-Id');return /^[A-Za-z0-9-]{1,64}$/.test(d||'')?d:null;}
async function getBody(request) {try {const s=await request.text();if(s.length>2048)throw new Error();const body=JSON.parse(s);if(!body || typeof body!=='object' || Array.isArray(body))throw new Error();return body;}catch{throw new Error('Conteúdo JSON inválido.');}}
function cleanMonthAndCia(url) {const mes=url.searchParams.get('mes'),cia=url.searchParams.get('cia');const b=monthBounds(mes);if(!/^\d{3}$/.test(cia||''))throw new Error('O filtro de companhia deve conter 3 números.');return {mes,cia,...b};}
function reportOutput(mes,cia,items) {
  const result=items.map(r=>({...r,horas_cobraveis:Number(r.periodos_cobraveis)*12}));
  return {mes,cia,regra:'2 primeiros períodos consecutivos isentos; a partir do 3º, 12h por período registrado.',
    total_paletes:result.length,total_periodos:result.reduce((n,r)=>n+Number(r.periodos_cobraveis),0),
    total_horas:result.reduce((n,r)=>n+Number(r.horas_cobraveis),0),itens:result};
}
async function getReport(env,url) {const {mes,cia,first,nextMonth}=cleanMonthAndCia(url);
  const result=await env.DB.prepare(reportSQL).bind(nextMonth,first,cia).all();
  return reportOutput(mes,cia,result.results||[]);
}
async function attemptAccess(request,env) {
  const body=await getBody(request);const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const key=await sha256(ip+':'+env.SESSION_SECRET);const now=Math.floor(Date.now()/1000);
  const prev=await env.DB.prepare('SELECT tentativas,iniciado_em FROM bloqueios_acesso WHERE ip_hash=?').bind(key).first();
  if(prev && prev.iniciado_em>now-3600 && prev.tentativas>=8)return error('Muitas tentativas. Tente novamente em até 1 hora.',429);
  if(typeof body?.codigo!=='string'||!safeCompare(await sha256(body.codigo),await sha256(env.ACCESS_CODE))) {
    await env.DB.prepare(`INSERT INTO bloqueios_acesso(ip_hash,tentativas,iniciado_em) VALUES (?1,1,?2)
      ON CONFLICT(ip_hash) DO UPDATE SET tentativas=CASE WHEN iniciado_em<?3 THEN 1 ELSE tentativas+1 END,
      iniciado_em=CASE WHEN iniciado_em<?3 THEN ?2 ELSE iniciado_em END`).bind(key,now,now-3600).run();
    return error('Código de acesso incorreto.',401);
  }
  await env.DB.prepare('DELETE FROM bloqueios_acesso WHERE ip_hash=?').bind(key).run();
  return json({autorizado:true},200,{'Set-Cookie':await makeCookie(env)});
}
async function api(request,env,url) {
 const path=url.pathname,method=request.method;
 if(path==='/api/saude'&&method==='GET') {
   try{await env.DB.prepare('SELECT 1 AS ok').first();return json({status:'ok'});}catch{return json({status:'banco indisponível'},503);}
 }
 if(path==='/api/acesso/entrar'&&method==='POST')return attemptAccess(request,env);
 if(!await authorized(request,env))return error('Acesso expirado. Digite novamente o código de acesso.',401);
 if(path==='/api/acesso/sair'&&method==='POST')return json({autorizado:false},200,{'Set-Cookie':`${COOKIE}=; Max-Age=0; Secure; SameSite=Lax; HttpOnly; Path=/`});
 if(path==='/api/contexto'&&method==='GET')return json(localClock());
 if(path==='/api/registros'&&method==='POST') {
   const body=validateEntry(await getBody(request));const today=localClock().data;
   try{
     const r=await env.DB.prepare(`INSERT INTO registros(data,turno,palete,cia,criado_em,dispositivo)
      VALUES (?,?,?,?,?,?)`).bind(today,body.turno,body.palete,body.cia,new Date().toISOString(),safeDevice(request)).run();
     return json({id:r.meta?.last_row_id,data:today,...body},201);
   }catch(e){if(/UNIQUE constraint failed|ux_registros_ativos_palete_turno/i.test(String(e)))return error('Este palete já foi registrado neste mesmo dia e horário.',409);throw e;}
 }
 if(path==='/api/registros'&&method==='GET'){
   const today=localClock().data;const r=await env.DB.prepare(`SELECT id,data,turno,palete,cia,criado_em FROM registros
     WHERE ativo=1 AND data=? ORDER BY id DESC LIMIT 80`).bind(today).all();
   return json({data:today,total_exibido:r.results.length,itens:r.results});
 }
 const removal=/^\/api\/registros\/(\d+)$/.exec(path);
 if(removal&&method==='DELETE'){
   const id=Number(removal[1]);const r=await env.DB.prepare(`UPDATE registros SET ativo=0,excluido_em=?,excluido_dispositivo=?
    WHERE id=? AND data=? AND ativo=1`).bind(new Date().toISOString(),safeDevice(request),id,localClock().data).run();
   if(!r.meta?.changes)return error('Registro não encontrado no dia atual.',404);
   return json({excluido:true,id});
 }
 if(path==='/api/cias'&&method==='GET'){
   const mes=url.searchParams.get('mes');const {first,nextMonth}=monthBounds(mes);
   const r=await env.DB.prepare(`SELECT DISTINCT cia FROM registros WHERE ativo=1 AND data>=? AND data<? ORDER BY cia`).bind(first,nextMonth).all();
   return json({mes,cias:r.results.map(x=>x.cia)});
 }
 if(path==='/api/backup/csv'&&method==='GET'){
   const mes=url.searchParams.get('mes');const {first,nextMonth}=monthBounds(mes);
   const r=await env.DB.prepare(`SELECT id,data,turno,palete,cia,criado_em,dispositivo,ativo,excluido_em,excluido_dispositivo
     FROM registros WHERE data>=? AND data<? ORDER BY data,turno,id`).bind(first,nextMonth).all();
   const columns=['id','data','turno','palete','cia','criado_em','dispositivo','ativo','excluido_em','excluido_dispositivo'];
   const lines=[csvRow(columns),...(r.results||[]).map(row=>csvRow(columns.map(c=>row[c])))];
   return new Response('\ufeff'+lines.join('\r\n')+'\r\n',{headers:{'Content-Type':'text/csv; charset=utf-8',
     'Content-Disposition':`attachment; filename="backup_paletes_${mes}.csv"`,'Cache-Control':'no-store'}});
 }
 if(path==='/api/relatorios'&&method==='GET')return json(await getReport(env,url));
 if(path==='/api/relatorios/csv'&&method==='GET'){
   const result=await getReport(env,url);
   const lines=[csvRow(['Mês','Companhia aérea','Palete','Períodos registrados no mês','Maior sequência consecutiva','Períodos cobrados','Horas cobradas','Primeiro registro','Último registro'])];
   for(const r of result.itens)lines.push(csvRow([result.mes,r.cia,r.palete,r.periodos_registrados,r.maior_sequencia,r.periodos_cobraveis,r.horas_cobraveis,r.primeiro_registro,r.ultimo_registro]));
   lines.push(csvRow(['TOTAL',result.cia,'','', '',result.total_periodos,result.total_horas,'','']));
   return new Response('\ufeff'+lines.join('\r\n')+'\r\n',{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="permanencia_${result.mes}_cia_${result.cia}.csv"`,'Cache-Control':'no-store'}});
 }
 return error('Rota não encontrada.',404);
}

async function asset(env,request,path) {
  const u=new URL(request.url);u.pathname=path;
  const response=await env.ASSETS.fetch(new Request(u,{method:'GET'}));
  const headers=new Headers(response.headers);
  if(path.endsWith('.html')) headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,headers});
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url),path=url.pathname;
  const isApi=path.startsWith('/api/');
  if(!env.DB || typeof env.ACCESS_CODE!=='string' || env.ACCESS_CODE.length<8 ||
     typeof env.SESSION_SECRET!=='string' || env.SESSION_SECRET.length<32) {
    return json({detail:'Serviço ainda não configurado. Confirme o banco D1 e os segredos ACCESS_CODE/SESSION_SECRET.'},503);
  }
  try{
   if(request.method!=='GET' && request.method!=='HEAD') {
     if(!isApi || request.headers.get('X-Paletes-Action')!=='1')return error('Cabeçalho de segurança ausente.',403);
     const origin=request.headers.get('Origin');
     if(origin && origin!==url.origin)return error('Origem não autorizada.',403);
   }
   let response;
   if(isApi) response=await api(request,env,url);
   else if(path==='/entrar') response=await (await authorized(request,env)
     ? new Response(null,{status:303,headers:{Location:'/'}})
     : asset(env,request,'/entrar.html'));
   else if(path==='/'||path==='/relatorios') {
     response=await (await authorized(request,env)
       ? asset(env,request,path==='/'?'/index.html':'/relatorios.html')
       : new Response(null,{status:303,headers:{Location:'/entrar'}}));
   } else if (path.startsWith('/static/')||path==='/sw.js'||path==='/manifest.webmanifest') {
     response=await env.ASSETS.fetch(request);
   } else response=error('Página não encontrada.',404);
   const headers=new Headers(response.headers);
   for(const [key,value] of Object.entries(headerPolicy))headers.set(key,value);
   if(isApi||path==='/'||path==='/entrar'||path==='/relatorios')headers.set('Cache-Control','no-store');
   return new Response(response.body,{status:response.status,headers});
  }catch(e){
    if(/Mês inválido|filtro de companhia|Conteúdo JSON inválido|palete deve|código da companhia|horário deve/.test(e.message))return error(e.message,422);
    console.error('Falha interna no serviço de paletes.');
    return error('Erro interno. Nenhum lançamento foi confirmado; tente novamente e verifique a listagem.',500);
  }
 }
};
