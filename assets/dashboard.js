/* Airport Cargo Analytics — dados ficticios de importacao, sem bibliotecas externas.
 * Cada taxa usa seu proprio grao. O browser nunca imputa datas ou cria historico.
 */
'use strict';
const FILES=['flights','cargo','manifest','operations','inconsistencies','release_process','delivery'];
const path='data/processed/csv/';
const $=id=>document.getElementById(id);
const ptInt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0});
const ptDec=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const moneyless=v=>Number.isFinite(v)?ptInt.format(v):'—';
const percent=(n,d)=>d>0?ptDec.format(100*n/d)+'%':'—';
const average=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const hours=v=>v===null||!Number.isFinite(v)?'—':ptDec.format(v)+' h';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateUTC=s=>{const t=Date.parse(String(s||'').replace(' ','T')+'Z');return Number.isFinite(t)?t:NaN};
const diffHours=(a,b)=>(dateUTC(b)-dateUTC(a))/3600000;
function parseCsv(text){
 text=text.replace(/^\uFEFF/,'');const out=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(!quoted&&c===','){row.push(cell);cell=''}
  else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))out.push(row);row=[];cell=''}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);out.push(row)}
 if(!out.length)throw new Error('CSV sem cabecalho');
 const head=out.shift().map(h=>h.trim().replace(/^\uFEFF/,''));
 return out.map(fields=>Object.fromEntries(head.map((key,j)=>[key,fields[j]??''])));
}
let state=null;
function fillOptions(id,vals,allLabel){
 const select=$(id);select.replaceChildren();select.add(new Option(allLabel,'all'));
 [...new Set(vals.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(v=>select.add(new Option(v,v)));
}
function groupCount(arr,key){
 const m=new Map();for(const x of arr){const k=key(x);m.set(k,(m.get(k)||0)+1)}
 return [...m].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'pt-BR'));
}
function renderBar(id,entries,kind='count',maxRows=9){
 const root=$(id);root.replaceChildren();entries=entries.slice(0,maxRows);
 if(!entries.length){root.innerHTML='<span class="empty">Sem observações para o filtro selecionado.</span>';return}
 const max=kind==='percent'?100:Math.max(1,...entries.map(x=>x.value));
 for(const p of entries){
  const val=kind==='percent'?ptDec.format(p.value)+'%':ptInt.format(p.value);
  const width=Math.max(0,Math.min(100,100*p.value/max));
  const row=document.createElement('div');row.className='bar-row';
  const label=document.createElement('span');label.className='bar-label';label.textContent=p.label;label.title=p.label;
  const track=document.createElement('div');track.className='track';track.setAttribute('role','img');track.setAttribute('aria-label',p.label+': '+val);
  const bar=document.createElement('div');bar.className='fill '+(kind==='percent'?'good':'');
  bar.style.width=width+'%';track.appendChild(bar);
  const value=document.createElement('strong');value.className='bar-value';value.textContent=val;
  row.append(label,track,value);root.appendChild(row);
 }
}
function makeMaps(data){
 data.flightMap=new Map(data.flights.map(x=>[x.flight_id,x]));
 data.cargoMap=new Map(data.cargo.map(x=>[x.cargo_id,x]));
 data.operationMap=new Map(data.operations.map(x=>[x.cargo_id,x]));
 data.manifestMap=new Map(data.manifest.map(x=>[x.cargo_id,x]));
 data.deliveryMap=new Map(data.delivery.map(x=>[x.cargo_id,x]));
 const missing=data.cargo.filter(x=>!data.flightMap.has(x.flight_id)||!data.operationMap.has(x.cargo_id)||!data.manifestMap.has(x.cargo_id)||!data.deliveryMap.has(x.cargo_id));
 if(missing.length)throw new Error('Integridade referencial incompleta: '+missing.length+' cargas sem registros obrigatórios');
 if(new Set(data.flights.map(x=>x.flight_id)).size!==data.flights.length)throw new Error('flight_id duplicado');
 if(new Set(data.cargo.map(x=>x.cargo_id)).size!==data.cargo.length)throw new Error('cargo_id duplicado');
}
function render(){
 const d=state,month=$('filter-month').value,airline=$('filter-airline').value,type=$('filter-type').value;
 const cargo=d.cargo.filter(c=>{
  const f=d.flightMap.get(c.flight_id);
  return f&&(month==='all'||f.aircraft_arrival_datetime.slice(0,7)===month)
    &&(airline==='all'||f.airline===airline)&&(type==='all'||c.cargo_type===type);
 });
 const cargoIds=new Set(cargo.map(x=>x.cargo_id));
 const flightIds=new Set(cargo.map(x=>x.flight_id));
 const flights=d.flights.filter(f=>(month==='all'||f.aircraft_arrival_datetime.slice(0,7)===month)
  &&(airline==='all'||f.airline===airline)&&(type==='all'||flightIds.has(f.flight_id)));
 const occurrences=d.inconsistencies.filter(x=>cargoIds.has(x.cargo_id));
 const closedOnTime=flights.filter(f=>{
  const arrival=dateUTC(f.aircraft_arrival_datetime),close=dateUTC(f.mantra_closure_datetime),deadline=dateUTC(f.legal_deadline_datetime);
  return close>=arrival&&close<=deadline;
 });
 const manifestError=cargo.filter(c=>d.manifestMap.get(c.cargo_id).manifest_error_flag==='Sim').length;
 const reworked=new Set(occurrences.filter(x=>x.rework_flag==='Sim').map(x=>x.cargo_id));
 const incCargo=new Set(occurrences.map(x=>x.cargo_id));
 const conform=cargo.filter(c=>d.operationMap.get(c.cargo_id).storage_compliance_status==='Conforme').length;
 const dwell=cargo.map(c=>diffHours(d.flightMap.get(c.flight_id).aircraft_arrival_datetime,d.deliveryMap.get(c.cargo_id).delivery_datetime)).filter(x=>Number.isFinite(x)&&x>=0);
 const depot=cargo.map(c=>diffHours(d.flightMap.get(c.flight_id).aircraft_arrival_datetime,d.operationMap.get(c.cargo_id).depositary_system_receiving_datetime)).filter(x=>Number.isFinite(x)&&x>=0);
 const totalKg=cargo.reduce((s,c)=>s+Number(c.received_weight_kg||0),0);
 const totalPieces=cargo.reduce((s,c)=>s+Number(c.received_pieces||0),0);
 $('kpi-flights').textContent=moneyless(flights.length);
 $('kpi-cargo').textContent=moneyless(cargo.length);
 $('kpi-compliance').textContent=percent(closedOnTime.length,flights.length);
 $('kpi-manifest').textContent=percent(manifestError,cargo.length);
 $('kpi-rework').textContent=percent(reworked.size,cargo.length);
 $('kpi-dwell').textContent=hours(average(dwell));
 $('metric-pieces').textContent=moneyless(totalPieces);
 $('metric-kg').textContent=ptDec.format(totalKg)+' kg';
 $('metric-depositary').textContent=hours(average(depot));
 $('metric-storage').textContent=percent(conform,cargo.length);
 $('metric-inc').textContent=percent(incCargo.size,cargo.length);
 $('metric-occ').textContent=moneyless(occurrences.length);
 $('scope-note').textContent=moneyless(flights.length)+' voos · '+moneyless(cargo.length)+' AWBs';
 renderBar('chart-month',groupCount(flights,f=>f.aircraft_arrival_datetime.slice(0,7)).sort((a,b)=>a.label.localeCompare(b.label)), 'count',18);
 const rates=[...new Set(flights.map(f=>f.airline))].map(label=>{
  const subset=flights.filter(f=>f.airline===label),on=subset.filter(f=>dateUTC(f.mantra_closure_datetime)<=dateUTC(f.legal_deadline_datetime)&&dateUTC(f.mantra_closure_datetime)>=dateUTC(f.aircraft_arrival_datetime)).length;
  return {label,value:100*on/subset.length}
 }).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'pt-BR'));
 renderBar('chart-airline',rates,'percent',10);
 renderBar('chart-type',groupCount(cargo,c=>c.cargo_type),'count',9);
 renderBar('chart-responsibility',groupCount(occurrences,x=>x.responsibility_group),'count',9);
 const late=flights.map(f=>({
  f,h:diffHours(f.legal_deadline_datetime,f.mantra_closure_datetime)
 })).filter(x=>Number.isFinite(x.h)&&x.h>0).sort((a,b)=>b.h-a.h).slice(0,15);
 const table=$('late-flights');table.replaceChildren();
 if(!late.length){const row=table.insertRow();const cell=row.insertCell();cell.colSpan=5;cell.textContent='Nenhum voo fora do prazo no filtro atual.'}
 for(const item of late){
  const row=table.insertRow();
  const values=[item.f.flight_number,item.f.airline,item.f.origin_airport,item.f.aircraft_arrival_datetime,item.h];
  values.forEach((v,i)=>{const td=row.insertCell();td.textContent=i===4?hours(v):v});
 }
 d.currentCargo=cargo;
 $('status').textContent='CSV carregados e indicadores recalculados. Fonte: 7 arquivos versionados no GitHub (dados simulados).';
}
function exportCargo(){
 if(!state)return;const out=[['cargo_id','flight_id','awb_number','cargo_type','received_pieces','received_weight_kg','manifest_error_flag','storage_compliance_status','arrival_datetime','delivery_datetime']];
 for(const c of state.currentCargo){
  const f=state.flightMap.get(c.flight_id),m=state.manifestMap.get(c.cargo_id),o=state.operationMap.get(c.cargo_id),dl=state.deliveryMap.get(c.cargo_id);
  out.push([c.cargo_id,c.flight_id,c.awb_number,c.cargo_type,c.received_pieces,c.received_weight_kg,m.manifest_error_flag,o.storage_compliance_status,f.aircraft_arrival_datetime,dl.delivery_datetime]);
 }
 const csv='\uFEFF'+out.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='airport-cargo-cargas-filtradas.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function init(){
 try{
  const all=await Promise.all(FILES.map(async name=>{
   const response=await fetch(path+name+'.csv',{cache:'no-store'});
   if(!response.ok)throw new Error('Não foi possível carregar '+name+'.csv (HTTP '+response.status+')');
   return [name,parseCsv(await response.text())];
  }));
  state=Object.fromEntries(all);makeMaps(state);
  fillOptions('filter-month',state.flights.map(f=>f.aircraft_arrival_datetime.slice(0,7)),'Todos os meses');
  fillOptions('filter-airline',state.flights.map(f=>f.airline),'Todas as companhias');
  fillOptions('filter-type',state.cargo.map(c=>c.cargo_type),'Todos os tipos');
  for(const id of ['filter-month','filter-airline','filter-type'])$(id).addEventListener('change',render);
  $('reset').addEventListener('click',()=>{for(const id of ['filter-month','filter-airline','filter-type'])$(id).value='all';render()});
  $('download-csv').addEventListener('click',exportCargo);
  render();
 }catch(e){$('status').classList.add('error');$('status').textContent='Erro ao carregar dados: '+e.message+'. O painel precisa ser aberto em um servidor HTTP (GitHub Pages ou python -m http.server), não como arquivo local.';console.error(e)}
}
document.addEventListener('DOMContentLoaded',init);
