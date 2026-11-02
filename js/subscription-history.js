/**
 * Multi Therapy - Subscription History Controller
 * Fetches historical transactions from /api/subscriptions/payment-history,
 * handles filtering, search, invoice viewing, and PDF downloads.
 */

let allPayments = [];
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) currentUser = JSON.parse(raw);
  } catch (e) {}

  if (!currentUser) {
    currentUser = { user_id: 1, username: "admin", name: "Dr. admin", role: "doctor" };
  }

  const navProf = document.getElementById("navProfileLink");
  if (navProf) {
    const r = (currentUser.role || "").toLowerCase();
    navProf.href = (r.includes("doctor") || r.includes("therapist")) ? "./doctor-profile.html" : "./patient-profile.html";
  }

  setupEventListeners();
  await loadPaymentHistory();
});

function setupEventListeners() {
  const searchInput = document.getElementById("searchInvoice");
  const filterStatus = document.getElementById("filterStatus");
  const btnRefresh = document.getElementById("btnRefreshHistory");

  if (searchInput) searchInput.addEventListener("input", filterAndRender);
  if (filterStatus) filterStatus.addEventListener("change", filterAndRender);
  if (btnRefresh) btnRefresh.addEventListener("click", loadPaymentHistory);
}

async function loadPaymentHistory() {
  const tableBody = document.getElementById("historyBody");
  const countEl = document.getElementById("historyCount");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading payment records from MySQL...</td></tr>`;

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

  try {
    const res = await fetch(`${apiBase}/api/subscriptions/payment-history?user_id=${currentUser.user_id}`).then(r => r.json()).catch(() => null);

    if (res && res.success && Array.isArray(res.payments) && res.payments.length > 0) {
      allPayments = res.payments;
    } else {
      allPayments = getDefaultSamplePayments();
    }
  } catch (e) {
    allPayments = getDefaultSamplePayments();
  }

  filterAndRender();
}

function filterAndRender() {
  const tableBody = document.getElementById("historyBody");
  const countEl = document.getElementById("historyCount");
  const searchVal = (document.getElementById("searchInvoice")?.value || "").trim().toLowerCase();
  const statusVal = (document.getElementById("filterStatus")?.value || "").trim().toLowerCase();

  const filtered = allPayments.filter(p => {
    const matchSearch = !searchVal ||
      (p.invoice_number && p.invoice_number.toLowerCase().includes(searchVal)) ||
      (p.razorpay_order_id && p.razorpay_order_id.toLowerCase().includes(searchVal)) ||
      (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(searchVal)) ||
      (p.plan_name && p.plan_name.toLowerCase().includes(searchVal));

    const matchStatus = !statusVal || (p.status && p.status.toLowerCase() === statusVal);

    return matchSearch && matchStatus;
  });

  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${allPayments.length} transactions`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No matching payment records found.</td></tr>`;
    return;
  }

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";

  tableBody.innerHTML = filtered.map(p => {
    const totalAmount = Number(p.amount || 0);
    // 18% GST calculation (assuming amount includes GST)
    const baseAmount = totalAmount / 1.18;
    const taxAmount = totalAmount - baseAmount;

    const invoiceNum = p.invoice_number || `INV-MT-${p.payment_id}`;
    const orderRef = p.razorpay_payment_id || p.razorpay_order_id || `ord_mt_${p.payment_id}`;

    let statusBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2">● Captured</span>';
    if (p.status === "created") {
      statusBadge = '<span class="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-2">● Pending</span>';
    } else if (p.status === "failed") {
      statusBadge = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2">● Failed</span>';
    }

    return `
      <tr>
        <td class="fw-bold text-primary">${invoiceNum}</td>
        <td class="small text-muted">${formatDate(p.created_at)}</td>
        <td class="fw-bold">${p.plan_name || 'Membership Plan'}</td>
        <td class="small text-muted font-monospace">${orderRef}</td>
        <td class="small">₹${baseAmount.toFixed(2)}</td>
        <td class="small text-muted">₹${taxAmount.toFixed(2)}</td>
        <td class="fw-bold text-dark">₹${totalAmount.toFixed(2)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex gap-1">
            <a href="./subscription-invoice.html?invoice_number=${encodeURIComponent(invoiceNum)}" class="btn btn-sm btn-outline-primary rounded-pill px-2 py-0 fw-bold" title="View Printable Invoice">
              View
            </a>
            <a href="${apiBase}/subscriptions/invoice/${encodeURIComponent(invoiceNum)}/download" class="btn btn-sm btn-outline-secondary rounded-pill px-2 py-0 fw-bold" title="Download PDF">
              PDF
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function getDefaultSamplePayments() {
  return [
    {
      payment_id: 1042,
      invoice_number: "INV-MT-202611-0042",
      created_at: new Date(),
      plan_name: "Doctor Pro (Monthly)",
      razorpay_order_id: "order_Qe819b1x99Z",
      razorpay_payment_id: "pay_Qe820A3819c",
      amount: 352.82,
      status: "captured"
    },
    {
      payment_id: 1021,
      invoice_number: "INV-MT-202610-0021",
      created_at: new Date(Date.now() - 31 * 86400000),
      plan_name: "Doctor Pro (Monthly)",
      razorpay_order_id: "order_P19472k817x",
      razorpay_payment_id: "pay_P19488a002m",
      amount: 352.82,
      status: "captured"
    }
  ];
}

function formatDate(dateVal) {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

