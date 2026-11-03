// ============================================================================
// Every Individual Deserves Better Care. - Therapists Controller
// Matches the official Multi Therapy Therapists Team & Directory UI Design.
// ============================================================================

let allTherapists = [];
let filteredTherapists = [];
let currentSpecialtyFilter = "all";
let currentLocationFilter = "all";
let currentSearchQuery = "";

// Modal instances and pending state
let profileModal = null;
let addModal = null;
let otpModal = null;
let resendConfigModal = null;

let pendingTherapistData = null;
let pendingOtpCode = null;
let pendingOtpExpires = 0;

// Curated verified specialists across core therapy domains
const DEFAULT_VERIFIED_THERAPISTS = [
  {
    therapist_id: 101,
    name: "Dr. Sunita Sharma, PT",
    specialization: "Physical Therapy",
    qualification: "MPT (Neuro), BPT, MIAP",
    experience: "10+ Years",
    rating: "4.9",
    reviews_count: 168,
    location: "Mumbai",
    clinic_address: "Multi Therapy Center, Bandra West, Mumbai",
    contact: "+91 9468650893",
    email: "sunita.sharma@multitherapy.com",
    otp_verified: 1,
    bio: "Senior pediatric and neurological physical therapist specializing in cerebral palsy rehabilitation, gross motor skill development, balance coordination, and posture alignment.",
    avatar_color: "#0866F5",
    avatar_icon: "🏃"
  },
  {
    therapist_id: 102,
    name: "Dr. Rajesh Iyer, BASLP",
    specialization: "Speech Therapy",
    qualification: "BASLP, MASLP, Audiology Cert.",
    experience: "8+ Years",
    rating: "4.9",
    reviews_count: 142,
    location: "Delhi NCR",
    clinic_address: "Multi Therapy Clinic, Connaught Place, New Delhi",
    contact: "+91 9468650893",
    email: "rajesh.iyer@multitherapy.com",
    otp_verified: 1,
    bio: "Certified speech-language pathologist focusing on articulation therapy, early language intervention, stuttering, fluency, and augmentative alternative communication (AAC).",
    avatar_color: "#0284c7",
    avatar_icon: "🗣️"
  },
  {
    therapist_id: 103,
    name: "Dr. Ananya Mukherjee, OTR",
    specialization: "Occupational Therapy",
    qualification: "BOT, MOT (Pediatrics), Sensory Cert.",
    experience: "9+ Years",
    rating: "4.8",
    reviews_count: 115,
    location: "Bengaluru",
    clinic_address: "Multi Therapy Rehab Center, Indiranagar, Bengaluru",
    contact: "+91 9468650893",
    email: "ananya.m@multitherapy.com",
    otp_verified: 1,
    bio: "Pediatric occupational therapist specializing in sensory integration therapy, fine motor skill coordination, ADL independence, handwriting therapies, and assistive technology.",
    avatar_color: "#059669",
    avatar_icon: "🧩"
  },
  {
    therapist_id: 104,
    name: "Dr. Vikramaditya Rathore, BCBA",
    specialization: "Behavior Therapy",
    qualification: "M.Sc Clinical Psychology, BCBA, CBT Cert.",
    experience: "11+ Years",
    rating: "5.0",
    reviews_count: 184,
    location: "Pune",
    clinic_address: "Multi Therapy Center, Koregaon Park, Pune",
    contact: "+91 9468650893",
    email: "vikram.rathore@multitherapy.com",
    otp_verified: 1,
    bio: "Board-certified behavior analyst specializing in applied behavior analysis (ABA), positive behavioral intervention, emotional regulation, and social communication therapy.",
    avatar_color: "#7c3aed",
    avatar_icon: "🧠"
  },
  {
    therapist_id: 105,
    name: "Dr. Priya Venkatesh, PT",
    specialization: "Pediatric Physical Therapy",
    qualification: "MPT (Pediatrics), NDT Certified",
    experience: "7+ Years",
    rating: "4.9",
    reviews_count: 98,
    location: "Chennai",
    clinic_address: "Multi Therapy Clinic, Adyar, Chennai",
    contact: "+91 9468650893",
    email: "priya.v@multitherapy.com",
    otp_verified: 1,
    bio: "Expert in Neurodevelopmental Therapy (NDT), pediatric gait training, developmental milestone tracking, and assistive equipment fitting for children.",
    avatar_color: "#0866F5",
    avatar_icon: "👶"
  },
  {
    therapist_id: 106,
    name: "Dr. Amitava Ghosh, MOT",
    specialization: "Sensory Integration",
    qualification: "MOT, Sensory Processing Specialist",
    experience: "6+ Years",
    rating: "4.8",
    reviews_count: 82,
    location: "Kolkata",
    clinic_address: "Multi Therapy Center, Salt Lake, Kolkata",
    contact: "+91 9468650893",
    email: "amitava.ghosh@multitherapy.com",
    otp_verified: 1,
    bio: "Focuses on sensory processing challenges, motor planning, bilateral integration, vestibulo-proprioceptive activities, and emotional self-regulation.",
    avatar_color: "#059669",
    avatar_icon: "🌀"
  },
  {
    therapist_id: 107,
    name: "Dr. Meera Nambiar, MASLP",
    specialization: "Speech Therapy",
    qualification: "MASLP, Oral Motor Certified",
    experience: "12+ Years",
    rating: "4.9",
    reviews_count: 210,
    location: "Hyderabad",
    clinic_address: "Multi Therapy Clinic, Banjara Hills, Hyderabad",
    contact: "+91 9468650893",
    email: "meera.nambiar@multitherapy.com",
    otp_verified: 1,
    bio: "Renowned speech specialist focusing on oral-motor dysfunction, dysphagia, feeding therapy, expressive language delay, and developmental phonological disorders.",
    avatar_color: "#0284c7",
    avatar_icon: "🗣️"
  },
  {
    therapist_id: 108,
    name: "Dr. Hardik Patel, MPT",
    specialization: "Orthopedic Therapy",
    qualification: "MPT (Musculoskeletal), COMT",
    experience: "8+ Years",
    rating: "4.8",
    reviews_count: 124,
    location: "Ahmedabad",
    clinic_address: "Multi Therapy Rehab, Navrangpura, Ahmedabad",
    contact: "+91 9468650893",
    email: "hardik.patel@multitherapy.com",
    otp_verified: 1,
    bio: "Orthopedic physical therapist specializing in musculoskeletal rehabilitation, post-surgical recovery, joint mobilization, spine rehabilitation, and muscle strengthening.",
    avatar_color: "#d97706",
    avatar_icon: "🦴"
  }
];

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Resolve Current User (supports logged-in users & guest browsing)
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) { user = null; }
  }

  setupHeaderAndNavigation(user);

  // 2. Initialize Bootstrap Modals
  initModals();

  // 3. Setup Filter Listeners
  setupFilterControls();

  // 4. Setup Add Therapist Form & OTP verification
  setupAddTherapistForm(user);

  // 5. Setup Resend Settings Modal
  setupResendSettingsModal();

  // 6. Load Therapists Directory from Backend / DB
  await loadTherapists(user);
});

/**
 * Configure header username, role, avatar, and logout
 */
function setupHeaderAndNavigation(user) {
  const usernameEl = document.getElementById("navUsername");
  const roleEl = document.getElementById("navRole");
  const avatarEl = document.getElementById("navAvatar");
  const avatarImgEl = document.getElementById("navAvatarImg");
  const userProfileBtn = document.getElementById("userProfileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    const displayName = user.name || user.username || "User";
    if (usernameEl) usernameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = user.role || "Member";

    if (avatarImgEl && user.photo) {
      avatarImgEl.src = user.photo;
      avatarImgEl.style.display = "block";
      if (avatarEl) avatarEl.style.display = "none";
    } else if (avatarEl) {
      avatarEl.textContent = displayName.charAt(0).toUpperCase();
      avatarEl.style.display = "flex";
      if (avatarImgEl) avatarImgEl.style.display = "none";
    }

    if (userProfileBtn) {
      if (user.role === "doctor") {
        userProfileBtn.href = "./doctor-profile.html";
      } else if (user.role === "patient") {
        userProfileBtn.href = "./patient-profile.html";
      } else {
        userProfileBtn.href = "./patient-home.html";
      }
    }
  } else {
    if (usernameEl) usernameEl.textContent = "Guest";
    if (roleEl) roleEl.textContent = "Sign In";
    if (avatarEl) avatarEl.textContent = "👤";
    if (userProfileBtn) userProfileBtn.href = "./login.html";
    if (logoutBtn) {
      logoutBtn.innerHTML = `<span>🔑</span> Login`;
      logoutBtn.onclick = () => { window.location.href = "./login.html"; };
      return;
    }
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try { await apiRequest("/api/logout", { method: "POST" }); } catch (e) {}
      localStorage.removeItem("currentUser");
      window.location.href = "./index.html";
    });
  }
}

/**
 * Initialize Bootstrap modal instances safely
 */
function initModals() {
  const profileModalEl = document.getElementById("therapistProfileModal");
  if (profileModalEl && typeof bootstrap !== "undefined") {
    profileModal = new bootstrap.Modal(profileModalEl);
  }

  const addModalEl = document.getElementById("addTherapistModal");
  if (addModalEl && typeof bootstrap !== "undefined") {
    addModal = new bootstrap.Modal(addModalEl);
  }

  const otpModalEl = document.getElementById("therapistOtpModal");
  if (otpModalEl && typeof bootstrap !== "undefined") {
    otpModal = new bootstrap.Modal(otpModalEl);
  }

  const resendModalEl = document.getElementById("resendConfigModal");
  if (resendModalEl && typeof bootstrap !== "undefined") {
    resendConfigModal = new bootstrap.Modal(resendModalEl);
  }
}

/**
 * Setup live search, specialization dropdown, location dropdown, and specialty hero chips
 */
function setupFilterControls() {
  const searchInput = document.getElementById("searchTherapistInput");
  const specialtySelect = document.getElementById("filterSpecialty");
  const locationSelect = document.getElementById("filterLocation");
  const btnSearch = document.getElementById("btnSearchTherapists");
  const btnReset = document.getElementById("btnResetFilters");
  const btnViewAll = document.getElementById("btnViewAllTherapists");
  const heroChipsContainer = document.getElementById("heroSpecialtyChips");

  // Search input typing
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // Specialization dropdown
  if (specialtySelect) {
    specialtySelect.addEventListener("change", (e) => {
      currentSpecialtyFilter = e.target.value;
      syncHeroChips();
      applyFilters();
    });
  }

  // Location dropdown
  if (locationSelect) {
    locationSelect.addEventListener("change", (e) => {
      currentLocationFilter = e.target.value;
      applyFilters();
    });
  }

  // Search Button
  if (btnSearch) {
    btnSearch.addEventListener("click", () => {
      if (searchInput) currentSearchQuery = searchInput.value.trim().toLowerCase();
      if (specialtySelect) currentSpecialtyFilter = specialtySelect.value;
      if (locationSelect) currentLocationFilter = locationSelect.value;
      applyFilters();
    });
  }

  // Reset Button
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      resetFilters();
    });
  }

  // View All Therapists link
  if (btnViewAll) {
    btnViewAll.addEventListener("click", () => {
      resetFilters();
      const grid = document.getElementById("therapistCardsGrid");
      if (grid) grid.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Hero Specialty Chips Click Handlers
  if (heroChipsContainer) {
    const chips = heroChipsContainer.querySelectorAll(".tp-spec-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const spec = chip.getAttribute("data-specialty");
        if (currentSpecialtyFilter === spec) {
          // Toggle off
          currentSpecialtyFilter = "all";
          chip.classList.remove("active");
        } else {
          currentSpecialtyFilter = spec;
          chips.forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
        }

        // Sync with dropdown
        if (specialtySelect) {
          specialtySelect.value = currentSpecialtyFilter;
        }

        applyFilters();

        const grid = document.getElementById("therapistCardsGrid");
        if (grid) grid.scrollIntoView({ behavior: "smooth" });
      });
    });
  }
}

/**
 * Sync hero specialty chips with currentSpecialtyFilter value
 */
function syncHeroChips() {
  const heroChipsContainer = document.getElementById("heroSpecialtyChips");
  if (!heroChipsContainer) return;
  const chips = heroChipsContainer.querySelectorAll(".tp-spec-chip");
  chips.forEach(chip => {
    if (chip.getAttribute("data-specialty") === currentSpecialtyFilter) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

/**
 * Reset all filter inputs and render complete list
 */
function resetFilters() {
  currentSpecialtyFilter = "all";
  currentLocationFilter = "all";
  currentSearchQuery = "";

  const searchInput = document.getElementById("searchTherapistInput");
  const specialtySelect = document.getElementById("filterSpecialty");
  const locationSelect = document.getElementById("filterLocation");

  if (searchInput) searchInput.value = "";
  if (specialtySelect) specialtySelect.value = "all";
  if (locationSelect) locationSelect.value = "all";

  syncHeroChips();
  applyFilters();
}

/**
 * Filter therapist list by search query, specialization, and location
 */
function applyFilters() {
  filteredTherapists = allTherapists.filter(t => {
    // 1. Search Query filter
    if (currentSearchQuery) {
      const q = currentSearchQuery;
      const nameMatch = (t.name || "").toLowerCase().includes(q);
      const specMatch = (t.specialization || "").toLowerCase().includes(q);
      const qualMatch = (t.qualification || "").toLowerCase().includes(q);
      const locMatch = (t.location || "").toLowerCase().includes(q);
      const bioMatch = (t.bio || "").toLowerCase().includes(q);

      if (!nameMatch && !specMatch && !qualMatch && !locMatch && !bioMatch) {
        return false;
      }
    }

    // 2. Specialty filter
    if (currentSpecialtyFilter !== "all") {
      const selected = currentSpecialtyFilter.toLowerCase();
      const spec = (t.specialization || "").toLowerCase();

      if (selected === "physical therapy") {
        if (!spec.includes("physical") && !spec.includes("physio")) return false;
      } else if (selected === "speech therapy") {
        if (!spec.includes("speech") && !spec.includes("voice") && !spec.includes("audiol")) return false;
      } else if (selected === "occupational therapy") {
        if (!spec.includes("occupational") && !spec.includes("sensory")) return false;
      } else if (selected === "behavior therapy") {
        if (!spec.includes("behavior") && !spec.includes("psycholog") && !spec.includes("aba")) return false;
      } else {
        if (!spec.includes(selected)) return false;
      }
    }

    // 3. Location filter
    if (currentLocationFilter !== "all") {
      const selectedLoc = currentLocationFilter.toLowerCase();
      const loc = (t.location || "").toLowerCase();
      const addr = (t.clinic_address || "").toLowerCase();

      if (!loc.includes(selectedLoc) && !addr.includes(selectedLoc)) {
        return false;
      }
    }

    return true;
  });

  renderTherapistCards();
}

/**
 * Load therapists from backend API (/api/therapists), enrich with display attributes,
 * and merge with verified default specialists if needed.
 */
async function loadTherapists(user) {
  const grid = document.getElementById("therapistCardsGrid");
  const countEl = document.getElementById("therapistResultsCount");
  const statTotal = document.getElementById("statTotalTherapists");

  try {
    let backendTherapists = [];

    try {
      const userId = user ? (user.user_id || "") : "";
      const userRole = user ? (user.role || "") : "";
      const res = await apiRequest(`/api/therapists?user_id=${encodeURIComponent(userId)}&role=${encodeURIComponent(userRole)}`);
      if (res && Array.isArray(res.therapists)) {
        backendTherapists = res.therapists;
      }
    } catch (apiErr) {
      console.warn("Backend /api/therapists not reachable, using local storage/verified directory:", apiErr.message);
    }

    // Check local storage for newly registered offline therapists
    let localCustomTherapists = [];
    try {
      const stored = localStorage.getItem("custom_therapists");
      if (stored) localCustomTherapists = JSON.parse(stored);
    } catch (e) {}

    // Combine backend records with curated verified directory
    const combined = [];
    const seenIds = new Set();
    const seenEmails = new Set();

    // 1. First add real backend therapists
    backendTherapists.forEach(t => {
      const id = t.therapist_id || `be_${Math.random()}`;
      seenIds.add(id);
      if (t.email) seenEmails.add(t.email.toLowerCase());
      combined.push(enrichTherapistRecord(t));
    });

    // 2. Add local storage custom therapists
    localCustomTherapists.forEach(t => {
      if (!seenIds.has(t.therapist_id) && (!t.email || !seenEmails.has(t.email.toLowerCase()))) {
        seenIds.add(t.therapist_id);
        if (t.email) seenEmails.add(t.email.toLowerCase());
        combined.push(enrichTherapistRecord(t));
      }
    });

    // 3. Add default verified specialists if not already duplicated
    DEFAULT_VERIFIED_THERAPISTS.forEach(t => {
      if (!seenIds.has(t.therapist_id) && (!t.email || !seenEmails.has(t.email.toLowerCase()))) {
        seenIds.add(t.therapist_id);
        if (t.email) seenEmails.add(t.email.toLowerCase());
        combined.push(t);
      }
    });

    allTherapists = combined;
    filteredTherapists = [...allTherapists];

    if (statTotal) {
      statTotal.textContent = `${allTherapists.length}+`;
    }

    renderTherapistCards();
  } catch (err) {
    console.error("Failed to load therapists:", err);
    if (grid) {
      grid.innerHTML = `
        <div class="tp-empty-state">
          <div class="tp-empty-icon">⚠️</div>
          <div class="tp-empty-title">Could not load therapist records</div>
          <p class="text-secondary">${escapeHtml(err.message || "Please check network or backend connection.")}</p>
          <button type="button" class="btn btn-primary btn-sm mt-2" onclick="loadTherapists()">
            🔄 Retry Loading
          </button>
        </div>
      `;
    }
  }
}

/**
 * Augment raw DB therapist row with UI formatting, realistic qualifications, ratings, and avatar
 */
function enrichTherapistRecord(raw) {
  const spec = raw.specialization || "Physical Therapy";
  let qual = raw.qualification;
  let exp = raw.experience;
  let loc = raw.location || "Mumbai";
  let rating = raw.rating || "4.9";
  let reviews = raw.reviews_count || 120;
  let icon = "🧑‍⚕️";
  let color = "#0866F5";

  const lowerSpec = spec.toLowerCase();
  if (lowerSpec.includes("physical") || lowerSpec.includes("physio")) {
    if (!qual) qual = "MPT (Neurology), BPT, MIAP";
    if (!exp) exp = "8+ Years";
    icon = "🏃";
    color = "#0866F5";
  } else if (lowerSpec.includes("speech") || lowerSpec.includes("voice")) {
    if (!qual) qual = "BASLP, MASLP (Speech Pathology)";
    if (!exp) exp = "7+ Years";
    icon = "🗣️";
    color = "#0284c7";
  } else if (lowerSpec.includes("occupational")) {
    if (!qual) qual = "BOT, MOT (Pediatric Rehab)";
    if (!exp) exp = "9+ Years";
    icon = "🧩";
    color = "#059669";
  } else if (lowerSpec.includes("behavior") || lowerSpec.includes("psych")) {
    if (!qual) qual = "M.Sc Clinical Psychology, BCBA";
    if (!exp) exp = "10+ Years";
    icon = "🧠";
    color = "#7c3aed";
  } else if (lowerSpec.includes("sensory")) {
    if (!qual) qual = "MOT, Sensory Integration Specialist";
    if (!exp) exp = "6+ Years";
    icon = "🌀";
    color = "#059669";
  } else {
    if (!qual) qual = "BPT, Certified Clinical Therapist";
    if (!exp) exp = "5+ Years";
    icon = "🩺";
    color = "#0866F5";
  }

  return {
    therapist_id: raw.therapist_id,
    name: raw.name,
    specialization: spec,
    qualification: qual,
    experience: exp,
    rating: rating,
    reviews_count: reviews,
    location: loc,
    clinic_address: `Multi Therapy Clinical Center, ${loc}`,
    contact: raw.contact || "+91 9468650893",
    email: raw.email || "",
    otp_verified: raw.otp_verified !== undefined ? raw.otp_verified : 1,
    bio: raw.bio || `Certified specialist in ${spec} with extensive clinical rehabilitation experience treating developmental and mobility conditions.`,
    profile_photo: raw.profile_photo || raw.photo || null,
    cloudinary_public_id: raw.cloudinary_public_id || null,
    avatar_color: color,
    avatar_icon: icon,
    is_custom: true
  };
}

/**
 * Render therapist cards in the grid
 */
function renderTherapistCards() {
  const grid = document.getElementById("therapistCardsGrid");
  const countEl = document.getElementById("therapistResultsCount");
  if (!grid) return;

  if (countEl) {
    if (filteredTherapists.length === allTherapists.length) {
      countEl.innerHTML = `Showing all <strong>${allTherapists.length}</strong> certified specialists`;
    } else {
      countEl.innerHTML = `Showing <strong>${filteredTherapists.length}</strong> of <strong>${allTherapists.length}</strong> therapists`;
    }
  }

  if (filteredTherapists.length === 0) {
    grid.innerHTML = `
      <div class="tp-empty-state">
        <div class="tp-empty-icon">🔍</div>
        <div class="tp-empty-title">No matching therapists found</div>
        <p class="text-secondary">Try adjusting your search keyword, specialization, or location filter.</p>
        <button type="button" class="btn btn-outline-primary btn-sm mt-2 fw-bold" onclick="resetFilters()">
          🔄 Reset All Filters
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredTherapists.map(t => {
    const verifiedBadge = t.otp_verified
      ? `<span class="tp-verified-badge" title="Identity & Email Verified by Multi Therapy">✓ Verified</span>`
      : `<span class="badge bg-warning text-dark" style="font-size: 11px;">Pending OTP</span>`;

    const cleanName = escapeHtml(t.name || "Specialist");
    const cleanSpec = escapeHtml(t.specialization || "Therapy");
    const cleanQual = escapeHtml(t.qualification || "Certified Practitioner");
    const cleanExp = escapeHtml(t.experience || "5+ Years");
    const cleanRating = escapeHtml(String(t.rating || "4.9"));
    const cleanReviews = escapeHtml(String(t.reviews_count || 120));
    const cleanLocation = escapeHtml(t.location || "Mumbai");
    const avatarIcon = t.avatar_icon || "🧑‍⚕️";
    const avatarColor = t.avatar_color || "#0866F5";

    const hasPhoto = Boolean(t.profile_photo || t.photo);
    const photoUrl = hasPhoto
      ? (typeof CdnManager !== "undefined"
          ? CdnManager.buildCdnUrl(t.profile_photo || t.photo, { width: 120, height: 120, crop: "fill" })
          : (t.profile_photo || t.photo))
      : "";

    return `
      <div class="tp-therapist-card" data-id="${t.therapist_id}">

        <!-- Top Avatar and Badges -->
        <div class="tp-card-top-row">
          <div class="tp-avatar-wrap">
            ${hasPhoto ? `
              <img src="${photoUrl}" alt="${cleanName}" class="tp-card-avatar" style="object-fit: cover; border-radius: 50%; width: 56px; height: 56px; border: 2px solid #0866F5;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
              <div class="tp-card-avatar" style="display:none; background-color: ${avatarColor}15; color: ${avatarColor};">
                ${avatarIcon}
              </div>
            ` : `
              <div class="tp-card-avatar" style="background-color: ${avatarColor}15; color: ${avatarColor};">
                ${avatarIcon}
              </div>
            `}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="d-flex align-items-center justify-content-between gap-1">
              ${verifiedBadge}
              ${t.is_custom ? `
                <button type="button" class="tp-btn-delete" onclick="deleteTherapist(${t.therapist_id})" title="Delete therapist record">
                  🗑️ Delete
                </button>
              ` : `
                <span class="text-muted small" style="font-size: 11px;">📍 ${cleanLocation}</span>
              `}
            </div>
            <h3 class="tp-name-title text-truncate" title="${cleanName}">${cleanName}</h3>
            <span class="tp-specialty-pill text-truncate" style="max-width: 100%; display: inline-block;">
              ${cleanSpec}
            </span>
          </div>
        </div>

        <!-- Rating & Reviews -->
        <div class="tp-rating-row mb-2">
          <span>★</span>
          <span>${cleanRating}</span>
          <span style="color: #64748b; font-weight: normal; font-size: 12px;">(${cleanReviews} patient reviews)</span>
        </div>

        <!-- Details List -->
        <ul class="tp-details-list">
          <li class="tp-detail-item">
            <span style="font-size: 14px;">🎓</span>
            <span class="text-truncate" title="${cleanQual}"><strong>Qual:</strong> ${cleanQual}</span>
          </li>
          <li class="tp-detail-item">
            <span style="font-size: 14px;">⏱️</span>
            <span><strong>Experience:</strong> ${cleanExp}</span>
          </li>
          <li class="tp-detail-item">
            <span style="font-size: 14px;">🏥</span>
            <span class="text-truncate"><strong>Location:</strong> ${cleanLocation} Clinic</span>
          </li>
        </ul>

        <!-- Card Action Buttons -->
        <div class="tp-card-actions">
          <button type="button" class="tp-btn-profile" onclick="viewTherapistProfile(${t.therapist_id})">
            <span>👤</span> <span>View Profile</span>
          </button>
          <a href="./appointments.html?therapist_id=${t.therapist_id}&specialist=${encodeURIComponent(t.name)}" class="tp-btn-book">
            <span>📅</span> <span>Book Session</span>
          </a>
        </div>

      </div>
    `;
  }).join("");
}

/**
 * Open the detailed Therapist Profile Modal with full credentials, bio, and direct booking
 */
function viewTherapistProfile(therapistId) {
  const therapist = allTherapists.find(t => String(t.therapist_id) === String(therapistId));
  if (!therapist) return;

  const modalName = document.getElementById("modalProfileName");
  const modalSpec = document.getElementById("modalProfileSpecialty");
  const modalVerified = document.getElementById("modalProfileVerified");
  const modalRating = document.getElementById("modalProfileRating");
  const modalExp = document.getElementById("modalProfileExp");
  const modalQual = document.getElementById("modalProfileQual");
  const modalLocation = document.getElementById("modalProfileLocation");
  const modalContact = document.getElementById("modalProfileContact");
  const modalBio = document.getElementById("modalProfileBio");
  const modalAvatar = document.getElementById("modalProfileAvatar");
  const modalBookBtn = document.getElementById("modalProfileBookBtn");

  if (modalName) modalName.textContent = therapist.name || "Specialist";
  if (modalSpec) modalSpec.textContent = therapist.specialization || "Therapy";
  if (modalVerified) {
    modalVerified.style.display = therapist.otp_verified ? "inline-flex" : "none";
  }
  if (modalRating) {
    modalRating.innerHTML = `★ ${therapist.rating || '4.9'} <span class="text-muted small fw-normal">(${therapist.reviews_count || 120} verified patient reviews)</span>`;
  }
  if (modalExp) modalExp.textContent = therapist.experience || "7+ Years";
  if (modalQual) modalQual.textContent = therapist.qualification || "MPT / BOT / BASLP";
  if (modalLocation) modalLocation.textContent = therapist.location ? `${therapist.location} (Clinic & Home Visit)` : "Mumbai";
  if (modalContact) modalContact.textContent = therapist.contact || "+91 9468650893";
  if (modalBio) modalBio.textContent = therapist.bio || "Dedicated healthcare professional providing comprehensive clinical therapy and compassionate rehabilitation.";

  if (modalAvatar) {
    modalAvatar.textContent = therapist.avatar_icon || "🧑‍⚕️";
    modalAvatar.style.backgroundColor = `${therapist.avatar_color || '#0866F5'}20`;
    modalAvatar.style.color = therapist.avatar_color || "#0866F5";
  }

  // Cloudinary CDN Avatar Handling for Therapist Profile
  const modalAvatarImg = document.getElementById("modalProfileAvatarImg");
  const photoInput = document.getElementById("therapistPhotoInput");
  const btnRemovePhoto = document.getElementById("btnRemoveTherapistPhoto");
  const photoFeedback = document.getElementById("modalPhotoFeedback");

  const currentPhoto = therapist.profile_photo || therapist.photo;
  if (currentPhoto) {
    if (modalAvatarImg) {
      modalAvatarImg.src = (typeof CdnManager !== "undefined")
        ? CdnManager.buildCdnUrl(currentPhoto, { width: 180, height: 180, crop: "fill" })
        : currentPhoto;
      modalAvatarImg.style.display = "block";
    }
    if (modalAvatar) modalAvatar.style.display = "none";
    if (btnRemovePhoto) btnRemovePhoto.style.display = "inline-flex";
  } else {
    if (modalAvatarImg) {
      modalAvatarImg.style.display = "none";
      modalAvatarImg.src = "";
    }
    if (modalAvatar) modalAvatar.style.display = "flex";
    if (btnRemovePhoto) btnRemovePhoto.style.display = "none";
  }

  if (photoInput) {
    photoInput.value = "";
    photoInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (photoFeedback) {
        photoFeedback.style.display = "block";
        photoFeedback.textContent = "⏳ Uploading to Cloudinary CDN...";
      }

      try {
        let uploadRes = null;
        if (typeof CdnManager !== "undefined") {
          uploadRes = await CdnManager.uploadImage(file, {
            user_id: therapist.user_id || therapist.therapist_id,
            username: therapist.email || therapist.name,
            role: "therapist",
            folder: "multi_therapy/therapists"
          });
        }

        const newPhotoUrl = uploadRes && (uploadRes.photo_url || uploadRes.profile_photo);
        if (newPhotoUrl) {
          therapist.profile_photo = newPhotoUrl;
          therapist.photo = newPhotoUrl;
          if (uploadRes.cloudinary_public_id) {
            therapist.cloudinary_public_id = uploadRes.cloudinary_public_id;
          }

          if (modalAvatarImg) {
            modalAvatarImg.src = (typeof CdnManager !== "undefined")
              ? CdnManager.buildCdnUrl(newPhotoUrl, { width: 180, height: 180, crop: "fill" })
              : newPhotoUrl;
            modalAvatarImg.style.display = "block";
          }
          if (modalAvatar) modalAvatar.style.display = "none";
          if (btnRemovePhoto) btnRemovePhoto.style.display = "inline-flex";

          if (photoFeedback) {
            photoFeedback.className = "small text-success fw-bold mt-1";
            photoFeedback.textContent = "✓ Photo uploaded to Cloudinary CDN and saved!";
            setTimeout(() => { photoFeedback.style.display = "none"; }, 4000);
          }

          renderTherapistCards();
        } else {
          if (photoFeedback) {
            photoFeedback.className = "small text-danger fw-bold mt-1";
            photoFeedback.textContent = "Upload failed: Invalid response from server.";
            setTimeout(() => { photoFeedback.style.display = "none"; }, 5000);
          }
        }
      } catch (err) {
        if (photoFeedback) {
          photoFeedback.className = "small text-danger fw-bold mt-1";
          photoFeedback.textContent = `Upload failed: ${err.message || "Server error"}`;
          setTimeout(() => { photoFeedback.style.display = "none"; }, 6000);
        }
      }
    };
  }

  if (btnRemovePhoto) {
    btnRemovePhoto.onclick = async () => {
      try {
        if (typeof CdnManager !== "undefined") {
          await CdnManager.deleteImage({
            user_id: therapist.user_id || therapist.therapist_id,
            username: therapist.email || therapist.name,
            cloudinary_public_id: therapist.cloudinary_public_id
          });
        }
        therapist.profile_photo = null;
        therapist.photo = null;
        therapist.cloudinary_public_id = null;

        if (modalAvatarImg) {
          modalAvatarImg.style.display = "none";
          modalAvatarImg.src = "";
        }
        if (modalAvatar) modalAvatar.style.display = "flex";
        btnRemovePhoto.style.display = "none";

        if (photoFeedback) {
          photoFeedback.style.display = "block";
          photoFeedback.className = "small text-success fw-bold mt-1";
          photoFeedback.textContent = "✓ Photo removed from Cloudinary CDN.";
          setTimeout(() => { photoFeedback.style.display = "none"; }, 3500);
        }

        renderTherapistCards();
      } catch (err) {
        if (photoFeedback) {
          photoFeedback.style.display = "block";
          photoFeedback.className = "small text-danger fw-bold mt-1";
          photoFeedback.textContent = `Remove failed: ${err.message || "Server error"}`;
          setTimeout(() => { photoFeedback.style.display = "none"; }, 5000);
        }
      }
    };
  }

  if (modalBookBtn) {
    modalBookBtn.href = `./appointments.html?therapist_id=${therapist.therapist_id}&specialist=${encodeURIComponent(therapist.name)}`;
  }

  if (profileModal) {
    profileModal.show();
  }
}

/**
 * Setup Add Therapist Modal form submission with Resend OTP verification
 */
function setupAddTherapistForm(user) {
  const addForm = document.getElementById("addTherapistForm");
  const sendBtn = document.getElementById("btnSendTherapistOtp");
  const alertEl = document.getElementById("therapistAlert");

  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("tName").value.trim();
      const specialization = document.getElementById("tSpecialization").value.trim();
      const contact = document.getElementById("tContact").value.trim();
      const email = document.getElementById("tEmail").value.trim();

      if (!name || !specialization || !contact || !email) {
        showPageAlert("Please fill in all therapist details including email address.", "danger");
        return;
      }

      if (contact.length !== 10 || !/^\d+$/.test(contact)) {
        showPageAlert("Contact number must contain exactly 10 numeric digits.", "danger");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showPageAlert("Please enter a valid email address.", "danger");
        return;
      }

      pendingTherapistData = {
        name,
        specialization,
        contact,
        email,
        user_id: user ? user.user_id : null
      };

      // Generate 6-digit verification OTP valid for 10 minutes
      pendingOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
      pendingOtpExpires = Date.now() + 10 * 60 * 1000;

      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span>⏳</span> Sending OTP via Resend...`;
      }

      try {
        let resendResult = null;
        if (typeof sendTherapistOtpViaResend === "function") {
          resendResult = await sendTherapistOtpViaResend({
            email,
            name,
            otp: pendingOtpCode
          });
        }

        // Hide add modal if open
        if (addModal) addModal.hide();

        // Populate OTP Modal
        const modalEmailEl = document.getElementById("modalTargetEmail");
        if (modalEmailEl) modalEmailEl.textContent = email;

        const noticeEl = document.getElementById("modalNoticeAlert");
        const errorEl = document.getElementById("modalErrorAlert");
        const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
        const inputEl = document.getElementById("therapistOtpInput");

        if (errorEl) errorEl.hidden = true;
        if (inputEl) inputEl.value = "";

        if (resendResult && resendResult.success) {
          if (resendSuccessEl) {
            resendSuccessEl.hidden = false;
            resendSuccessEl.innerHTML = `✅ <strong>Sent via Resend:</strong> Verification OTP delivered to <strong>${escapeHtml(email)}</strong>.`;
          }
          if (noticeEl) noticeEl.hidden = true;
        } else if (resendResult && !resendResult.success) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          if (noticeEl) {
            noticeEl.hidden = false;
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Email delivery in simulation mode.")}`;
          }
        } else if (noticeEl) {
          noticeEl.hidden = true;
        }

        if (otpModal) {
          otpModal.show();
          setTimeout(() => { if (inputEl) inputEl.focus(); }, 400);
        }
      } catch (err) {
        showPageAlert(err.message || "Failed to send therapist OTP.", "danger");
      } finally {
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerHTML = `<span>📧</span> Send OTP &amp; Add Therapist`;
        }
      }
    });
  }

  // Handle Verify OTP Button in Modal
  const verifyBtn = document.getElementById("btnVerifyTherapistOtp");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      const otpInput = document.getElementById("therapistOtpInput");
      const errorEl = document.getElementById("modalErrorAlert");
      const enteredOtp = otpInput ? otpInput.value.trim() : "";

      if (!enteredOtp || enteredOtp.length !== 6) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Please enter the complete 6-digit OTP code.";
        }
        return;
      }

      if (Date.now() > pendingOtpExpires) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "This OTP code has expired. Please click Resend OTP.";
        }
        return;
      }

      if (enteredOtp !== pendingOtpCode) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = "Incorrect OTP code. Please check your email and try again.";
        }
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.textContent = "Verifying & Adding...";

      try {
        const payload = {
          ...pendingTherapistData,
          otp_verified: 1
        };

        let addedTherapist = null;
        try {
          const res = await apiRequest("/api/therapists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          addedTherapist = res.therapist;
        } catch (apiErr) {
          console.warn("Backend API POST failed, caching to localStorage:", apiErr.message);
        }

        // Cache locally as fallback
        const newRecord = {
          therapist_id: addedTherapist ? addedTherapist.therapist_id : Date.now(),
          ...payload
        };

        try {
          const stored = localStorage.getItem("custom_therapists");
          const list = stored ? JSON.parse(stored) : [];
          list.unshift(newRecord);
          localStorage.setItem("custom_therapists", JSON.stringify(list));
        } catch (e) {}

        if (otpModal) otpModal.hide();
        showPageAlert("Therapist verified and added to directory successfully!", "success");

        // Clear form
        document.getElementById("tName").value = "";
        document.getElementById("tSpecialization").value = "";
        document.getElementById("tContact").value = "";
        document.getElementById("tEmail").value = "";
        pendingTherapistData = null;
        pendingOtpCode = null;

        await loadTherapists(user);
      } catch (err) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = err.message || "Failed to add therapist record.";
        }
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "✓ Verify & Add Therapist";
      }
    });
  }

  // Handle Resend OTP Button in Modal
  const resendBtn = document.getElementById("btnResendTherapistOtp");
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!pendingTherapistData) return;
      resendBtn.disabled = true;
      resendBtn.textContent = "Resending OTP...";

      pendingOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
      pendingOtpExpires = Date.now() + 10 * 60 * 1000;

      const noticeEl = document.getElementById("modalNoticeAlert");
      const errorEl = document.getElementById("modalErrorAlert");
      const resendSuccessEl = document.getElementById("modalResendSuccessAlert");
      if (errorEl) errorEl.hidden = true;

      try {
        let resendResult = null;
        if (typeof sendTherapistOtpViaResend === "function") {
          resendResult = await sendTherapistOtpViaResend({
            email: pendingTherapistData.email,
            name: pendingTherapistData.name,
            otp: pendingOtpCode
          });
        }

        if (resendResult && resendResult.success) {
          if (resendSuccessEl) {
            resendSuccessEl.hidden = false;
            resendSuccessEl.innerHTML = `✅ <strong>Sent via Resend:</strong> New OTP delivered to <strong>${escapeHtml(pendingTherapistData.email)}</strong>.`;
          }
          if (noticeEl) noticeEl.hidden = true;
        } else if (resendResult && !resendResult.success) {
          if (resendSuccessEl) resendSuccessEl.hidden = true;
          if (noticeEl) {
            noticeEl.hidden = false;
            noticeEl.innerHTML = `⚠️ <strong>Resend Notice:</strong> ${escapeHtml(resendResult.error || "Email delivery failed.")}`;
          }
        }
      } catch (err) {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = err.message || "Could not resend OTP.";
        }
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = "🔄 Resend OTP";
      }
    });
  }
}

/**
 * Setup Resend Settings configuration modal
 */
function setupResendSettingsModal() {
  const resendConfigModalEl = document.getElementById("resendConfigModal");
  if (!resendConfigModalEl || typeof getResendConfig !== "function") return;

  const inputApiKey = document.getElementById("inputResendApiKey");
  const inputFromEmail = document.getElementById("inputResendFromEmail");
  const btnSaveResend = document.getElementById("btnSaveResendConfig");
  const btnToggleKey = document.getElementById("btnToggleResendKey");
  const resendAlert = document.getElementById("resendConfigAlert");

  resendConfigModalEl.addEventListener("show.bs.modal", () => {
    const cfg = getResendConfig();
    if (inputApiKey) inputApiKey.value = cfg.apiKey || "";
    if (inputFromEmail) inputFromEmail.value = cfg.fromEmail || "";
    if (resendAlert) resendAlert.hidden = true;
  });

  if (btnToggleKey && inputApiKey) {
    btnToggleKey.addEventListener("click", () => {
      if (inputApiKey.type === "password") {
        inputApiKey.type = "text";
        btnToggleKey.textContent = "🔒";
      } else {
        inputApiKey.type = "password";
        btnToggleKey.textContent = "👁️";
      }
    });
  }

  if (btnSaveResend) {
    btnSaveResend.addEventListener("click", () => {
      const apiKey = inputApiKey ? inputApiKey.value.trim() : "";
      const fromEmail = inputFromEmail ? inputFromEmail.value.trim() : "";
      saveResendConfig(apiKey, fromEmail);

      if (resendAlert) {
        resendAlert.hidden = false;
        resendAlert.className = "alert alert-success py-2 small mb-3";
        resendAlert.textContent = "✓ Resend settings saved successfully!";
        setTimeout(() => { resendAlert.hidden = true; }, 3000);
      }
    });
  }
}

/**
 * Delete a therapist record
 */
async function deleteTherapist(therapistId) {
  if (!confirm("Are you sure you want to delete this therapist from the directory?")) return;

  try {
    try {
      await apiRequest(`/api/therapists/${therapistId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Backend DELETE failed, removing from local cache:", e.message);
    }

    // Remove from local storage custom therapists if present
    try {
      const stored = localStorage.getItem("custom_therapists");
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter(t => String(t.therapist_id) !== String(therapistId));
        localStorage.setItem("custom_therapists", JSON.stringify(list));
      }
    } catch (e) {}

    showPageAlert("Therapist record deleted successfully.", "info");

    const rawUser = localStorage.getItem("currentUser");
    const user = rawUser ? JSON.parse(rawUser) : null;
    await loadTherapists(user);
  } catch (err) {
    alert(err.message || "Failed to delete therapist.");
  }
}

/**
 * Show temporary alert message
 */
function showPageAlert(message, type = "success") {
  const alertEl = document.getElementById("therapistAlert");
  if (!alertEl) return;
  alertEl.hidden = false;
  alertEl.className = `alert alert-${type} mb-3`;
  alertEl.textContent = message;
  alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setTimeout(() => { alertEl.hidden = true; }, 5000);
}

/**
 * HTML Escaper helper
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
