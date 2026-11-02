// ============================================================================
// Multi Therapy Management System - API Client
// Handles robust backend communication, environment detection, and smart fallbacks.
// ============================================================================

const PROD_API_BASE = "https://cp-backend-t590.onrender.com";
const LOCAL_API_BASE = "http://127.0.0.1:5000";
const LOCAL_API_FALLBACK = "http://localhost:5000";

/**
 * Determine the most appropriate primary API base URL.
 * When accessed from a local developer environment (127.0.0.1 or localhost),
 * default to the local Python backend at http://127.0.0.1:5000.
 * When accessed from production/Vercel or if configured via localStorage/window,
 * respect the custom override or production cloud backend.
 */
function resolveInitialApiBase() {
  if (typeof window !== "undefined") {
    if (window.VITE_API_BASE_URL) return window.VITE_API_BASE_URL;
    if (window.API_BASE_URL) return window.API_BASE_URL;

    try {
      const stored = localStorage.getItem("API_BASE_URL");
      if (stored && typeof stored === "string" && stored.trim()) {
        return stored.trim();
      }
    } catch (e) {
      // localStorage may be restricted in private browsing
    }

    // When running locally, prefer local backend
    const isLocalFrontend =
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost" ||
      window.location.protocol === "file:";

    if (isLocalFrontend) {
      return LOCAL_API_BASE;
    }
  }

  return PROD_API_BASE;
}

let API_BASE_URL = resolveInitialApiBase();

/**
 * Custom ApiError containing HTTP status and classified error category
 */
class ApiError extends Error {
  constructor(message, { status = 0, type = "UNKNOWN", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.type = type; // "INVALID_CREDENTIALS" | "SERVER_UNAVAILABLE" | "NETWORK_ERROR" | "SERVER_CONFIG_ERROR"
    this.details = details;
  }
}

/**
 * Robust API Request Handler with automatic fallback retry and classified error reporting
 */
async function apiRequest(path, options = {}) {
  // Check if client is offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiError(
      "Network connection problem. You are currently offline. Please check your internet connection.",
      { type: "NETWORK_ERROR" }
    );
  }

  // Build candidate backend endpoints in priority order
  const candidates = [];
  if (API_BASE_URL) candidates.push(API_BASE_URL);

  const isLocalFrontend =
    typeof window !== "undefined" &&
    (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");

  const fallbacks = isLocalFrontend
    ? [LOCAL_API_BASE, LOCAL_API_FALLBACK, PROD_API_BASE]
    : [PROD_API_BASE, LOCAL_API_BASE, LOCAL_API_FALLBACK];

  for (const fb of fallbacks) {
    if (!candidates.includes(fb)) {
      candidates.push(fb);
    }
  }

  let lastError = null;

  for (let i = 0; i < candidates.length; i++) {
    const base = candidates[i];
    const url = `${base}${path}`;

    try {
      const response = await fetch(url, {
        credentials: "include",
        ...options
      });

      const contentType = response.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      // If backend responded with 401 or 403 or 400 (Client Authentication Error)
      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          data.message || data.error || "Invalid username or password.",
          { status: response.status, type: "INVALID_CREDENTIALS", details: data }
        );
      }

      if (response.status === 400) {
        throw new ApiError(
          data.message || data.error || "Username and password are required.",
          { status: 400, type: "INVALID_CREDENTIALS", details: data }
        );
      }

      if (response.status === 500) {
        throw new ApiError(
          data.message || data.error || "Server configuration error. The server encountered an internal error.",
          { status: 500, type: "SERVER_CONFIG_ERROR", details: data }
        );
      }

      if (!response.ok) {
        // 502, 503, 504 indicate server down / gateway failure; try next candidate
        if ([502, 503, 504].includes(response.status)) {
          console.warn(`[API] Server at ${base} returned status ${response.status}. Attempting fallback...`);
          lastError = new ApiError(
            "Backend server unavailable. Please make sure the Multi Therapy server is running and try again.",
            { status: response.status, type: "SERVER_UNAVAILABLE", details: data }
          );
          continue;
        }

        throw new ApiError(
          data.message || data.error || `Request failed with status ${response.status}`,
          { status: response.status, type: "UNKNOWN", details: data }
        );
      }

      // Successful response: persist working base URL
      if (API_BASE_URL !== base) {
        API_BASE_URL = base;
        try {
          localStorage.setItem("API_BASE_URL", base);
        } catch (e) {}
      }

      return data;

    } catch (err) {
      // If error is an ApiError from an actual response (e.g. 401 Invalid Credentials), DO NOT fallback!
      if (err instanceof ApiError) {
        throw err;
      }

      // Network / Fetch error (connection refused, CORS blocked, timeout)
      const errMsg = (err && err.message) ? err.message.toLowerCase() : "";
      const isNetworkFail =
        err.name === "TypeError" ||
        errMsg.includes("fetch") ||
        errMsg.includes("network") ||
        errMsg.includes("failed") ||
        errMsg.includes("cors");

      if (isNetworkFail) {
        console.warn(`[API] Network failure connecting to ${base}:`, err.message);
        lastError = err;
        // Proceed to try next candidate in list
        continue;
      }

      // Re-throw unexpected programmatic errors
      throw err;
    }
  }

  // If all candidates exhausted
  console.error("[API] All backend connection candidates exhausted:", candidates);
  throw new ApiError(
    "Backend server unavailable. Unable to connect to the Multi Therapy server on http://127.0.0.1:5000. Please ensure the Python backend is running.",
    { status: 503, type: "SERVER_UNAVAILABLE", details: lastError }
  );
}

// Global helper to populate navbar user details and profile photo across all pages
function renderNavbarUser(user) {
  if (!user) {
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      try { user = JSON.parse(raw); } catch (e) { user = null; }
    }
  }
  if (!user) return;

  const displayName = user.username || user.name || "User";
  const displayRole = user.role || "Admin";

  const navUsernameEl = document.getElementById("navUsername") || document.getElementById("navPatientName") || document.getElementById("docNavName");
  const navRoleEl = document.getElementById("navRole") || document.getElementById("navPatientRole") || document.getElementById("docNavRole");
  const navAvatarEl = document.getElementById("navAvatar");
  const navAvatarImg = document.getElementById("navAvatarImg");
  const navPatientAvatar = document.getElementById("navPatientAvatar");
  const docNavAvatar = document.getElementById("docNavAvatar");

  if (navUsernameEl) navUsernameEl.textContent = displayName;
  if (navRoleEl) navRoleEl.textContent = displayRole;

  let photoSrc = "";
  if (user.profile_photo) {
    if (typeof CdnManager !== "undefined" && CdnManager.buildCdnUrl) {
      photoSrc = CdnManager.buildCdnUrl(user.profile_photo, { width: 90, height: 90, crop: "fill" });
    } else {
      photoSrc = (user.profile_photo.startsWith("http") || user.profile_photo.startsWith("data:"))
        ? user.profile_photo
        : (user.profile_photo.startsWith("/") ? `${API_BASE_URL}${user.profile_photo}` : `${API_BASE_URL}/static/profile_photos/${user.profile_photo}`);
    }

    if (navAvatarImg) {
      navAvatarImg.src = photoSrc;
      navAvatarImg.style.display = "block";
      navAvatarImg.onerror = function () {
        this.style.display = "none";
        if (navAvatarEl) {
          navAvatarEl.style.display = "flex";
          navAvatarEl.textContent = (displayName.charAt(0) || "👤").toUpperCase();
        }
      };
      if (navAvatarEl) navAvatarEl.style.display = "none";
    }

    if (navPatientAvatar) {
      navPatientAvatar.src = photoSrc;
      navPatientAvatar.onerror = function () {
        this.src = "./images/patient-avatar.svg";
      };
    }
    if (docNavAvatar) {
      docNavAvatar.src = photoSrc;
      docNavAvatar.onerror = function () {
        this.src = "./images/doctor-avatar.svg";
      };
    }
  } else {
    if (navAvatarEl) {
      navAvatarEl.style.display = "flex";
      navAvatarEl.textContent = (displayName.charAt(0) || "👤").toUpperCase();
    }
    if (navAvatarImg) navAvatarImg.style.display = "none";
  }
}

// Background sync to ensure profile photo and freshest user data are cached
async function syncUserProfile() {
  const raw = localStorage.getItem("currentUser");
  if (!raw) return;
  let user = null;
  try { user = JSON.parse(raw); } catch (e) { return; }
  if (!user || (!user.user_id && !user.username)) return;

  try {
    const res = await apiRequest(`/api/profile?user_id=${encodeURIComponent(user.user_id || '')}&username=${encodeURIComponent(user.username || '')}`);
    if (res && res.user) {
      const updatedUser = { ...user, ...res.user };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      renderNavbarUser(updatedUser);
    }
  } catch (err) {
    // Non-blocking background sync
  }
}

// Automatically initialize navbar user if elements exist
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    renderNavbarUser();
    syncUserProfile();
  });
} else {
  renderNavbarUser();
  syncUserProfile();
}
