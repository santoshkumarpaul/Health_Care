const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Helper to get the JWT token from sessionStorage.
 */
function getToken() {
  return sessionStorage.getItem('access_token');
}

/**
 * Standardized fetch wrapper that automatically handles JSON and Auth headers.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && config.body instanceof FormData) {
    // Browser automatically sets Content-Type to multipart/form-data with boundary
    delete config.headers['Content-Type'];
  } else if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Attempt to parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      // Try to extract a meaningful error message from DRF's validation error format
      const errorMsg = data?.error || data?.detail || (data && typeof data === 'object' ? Object.values(data).flat().join(", ") : null);
      const error = new Error(errorMsg || `API Error: ${response.status} ${response.statusText}`);
      error.data = data; // Attach the full error body (includes details, traceback, etc.)
      error.details = data?.details || data?.detail;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// ─── AUTHENTICATION API ────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (identifier) =>
    apiFetch('/auth/send-otp/', { method: 'POST', body: { identifier: identifier } }),

  loginWithPassword: async (identifier, password) => {
    // Force-clear any stale tokens from a previous session/role
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_phone');

    const data = await apiFetch('/auth/login/', {
      method: 'POST',
      body: { identifier: identifier, password }
    });
    if (data.access) {
      sessionStorage.setItem('access_token', data.access);
      sessionStorage.setItem('refresh_token', data.refresh);
      sessionStorage.setItem('user_role', data.role);
      if (data.phone) sessionStorage.setItem('user_phone', data.phone);
    }
    return data;
  },

  verifyOtp: async (identifier, otpCode, role, intent = 'login', extraData = {}) => {
    const bodyData = { identifier: identifier, otp_code: otpCode, role: role, intent: intent, ...extraData };

    // Force-clear any stale tokens from a previous session/role
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user_role');
    sessionStorage.removeItem('user_phone');

    const data = await apiFetch('/auth/verify-otp/', {
      method: 'POST',
      body: bodyData
    });
    // Store tokens on success
    if (data.access) {
      sessionStorage.setItem('access_token', data.access);
      sessionStorage.setItem('refresh_token', data.refresh);
      sessionStorage.setItem('user_role', data.role);
      if (data.phone) sessionStorage.setItem('user_phone', data.phone);
    }
    return data;
  },

  resetPassword: (identifier, otpCode, newPassword) =>
    apiFetch('/auth/reset-password/', { method: 'POST', body: { identifier: identifier, otp_code: otpCode, new_password: newPassword } }),

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_phone');
  }
};

// ─── CORE API EXAMPLES ─────────────────────────────────────────────────────────
export const patientApi = {
  getAll: async () => {
    const data = await apiFetch('/patients/');
    return data?.results !== undefined ? data.results : data;
  },
  getById: (id) => apiFetch(`/patients/${id}/`),
  getMe: () => apiFetch('/patients/me/'),
  updateProfile: (data) => apiFetch('/patients/me/', { method: 'PATCH', body: data }),
};

export const doctorApi = {
  getAll: async () => {
    const data = await apiFetch('/doctors/');
    return data?.results !== undefined ? data.results : data;
  },
  getById: (id) => apiFetch(`/doctors/${id}/`),
  getMe: () => apiFetch('/doctors/me/'),
  getPatients: () => apiFetch('/doctors/patients/'),
  updateProfile: (data) => apiFetch('/doctors/me/', { method: 'PATCH', body: data }),
  registerPatient: (data) => apiFetch('/register-patient/', { method: 'POST', body: data }),
  verify: (id) => apiFetch(`/doctors/${id}/verify/`, { method: 'POST' }),
};

export const recordsApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/records/${q ? '?' + q : ''}`);
  },
  create: (recordData) => {
    if (recordData instanceof FormData) {
      return apiFetch('/records/', { method: 'POST', body: recordData });
    }
    return apiFetch('/records/', { method: 'POST', body: recordData });
  },
};

export const vitalsApi = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const data = await apiFetch(`/vitals/${q ? '?' + q : ''}`);
    return data?.results !== undefined ? data.results : data;
  },
  create: (data) => apiFetch('/vitals/', { method: 'POST', body: data }),
};

export const allergiesApi = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const data = await apiFetch(`/allergies/${q ? '?' + q : ''}`);
    return data?.results !== undefined ? data.results : data;
  },
  create: (data) => apiFetch('/allergies/', { method: 'POST', body: data }),
  delete: (id) => apiFetch(`/allergies/${id}/`, { method: 'DELETE' }),
};

export const remindersApi = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const data = await apiFetch(`/reminders/${q ? '?' + q : ''}`);
    return data?.results !== undefined ? data.results : data;
  },
  create: (data) => apiFetch('/reminders/', { method: 'POST', body: data }),
  delete: (id) => apiFetch(`/reminders/${id}/`, { method: 'DELETE' }),
};

export const consentsApi = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const data = await apiFetch(`/consents/${q ? '?' + q : ''}`);
    return data?.results !== undefined ? data.results : data;
  },
  updateStatus: (id, status, expiresAt = null) =>
    apiFetch(`/consents/${id}/update_status/`, { method: 'PATCH', body: { status, expires_at: expiresAt } }),
  create: (patientId, scope = "Full Records") =>
    apiFetch('/consents/', { method: 'POST', body: { patient: patientId, scope } }),
};

export const specialApi = {
  getAIInsights: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/ai-summary/${q ? '?' + q : ''}`);
  },
  getQR: () => apiFetch('/generate-qr/'),
  lookupByQR: (qrValue) => apiFetch('/lookup-qr/', { method: 'POST', body: { qr_value: qrValue } }),
  chat: (message, history = []) => apiFetch('/chat/', { method: 'POST', body: { message, history } }),
  getAdvancedAI: () => apiFetch('/advanced-ai/'),
};

export const auditApi = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const data = await apiFetch(`/audit-logs/${q ? '?' + q : ''}`);
    return data?.results !== undefined ? data.results : data;
  }
};

export const adminApi = {
  getStats: () => apiFetch('/dashboard/admin/'),
};
