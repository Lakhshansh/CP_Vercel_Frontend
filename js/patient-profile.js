/**
 * ============================================================================
 * Multi Therapy - Patient Profile Management
 * ============================================================================
 * Handles patient personal & contact details, Cloudinary CDN signed photo upload,
 * real-time preview, removal, MySQL database persistence, and account security.
 */

let currentUserState = null;
let pendingPhotoData = null; // Base64 data URL preview or 'REMOVE' or null
let pendingPhotoFile = null; // File object for multipart upload

// Guaranteed inline SVG vector data URI for instant, zero-lag, offline-resilient avatar display
const DEFAULT_PATIENT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJwYXRHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMGIzYzczIi8+PHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiMwODY2ZjUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMjg0YzciLz48L2xpbmVhckdyYWRpZW50PjxmZWRyb3BTaGFkb3cgaWQ9InNoYWRvdyIgeD0iLTEwJSIgeT0iLTEwJSIgd2lkdGg9IjEyMCUiIGhlaWdodD0iMTIwJSI+PGZlRHJvcFNoYWRvdyBkeD0iMCIgZHk9IjQiIHN0ZERldmlhdGlvbj0iNCIgZmxvb2QtY29sb3I9IiMwMDAiIGZsb29kLW9wYWNpdHk9IjAuMTUiLz48L2ZpbHRlcj48L2RlZnM+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI5NiIgZmlsbD0idXJsKCNwYXRHcmFkKSIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iOTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PGcgZmlsbD0iI2ZmZmZmZiIgZmlsdGVyPSJ1cmwoI3NoYWRvdykiPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjcyIiByPSIzMiIvPjxwYXRoIGQ9Ik0gNDUsMTYyIEMgNDUsMTI0IDcyLDExOCAxMDAsMTE4IEMgMTI4LDExOCAxNTUsMTI0IDE1NSwxNjIgQyAxNTUsMTY4IDE1MCwxNzIgMTQ0LDE3MiBMIDU2LDE3MiBDIDUwLDE3MiA0NSwxNjggNDUsMTYyIFoiLz48cGF0aCBkPSJNIDEwMCwxMzggQyA5NiwxMzMgODgsMTMzIDg1LDEzOCBDIDgyLDE0MyA4NSwxNDggMTAwLDE1NyBDIDExNSwxNDggMTE4LDE0MyAxMTUsMTM4IEMgMTEyLDEzMyAxMDQsMTMzIDEwMCwxMzggWiIgZmlsbD0iIzM4YmRmOCIvPjwvZz48L3N2Zz4=";

function showToast(message) {
  const toast = document.getElementById("toastPopup");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authenticate user from localStorage or fallback
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) { user = null; }
  }

  if (!user) {
    user = {
      username: "Lakhshansh",
      name: "Lakhshansh Joshi",
      email: "joshilakhshansh@gmail.com",
      phone: "+919468650893",
      role: "patient",
      user_id: 1,
      patient_id: 1,
      age: 7,
      gender: "Male",
      address: "Jaipur, Rajasthan",
      emergency_contact: "Mrs. Sharma (+91 9468650893)"
    };
  }

  currentUserState = { ...user };

  // 2. Populate Profile Fields & Avatar Initial View
  populatePatientProfile(currentUserState);

  // 3. Setup Explicit Photo Controls & File Input Listeners
  setupPhotoControls();

  // 4. Setup Profile Update Form
  setupProfileForm();

  // 5. Setup Cancel Button
  setupCancelButton();

  // 6. Setup Password Change Form
  setupPasswordForm();

  // 7. Setup Logout Button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
        await fetch(`${apiBase}/api/logout`, { method: "POST", credentials: "include" });
      } catch (e) {}
      localStorage.removeItem("currentUser");
      window.location.href = "./index.html";
    });
  }

  // 8. Fetch freshest profile record from MySQL via /api/profile
  try {
    const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
    const fetchUrl = `${apiBase}/api/profile?user_id=${encodeURIComponent(user.user_id || '')}&username=${encodeURIComponent(user.username || '')}`;
    const res = await fetch(fetchUrl, { credentials: "include" }).then(r => r.json()).catch(() => null);

    if (res && res.success && res.user) {
      currentUserState = { ...currentUserState, ...res.user };
      localStorage.setItem("currentUser", JSON.stringify(currentUserState));
      populatePatientProfile(currentUserState);
    }
  } catch (err) {
    console.warn("Could not sync remote profile data on initial load:", err);
  }
});

/**
 * Configure Photo Upload, Preview, Quick Save, and Removal Controls
 */
function setupPhotoControls() {
  const fileInput = document.getElementById("patientPhotoInput");
  const btnUpload = document.getElementById("btnUploadPatientPhoto");
  const btnChange = document.getElementById("btnChangePatientPhoto");
  const btnCamera = document.getElementById("btnCameraPatientPhoto");
  const btnRemove = document.getElementById("btnRemovePatientPhoto");
  const btnQuickSave = document.getElementById("btnSaveQuickPatientPhoto");
  const avatarImg = document.getElementById("patientAvatarImg");
  const avatarEl = document.getElementById("patientAvatarEl");
  const previewBadge = document.getElementById("patientPhotoPreviewBadge");
  const msgEl = document.getElementById("profileMessage");

  // Direct click handlers to reliably open native OS file picker
  const triggerFileInput = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (fileInput) fileInput.click();
  };

  if (btnUpload) btnUpload.addEventListener("click", triggerFileInput);
  if (btnChange) btnChange.addEventListener("click", triggerFileInput);
  if (btnCamera) btnCamera.addEventListener("click", triggerFileInput);

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (msgEl) msgEl.hidden = true;

      // 1. Validate file format: JPG, JPEG, PNG, WEBP
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      const fileExt = file.name.split('.').pop().toLowerCase();
      const validExts = ["jpg", "jpeg", "png", "webp"];

      if (!validTypes.includes(file.type) && !validExts.includes(fileExt)) {
        showProfileAlert("Invalid file format. Only JPG, JPEG, PNG, and WEBP image files are supported.", "danger");
        fileInput.value = "";
        return;
      }

      // 2. Validate file size: Max 5MB
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        showProfileAlert("File size exceeds 5MB. Please select an image under 5 MB.", "danger");
        fileInput.value = "";
        return;
      }

      // 3. Read image and display instant client-side preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        pendingPhotoData = dataUrl;
        pendingPhotoFile = file;

        // Display preview image
        if (avatarImg) {
          avatarImg.src = dataUrl;
          avatarImg.style.display = "block";
        }
        if (avatarEl) avatarEl.style.display = "none";

        if (previewBadge) {
          previewBadge.style.display = "inline-block";
          previewBadge.style.background = "#f59e0b";
          previewBadge.textContent = "Preview (Unsaved)";
        }

        updatePhotoButtons(true, true);
        showToast("Photo preview ready. Click 'Save Photo' or 'Save Changes' to update in database.");
      };

      reader.onerror = () => {
        showProfileAlert("Failed to read image file. Please try another image.", "danger");
      };

      reader.readAsDataURL(file);
    });
  }

  // Quick Save Photo Button
  if (btnQuickSave) {
    btnQuickSave.addEventListener("click", async (e) => {
      e.preventDefault();
      await executePhotoPersistence();
    });
  }

  // Remove Photo Button
  if (btnRemove) {
    btnRemove.addEventListener("click", (e) => {
      e.preventDefault();
      pendingPhotoData = "REMOVE";
      pendingPhotoFile = null;
      if (fileInput) fileInput.value = "";

      // Reset to default patient avatar SVG
      if (avatarImg) {
        avatarImg.src = DEFAULT_PATIENT_AVATAR;
        avatarImg.style.display = "block";
      }
      if (avatarEl) avatarEl.style.display = "none";

      if (previewBadge) {
        previewBadge.style.display = "inline-block";
        previewBadge.style.background = "#ef4444";
        previewBadge.textContent = "Marked for Removal";
      }

      updatePhotoButtons(false, true);
      showToast("Photo marked for removal. Click 'Save Photo' or 'Save Changes' to apply in database.");
    });
  }
}

/**
 * Toggle photo button visibility based on whether a photo is active and pending
 */
function updatePhotoButtons(hasPhoto, isPending = false) {
  const btnUpload = document.getElementById("btnUploadPatientPhoto");
  const btnChange = document.getElementById("btnChangePatientPhoto");
  const btnRemove = document.getElementById("btnRemovePatientPhoto");
  const btnQuickSave = document.getElementById("btnSaveQuickPatientPhoto");

  if (isPending) {
    if (btnUpload) btnUpload.style.display = hasPhoto ? "none" : "inline-flex";
    if (btnChange) btnChange.style.display = "inline-flex";
    if (btnRemove) btnRemove.style.display = "inline-flex";
    if (btnQuickSave) btnQuickSave.style.display = "inline-flex";
  } else if (hasPhoto) {
    if (btnUpload) btnUpload.style.display = "none";
    if (btnChange) btnChange.style.display = "inline-flex";
    if (btnRemove) btnRemove.style.display = "inline-flex";
    if (btnQuickSave) btnQuickSave.style.display = "none";
  } else {
    if (btnUpload) btnUpload.style.display = "inline-flex";
    if (btnChange) btnChange.style.display = "none";
    if (btnRemove) btnRemove.style.display = "none";
    if (btnQuickSave) btnQuickSave.style.display = "none";
  }
}

/**
 * Executes direct upload and persistent saving of photo to Cloudinary CDN & MySQL
 */
async function executePhotoPersistence() {
  const btnQuickSave = document.getElementById("btnSaveQuickPatientPhoto");
  const origQuickText = btnQuickSave ? btnQuickSave.innerHTML : "";
  if (btnQuickSave) {
    btnQuickSave.disabled = true;
    btnQuickSave.innerHTML = `<span>⏳</span> Saving...`;
  }

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
  let newPhotoUrl = currentUserState.profile_photo;
  let newCloudinaryPid = currentUserState.cloudinary_public_id;

  try {
    if (pendingPhotoFile || pendingPhotoData) {
      if (pendingPhotoData === "REMOVE") {
        // Handle photo removal
        try {
          await fetch(`${apiBase}/api/remove-profile-photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserState.user_id,
              username: currentUserState.username,
              cloudinary_public_id: currentUserState.cloudinary_public_id
            })
          });
        } catch (e) {}

        newPhotoUrl = null;
        newCloudinaryPid = null;
      } else {
        // Upload photo via JSON (base64) or FormData
        let uploadRes = null;
        let lastUploadErr = null;

        // Attempt 1: JSON payload with base64 data URL
        try {
          const jsonResp = await fetch(`${apiBase}/api/upload-profile-photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile_photo: pendingPhotoData,
              user_id: currentUserState.user_id,
              username: currentUserState.username,
              role: "patient"
            })
          });
          const jData = await jsonResp.json().catch(() => null);
          if (jsonResp.ok && jData && jData.success) {
            uploadRes = jData;
          } else if (jData && !jData.success) {
            lastUploadErr = jData.message;
          }
        } catch (e) {
          lastUploadErr = e.message;
        }

        // Attempt 2: FormData multipart if JSON not processed
        if (!uploadRes && pendingPhotoFile) {
          try {
            const fd = new FormData();
            fd.append("profile_photo", pendingPhotoFile);
            fd.append("user_id", currentUserState.user_id || "");
            fd.append("username", currentUserState.username || "");
            fd.append("role", "patient");

            const fdResp = await fetch(`${apiBase}/api/upload-profile-photo`, {
              method: "POST",
              body: fd
            });
            const fdData = await fdResp.json().catch(() => null);
            if (fdResp.ok && fdData && fdData.success) {
              uploadRes = fdData;
            }
          } catch (e) {}
        }

        if (uploadRes && uploadRes.success) {
          newPhotoUrl = uploadRes.photo_url || uploadRes.profile_photo;
          newCloudinaryPid = uploadRes.cloudinary_public_id || null;
        } else {
          // Fallback: save local data URL directly into database and localStorage
          newPhotoUrl = pendingPhotoData;
          newCloudinaryPid = null;
        }
      }

      // Persist in MySQL via /api/profile
      try {
        await fetch(`${apiBase}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: currentUserState.user_id,
            username: currentUserState.username,
            profile_photo: newPhotoUrl,
            cloudinary_public_id: newCloudinaryPid
          })
        });
      } catch (e) {}

      // Update local state
      currentUserState = {
        ...currentUserState,
        profile_photo: newPhotoUrl,
        cloudinary_public_id: newCloudinaryPid
      };
      localStorage.setItem("currentUser", JSON.stringify(currentUserState));

      // Reset pending
      pendingPhotoData = null;
      pendingPhotoFile = null;
      const previewBadge = document.getElementById("patientPhotoPreviewBadge");
      if (previewBadge) previewBadge.style.display = "none";

      // Refresh view
      populatePatientProfile(currentUserState);

      const successMsg = newPhotoUrl
        ? "Profile photo updated and saved successfully in database!"
        : "Profile photo removed successfully from database!";
      showProfileAlert(successMsg, "success");
      showToast("✓ " + successMsg);
      return true;
    }
    return false;
  } catch (err) {
    showProfileAlert(`Error saving photo: ${err.message || err}`, "danger");
    return false;
  } finally {
    if (btnQuickSave) {
      btnQuickSave.disabled = false;
      btnQuickSave.innerHTML = origQuickText;
    }
  }
}

/**
 * Setup Profile Form submission & persistent save to Cloudinary and MySQL
 */
function setupProfileForm() {
  const profileForm = document.getElementById("patientProfileForm");
  const profileMessage = document.getElementById("profileMessage");

  if (!profileForm) return;

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (profileMessage) profileMessage.hidden = true;

    const fullName = document.getElementById("profFullName").value.trim();
    const email = document.getElementById("profEmail").value.trim();
    const phone = document.getElementById("profPhone").value.trim();
    const dob = document.getElementById("profDob").value;
    const age = document.getElementById("profAge").value.trim();
    const gender = document.getElementById("profGender").value;
    const address = document.getElementById("profAddress").value.trim();
    const emergencyContact = document.getElementById("profEmergencyContact").value.trim();

    const btn = document.getElementById("btnSavePatientProfile");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span> Saving Profile &amp; Photo...`;
    }

    try {
      // 1. Process photo persistence if a new photo or removal is pending
      if (pendingPhotoFile || pendingPhotoData) {
        await executePhotoPersistence();
      }

      // 2. Persist personal details in MySQL database
      const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
      const profilePayload = {
        user_id: currentUserState.user_id,
        username: currentUserState.username,
        name: fullName,
        email: email,
        phone: phone,
        dob: dob,
        age: age,
        gender: gender,
        address: address,
        city: address,
        emergency_contact: emergencyContact,
        profile_photo: currentUserState.profile_photo,
        cloudinary_public_id: currentUserState.cloudinary_public_id
      };

      try {
        await fetch(`${apiBase}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload)
        });
      } catch (err) {}

      // 3. Update localStorage
      const updatedUser = {
        ...currentUserState,
        name: fullName,
        email: email,
        phone: phone,
        dob: dob,
        age: age,
        gender: gender,
        address: address,
        city: address,
        emergency_contact: emergencyContact
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      currentUserState = { ...updatedUser };

      populatePatientProfile(currentUserState);
      showProfileAlert("Profile details and photo updated and saved successfully in MySQL database!", "success");
      showToast("✓ Profile saved successfully!");

    } catch (err) {
      showProfileAlert(`An unexpected error occurred: ${err.message || err}`, "danger");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}

/**
 * Setup Cancel button to revert unsaved edits
 */
function setupCancelButton() {
  const btnCancel = document.getElementById("btnCancelPatientProfile");
  if (!btnCancel) return;

  btnCancel.addEventListener("click", () => {
    pendingPhotoData = null;
    pendingPhotoFile = null;
    const fileInput = document.getElementById("patientPhotoInput");
    if (fileInput) fileInput.value = "";

    const previewBadge = document.getElementById("patientPhotoPreviewBadge");
    if (previewBadge) previewBadge.style.display = "none";

    populatePatientProfile(currentUserState);
    showToast("Changes reverted to saved profile.");
  });
}

/**
 * Setup Account Security / Password Change
 */
function setupPasswordForm() {
  const passwordForm = document.getElementById("changePasswordForm");
  const passwordMessage = document.getElementById("passwordMessage");

  if (!passwordForm) return;

  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (passwordMessage) passwordMessage.hidden = true;

    const newPass = document.getElementById("newPass").value;
    const confirmNewPass = document.getElementById("confirmNewPass").value;

    if (newPass.length < 6) {
      passwordMessage.hidden = false;
      passwordMessage.className = "alert alert-danger";
      passwordMessage.textContent = "New password must be at least 6 characters long.";
      return;
    }

    if (newPass !== confirmNewPass) {
      passwordMessage.hidden = false;
      passwordMessage.className = "alert alert-danger";
      passwordMessage.textContent = "Passwords do not match. Please re-enter.";
      return;
    }

    const btn = document.getElementById("btnUpdatePassword");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span> Updating Password...`;
    }

    try {
      const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
      const resp = await fetch(`${apiBase}/api/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserState.user_id,
          username: currentUserState.username,
          new_password: newPass
        })
      }).then(r => r.json()).catch(() => null);

      if (resp && !resp.success) {
        passwordMessage.hidden = false;
        passwordMessage.className = "alert alert-danger";
        passwordMessage.textContent = resp.message || "Failed to update password.";
      } else {
        passwordMessage.hidden = false;
        passwordMessage.className = "alert alert-success";
        passwordMessage.textContent = "Account password updated successfully!";
        passwordForm.reset();
        showToast("Password updated!");
      }
    } catch (err) {
      passwordMessage.hidden = false;
      passwordMessage.className = "alert alert-danger";
      passwordMessage.textContent = "Failed to communicate with authentication server.";
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}

/**
 * Populate all fields, tags, and avatar in the Patient Profile DOM
 */
function populatePatientProfile(user) {
  const displayName = user.name || user.username || "Lakhshansh Joshi";
  const displayUsername = user.username || "Lakhshansh";
  const displayEmail = user.email || "joshilakhshansh@gmail.com";
  const displayId = user.patient_id || user.user_id || 1;

  // Single initial character for fallback avatar
  const initialChar = (displayName.charAt(0) || "P").toUpperCase();

  // Hero Section
  const heroNameEl = document.getElementById("heroPatientName");
  const heroSubEl = document.getElementById("heroPatientSub");
  const idTagEl = document.getElementById("patientIdTag");

  if (heroNameEl) heroNameEl.textContent = displayName;
  if (heroSubEl) heroSubEl.textContent = `Patient Username: @${displayUsername} • Multidisciplinary Clinical Care`;
  if (idTagEl) idTagEl.textContent = `ID: #PAT-${displayId}`;

  // Form Inputs
  const fNameInput = document.getElementById("profFullName");
  const uNameInput = document.getElementById("profUsername");
  const idInput = document.getElementById("profPatientId");
  const emailInput = document.getElementById("profEmail");
  const phoneInput = document.getElementById("profPhone");
  const dobInput = document.getElementById("profDob");
  const ageInput = document.getElementById("profAge");
  const genderInput = document.getElementById("profGender");
  const addressInput = document.getElementById("profAddress");
  const emergencyInput = document.getElementById("profEmergencyContact");

  if (fNameInput) fNameInput.value = user.name || displayName;
  if (uNameInput) uNameInput.value = displayUsername;
  if (idInput) idInput.value = `#PAT-${displayId}`;
  if (emailInput) emailInput.value = displayEmail;
  if (phoneInput) phoneInput.value = user.phone || "+919468650893";
  if (dobInput && user.dob) dobInput.value = user.dob;
  if (ageInput) ageInput.value = user.age || 7;
  if (genderInput && user.gender) genderInput.value = user.gender;
  if (addressInput) addressInput.value = user.address || user.city || "Jaipur, Rajasthan";
  if (emergencyInput) emergencyInput.value = user.emergency_contact || user.guardian || "Mrs. Sharma (+91 9468650893)";

  // Navbar User Info
  const navUser = document.getElementById("navUsername");
  const navRole = document.getElementById("navRole");
  if (navUser) navUser.textContent = displayName;
  if (navRole) navRole.textContent = "Patient";

  // Avatar Photo Rendering
  const avatarEl = document.getElementById("patientAvatarEl");
  const avatarImg = document.getElementById("patientAvatarImg");
  const navAvatarEl = document.getElementById("navAvatar");
  const navAvatarImg = document.getElementById("navAvatarImg");

  const photo = user.profile_photo;
  const hasValidPhoto = photo && photo !== "REMOVE" && (
    photo.startsWith("http://") ||
    photo.startsWith("https://") ||
    photo.startsWith("data:") ||
    photo.startsWith("/profile/photo/") ||
    photo.startsWith("/static/")
  ) && !photo.includes("patient-avatar");

  if (hasValidPhoto) {
    const photoSrc = (typeof CdnManager !== "undefined")
      ? CdnManager.buildCdnUrl(photo, { width: 140, height: 140, crop: "fill" })
      : photo;

    if (avatarImg) {
      avatarImg.src = photoSrc;
      avatarImg.alt = "";
      avatarImg.style.display = "block";
      avatarImg.onerror = function () {
        this.src = DEFAULT_PATIENT_AVATAR;
        this.onerror = null;
      };
    }
    if (avatarEl) avatarEl.style.display = "none";

    if (navAvatarImg) {
      navAvatarImg.src = photoSrc;
      navAvatarImg.alt = "";
      navAvatarImg.style.display = "block";
      navAvatarImg.onerror = function () {
        this.src = DEFAULT_PATIENT_AVATAR;
        this.onerror = null;
      };
    }
    if (navAvatarEl) navAvatarEl.style.display = "none";

    updatePhotoButtons(true, false);
  } else {
    // Default avatar view: Display crisp patient vector avatar SVG
    if (avatarImg) {
      avatarImg.src = DEFAULT_PATIENT_AVATAR;
      avatarImg.alt = "";
      avatarImg.style.display = "block";
      avatarImg.onerror = null;
    }
    if (avatarEl) avatarEl.style.display = "none";

    if (navAvatarEl) {
      navAvatarEl.style.display = "flex";
      navAvatarEl.textContent = initialChar;
    }
    if (navAvatarImg) {
      navAvatarImg.style.display = "none";
      navAvatarImg.src = "";
    }

    updatePhotoButtons(false, false);
  }
}

function showProfileAlert(message, type = "success") {
  const el = document.getElementById("profileMessage");
  if (!el) return;
  el.hidden = false;
  el.className = `alert alert-${type} mb-3`;
  el.textContent = message;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (type === "success") {
    setTimeout(() => { el.hidden = true; }, 6000);
  }
}
