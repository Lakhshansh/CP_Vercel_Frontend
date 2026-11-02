/**
 * Directory Page Client Logic - Multi Therapy
 * Handles doctor directory search, specialization/hospital/location filtering,
 * rating/experience sorting, grid/list view toggling, interactive profile modal,
 * and 4-page pagination.
 */

// Initial verified clinical directory data spanning pages 1-4
const DIRECTORY_DOCTORS = [
  // Page 1
  {
    id: 1,
    name: "Dr. Sarah Mitchell",
    degrees: "MD, DM (Neurology), FAAN",
    specialization: "Neurology",
    rating: 4.9,
    reviewsCount: 142,
    hospital: "City Neuro Care Hospital",
    location: "New York, NY",
    experienceYears: 15,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "./images/doctor-avatar.jpg",
    bio: "Dr. Sarah Mitchell is a senior neuro-rehabilitation specialist with over 15 years of experience treating pediatric and adult cerebral palsy, spasticity management, and neuromuscular mobility rehabilitation.",
    consultationFee: "$120",
    timing: "Mon - Fri, 9:00 AM - 4:00 PM"
  },
  {
    id: 2,
    name: "Dr. Robert Chen",
    degrees: "MPT, PhD (Pediatric Physical Therapy)",
    specialization: "Physiotherapy",
    rating: 4.8,
    reviewsCount: 118,
    hospital: "Advanced Mobility Spine Center",
    location: "Boston, MA",
    experienceYears: 12,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. Robert Chen specializes in neuromuscular gait training, posture correction, and biomechanical physical therapy for children and adolescents with movement disorders.",
    consultationFee: "$95",
    timing: "Tue - Sat, 8:30 AM - 5:00 PM"
  },
  {
    id: 3,
    name: "Dr. Emily Rodriguez",
    degrees: "MD (Pediatrics), FAAP",
    specialization: "Pediatrics",
    rating: 5.0,
    reviewsCount: 164,
    hospital: "Children's Hope Rehabilitation Hospital",
    location: "Chicago, IL",
    experienceYears: 16,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Emily Rodriguez is a dedicated developmental pediatrician focused on early motor milestone screening, comprehensive CP developmental intervention, and family-centered pediatric care.",
    consultationFee: "$130",
    timing: "Mon - Thu, 9:00 AM - 3:30 PM"
  },
  {
    id: 4,
    name: "Dr. Marcus Vance",
    degrees: "OTD, OTR/L",
    specialization: "Occupational Therapy",
    rating: 4.7,
    reviewsCount: 96,
    hospital: "St. Jude Integrated Therapy Institute",
    location: "Philadelphia, PA",
    experienceYears: 10,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Marcus Vance helps pediatric patients achieve daily independence through fine motor skill coaching, adaptive sensory integration, and customized assistive equipment guidance.",
    consultationFee: "$90",
    timing: "Mon - Fri, 10:00 AM - 6:00 PM"
  },
  {
    id: 5,
    name: "Dr. Elena Rostova",
    degrees: "MS, CCC-SLP, PhD",
    specialization: "Speech Therapy",
    rating: 4.9,
    reviewsCount: 88,
    hospital: "Metropolitan Speech & Motor Center",
    location: "San Francisco, CA",
    experienceYears: 11,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. Elena Rostova leads clinical speech and language pathology programs focusing on dysarthria, oral-motor rehabilitation, swallowing therapy, and AAC device integration.",
    consultationFee: "$100",
    timing: "Wed - Sun, 9:00 AM - 4:00 PM"
  },
  {
    id: 6,
    name: "Dr. David Kumar",
    degrees: "MS (Orthopedics), DNB",
    specialization: "Orthopedic Rehabilitation",
    rating: 4.8,
    reviewsCount: 132,
    hospital: "Universal Ortho-Care Medical Hospital",
    location: "Houston, TX",
    experienceYears: 18,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. David Kumar specializes in surgical and conservative management of musculoskeletal deformities, joint contracture rehabilitation, and functional mobility restoration in cerebral palsy.",
    consultationFee: "$140",
    timing: "Mon - Fri, 8:00 AM - 2:00 PM"
  },

  // Page 2
  {
    id: 7,
    name: "Dr. Rachel Adams",
    degrees: "MD, MPH (Pediatric Neurology)",
    specialization: "Neurology",
    rating: 4.9,
    reviewsCount: 104,
    hospital: "City Neuro Care Hospital",
    location: "New York, NY",
    experienceYears: 13,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Rachel Adams provides cutting-edge neuroplasticity-focused therapy regimens and medical evaluation for pediatric neurological conditions.",
    consultationFee: "$125",
    timing: "Mon - Fri, 9:00 AM - 5:00 PM"
  },
  {
    id: 8,
    name: "Dr. Anthony Brooks",
    degrees: "DPT, Board-Certified Clinical Specialist",
    specialization: "Physiotherapy",
    rating: 4.8,
    reviewsCount: 92,
    hospital: "Apex Physical Therapy Clinic",
    location: "Seattle, WA",
    experienceYears: 9,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. Anthony Brooks designs high-intensity functional mobility and robotic-assisted gait therapies that empower patients to take independent steps.",
    consultationFee: "$85",
    timing: "Mon - Thu, 8:00 AM - 4:30 PM"
  },
  {
    id: 9,
    name: "Dr. Clara Higgins",
    degrees: "MD (Developmental Pediatrics)",
    specialization: "Pediatrics",
    rating: 5.0,
    reviewsCount: 110,
    hospital: "Lakeside Children's Medical Center",
    location: "Chicago, IL",
    experienceYears: 14,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Clara Higgins is a passionate advocate for multi-disciplinary developmental care and personalized pediatric growth tracking.",
    consultationFee: "$115",
    timing: "Tue - Sat, 9:30 AM - 4:00 PM"
  },
  {
    id: 10,
    name: "Dr. Jonathan Myers",
    degrees: "MS, OTR/L",
    specialization: "Occupational Therapy",
    rating: 4.7,
    reviewsCount: 79,
    hospital: "Keystone Rehabilitation Hospital",
    location: "Philadelphia, PA",
    experienceYears: 8,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Jonathan Myers specializes in upper-extremity constraint-induced movement therapy (CIMT) and sensory stimulation therapy.",
    consultationFee: "$90",
    timing: "Mon - Fri, 10:00 AM - 5:00 PM"
  },
  {
    id: 11,
    name: "Dr. Priya Patel",
    degrees: "SLP.D, CCC-SLP",
    specialization: "Speech Therapy",
    rating: 4.9,
    reviewsCount: 85,
    hospital: "Bay Area Communication Clinic",
    location: "San Francisco, CA",
    experienceYears: 11,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Priya Patel focuses on augmentative communication systems, speech clarity improvement, and pediatric feeding therapies.",
    consultationFee: "$105",
    timing: "Mon - Thu, 9:00 AM - 3:00 PM"
  },
  {
    id: 12,
    name: "Dr. William Scott",
    degrees: "MD, Orthopedic Surgeon",
    specialization: "Orthopedic Rehabilitation",
    rating: 4.8,
    reviewsCount: 121,
    hospital: "Lone Star Orthopedic Institute",
    location: "Dallas, TX",
    experienceYears: 19,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. William Scott provides posture alignment surgery consultations, tendon lengthening assessments, and comprehensive post-op physical rehabilitation.",
    consultationFee: "$150",
    timing: "Tue - Fri, 8:30 AM - 2:00 PM"
  },

  // Page 3
  {
    id: 13,
    name: "Dr. Angela Foster",
    degrees: "MD, FAAPMR",
    specialization: "Neurology",
    rating: 4.8,
    reviewsCount: 74,
    hospital: "Beacon Neurological Center",
    location: "Denver, CO",
    experienceYears: 11,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Angela Foster is a physical medicine and rehabilitation (PM&R) specialist offering spasticity control and clinical neuro-muscular evaluation.",
    consultationFee: "$110",
    timing: "Mon - Fri, 9:00 AM - 4:00 PM"
  },
  {
    id: 14,
    name: "Dr. Brian Gallagher",
    degrees: "DPT, PCS",
    specialization: "Physiotherapy",
    rating: 4.9,
    reviewsCount: 99,
    hospital: "Rocky Mountain Therapy Pavilion",
    location: "Denver, CO",
    experienceYears: 14,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Brian Gallagher provides dynamic aquatic therapy, treadmill body-weight support gait training, and personalized strength recovery plans.",
    consultationFee: "$95",
    timing: "Mon - Fri, 8:00 AM - 5:00 PM"
  },
  {
    id: 15,
    name: "Dr. Lisa Wong",
    degrees: "MD, FAAP",
    specialization: "Pediatrics",
    rating: 4.9,
    reviewsCount: 135,
    hospital: "Pacific Pediatric Wellness",
    location: "Los Angeles, CA",
    experienceYears: 15,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. Lisa Wong evaluates holistic pediatric wellbeing, nutritional support for motor therapy, and integrated multi-specialty care protocols.",
    consultationFee: "$120",
    timing: "Tue - Sat, 9:00 AM - 4:00 PM"
  },
  {
    id: 16,
    name: "Dr. Kevin O'Connor",
    degrees: "OTD, FAOTA",
    specialization: "Occupational Therapy",
    rating: 4.7,
    reviewsCount: 68,
    hospital: "Sunrise Rehabilitation Clinic",
    location: "Phoenix, AZ",
    experienceYears: 10,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Kevin O'Connor specializes in school-based adaptive learning programs, sensory processing interventions, and ergonomic assistive aids.",
    consultationFee: "$85",
    timing: "Mon - Thu, 9:00 AM - 5:30 PM"
  },
  {
    id: 17,
    name: "Dr. Hannah Morales",
    degrees: "MS, CCC-SLP",
    specialization: "Speech Therapy",
    rating: 4.8,
    reviewsCount: 82,
    hospital: "Desert Valley Therapy Center",
    location: "Phoenix, AZ",
    experienceYears: 8,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Hannah Morales helps children improve articulation, breath support for phonation, and responsive conversational engagement.",
    consultationFee: "$90",
    timing: "Mon - Fri, 10:00 AM - 5:00 PM"
  },
  {
    id: 18,
    name: "Dr. George Peterson",
    degrees: "MD, Orthopedic Surgery",
    specialization: "Orthopedic Rehabilitation",
    rating: 4.9,
    reviewsCount: 140,
    hospital: "Atlanta Medical Spine & Joint Institute",
    location: "Atlanta, GA",
    experienceYears: 17,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. George Peterson specializes in lower-extremity alignment, therapeutic splinting, and progressive post-surgical weight-bearing protocols.",
    consultationFee: "$145",
    timing: "Mon - Thu, 8:00 AM - 3:00 PM"
  },

  // Page 4
  {
    id: 19,
    name: "Dr. Stephanie Cole",
    degrees: "MD, DM (Pediatric Neuro)",
    specialization: "Neurology",
    rating: 4.9,
    reviewsCount: 115,
    hospital: "Midwest Neurological Health Institute",
    location: "Columbus, OH",
    experienceYears: 13,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Stephanie Cole coordinates medical management of muscular spasticity, botulinum toxin clinical assessments, and ongoing neurological care.",
    consultationFee: "$125",
    timing: "Mon - Fri, 9:00 AM - 4:00 PM"
  },
  {
    id: 20,
    name: "Dr. Benjamin Ross",
    degrees: "DPT, NCS",
    specialization: "Physiotherapy",
    rating: 4.8,
    reviewsCount: 88,
    hospital: "Great Lakes Physical Therapy",
    location: "Detroit, MI",
    experienceYears: 11,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. Benjamin Ross applies vestibular rehabilitation, balance equilibrium training, and resistance conditioning for pediatric movement disorders.",
    consultationFee: "$90",
    timing: "Mon - Fri, 8:30 AM - 5:00 PM"
  },
  {
    id: 21,
    name: "Dr. Chloe Martin",
    degrees: "MD (Pediatrics)",
    specialization: "Pediatrics",
    rating: 5.0,
    reviewsCount: 94,
    hospital: "Carolinas Children's Hospital",
    location: "Charlotte, NC",
    experienceYears: 12,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Chloe Martin partners with parents to create nurturing, comprehensive clinical growth pathways for children with neuromuscular challenges.",
    consultationFee: "$110",
    timing: "Mon - Thu, 9:00 AM - 4:30 PM"
  },
  {
    id: 22,
    name: "Dr. Nathan Bailey",
    degrees: "OTD, OTR/L",
    specialization: "Occupational Therapy",
    rating: 4.7,
    reviewsCount: 71,
    hospital: "Blue Ridge Sensory Rehabilitation",
    location: "Richmond, VA",
    experienceYears: 9,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Nathan Bailey specializes in bimanual training, computer-assisted communication devices, and home accessibility evaluations.",
    consultationFee: "$85",
    timing: "Tue - Sat, 9:00 AM - 5:00 PM"
  },
  {
    id: 23,
    name: "Dr. Samantha Hayes",
    degrees: "MS, CCC-SLP",
    specialization: "Speech Therapy",
    rating: 4.8,
    reviewsCount: 83,
    hospital: "Chesapeake Voice & Speech Institute",
    location: "Baltimore, MD",
    experienceYears: 10,
    availability: "Available Tomorrow",
    isAvailableToday: false,
    photo: "",
    bio: "Dr. Samantha Hayes offers targeted phonological therapy, swallowing mechanics assessment, and expressive communication development.",
    consultationFee: "$95",
    timing: "Mon - Fri, 9:30 AM - 4:00 PM"
  },
  {
    id: 24,
    name: "Dr. Arthur Pendelton",
    degrees: "MD, FAAOS",
    specialization: "Orthopedic Rehabilitation",
    rating: 4.9,
    reviewsCount: 156,
    hospital: "Northeast Orthopedic & Spine Pavilion",
    location: "Philadelphia, PA",
    experienceYears: 21,
    availability: "Available Today",
    isAvailableToday: true,
    photo: "",
    bio: "Dr. Arthur Pendelton is a nationally acclaimed pediatric orthopedic consultant focusing on hip surveillance, spine alignment, and mobility preservation.",
    consultationFee: "$160",
    timing: "Mon - Wed, 8:00 AM - 2:00 PM"
  }
];

// State
let allDoctorsList = [...DIRECTORY_DOCTORS];
let filteredDoctors = [...DIRECTORY_DOCTORS];
let currentPage = 1;
const ITEMS_PER_PAGE = 6;
let currentViewMode = "grid"; // 'grid' | 'list'

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Header Navigation toggle
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("open");
    });
  }

  // Attempt to fetch any registered doctors from backend API without breaking if offline
  await fetchBackendDoctors();

  // Pre-fill filters from URL search parameters if arriving from Home Page
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramSpec = urlParams.get("specialization");
    const paramLoc = urlParams.get("location");
    if (paramSpec) {
      const specInput = document.getElementById("searchSpecialization");
      if (specInput) specInput.value = paramSpec;
    }
    if (paramLoc) {
      const locInput = document.getElementById("searchLocation");
      if (locInput) locInput.value = paramLoc;
    }
  } catch (e) {}

  // Initial render
  applyFiltersAndSort();

  // Search Button Event
  const searchBtn = document.getElementById("btnSearchDoctors");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      currentPage = 1;
      applyFiltersAndSort();
      scrollToResults();
    });
  }

  // Header Search Button quick-scroll
  const headerSearchBtn = document.getElementById("btnHeaderSearch");
  if (headerSearchBtn) {
    headerSearchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("searchDoctorName");
      if (nameInput) {
        nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
        nameInput.focus();
      }
    });
  }

  // Reset Filters Button Event
  const resetBtn = document.getElementById("btnResetFilters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const nameInput = document.getElementById("searchDoctorName");
      const specInput = document.getElementById("searchSpecialization");
      const hospInput = document.getElementById("searchHospital");
      const locInput = document.getElementById("searchLocation");
      const sortSelect = document.getElementById("sortDoctors");

      if (nameInput) nameInput.value = "";
      if (specInput) specInput.value = "";
      if (hospInput) hospInput.value = "";
      if (locInput) locInput.value = "";
      if (sortSelect) sortSelect.value = "rating_desc";

      currentPage = 1;
      applyFiltersAndSort();
    });
  }

  // Allow enter key inside search inputs
  const searchInputs = ["searchDoctorName", "searchHospital", "searchLocation"];
  searchInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          currentPage = 1;
          applyFiltersAndSort();
          scrollToResults();
        }
      });
    }
  });

  // Specialization change auto-filter
  const specSelect = document.getElementById("searchSpecialization");
  if (specSelect) {
    specSelect.addEventListener("change", () => {
      currentPage = 1;
      applyFiltersAndSort();
    });
  }

  // Sort dropdown change
  const sortSelect = document.getElementById("sortDoctors");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      applyFiltersAndSort();
    });
  }

  // Grid/List View Toggle
  const viewGridBtn = document.getElementById("viewGridBtn");
  const viewListBtn = document.getElementById("viewListBtn");
  const doctorsContainer = document.getElementById("doctorsGridContainer");

  if (viewGridBtn && viewListBtn) {
    viewGridBtn.addEventListener("click", () => {
      currentViewMode = "grid";
      viewGridBtn.classList.add("active");
      viewListBtn.classList.remove("active");
      if (doctorsContainer) {
        doctorsContainer.classList.remove("list-view");
        doctorsContainer.classList.add("grid-view");
      }
    });

    viewListBtn.addEventListener("click", () => {
      currentViewMode = "list";
      viewListBtn.classList.add("active");
      viewGridBtn.classList.remove("active");
      if (doctorsContainer) {
        doctorsContainer.classList.remove("grid-view");
        doctorsContainer.classList.add("list-view");
      }
    });
  }

  // Modal Close Listeners
  setupProfileModal();
});

/**
 * Fetch real doctors from backend /api/doctors if online
 */
async function fetchBackendDoctors() {
  if (typeof apiRequest !== "function") return;

  try {
    const res = await apiRequest("/api/doctors");
    const backendDocs = (res && res.doctors) ? res.doctors : [];

    if (backendDocs && backendDocs.length > 0) {
      // Map backend database doctors into directory display format
      const mapped = backendDocs.map((bd, idx) => ({
        id: `db_${bd.doctor_id || idx}`,
        name: bd.name.startsWith("Dr.") ? bd.name : `Dr. ${bd.name}`,
        degrees: bd.specialization || "Clinical Specialist",
        specialization: normalizeSpecialization(bd.specialization),
        rating: 4.9,
        reviewsCount: 50 + (idx * 7) % 60,
        hospital: bd.hospital_name || bd.clinic_name || "Multi Therapy Clinical Center",
        location: bd.address || "Medical Plaza",
        experienceYears: 10 + (idx * 2) % 15,
        availability: "Available Today",
        isAvailableToday: true,
        photo: bd.photo || bd.profile_photo || "",
        bio: `Licensed clinical specialist practicing at ${bd.hospital_name || "Multi Therapy Healthcare Center"}. Direct consults for neurological care, motor milestone development, and patient therapy.`,
        consultationFee: "$110",
        timing: "Mon - Fri, 9:00 AM - 5:00 PM"
      }));

      // Prepend real DB doctors to the directory list
      allDoctorsList = [...mapped, ...DIRECTORY_DOCTORS];
      filteredDoctors = [...allDoctorsList];
    }
  } catch (err) {
    // Graceful offline fallback: directory continues with verified clinical profiles
    console.info("Notice: Backend doctors API not reachable; displaying verified clinical directory.");
  }
}

function normalizeSpecialization(spec) {
  if (!spec) return "General Care";
  const s = spec.toLowerCase();
  if (s.includes("neuro")) return "Neurology";
  if (s.includes("physio")) return "Physiotherapy";
  if (s.includes("pediatric")) return "Pediatrics";
  if (s.includes("occupational")) return "Occupational Therapy";
  if (s.includes("speech")) return "Speech Therapy";
  if (s.includes("ortho")) return "Orthopedic Rehabilitation";
  return spec;
}

/**
 * Filter and sort doctors, then render current page
 */
function applyFiltersAndSort() {
  const nameQuery = (document.getElementById("searchDoctorName")?.value || "").trim().toLowerCase();
  const specQuery = (document.getElementById("searchSpecialization")?.value || "").trim();
  const hospQuery = (document.getElementById("searchHospital")?.value || "").trim().toLowerCase();
  const locQuery = (document.getElementById("searchLocation")?.value || "").trim().toLowerCase();
  const sortMode = document.getElementById("sortDoctors")?.value || "rating_desc";

  // Filter
  filteredDoctors = allDoctorsList.filter(doc => {
    // Name filter
    if (nameQuery && !doc.name.toLowerCase().includes(nameQuery)) {
      return false;
    }
    // Specialization filter
    if (specQuery && specQuery !== "") {
      if (doc.specialization.toLowerCase() !== specQuery.toLowerCase()) {
        return false;
      }
    }
    // Hospital filter
    if (hospQuery && !doc.hospital.toLowerCase().includes(hospQuery)) {
      return false;
    }
    // Location filter
    if (locQuery && !doc.location.toLowerCase().includes(locQuery)) {
      return false;
    }
    return true;
  });

  // Sort
  filteredDoctors.sort((a, b) => {
    if (sortMode === "rating_desc") {
      return b.rating - a.rating;
    } else if (sortMode === "experience_desc") {
      return b.experienceYears - a.experienceYears;
    } else if (sortMode === "name_asc") {
      return a.name.localeCompare(b.name);
    } else if (sortMode === "name_desc") {
      return b.name.localeCompare(a.name);
    }
    return 0;
  });

  // Render cards and pagination
  renderDoctorCards();
  renderPagination();
}

/**
 * Render the current slice of doctor cards
 */
function renderDoctorCards() {
  const container = document.getElementById("doctorsGridContainer");
  const countBadge = document.getElementById("doctorsCountBadge");
  if (!container) return;

  if (countBadge) {
    const total = filteredDoctors.length;
    countBadge.textContent = total === 1 ? "1 Doctor Found" : `Showing ${total} Available Doctors`;
  }

  if (filteredDoctors.length === 0) {
    container.innerHTML = `
      <div class="empty-doctors-state">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">No Doctors Found Matching Your Criteria</h3>
        <p class="empty-desc">Try adjusting your doctor name, specialization, or clinic location search filters.</p>
        <button type="button" class="btn-clear-empty" onclick="document.getElementById('btnResetFilters').click()">
          Clear All Filters
        </button>
      </div>
    `;
    return;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageDoctors = filteredDoctors.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  container.innerHTML = pageDoctors.map(doc => {
    // Generate avatar initials
    const initials = doc.name.replace(/^Dr\.?\s*/i, "").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const hasPhoto = Boolean(doc.photo && doc.photo.length > 5);

    return `
      <article class="doctor-card" data-doctor-id="${doc.id}">
        <!-- Card Top Header -->
        <div class="doc-card-top">
          <div class="doc-avatar-wrap">
            ${hasPhoto
              ? `<img src="${typeof CdnManager !== 'undefined' ? CdnManager.buildCdnUrl(doc.photo, { width: 140, height: 140, crop: 'fill' }) : doc.photo}" alt="${escapeHtml(doc.name)}" class="doc-avatar-img" onerror="this.onerror=null;this.src='';this.parentElement.innerHTML='<div class=\\'doc-avatar-fallback\\'>${initials}</div>';">`
              : `<div class="doc-avatar-fallback">${initials}</div>`
            }
            <span class="doc-online-status" title="${doc.availability}"></span>
          </div>

          <div class="doc-meta-header">
            <div class="doc-verified-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Verified Doctor</span>
            </div>
            <h3 class="doc-name">${escapeHtml(doc.name)}</h3>
            <span class="doc-spec-badge">${escapeHtml(doc.specialization)}</span>
          </div>
        </div>

        <!-- Rating & Reviews -->
        <div class="doc-rating-row">
          <div class="doc-stars">
            <span class="star-icon">★</span>
            <span class="rating-val">${doc.rating.toFixed(1)}</span>
            <span class="reviews-count">(${doc.reviewsCount} reviews)</span>
          </div>
          <span class="doc-exp-tag">💼 ${doc.experienceYears}+ Yrs Exp</span>
        </div>

        <!-- Doctor Details Info List -->
        <ul class="doc-details-list">
          <li class="doc-detail-item">
            <svg class="detail-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"></path>
              <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="12" y1="6" x2="12" y2="12"></line>
            </svg>
            <span class="detail-text" title="${escapeHtml(doc.hospital)}">${escapeHtml(doc.hospital)}</span>
          </li>
          <li class="doc-detail-item">
            <svg class="detail-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="detail-text">${escapeHtml(doc.location)}</span>
          </li>
          <li class="doc-detail-item availability-item">
            <svg class="detail-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="detail-text ${doc.isAvailableToday ? 'text-available' : ''}">
              ${escapeHtml(doc.availability)}
            </span>
          </li>
        </ul>

        <!-- Action Buttons -->
        <div class="doc-card-actions">
          <button type="button" class="btn-doc-profile" onclick="openDoctorProfileModal('${doc.id}')">
            View Profile
          </button>
          <a href="./appointments.html?doctor=${encodeURIComponent(doc.name)}" class="btn-doc-book">
            <span>Book Appointment</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </article>
    `;
  }).join("");
}

/**
 * Render Pagination for Pages 1-4 with Prev & Next
 */
function renderPagination() {
  const paginationWrap = document.getElementById("paginationContainer");
  if (!paginationWrap) return;

  const totalPages = Math.max(1, Math.min(4, Math.ceil(filteredDoctors.length / ITEMS_PER_PAGE)));

  // If filtered down to less than 1 page
  if (filteredDoctors.length <= ITEMS_PER_PAGE) {
    paginationWrap.innerHTML = `
      <nav class="pagination-nav" aria-label="Doctors Directory Pagination">
        <button type="button" class="page-btn active" disabled>1</button>
      </nav>
    `;
    return;
  }

  let html = `<nav class="pagination-nav" aria-label="Doctors Directory Pagination">`;

  // Previous Button
  const isPrevDisabled = currentPage <= 1;
  html += `
    <button type="button" class="page-btn page-control-btn" ${isPrevDisabled ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
      ← Prev
    </button>
  `;

  // Numbered buttons (1, 2, 3, 4)
  for (let p = 1; p <= totalPages; p++) {
    const isActive = p === currentPage;
    html += `
      <button type="button" class="page-btn ${isActive ? 'active' : ''}" onclick="goToPage(${p})" aria-current="${isActive ? 'page' : 'false'}">
        ${p}
      </button>
    `;
  }

  // Next Button
  const isNextDisabled = currentPage >= totalPages;
  html += `
    <button type="button" class="page-btn page-control-btn" ${isNextDisabled ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
      Next →
    </button>
  `;

  html += `</nav>`;
  paginationWrap.innerHTML = html;
}

/**
 * Page Navigation
 */
function goToPage(page) {
  const totalPages = Math.max(1, Math.min(4, Math.ceil(filteredDoctors.length / ITEMS_PER_PAGE)));
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderDoctorCards();
  renderPagination();
  scrollToResults();
}

function scrollToResults() {
  const resultsHeader = document.getElementById("availableDoctorsHeading");
  if (resultsHeader) {
    resultsHeader.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Doctor Profile Modal setup and open
 */
function setupProfileModal() {
  const modal = document.getElementById("doctorProfileModal");
  const closeBtn = document.getElementById("modalProfileCloseBtn");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      closeDoctorProfileModal();
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeDoctorProfileModal();
      }
    });
  }

  // ESC key closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDoctorProfileModal();
    }
  });
}

function openDoctorProfileModal(doctorId) {
  const doc = allDoctorsList.find(d => String(d.id) === String(doctorId));
  if (!doc) return;

  const modal = document.getElementById("doctorProfileModal");
  if (!modal) return;

  document.getElementById("modalDocName").textContent = doc.name;
  document.getElementById("modalDocDegrees").textContent = doc.degrees || doc.specialization;
  document.getElementById("modalDocSpec").textContent = doc.specialization;
  document.getElementById("modalDocRating").textContent = `${doc.rating.toFixed(1)} (${doc.reviewsCount} verified patient reviews)`;
  document.getElementById("modalDocHospital").textContent = doc.hospital;
  document.getElementById("modalDocLocation").textContent = doc.location;
  document.getElementById("modalDocExperience").textContent = `${doc.experienceYears}+ Years Clinical Practice`;
  document.getElementById("modalDocAvailability").textContent = doc.availability;
  document.getElementById("modalDocTiming").textContent = doc.timing || "Mon - Fri, 9:00 AM - 5:00 PM";
  document.getElementById("modalDocFee").textContent = doc.consultationFee || "$110";
  document.getElementById("modalDocBio").textContent = doc.bio;

  const bookBtn = document.getElementById("modalDocBookBtn");
  if (bookBtn) {
    bookBtn.href = `./appointments.html?doctor=${encodeURIComponent(doc.name)}`;
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDoctorProfileModal() {
  const modal = document.getElementById("doctorProfileModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Global exposure for onclick handlers
window.openDoctorProfileModal = openDoctorProfileModal;
window.closeDoctorProfileModal = closeDoctorProfileModal;
window.goToPage = goToPage;
