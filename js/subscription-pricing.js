/**
 * Multi Therapy - Master Subscription Pricing Controller
 * Dynamically fetches plans from MySQL backend, handles role tabs, billing toggle,
 * plan comparison matrix, and checkout navigation.
 */

let allPlansData = [];
let currentRole = "hospital";
let isYearly = false;
let currentUser = null;

// Default plans fallback if remote server is booting
const DEFAULT_PLANS = [
  // Hospital
  { plan_id: 1, code: 'hospital_basic', name: 'Basic', user_type: 'hospital', monthly_price: 499.00, yearly_price: 4990.00, features: ['Up to 5 Doctors & Therapists', 'Up to 50 Patient Profiles', 'Appointments & Therapy Scheduler', 'Standard Email Support'], limits: { doctors: 5, patients: 50 }, is_active: 1 },
  { plan_id: 2, code: 'hospital_pro', name: 'Professional', user_type: 'hospital', monthly_price: 999.00, yearly_price: 9990.00, features: ['Up to 20 Doctors & Therapists', 'Up to 250 Patient Profiles', 'Priority Tele-Therapy HD Video', 'Digital Prescription & Progress Notes', 'Automated Patient Quota Tracking', 'Priority Support Desk'], limits: { doctors: 20, patients: 250 }, is_active: 1 },
  { plan_id: 3, code: 'hospital_enterprise', name: 'Enterprise', user_type: 'hospital', monthly_price: 2499.00, yearly_price: 24990.00, features: ['Unlimited Doctors & Specialists', 'Unlimited Patient Profiles', 'Complete Hospital-Sponsored Access', 'Dedicated Account Manager', 'Custom Clinic Branding & Reports', 'Full Tele-Therapy & AI Exercises Suite', '24/7 Dedicated Support'], limits: { doctors: 9999, patients: 9999 }, is_active: 1 },
  // Doctor
  { plan_id: 4, code: 'doctor_free', name: 'Free', user_type: 'doctor', monthly_price: 0.00, yearly_price: 0.00, features: ['Standard Profile in Doctor Directory', 'Up to 5 Patient Consultations / Month', 'Basic Appointment Logging', 'Community Forum Access'], limits: { patients: 5 }, is_active: 1 },
  { plan_id: 5, code: 'doctor_pro', name: 'Pro', user_type: 'doctor', monthly_price: 299.00, yearly_price: 2990.00, features: ['Up to 30 Active Patients', 'Priority Directory Placement & Badging', 'Tele-Therapy Video Consultations', 'Digital Prescription Generator', 'Email & SMS Reminders', 'Automated Progress Reports'], limits: { patients: 30 }, is_active: 1 },
  { plan_id: 6, code: 'doctor_premium', name: 'Premium', user_type: 'doctor', monthly_price: 499.00, yearly_price: 4990.00, features: ['Unlimited Patients & Tele-Therapy', 'Verified Top Doctor Badge', 'Multi-Specialty Care Team Collaboration', 'Custom Clinic Letterhead Export', 'Direct WhatsApp Patient Reminders', 'Dedicated Specialist Concierge Support'], limits: { patients: 9999 }, is_active: 1 },
  // Patient
  { plan_id: 7, code: 'patient_free', name: 'Free', user_type: 'patient', monthly_price: 0.00, yearly_price: 0.00, features: ['Basic Profile & Medical Records View', 'Book Appointments with Doctors', 'Access to 10 Starter Exercise Guides', 'Email Appointment Confirmations'], limits: { family_accounts: 1 }, is_active: 1 },
  { plan_id: 8, code: 'patient_premium', name: 'Premium', user_type: 'patient', monthly_price: 99.00, yearly_price: 990.00, features: ['Full Video Exercise Library (50+ HD Regimens)', 'Daily Therapy Progress Tracker & Milestones', 'Priority Booking with Lead Therapists', 'Up to 3 Family Caregiver Accounts', 'Direct WhatsApp Specialist Notifications', 'Detailed Monthly Rehabilitation PDF Export'], limits: { family_accounts: 3 }, is_active: 1 }
];

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Check user authentication
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) currentUser = JSON.parse(raw);
  } catch (e) {}

  updateNavUser();

  // 2. Parse query parameters (e.g. ?role=doctor&cycle=yearly)
  const urlParams = new URLSearchParams(window.location.search);
  const requestedRole = urlParams.get("role");
  if (requestedRole && ["hospital", "doctor", "patient"].includes(requestedRole.toLowerCase())) {
    currentRole = requestedRole.toLowerCase();
  } else if (currentUser && currentUser.role) {
    const r = currentUser.role.toLowerCase();
    if (r.includes("hospital") || r.includes("clinic") || r.includes("admin")) currentRole = "hospital";
    else if (r.includes("doctor") || r.includes("therapist")) currentRole = "doctor";
    else currentRole = "patient";
  }

  if (urlParams.get("cycle") === "yearly") {
    isYearly = true;
    const toggle = document.getElementById("billingCycleToggle");
    if (toggle) toggle.checked = true;
  }

  // Set active tab UI
  updateTabUI(currentRole);

  // 3. Setup Events
  setupEventListeners();

  // 4. Fetch dynamic plans
  await fetchPlans();
});

function updateNavUser() {
  const pill = document.getElementById("navUserPill");
  const loginBtn = document.getElementById("navLoginBtn");
  const navUsername = document.getElementById("navUsername");
  const navRole = document.getElementById("navRole");
  const navAvatar = document.getElementById("navAvatar");

  if (currentUser) {
    if (pill) pill.style.display = "inline-flex";
    if (loginBtn) loginBtn.classList.add("d-none");
    if (navUsername) navUsername.textContent = currentUser.name || currentUser.username || "User";
    if (navRole) navRole.textContent = currentUser.role || "Member";
    if (navAvatar) {
      const char = (currentUser.name || currentUser.username || "U").charAt(0).toUpperCase();
      navAvatar.textContent = char;
    }
  } else {
    if (pill) pill.style.display = "none";
    if (loginBtn) loginBtn.classList.remove("d-none");
  }
}

function setupEventListeners() {
  // Role tabs
  const tabs = document.querySelectorAll(".mt-role-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const role = tab.getAttribute("data-role");
      if (role && role !== currentRole) {
        currentRole = role;
        updateTabUI(currentRole);
        renderPricingCards();
        renderComparisonMatrix();
      }
    });
  });

  // Billing Cycle Toggle
  const toggle = document.getElementById("billingCycleToggle");
  const labelM = document.getElementById("labelMonthly");
  const labelY = document.getElementById("labelYearly");

  if (toggle) {
    toggle.addEventListener("change", (e) => {
      isYearly = e.target.checked;
      if (isYearly) {
        if (labelM) labelM.classList.remove("active");
        if (labelY) labelY.classList.add("active");
      } else {
        if (labelM) labelM.classList.add("active");
        if (labelY) labelY.classList.remove("active");
      }
      renderPricingCards();
    });
  }
}

function updateTabUI(role) {
  const tabs = document.querySelectorAll(".mt-role-tab");
  tabs.forEach(tab => {
    if (tab.getAttribute("data-role") === role) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Matrix heading
  const matrixHeading = document.getElementById("matrixHeading");
  if (matrixHeading) {
    if (role === "hospital") matrixHeading.textContent = "Hospital & Clinic Tier Comparison Matrix";
    else if (role === "doctor") matrixHeading.textContent = "Doctor & Specialist Tier Comparison Matrix";
    else matrixHeading.textContent = "Patient & Family Tier Comparison Matrix";
  }
}

async function fetchPlans() {
  const loadingEl = document.getElementById("loadingPlans");
  const gridEl = document.getElementById("pricingCardsGrid");

  try {
    const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
    const resp = await fetch(`${apiBase}/api/subscriptions/plans`).then(r => r.json()).catch(() => null);

    if (resp && resp.success && Array.isArray(resp.plans) && resp.plans.length > 0) {
      allPlansData = resp.plans;
    } else {
      allPlansData = DEFAULT_PLANS;
    }
  } catch (e) {
    allPlansData = DEFAULT_PLANS;
  }

  if (loadingEl) loadingEl.style.display = "none";
  if (gridEl) gridEl.style.display = "grid";

  renderPricingCards();
  renderComparisonMatrix();
}

function renderPricingCards() {
  const gridEl = document.getElementById("pricingCardsGrid");
  if (!gridEl) return;

  const rolePlans = allPlansData.filter(p => p.user_type === currentRole);
  if (rolePlans.length === 0) {
    gridEl.innerHTML = `<div class="col-12 text-center text-muted py-4">No active plans found for this category.</div>`;
    return;
  }

  gridEl.innerHTML = rolePlans.map(plan => {
    const isPopular = plan.name.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("premium");
    const price = isYearly ? plan.yearly_price : plan.monthly_price;
    const formattedPrice = Number(price).toLocaleString('en-IN');
    const cycleText = Number(price) === 0 ? "forever" : (isYearly ? "/ year" : "/ month");

    // Savings on yearly
    let savingsHtml = "";
    if (isYearly && Number(price) > 0) {
      const monthlyEquiv = Math.round(price / 12);
      const normalYearly = plan.monthly_price * 12;
      const saved = normalYearly - price;
      if (saved > 0) {
        savingsHtml = `<div class="mt-price-savings">🎉 Save ₹${saved.toLocaleString('en-IN')} / year (₹${monthlyEquiv}/mo)</div>`;
      }
    }

    // Features list
    let feats = [];
    if (Array.isArray(plan.features)) {
      feats = plan.features;
    } else if (typeof plan.features === "string") {
      try { feats = JSON.parse(plan.features); } catch (e) { feats = [plan.features]; }
    }

    const featsHtml = feats.map(f => `
      <li class="mt-feature-item">
        <span class="mt-check-icon">✓</span>
        <span>${f}</span>
      </li>
    `).join("");

    const cycleParam = isYearly ? "yearly" : "monthly";
    const checkoutUrl = `./subscription-checkout.html?plan_id=${plan.plan_id}&cycle=${cycleParam}`;
    const btnLabel = Number(price) === 0 ? "Get Started Free" : (isPopular ? "⭐ Subscribe Now" : "Choose Plan");

    return `
      <div class="mt-plan-card ${isPopular ? 'popular' : ''}">
        ${isPopular ? '<div class="mt-popular-tag">Most Recommended</div>' : ''}
        
        <div class="mt-plan-header">
          <h3 class="mt-plan-name">${plan.name}</h3>
          <p class="mt-plan-desc">${getPlanDescription(plan.code, plan.name)}</p>
        </div>

        <div class="mt-plan-price-wrap">
          <span class="mt-price-currency">₹</span>
          <span class="mt-price-amount">${formattedPrice}</span>
          <span class="mt-price-cycle">${cycleText}</span>
        </div>

        ${savingsHtml}

        <ul class="mt-features-list">
          ${featsHtml}
        </ul>

        <a href="${checkoutUrl}" class="mt-btn-subscribe">
          <span>${btnLabel}</span>
          <span>&rarr;</span>
        </a>
      </div>
    `;
  }).join("");
}

function getPlanDescription(code, name) {
  const map = {
    'hospital_basic': 'Essential clinical management for emerging therapy centers & small clinics.',
    'hospital_pro': 'High-volume clinical operations with verified specialists and tele-therapy.',
    'hospital_enterprise': 'Full hospital-wide deployment with unlimited quotas and complete doctor/patient sponsorship.',
    'doctor_free': 'Get discovered in our specialist directory with starter appointment tools.',
    'doctor_pro': 'Independent private practice with HD tele-therapy video and digital prescriptions.',
    'doctor_premium': 'Comprehensive specialist tier with verified badging, team collaboration, and unlimited patients.',
    'patient_free': 'Core access to therapy scheduling, doctor search, and starter home exercises.',
    'patient_premium': 'Complete multi-specialty care with full exercise video library and family caregiver pass.'
  };
  return map[code] || `${name} tier tailored for multidisciplinary care excellence.`;
}

function renderComparisonMatrix() {
  const table = document.getElementById("comparisonTable");
  if (!table) return;

  const rolePlans = allPlansData.filter(p => p.user_type === currentRole);
  if (rolePlans.length === 0) return;

  let headers = `<tr><th style="width: 40%;">Features &amp; Clinical Capabilities</th>`;
  rolePlans.forEach(p => {
    headers += `<th class="text-center" style="width: ${60 / rolePlans.length}%;">${p.name}</th>`;
  });
  headers += `</tr>`;

  let rows = "";
  if (currentRole === "hospital") {
    rows += createMatrixRow("Doctor / Specialist Quota", rolePlans, p => p.limits && p.limits.doctors >= 9999 ? "Unlimited" : `Up to ${p.limits.doctors} Doctors`);
    rows += createMatrixRow("Patient Capacity", rolePlans, p => p.limits && p.limits.patients >= 9999 ? "Unlimited" : `Up to ${p.limits.patients} Patients`);
    rows += createMatrixRow("Hospital-Sponsored Affiliates", rolePlans, p => p.code === "hospital_enterprise" ? "Full Sponsoring (100% Free for Staff)" : (p.code === "hospital_pro" ? "Subsidized Tier" : "Separate Login"));
    rows += createMatrixRow("Tele-Therapy HD Video", rolePlans, p => p.code !== "hospital_basic" ? "✓ Included" : "Standard");
    rows += createMatrixRow("Automated GST Tax Invoices", rolePlans, () => "✓ Included");
    rows += createMatrixRow("Dedicated Account Manager", rolePlans, p => p.code === "hospital_enterprise" ? "✓ 24/7 Dedicated" : "—");
  } else if (currentRole === "doctor") {
    rows += createMatrixRow("Active Patient Limit", rolePlans, p => p.limits && p.limits.patients >= 9999 ? "Unlimited" : `Up to ${p.limits.patients} Patients`);
    rows += createMatrixRow("Directory Verification Badge", rolePlans, p => p.code === "doctor_premium" ? "✓ Verified Top Specialist" : (p.code === "doctor_pro" ? "✓ Verified Doctor" : "Basic"));
    rows += createMatrixRow("Tele-Therapy HD Consultations", rolePlans, p => p.code !== "doctor_free" ? "✓ Unlimited HD" : "—");
    rows += createMatrixRow("Digital Prescriptions & Notes", rolePlans, p => p.code !== "doctor_free" ? "✓ Included" : "—");
    rows += createMatrixRow("Hospital-Sponsored Inheritance", rolePlans, () => "✓ Supported");
  } else {
    rows += createMatrixRow("Caregiver / Family Accounts", rolePlans, p => p.code === "patient_premium" ? "Up to 3 Caregivers" : "1 Account");
    rows += createMatrixRow("Complete Video Exercise Suite", rolePlans, p => p.code === "patient_premium" ? "✓ All 50+ HD Regimens" : "Starter (10 Exercises)");
    rows += createMatrixRow("Milestone Progress Tracking", rolePlans, p => p.code === "patient_premium" ? "✓ Full Rehabilitation Index" : "Basic View");
    rows += createMatrixRow("Priority Appointment Booking", rolePlans, p => p.code === "patient_premium" ? "✓ Priority Queue" : "Standard");
  }

  table.innerHTML = headers + rows;
}

function createMatrixRow(featureTitle, plans, evalFn) {
  let row = `<tr><td class="fw-bold">${featureTitle}</td>`;
  plans.forEach(p => {
    const val = evalFn(p);
    const isPositive = val.includes("✓") || val.includes("Unlimited") || val.includes("Full");
    row += `<td class="text-center ${isPositive ? 'fw-bold text-primary' : 'text-muted'}">${val}</td>`;
  });
  row += `</tr>`;
  return row;
}

