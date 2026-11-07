// ============================================================================
// Every Individual Deserves Better Care. - Exercises Controller
// Matches the official Multi Therapy Exercises Page UI Design reference.
// ============================================================================

// 5 Recommended Core Therapy Exercises
const RECOMMENDED_EXERCISES = [
  {
    id: "rec_1",
    name: "Arm Stretch",
    category: "Physical Therapy",
    bodyArea: "Upper Body",
    duration: "10 mins",
    difficulty: "Beginner",
    image: "./images/exercise-arm-stretch.svg",
    description: "Gentle shoulder and deltoid stretch improving range of motion, muscle relaxation, and upper-body mobility.",
    repsGoal: "3 Sets of 10 Reps (Hold 20-30s)",
    instructions: "Sit or stand tall. Gently draw one arm across your chest using your opposite hand at the forearm. Maintain steady breathing and avoid twisting your torso."
  },
  {
    id: "rec_2",
    name: "Leg Raise",
    category: "Physical Therapy",
    bodyArea: "Lower Body",
    duration: "12 mins",
    difficulty: "Intermediate",
    image: "./images/exercise-leg-raise.svg",
    description: "Quad and hip flexor strengthening routine supporting lower limb control, gait stability, and transfer ability.",
    repsGoal: "2 Sets of 15 Reps",
    instructions: "Lie flat on an exercise mat with one knee bent. Slowly elevate your straight leg to approximately 45 degrees, pause for 2 seconds, and lower under control."
  },
  {
    id: "rec_3",
    name: "Side Stretch",
    category: "Occupational Therapy",
    bodyArea: "Core & Spine",
    duration: "8 mins",
    difficulty: "Beginner",
    image: "./images/exercise-side-stretch.svg",
    description: "Lateral trunk stretching promoting spinal flexibility, pelvic stability, rib expansion, and upright posture control.",
    repsGoal: "3 Sets of 8 Reps per side",
    instructions: "Stand with feet shoulder-width apart or sit upright. Raise one arm overhead and gently curve laterally toward the opposite side without leaning forward."
  },
  {
    id: "rec_4",
    name: "Grip Exercise",
    category: "Occupational Therapy",
    bodyArea: "Hand & Wrist",
    duration: "15 mins",
    difficulty: "Beginner",
    image: "./images/exercise-grip-exercise.svg",
    description: "Hand therapy putty and resistance ball squeezes targeting finger opposition, grasp power, and fine motor dexterity.",
    repsGoal: "4 Sets of 12 Squeezes",
    instructions: "Hold the therapy squeeze ball firmly in your palm. Compress steadily for 5 seconds, release smoothly, and practice individual finger presses against the thumb."
  },
  {
    id: "rec_5",
    name: "Balance Training",
    category: "Physical Therapy",
    bodyArea: "Full Body",
    duration: "15 mins",
    difficulty: "Intermediate",
    image: "./images/exercise-balance-training.svg",
    description: "Dynamic proprioceptive stance training improving vestibular equilibrium, ankle stability, and fall prevention.",
    repsGoal: "3 Stances of 30 Seconds each",
    instructions: "Stand tall near a parallel bar or supportive wall. Alternate between tandem heel-to-toe stance and single-leg balance while maintaining an upright gaze."
  }
];

// Initial Structured Exercise Plan
const INITIAL_PLAN_EXERCISES = [
  {
    planId: "p_1",
    exerciseId: "rec_1",
    name: "Arm Stretch",
    category: "Physical Therapy",
    bodyArea: "Upper Body",
    duration: "10 Mins / Day",
    frequency: "Daily",
    week: "Week 1",
    progress: 85,
    status: "In Progress",
    difficulty: "Beginner",
    icon: "🏃"
  },
  {
    planId: "p_2",
    exerciseId: "rec_2",
    name: "Leg Raise",
    category: "Physical Therapy",
    bodyArea: "Lower Body",
    duration: "12 Mins / Day",
    frequency: "3x / Week",
    week: "Week 1",
    progress: 70,
    status: "In Progress",
    difficulty: "Intermediate",
    icon: "🦵"
  },
  {
    planId: "p_3",
    exerciseId: "rec_3",
    name: "Side Stretch",
    category: "Occupational Therapy",
    bodyArea: "Core & Spine",
    duration: "8 Mins / Day",
    frequency: "Daily",
    week: "Week 2",
    progress: 60,
    status: "In Progress",
    difficulty: "Beginner",
    icon: "🧘"
  },
  {
    planId: "p_4",
    exerciseId: "rec_4",
    name: "Grip Exercise",
    category: "Occupational Therapy",
    bodyArea: "Hand & Wrist",
    duration: "15 Mins / Day",
    frequency: "5x / Week",
    week: "Week 2",
    progress: 90,
    status: "In Progress",
    difficulty: "Beginner",
    icon: "✊"
  },
  {
    planId: "p_5",
    exerciseId: "rec_5",
    name: "Balance Training",
    category: "Physical Therapy",
    bodyArea: "Full Body",
    duration: "15 Mins / Day",
    frequency: "3x / Week",
    week: "Week 3",
    progress: 40,
    status: "In Progress",
    difficulty: "Intermediate",
    icon: "⚖️"
  },
  {
    planId: "p_6",
    exerciseId: "sp_1",
    name: "Vocal Phonation & Breathing",
    category: "Speech Therapy",
    bodyArea: "Oral & Facial",
    duration: "10 Mins / Day",
    frequency: "Daily",
    week: "Week 1",
    progress: 100,
    status: "Completed",
    difficulty: "Beginner",
    icon: "🗣️"
  },
  {
    planId: "p_7",
    exerciseId: "bt_1",
    name: "Sensory Calming Routine",
    category: "Behavior Therapy",
    bodyArea: "Full Body",
    duration: "15 Mins / Day",
    frequency: "Daily",
    week: "Week 3",
    progress: 50,
    status: "In Progress",
    difficulty: "Beginner",
    icon: "🧠"
  },
  {
    planId: "p_8",
    exerciseId: "adl_1",
    name: "Buttoning & Zipper Practice",
    category: "Daily Activities",
    bodyArea: "Hand & Wrist",
    duration: "10 Mins / Day",
    frequency: "Daily",
    week: "Week 2",
    progress: 100,
    status: "Completed",
    difficulty: "Beginner",
    icon: "🏠"
  }
];

// Active State
let currentSearch = "";
let currentTherapyType = "all";
let currentBodyArea = "all";
let currentDifficulty = "all";
let currentWeekTab = "all";

let exercisePlans = [];
let backendExercises = [];

// Player Modal State
let activePlayerExercise = null;
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;
let currentCompletedSets = 1;

let playerModalInstance = null;
let addModalInstance = null;
let notificationsModalInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Resolve User Session (supports logged-in patient/doctor and guest browsing)
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) { user = null; }
  }

  setupHeader(user);

  // 2. Initialize Bootstrap Modals
  initModals();

  // 3. Load Persistent Plan State
  loadPersistentPlans();

  // 4. Setup Filters & Listeners
  setupFilters();

  // 5. Setup Add Exercise Form
  setupAddForm();

  // 6. Setup Interactive Player Timer Controls
  setupPlayerControls();

  // 7. Load Backend Exercises from API
  await loadBackendExercises();

  // 8. Render Initial Views & Statistics
  renderAll();
});

/**
 * Configure Header navigation, user profile, notifications & logout
 */
function setupHeader(user) {
  const usernameEl = document.getElementById("navUsername");
  const roleEl = document.getElementById("navRole");
  const avatarEl = document.getElementById("navAvatar");
  const avatarImgEl = document.getElementById("navAvatarImg");
  const userProfileBtn = document.getElementById("userProfileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const notifBtn = document.getElementById("btnNotifications");

  if (user) {
    const displayName = user.name || user.username || "Patient";
    if (usernameEl) usernameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = user.role || "Patient";

    if (typeof renderNavbarUser === "function") {
      renderNavbarUser(user);
    }

    if (userProfileBtn) {
      if (user.role === "doctor") {
        userProfileBtn.href = "./doctor-profile.html";
      } else {
        userProfileBtn.href = "./patient-profile.html";
      }
    }
  } else {
    if (usernameEl) usernameEl.textContent = "Patient Portal";
    if (roleEl) roleEl.textContent = "Guest Access";
    if (avatarEl) avatarEl.textContent = "👤";
    if (userProfileBtn) userProfileBtn.href = "./login.html";
    if (typeof window.updateHeaderAuthState === "function") {
      window.updateHeaderAuthState(null);
    }
  }

  // Logout Click
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try { await apiRequest("/api/logout", { method: "POST" }); } catch (e) {}
      localStorage.removeItem("currentUser");
      window.location.href = "./index.html";
    });
  }

  // Notification Bell
  if (notifBtn) {
    notifBtn.addEventListener("click", () => {
      if (notificationsModalInstance) notificationsModalInstance.show();
    });
  }
}

/**
 * Initialize Bootstrap modal instances safely
 */
function initModals() {
  const playerEl = document.getElementById("exercisePlayerModal");
  if (playerEl && typeof bootstrap !== "undefined") {
    playerModalInstance = new bootstrap.Modal(playerEl);
  }

  const addEl = document.getElementById("addExerciseModal");
  if (addEl && typeof bootstrap !== "undefined") {
    addModalInstance = new bootstrap.Modal(addEl);
  }

  const notifEl = document.getElementById("notificationsModal");
  if (notifEl && typeof bootstrap !== "undefined") {
    notificationsModalInstance = new bootstrap.Modal(notifEl);
  }
}

/**
 * Load or initialize exercise plan state from localStorage
 */
function loadPersistentPlans() {
  try {
    const stored = localStorage.getItem("mt_exercise_plans");
    if (stored) {
      exercisePlans = JSON.parse(stored);
    } else {
      exercisePlans = [...INITIAL_PLAN_EXERCISES];
      savePlans();
    }
  } catch (e) {
    exercisePlans = [...INITIAL_PLAN_EXERCISES];
  }
}

function savePlans() {
  try {
    localStorage.setItem("mt_exercise_plans", JSON.stringify(exercisePlans));
  } catch (e) {}
}

/**
 * Load raw exercises from backend API (/api/exercises)
 */
async function loadBackendExercises() {
  try {
    const res = await apiRequest("/api/exercises");
    backendExercises = (res && Array.isArray(res.exercises)) ? res.exercises : [];

    // Integrate any custom backend exercises into plan list if not present
    backendExercises.forEach(be => {
      const exists = exercisePlans.some(p => p.backendId === be.exercise_id || p.name === be.exercise_name);
      if (!exists) {
        exercisePlans.unshift({
          planId: `be_${be.exercise_id}`,
          backendId: be.exercise_id,
          name: be.exercise_name,
          category: be.therapy_type || "Physical Therapy",
          bodyArea: "Full Body",
          duration: "15 Mins",
          frequency: "Daily",
          week: "Week 1",
          progress: 50,
          status: "In Progress",
          difficulty: "Intermediate",
          icon: "🏃",
          description: be.description || "Clinically assigned therapy routine."
        });
      }
    });
  } catch (e) {
    console.warn("Backend /api/exercises not reachable, continuing in local mode:", e.message);
  }
}

/**
 * Setup live search, dropdown filters, hero category chips, and week tabs
 */
function setupFilters() {
  const searchInput = document.getElementById("searchExerciseInput");
  const therapySelect = document.getElementById("filterTherapyType");
  const bodyAreaSelect = document.getElementById("filterBodyArea");
  const diffSelect = document.getElementById("filterDifficulty");
  const btnSearch = document.getElementById("btnSearchExercises");
  const btnReset = document.getElementById("btnResetExercises");
  const heroCategoryChips = document.getElementById("heroCategoryChips");
  const weekTabsContainer = document.getElementById("planWeekTabs");

  // Search input typing
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      renderAll();
    });
  }

  // Therapy Type dropdown
  if (therapySelect) {
    therapySelect.addEventListener("change", (e) => {
      currentTherapyType = e.target.value;
      syncHeroCategoryChips();
      renderAll();
    });
  }

  // Body Area dropdown
  if (bodyAreaSelect) {
    bodyAreaSelect.addEventListener("change", (e) => {
      currentBodyArea = e.target.value;
      renderAll();
    });
  }

  // Difficulty dropdown
  if (diffSelect) {
    diffSelect.addEventListener("change", (e) => {
      currentDifficulty = e.target.value;
      renderAll();
    });
  }

  // Search Button
  if (btnSearch) {
    btnSearch.addEventListener("click", () => {
      if (searchInput) currentSearch = searchInput.value.trim().toLowerCase();
      if (therapySelect) currentTherapyType = therapySelect.value;
      if (bodyAreaSelect) currentBodyArea = bodyAreaSelect.value;
      if (diffSelect) currentDifficulty = diffSelect.value;
      renderAll();
    });
  }

  // Reset Button
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      resetFilters();
    });
  }

  // Hero Category Chips Click Handlers
  if (heroCategoryChips) {
    const chips = heroCategoryChips.querySelectorAll(".ex-category-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const cat = chip.getAttribute("data-category");
        if (currentTherapyType === cat) {
          currentTherapyType = "all";
          chip.classList.remove("active");
        } else {
          currentTherapyType = cat;
          chips.forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
        }

        if (therapySelect) therapySelect.value = currentTherapyType;
        renderAll();
      });
    });
  }

  // Plan Weekly Filter Tabs
  if (weekTabsContainer) {
    const tabs = weekTabsContainer.querySelectorAll(".ex-week-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentWeekTab = tab.getAttribute("data-week");
        renderPlanTable();
      });
    });
  }
}

/**
 * Sync hero category chips with currentTherapyType
 */
function syncHeroCategoryChips() {
  const container = document.getElementById("heroCategoryChips");
  if (!container) return;
  const chips = container.querySelectorAll(".ex-category-chip");
  chips.forEach(chip => {
    if (chip.getAttribute("data-category") === currentTherapyType) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

/**
 * Reset all filter controls
 */
function resetFilters() {
  currentSearch = "";
  currentTherapyType = "all";
  currentBodyArea = "all";
  currentDifficulty = "all";
  currentWeekTab = "all";

  const searchInput = document.getElementById("searchExerciseInput");
  const therapySelect = document.getElementById("filterTherapyType");
  const bodyAreaSelect = document.getElementById("filterBodyArea");
  const diffSelect = document.getElementById("filterDifficulty");
  const weekTabs = document.querySelectorAll(".ex-week-tab");

  if (searchInput) searchInput.value = "";
  if (therapySelect) therapySelect.value = "all";
  if (bodyAreaSelect) bodyAreaSelect.value = "all";
  if (diffSelect) diffSelect.value = "all";

  weekTabs.forEach((t, i) => {
    if (i === 0) t.classList.add("active");
    else t.classList.remove("active");
  });

  syncHeroCategoryChips();
  renderAll();
}

/**
 * Filter and render Recommended Exercises grid
 */
function renderRecommendedExercises() {
  const grid = document.getElementById("recommendedExercisesGrid");
  const badge = document.getElementById("recommendedCountBadge");
  if (!grid) return;

  const filtered = RECOMMENDED_EXERCISES.filter(ex => {
    // 1. Keyword search
    if (currentSearch) {
      const q = currentSearch;
      const matchName = ex.name.toLowerCase().includes(q);
      const matchDesc = ex.description.toLowerCase().includes(q);
      const matchArea = ex.bodyArea.toLowerCase().includes(q);
      const matchCat = ex.category.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchArea && !matchCat) return false;
    }

    // 2. Therapy type
    if (currentTherapyType !== "all") {
      const sel = currentTherapyType.toLowerCase();
      const cat = ex.category.toLowerCase();
      if (!cat.includes(sel) && !(sel.includes("physical") && cat.includes("physical"))) return false;
    }

    // 3. Body Area
    if (currentBodyArea !== "all") {
      const selArea = currentBodyArea.toLowerCase();
      const area = ex.bodyArea.toLowerCase();
      if (!area.includes(selArea)) return false;
    }

    // 4. Difficulty
    if (currentDifficulty !== "all") {
      if (ex.difficulty.toLowerCase() !== currentDifficulty.toLowerCase()) return false;
    }

    return true;
  });

  if (badge) {
    badge.textContent = `${filtered.length} of ${RECOMMENDED_EXERCISES.length} Core Exercises`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #ffffff; border-radius: 16px; border: 1.5px dashed #cbd5e1;">
        <div style="font-size: 38px; margin-bottom: 8px;">🔍</div>
        <h4 style="font-weight: 800; color: #103463;">No matching recommended exercises</h4>
        <p class="text-secondary small">Try adjusting or resetting your filter criteria.</p>
        <button type="button" class="btn btn-outline-primary btn-sm fw-bold" onclick="resetFilters()">
          🔄 Reset Filters
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(ex => {
    let diffClass = "diff-beginner";
    if (ex.difficulty === "Intermediate") diffClass = "diff-intermediate";
    if (ex.difficulty === "Advanced") diffClass = "diff-advanced";

    return `
      <div class="ex-card" data-id="${ex.id}">
        <div class="ex-card-thumb-wrap">
          <img src="${typeof CdnManager !== 'undefined' ? CdnManager.buildCdnUrl(ex.image, { width: 320, height: 200, crop: 'fit' }) : ex.image}" alt="${escapeHtml(ex.name)}" class="ex-card-thumb" onerror="if(typeof CdnManager !== 'undefined') CdnManager.handleImageError(this, 'exercise');">
          <span class="ex-card-difficulty ${diffClass}">${escapeHtml(ex.difficulty)}</span>
        </div>
        <div class="ex-card-body">
          <span class="ex-card-category-pill">${escapeHtml(ex.category)} • ${escapeHtml(ex.bodyArea)}</span>
          <h3 class="ex-card-title">${escapeHtml(ex.name)}</h3>
          <div class="ex-card-duration-row">
            <span>⏱️</span>
            <span>${escapeHtml(ex.duration)}</span>
            <span class="text-muted">•</span>
            <span class="text-muted">${escapeHtml(ex.repsGoal)}</span>
          </div>
          <p class="ex-card-desc">${escapeHtml(ex.description)}</p>
          <button type="button" class="ex-btn-start" onclick="startExerciseSession('${ex.id}', 'recommended')">
            <span>▶</span> <span>Start Exercise</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Filter and render My Exercise Plan table
 */
function renderPlanTable() {
  const tbody = document.getElementById("exercisePlanTableBody");
  if (!tbody) return;

  const filtered = exercisePlans.filter(p => {
    // 1. Search filter
    if (currentSearch) {
      const q = currentSearch;
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchCat = (p.category || "").toLowerCase().includes(q);
      const matchArea = (p.bodyArea || "").toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchArea) return false;
    }

    // 2. Therapy type filter
    if (currentTherapyType !== "all") {
      const sel = currentTherapyType.toLowerCase();
      const cat = (p.category || "").toLowerCase();
      if (!cat.includes(sel)) return false;
    }

    // 3. Body Area filter
    if (currentBodyArea !== "all") {
      const selArea = currentBodyArea.toLowerCase();
      const area = (p.bodyArea || "").toLowerCase();
      if (!area.includes(selArea)) return false;
    }

    // 4. Difficulty filter
    if (currentDifficulty !== "all") {
      if ((p.difficulty || "").toLowerCase() !== currentDifficulty.toLowerCase()) return false;
    }

    // 5. Weekly plan tabs
    if (currentWeekTab !== "all") {
      if (currentWeekTab === "completed") {
        if (p.progress < 100) return false;
      } else {
        if (p.week !== currentWeekTab) return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-5">
          <div style="font-size: 32px; margin-bottom: 6px;">📋</div>
          <strong>No exercises found in this plan view.</strong><br>
          <span class="small">Try switching the week tab or resetting filters.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isCompleted = p.progress >= 100;
    const progressColor = isCompleted ? "#059669" : "#0866F5";
    const statusText = isCompleted ? "✓ Completed" : `${p.progress}%`;

    return `
      <tr>
        <td>
          <div class="ex-table-ex-name">
            <div class="ex-table-icon">${p.icon || '🏃'}</div>
            <div>
              <div style="font-weight: 700; color: #103463;">${escapeHtml(p.name)}</div>
              <div class="text-muted small" style="font-size: 11.5px;">${escapeHtml(p.bodyArea || 'Rehabilitation')} • ${escapeHtml(p.week || 'Week 1')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-primary border" style="font-size: 12px; font-weight: 600;">
            ${escapeHtml(p.category)}
          </span>
        </td>
        <td><strong>${escapeHtml(p.duration || '10 mins')}</strong></td>
        <td><span class="text-secondary">${escapeHtml(p.frequency || 'Daily')}</span></td>
        <td class="ex-progress-cell">
          <div class="ex-progress-bar-bg">
            <div class="ex-progress-bar-fill" style="width: ${p.progress}%; background: ${progressColor};"></div>
          </div>
          <div class="ex-progress-text">
            <span>Progress</span>
            <strong style="color: ${progressColor};">${statusText}</strong>
          </div>
        </td>
        <td style="text-align: right;">
          <div class="d-inline-flex align-items-center">
            <button type="button" class="ex-table-btn-start" onclick="startExerciseSession('${p.planId}', 'plan')">
              <span>▶</span> <span>Start</span>
            </button>
            ${p.backendId ? `
              <button type="button" class="ex-table-btn-delete" onclick="deletePlanExercise('${p.planId}', ${p.backendId})" title="Delete exercise">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * Update dynamic statistics cards
 */
function updateStatistics() {
  const statTotal = document.getElementById("statTotalExercises");
  const statCategories = document.getElementById("statCategories");
  const statAssigned = document.getElementById("statAssignedExercises");
  const statRate = document.getElementById("statCompletionRate");

  const totalCount = RECOMMENDED_EXERCISES.length + backendExercises.length;
  if (statTotal) statTotal.textContent = `${totalCount}+`;
  if (statCategories) statCategories.textContent = "5";
  if (statAssigned) statAssigned.textContent = `${exercisePlans.length}`;

  if (statRate && exercisePlans.length > 0) {
    const totalProg = exercisePlans.reduce((acc, p) => acc + (p.progress || 0), 0);
    const avg = Math.round((totalProg / (exercisePlans.length * 100)) * 100 * 10) / 10;
    statRate.textContent = `${avg}%`;
  }
}

/**
 * Re-render all sections and stats
 */
function renderAll() {
  renderRecommendedExercises();
  renderPlanTable();
  updateStatistics();
}

/**
 * Launch Exercise Session Player Modal
 */
function startExerciseSession(id, source = "recommended") {
  let target = null;

  if (source === "recommended") {
    target = RECOMMENDED_EXERCISES.find(e => e.id === id);
  } else {
    target = exercisePlans.find(p => p.planId === id);
    if (!target) {
      target = RECOMMENDED_EXERCISES.find(e => e.name.toLowerCase() === (target && target.name.toLowerCase()));
    }
  }

  if (!target) {
    target = RECOMMENDED_EXERCISES[0];
  }

  activePlayerExercise = target;

  const modalName = document.getElementById("playerExerciseName");
  const modalSub = document.getElementById("playerModalSubtitle");
  const modalTarget = document.getElementById("playerTargetDuration");
  const modalDesc = document.getElementById("playerExerciseDesc");
  const modalGoal = document.getElementById("playerRepsGoal");
  const modalIcon = document.getElementById("playerModalIcon");

  if (modalName) modalName.textContent = target.name || "Therapy Exercise";
  if (modalSub) modalSub.textContent = `${target.category || 'Therapy'} • ${target.bodyArea || 'Mobility'}`;
  if (modalTarget) modalTarget.textContent = `Target: ${target.duration || '10 mins'}`;
  if (modalDesc) modalDesc.textContent = target.instructions || target.description || "Perform slow, continuous movements focusing on steady form.";
  if (modalGoal) modalGoal.textContent = target.repsGoal || "Target: 3 Sets of 10 Reps";
  if (modalIcon) modalIcon.textContent = target.icon || "🏃";

  // Reset Stopwatch & Sets
  resetTimer();
  currentCompletedSets = 1;
  const setsDisplay = document.getElementById("playerCompletedSets");
  if (setsDisplay) setsDisplay.textContent = "1";

  if (playerModalInstance) {
    playerModalInstance.show();
  }
}

/**
 * Setup timer & rep controls inside Exercise Player Modal
 */
function setupPlayerControls() {
  const btnStart = document.getElementById("btnTimerStart");
  const btnPause = document.getElementById("btnTimerPause");
  const btnReset = document.getElementById("btnTimerReset");
  const btnIncReps = document.getElementById("btnIncrementReps");
  const btnDecReps = document.getElementById("btnDecrementReps");
  const btnComplete = document.getElementById("btnMarkCompleted");

  if (btnStart) {
    btnStart.addEventListener("click", () => {
      startTimer();
    });
  }

  if (btnPause) {
    btnPause.addEventListener("click", () => {
      pauseTimer();
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      resetTimer();
    });
  }

  if (btnIncReps) {
    btnIncReps.addEventListener("click", () => {
      currentCompletedSets++;
      document.getElementById("playerCompletedSets").textContent = currentCompletedSets;
    });
  }

  if (btnDecReps) {
    btnDecReps.addEventListener("click", () => {
      if (currentCompletedSets > 0) currentCompletedSets--;
      document.getElementById("playerCompletedSets").textContent = currentCompletedSets;
    });
  }

  if (btnComplete) {
    btnComplete.addEventListener("click", () => {
      completeSession();
    });
  }

  // Handle modal dismiss to stop timer
  const modalEl = document.getElementById("exercisePlayerModal");
  if (modalEl) {
    modalEl.addEventListener("hidden.bs.modal", () => {
      pauseTimer();
    });
  }
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;

  const btnStart = document.getElementById("btnTimerStart");
  const btnPause = document.getElementById("btnTimerPause");
  if (btnStart) btnStart.style.display = "none";
  if (btnPause) btnPause.style.display = "inline-flex";

  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  if (!isTimerRunning) return;
  isTimerRunning = false;
  clearInterval(timerInterval);

  const btnStart = document.getElementById("btnTimerStart");
  const btnPause = document.getElementById("btnTimerPause");
  if (btnStart) {
    btnStart.style.display = "inline-flex";
    btnStart.innerHTML = `<span>▶</span> <span>Resume</span>`;
  }
  if (btnPause) btnPause.style.display = "none";
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 0;
  updateTimerDisplay();

  const btnStart = document.getElementById("btnTimerStart");
  if (btnStart) {
    btnStart.style.display = "inline-flex";
    btnStart.innerHTML = `<span>▶</span> <span>Start</span>`;
  }
}

function updateTimerDisplay() {
  const display = document.getElementById("playerTimerDisplay");
  if (!display) return;
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  display.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Handle session completion and progress increment
 */
function completeSession() {
  pauseTimer();

  if (activePlayerExercise) {
    const exerciseName = activePlayerExercise.name;

    // Find matching plan exercise to update progress
    let planItem = exercisePlans.find(p => p.planId === activePlayerExercise.planId || p.name.toLowerCase() === exerciseName.toLowerCase());

    if (planItem) {
      planItem.progress = Math.min(100, (planItem.progress || 0) + 15);
      if (planItem.progress >= 100) {
        planItem.status = "Completed";
      }
    } else {
      // Add newly completed recommended exercise to plan
      exercisePlans.unshift({
        planId: `comp_${Date.now()}`,
        name: activePlayerExercise.name,
        category: activePlayerExercise.category || "Physical Therapy",
        bodyArea: activePlayerExercise.bodyArea || "Full Body",
        duration: activePlayerExercise.duration || "10 mins",
        frequency: "Daily",
        week: "Week 1",
        progress: 100,
        status: "Completed",
        difficulty: activePlayerExercise.difficulty || "Beginner",
        icon: "✓"
      });
    }

    savePlans();
    renderPlanTable();
    updateStatistics();

    if (playerModalInstance) playerModalInstance.hide();
    showPageAlert(`✅ Session completed for ${escapeHtml(exerciseName)}! Progress updated.`, "success");
  }
}

/**
 * Handle Add Exercise Form (POST /api/exercises)
 */
function setupAddForm() {
  const form = document.getElementById("addExerciseForm");
  const addBtn = document.getElementById("btnAddExercise");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const exercise_name = document.getElementById("exName").value.trim();
      const therapy_type = document.getElementById("exType").value.trim();
      const description = document.getElementById("exDesc").value.trim();
      const body_area = document.getElementById("exBodyArea").value;
      const difficulty = document.getElementById("exDifficulty").value;
      const duration = document.getElementById("exDuration").value.trim() || "15 Mins";
      const frequency = document.getElementById("exFrequency").value.trim() || "Daily";

      if (!exercise_name || !therapy_type || !description) {
        showPageAlert("Please fill in exercise name, therapy type, and clinical description.", "danger");
        return;
      }

      if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = "Saving to Database...";
      }

      let backendId = null;
      try {
        const res = await apiRequest("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_name, description, therapy_type })
        });
        if (res && res.exercise_id) backendId = res.exercise_id;
      } catch (err) {
        console.warn("Backend POST failed, adding to local plan state:", err.message);
      }

      // Add to plan list
      const newPlanItem = {
        planId: `usr_${Date.now()}`,
        backendId: backendId,
        name: exercise_name,
        category: therapy_type,
        bodyArea: body_area,
        duration: duration,
        frequency: frequency,
        week: "Week 1",
        progress: 10,
        status: "In Progress",
        difficulty: difficulty,
        icon: "🏃",
        description: description
      };

      exercisePlans.unshift(newPlanItem);
      savePlans();

      if (addModalInstance) addModalInstance.hide();
      showPageAlert("Exercise saved successfully to your rehabilitation directory!", "success");

      // Reset form
      document.getElementById("exName").value = "";
      document.getElementById("exType").value = "";
      document.getElementById("exDesc").value = "";

      if (addBtn) {
        addBtn.disabled = false;
        addBtn.textContent = "💾 Save Exercise to Database";
      }

      renderAll();
    });
  }
}

/**
 * Delete an exercise from the plan and backend if applicable
 */
async function deletePlanExercise(planId, backendId) {
  if (!confirm("Are you sure you want to remove this exercise from your plan?")) return;

  if (backendId) {
    try {
      await apiRequest(`/api/exercises/${backendId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Backend DELETE failed, removing from local state:", e.message);
    }
  }

  exercisePlans = exercisePlans.filter(p => p.planId !== planId);
  savePlans();
  renderAll();

  showPageAlert("Exercise removed from plan successfully.", "info");
}

/**
 * Display alert banner
 */
function showPageAlert(message, type = "success") {
  const alertEl = document.getElementById("exerciseAlert");
  if (!alertEl) return;
  alertEl.hidden = false;
  alertEl.className = `alert alert-${type} mb-3`;
  alertEl.textContent = message;
  alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setTimeout(() => { alertEl.hidden = true; }, 4000);
}

/**
 * Escape HTML utility
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/'/g, "&#039;");
}
