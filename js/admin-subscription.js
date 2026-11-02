/**
 * ============================================================================
 * Multi Therapy - Super Admin Subscription Controller Engine
 * ============================================================================
 * Coordinates real-time database API operations across all 8 Super Admin modules:
 * 1. KPI Dashboard & Live Revenue Summary
 * 2. Subscription Multi-filter Ledger & Plan Switching
 * 3. Plan & Pricing Architecture Configuration
 * 4. Razorpay Payments Audit & Verification
 * 5. Refund Processing & Financial Reconciliations
 * 6. Promotional Coupon Campaign Management
 * 7. GST Tax Invoices & Receipt Distribution
 * 8. Chart.js Revenue Analytics & Growth Curves
 */

const API_BASE = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';

// Helper to make Super Admin authenticated requests
async function adminFetch(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Admin-Role': 'superadmin',
    'Authorization': 'Bearer superadmin_MultiTherapy2026'
  };

  const finalOptions = {
    ...options,
    credentials: 'include',
    headers: { ...defaultHeaders, ...(options.headers || {}) }
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, finalOptions);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data && data.message ? data.message : `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn(`[SuperAdmin Fetch] Error at ${endpoint}:`, err);
    throw err;
  }
}

// Format currency in Indian Rupees
function formatINR(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date time
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

// Badge Generators
function getRoleBadge(userType) {
  const t = String(userType || 'hospital').toLowerCase();
  if (t === 'hospital') {
    return '<span class="badge-role-hospital">🏥 Hospital</span>';
  } else if (t === 'doctor') {
    return '<span class="badge-role-doctor">🩺 Doctor</span>';
  } else {
    return '<span class="badge-role-patient">👤 Patient</span>';
  }
}

function getStatusBadge(status) {
  const s = String(status || 'active').toLowerCase();
  if (s === 'active' || s === 'captured' || s === 'paid' || s === 'processed') {
    return `<span class="badge-status-active">✓ ${capitalize(s)}</span>`;
  } else if (s === 'expired' || s === 'pending') {
    return `<span class="badge-status-expired">⏳ ${capitalize(s)}</span>`;
  } else {
    return `<span class="badge-status-cancelled">✗ ${capitalize(s)}</span>`;
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showAdminToast(message, type = 'success') {
  let toastEl = document.getElementById('adminLiveToast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'adminLiveToast';
    toastEl.style.position = 'fixed';
    toastEl.style.bottom = '24px';
    toastEl.style.right = '24px';
    toastEl.style.zIndex = '9999';
    toastEl.style.padding = '14px 22px';
    toastEl.style.borderRadius = '12px';
    toastEl.style.fontSize = '14px';
    toastEl.style.fontWeight = '700';
    toastEl.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toastEl.style.transition = 'all 0.3s ease';
    document.body.appendChild(toastEl);
  }

  if (type === 'success') {
    toastEl.style.background = '#059669';
    toastEl.style.color = '#ffffff';
    toastEl.textContent = `✓ ${message}`;
  } else {
    toastEl.style.background = '#ef4444';
    toastEl.style.color = '#ffffff';
    toastEl.textContent = `✗ ${message}`;
  }

  toastEl.style.display = 'block';
  toastEl.style.opacity = '1';

  setTimeout(() => {
    toastEl.style.opacity = '0';
    setTimeout(() => { toastEl.style.display = 'none'; }, 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// MODULE 1: DASHBOARD VIEW
// ============================================================================
async function initDashboardView() {
  try {
    const data = await adminFetch('/api/super-admin/dashboard/kpis');
    if (data && data.success && data.kpis) {
      const k = data.kpis;
      setText('kpiTotalSubs', k.total_subscriptions);
      setText('kpiActiveSubs', k.active_subscriptions);
      setText('kpiExpiredSubs', k.expired_subscriptions);
      setText('kpiCancelledSubs', k.cancelled_subscriptions);
      setText('kpiMonthlyRev', formatINR(k.monthly_revenue));
      setText('kpiYearlyRev', formatINR(k.yearly_revenue));
      setText('kpiTotalRev', formatINR(k.total_revenue));
      
      // Hospital / Doctor / Patient badges
      setText('kpiHospCount', `${k.hospital_subscribers} Hospitals`);
      setText('kpiDocCount', `${k.doctor_subscribers} Doctors`);
      setText('kpiPatCount', `${k.patient_subscribers} Patients`);

      // Render recent logs
      renderDashboardRecentLogs(data.recent_logs || []);
    }
  } catch (err) {
    console.error('Failed to load dashboard KPIs:', err);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderDashboardRecentLogs(logs) {
  const container = document.getElementById('recentActivityBody');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No recent administrative logs.</td></tr>`;
    return;
  }

  container.innerHTML = logs.map(l => `
    <tr>
      <td class="font-monospace small fw-bold text-dark">${escapeHtml(l.action)}</td>
      <td><span class="badge bg-light text-dark border">${escapeHtml(l.admin_username)}</span></td>
      <td><span class="badge bg-secondary" style="font-size:10.5px;">${escapeHtml(l.target_type)} #${escapeHtml(l.target_id)}</span></td>
      <td class="small text-muted">${formatDateTime(l.created_at)}</td>
    </tr>
  `).join('');
}

// Export global tools to window
window.MultiTherapyAdmin = {
  adminFetch,
  formatINR,
  formatDateTime,
  getRoleBadge,
  getStatusBadge,
  showAdminToast,
  escapeHtml,
  initDashboardView
};

