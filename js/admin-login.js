// ============================================================================
// Every Individual Deserves Better Care. - Admin Login Handler
// Dedicated authentication handler for the Online Administration Portal.
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
      const expectedCaptcha = sessionStorage.getItem("admin_captcha") || "";
      const enteredCaptcha = (document.getElementById("captchaInput")?.value || "").trim().toUpperCase();

      if (!enteredCaptcha || enteredCaptcha !== expectedCaptcha.toUpperCase()) {
        showAdminMessage("Incorrect security CAPTCHA code. Please re-enter the code shown.", "danger");
        generateAdminCaptcha();
        return;
      }

      const usernameVal = document.getElementById("username")?.value.trim() || "";
      const passwordVal = document.getElementById("loginPassword")?.value || "";
      const rememberVal = Boolean(document.getElementById("remember")?.checked);

      if (!usernameVal || !passwordVal) {
        showAdminMessage("Please enter your admin username/email and password.", "danger");
        return;
      }

      const submitBtn = document.getElementById("btnAdminSubmit");
      const originalText = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Verifying administrative credentials...</span>`;
      }

      try {
        const payload = {
          username: usernameVal,
          email: usernameVal,
          password: passwordVal,
          role: "admin",
          remember: rememberVal
        };

        let data = null;
        if (typeof apiRequest === "function") {
          data = await apiRequest("/api/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(payload)
          });
        }

        showAdminMessage(data?.message || "Authentication successful! Redirecting to Administration Dashboard...", "success");

        // Save admin session
        const adminUser = {
          user_id: data?.user?.user_id || 1,
          username: data?.user?.username || usernameVal,
          name: data?.user?.name || "Administrator",
          role: "admin"
        };
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        localStorage.setItem("adminRole", "superadmin");

        setTimeout(() => {
          window.location.href = "./admin-subscription-dashboard.html";
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

