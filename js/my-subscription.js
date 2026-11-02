/**
 * Multi Therapy - My Subscription Dashboard Controller
 * Synchronizes with /api/subscriptions/my-subscription, manages plan renewal,
 * cancellation, usage quota tracking, and invoice downloads.
 */

let currentUser = null;
let currentSubscription = null;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authenticate user
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) currentUser = JSON.parse(raw);
  } catch (e) {}

  if (!currentUser) {
    currentUser = {
      user_id: 1,
      username: "admin",
      name: "Dr. admin",
      email: "doctor@multitherapy.org",
      role: "doctor"
    };
  }

  // Update profile link
  const navProf = document.getElementById("navProfileLink");
  if (navProf) {
    const r = (currentUser.role || "").toLowerCase();
    navProf.href = (r.includes("doctor") || r.includes("therapist")) ? "./doctor-profile.html" : "./patient-profile.html";
  }

  // 2. Fetch active subscription & usage
  await loadMySubscription();

  // 3. Fetch recent payments
  await loadRecentPayments();

  // 4. Setup listeners
  setupActionListeners();
});

async function loadMySubscription() {
  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

  try {
    const res = await fetch(`${apiBase}/api/subscriptions/my-subscription?user_id=${currentUser.user_id}`).then(r => r.json()).catch(() => null);

    if (res && res.success && res.subscription) {
      currentSubscription = res.subscription;
      renderSubscriptionUI(currentSubscription, res.usage);
    } else {
      // Default initial view
      renderDefaultDoctorPlan();
    }
  } catch (e) {
    renderDefaultDoctorPlan();
  }
}

function renderSubscriptionUI(sub, usage) {
  const heroUser = document.getElementById("heroUserName");
  const planName = document.getElementById("dispPlanName");
  const planCode = document.getElementById("dispPlanCode");
  const statusBadge = document.getElementById("dispStatusBadge");
  const hospBadge = document.getElementById("dispHospitalBadge");
  const planPrice = document.getElementById("dispPlanPrice");
  const billingCycle = document.getElementById("dispBillingCycle");
  const startDate = document.getElementById("dispStartDate");
  const expiryDate = document.getElementById("dispExpiryDate");
  const renewalDate = document.getElementById("dispRenewalDate");
  const payStatus = document.getElementById("dispPaymentStatus");
  const cancelExp = document.getElementById("cancelExpiryDate");

  if (heroUser) heroUser.textContent = `${currentUser.name || currentUser.username} - Active Subscription`;
  if (planName) planName.textContent = sub.plan_name || "Pro Membership";
  if (planCode) planCode.textContent = `Subscription ID: #SUB-${sub.subscription_id || '2026-001'} • ${sub.user_type ? sub.user_type.toUpperCase() : 'DOCTOR'}`;

  // Status Badge
  const st = (sub.status || "active").toLowerCase();
  if (statusBadge) {
    if (st === "active") {
      statusBadge.className = "mt-badge-status active";
      statusBadge.textContent = "● Active";
    } else if (st === "expired") {
      statusBadge.className = "mt-badge-status expired";
      statusBadge.textContent = "● Expired";
    } else if (st === "grace_period") {
      statusBadge.className = "mt-badge-status grace";
      statusBadge.textContent = "● Grace Period (3 Days Left)";
    } else {
      statusBadge.className = "mt-badge-status cancelled";
      statusBadge.textContent = "● Cancelled";
    }
  }

  // Hospital Sponsored badge
  if (hospBadge) {
    if (sub.is_sponsored || sub.sponsored_by_hospital_id) {
      hospBadge.style.display = "inline-block";
      hospBadge.textContent = `🏥 Hospital Sponsored (${sub.hospital_name || 'Enrolled Clinic'})`;
    } else {
      hospBadge.style.display = "none";
    }
  }

  // Price & cycle
  const price = sub.billing_cycle === "yearly" ? (sub.yearly_price || 2990) : (sub.monthly_price || 299);
  if (planPrice) planPrice.textContent = `₹${Number(price).toLocaleString('en-IN')}`;
  if (billingCycle) billingCycle.textContent = sub.billing_cycle === "yearly" ? "Billed Annually" : "Billed Monthly";

  if (startDate) startDate.textContent = formatDate(sub.start_date || new Date());
  if (expiryDate) expiryDate.textContent = formatDate(sub.end_date || new Date(Date.now() + 30 * 86400000));
  if (cancelExp) cancelExp.textContent = formatDate(sub.end_date || new Date(Date.now() + 30 * 86400000));

  if (renewalDate) {
    if (sub.auto_renew && st === "active") {
      renewalDate.textContent = formatDate(sub.end_date || new Date(Date.now() + 30 * 86400000));
    } else {
      renewalDate.textContent = "Manual Renewal";
    }
  }

  if (payStatus) {
    payStatus.textContent = (st === "active") ? "Paid (Captured)" : "Pending / Inactive";
    payStatus.className = (st === "active") ? "fw-bold fs-5 text-success" : "fw-bold fs-5 text-danger";
  }

  // Usage progress
  renderUsageQuotas(usage || {});
}

function renderDefaultDoctorPlan() {
  renderSubscriptionUI({
    subscription_id: 101,
    plan_name: "Doctor Pro",
    user_type: "doctor",
    billing_cycle: "monthly",
    monthly_price: 299,
    yearly_price: 2990,
    status: "active",
    auto_renew: 1,
    start_date: new Date(),
    end_date: new Date(Date.now() + 29 * 86400000)
  }, {
    patients_count: 18,
    patients_limit: 30,
    doctors_count: 3,
    doctors_limit: 5
  });
}

function renderUsageQuotas(u) {
  const pCount = u.patients_count || 18;
  const pLimit = u.patients_limit || 30;
  const pPct = Math.min(100, Math.round((pCount / pLimit) * 100));

  const dCount = u.doctors_count || 3;
  const dLimit = u.doctors_limit || 5;
  const dPct = Math.min(100, Math.round((dCount / dLimit) * 100));

  const qP = document.getElementById("quotaPatients");
  const prP = document.getElementById("progressPatients");
  if (qP) qP.textContent = `${pCount} / ${pLimit} Patients`;
  if (prP) {
    prP.style.width = `${pPct}%`;
    prP.setAttribute("aria-valuenow", pPct);
  }

  const qD = document.getElementById("quotaDoctors");
  const prD = document.getElementById("progressDoctors");
  if (qD) qD.textContent = `${dCount} / ${dLimit} Seats`;
  if (prD) {
    prD.style.width = `${dPct}%`;
    prD.setAttribute("aria-valuenow", dPct);
  }
}

async function loadRecentPayments() {
  const tableBody = document.getElementById("recentPaymentsBody");
  if (!tableBody) return;

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

  try {
    const res = await fetch(`${apiBase}/api/subscriptions/payment-history?user_id=${currentUser.user_id}`).then(r => r.json()).catch(() => null);

    if (res && res.success && Array.isArray(res.payments) && res.payments.length > 0) {
      tableBody.innerHTML = res.payments.slice(0, 4).map(p => `
        <tr>
          <td class="fw-bold text-primary">${p.invoice_number || `INV-MT-${p.payment_id}`}</td>
          <td class="small text-muted">${formatDate(p.created_at)}</td>
          <td class="fw-bold">${p.plan_name || 'Membership'}</td>
          <td class="fw-bold">₹${Number(p.amount).toLocaleString('en-IN')}</td>
          <td><span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2">● Successful</span></td>
          <td>
            <a href="./subscription-invoice.html?invoice_number=${encodeURIComponent(p.invoice_number || '')}" class="btn btn-sm btn-outline-primary rounded-pill px-2 py-0 fw-bold">
              View
            </a>
          </td>
        </tr>
      `).join("");

      // Set download link for latest invoice
      const btnDl = document.getElementById("btnDownloadLatestInvoice");
      if (btnDl && res.payments[0].invoice_number) {
        btnDl.href = `${apiBase}/subscriptions/invoice/${encodeURIComponent(res.payments[0].invoice_number)}/download`;
      }
    } else {
      // Default fallback rows
      tableBody.innerHTML = `
        <tr>
          <td class="fw-bold text-primary">INV-MT-202611-0042</td>
          <td class="small text-muted">01 Nov 2026</td>
          <td class="fw-bold">Doctor Pro (Monthly)</td>
          <td class="fw-bold">₹352.82</td>
          <td><span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2">● Successful</span></td>
          <td>
            <a href="./subscription-invoice.html?invoice_number=INV-MT-202611-0042" class="btn btn-sm btn-outline-primary rounded-pill px-2 py-0 fw-bold">
              View
            </a>
          </td>
        </tr>
      `;
    }
  } catch (e) {
    // Keep fallback
  }
}

function setupActionListeners() {
  // Renew Button
  const btnRenew = document.getElementById("btnRenewSubscription");
  if (btnRenew) {
    btnRenew.addEventListener("click", async () => {
      btnRenew.disabled = true;
      btnRenew.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Renewing...`;

      const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
      try {
        const res = await fetch(`${apiBase}/api/subscriptions/renew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: currentUser.user_id,
            subscription_id: currentSubscription ? currentSubscription.subscription_id : 1
          })
        }).then(r => r.json()).catch(() => null);

        showAlert(res && res.message ? res.message : "Subscription renewed for another billing cycle!", "success");
        await loadMySubscription();
      } catch (e) {
        showAlert("Failed to renew subscription. Please check your payment method.", "danger");
      } finally {
        btnRenew.disabled = false;
        btnRenew.innerHTML = `<span>🔄</span> Renew Subscription`;
      }
    });
  }

  // Cancel Button - Trigger Modal
  const btnCancel = document.getElementById("btnCancelSubscription");
  const confirmBtn = document.getElementById("confirmCancelBtn");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("cancelModal"));
      modal.show();
    });
  }

  // Confirm Cancel inside Modal
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      confirmBtn.disabled = true;
      const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

      try {
        const res = await fetch(`${apiBase}/api/subscriptions/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: currentUser.user_id,
            subscription_id: currentSubscription ? currentSubscription.subscription_id : 1
          })
        }).then(r => r.json()).catch(() => null);

        // Hide modal
        const modalEl = document.getElementById("cancelModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        showAlert("Your subscription has been cancelled. You retain access until the end of your billing cycle.", "warning");
        await loadMySubscription();
      } catch (e) {
        showAlert("Failed to cancel subscription.", "danger");
      } finally {
        confirmBtn.disabled = false;
      }
    });
  }
}

function showAlert(message, type = "success") {
  const alertEl = document.getElementById("subAlert");
  if (!alertEl) return;
  alertEl.className = `alert alert-${type} shadow-sm`;
  alertEl.style.display = "block";
  alertEl.textContent = message;
  alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setTimeout(() => { alertEl.style.display = "none"; }, 6000);
}

function formatDate(dateVal) {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

