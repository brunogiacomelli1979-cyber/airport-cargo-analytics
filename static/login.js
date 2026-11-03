'use strict';
const form = document.getElementById('accessForm');
form.addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = document.getElementById('loginButton');
  const msg = document.getElementById('accessMessage');
  btn.disabled = true;
  msg.textContent = '';
  try {
    await getJson('/api/acesso/entrar', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({codigo:document.getElementById('accessCode').value})});
    location.replace('/');
  } catch (error) {msg.className = 'feedback error'; msg.textContent = error.message; btn.disabled = false;}
});
