'use strict';
const entryForm = document.getElementById('entryForm');
const palletInput = document.getElementById('pallet');
const airlineInput = document.getElementById('airline');
const message = document.getElementById('message');
const saveBtn = document.getElementById('saveBtn');
const recentRows = document.getElementById('recentRows');
const connection = document.getElementById('connection');

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = 'feedback ' + (isError ? 'error' : 'success');
}
function setConnection(online) {
  connection.textContent = online ? '● Servidor conectado' : '● Sem conexão — não é possível salvar';
  connection.className = 'connection ' + (online ? 'connected' : 'disconnected');
}
function cell(text) {
  const td = document.createElement('td');
  td.textContent = String(text);
  return td;
}
async function loadEntries() {
  const payload = await getJson('/api/registros');
  recentRows.replaceChildren();
  document.getElementById('itemCount').textContent = String(payload.total_exibido);
  if (payload.itens.length === 0) {
    const tr = document.createElement('tr');
    const td = cell('Nenhum lançamento hoje.');
    td.colSpan = 4;
    td.className = 'empty';
    tr.append(td);
    recentRows.append(tr);
    return;
  }
  for (const item of payload.itens) {
    const tr = document.createElement('tr');
    tr.append(cell(item.turno), cell(item.palete), cell(item.cia));
    const td = document.createElement('td');
    const button = document.createElement('button');
    button.textContent = 'Excluir';
    button.className = 'text-btn';
    button.setAttribute('aria-label', `Excluir ${item.palete} do turno ${item.turno}`);
    button.onclick = async () => {
      if (!confirm(`Excluir o registro ${item.palete} · CIA ${item.cia} · ${item.turno}?`)) return;
      button.disabled = true;
      try {
        await getJson(`/api/registros/${item.id}`, { method:'DELETE' });
        showMessage(`${item.palete}: lançamento excluído da apuração.`);
        await loadEntries();
      } catch (error) { showMessage(error.message, true); button.disabled = false; }
    };
    td.append(button);
    tr.append(td);
    recentRows.append(tr);
  }
}
async function loadContext() {
  try {
    const context = await getJson('/api/contexto');
    document.getElementById('today').textContent = context.data_legivel;
    document.querySelector(`input[name="turno"][value="${context.turno_sugerido}"]`).checked = true;
    setConnection(true);
    await loadEntries();
  } catch (error) {
    setConnection(false);
    showMessage(error.message, true);
  }
}
palletInput.addEventListener('input', () => {
  palletInput.value = palletInput.value.toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g,'');
});
airlineInput.addEventListener('input', () => {
  airlineInput.value = airlineInput.value.replace(/[^0-9]/g,'').slice(0,3);
});
entryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const palete = palletInput.value;
  const cia = airlineInput.value;
  const turno = entryForm.querySelector('input[name="turno"]:checked').value;
  if (!/^[A-Z0-9]{1,30}$/.test(palete)) return showMessage('Informe um palete de 1 a 30 letras ou números, sem espaços.', true);
  if (!/^[0-9]{3}$/.test(cia)) return showMessage('O código da companhia deve ter exatamente 3 números.', true);
  saveBtn.disabled = true;
  saveBtn.textContent = 'Salvando…';
  try {
    const item = await getJson('/api/registros', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({turno, palete, cia}),
    });
    showMessage(`${item.palete} registrado com sucesso no turno ${item.turno}.`);
    palletInput.value = '';
    palletInput.focus();
    setConnection(true);
    await loadEntries();
  } catch (error) {
    showMessage(error.message, true);
    if (error.message.includes('conexão')) setConnection(false);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Registrar palete <span>→</span>';
  }
});
loadContext();
