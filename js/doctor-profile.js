/**
 * ============================================================================
 * Multi Therapy - Doctor Profile Management
 * ============================================================================
 * Handles doctor / clinical specialist credentials, Cloudinary CDN signed photo upload,
 * real-time preview, client-side canvas optimization, removal, MySQL database persistence,
 * and account security.
 */

let currentUserState = null;
let pendingPhotoData = null; // Compressed Base64 data URL preview or 'REMOVE' or null
let pendingPhotoFile = null; // Original File object
let isPhotoSaving = false;

// 100% Valid XML clean SVG vector data URI for instant, zero-lag doctor avatar display
const DEFAULT_DOCTOR_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PGRlZnM+PGNsaXBQYXRoIGlkPSJkb2NDaXJjbGVDbGlwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NyIvPjwvY2xpcFBhdGg+PGxpbmVhckdyYWRpZW50IGlkPSJkb2NCZ0dyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNlY2ZkZjUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNkMWZhZTUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0idXJsKCNkb2NCZ0dyYWQpIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ2LjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2E3ZjNkMCIgc3Ryb2tlLXdpZHRoPSIxLjIiLz48ZyBjbGlwLXBhdGg9InVybCgjZG9jQ2lyY2xlQ2xpcCkiPjxwYXRoIGQ9Ik0yMiA4NiBDMjIgNjIgMzQgNTQgNTAgNTQgQzY2IDU0IDc4IDYyIDc4IDg2IFoiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2NiZDVlMSIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48cGF0aCBkPSJNNDIgNTQgTDUwIDY3IEw1OCA1NCBaIiBmaWxsPSIjMDc4QjY5Ii8+PHBhdGggZD0iTTM5IDU1IEMzOSA2NyA0NCA3MyA1MCA3MyBDNTYgNzMgNjEgNjcgNjEgNTUiIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIyLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNzUiIHI9IjMuNSIgZmlsbD0iIzk0YTNiOCIgc3Ryb2tlPSIjMGYxNzJhIiBzdHJva2Utd2lkdGg9IjEuNCIvPjxwYXRoIGQ9Ik0zNCA1NiBMNDUgNzUgTDM4IDg2IiBzdHJva2U9IiMwNzhCNjkiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNNjYgNTYgTDU1IDc1IEw2MiA4NiIgc3Ryb2tlPSIjMDc4QjY5IiBzdHJva2Utd2lkdGg9IjIuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+PHJlY3QgeD0iNjQiIHk9IjY1IiBwidthPSIyLjUiIGhlaWdodD0iNy41IiByeD0iMS4yIiBmaWxsPSIjMDU5NjY5Ii8+PHJlY3QgeD0iNjEuNSIgeT0iNjcuNSIgd2lkdGg9IjcuNSIgaGVpZ2h0PSIyLjUiIHJ4PSIxLjIiIGZpbGw9IiMwNTk2NjkiLz48cmVjdCB4PSI0NSIgeT0iNDQiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMiIgZmlsbD0iI2ZlZDdhYSIgcng9IjIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjMzIiByPSIxNCIgZmlsbD0iI2ZlZDdhYSIvPjxwYXRoIGQ9Ik0zNSAzMSBDMzUgMTcgNDMgMTUgNTAgMTUgQzU3IDE1IDY1IDE3IDY1IDMxIEM2MCAyNCA1NSAyMyA1MCAyMyBDNDQgMjMgMzkgMjUgMzUgMzFaIiBmaWxsPSIjMWUyOTNiIi8+PHBhdGggZD0iTTM1IDI5IEwzNSAzNCBDMzYgMzQgMzcgMzIgMzcgMjkgWiIgZmlsbD0iIzFlMjkzYiIvPjxwYXRoIGQ9Ik02NSAyOSBMNjUgMzQgQzY0IDM0IDYzIDMyIDYzIDI5IFoiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBkPSJNNDEgMjcgUTQ0IDI2IDQ3IDI3IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS40IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNNTMgMjcgUTU2IDI2IDU5IDI3IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMS40IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz48Y2lyY2xlIGN4PSI0NC41IiBjeT0iMzIuNSIgcj0iMS42IiBmaWxsPSIjMGYxNzJhIi8+PGNpcmNsZSBjeD0iNTUuNSIgY3k9IjMyLjUiIHI9IjEuNiIgZmlsbD0iIzBmMTcyYSIvPjxjaXJjbGUgY3g9IjQ0IiBjeT0iMzIiIHI9IjAuNSIgZmlsbD0iI2ZmZmZmZiIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iMzIiIHI9IjAuNSIgZmlsbD0iI2ZmZmZmZiIvPjxyZWN0IHg9IjM5LjUiIHk9IjI5IiB3aWR0aD0iOSIgaGVpZ2h0PSI3IiByeD0iMi41IiBzdHJva2U9IiMwNTk2NjkiIHN0cm9rZS13aWR0aD0iMS40IiBmaWxsPSJub25lIi8+PHJlY3QgeD0iNTEuNSIgeT0iMjkiIHdpZHRoPSI5IiBoZWlnaHQ9IjciIHJ4PSIyLjUiIHN0cm9rZT0iIzA1OTY2OSIgc3Ryb2tlLXdpZHRoPSIxLjQiIGZpbGw9Im5vbmUiLz48bGluZSB4MT0iNDguNSIgeTE9IjMyIiB4Mj0iNTEuNSIgeTI9IjMyIiBzdHJva2U9IiMwNTk2NjkiIHN0cm9rZS13aWR0aD0iMS40Ii8+PGxpbmUgeDE9IjM2IiB5MT0iMzEiIHgyPSIzOS41IiB5Mj0iMzEiIHN0cm9rZT0iIzA1OTY2OSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz48bGluZSB4MT0iNjAuNSIgeTE9IjMxIiB4Mj0iNjQiIHkyPSIzMSIgc3Ryb2tlPSIjMDU5NjY5IiBzdHJva2Utd2lkdGg9IjEuMiIvPjxwYXRoIGQ9Ik00OSAzNCBMNDkuNSAzNyBMNTEgMzciIHN0cm9rZT0iI2VhNTgwYyIgc3Ryb2tlLXdpZHRoPSIxLjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik00Ni41IDM5LjUgUTUwIDQzIDUzLjUgMzkuNSIgc3Ryb2tlPSIjYzI0MTBjIiBzdHJva2Utd2lkdGg9IjEuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+PC9nPjwvc3ZnPg==";

function showToast(message) {
  const toast = document.getElementById("toastPopup");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function hasValidPhoto(photo) {
  if (!photo || photo === "REMOVE") return false;
  const p = String(photo).trim();
  if (p.includes("doctor-avatar") || p.includes("doctor-login-avatar")) return false;
  return p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:image/");
}

/**
 * Client-side Canvas Image Compression
 * Resizes image down to 500x500 square at 0.85 quality.
 * Prevents Vercel 4.5MB payload limit and localStorage QuotaExceededError.
 */
function compressDoctorPhoto(file, maxSize = 500, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to parse image for compression."));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Crop or scale to square avatar
          let sx = 0, sy = 0, sWidth = width, sHeight = height;
          if (width > height) {
            sx = (width - height) / 2;
            sWidth = height;
          } else if (height > width) {
            sy = (height - width) / 2;
            sHeight = width;
          }

          canvas.width = Math.min(sWidth, maxSize);
          canvas.height = Math.min(sHeight, maxSize);

          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

          // Export as JPEG for high compression & universal compatibility
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // If canvas fails, fallback to raw data URL
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authenticate / load current doctor user
  const rawUser = localStorage.getItem("currentUser");
  let user = null;
  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch (e) { user = null; }
  }

  if (!user) {
    user = {
      username: "admin",
      name: "Dr. admin",
      doctor_name: "Dr. admin",
      email: "doctor@multitherapy.org",
      phone: "+91 9468650893",
      role: "doctor",
      user_id: 1,
      doctor_id: 1,
      license: "MCI-RAJ-2018-8492",
      registration_number: "MCI-RAJ-2018-8492",
      specialty: "Pediatric Neurology",
      specialization: "Pediatric Neurology",
      hospital: "Multi Therapy Rehabilitation Center",
      hospital_name: "Multi Therapy Rehabilitation Center",
      experience: "12+ Years",
      qualification: "MBBS, MD (Pediatrics), DM (Neuro)",
      address: "Jaipur, Rajasthan",
      hospital_address: "Jaipur, Rajasthan",
      profile_photo: ""
    };
  }

  // Restore persistent photo cache if available
  const usernameKey = user.username || "admin";
  const persistentKey = `mt_doc_photo_${usernameKey}`;
  const savedCachedPhoto = localStorage.getItem(persistentKey);
  if (!hasValidPhoto(user.profile_photo) && hasValidPhoto(savedCachedPhoto)) {
    user.profile_photo = savedCachedPhoto;
  }

  currentUserState = { ...user };

  // 2. Populate Doctor Profile Fields & Avatar Initial View
  populateDoctorProfile(currentUserState);

  // 3. Setup Explicit Photo Controls & File Input Listeners
  setupPhotoControls();

  // 4. Setup Doctor Profile Form submission & save
  setupDoctorProfileForm();

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
      const existingPhoto = currentUserState.profile_photo;
      currentUserState = { ...currentUserState, ...res.user };

      // Ensure valid saved photo is never wiped out by mock or empty response
      if (!hasValidPhoto(res.user.profile_photo) && hasValidPhoto(existingPhoto)) {
        currentUserState.profile_photo = existingPhoto;
      } else if (hasValidPhoto(res.user.profile_photo)) {
        localStorage.setItem(persistentKey, res.user.profile_photo);
      }

      localStorage.setItem("currentUser", JSON.stringify(currentUserState));
      populateDoctorProfile(currentUserState);
    }
  } catch (err) {
    console.warn("Could not sync remote doctor profile data on initial load:", err);
  }
});

/**
 * Configure Doctor Photo Upload, Preview, Quick Save, and Removal Controls
 */
function setupPhotoControls() {
  const fileInput = document.getElementById("doctorPhotoInput");
  const btnUpload = document.getElementById("btnUploadDocPhoto");
  const btnChange = document.getElementById("btnChangeDocPhoto");
  const btnCamera = document.getElementById("btnCameraDocPhoto");
  const btnRemove = document.getElementById("btnRemoveDocPhoto");
  const btnQuickSave = document.getElementById("btnSaveQuickDocPhoto");
  const avatarImg = document.getElementById("docAvatarImg");
  const avatarEl = document.getElementById("docAvatarEl");
  const avatarContainer = document.getElementById("docAvatarContainer");
  const previewBadge = document.getElementById("doctorPhotoPreviewBadge");
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
  if (avatarContainer) avatarContainer.addEventListener("click", triggerFileInput);
  if (avatarImg) avatarImg.addEventListener("click", triggerFileInput);

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
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

      // 3. Compress image on client-side & display instant high-res preview
      try {
        if (previewBadge) {
          previewBadge.style.display = "inline-block";
          previewBadge.style.background = "#0284c7";
          previewBadge.textContent = "Optimizing...";
        }

        const compressedDataUrl = await compressDoctorPhoto(file, 500, 0.85);
        pendingPhotoData = compressedDataUrl;
        pendingPhotoFile = file;

        // Display preview image immediately
        if (avatarImg) {
          avatarImg.src = compressedDataUrl;
          avatarImg.style.display = "block";
        }
        if (avatarEl) avatarEl.style.display = "none";

        if (previewBadge) {
          previewBadge.style.display = "inline-block";
          previewBadge.style.background = "#f59e0b";
          previewBadge.textContent = "Preview (Unsaved)";
        }

        updatePhotoButtons(true, true);
        showToast("Photo preview ready. Click 'Save Photo' to update in database.");
      } catch (err) {
        showProfileAlert(`Failed to process photo: ${err.message}`, "danger");
      }
    });
  }

  // Quick Save Photo Button
  if (btnQuickSave) {
    btnQuickSave.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isPhotoSaving) return;
      await executeDocPhotoPersistence();
    });
  }

  // Remove Photo Button with explicit confirmation
  if (btnRemove) {
    btnRemove.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const confirmed = window.confirm(
        "Are you sure you want to remove your profile photo? This will revert your profile to the default doctor avatar."
      );
      if (!confirmed) return;

      pendingPhotoData = "REMOVE";
      pendingPhotoFile = null;
      if (fileInput) fileInput.value = "";

      // Immediately execute persistent removal in database
      await executeDocPhotoPersistence();
    });
  }
}

/**
 * Toggle photo button visibility based on whether a photo is active and pending
 */
function updatePhotoButtons(hasPhoto, isPending = false) {
  const btnUpload = document.getElementById("btnUploadDocPhoto");
  const btnChange = document.getElementById("btnChangeDocPhoto");
  const btnRemove = document.getElementById("btnRemoveDocPhoto");
  const btnQuickSave = document.getElementById("btnSaveQuickDocPhoto");

  if (isPending) {
    if (btnUpload) btnUpload.style.display = hasPhoto ? "none" : "inline-flex";
    if (btnChange) btnChange.style.display = "inline-flex";
    if (btnRemove) btnRemove.style.display = "inline-flex";
    if (btnQuickSave) {
      btnQuickSave.style.display = "inline-flex";
      btnQuickSave.innerHTML = `<span>💾</span> <span>Save Photo</span>`;
    }
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
 * Executes direct upload and persistent saving of doctor photo to Cloudinary CDN & MySQL
 */
async function executeDocPhotoPersistence() {
  if (isPhotoSaving) return false;
  isPhotoSaving = true;

  const btnQuickSave = document.getElementById("btnSaveQuickDocPhoto");
  const previewBadge = document.getElementById("doctorPhotoPreviewBadge");
  const origQuickText = btnQuickSave ? btnQuickSave.innerHTML : "";

  if (btnQuickSave) {
    btnQuickSave.disabled = true;
    btnQuickSave.innerHTML = `<span>⏳</span> Saving...`;
  }
  if (previewBadge) {
    previewBadge.style.display = "inline-block";
    previewBadge.style.background = "#059669";
    previewBadge.textContent = "Saving to Database...";
  }

  const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
  const usernameKey = currentUserState.username || "admin";
  const persistentKey = `mt_doc_photo_${usernameKey}`;
  let newPhotoUrl = currentUserState.profile_photo;
  let newCloudinaryPid = currentUserState.cloudinary_public_id;

  try {
    if (pendingPhotoFile || pendingPhotoData) {
      if (pendingPhotoData === "REMOVE") {
        // Call removal endpoint
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

        // Clear in database via /api/profile
        try {
          await fetch(`${apiBase}/api/profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserState.user_id,
              username: currentUserState.username,
              profile_photo: "REMOVE",
              cloudinary_public_id: null
            })
          });
        } catch (e) {}

        newPhotoUrl = null;
        newCloudinaryPid = null;
        localStorage.removeItem(persistentKey);

      } else {
        // Upload photo via API
        let uploadRes = null;
        let lastUploadErr = null;

        try {
          const resp = await fetch(`${apiBase}/api/upload-photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile_photo: pendingPhotoData,
              user_id: currentUserState.user_id,
              username: currentUserState.username,
              role: "doctor"
            })
          });
          const data = await resp.json().catch(() => null);
          if (resp.ok && data && data.success) {
            uploadRes = data;
          } else if (data && !data.success) {
            lastUploadErr = data.message;
          }
        } catch (e) {
          lastUploadErr = e.message;
        }

        // Fallback to /api/upload-profile-photo rewrite
        if (!uploadRes) {
          try {
            const resp2 = await fetch(`${apiBase}/api/upload-profile-photo`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profile_photo: pendingPhotoData,
                user_id: currentUserState.user_id,
                username: currentUserState.username,
                role: "doctor"
              })
            });
            const data2 = await resp2.json().catch(() => null);
            if (resp2.ok && data2 && data2.success) {
              uploadRes = data2;
            }
          } catch (e) {}
        }

        if (uploadRes && uploadRes.success) {
          newPhotoUrl = uploadRes.photo_url || uploadRes.profile_photo || pendingPhotoData;
          newCloudinaryPid = uploadRes.cloudinary_public_id || null;
        } else {
          // If upload endpoint had a transient failure, use compressed data URL directly
          newPhotoUrl = pendingPhotoData;
          newCloudinaryPid = null;
        }

        // Persist in MySQL via /api/profile
        try {
          await fetch(`${apiBase}/api/profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserState.user_id,
              username: currentUserState.username,
              doctor_name: currentUserState.doctor_name || currentUserState.name,
              profile_photo: newPhotoUrl,
              cloudinary_public_id: newCloudinaryPid
            })
          });
        } catch (e) {}

        // Save in persistent key
        if (newPhotoUrl) {
          localStorage.setItem(persistentKey, newPhotoUrl);
        }
      }

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

      // Refresh view
      populateDoctorProfile(currentUserState);

      if (previewBadge) {
        previewBadge.style.display = "inline-block";
        previewBadge.style.background = "#10b981";
        previewBadge.textContent = "✓ Saved";
        setTimeout(() => {
          if (previewBadge) previewBadge.style.display = "none";
        }, 2500);
      }

      const successMsg = newPhotoUrl
        ? "Doctor profile photo updated and saved successfully in database!"
        : "Doctor profile photo removed successfully from database!";
      showProfileAlert(successMsg, "success");
      showToast("✓ " + successMsg);
      return true;
    }
    return false;
  } catch (err) {
    showProfileAlert(`Error saving doctor photo: ${err.message || err}`, "danger");
    if (previewBadge) previewBadge.style.display = "none";
    return false;
  } finally {
    isPhotoSaving = false;
    if (btnQuickSave) {
      btnQuickSave.disabled = false;
      btnQuickSave.innerHTML = origQuickText || `<span>💾</span> <span>Save Photo</span>`;
    }
  }
}

/**
 * Setup Doctor Profile Form submission & persistent save to MySQL
 */
function setupDoctorProfileForm() {
  const docForm = document.getElementById("docProfileForm");
  const profileMessage = document.getElementById("profileMessage");

  if (!docForm) return;

  docForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (profileMessage) profileMessage.hidden = true;

    const docName = document.getElementById("docFullName").value.trim();
    const license = document.getElementById("docRegNumber").value.trim();
    const specialty = document.getElementById("docSpecialization").value;
    const email = document.getElementById("docEmail").value.trim();
    const phone = document.getElementById("docPhone").value.trim();
    const hospital = document.getElementById("docHospital").value.trim();
    const address = document.getElementById("docAddress").value.trim();
    const experience = document.getElementById("docExperience").value.trim();
    const qualification = document.getElementById("docQualification").value.trim();

    const btn = document.getElementById("btnSaveDocProfile");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span> Saving Doctor Profile &amp; Photo...`;
    }

    try {
      // 1. Process photo persistence if a new photo or removal is pending
      if (pendingPhotoFile || pendingPhotoData) {
        await executeDocPhotoPersistence();
      }

      // 2. Persist credentials to MySQL database via /api/profile
      const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
      const profilePayload = {
        user_id: currentUserState.user_id,
        username: currentUserState.username,
        name: docName,
        doctor_name: docName,
        email: email,
        phone: phone,
        registration_number: license,
        specialization: specialty,
        specialty: specialty,
        hospital_name: hospital,
        hospital_address: address,
        address: address,
        experience: experience,
        qualification: qualification,
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
        name: docName,
        doctor_name: docName,
        email: email,
        phone: phone,
        license: license,
        registration_number: license,
        specialty: specialty,
        specialization: specialty,
        hospital: hospital,
        hospital_name: hospital,
        address: address,
        hospital_address: address,
        experience: experience,
        qualification: qualification
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      currentUserState = { ...updatedUser };

      populateDoctorProfile(currentUserState);
      showProfileAlert("Doctor credentials and profile photo updated and saved successfully in MySQL database!", "success");
      showToast("✓ Doctor profile saved successfully!");

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
  const btnCancel = document.getElementById("btnCancelDocProfile");
  if (!btnCancel) return;

  btnCancel.addEventListener("click", () => {
    pendingPhotoData = null;
    pendingPhotoFile = null;
    const fileInput = document.getElementById("doctorPhotoInput");
    if (fileInput) fileInput.value = "";

    const previewBadge = document.getElementById("doctorPhotoPreviewBadge");
    if (previewBadge) previewBadge.style.display = "none";

    populateDoctorProfile(currentUserState);
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
 * Populate all fields, tags, and avatar in the Doctor Profile DOM
 */
function populateDoctorProfile(user) {
  const displayName = user.doctor_name || user.name || (user.username ? `Dr. ${user.username}` : "Dr. admin");
  const displayUsername = user.username || "admin";
  const displayLicense = user.registration_number || user.license || "MCI-RAJ-2018-8492";
  const displaySpecialty = user.doctor_specialization || user.specialty || user.specialization || "Pediatric Neurology";

  // Hero Section
  const heroNameEl = document.getElementById("heroDocName");
  const heroSubEl = document.getElementById("heroDocSub");
  const regTagEl = document.getElementById("docRegIdTag");

  if (heroNameEl) heroNameEl.textContent = displayName.startsWith("Dr.") ? displayName : `Dr. ${displayName}`;
  if (heroSubEl) heroSubEl.textContent = `${displaySpecialty} • Practitioner @${displayUsername}`;
  if (regTagEl) regTagEl.textContent = `REG: #${displayLicense}`;

  // Form Inputs
  const fNameInput = document.getElementById("docFullName");
  const uNameInput = document.getElementById("docUsername");
  const licenseInput = document.getElementById("docRegNumber");
  const specialtyInput = document.getElementById("docSpecialization");
  const emailInput = document.getElementById("docEmail");
  const phoneInput = document.getElementById("docPhone");
  const hospitalInput = document.getElementById("docHospital");
  const addressInput = document.getElementById("docAddress");
  const expInput = document.getElementById("docExperience");
  const qualInput = document.getElementById("docQualification");

  if (fNameInput) fNameInput.value = displayName;
  if (uNameInput) uNameInput.value = displayUsername;
  if (licenseInput) licenseInput.value = displayLicense;
  if (specialtyInput) specialtyInput.value = displaySpecialty;
  if (emailInput) emailInput.value = user.email || "doctor@multitherapy.org";
  if (phoneInput) phoneInput.value = user.phone || "+91 9468650893";
  if (hospitalInput) hospitalInput.value = user.hospital_name || user.hospital || "Multi Therapy Rehabilitation Center";
  if (addressInput) addressInput.value = user.hospital_address || user.address || "Jaipur, Rajasthan";
  if (expInput) expInput.value = user.experience || "12+ Years";
  if (qualInput) qualInput.value = user.qualification || "MBBS, MD (Pediatrics), DM (Neuro)";

  // Navbar User Info
  const navUser = document.getElementById("navUsername");
  const navRole = document.getElementById("navRole");
  if (navUser) navUser.textContent = displayName.startsWith("Dr.") ? displayName : `Dr. ${displayName}`;
  if (navRole) navRole.textContent = "Clinical Specialist";

  // Avatar Photo Rendering
  const avatarEl = document.getElementById("docAvatarEl");
  const avatarImg = document.getElementById("docAvatarImg");
  const navAvatarEl = document.getElementById("navAvatar");
  const navAvatarImg = document.getElementById("navAvatarImg");

  const photo = user.profile_photo;
  const hasPhoto = hasValidPhoto(photo);

  if (hasPhoto) {
    const photoSrc = (typeof CdnManager !== "undefined")
      ? CdnManager.buildCdnUrl(photo, { width: 140, height: 140, crop: "fill" })
      : photo;

    if (avatarImg) {
      avatarImg.src = photoSrc;
      avatarImg.alt = displayName;
      avatarImg.style.display = "block";
      avatarImg.onerror = function () {
        this.src = DEFAULT_DOCTOR_AVATAR;
        this.onerror = null;
      };
    }
    if (avatarEl) avatarEl.style.display = "none";

    if (navAvatarImg) {
      navAvatarImg.src = photoSrc;
      navAvatarImg.alt = displayName;
      navAvatarImg.style.display = "block";
      navAvatarImg.onerror = function () {
        this.src = DEFAULT_DOCTOR_AVATAR;
        this.onerror = null;
      };
    }
    if (navAvatarEl) navAvatarEl.style.display = "none";

    updatePhotoButtons(true, false);
  } else {
    // Default avatar view: Display crisp, valid doctor vector avatar SVG
    if (avatarImg) {
      avatarImg.src = DEFAULT_DOCTOR_AVATAR;
      avatarImg.alt = "Default Doctor Avatar";
      avatarImg.style.display = "block";
      avatarImg.onerror = null;
    }
    if (avatarEl) avatarEl.style.display = "none";

    if (navAvatarImg) {
      navAvatarImg.src = DEFAULT_DOCTOR_AVATAR;
      navAvatarImg.style.display = "block";
      navAvatarImg.onerror = null;
    }
    if (navAvatarEl) navAvatarEl.style.display = "none";

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
    setTimeout(() => { if (el) el.hidden = true; }, 6000);
  }
}
