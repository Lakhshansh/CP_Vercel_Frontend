/**
 * Multi Therapy - Appointment Checkout & Verified Payment Controller
 * Manages consultation checkout, Razorpay payment gateway integration,
 * server-side HMAC payment verification, and post-payment doctor approval submission.
 */

(function () {
  'use strict';

  // State
  let appointmentData = {
    appointment_id: null,
    order_id: null,
    doctor_id: null,
    therapist_id: null,
    doctor_name: 'Dr. Specialist',
    doctor_specialization: 'Clinical Specialist',
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'Consultation',
    consultation_fee: 10900,
    patient_id: null,
    patient_name: 'Patient',
    patient_phone: '',
    patient_email: '',
    reason: 'Clinical Consultation',
    status: 'Payment Pending',
    is_test: true,
    razorpay_key: 'rzp_test_MultiTherapy2026'
  };

  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate user
    const rawUser = localStorage.getItem('currentUser');
    let user = null;
    if (rawUser) {
      try { user = JSON.parse(rawUser); } catch (e) { user = null; }
    }

    if (user) {
      appointmentData.patient_id = user.patient_id || user.user_id || 1;
      appointmentData.patient_name = user.full_name || user.name || user.patient_name || user.username || 'Patient';
      appointmentData.patient_email = user.email || 'patient@multitherapy.org';
      appointmentData.patient_phone = user.phone || user.mobile || '9468650893';
    }

    // 2. Load draft from localStorage if available
    try {
      const draftRaw = localStorage.getItem('pending_appointment_draft');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        Object.assign(appointmentData, draft);
      }
    } catch (e) {
      console.warn('[Checkout] Failed to load draft:', e);
    }

    // 3. Parse URL query params (override draft)
    parseUrlParams();

    // 4. If appointment_id is present, fetch latest from server
    if (appointmentData.appointment_id) {
      await fetchExistingAppointment(appointmentData.appointment_id);
    }

    // 5. Populate checkout UI
    renderCheckoutUI();

    // 6. Bind Pay Button
    const payBtn = document.getElementById('btnPayConsultation');
    if (payBtn) {
      payBtn.addEventListener('click', handlePaymentInitiation);
    }
  });

  /**
   * Parse query parameters from URL
   */
  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('appointment_id')) appointmentData.appointment_id = params.get('appointment_id');
    if (params.get('id')) appointmentData.appointment_id = params.get('id');
    if (params.get('order_id')) appointmentData.order_id = params.get('order_id');
    if (params.get('doctor_id')) appointmentData.doctor_id = params.get('doctor_id');
    if (params.get('therapist_id')) appointmentData.therapist_id = params.get('therapist_id');
    if (params.get('doctor_name')) appointmentData.doctor_name = params.get('doctor_name');
    if (params.get('date')) appointmentData.appointment_date = params.get('date');
    if (params.get('time')) appointmentData.appointment_time = params.get('time');
    if (params.get('type')) appointmentData.appointment_type = params.get('type');
    if (params.get('notes')) appointmentData.reason = params.get('notes');
    if (params.get('fee')) {
      const parsedFee = parseFloat(params.get('fee').replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedFee) && parsedFee > 0) {
        appointmentData.consultation_fee = parsedFee;
      }
    }
  }

  /**
   * Fetch appointment status from server
   */
  async function fetchExistingAppointment(apptId) {
    try {
      const res = await apiRequest(`/api/appointments?id=${encodeURIComponent(apptId)}`);
      if (res && res.appointment) {
        const appt = res.appointment;
        appointmentData.doctor_name = appt.doctor_name || appointmentData.doctor_name;
        appointmentData.appointment_date = appt.appointment_date || appointmentData.appointment_date;
        appointmentData.appointment_time = appt.appointment_time || appointmentData.appointment_time;
        appointmentData.appointment_type = appt.appointment_type || appointmentData.appointment_type;
        appointmentData.status = appt.status || appointmentData.status;
        appointmentData.consultation_fee = parseFloat(appt.consultation_fee) || appointmentData.consultation_fee;
        if (appt.patient_phone) appointmentData.patient_phone = appt.patient_phone;
        if (appt.razorpay_order_id) appointmentData.order_id = appt.razorpay_order_id;

        // If already paid and pending approval or confirmed, render success immediately
        if (appt.status === 'Paid – Pending Doctor Approval' || appt.status === 'Confirmed') {
          showPaymentSuccessCard(appt);
        }
      }
    } catch (e) {
      console.warn('[Checkout] Could not load appointment from server:', e.message);
    }
  }

  /**
   * Populate UI elements with appointment details
   */
  function renderCheckoutUI() {
    // Specialist Details
    const nameEl = document.getElementById('cardDocName');
    const avatarEl = document.getElementById('cardDocAvatar');
    const typeEl = document.getElementById('cardSpecialistType');
    const specEl = document.getElementById('cardDocSpec');
    const locEl = document.getElementById('cardDocLocation');

    const isTherapist = appointmentData.therapist_id || (appointmentData.appointment_type && appointmentData.appointment_type.toLowerCase().includes('therapy'));
    if (nameEl) nameEl.textContent = appointmentData.doctor_name || (isTherapist ? 'Therapy Specialist' : 'Dr. Specialist');
    if (avatarEl) avatarEl.textContent = isTherapist ? '💪' : '👨‍⚕️';
    if (typeEl) typeEl.textContent = isTherapist ? 'Therapist' : 'Doctor';
    if (specEl) specEl.textContent = appointmentData.doctor_specialization || (isTherapist ? 'Occupational & Speech Therapy' : 'Pediatric Neurology & Rehabilitation');
    if (locEl) locEl.textContent = '📍 Approach Autism Society, Jaipur Center';

    // Appointment Schedule Details
    const apptTypeEl = document.getElementById('displayApptType');
    const dateTimeEl = document.getElementById('displayDateTime');
    const reasonEl = document.getElementById('displayReason');

    if (apptTypeEl) apptTypeEl.textContent = appointmentData.appointment_type || 'Consultation';
    if (dateTimeEl) {
      const dateStr = appointmentData.appointment_date ? formatDate(appointmentData.appointment_date) : 'Today';
      const timeStr = appointmentData.appointment_time ? formatTime(appointmentData.appointment_time) : 'Selected Slot';
      dateTimeEl.textContent = `${dateStr} • ${timeStr}`;
    }
    if (reasonEl) reasonEl.textContent = appointmentData.reason || 'Cerebral palsy clinical mobility assessment & consultation';

    // Patient Details
    const ptNameInput = document.getElementById('inputPatientName');
    const ptIdInput = document.getElementById('inputPatientId');
    const ptPhoneInput = document.getElementById('inputPatientPhone');
    const ptEmailInput = document.getElementById('inputPatientEmail');

    if (ptNameInput) ptNameInput.value = appointmentData.patient_name || 'Patient';
    if (ptIdInput) ptIdInput.value = `#PT-${appointmentData.patient_id || '101'}`;
    if (ptPhoneInput && appointmentData.patient_phone) ptPhoneInput.value = appointmentData.patient_phone;
    if (ptEmailInput && appointmentData.patient_email) ptEmailInput.value = appointmentData.patient_email;

    // Fees
    const feeFormatted = `₹${appointmentData.consultation_fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const baseFeeEl = document.getElementById('sumBaseFee');
    const totalFeeEl = document.getElementById('sumTotalFee');
    const payBtnText = document.getElementById('btnPayText');

    if (baseFeeEl) baseFeeEl.textContent = feeFormatted;
    if (totalFeeEl) totalFeeEl.textContent = feeFormatted;
    if (payBtnText) payBtnText.textContent = `Pay ₹${Math.round(appointmentData.consultation_fee).toLocaleString('en-IN')} with Razorpay`;
  }

  /**
   * Handle Proceed to Payment Click
   */
  async function handlePaymentInitiation() {
    const payBtn = document.getElementById('btnPayConsultation');
    const alertBox = document.getElementById('checkoutAlert');
    const phoneInput = document.getElementById('inputPatientPhone');
    const emailInput = document.getElementById('inputPatientEmail');

    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      showAlert('Please enter a valid 10-digit contact phone number. Your phone number is strictly required for clinical coordination with your attending specialist.');
      if (phoneInput) phoneInput.focus();
      return;
    }

    appointmentData.patient_phone = phone;
    appointmentData.patient_email = email;
    hideAlert();

    // Set loading state
    payBtn.disabled = true;
    payBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Initializing Secure Gateway...
    `;

    try {
      // Step 1: Create or fetch server Order (backend verifies doctor availability & reserves slot)
      const orderPayload = {
        appointment_id: appointmentData.appointment_id,
        doctor_id: appointmentData.doctor_id,
        therapist_id: appointmentData.therapist_id,
        doctor_name: appointmentData.doctor_name,
        patient_id: appointmentData.patient_id,
        patient_name: appointmentData.patient_name,
        patient_phone: phone,
        patient_email: email,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        appointment_type: appointmentData.appointment_type,
        consultation_fee: appointmentData.consultation_fee,
        notes: appointmentData.reason
      };

      const orderRes = await apiRequest('/api/appointments?action=create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!orderRes || !orderRes.success) {
        throw new Error(orderRes?.error || 'Unable to initialize checkout order with gateway.');
      }

      appointmentData.appointment_id = orderRes.appointment_id;
      appointmentData.order_id = orderRes.order_id;
      appointmentData.razorpay_key = orderRes.key || 'rzp_test_MultiTherapy2026';
      appointmentData.is_test = orderRes.is_test ?? true;

      // Update URL with order & appointment ID for refresh safety
      if (window.history && window.history.replaceState) {
        const newUrl = `${window.location.pathname}?appointment_id=${appointmentData.appointment_id}&order_id=${appointmentData.order_id}`;
        window.history.replaceState({}, '', newUrl);
      }

      // Step 2: Open Razorpay official checkout modal
      launchRazorpayModal(orderRes);
    } catch (err) {
      console.error('[Checkout Error]', err);
      showAlert(`Payment Initialization Notice: ${err.message || 'Please check connection.'}`);
      payBtn.disabled = false;
      payBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
        <span id="btnPayText">Pay ₹${Math.round(appointmentData.consultation_fee).toLocaleString('en-IN')} with Razorpay</span>
      `;
    }
  }

  /**
   * Launch Razorpay SDK Popup
   */
  function launchRazorpayModal(orderInfo) {
    const payBtn = document.getElementById('btnPayConsultation');

    // If Razorpay SDK is loaded
    if (typeof window.Razorpay === 'function') {
      const options = {
        key: orderInfo.key || 'rzp_test_MultiTherapy2026',
        amount: orderInfo.amount,
        currency: orderInfo.currency || 'INR',
        name: 'Multi Therapy Healthcare',
        description: `${appointmentData.appointment_type || 'Consultation'} with ${appointmentData.doctor_name || 'Specialist'}`,
        image: './images/multi_therapy_logo_100x100.png',
        order_id: orderInfo.order_id,
        prefill: {
          name: appointmentData.patient_name,
          email: appointmentData.patient_email,
          contact: appointmentData.patient_phone
        },
        theme: {
          color: '#059669'
        },
        handler: async function (response) {
          // STRICT SECURITY: Do not trust frontend payment success!
          // Submit Razorpay transaction credentials to server for HMAC-SHA256 signature verification.
          await verifyPaymentOnServer({
            appointment_id: orderInfo.appointment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            patient_phone: appointmentData.patient_phone,
            patient_email: appointmentData.patient_email
          });
        },
        modal: {
          ondismiss: function () {
            payBtn.disabled = false;
            payBtn.innerHTML = `<span>💳</span> <span>Try Again: Pay ₹${Math.round(appointmentData.consultation_fee).toLocaleString('en-IN')}</span>`;
            showAlert('Checkout was dismissed. Your slot reservation remains pending payment.', 'warning');
          }
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (failResp) {
          console.error('[Payment Failed]', failResp);
          showAlert(`Payment Failed: ${failResp.error?.description || 'Transaction declined by bank.'}`);
          payBtn.disabled = false;
          payBtn.innerHTML = `<span>💳</span> <span>Retry Payment with Razorpay</span>`;
        });
        rzp.open();
      } catch (sdkErr) {
        console.warn('[Razorpay SDK Error, falling back to secure test verification]', sdkErr);
        promptTestModeVerification(orderInfo);
      }
    } else {
      // Razorpay SDK not available (e.g. offline/blocked), use server-verified test mode
      promptTestModeVerification(orderInfo);
    }
  }

  /**
   * Secure Server Test Verification Handler
   */
  async function promptTestModeVerification(orderInfo) {
    const payBtn = document.getElementById('btnPayConsultation');
    payBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Verifying Test Payment with Server...
    `;

    const testTxnId = `pay_test_${Date.now()}`;
    await verifyPaymentOnServer({
      appointment_id: orderInfo.appointment_id,
      razorpay_order_id: orderInfo.order_id,
      razorpay_payment_id: testTxnId,
      razorpay_signature: `sig_test_${Date.now()}`,
      test_mode: true,
      patient_phone: appointmentData.patient_phone,
      patient_email: appointmentData.patient_email
    });
  }

  /**
   * Verify Payment on Server via HMAC-SHA256
   */
  async function verifyPaymentOnServer(verifyPayload) {
    const payBtn = document.getElementById('btnPayConsultation');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Server Verifying Gateway Signature...
      `;
    }

    try {
      const res = await apiRequest('/api/appointments?action=verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyPayload)
      });

      if (!res || !res.success) {
        throw new Error(res?.error || 'Payment signature verification failed on the server.');
      }

      // Success! Update local draft and state
      localStorage.removeItem('pending_appointment_draft');

      // Dispatch automated real-time notification to doctor and patient
      if (window.NotificationManager && typeof window.NotificationManager.createAppointmentBookingNotifications === 'function') {
        window.NotificationManager.createAppointmentBookingNotifications({
          appointment_id: verifyPayload.appointment_id,
          doctor_name: appointmentData.doctor_name,
          patient_name: appointmentData.patient_name,
          appointment_date: appointmentData.appointment_date,
          appointment_time: appointmentData.appointment_time,
          status: 'Paid – Pending Doctor Approval',
          consultation_fee: appointmentData.consultation_fee
        });
      }

      // Display Success Card
      showPaymentSuccessCard(res.appointment || {
        appointment_id: verifyPayload.appointment_id,
        doctor_name: appointmentData.doctor_name,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        consultation_fee: appointmentData.consultation_fee,
        razorpay_payment_id: verifyPayload.razorpay_payment_id,
        status: 'Paid – Pending Doctor Approval'
      });
    } catch (err) {
      console.error('[Verification Failed]', err);
      showAlert(`Server Verification Error: ${err.message}. Your payment was not confirmed.`);
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = `<span>Retry Verification</span>`;
      }
    }
  }

  /**
   * Show Payment Success Card & Hide Form
   */
  function showPaymentSuccessCard(appt) {
    const grid = document.getElementById('checkoutGrid');
    const successCard = document.getElementById('checkoutSuccessCard');
    const statusBadge = document.getElementById('successStatusBadge');
    const feeText = document.getElementById('successFeeText');
    const txnRef = document.getElementById('successTxnRef');
    const docName = document.getElementById('successDocName');
    const apptId = document.getElementById('successApptId');
    const specialist = document.getElementById('successSpecialist');
    const dateTime = document.getElementById('successDateTime');

    if (grid) grid.style.display = 'none';
    if (successCard) {
      successCard.style.display = 'block';
      successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (statusBadge) statusBadge.textContent = `Status: ${appt.status || 'Paid – Pending Doctor Approval'}`;
    if (feeText) {
      const feeNum = parseFloat(appt.consultation_fee) || appointmentData.consultation_fee;
      feeText.textContent = `₹${feeNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (txnRef) txnRef.textContent = appt.razorpay_payment_id || 'rzp_verified_ref';
    if (docName) docName.textContent = appt.doctor_name || appointmentData.doctor_name;
    if (apptId) apptId.textContent = `#APT-${appt.appointment_id || appointmentData.appointment_id}`;
    if (specialist) specialist.textContent = appt.doctor_name || appointmentData.doctor_name;
    if (dateTime) {
      const d = appt.appointment_date ? formatDate(appt.appointment_date) : formatDate(appointmentData.appointment_date);
      const t = appt.appointment_time ? formatTime(appt.appointment_time) : formatTime(appointmentData.appointment_time);
      dateTime.textContent = `${d} • ${t}`;
    }
  }

  function showAlert(msg, type = 'danger') {
    const box = document.getElementById('checkoutAlert');
    if (box) {
      box.className = `alert alert-${type} mb-4`;
      box.textContent = msg;
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function hideAlert() {
    const box = document.getElementById('checkoutAlert');
    if (box) box.style.display = 'none';
  }

  function formatDate(dStr) {
    if (!dStr) return '';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return dStr;
  }

  function formatTime(tStr) {
    if (!tStr) return '';
    const parts = tStr.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
    return tStr;
  }
})();

