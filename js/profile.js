document.addEventListener("DOMContentLoaded", async () => {
  // Check auth state
  const rawUser = localStorage.getItem("currentUser");
  let user = null;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch (e) {
      user = null;
    }
  }

  if (!user) {
    window.location.href = "./index.html";
    return;
  }

  // Handle Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await apiRequest("/api/logout", { method: "POST" });
      } catch (err) {
        // Continue
      }
      localStorage.removeItem("currentUser");
      window.location.href = "./index.html";
    });
  }

  // Pre-fill initial known data from localStorage
  populateProfileUI(user);

  // Fetch full live profile details from API
  try {
    const res = await apiRequest(`/api/profile?user_id=${encodeURIComponent(user.user_id || '')}&username=${encodeURIComponent(user.username || '')}`);
    if (res && res.user) {
      user = { ...user, ...res.user };
      localStorage.setItem("currentUser", JSON.stringify(user));
      populateProfileUI(user);
    }
  } catch (error) {
    console.warn("Could not fetch detailed profile from API:", error);
  }

  // Edit Profile Form Submission
  const editForm = document.getElementById("editProfileForm");
  const modalAlert = document.getElementById("modalAlert");
  const pageAlert = document.getElementById("profileAlert");

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      modalAlert.hidden = true;
      modalAlert.textContent = "";

      const btnSave = document.getElementById("btnSaveProfile");
      btnSave.disabled = true;
      btnSave.textContent = "Saving...";

      const updatedPayload = {
        user_id: user.user_id,
        username: user.username,
        doctor_name: document.getElementById("editDoctorName").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        phone: document.getElementById("editPhone").value.trim(),
        hospital_name: document.getElementById("editHospitalName").value.trim(),
        doctor_specialization: document.getElementById("editSpecialization").value.trim(),
        registration_number: document.getElementById("editRegistration").value.trim(),
        hospital_address: document.getElementById("editAddress").value.trim(),
        city: document.getElementById("editCity").value.trim(),
        state: document.getElementById("editState").value.trim()
      };

      try {
        const res = await apiRequest("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPayload)
        });

        if (res && res.user) {
          user = { ...user, ...res.user };
        } else {
          user = { ...user, ...updatedPayload };
        }
        localStorage.setItem("currentUser", JSON.stringify(user));
        populateProfileUI(user);

        // Close modal
        const modalEl = document.getElementById("editProfileModal");
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        // Show page alert
        pageAlert.hidden = false;
        pageAlert.className = "alert alert-success mb-3";
        pageAlert.textContent = res.message || "Profile successfully updated!";
        setTimeout(() => { pageAlert.hidden = true; }, 4000);
      } catch (err) {
        modalAlert.hidden = false;
        modalAlert.textContent = err.message || "Failed to update profile.";
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = "Save Changes";
      }
    });
  }
});

function populateProfileUI(user) {
  if (!user) return;

  const uname = user.username || "User";
  const email = user.email || "No email registered";
  const role = user.role || "Admin";

  document.getElementById("headerUsername").textContent = user.doctor_name || uname;
  document.getElementById("headerEmail").textContent = email;
  document.getElementById("headerRole").textContent = role;

  const navUserEl = document.getElementById("navUsername");
  if (navUserEl) navUserEl.textContent = uname;
  const navRoleEl = document.getElementById("navRole");
  if (navRoleEl) navRoleEl.textContent = role;

  const initial = (uname.charAt(0) || "U").toUpperCase();
  const avatarEl = document.getElementById("avatarInitial");
  if (avatarEl) avatarEl.textContent = initial;
  const navAvatarEl = document.getElementById("navAvatar");
  if (navAvatarEl) navAvatarEl.textContent = initial;

  setFieldText("valUsername", uname);
  setFieldText("valEmail", user.email);
  setFieldText("valPhone", user.phone);
  setFieldText("valHospital", user.hospital_name);
  setFieldText("valDoctor", user.doctor_name);
  setFieldText("valSpec", user.doctor_specialization);
  setFieldText("valAddress", user.hospital_address);

  const cityState = [user.city, user.state].filter(Boolean).join(", ");
  setFieldText("valCityState", cityState);
  setFieldText("valReg", user.registration_number);
  setFieldText("valRole", role);
  setFieldText("valUserId", user.user_id ? `#${user.user_id}` : "-");

  // Populate form fields
  setInputValue("editDoctorName", user.doctor_name);
  setInputValue("editEmail", user.email);
  setInputValue("editPhone", user.phone);
  setInputValue("editHospitalName", user.hospital_name);
  setInputValue("editSpecialization", user.doctor_specialization);
  setInputValue("editRegistration", user.registration_number);
  setInputValue("editAddress", user.hospital_address);
  setInputValue("editCity", user.city);
  setInputValue("editState", user.state);
}

function setFieldText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value && String(value).trim()) {
    el.textContent = value;
    el.classList.remove("empty");
  } else {
    el.textContent = "Not set";
    el.classList.add("empty");
  }
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}
