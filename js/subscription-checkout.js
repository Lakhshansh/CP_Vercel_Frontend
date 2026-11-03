/**
 * Multi Therapy - Subscription Checkout & Razorpay Payment Controller
 * Handles plan breakdown, 18% GST calculation, coupon discounts, order generation,
 * Razorpay modal popup, signature verification, and success redirection.
 */

let selectedPlan = null;
let currentCycle = "monthly"; // 'monthly' or 'yearly'
let appliedCoupon = null; // { code, discount_amount, discount_type }
let currentUser = null;

const DEFAULT_PLANS_MAP = {
  1: { plan_id: 1, name: "Hospital Basic", code: "hospital_basic", user_type: "hospital", monthly_price: 499, yearly_price: 4990, desc: "For therapy studios and emerging outpatient clinics." },
  2: { plan_id: 2, name: "Hospital Professional", code: "hospital_pro", user_type: "hospital", monthly_price: 999, yearly_price: 9990, desc: "For established rehabilitation hospitals and clinical departments." },
  3: { plan_id: 3, name: "Hospital Enterprise", code: "hospital_enterprise", user_type: "hospital", monthly_price: 2499, yearly_price: 24990, desc: "Unlimited clinic capacity with 100% staff and patient sponsorship." },
  4: { plan_id: 4, name: "Doctor Free", code: "doctor_free", user_type: "doctor", monthly_price: 0, yearly_price: 0, desc: "Basic profile in doctor specialist directory." },
  5: { plan_id: 5, name: "Doctor Pro", code: "doctor_pro", user_type: "doctor", monthly_price: 299, yearly_price: 2990, desc: "HD tele-therapy video, digital prescriptions, and 30 active patients." },
  6: { plan_id: 6, name: "Doctor Premium", code: "doctor_premium", user_type: "doctor", monthly_price: 499, yearly_price: 4990, desc: "Unlimited patients, top specialist badge, and team collaboration." },
  7: { plan_id: 7, name: "Patient Free", code: "patient_free", user_type: "patient", monthly_price: 0, yearly_price: 0, desc: "Essential medical records view and in-clinic appointment booking." },
  8: { plan_id: 8, name: "Patient Premium", code: "patient_premium", user_type: "patient", monthly_price: 99, yearly_price: 990, desc: "50+ HD exercise video regimens, mobility milestones, and 3 family accounts." }
};

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authenticate user
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) currentUser = JSON.parse(raw);
  } catch (e) {}

  populateCustomerDetails();

  // 2. Parse URL parameters: ?plan_id=5&cycle=yearly
  const params = new URLSearchParams(window.location.search);
  const planId = parseInt(params.get("plan_id") || "5", 10);
  currentCycle = (params.get("cycle") || "monthly").toLowerCase();

  // Set initial radio
  if (currentCycle === "yearly") {
    const rY = document.getElementById("cycleYearly");
    if (rY) rY.checked = true;
  } else {
    const rM = document.getElementById("cycleMonthly");
    if (rM) rM.checked = true;
  }

  // 3. Load plan details from MySQL API
  await loadSelectedPlan(planId);

  // 4. Setup Event Listeners
  setupCheckoutListeners();

  // 5. Initial calculation
  recalculateOrderSummary();
});

function populateCustomerDetails() {
  if (!currentUser) {
    currentUser = {
      user_id: 1,
      username: "admin",
      name: "Dr. admin",
      email: "doctor@multitherapy.org",
      phone: "+919468650893",
      role: "doctor",
      address: "Jaipur, Rajasthan"
    };
  }

  const nameInput = document.getElementById("custName");
  const userInput = document.getElementById("custUsername");
  const emailInput = document.getElementById("custEmail");
  const phoneInput = document.getElementById("custPhone");
  const addrInput = document.getElementById("custAddress");

  if (nameInput) nameInput.value = currentUser.doctor_name || currentUser.name || "Dr. admin";
  if (userInput) userInput.value = currentUser.username || "admin";
  if (emailInput) emailInput.value = currentUser.email || "joshilakhshansh@gmail.com";
  if (phoneInput) phoneInput.value = currentUser.phone || "+919468650893";
  if (addrInput) addrInput.value = currentUser.hospital_address || currentUser.address || "Jaipur, Rajasthan";
}

async function loadSelectedPlan(planId) {
  try {
    const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
    const resp = await fetch(`${apiBase}/api/subscriptions/plans`).then(r => r.json()).catch(() => null);

    if (resp && resp.success && Array.isArray(resp.plans)) {
      selectedPlan = resp.plans.find(p => p.plan_id === planId) || resp.plans[0];
    } else {
      selectedPlan = DEFAULT_PLANS_MAP[planId] || DEFAULT_PLANS_MAP[5];
    }
  } catch (e) {
    selectedPlan = DEFAULT_PLANS_MAP[planId] || DEFAULT_PLANS_MAP[5];
  }

  updatePlanUI();
}

function updatePlanUI() {
  if (!selectedPlan) return;

  const planNameEl = document.getElementById("checkoutPlanName");
  const planDescEl = document.getElementById("checkoutPlanDesc");
  const userTypeBadge = document.getElementById("badgeUserType");
  const displayPriceEl = document.getElementById("displayPlanPrice");
  const displayCycleEl = document.getElementById("displayPlanCycle");

  const price = currentCycle === "yearly" ? selectedPlan.yearly_price : selectedPlan.monthly_price;

  if (planNameEl) planNameEl.textContent = selectedPlan.name;
  if (planDescEl) planDescEl.textContent = selectedPlan.desc || `${selectedPlan.user_type} membership tier for Multi Therapy clinical portal.`;
  if (userTypeBadge) {
    userTypeBadge.textContent = selectedPlan.user_type.toUpperCase();
    if (selectedPlan.user_type === "hospital") userTypeBadge.className = "badge bg-primary rounded-pill px-3 py-1";
    else if (selectedPlan.user_type === "doctor") userTypeBadge.className = "badge bg-success rounded-pill px-3 py-1";
    else userTypeBadge.className = "badge bg-info text-dark rounded-pill px-3 py-1";
  }

  if (displayPriceEl) displayPriceEl.textContent = `₹${Number(price).toLocaleString('en-IN')}`;
  if (displayCycleEl) displayCycleEl.textContent = Number(price) === 0 ? "forever" : (currentCycle === "yearly" ? "per year" : "per month");

  // Free Plan button toggle
  const btnPayNow = document.getElementById("btnPayNow");
  const btnFree = document.getElementById("btnActivateFree");
  if (Number(price) === 0) {
    if (btnPayNow) btnPayNow.classList.add("d-none");
    if (btnFree) btnFree.classList.remove("d-none");
  } else {
    if (btnPayNow) btnPayNow.classList.remove("d-none");
    if (btnFree) btnFree.classList.add("d-none");
  }
}

function setupCheckoutListeners() {
  // Billing cycle radio change
  const radios = document.querySelectorAll('input[name="cycleRadio"]');
  radios.forEach(r => {
    r.addEventListener("change", (e) => {
      currentCycle = e.target.value;
      updatePlanUI();
      recalculateOrderSummary();
    });
  });

  // Coupon apply button
  const btnCoupon = document.getElementById("btnApplyCoupon");
  if (btnCoupon) {
    btnCoupon.addEventListener("click", applyCouponCode);
  }

  // Quick coupon suggestions click
  const sugW = document.getElementById("suggestWelcome");
  const sugH = document.getElementById("suggestHealth");
  if (sugW) {
    sugW.addEventListener("click", () => {
      document.getElementById("couponCodeInput").value = "WELCOME50";
      applyCouponCode();
    });
  }
  if (sugH) {
    sugH.addEventListener("click", () => {
      document.getElementById("couponCodeInput").value = "HEALTH2026";
      applyCouponCode();
    });
  }

  // Pay Now Razorpay button
  const btnPayNow = document.getElementById("btnPayNow");
  if (btnPayNow) {
    btnPayNow.addEventListener("click", initiateRazorpayCheckout);
  }

  // Free activation button
  const btnFree = document.getElementById("btnActivateFree");
  if (btnFree) {
    btnFree.addEventListener("click", activateFreePlan);
  }
}

function recalculateOrderSummary() {
  if (!selectedPlan) return;

  const basePrice = Number(currentCycle === "yearly" ? selectedPlan.yearly_price : selectedPlan.monthly_price);
  let discount = 0;

  if (appliedCoupon && basePrice > 0) {
    if (appliedCoupon.discount_type === "percentage") {
      discount = (basePrice * appliedCoupon.discount_value) / 100;
      if (appliedCoupon.max_discount && discount > appliedCoupon.max_discount) {
        discount = appliedCoupon.max_discount;
      }
    } else {
      discount = appliedCoupon.discount_value;
    }
    discount = Math.min(discount, basePrice);
  }

  const subtotal = Math.max(0, basePrice - discount);
  const tax = subtotal > 0 ? (subtotal * 0.18) : 0; // 18% GST
  const total = subtotal + tax;

  // DOM Updates
  const elBase = document.getElementById("sumBasePrice");
  const elCouponRow = document.getElementById("couponRow");
  const elDiscount = document.getElementById("sumDiscount");
  const elCouponTag = document.getElementById("couponTag");
  const elSubtotal = document.getElementById("sumSubtotal");
  const elTax = document.getElementById("sumTax");
  const elTotal = document.getElementById("sumTotal");
  const elBtnText = document.getElementById("btnPayText");

  if (elBase) elBase.textContent = `₹${basePrice.toFixed(2)}`;

  if (discount > 0 && elCouponRow) {
    elCouponRow.style.display = "flex";
    if (elDiscount) elDiscount.textContent = `-₹${discount.toFixed(2)}`;
    if (elCouponTag) elCouponTag.textContent = appliedCoupon.code;
  } else if (elCouponRow) {
    elCouponRow.style.display = "none";
  }

  if (elSubtotal) elSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
  if (elTax) elTax.textContent = `₹${tax.toFixed(2)}`;
  if (elTotal) elTotal.textContent = `₹${total.toFixed(2)}`;

  if (elBtnText) {
    elBtnText.textContent = `Pay ₹${total.toFixed(2)} with Razorpay`;
  }
}

async function applyCouponCode() {
  const input = document.getElementById("couponCodeInput");
  const feedback = document.getElementById("couponFeedback");
  if (!input || !feedback) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    feedback.style.display = "block";
    feedback.className = "small text-danger mt-2";
    feedback.textContent = "Please enter a coupon code.";
    return;
  }

  const basePrice = Number(currentCycle === "yearly" ? selectedPlan.yearly_price : selectedPlan.monthly_price);
  if (basePrice === 0) {
    feedback.style.display = "block";
    feedback.className = "small text-warning mt-2";
    feedback.textContent = "Coupons cannot be applied to free plans.";
    return;
  }

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

  try {
    const res = await fetch(`${apiBase}/api/subscriptions/apply-coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code,
        user_type: selectedPlan.user_type,
        order_amount: basePrice
      })
    }).then(r => r.json()).catch(() => null);

    if (res && res.success) {
      appliedCoupon = {
        code: code,
        discount_amount: res.discount_amount,
        discount_type: res.discount_type,
        discount_value: res.discount_value,
        max_discount: res.max_discount
      };
      feedback.style.display = "block";
      feedback.className = "small text-success fw-bold mt-2";
      feedback.textContent = `✓ Coupon '${code}' applied! You saved ₹${Number(res.discount_amount).toFixed(2)}`;
      recalculateOrderSummary();
    } else {
      // Local fallback for test coupons if backend is offline
      if (code === "WELCOME50") {
        appliedCoupon = { code: "WELCOME50", discount_type: "percentage", discount_value: 50 };
        feedback.style.display = "block";
        feedback.className = "small text-success fw-bold mt-2";
        feedback.textContent = "✓ Coupon 'WELCOME50' applied! 50% discount activated.";
        recalculateOrderSummary();
      } else if (code === "HEALTH2026") {
        appliedCoupon = { code: "HEALTH2026", discount_type: "percentage", discount_value: 20 };
        feedback.style.display = "block";
        feedback.className = "small text-success fw-bold mt-2";
        feedback.textContent = "✓ Coupon 'HEALTH2026' applied! 20% discount activated.";
        recalculateOrderSummary();
      } else {
        feedback.style.display = "block";
        feedback.className = "small text-danger mt-2";
        feedback.textContent = res ? res.message : "Invalid or expired coupon code.";
      }
    }
  } catch (e) {
    feedback.style.display = "block";
    feedback.className = "small text-danger mt-2";
    feedback.textContent = "Could not validate coupon. Please try again.";
  }
}

/**
 * Initiates Razorpay Order and opens Checkout Modal
 */
async function initiateRazorpayCheckout() {
  const btn = document.getElementById("btnPayNow");
  const alertEl = document.getElementById("checkoutAlert");
  if (alertEl) alertEl.style.display = "none";

  const originalText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Creating Razorpay Order...`;
  }

  const custName = document.getElementById("custName").value.trim() || currentUser.name;
  const custEmail = document.getElementById("custEmail").value.trim() || currentUser.email;
  const custPhone = document.getElementById("custPhone").value.trim() || currentUser.phone;

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

  try {
    const payload = {
      user_id: currentUser.user_id,
      user_type: selectedPlan.user_type,
      plan_id: selectedPlan.plan_id,
      billing_cycle: currentCycle,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      customer_name: custName,
      customer_email: custEmail,
      customer_phone: custPhone
    };

    const res = await fetch(`${apiBase}/api/subscriptions/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json()).catch(() => null);

    if (!res || !res.success) {
      const errMsg = res ? res.message : "Failed to generate Razorpay checkout order.";
      if (alertEl) {
        alertEl.style.display = "block";
        alertEl.textContent = errMsg;
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
      return;
    }

    // Razorpay Checkout Options
    const options = {
      key: res.key_id || "rzp_test_MultiTherapy2026",
      amount: res.amount, // amount in paise
      currency: res.currency || "INR",
      name: "MULTI THERAPY",
      description: `${selectedPlan.name} (${currentCycle.toUpperCase()}) Membership`,
      image: "./images/multi_therapy_logo_100x100.png",
      order_id: res.order_id,
      prefill: {
        name: custName,
        email: custEmail,
        contact: custPhone
      },
      notes: {
        user_id: currentUser.user_id,
        plan_code: selectedPlan.code,
        billing_cycle: currentCycle
      },
      theme: {
        color: "#0866F5"
      },
      handler: async function (response) {
        await verifyRazorpayPayment({
          order_id: res.order_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          user_id: currentUser.user_id,
          plan_id: selectedPlan.plan_id,
          billing_cycle: currentCycle,
          customer_name: custName,
          customer_email: custEmail
        });
      },
      modal: {
        ondismiss: function () {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        }
      }
    };

    if (typeof Razorpay !== "undefined") {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (failRes) {
        if (alertEl) {
          alertEl.style.display = "block";
          alertEl.textContent = `Payment failed: ${failRes.error.description || 'Transaction declined'}`;
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
      rzp.open();
    } else {
      // Direct simulation mode in testing environments
      console.warn("Razorpay SDK not loaded, using developer simulation verification.");
      await verifyRazorpayPayment({
        order_id: res.order_id,
        razorpay_order_id: res.order_id,
        razorpay_payment_id: "pay_sim_" + Date.now(),
        razorpay_signature: "sim_sig_verified",
        user_id: currentUser.user_id,
        plan_id: selectedPlan.plan_id,
        billing_cycle: currentCycle,
        customer_name: custName,
        customer_email: custEmail
      });
    }

  } catch (err) {
    if (alertEl) {
      alertEl.style.display = "block";
      alertEl.textContent = `Error initiating checkout: ${err.message || err}`;
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

async function verifyRazorpayPayment(verifyData) {
  const alertEl = document.getElementById("checkoutAlert");
  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

  try {
    const resp = await fetch(`${apiBase}/api/subscriptions/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verifyData)
    }).then(r => r.json()).catch(() => null);

    if (resp && resp.success) {
      // Redirect to Subscription Success Page
      const succUrl = `./subscription-success.html?order_id=${encodeURIComponent(verifyData.order_id || '')}&payment_id=${encodeURIComponent(verifyData.razorpay_payment_id || '')}&plan=${encodeURIComponent(selectedPlan.name)}&invoice=${encodeURIComponent(resp.invoice_number || '')}`;
      window.location.href = succUrl;
    } else {
      const msg = resp ? resp.message : "Payment verification failed.";
      if (alertEl) {
        alertEl.style.display = "block";
        alertEl.textContent = msg;
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.style.display = "block";
      alertEl.textContent = "Payment verification error. Please contact Multi Therapy support.";
    }
  }
}

async function activateFreePlan() {
  const btn = document.getElementById("btnActivateFree");
  if (btn) btn.disabled = true;

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
  try {
    await fetch(`${apiBase}/api/subscriptions/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.user_id,
        user_type: selectedPlan.user_type,
        plan_id: selectedPlan.plan_id,
        billing_cycle: "monthly"
      })
    });
  } catch (e) {}

  window.location.href = `./my-subscription.html?activated=${selectedPlan.code}`;
}

