// ============================================================================
// Multi Therapy - Patient Home Page Client Controller
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  initPatientSession();
  initHeaderInteractions();
  initDoctorSearch();
  initTherapistSearch();
  initQuickSearchModal();
});

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

/**
 * Extracts a clean, dynamic patient name from session/profile data.
 * Discards admin, placeholders, or generic roles.
 */
function extractPatientDisplayName(u) {
  if (!u) return "";
  const candidates = [
    u.patient_name,
    u.first_name,
    u.name,
    u.full_name,
    u.display_name,
    u.username
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      // Strip any "Dr." / "Dr" / "Doctor" prefix
      let trimmed = c.trim().replace(/^(?:dr\.?|doctor)\s+/i, "").trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed.length > 0 &&
        !["admin", "administrator", "patient", "user", "guest", "guest patient", "doctor", "dr.", "dr", "null", "undefined"].includes(lower) &&
        !lower.startsWith("admin") &&
        !lower.startsWith("patient portal")
      ) {
        const parts = trimmed.split(" ");
        const first = parts[0] || trimmed;
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
  }
  const pending = sessionStorage.getItem("signup_pending_name");
  if (pending && typeof pending === "string") {
    let trimmed = pending.trim().replace(/^(?:dr\.?|doctor)\s+/i, "").trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.length > 0 && !["admin", "patient", "doctor", "dr.", "dr"].includes(lower)) {
      const parts = trimmed.split(" ");
      const first = parts[0] || trimmed;
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }
  return "";
}

/**
 * Updates the hero greeting to either "Welcome back, {Name}!" or "Welcome back, Patient!".
 */
function updateWelcomeGreeting(patientName) {
  const heroHeading = document.getElementById("heroHeading");
  if (!heroHeading) return;
  const clean = (patientName && typeof patientName === "string") ? patientName.trim() : "";
  if (clean) {
    heroHeading.innerHTML = `Welcome back, <span id="heroPatientName">${escapeHtml(clean)}</span>!`;
  } else {
    // If the patient's name is unavailable, display “Welcome back, Patient!”
    heroHeading.innerHTML = `Welcome back, <span id="heroPatientName">Patient</span>!`;
  }
}

/**
 * 1. Initialize Patient Session & User Info in Navbar
 */
function initPatientSession() {
  let user = null;
  const raw = localStorage.getItem("currentUser");

  if (raw) {
    try {
      user = JSON.parse(raw);
    } catch (e) {
      user = null;
    }
  }

  const patientName = extractPatientDisplayName(user);
  updateWelcomeGreeting(patientName);

  const displayName = patientName || "Patient";
  const displayRole = "Patient Portal";

  // Navbar Elements
  const nameEl = document.getElementById("navPatientName");
  const roleEl = document.getElementById("navPatientRole");
  const avatarImg = document.getElementById("navPatientAvatar");

  if (nameEl) nameEl.textContent = displayName;
  if (roleEl) roleEl.textContent = displayRole;

  if (avatarImg) {
    if (user && user.profile_photo && (user.profile_photo.startsWith("http") || user.profile_photo.startsWith("data:"))) {
      avatarImg.src = (typeof CdnManager !== "undefined")
        ? CdnManager.buildCdnUrl(user.profile_photo, { width: 80, height: 80, crop: "fill" })
        : user.profile_photo;
    } else {
      avatarImg.src = "./images/patient-avatar.svg";
    }
    avatarImg.onerror = function () {
      this.src = "./images/patient-avatar.svg";
    };
  }

  // Handle Logout Button
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        if (typeof apiRequest === "function") {
          await apiRequest("/api/logout", { method: "POST" });
        }
      } catch (err) {
        // Non-blocking logout fallback
      }
      localStorage.removeItem("currentUser");
      window.location.href = "./login.html";
    });
  }
}

/**
 * 2. Header Dropdowns (Notifications & User Profile) & Responsive Mobile Navigation
 */
function initHeaderInteractions() {
  const notifBtn = document.getElementById("btnNavNotifications");
  const notifDropdown = document.getElementById("notificationDropdown");
  const userProfile = document.getElementById("navUserProfile");
  const profileDropdown = document.getElementById("profileDropdown");
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  // Notifications Toggle
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = notifDropdown.classList.contains("open");
      closeAllDropdowns();
      if (!isOpen) notifDropdown.classList.add("open");
    });
  }

  // User Profile Dropdown Toggle
  if (userProfile && profileDropdown) {
    userProfile.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = profileDropdown.classList.contains("open");
      closeAllDropdowns();
      if (!isOpen) {
        profileDropdown.classList.add("open");
        userProfile.classList.add("open");
      }
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    closeAllDropdowns();
  });

  function closeAllDropdowns() {
    if (notifDropdown) notifDropdown.classList.remove("open");
    if (profileDropdown) profileDropdown.classList.remove("open");
    if (userProfile) userProfile.classList.remove("open");
  }

  // Mobile Menu Toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      navMenu.classList.toggle("open");
    });

    // Close when clicking any nav link
    navMenu.querySelectorAll(".ph-nav-link").forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
      });
    });

    // Close when clicking outside menu
    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && e.target !== navToggle) {
        navMenu.classList.remove("open");
      }
    });
  }
}

/**
 * 3. Doctor Search Card Controller
 */
function initDoctorSearch() {
  const form = document.getElementById("doctorSearchForm");
  const searchBtn = document.getElementById("btnSearchDoctorsCard");

  function executeSearch(e) {
    if (e) e.preventDefault();

    const spec = document.getElementById("docSpecialization")?.value || "";
    const loc = document.getElementById("docLocation")?.value || "";
    const avail = document.getElementById("docAvailability")?.value || "";

    const queryParams = new URLSearchParams();
    if (spec) queryParams.set("specialization", spec);
    if (loc) queryParams.set("location", loc);
    if (avail) queryParams.set("availability", avail);

    // Redirect to the existing doctor directory page with filters applied
    window.location.href = `./directory.html?${queryParams.toString()}`;
  }

  if (form) form.addEventListener("submit", executeSearch);
  if (searchBtn) searchBtn.addEventListener("click", executeSearch);

  // Quick Specialization Chips
  const chips = document.querySelectorAll(".ph-tag-chip[data-spec]");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const specVal = chip.getAttribute("data-spec");
      const specSelect = document.getElementById("docSpecialization");
      if (specSelect) {
        specSelect.value = specVal;
        executeSearch();
      }
    });
  });
}

/**
 * 4. Therapist Search Card Controller
 */
function initTherapistSearch() {
  const form = document.getElementById("therapistSearchForm");
  const searchBtn = document.getElementById("btnSearchTherapistsCard");

  // Sample verified therapists data matching therapy types
  const sampleTherapists = [
    {
      id: 1,
      name: "Sarah Jenkins, PT",
      type: "Physiotherapy",
      experience: "8 Years",
      location: "Jaipur, Rajasthan",
      rating: "4.9",
      timing: "9:00 AM - 1:00 PM"
    },
    {
      id: 2,
      name: "Marcus Miller, OTR/L",
      type: "Occupational Therapy",
      experience: "10 Years",
      location: "New York, NY",
      rating: "4.8",
      timing: "10:00 AM - 4:00 PM"
    },
    {
      id: 3,
      name: "Elena Rostova, SLP",
      type: "Speech Therapy",
      experience: "7 Years",
      location: "Boston, MA",
      rating: "5.0",
      timing: "1:00 PM - 5:00 PM"
    },
    {
      id: 4,
      name: "Dr. Alok Verma",
      type: "Rehabilitation Therapy",
      experience: "12 Years",
      location: "Jaipur, Rajasthan",
      rating: "4.9",
      timing: "8:30 AM - 3:30 PM"
    }
  ];

  function executeTherapistSearch(e) {
    if (e) e.preventDefault();

    const type = document.getElementById("therapistType")?.value || "";
    const loc = document.getElementById("therapistLocation")?.value || "";

    const matched = sampleTherapists.filter(t => {
      const matchType = !type || t.type.toLowerCase() === type.toLowerCase();
      const matchLoc = !loc || t.location.toLowerCase().includes(loc.toLowerCase());
      return matchType && matchLoc;
    });

    displayTherapistResults(matched.length > 0 ? matched : sampleTherapists, type, loc);
  }

  if (form) form.addEventListener("submit", executeTherapistSearch);
  if (searchBtn) searchBtn.addEventListener("click", executeTherapistSearch);
}

/**
 * Display Therapist Search Results in Interactive Modal
 */
function displayTherapistResults(therapists, selectedType, selectedLoc) {
  const modal = document.getElementById("therapistModal");
  const resultsContainer = document.getElementById("therapistResultsList");
  const titleEl = document.getElementById("therapistModalTitle");

  if (!modal || !resultsContainer) {
    // If modal element not found, navigate to therapists page
    window.location.href = `./therapists.html`;
    return;
  }

  if (titleEl) {
    titleEl.textContent = `Therapists Found (${therapists.length})`;
  }

  resultsContainer.innerHTML = therapists.map(t => `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
      <div>
        <div style="font-weight: 800; font-size: 15px; color: #103463;">${t.name}</div>
        <div style="display: flex; gap: 8px; margin-top: 4px; font-size: 12px; color: #64748b;">
          <span style="background: #ecfdf5; color: #059669; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${t.type}</span>
          <span>📍 ${t.location}</span>
          <span>⭐ ${t.rating}</span>
        </div>
      </div>
      <a href="./appointments.html" style="background: #059669; color: #ffffff; text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 700; border-radius: 8px; white-space: nowrap;">
        Book Session
      </a>
    </div>
  `).join("");

  modal.classList.add("open");
}

/**
 * 5. Quick Search Modal (Header search icon)
 */
function initQuickSearchModal() {
  const searchBtn = document.getElementById("btnNavSearch");
  const modal = document.getElementById("searchModal");
  const closeBtn = document.getElementById("searchModalClose");
  const input = document.getElementById("quickSearchInput");
  const resultsBox = document.getElementById("quickSearchResults");

  if (!searchBtn || !modal) return;

  searchBtn.addEventListener("click", () => {
    modal.classList.add("open");
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 100);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("open");
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
  });

  if (input && resultsBox) {
    const searchableItems = [
      { title: "Dr. Sarah Mitchell (Neurologist)", link: "./directory.html?specialization=Neurology", category: "Doctor" },
      { title: "Dr. Robert Chen (Physiotherapist)", link: "./directory.html?specialization=Physiotherapy", category: "Doctor" },
      { title: "Dr. Emily Rodriguez (Pediatrician)", link: "./directory.html?specialization=Pediatrics", category: "Doctor" },
      { title: "Book Therapy Appointment", link: "./appointments.html", category: "Appointments" },
      { title: "Occupational Therapy Services", link: "#services", category: "Services" },
      { title: "Speech & Communication Therapy", link: "#services", category: "Services" },
      { title: "Exercise Management & Routines", link: "./exercises.html", category: "Exercises" }
    ];

    input.addEventListener("input", () => {
      const val = input.value.trim().toLowerCase();
      if (!val) {
        resultsBox.innerHTML = `<div style="color: #94a3b8; font-size: 13px; padding: 10px 0;">Type to search doctors, therapists, services, or records...</div>`;
        return;
      }

      const matches = searchableItems.filter(i => i.title.toLowerCase().includes(val) || i.category.toLowerCase().includes(val));

      if (matches.length === 0) {
        resultsBox.innerHTML = `<div style="color: #64748b; font-size: 13px; padding: 12px 0;">No matching results found for "${escapeHtml(val)}".</div>`;
        return;
      }

      resultsBox.innerHTML = matches.map(m => `
        <a href="${m.link}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; text-decoration: none; color: #1e293b; background: #f8fafc; margin-bottom: 6px; transition: background 0.15s ease;">
          <span style="font-weight: 600; font-size: 13.5px;">${escapeHtml(m.title)}</span>
          <span style="font-size: 11px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 2px 8px; border-radius: 4px;">${m.category}</span>
        </a>
      `).join("");
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

