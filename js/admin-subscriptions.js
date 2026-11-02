/**
 * Multi Therapy - Admin Subscription Management Client Controller
 * Controls plans CRUD, active subscriptions, revenue metrics, and coupon management.
 */

document.addEventListener("DOMContentLoaded", () => {
  loadAdminStats();
  loadAdminPlans();
  loadAdminSubscriptions();
  loadAdminPayments();
  loadAdminCoupons();
  setupEventListeners();
});

function setupEventListeners() {
  const btnRefresh = document.getElementById("btnRefreshStats");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      loadAdminStats();
      loadAdminPlans();
      loadAdminSubscriptions();
      loadAdminPayments();
      loadAdminCoupons();
    });
  }

  // Filter subscriptions
  const filterRole = document.getElementById("filterSubRole");
  const filterStatus = document.getElementById("filterSubStatus");
  if (filterRole) filterRole.addEventListener("change", loadAdminSubscriptions);
  if (filterStatus) filterStatus.addEventListener("change", loadAdminSubscriptions);

  // Create Plan Form
  const planForm = document.getElementById("createPlanForm");
  if (planForm) {
    planForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        user_type: document.getElementById("planUserType").value,
        name: document.getElementById("planNameInput").value.trim(),
        plan_code: document.getElementById("planCodeInput").value.trim(),
        monthly_price: parseFloat(document.getElementById("planMonthlyInput").value),
        yearly_price: parseFloat(document.getElementById("planYearlyInput").value),
        description: document.getElementById("planDescInput").value.trim(),
        is_popular: document.getElementById("planPopularInput").checked ? 1 : 0
      };

      const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
      const res = await fetch(`${apiBase}/api/admin/subscriptions/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res && res.success) {
        showAdminAlert(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById("createPlanModal")).hide();
        planForm.reset();
        loadAdminPlans();
      } else {
        alert(res ? res.message : "Failed to create plan.");
      }
    });
  }

  // Create Coupon Form
  const couponForm = document.getElementById("createCouponForm");
  if (couponForm) {
    couponForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        code: document.getElementById("couponCodeNew").value.trim().toUpperCase(),
        discount_type: document.getElementById("couponTypeNew").value,
        discount_value: parseFloat(document.getElementById("couponValNew").value),
        user_type: document.getElementById("couponUserTypeNew").value,
        usage_limit: parseInt(document.getElementById("couponLimitNew").value, 10)
      };

      const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
      const res = await fetch(`${apiBase}/api/admin/subscriptions/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res && res.success) {
        showAdminAlert(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById("createCouponModal")).hide();
        couponForm.reset();
        loadAdminCoupons();
      } else {
        alert(res ? res.message : "Failed to create coupon.");
      }
    });
  }
}

async function loadAdminStats() {
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  try {
    const res = await fetch(`${apiBase}/api/admin/subscriptions/stats`).then(r => r.json());
    if (res && res.success && res.stats) {
      const s = res.stats;
      document.getElementById("statTotalRev").textContent = `₹${parseFloat(s.total_revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      document.getElementById("statActiveSubs").textContent = s.total_active_subscriptions;
      document.getElementById("statActivePlans").textContent = s.active_plans;
    }
  } catch (e) {}
}

async function loadAdminPlans() {
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  try {
    const res = await fetch(`${apiBase}/api/admin/subscriptions/plans`).then(r => r.json());
    if (res && res.success && res.plans) {
      const tbody = document.getElementById("adminPlansBody");
      tbody.innerHTML = res.plans.map(p => {
        const isAct = p.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>';
        const isPop = p.is_popular ? '⭐ Yes' : 'No';
        return `
          <tr>
            <td><code>${p.plan_code}</code></td>
            <td><span class="badge bg-light text-dark text-uppercase">${p.user_type}</span></td>
            <td><b>${p.name}</b></td>
            <td>₹${parseFloat(p.monthly_price).toFixed(2)}</td>
            <td>₹${parseFloat(p.yearly_price).toFixed(2)}</td>
            <td>${isPop}</td>
            <td>${isAct}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deactivatePlan(${p.plan_id})" style="font-size: 11px;">Deactivate</button>
            </td>
          </tr>
        `;
      }).join("");
    }
  } catch (e) {}
}

async function deactivatePlan(planId) {
  if (!confirm("Are you sure you want to deactivate this plan? Existing subscriptions will remain valid.")) return;
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  await fetch(`${apiBase}/api/admin/subscriptions/plans?plan_id=${planId}`, { method: "DELETE" });
  showAdminAlert("Plan deactivated successfully.", "info");
  loadAdminPlans();
}

async function loadAdminSubscriptions() {
  const role = document.getElementById("filterSubRole") ? document.getElementById("filterSubRole").value : "";
  const status = document.getElementById("filterSubStatus") ? document.getElementById("filterSubStatus").value : "";

  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  try {
    const res = await fetch(`${apiBase}/api/admin/subscriptions/all?user_type=${role}&status=${status}`).then(r => r.json());
    if (res && res.success && res.subscriptions) {
      const tbody = document.getElementById("adminSubsBody");
      if (res.subscriptions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No subscriptions found matching filters.</td></tr>`;
        return;
      }
      tbody.innerHTML = res.subscriptions.map(s => {
        const expStr = s.end_date ? new Date(s.end_date).toLocaleDateString("en-IN") : "Ongoing";
        const badgeClass = s.status === 'active' ? 'bg-success' : (s.status === 'sponsored' ? 'bg-info' : 'bg-secondary');
        return `
          <tr>
            <td><code>${s.subscription_code}</code></td>
            <td><b>${s.hospital_name || s.doctor_name || s.username}</b><div class="small text-muted">${s.email || ''}</div></td>
            <td><span class="badge bg-light text-dark text-uppercase">${s.user_type}</span></td>
            <td>${s.plan_name}</td>
            <td>${s.billing_cycle}</td>
            <td>${expStr}</td>
            <td><span class="badge ${badgeClass}">${s.status}</span></td>
          </tr>
        `;
      }).join("");
    }
  } catch (e) {}
}

async function loadAdminPayments() {
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  try {
    const res = await fetch(`${apiBase}/api/admin/subscriptions/stats`).then(r => r.json());
    if (res && res.success && res.stats && res.stats.recent_payments) {
      const tbody = document.getElementById("adminPaymentsBody");
      tbody.innerHTML = res.stats.recent_payments.map(p => {
        const dt = p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "N/A";
        return `
          <tr>
            <td><code>${p.payment_code}</code></td>
            <td>User #${p.user_id} (${p.username || 'admin'})</td>
            <td>${p.plan_name || 'Membership'}</td>
            <td><b>₹${parseFloat(p.amount).toFixed(2)}</b></td>
            <td><small>${p.razorpay_payment_id || p.razorpay_order_id || 'N/A'}</small></td>
            <td><span class="badge bg-success">${p.status}</span></td>
            <td>${dt}</td>
          </tr>
        `;
      }).join("");
    }
  } catch (e) {}
}

async function loadAdminCoupons() {
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  try {
    const res = await fetch(`${apiBase}/api/admin/subscriptions/coupons`).then(r => r.json());
    if (res && res.success && res.coupons) {
      const tbody = document.getElementById("adminCouponsBody");
      tbody.innerHTML = res.coupons.map(c => {
        const discStr = c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`;
        const isAct = c.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>';
        return `
          <tr>
            <td><b class="text-primary">${c.code}</b></td>
            <td>${c.discount_type}</td>
            <td><b>${discStr}</b></td>
            <td><span class="badge bg-light text-dark">${c.user_type}</span></td>
            <td>${c.used_count} / ${c.usage_limit}</td>
            <td>${isAct}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deactivateCoupon(${c.coupon_id})" style="font-size:11px;">Disable</button>
            </td>
          </tr>
        `;
      }).join("");
    }
  } catch (e) {}
}

async function deactivateCoupon(cid) {
  if (!confirm("Deactivate this coupon code?")) return;
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  await fetch(`${apiBase}/api/admin/subscriptions/coupons?coupon_id=${cid}`, { method: "DELETE" });
  loadAdminCoupons();
}

function showAdminAlert(message, type = "success") {
  const el = document.getElementById("adminAlertMsg");
  if (!el) return;
  el.className = `alert alert-${type} mb-3`;
  el.textContent = message;
  el.classList.remove("d-none");
  setTimeout(() => { el.classList.add("d-none"); }, 5000);
}

