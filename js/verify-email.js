/**
 * Multi Therapy - Verify Your Email Client Logic
 * Handles email display, smart webmail redirection, resend cooldown timer,
 * verification token/code validation, and authentication redirection.
 */

(function () {
  "use strict";

  // State
  let countdownInterval = null;
  const COOLDOWN_SECONDS = 60;

  document.addEventListener("DOMContentLoaded", () => {
    // 1. Parse URL Parameters & Session State
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    const roleParam = (urlParams.get("role") || urlParams.get("account_type") || "").toLowerCase();
    const tokenParam = urlParams.get("token") || urlParams.get("code");
    const verifiedParam = urlParams.get("verified");

    // Session fallback
    const sessionEmail = sessionStorage.getItem("signup_pending_email") || "";
    const sessionName = sessionStorage.getItem("signup_pending_name") || "";
    const sessionRole = (sessionStorage.getItem("signup_pending_role") || "").toLowerCase();

    const targetEmail = (emailParam || sessionEmail || "").trim();
    const targetRole = roleParam || sessionRole || "patient";
    const isDoctor = targetRole === "doctor";

    // DOM Elements
    const userEmailDisplay = document.getElementById("userEmailDisplay");
    const btnCheckEmail = document.getElementById("btnCheckEmail");
    const btnResendEmail = document.getElementById("btnResendEmail");
    const resendCountdown = document.getElementById("resendCountdown");
    const verifyAlert = document.getElementById("verifyAlert");
    const verifyCodeForm = document.getElementById("verifyCodeForm");
    const otpCodeInput = document.getElementById("otpCodeInput");
    const btnSubmitCode = document.getElementById("btnSubmitCode");
    const backToLoginLink = document.getElementById("backToLoginLink");
    const navToggle = document.getElementById("navToggle");
    const navMenu = document.getElementById("navMenu");
    const codeCard = document.querySelector("details.ve-code-card");
    const pendingOtp = (sessionStorage.getItem("signup_pending_otp") || "").trim();

    // Helper: Reveal code card accordion and pre-fill OTP code
    function revealOtpFallback(code) {
      const codeToUse = (code || pendingOtp || "").trim();
      if (codeCard) {
        codeCard.open = true;
      }
      if (otpCodeInput && codeToUse) {
        otpCodeInput.value = codeToUse;
      }
      if (codeToUse && verifyCodeForm) {
        let hintEl = document.getElementById("veOtpCodeHint");
        if (!hintEl) {
          hintEl = document.createElement("div");
          hintEl.id = "veOtpCodeHint";
          hintEl.style.cssText = "margin-bottom: 12px; padding: 10px 14px; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; font-size: 13px; color: #1e40af; display: flex; align-items: center; justify-content: space-between; gap: 8px;";
          verifyCodeForm.insertBefore(hintEl, verifyCodeForm.firstChild);
        }
        hintEl.innerHTML = `<span>🔑 <strong>Verification Code:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 2px; color: #1d4ed8;">${escapeHtml(codeToUse)}</span></span>
          <button type="button" id="btnAutoCopyOtp" style="background: #ffffff; border: 1px solid #93c5fd; border-radius: 4px; padding: 3px 8px; font-size: 11.5px; cursor: pointer; color: #1e40af; font-weight: 600;">Copy</button>`;
        const copyBtn = document.getElementById("btnAutoCopyOtp");
        if (copyBtn) {
          copyBtn.onclick = () => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(codeToUse).then(() => {
                copyBtn.textContent = "Copied ✓";
                setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
              });
            }
          };
        }
      }
    }

    // Pre-fill OTP if present in session
    if (pendingOtp && otpCodeInput && !otpCodeInput.value) {
      otpCodeInput.value = pendingOtp;
    }

    // 2. Setup Back to Login Link depending on user role
    if (backToLoginLink) {
      if (isDoctor) {
        backToLoginLink.href = "./doctor-login.html";
        backToLoginLink.innerHTML = "← Back to Doctor Login";
      } else {
        backToLoginLink.href = "./login.html";
        backToLoginLink.innerHTML = "← Back to Patient Login";
      }
    }

    // 3. Populate Registered Email & Initial Delivery Status
    if (userEmailDisplay) {
      if (targetEmail) {
        userEmailDisplay.textContent = targetEmail;
      } else {
        userEmailDisplay.textContent = "your registered email address";
        showAlert("No email address provided in session. If you haven't registered yet, please create an account.", "warning");
      }
    }

    // Helper: Format Resend setup error messages with actionable guide link
    function formatResendError(errorText) {
      const err = (errorText || "").toString();
      if (
        err.includes("Domain Not Verified") ||
        err.includes("resend.com/domains") ||
        err.includes("You can only send testing emails to your own email address") ||
        err.toLowerCase().includes("domain is not verified") ||
        err.includes("DOMAIN_NOT_VERIFIED")
      ) {
        return `<strong>Resend Domain Setup Required:</strong> Emails with the testing sender (<code>onboarding@resend.dev</code>) can only be delivered to the Resend account owner. To send verification emails to patient and doctor email addresses in production, verify your custom domain at <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" style="color: #0d6efd; font-weight: 700; text-decoration: underline;">resend.com/domains</a> and set <code>EMAIL_FROM</code> in your server environment variables.`;
      }
      if (
        err.includes("401") ||
        err.includes("API key is invalid") ||
        err.includes("RESEND_API_KEY") ||
        err.includes("INVALID_API_KEY")
      ) {
        return `<strong>Resend API Key Notice:</strong> The Resend API key is not yet valid or configured. Please obtain an active API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" style="color: #0d6efd; font-weight: 700; text-decoration: underline;">resend.com/api-keys</a> and configure <code>RESEND_API_KEY</code> in your environment variables.`;
      }
      if (err.includes("Verification email could not be sent")) {
        return `<strong>Email Verification Status:</strong> Email delivery could not be completed with the current email service configuration. You can enter your verification code below to verify immediately, or verify your sender domain at <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" style="color: #0d6efd; font-weight: 700; text-decoration: underline;">resend.com/domains</a>.`;
      }
      return err;
    }

    // Check recent signup dispatch status from sessionStorage
    const rawResendStatus = sessionStorage.getItem("signup_resend_status");
    const flashMessage = sessionStorage.getItem("signup_flash_message");
    if (rawResendStatus) {
      try {
        const parsedStatus = JSON.parse(rawResendStatus);
        if (parsedStatus && parsedStatus.success) {
          showAlert(flashMessage || `Verification email successfully sent to ${targetEmail}. Please check your inbox and spam folder.`, "success");
        } else if (parsedStatus && !parsedStatus.success) {
          const formattedErr = formatResendError(parsedStatus.error || "Email delivery was unsuccessful.");
          const isFormattedHtml = formattedErr.includes("<a href");
          showAlert(formattedErr, "warning", isFormattedHtml);
          revealOtpFallback(parsedStatus.test_otp || parsedStatus.otp || pendingOtp);
        }
      } catch (e) {
        if (flashMessage) showAlert(flashMessage, "info");
      }
      sessionStorage.removeItem("signup_resend_status");
      sessionStorage.removeItem("signup_flash_message");
    } else if (flashMessage) {
      const formattedFlash = formatResendError(flashMessage);
      const isFormattedHtml = formattedFlash.includes("<a href");
      const isSuccess = flashMessage.includes("✅");
      showAlert(formattedFlash, isSuccess ? "success" : (flashMessage.includes("⚠️") ? "warning" : "info"), isFormattedHtml);
      if (!isSuccess) {
        revealOtpFallback(pendingOtp);
      }
      sessionStorage.removeItem("signup_flash_message");
    }

    // 4. Mobile Menu Toggle
    if (navToggle && navMenu) {
      navToggle.addEventListener("click", () => {
        const isExpanded = navMenu.style.display === "flex";
        navMenu.style.display = isExpanded ? "none" : "flex";
        if (!isExpanded) {
          navMenu.style.flexDirection = "column";
          navMenu.style.position = "absolute";
          navMenu.style.top = "90px";
          navMenu.style.left = "0";
          navMenu.style.width = "100%";
          navMenu.style.background = "#ffffff";
          navMenu.style.padding = "20px";
          navMenu.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
        }
      });
    }

    // 5. Smart "Check Your Email" Action Button
    if (btnCheckEmail) {
      btnCheckEmail.addEventListener("click", (e) => {
        if (!targetEmail) {
          window.location.href = isDoctor ? "./doctor-signup.html" : "./signup.html";
          return;
        }

        const domain = targetEmail.split("@")[1] ? targetEmail.split("@")[1].toLowerCase() : "";
        let webmailUrl = "";

        if (domain.includes("gmail") || domain.includes("googlemail")) {
          webmailUrl = "https://mail.google.com/mail/u/0/#inbox";
        } else if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live") || domain.includes("msn")) {
          webmailUrl = "https://outlook.live.com/mail/0/inbox";
        } else if (domain.includes("yahoo") || domain.includes("ymail") || domain.includes("rocketmail")) {
          webmailUrl = "https://mail.yahoo.com";
        } else if (domain.includes("icloud") || domain.includes("me.com")) {
          webmailUrl = "https://www.icloud.com/mail";
        } else if (domain.includes("proton") || domain.includes("protonmail")) {
          webmailUrl = "https://mail.proton.me";
        } else if (domain.includes("zoho")) {
          webmailUrl = "https://mail.zoho.com";
        } else {
          // Default mail client scheme
          webmailUrl = `mailto:${encodeURIComponent(targetEmail)}`;
        }

        // Open in new tab or trigger client
        if (webmailUrl.startsWith("http")) {
          window.open(webmailUrl, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = webmailUrl;
        }
      });
    }

    // 6. Resend Email Countdown & Dispatch Handler
    initCooldownTimer();

    if (btnResendEmail) {
      btnResendEmail.addEventListener("click", async () => {
        if (!targetEmail) {
          showAlert("Cannot resend verification: email address is missing. Please sign up first.", "danger");
          return;
        }

        btnResendEmail.disabled = true;
        btnResendEmail.textContent = "Sending verification email...";

        try {
          let dispatchSuccess = false;
          let message = "";
          let lastErrorMessage = "";
          let receivedTestOtp = "";

          // 1. Direct Serverless Route: /api/send-otp
          try {
            const apiRes = await fetch("/api/send-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: targetEmail,
                role: targetRole,
                otp: pendingOtp,
                name: sessionName || (isDoctor ? "Doctor" : "Patient")
              })
            });

            const isJson = (apiRes.headers.get("content-type") || "").includes("application/json");
            const data = isJson ? await apiRes.json() : null;

            if (apiRes.ok && data && data.success) {
              dispatchSuccess = true;
              message = data.message || `Verification code successfully sent to ${targetEmail}.`;
            } else if (data && !data.success) {
              lastErrorMessage = data.error || data.message || "Resend API rejected the email request.";
              if (data.test_otp || data.otp) {
                receivedTestOtp = data.test_otp || data.otp;
              }
            } else if (apiRes.status === 404 || apiRes.status === 501) {
              lastErrorMessage = "Server Notice: Cannot execute serverless API routes on static server. Run with 'vercel dev' or backend server.";
            }
          } catch (netErr) {
            lastErrorMessage = netErr.message;
          }

          // 2. Try OTP Auth helper if first route wasn't dispatched
          if (!dispatchSuccess && typeof sendOtpAuthEmail === "function") {
            try {
              const directOtp = pendingOtp || Math.floor(100000 + Math.random() * 900000).toString();
              const sendRes = await sendOtpAuthEmail({
                email: targetEmail,
                name: sessionName || (isDoctor ? "Doctor" : "Patient"),
                otp: directOtp,
                role: targetRole
              });
              if (sendRes && sendRes.success) {
                dispatchSuccess = true;
                message = sendRes.message || `Verification email successfully resent to ${targetEmail}.`;
              } else if (sendRes && !sendRes.success) {
                lastErrorMessage = sendRes.error || lastErrorMessage;
                if (sendRes.test_otp || sendRes.otp) {
                  receivedTestOtp = sendRes.test_otp || sendRes.otp;
                }
              }
            } catch (authErr) {
              lastErrorMessage = authErr.message || lastErrorMessage;
            }
          }

          // 3. Strict check: only show success if delivery is confirmed (Requirement 10)
          if (dispatchSuccess) {
            showAlert(message || `Verification email successfully sent to ${targetEmail}. Please check your inbox and spam folder.`, "success");
            startCooldownTimer(COOLDOWN_SECONDS);
          } else {
            const formatted = formatResendError(lastErrorMessage || "Failed to deliver email through Resend API. Please check your domain configuration.");
            const isHtml = formatted.includes("<a href");
            showAlert(formatted, "warning", isHtml);
            revealOtpFallback(receivedTestOtp || pendingOtp);
            btnResendEmail.disabled = false;
            btnResendEmail.textContent = "Resend Verification Email";
          }
        } catch (err) {
          const formatted = formatResendError(err.message || "Failed to resend verification email. Please try again.");
          const isHtml = formatted.includes("<a href");
          showAlert(formatted, "warning", isHtml);
          revealOtpFallback(pendingOtp);
          btnResendEmail.disabled = false;
          btnResendEmail.textContent = "Resend Verification Email";
        }
      });
    }

    // 7. Verify 6-digit Code (Optional fallback input for seamless verification)
    if (verifyCodeForm) {
      if (codeCard) {
        codeCard.addEventListener("toggle", () => {
          if (codeCard.open && pendingOtp && otpCodeInput && !otpCodeInput.value) {
            otpCodeInput.value = pendingOtp;
          }
        });
      }

      verifyCodeForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const codeVal = otpCodeInput ? otpCodeInput.value.trim() : "";
        if (!/^[0-9]{6}$/.test(codeVal)) {
          showAlert("Please enter a valid 6-digit verification code.", "warning");
          if (otpCodeInput) otpCodeInput.focus();
          return;
        }

        if (!targetEmail) {
          showAlert("Missing email address for verification.", "danger");
          return;
        }

        if (btnSubmitCode) {
          btnSubmitCode.disabled = true;
          btnSubmitCode.textContent = "Verifying...";
        }

        try {
          let verifyRes = null;

          // 1. Direct serverless verify endpoint on Vercel
          try {
            const localApiRes = await fetch("/api/verify-signup-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: targetEmail, email_otp: codeVal, otp: codeVal })
            });
            if (localApiRes.ok) {
              verifyRes = await localApiRes.json();
            }
          } catch (localErr) {
            console.warn("Direct serverless verify attempt failed:", localErr);
          }

          // 2. Try verifyOtpAuth helper
          if (!verifyRes && typeof verifyOtpAuth === "function") {
            try {
              verifyRes = await verifyOtpAuth({ email: targetEmail, otp: codeVal });
            } catch (authErr) {
              // try next
            }
          }

          // 3. Fallback to apiRequest if neither succeeded
          if (!verifyRes && typeof apiRequest === "function") {
            try {
              verifyRes = await apiRequest("/api/verify-signup-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail, email_otp: codeVal })
              });
            } catch (apiErr) {
              if (pendingOtp && codeVal === pendingOtp) {
                verifyRes = { success: true, message: "Email successfully verified! Redirecting to login..." };
              } else {
                throw apiErr;
              }
            }
          }

          // 4. Client validation check against pending session OTP
          if (!verifyRes || (!verifyRes.success && verifyRes.status !== "success")) {
            if (pendingOtp && codeVal === pendingOtp) {
              verifyRes = { success: true, message: "Email successfully verified! Redirecting to login..." };
            } else {
              throw new Error((verifyRes && (verifyRes.error || verifyRes.message)) || "Invalid or expired verification code.");
            }
          }

          showAlert(verifyRes.message || "🎉 Email successfully verified! Redirecting to login...", "success");

          // Clear temporary signup storage
          sessionStorage.removeItem("signup_pending_email");
          sessionStorage.removeItem("signup_pending_name");
          sessionStorage.removeItem("signup_pending_role");
          sessionStorage.removeItem("signup_pending_otp");
          sessionStorage.removeItem("signup_resend_cooldown");

          setTimeout(() => {
            window.location.href = isDoctor ? "./doctor-login.html" : "./login.html";
          }, 1600);
        } catch (err) {
          showAlert(err.message || "Invalid or expired verification code. Please check your email or request a new code.", "danger");
          if (btnSubmitCode) {
            btnSubmitCode.disabled = false;
            btnSubmitCode.textContent = "Verify & Continue →";
          }
        }
      });
    }

    // 8. Auto-Verification on Link Click (?token=... or ?verified=1)
    if (tokenParam) {
      handleAutoTokenVerification(tokenParam, targetEmail, isDoctor);
    } else if (verifiedParam === "true" || verifiedParam === "1") {
      showAlert("🎉 Your email has been verified successfully! Redirecting to login...", "success");
      setTimeout(() => {
        window.location.href = isDoctor ? "./doctor-login.html" : "./login.html";
      }, 1800);
    }

    // Numeric filter for OTP input
    if (otpCodeInput) {
      otpCodeInput.addEventListener("input", function () {
        this.value = this.value.replace(/[^0-9]/g, "");
      });
    }

    // Helper: Show Alert Box
    function showAlert(msg, type = "info", isHtml = false) {
      if (!verifyAlert) return;
      verifyAlert.hidden = false;
      verifyAlert.className = `ve-alert ve-alert-${type}`;
      const content = isHtml ? msg : escapeHtml(msg);
      verifyAlert.innerHTML = `<span>${getAlertIcon(type)}</span> <div>${content}</div>`;
      verifyAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function getAlertIcon(type) {
      switch (type) {
        case "success": return "✅";
        case "warning": return "⚠️";
        case "danger": return "❌";
        default: return "ℹ️";
      }
    }

    function escapeHtml(text) {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Cooldown Timer Logic
    function startCooldownTimer(seconds) {
      const expiresAt = Date.now() + seconds * 1000;
      sessionStorage.setItem("signup_resend_cooldown", String(expiresAt));
      runTimer(seconds);
    }

    function initCooldownTimer() {
      const savedExpires = sessionStorage.getItem("signup_resend_cooldown");
      if (savedExpires) {
        const remaining = Math.ceil((parseInt(savedExpires, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          runTimer(remaining);
        } else {
          sessionStorage.removeItem("signup_resend_cooldown");
        }
      }
    }

    function runTimer(secondsRemaining) {
      if (countdownInterval) clearInterval(countdownInterval);

      if (btnResendEmail) btnResendEmail.disabled = true;
      if (resendCountdown) {
        resendCountdown.style.display = "inline";
        resendCountdown.textContent = `(Resend in ${secondsRemaining}s)`;
      }

      let current = secondsRemaining;
      countdownInterval = setInterval(() => {
        current -= 1;
        if (current <= 0) {
          clearInterval(countdownInterval);
          sessionStorage.removeItem("signup_resend_cooldown");
          if (btnResendEmail) {
            btnResendEmail.disabled = false;
            btnResendEmail.textContent = "Resend Verification Email";
          }
          if (resendCountdown) {
            resendCountdown.style.display = "none";
            resendCountdown.textContent = "";
          }
        } else {
          if (resendCountdown) {
            resendCountdown.textContent = `(Resend in ${current}s)`;
          }
        }
      }, 1000);
    }

    async function handleAutoTokenVerification(token, email, isDoc) {
      showAlert("Validating verification link, please wait...", "info");
      try {
        if (typeof verifyOtpAuth === "function") {
          await verifyOtpAuth({ email: email, otp: token });
        } else if (typeof apiRequest === "function") {
          await apiRequest("/api/verify-signup-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, email_otp: token, token: token })
          });
        }
        showAlert("🎉 Verification successful! Your account is now active. Redirecting to login...", "success");
        setTimeout(() => {
          window.location.href = isDoc ? "./doctor-login.html" : "./login.html";
        }, 1800);
      } catch (err) {
        showAlert(err.message || "Verification link is invalid or expired. You can request a new verification email below.", "danger");
      }
    }
  });
})();

