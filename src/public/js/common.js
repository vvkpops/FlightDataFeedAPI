/* ============================================
   Shared admin helpers
   ============================================ */

const API = '/admin/api';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Not authenticated');
  }
  return res;
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const id = 't' + Date.now();
  const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-info';
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-white ${bgClass} border-0 show" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.remove();
  }, 4000);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, 'Z');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0, 10);
}

async function checkAuth() {
  try {
    const res = await fetch(`${API}/me`);
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/admin/login';
    }
  } catch {
    window.location.href = '/admin/login';
  }
}
