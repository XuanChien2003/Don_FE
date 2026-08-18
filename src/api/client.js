const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const TOKEN_KEY = 'nxc_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function parseErrorMessage(res) {
  try {
    const body = await res.json();
    return body.error || `Lỗi ${res.status}`;
  } catch {
    return `Lỗi ${res.status}`;
  }
}

// options: { method, body, isFormData, responseType: 'json' | 'blob' }
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, isFormData = false, responseType = 'json' } = options;
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let requestBody = body;
  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: requestBody });
  } catch {
    // fetch() itself throws (network down, DNS failure, CORS preflight blocked) before any HTTP
    // response exists - the browser's own message here ("Failed to fetch" etc.) is English and
    // would otherwise leak straight past every caller's `err.message || <Vietnamese fallback>`.
    throw new Error('Không kết nối được tới máy chủ, vui lòng kiểm tra mạng và thử lại');
  }

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('nxc:unauthorized'));
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (responseType === 'blob') {
    return res.blob();
  }
  if (res.status === 204) return null;
  return res.json();
}
