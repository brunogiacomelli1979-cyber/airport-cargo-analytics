'use strict';
const monthInput = document.getElementById('month');
const companyInput = document.getElementById('company');
const filterForm = document.getElementById('filterForm');
const filterMessage = document.getElementById('filterMessage');
const reportSection = document.getElementById('reportSection');
let loadedReport = null;

function status(text, error = false) {
  filterMessage.className = 'feedback ' + (error ? 'error':'');
  filterMessage.textContent = text;
}
async function loadCompanies() {
  reportSection.hidden = true;
  const month = monthInput.value;
  companyInput.replaceChildren();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
  try {
    const result = await getJson(`/api/cias?mes=${encodeURIComponent(month)}`);
    if (!result.cias.length) {
      companyInput.add(new Option('Nenhuma companhia com registros no mês', ''));
      status('Ainda não existem lançamentos para o mês selecionado.');
      return;
    }
    for (const cia of result.cias) companyInput.add(new Option(`CIA ${cia}`, cia));
    status(`${result.cias.length} companhia(s) encontrada(s).`);
    await generateReport();
  } catch (error) { status(error.message, true); }
}
function addCell(tr, text) {
  const td = document.createElement('td');
  td.textContent = String(text);
  tr.append(td);
}
async function generateReport() {
  const mes = monthInput.value, cia = companyInput.value;
  if (!mes || !cia) return status('Escolha um mês e uma companhia aérea.', true);
  try {
    const report = await getJson(`/api/relatorios?mes=${encodeURIComponent(mes)}&cia=${encodeURIComponent(cia)}`);
    loadedReport = report;
    document.getElementById('reportHeading').textContent = `Companhia aérea ${cia}`;
    document.getElementById('reportPeriod').textContent = `Referência: ${mes.slice(5)}/${mes.slice(0,4)}`;
    document.getElementById('totalPallets').textContent = String(report.total_paletes);
    document.getElementById('totalPeriods').textContent = String(report.total_periodos);
    document.getElementById('totalHours').textContent = `${report.total_horas} h`;
    document.getElementById('generatedAt').textContent = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo'}).format(new Date());
    const tbody = document.getElementById('reportRows');
    tbody.replaceChildren();
    if (!report.itens.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5; td.className = 'empty';
      td.textContent = 'Nenhum palete atingiu o 3º período consecutivo neste mês.';
      tr.append(td); tbody.append(tr);
    }
    for (const item of report.itens) {
      const tr = document.createElement('tr');
      addCell(tr, item.palete); addCell(tr, item.periodos_registrados);
      addCell(tr, item.maior_sequencia); addCell(tr, item.periodos_cobraveis);
      addCell(tr, `${item.horas_cobraveis} h`); tbody.append(tr);
    }
    reportSection.hidden = false;
    status(`Relatório gerado para a companhia ${cia}.`);
  } catch (error) {
    reportSection.hidden = true;
    status(error.message, true);
  }
}
monthInput.addEventListener('change', loadCompanies);
filterForm.addEventListener('submit', (event) => {event.preventDefault(); generateReport();});
document.getElementById('downloadCsv').addEventListener('click', () => {
  if (!loadedReport) return;
  window.location.href = `/api/relatorios/csv?mes=${encodeURIComponent(loadedReport.mes)}&cia=${encodeURIComponent(loadedReport.cia)}`;
});
document.getElementById('printReport').addEventListener('click', () => window.print());
(async function init() {
  try {
    const context = await getJson('/api/contexto');
    monthInput.value = context.mes;
    await loadCompanies();
  } catch (error) {status(error.message, true);}
})();
