/**
 * Multi Therapy - Doctor Subscriptions Client Controller
 * Manages doctor plan selection, monthly/yearly toggle, Razorpay checkout,
 * active subscription dashboard, usage quotas, hospital-sponsored benefits, and payment history.
 */

let currentBillingCycle = "monthly"; // "monthly" | "yearly"
let activeCoupon = null;

const DOCTOR_PRICES = {
  doc_free: { monthly: 0, yearly: 0 },
  doc_pro: { monthly: 299, yearly: 2990 },
  doc_premium: { monthly: 499, yearly: 4990 }
};

document.addEventListener("DOMContentLoaded", () => {
  initBillingToggle();
  initCouponHandler();
  initSubscribeButtons();
  loadCurrentSubscription();
  loadPaymentHistory();
});

function initBillingToggle() {
  const switchBtn = document.getElementById("billingSwitch");
  const labelMonthly = document.getElementById("labelMonthly");
  const labelYearly = document.getElementById("labelYearly");

  if (!switchBtn) return;

  const updatePrices = () => {
    const isYearly = currentBillingCycle === "yearly";
    switchBtn.classList.toggle("yearly", isYearly);
    labelMonthly.classList.toggle("active", !isYearly);
    labelYearly.classList.toggle("active", isYearly);

    for (const [code, p] of Object.entries(DOCTOR_PRICES)) {
      const priceEl = document.getElementById(`price_${code}`);
      const cycleEl = document.getElementById(`cycle_${code}`);
      const subtextEl = document.getElementById(`subtext_${code}`);

      if (priceEl) {
        priceEl.textContent = isYearly ? p.yearly.toLocaleString("en-IN") : p.monthly.toLocaleString("en-IN");
      }
      if (cycleEl) {
        cycleEl.textContent = isYearly ? " / year" : " / month";
      }
      if (subtextEl) {
        if (code === "doc_free") {
          subtextEl.textContent = "free forever";
        } else {
          subtextEl.textContent = isYearly ? "billed annually (Save 17%)" : "billed monthly";
        }
      }
    }
  };

  switchBtn.addEventListener("click", () => {
    currentBillingCycle = currentBillingCycle === "monthly" ? "yearly" : "monthly";
    updatePrices();
  });

  labelMonthly.addEventListener("click", () => {
    currentBillingCycle = "monthly";
    updatePrices();
  });

  labelYearly.addEventListener("click", () => {
    currentBillingCycle = "yearly";
    updatePrices();
  });
}

function initCouponHandler() {
  const applyBtn = document.getElementById("btnApplyCoupon");
  const inputEl = document.getElementById("couponCodeInput");

  if (!applyBtn || !inputEl) return;

  applyBtn.addEventListener("click", async () => {
    const code = inputEl.value.trim().toUpperCase();
    if (!code) {
      alert("Please enter a promotional coupon code.");
      return;
    }

    try {
      applyBtn.disabled = true;
      applyBtn.textContent = "Checking...";

      const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
      const sampleAmount = currentBillingCycle === "yearly" ? 2990 : 299;

      const res = await fetch(`${apiBase}/api/subscriptions/apply-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupon_code: code,
          amount: sampleAmount,
          user_type: "doctor"
        })
      }).then(r => r.json());

      if (res && res.success) {
        activeCoupon = res;
        alert(`✓ Coupon applied! Discount: ₹${res.discount_amount} (${res.discount_type === 'percentage' ? res.discount_value + '%' : 'Flat'}). This will be applied at checkout.`);
      } else {
        activeCoupon = null;
        alert(res.message || "Invalid or expired coupon.");
      }
    } catch (e) {
      alert("Could not validate coupon at this time.");
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = "Apply";
    }
  });
}

function initSubscribeButtons() {
  const buttons = document.querySelectorAll(".btn-subscribe");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const planCode = btn.getAttribute("data-plan");
      startDoctorCheckout(planCode);
    });
  });
}

async function startDoctorCheckout(planCode) {
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) {}
  }

  const userId = user ? (user.user_id || 1) : 1;
  const username = user ? (user.username || "admin") : "admin";
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";

  try {
    const checkoutRes = await fetch(`${apiBase}/api/subscriptions/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        username: username,
        plan_code: planCode,
        billing_cycle: currentBillingCycle,
        coupon_code: activeCoupon ? activeCoupon.coupon_code : null
      })
    }).then(r => r.json());

    if (!checkoutRes || !checkoutRes.success) {
      alert(checkoutRes ? checkoutRes.message : "Failed to initiate subscription checkout.");
      return;
    }

    if (checkoutRes.is_free_plan) {
      showSubAlert(checkoutRes.message, "success");
      loadCurrentSubscription();
      return;
    }

    // Launch Razorpay Modal
    const options = {
      key: checkoutRes.key_id,
      amount: checkoutRes.amount,
      currency: checkoutRes.currency || "INR",
      name: "MULTI THERAPY",
      description: `${checkoutRes.plan_name} (${currentBillingCycle}) Membership`,
      image: "./images/multi-therapy-logo.png",
      order_id: checkoutRes.order_id,
      handler: async function (response) {
        await verifyDoctorPayment({
          razorpay_order_id: response.razorpay_order_id || checkoutRes.order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          payment_code: checkoutRes.payment_code
        });
      },
      prefill: {
        name: checkoutRes.user_name || "Dr. Medical Practitioner",
        email: checkoutRes.user_email || "doctor@multitherapy.org",
        contact: checkoutRes.user_phone || "9468650893"
      },
      theme: {
        color: "#059669"
      }
    };

    if (typeof Razorpay !== "undefined") {
      const rzp = new Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        alert(`Payment failed: ${resp.error.description || "Transaction cancelled"}`);
      });
      rzp.open();
    } else {
      const confirmSim = confirm(`[Razorpay Test Mode] Confirm simulated payment of ₹${checkoutRes.amount_rupees}?`);
      if (confirmSim) {
        await verifyDoctorPayment({
          razorpay_order_id: checkoutRes.order_id,
          razorpay_payment_id: `pay_doc_${Date.now()}`,
          razorpay_signature: "test_sig_MultiTherapyDoc2026",
          payment_code: checkoutRes.payment_code
        });
      }
    }

  } catch (err) {
    alert(`Checkout error: ${err.message || err}`);
  }
}

async function verifyDoctorPayment(payload) {
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  try {
    const res = await fetch(`${apiBase}/api/subscriptions/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res && res.success) {
      showSubAlert(`✓ ${res.message} Invoice generated: ${res.invoice_number}`, "success");
      loadCurrentSubscription();
      loadPaymentHistory();
    } else {
      showSubAlert(res.message || "Payment verification failed.", "danger");
    }
  } catch (err) {
    showSubAlert("Failed to verify payment with server.", "danger");
  }
}

async function loadCurrentSubscription() {
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) {}
  }
  const userId = user ? (user.user_id || 1) : 1;
  const username = user ? (user.username || "admin") : "admin";

  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
  try {
    const res = await fetch(`${apiBase}/api/subscriptions/my-subscription?user_id=${userId}&username=${username}`).then(r => r.json());
    if (res && res.success) {
      renderDoctorDashboard(res);
    }
  } catch (e) {}
}

function renderDoctorDashboard(data) {
  const section = document.getElementById("doctorDashSection");
  if (!section) return;

  const sub = data.subscription;
  const access = data.access;
  const usage = data.usage || {};

  if (!sub && (!access || access.status === "free")) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  const planName = sub ? sub.plan_name : access.plan_name;
  const status = sub ? sub.status : access.status;
  const expiry = sub && sub.end_date ? new Date(sub.end_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : (access.is_sponsored ? "Covered by Hospital" : "Active / Ongoing");
  const cycle = sub ? `${sub.billing_cycle.toUpperCase()} Cycle` : "Standard Access";

  const curPlanName = document.getElementById("curPlanName");
  const curPlanStatus = document.getElementById("curPlanStatus");
  const curPlanExpiry = document.getElementById("curPlanExpiry");
  const curBillingCycle = document.getElementById("curBillingCycle");
  const curPatientUsage = document.getElementById("curPatientUsage");
  const sponsoredBadge = document.getElementById("sponsoredBadge");

  if (curPlanName) curPlanName.textContent = planName;
  if (curPlanStatus) curPlanStatus.textContent = `${status.toUpperCase()} Status`;
  if (curPlanExpiry) curPlanExpiry.textContent = expiry;
  if (curBillingCycle) curBillingCycle.textContent = cycle;

  if (curPatientUsage) curPatientUsage.textContent = `${usage.patient_usage || 14} Patients`;

  if (sponsoredBadge) {
    if (access.is_sponsored) {
      sponsoredBadge.textContent = `✓ Hospital-Sponsored by ${access.sponsored_by || 'Partner Center'}`;
      sponsoredBadge.className = "badge bg-info py-2 px-3 fs-6";
    } else {
      sponsoredBadge.textContent = "✓ Verified Clinical Specialist";
      sponsoredBadge.className = "badge bg-success py-2 px-3 fs-6";
    }
  }

  // Highlight active plan card
  if (sub && sub.plan_id) {
    document.querySelectorAll(".pricing-card").forEach(card => {
      const btn = card.querySelector(".btn-subscribe");
      if (btn) {
        btn.textContent = "Current Active Plan";
        btn.disabled = true;
        btn.classList.remove("btn-subscribe-teal", "btn-subscribe-outline");
        btn.classList.add("btn-secondary");
      }
    });
  }

  // Cancel Auto-Renew
  const btnCancel = document.getElementById("btnCancelAutoRenew");
  if (btnCancel && sub) {
    if (sub.auto_renew) {
      btnCancel.textContent = "Cancel Auto-Renew";
      btnCancel.onclick = async () => {
        const c = confirm("Are you sure you want to cancel auto-renewal?");
        if (c) {
          const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
          await fetch(`${apiBase}/api/subscriptions/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: data.user.user_id })
          });
          alert("Auto-renewal cancelled.");
          loadCurrentSubscription();
        }
      };
    } else {
      btnCancel.textContent = "Re-activate Auto-Renew";
      btnCancel.onclick = async () => {
        const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
        await fetch(`${apiBase}/api/subscriptions/renew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: data.user.user_id })
        });
        alert("Auto-renewal enabled.");
        loadCurrentSubscription();
      };
    }
  }
}

async function loadPaymentHistory() {
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) {}
  }
  const userId = user ? (user.user_id || 1) : 1;
  const apiBase = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";

  try {
    const res = await fetch(`${apiBase}/api/subscriptions/payment-history?user_id=${userId}`).then(r => r.json());
    if (res && res.success && res.payments && res.payments.length > 0) {
      const tbody = document.getElementById("paymentsBody");
      if (!tbody) return;

      tbody.innerHTML = res.payments.map(p => {
        const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A";
        const inv = p.invoice_number || `INV-${p.payment_id}`;
        return `
          <tr>
            <td><b>${inv}</b></td>
            <td>${dateStr}</td>
            <td>${p.plan_name || 'Doctor Plan'}</td>
            <td><span class="badge bg-light text-dark">${p.billing_cycle || 'monthly'}</span></td>
            <td><b>₹${parseFloat(p.amount).toFixed(2)}</b></td>
            <td><span class="badge bg-success">Paid</span></td>
            <td>
              <a href="/subscription-invoice.html?inv=${inv}" class="btn btn-sm btn-outline-success py-0 px-2" style="font-size:12px; font-weight:700;">View</a>
              <a href="${apiBase}/subscriptions/invoice/${inv}/download" class="btn btn-sm btn-success py-0 px-2" style="font-size:12px; font-weight:700; background:#059669;">PDF</a>
            </td>
          </tr>
        `;
      }).join("");
    }
  } catch (e) {}
}

function showSubAlert(message, type = "success") {
  const el = document.getElementById("subAlertMessage");
  if (!el) return;
  el.className = `alert alert-${type} mb-4`;
  el.textContent = message;
  el.classList.remove("d-none");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

