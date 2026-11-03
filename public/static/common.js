'use strict';
function getDeviceId() {
  try {
    let id = localStorage.getItem('paletes_dispositivo');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      localStorage.setItem('paletes_dispositivo', id);
    }
    return id;
  } catch (_error) { return ''; }
}
async function getJson(url, options = {}) {
  const headers = {...options.headers};
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    headers['X-Paletes-Action'] = '1';
    headers['X-Device-Id'] = getDeviceId();
  }
  let response;
  try { response = await fetch(url, {cache:'no-store', credentials:'same-origin', ...options, headers}); }
  catch (_error) { throw new Error('Sem conexão com o servidor. Salvamento não confirmado. Verifique a listagem e tente novamente; duplicidades serão bloqueadas.'); }
  let payload;
  try { payload = await response.json(); } catch (_error) { payload = {}; }
  if (response.status === 401 && url !== '/api/acesso/entrar') {
    location.assign('/entrar');
    throw new Error('Acesso expirado. Informe o código de acesso novamente.');
  }
  if (!response.ok) throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Não foi possível concluir a operação.');
  return payload;
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
