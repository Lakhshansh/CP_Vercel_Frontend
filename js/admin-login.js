// ============================================================================
// Multi Therapy - Every Individual Deserves Better Care.
// Dedicated Admin Login Handler
// Enforces single authorized admin access without exposing credentials
// ============================================================================

function showAdminMessage(message, type = "danger") {
  const el = document.getElementById("loginMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `alert alert-${type} py-2 small mb-3 text-start`;
  el.textContent = message;
}

function generateAdminCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 5; i++) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  sessionStorage.setItem("admin_captcha", value);
  const captchaText = document.getElementById("captchaText");
  const captchaInput = document.getElementById("captchaInput");
  if (captchaText) captchaText.textContent = value;
  if (captchaInput) captchaInput.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in as authorized admin, redirect to admin dashboard
  try {
    const existingUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    const existingRole = (localStorage.getItem("adminRole") || (existingUser && existingUser.role) || "").toLowerCase();
    if (existingUser && (existingRole === "admin" || existingRole === "superadmin")) {
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.has("logout")) {
        window.location.href = "./admin-dashboard.html";
        return;
      }
    }
  } catch (e) {
    // Session parsing error, continue to login form
  }

  // 1. Generate Security CAPTCHA
  generateAdminCaptcha();

  const refreshBtn = document.getElementById("refreshCaptcha");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", generateAdminCaptcha);
  }

  // 2. Toggle Password Visibility
  const toggleBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("loginPassword");
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.getAttribute("type") === "password";
      passwordInput.setAttribute("type", isPassword ? "text" : "password");
      toggleBtn.textContent = isPassword ? "🔒" : "👁️";
    });
  }

  // 3. Handle Admin Form Submit
  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Check CAPTCHA
      const expectedCaptcha = (sessionStorage.getItem("admin_captcha") || "").trim().toUpperCase();
      const enteredCaptcha = (document.getElementById("captchaInput")?.value || "").trim().toUpperCase();

      if (!enteredCaptcha || enteredCaptcha !== expectedCaptcha) {
        showAdminMessage("Incorrect security verification code. Please re-enter the code shown.", "danger");
        generateAdminCaptcha();
        document.getElementById("captchaInput")?.focus();
        return;
      }

      const usernameVal = (document.getElementById("username")?.value || "").trim();
      const passwordVal = (document.getElementById("loginPassword")?.value || "");
      const rememberVal = Boolean(document.getElementById("remember")?.checked);

      if (!usernameVal) {
        showAdminMessage("Please enter your admin username or email address.", "danger");
        document.getElementById("username")?.focus();
        return;
      }

      if (!passwordVal) {
        showAdminMessage("Please enter your admin password.", "danger");
        document.getElementById("loginPassword")?.focus();
        return;
      }

      const normalizedInput = usernameVal.toLowerCase();

      const submitBtn = document.getElementById("btnAdminSubmit");
      const originalText = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Verifying administrative credentials...</span>`;
      }

      try {
        const payload = {
          username: usernameVal,
          email: usernameVal,
          password: passwordVal,
          role: "admin",
          portal: "admin",
          remember: rememberVal
        };

        let data = null;

        // 1. Try dedicated serverless /api/admin/login
        try {
          const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(payload)
          });
          const isJson = (res.headers.get("content-type") || "").includes("application/json");
          data = isJson ? await res.json() : null;

          if (!res.ok) {
            throw new Error((data && data.message) || `Admin authentication failed (${res.status})`);
          }
        } catch (serverlessErr) {
          // If serverless route not found (e.g. running on local python backend), try /api/login
          if (typeof apiRequest === "function") {
            data = await apiRequest("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
          } else {
            throw serverlessErr;
          }
        }

        // Validate admin role in returned user object
        const userRole = (data?.user?.role || "").toLowerCase();
        if (userRole !== "admin" && userRole !== "superadmin") {
          throw new Error("Unauthorized: Access restricted to Administrators only. Please use the correct login portal.");
        }

        showAdminMessage(data?.message || "Authentication successful! Redirecting to Administration Dashboard...", "success");

        // Save admin session securely in storage
        const adminUser = {
          user_id: data?.user?.user_id || 1,
          username: data?.user?.username || "admin",
          name: data?.user?.name || "Multi Therapy Administrator",
          email: data?.user?.email || "admin@multitherapy.org",
          role: "admin",
          profile_photo: data?.user?.profile_photo || null
        };

        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        localStorage.setItem("adminRole", "superadmin");
        localStorage.setItem("adminToken", data?.token || "mt_admin_session_active");
        sessionStorage.setItem("admin_logged_in", "true");

        setTimeout(() => {
          window.location.href = "./admin-dashboard.html";
        }, 500);

      } catch (error) {
        console.error("[Admin Login Error]:", error);
        showAdminMessage(error.message || "Invalid administrative credentials.", "danger");
        generateAdminCaptcha();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    });
  }
});
