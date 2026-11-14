// ============================================================================
// Every Individual Deserves Better Care. - Patient Login Handler
// Handles validation, authentication with Python backend, session, and error handling.
// ============================================================================

function showMessage(id, message, type = "danger") {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  el.className = `patient-alert alert-${type}`;
  el.textContent = message;
  // Ensure message is scrolled into view smoothly if needed
  if (typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 5; i++) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  sessionStorage.setItem("captcha", value);
  const captchaText = document.getElementById("captchaText");
  const captchaInput = document.getElementById("captchaInput");
  if (captchaText) captchaText.textContent = value;
  if (captchaInput) captchaInput.value = "";
}

/**
 * Format any API / network / configuration error into a user-friendly, actionable message.
 * Replaces generic "Failed to fetch" with meaningful diagnostics.
 */
function formatLoginErrorMessage(error) {
  if (!error) {
    return "Login failed. Please check your credentials and try again.";
  }

  // 1. If error has an explicit classified type from api.js
  if (error.type) {
    switch (error.type) {
      case "INVALID_CREDENTIALS":
        return error.message || "Invalid username or password. Please verify your credentials and try again.";
      case "SERVER_UNAVAILABLE":
        return "Backend server unavailable. Please make sure the Multi Therapy server is running on http://127.0.0.1:5000 and try again.";
      case "NETWORK_ERROR":
        return "Network connection problem. Please check your internet connection.";
      case "SERVER_CONFIG_ERROR":
        return error.message || "Server configuration error. Please check CORS configuration or contact support.";
      default:
        break;
    }
  }

  const rawMsg = (error.message || "").toString().trim();
  const lowerMsg = rawMsg.toLowerCase();

  // 2. Client is offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Network connection problem. You appear to be offline. Please check your internet connection.";
  }

  // 3. Unauthorized Role Portal Mismatch (HTTP 403)
  if (error.status === 403 || lowerMsg.includes("unauthorized") || lowerMsg.includes("correct login portal")) {
    return rawMsg || "Unauthorized: Please use the correct login portal.";
  }

  // 4. Invalid credentials (HTTP 401 or text match)
  if (
    error.status === 401 ||
    lowerMsg.includes("invalid") ||
    lowerMsg.includes("password") ||
    lowerMsg.includes("username") ||
    lowerMsg.includes("credentials")
  ) {
    return rawMsg || "Invalid username or password. Please verify your credentials and try again.";
  }

  // 4. Missing required fields (HTTP 400)
  if (error.status === 400) {
    return rawMsg || "Please provide both your email/username and password.";
  }

  // 5. Server configuration error (HTTP 500 or CORS rejection)
  if (
    error.status === 500 ||
    lowerMsg.includes("cors") ||
    lowerMsg.includes("origin") ||
    lowerMsg.includes("server configuration")
  ) {
    return "Server configuration error. Please ensure the backend server allows requests from this origin.";
  }

  // 6. Backend server unavailable (Connection refused, 502/503/504, or fetch failure)
  if (
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("refused") ||
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("unable to connect") ||
    lowerMsg.includes("network error")
  ) {
    return "Backend server unavailable. Please make sure the Multi Therapy server is running on http://127.0.0.1:5000 and try again.";
  }

  // Fallback to error message if present and meaningful, never generic "failed to fetch"
  return (rawMsg && !lowerMsg.includes("failed to fetch"))
    ? rawMsg
    : "Backend server unavailable. Please make sure the Multi Therapy server is running and try again.";
}

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in as Patient, automatically route to Patient Home
  try {
    const rawUser = localStorage.getItem("currentUser");
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u && (u.role || "").toLowerCase() === "patient") {
        const urlParams = new URLSearchParams(window.location.search);
        const targetUrl = urlParams.get("redirect") || urlParams.get("next") || "./patient-home.html";
        window.location.replace(targetUrl);
        return;
      }
    }
  } catch (e) {}

  // Preserve existing session; do not wipe on load
  generateCaptcha();

  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get("redirect") || urlParams.get("next");
  if (redirectParam && redirectParam.includes("appointment")) {
    const alertEl = document.getElementById("loginMessage");
    if (alertEl) {
      alertEl.className = "alert alert-info";
      alertEl.textContent = "Please log in to access your Patient Appointments.";
      alertEl.hidden = false;
    }
  }

  const refreshBtn = document.getElementById("refreshCaptcha");
  if (refreshBtn) refreshBtn.addEventListener("click", generateCaptcha);

  // Toggle Password Visibility
  const toggleBtn = document.getElementById("togglePassword");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const input = document.getElementById("loginPassword");
      if (!input) return;
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      toggleBtn.textContent = hidden ? "🙈" : "👁️";
    });
  }

  // Handle Patient Login Form Submission
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Clear any prior alert
      const alertEl = document.getElementById("loginMessage");
      if (alertEl) alertEl.hidden = true;

      // 1. CAPTCHA Validation
      const captchaInput = document.getElementById("captchaInput");
      const expectedCaptcha = sessionStorage.getItem("captcha") || "";
      if (!captchaInput || captchaInput.value.trim().toUpperCase() !== expectedCaptcha.toUpperCase()) {
        showMessage("loginMessage", "Invalid CAPTCHA security code. Please enter the characters shown.");
        generateCaptcha();
        return;
      }

      // 2. Input Validation
      const usernameVal = document.getElementById("username")?.value.trim() || "";
      const passwordVal = document.getElementById("loginPassword")?.value || "";
      const rememberVal = Boolean(document.getElementById("remember")?.checked);

      if (!usernameVal) {
        showMessage("loginMessage", "Please enter your email address or username.");
        return;
      }

      if (!passwordVal) {
        showMessage("loginMessage", "Please enter your password.");
        return;
      }

      // 3. UI Loading State
      const submitBtn = document.getElementById("btnPatientSubmit") || loginForm.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Verifying credentials...</span>`;
      }

      console.log(`[Patient Login] Submitting login request for user: ${usernameVal}`);
      console.log(`[Patient Login] Current API Base: ${typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "default"}`);

      try {
        // Connect to existing authentication backend endpoint /api/login
        const data = await apiRequest("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            username: usernameVal,
            email: usernameVal,
            password: passwordVal,
            role: "patient",
            portal: "patient",
            remember: rememberVal
          })
        });

        // Role verification: Ensure strictly patient role only
        const retRole = (data.user && data.user.role ? data.user.role : "").toLowerCase();
        if (retRole !== "patient") {
          showMessage("loginMessage", "Unauthorized: Please use the correct login portal.", "danger");
          generateCaptcha();
          return;
        }

        console.log(`[Patient Login] Authentication successful for user: ${usernameVal}`);
        showMessage("loginMessage", data.message || "Login successful! Redirecting to Patient Home...", "success");

        // Preserve session in localStorage for patient home and navbar
        if (data.user) {
          const userData = {
            ...data.user,
            username: data.user.username || usernameVal,
            role: "Patient"
          };
          localStorage.setItem("currentUser", JSON.stringify(userData));
        }

        // Redirect to target appointment page or Patient Home Page
        const targetUrl = redirectParam || "./patient-home.html";
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 500);

      } catch (error) {
        console.error(`[Patient Login] Authentication error:`, {
          status: error.status || 0,
          type: error.type || "UNKNOWN",
          message: error.message
        });

        const friendlyMessage = formatLoginErrorMessage(error);
        showMessage("loginMessage", friendlyMessage, "danger");
        generateCaptcha();

      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }
});
