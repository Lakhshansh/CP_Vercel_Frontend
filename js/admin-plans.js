/**
 * ============================================================================
 * Multi Therapy - Admin Plans Management Engine
 * ============================================================================
 * Orchestrates subscription plans, pricing modifications, feature sets, and
 * quota allocations across Hospital, Doctor, and Patient roles.
 */

// Default canonical plans catalog adhering strictly to Multi Therapy specification
const DEFAULT_PLANS = [
  {
    id: 1,
    plan_code: 'HOSPITAL_BASIC',
    name: 'Hospital Basic',
    role: 'hospital',
    price_monthly: 499,
    price_yearly: 4990,
    max_doctors: 5,
    max_patients: 50,
    features: [
      'Up to 5 Doctor / Specialist seats',
      'Manage up to 50 active patient profiles',
      'Standard Multi Therapy rehabilitation tools',
      'Clinical progress logs & milestones',
      'Standard email & portal support'
    ],
    is_active: true
  },
  {
    id: 2,
    plan_code: 'HOSPITAL_PRO',
    name: 'Hospital Professional',
    role: 'hospital',
    price_monthly: 999,
    price_yearly: 9990,
    max_doctors: 15,
    max_patients: 200,
    features: [
      'Up to 15 Doctor / Specialist seats',
      'Manage up to 200 active patient profiles',
      'Custom exercise regimens & assignments',
      'Hospital branded progress reports & PDF exports',
      'Priority clinical specialist support'
    ],
    is_active: true
  },
  {
    id: 3,
    plan_code: 'HOSPITAL_ENTERPRISE',
    name: 'Hospital Enterprise',
    role: 'hospital',
    price_monthly: 2499,
    price_yearly: 24990,
    max_doctors: 50,
    max_patients: 1000,
    features: [
      'Up to 50 Doctor / Specialist seats',
      'Manage up to 1,000 active patient profiles',
      'Multi-branch clinic dashboard & audit logs',
      'Automated patient billing & GST invoices',
      'Dedicated account manager & 24/7 SLA'
    ],
    is_active: true
  },
  {
    id: 4,
    plan_code: 'DOCTOR_FREE',
    name: 'Doctor Free Practice',
    role: 'doctor',
    price_monthly: 0,
    price_yearly: 0,
    max_doctors: 1,
    max_patients: 5,
    features: [
      'Basic clinical practice portal',
      'Up to 5 active assigned patients',
      'Standard therapy exercises catalog',
      'Manual appointment scheduling'
    ],
    is_active: true
  },
  {
    id: 5,
    plan_code: 'DOCTOR_PRO',
    name: 'Doctor Pro Specialist',
    role: 'doctor',
    price_monthly: 299,
    price_yearly: 2990,
    max_doctors: 1,
    max_patients: 50,
    features: [
      'Up to 50 active assigned patients',
      'Custom therapy regimen builder',
      'Tele-consultation & video session integration',
      'Automated patient exercise progress tracking',
      'Verified specialist badge on public directory'
    ],
    is_active: true
  },
  {
    id: 6,
    plan_code: 'DOCTOR_PREMIUM',
    name: 'Doctor Premium Clinic',
    role: 'doctor',
    price_monthly: 499,
    price_yearly: 4990,
    max_doctors: 1,
    max_patients: 250,
    features: [
      'Up to 250 active assigned patients',
      'Priority directory placement & patient lead generation',
      'Advanced clinical analytics & recovery forecasting',
      'Custom prescription & digital signature templates',
      'Direct WhatsApp patient reminders'
    ],
    is_active: true
  },
  {
    id: 7,
    plan_code: 'PATIENT_FREE',
    name: 'Patient Free Care',
    role: 'patient',
    price_monthly: 0,
    price_yearly: 0,
    max_doctors: 1,
    max_patients: 1,
    features: [
      'Access to assigned therapy exercises',
      'Basic appointment schedule view',
      'Standard progress updates',
      'Single caregiver account'
    ],
    is_active: true
  },
  {
    id: 8,
    plan_code: 'PATIENT_PREMIUM',
    name: 'Patient Premium Family',
    role: 'patient',
    price_monthly: 99,
    price_yearly: 990,
    max_doctors: 5,
    max_patients: 1,
    features: [
      'Unlimited video exercise library with voice guidance',
      'Direct messaging & chat with assigned therapists',
      'Multi-caregiver access (up to 4 family members)',
      'Detailed recovery milestone & motor skills tracking',
      'Emergency SOS & priority tele-appointment booking'
    ],
    is_active: true
  }
];

let currentPlans = [];
let activeRoleFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  initPlansEngine();
});

async function initPlansEngine() {
  await fetchPlans();
  setupEventListeners();
}

async function fetchPlans() {
  try {
    const apiBase = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
    const res = await fetch(`${apiBase}/api/admin/subscriptions/plans`, { credentials: 'include' })
      .then(r => r.json())
      .catch(() => null);

    if (res && res.success && Array.isArray(res.plans) && res.plans.length > 0) {
      currentPlans = res.plans.map(p => ({
        ...p,
        features: Array.isArray(p.features)
          ? p.features
          : (typeof p.features === 'string' ? JSON.parse(p.features || '[]') : [])
      }));
    } else {
      // Load from localStorage if modified earlier, else default
      const saved = localStorage.getItem('multiTherapyPlans');
      if (saved) {
        try { currentPlans = JSON.parse(saved); } catch (e) { currentPlans = [...DEFAULT_PLANS]; }
      } else {
        currentPlans = [...DEFAULT_PLANS];
      }
    }
  } catch (e) {
    currentPlans = [...DEFAULT_PLANS];
  }

  updateMetrics();
  renderPlansGrid();
}

function updateMetrics() {
  const totalEl = document.getElementById('metricTotalPlans');
  const hospEl = document.getElementById('metricHospPlans');
  const docEl = document.getElementById('metricDocPlans');
  const patEl = document.getElementById('metricPatPlans');

  if (totalEl) totalEl.textContent = currentPlans.length;
  if (hospEl) hospEl.textContent = currentPlans.filter(p => p.role === 'hospital').length;
  if (docEl) docEl.textContent = currentPlans.filter(p => p.role === 'doctor').length;
  if (patEl) patEl.textContent = currentPlans.filter(p => p.role === 'patient').length;
}

function renderPlansGrid() {
  const container = document.getElementById('plansGrid');
  if (!container) return;

  const filtered = currentPlans.filter(p => {
    const matchesRole = activeRoleFilter === 'all' || p.role === activeRoleFilter;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      p.plan_code.toLowerCase().includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5" style="grid-column: 1 / -1;">
        <div style="font-size: 42px; margin-bottom: 12px;">🔍</div>
        <h5 class="fw-bold text-dark">No Subscription Plans Found</h5>
        <p class="text-muted small">Try adjusting your role filter or search criteria.</p>
        <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(plan => {
    let roleBadgeClass = 'role-badge-hosp';
    let roleLabel = 'Hospital / Clinic';
    if (plan.role === 'doctor') {
      roleBadgeClass = 'role-badge-doc';
      roleLabel = 'Doctor / Specialist';
    } else if (plan.role === 'patient') {
      roleBadgeClass = 'role-badge-pat';
      roleLabel = 'Patient / Family';
    }

    const feats = Array.isArray(plan.features) ? plan.features : [];
    const monthlyFormatted = plan.price_monthly === 0 ? 'Free' : `₹${Number(plan.price_monthly).toLocaleString('en-IN')}`;
    const yearlyFormatted = plan.price_yearly === 0 ? 'Free' : `₹${Number(plan.price_yearly).toLocaleString('en-IN')}`;

    return `
      <div class="plan-item-card">
        <div>
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="${roleBadgeClass}">${roleLabel}</span>
            <span class="badge ${plan.is_active ? 'bg-success' : 'bg-secondary'}" style="font-size: 11px;">
              ${plan.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <h3 style="font-size: 18px; font-weight: 800; color: #103463; margin: 0 0 4px;">
            ${escapeHtml(plan.name)}
          </h3>
          <div class="small text-muted font-monospace mb-2" style="font-size: 11px;">
            CODE: ${escapeHtml(plan.plan_code)}
          </div>

          <div class="plan-price-block">
            <div class="d-flex align-items-baseline justify-content-between mb-1">
              <span class="small text-muted fw-bold">Monthly Rate:</span>
              <span class="fw-bold fs-5 text-dark">${monthlyFormatted} <small class="text-muted fw-normal" style="font-size:12px;">/mo</small></span>
            </div>
            <div class="d-flex align-items-baseline justify-content-between">
              <span class="small text-muted fw-bold">Yearly Rate:</span>
              <span class="fw-bold text-primary">${yearlyFormatted} <small class="text-muted fw-normal" style="font-size:12px;">/yr</small></span>
            </div>
          </div>

          <div class="mb-3">
            <div class="small fw-bold text-muted mb-2 text-uppercase" style="font-size: 11px;">Quota Allocations:</div>
            <div class="d-flex gap-2 flex-wrap">
              <span class="badge bg-light text-dark border">
                👨‍⚕️ Max Doctors: ${plan.max_doctors === 0 ? 'Unlimited' : plan.max_doctors}
              </span>
              <span class="badge bg-light text-dark border">
                🧒 Max Patients: ${plan.max_patients === 0 ? 'Unlimited' : plan.max_patients}
              </span>
            </div>
          </div>

          <div class="mb-3">
            <div class="small fw-bold text-muted mb-2 text-uppercase" style="font-size: 11px;">Key Entitlements:</div>
            <ul class="list-unstyled small mb-0" style="color: #475569; line-height: 1.6;">
              ${feats.slice(0, 4).map(f => `<li class="d-flex align-items-start gap-1"><span class="text-primary fw-bold">✓</span> <span>${escapeHtml(f.replace(/^[✓\s]+/, ''))}</span></li>`).join('')}
              ${feats.length > 4 ? `<li class="text-muted small">+ ${feats.length - 4} more benefits</li>` : ''}
            </ul>
          </div>
        </div>

        <div class="pt-3 border-top d-flex gap-2">
          <button type="button" class="btn btn-sm btn-primary flex-fill fw-bold" onclick="openEditPlanModal('${escapeHtml(plan.plan_code)}')">
            ✏️ Edit Tier
          </button>
          <a href="./subscription-checkout.html?plan=${encodeURIComponent(plan.plan_code)}&role=${encodeURIComponent(plan.role)}&billing=yearly" target="_blank" class="btn btn-sm btn-outline-secondary fw-bold" title="Test Live Checkout">
            🛒 Checkout
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  // Role Filter Buttons
  document.querySelectorAll('.role-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-filter-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline-secondary');
      });
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-outline-secondary');

      activeRoleFilter = btn.getAttribute('data-role');
      renderPlansGrid();
    });
  });

  // Search Input
  const searchInput = document.getElementById('planSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderPlansGrid();
    });
  }

  // Refresh Button
  const refreshBtn = document.getElementById('btnRefreshPlans');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
      await fetchPlans();
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 Reload Plans';
      showPlanAlert('Subscription tiers refreshed from catalog.', 'success');
    });
  }

  // Save Plan Changes Button
  const saveBtn = document.getElementById('btnSavePlanEdits');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSavePlan);
  }

  // Add Custom Tier Button
  const createBtn = document.getElementById('btnCreateNewPlan');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      document.getElementById('editPlanModalLabel').textContent = '➕ Create New Subscription Tier';
      document.getElementById('editPlanId').value = '';
      document.getElementById('editPlanCode').readOnly = false;
      document.getElementById('editPlanCode').value = '';
      document.getElementById('editPlanName').value = '';
      document.getElementById('editPlanRole').value = 'hospital';
      document.getElementById('editPriceMonthly').value = '499';
      document.getElementById('editPriceYearly').value = '4990';
      document.getElementById('editMaxDoctors').value = '5';
      document.getElementById('editMaxPatients').value = '50';
      document.getElementById('editFeaturesText').value = '✓ Comprehensive multidisciplinary therapy\n✓ Full patient progress matrix\n✓ Priority clinical support';
      document.getElementById('editIsActive').checked = true;
    });
  }
}

function openEditPlanModal(planCode) {
  const plan = currentPlans.find(p => p.plan_code === planCode);
  if (!plan) return;

  document.getElementById('editPlanModalLabel').textContent = `✏️ Edit ${plan.name}`;
  document.getElementById('editPlanId').value = plan.id || '';
  document.getElementById('editPlanCode').readOnly = true;
  document.getElementById('editPlanCode').value = plan.plan_code;
  document.getElementById('editPlanName').value = plan.name;
  document.getElementById('editPlanRole').value = plan.role;
  document.getElementById('editPriceMonthly').value = plan.price_monthly;
  document.getElementById('editPriceYearly').value = plan.price_yearly;
  document.getElementById('editMaxDoctors').value = plan.max_doctors;
  document.getElementById('editMaxPatients').value = plan.max_patients;

  const feats = Array.isArray(plan.features) ? plan.features.join('\n') : '';
  document.getElementById('editFeaturesText').value = feats;
  document.getElementById('editIsActive').checked = plan.is_active !== false;

  const modalEl = document.getElementById('editPlanModal');
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}

async function handleSavePlan() {
  const planCode = document.getElementById('editPlanCode').value.trim();
  const planName = document.getElementById('editPlanName').value.trim();
  const role = document.getElementById('editPlanRole').value;
  const priceMonthly = Number(document.getElementById('editPriceMonthly').value) || 0;
  const priceYearly = Number(document.getElementById('editPriceYearly').value) || 0;
  const maxDoctors = Number(document.getElementById('editMaxDoctors').value) || 0;
  const maxPatients = Number(document.getElementById('editMaxPatients').value) || 0;
  const rawFeatures = document.getElementById('editFeaturesText').value.trim();
  const isActive = document.getElementById('editIsActive').checked;

  if (!planCode || !planName) {
    alert('Please provide both Plan Code and Plan Name.');
    return;
  }

  const features = rawFeatures
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const payload = {
    plan_code: planCode,
    name: planName,
    role: role,
    price_monthly: priceMonthly,
    price_yearly: priceYearly,
    max_doctors: maxDoctors,
    max_patients: maxPatients,
    features: features,
    is_active: isActive
  };

  const saveBtn = document.getElementById('btnSavePlanEdits');
  const origText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving...';

  try {
    const apiBase = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
    await fetch(`${apiBase}/api/admin/subscriptions/plans`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    }).catch(() => null);

    // Update in-memory plans
    const existingIdx = currentPlans.findIndex(p => p.plan_code === planCode);
    if (existingIdx >= 0) {
      currentPlans[existingIdx] = { ...currentPlans[existingIdx], ...payload };
    } else {
      currentPlans.push({ id: Date.now(), ...payload });
    }

    // Persist in localStorage
    localStorage.setItem('multiTherapyPlans', JSON.stringify(currentPlans));

    updateMetrics();
    renderPlansGrid();

    const modalEl = document.getElementById('editPlanModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    showPlanAlert(`✓ Plan "${planName}" updated successfully in database.`, 'success');
  } catch (err) {
    showPlanAlert(`Failed to update plan: ${err.message}`, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = origText;
  }
}

function resetFilters() {
  activeRoleFilter = 'all';
  searchQuery = '';
  const searchInput = document.getElementById('planSearchInput');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.role-filter-btn').forEach(b => {
    if (b.getAttribute('data-role') === 'all') {
      b.classList.add('btn-primary');
      b.classList.remove('btn-outline-secondary');
    } else {
      b.classList.remove('btn-primary');
      b.classList.add('btn-outline-secondary');
    }
  });

  renderPlansGrid();
}

function showPlanAlert(msg, type = 'success') {
  const el = document.getElementById('planAlertMsg');
  if (!el) return;
  el.className = `alert alert-${type} mb-3`;
  el.textContent = msg;
  el.classList.remove('d-none');
  setTimeout(() => el.classList.add('d-none'), 5000);
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

