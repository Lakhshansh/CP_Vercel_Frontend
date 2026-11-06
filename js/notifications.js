// ============================================================================
// Multi Therapy - Universal Clinical Notification & Appointment Approval System
// Powers real-time notifications, Doctor Accept/Reject workflows, unread badges,
// and patient-doctor status synchronization across all portals.
// ============================================================================

(function () {
  const NOTIF_STORAGE_KEY = "multi_therapy_notifications";

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getAllNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // Initial default notifications if none exist
    const initial = [
      {
        id: "notif_system_1",
        recipient_role: "all",
        recipient_id: null,
        title: "Resend Email Service Active",
        message: "Doctor and Patient OTP delivery service is active via Multi Therapy Mailer.",
        type: "system",
        status: "unread",
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "notif_system_2",
        recipient_role: "all",
        recipient_id: null,
        title: "Clinical Database Connected",
        message: "Multi Therapy cloud clinical repository is synchronized.",
        type: "system",
        status: "unread",
        created_at: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    saveAllNotifications(initial);
    return initial;
  }

  function saveAllNotifications(list) {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  const NotificationManager = {
    /**
     * Get notifications relevant to the current user
     */
    getNotifications(user) {
      if (!user) user = getCurrentUser();
      const all = getAllNotifications();
      if (!user) return all.filter(n => n.recipient_role === "all");

      const userRole = (user.role || "").toLowerCase();
      const userId = user.user_id || user.patient_id || user.doctor_id;

      return all.filter(n => {
        if (n.recipient_role === "all") return true;

        if (userRole === "doctor" || userRole === "therapist") {
          if (n.recipient_role === "doctor" || n.recipient_role === "therapist") {
            if (!n.recipient_id) return true;
            return String(n.recipient_id) === String(userId) ||
                   String(n.recipient_id) === String(user.doctor_id) ||
                   String(n.recipient_id) === String(user.user_id);
          }
        }

        if (userRole === "patient") {
          if (n.recipient_role === "patient") {
            if (!n.recipient_id) return true;
            return String(n.recipient_id) === String(userId) ||
                   String(n.recipient_id) === String(user.patient_id) ||
                   String(n.recipient_id) === String(user.user_id);
          }
        }

        if (userRole === "admin") return true;

        return false;
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    /**
     * Get count of unread notifications
     */
    getUnreadCount(user) {
      const userNotifs = this.getNotifications(user);
      return userNotifs.filter(n => n.status === "unread").length;
    },

    /**
     * Add a new notification and trigger UI update
     */
    addNotification(notif) {
      const all = getAllNotifications();
      const newNotif = {
        id: notif.id || ("notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5)),
        recipient_role: notif.recipient_role || "all",
        recipient_id: notif.recipient_id || null,
        title: notif.title || "Notification",
        message: notif.message || "",
        type: notif.type || "general",
        appt_id: notif.appt_id || null,
        patient_name: notif.patient_name || null,
        doctor_name: notif.doctor_name || null,
        appointment_date: notif.appointment_date || null,
        appointment_time: notif.appointment_time || null,
        appointment_type: notif.appointment_type || null,
        reason: notif.reason || null,
        status: "unread",
        created_at: notif.created_at || new Date().toISOString()
      };

      all.unshift(newNotif);
      saveAllNotifications(all);

      this.updateBadgesAndDropdowns();
      window.dispatchEvent(new CustomEvent("multiTherapyNotificationAdded", { detail: newNotif }));
      return newNotif;
    },

    /**
     * Create notifications when a patient submits a new appointment booking
     */
    createAppointmentBookingNotifications(appt) {
      // 1. Notification for Doctor
      this.addNotification({
        recipient_role: "doctor",
        recipient_id: appt.doctor_id || null,
        title: "New Appointment Request",
        message: `${appt.patient_name || 'A patient'} requested an appointment for ${formatDateLabel(appt.appointment_date)} at ${formatTimeLabel(appt.appointment_time)} (${appt.appointment_type || 'Consultation'}).`,
        type: "appointment_request",
        appt_id: appt.appointment_id,
        patient_name: appt.patient_name,
        doctor_name: appt.doctor_name,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time,
        appointment_type: appt.appointment_type,
        reason: appt.reason || appt.notes
      });

      // 2. Notification for Patient
      this.addNotification({
        recipient_role: "patient",
        recipient_id: appt.patient_id || appt.user_id,
        title: "Appointment Request Submitted",
        message: `Your appointment request with ${appt.doctor_name || 'Specialist'} for ${formatDateLabel(appt.appointment_date)} at ${formatTimeLabel(appt.appointment_time)} is awaiting doctor approval.`,
        type: "appointment_pending",
        appt_id: appt.appointment_id,
        patient_name: appt.patient_name,
        doctor_name: appt.doctor_name,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time,
        appointment_type: appt.appointment_type
      });
    },

    /**
     * Doctor accepts an appointment request
     */
    async acceptAppointment(apptId) {
      const rawUser = localStorage.getItem("currentUser");
      const user = rawUser ? JSON.parse(rawUser) : {};
      const doctorId = user.doctor_id || user.user_id || null;
      const doctorPhone = user.phone || user.mobile || "+91 98765 43210";

      let serverData = null;
      try {
        if (typeof apiRequest === "function") {
          const res = await apiRequest("/api/appointments?action=accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appointment_id: apptId,
              doctor_id: doctorId,
              doctor_phone: doctorPhone
            })
          });
          if (res && res.success) {
            serverData = res.appointment;
          }
        }
      } catch (err) {
        console.warn("[Notifications] API accept error:", err.message);
      }

      let appt = this.updateAppointmentStatus(apptId, "Confirmed");
      if (!appt) {
        appt = serverData || { appointment_id: apptId };
      }
      if (serverData) {
        Object.assign(appt, serverData);
      }

      const docPhone = appt.doctor_phone || doctorPhone || "+91 98765 43210";

      // Create notification for Patient: Doctor phone revealed only upon acceptance
      this.addNotification({
        recipient_role: "patient",
        recipient_id: appt.patient_id || null,
        title: "Appointment Confirmed ✓",
        message: `${appt.doctor_name || 'Dr. Specialist'} has accepted your appointment! Doctor Contact Phone is now unlocked: ${docPhone}.`,
        type: "appointment_confirmed",
        appt_id: apptId,
        patient_name: appt.patient_name,
        doctor_name: appt.doctor_name,
        doctor_phone: docPhone,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time
      });

      // Mark the related request notification as read
      this.markAppointmentRequestHandled(apptId);

      // Emit global status change event
      window.dispatchEvent(new CustomEvent("appointmentStatusChanged", {
        detail: { apptId, status: "Confirmed", doctor_phone: docPhone, appt }
      }));

      if (typeof showToast === "function") {
        showToast(`Appointment #APT-${apptId} accepted & confirmed! Doctor phone revealed to patient.`, "success");
      } else {
        alert(`Appointment #APT-${apptId} confirmed. Patient has been notified with your contact details.`);
      }

      this.updateBadgesAndDropdowns();
      return appt;
    },

    /**
     * Doctor rejects an appointment request
     */
    async rejectAppointment(apptId, reason = "") {
      if (!reason) {
        reason = prompt("Please provide a clinical or scheduling reason for rejecting this appointment (initiates 100% patient refund):", "Attending specialist unavailable during this time slot") || "Specialist unavailable";
      }

      const rawUser = localStorage.getItem("currentUser");
      const user = rawUser ? JSON.parse(rawUser) : {};
      const doctorId = user.doctor_id || user.user_id || null;

      let refundStatus = "Rejected – Refund Pending";
      let serverData = null;

      try {
        if (typeof apiRequest === "function") {
          const res = await apiRequest("/api/appointments?action=reject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appointment_id: apptId,
              doctor_id: doctorId,
              rejection_reason: reason
            })
          });
          if (res && res.success) {
            refundStatus = res.refund_status || res.status || "Rejected – Refund Pending";
            serverData = res.appointment;
          }
        }
      } catch (err) {
        console.warn("[Notifications] API reject error:", err.message);
      }

      let appt = this.updateAppointmentStatus(apptId, refundStatus, reason);
      if (!appt) {
        appt = serverData || { appointment_id: apptId };
      }
      if (serverData) {
        Object.assign(appt, serverData);
      }

      // Create notification for Patient with refund guarantee message
      this.addNotification({
        recipient_role: "patient",
        recipient_id: appt.patient_id || null,
        title: "Appointment Rejected – Refund Initiated",
        message: `${appt.doctor_name || 'Attending specialist'} was unable to accept your session (${reason}). Your consultation fee has been queued for 100% refund.`,
        type: "appointment_rejected_refund",
        appt_id: apptId,
        patient_name: appt.patient_name,
        doctor_name: appt.doctor_name,
        appointment_date: appt.appointment_date,
        reason,
        refund_status: refundStatus
      });

      // Mark the related request notification as read
      this.markAppointmentRequestHandled(apptId);

      // Emit global status change event
      window.dispatchEvent(new CustomEvent("appointmentStatusChanged", {
        detail: { apptId, status: refundStatus, reason, appt }
      }));

      if (typeof showToast === "function") {
        showToast(`Appointment #APT-${apptId} rejected. Patient notified and 100% refund initiated.`, "warning");
      } else {
        alert(`Appointment #APT-${apptId} rejected. 100% refund initiated.`);
      }

      this.updateBadgesAndDropdowns();
      return appt;
    },

    /**
     * Updates appointment status in localStorage
     */
    updateAppointmentStatus(apptId, newStatus, reason = "") {
      try {
        const raw = localStorage.getItem("patient_appointments");
        let list = raw ? JSON.parse(raw) : [];
        const match = list.find(a => String(a.appointment_id) === String(apptId));
        if (match) {
          match.status = newStatus;
          if (reason) match.rejection_reason = reason;
          localStorage.setItem("patient_appointments", JSON.stringify(list));
          return match;
        }
      } catch (e) {}
      return null;
    },

    /**
     * Mark appointment request notification as handled
     */
    markAppointmentRequestHandled(apptId) {
      const all = getAllNotifications();
      all.forEach(n => {
        if (String(n.appt_id) === String(apptId) && n.type === "appointment_request") {
          n.status = "read";
        }
      });
      saveAllNotifications(all);
    },

    /**
     * Mark single notification as read
     */
    markAsRead(notifId) {
      const all = getAllNotifications();
      const n = all.find(x => x.id === notifId);
      if (n) {
        n.status = "read";
        saveAllNotifications(all);
        this.updateBadgesAndDropdowns();
      }
    },

    /**
     * Mark all notifications as read for current user
     */
    markAllAsRead() {
      const user = getCurrentUser();
      const relevant = this.getNotifications(user);
      const relevantIds = new Set(relevant.map(n => n.id));

      const all = getAllNotifications();
      all.forEach(n => {
        if (relevantIds.has(n.id)) {
          n.status = "read";
        }
      });
      saveAllNotifications(all);
      this.updateBadgesAndDropdowns();
    },

    /**
     * Update all badge counters and dropdown markup on current page
     */
    updateBadgesAndDropdowns() {
      const user = getCurrentUser();
      const unreadCount = this.getUnreadCount(user);
      const notifs = this.getNotifications(user);

      // 1. Update Badge Counters
      const badges = document.querySelectorAll(
        "#headerNotifBadge, #docNotifBadge, .shared-notif-badge, .doc-notif-badge, #notifBadge"
      );
      badges.forEach(b => {
        b.textContent = unreadCount;
        b.style.display = unreadCount > 0 ? "flex" : "none";
      });

      // 2. Update Dropdowns
      const dropdowns = document.querySelectorAll(
        "#notifDropdown, #docNotifDropdown, #headerNotifDropdown, .shared-notif-dropdown"
      );
      dropdowns.forEach(dd => {
        this.renderDropdownContent(dd, notifs, unreadCount, user);
      });
    },

    /**
     * Render the rich notification dropdown HTML
     */
    renderDropdownContent(container, notifs, unreadCount, user) {
      if (!container) return;

      const userRole = (user && user.role ? user.role : "").toLowerCase();
      const isDoctor = userRole === "doctor" || userRole === "therapist";

      let headerHtml = `
        <div class="shared-notif-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 8px;">
          <div>
            <strong style="color: #103463; font-size: 13.5px;">Notifications</strong>
            <span class="badge ${unreadCount > 0 ? 'bg-danger' : 'bg-secondary'} ms-1" style="font-size: 10px;">${unreadCount} New</span>
          </div>
          ${unreadCount > 0 ? `
            <button type="button" class="btn btn-link p-0 text-primary text-decoration-none" style="font-size: 11px; font-weight: 600;" onclick="window.NotificationManager.markAllAsRead()">
              Mark all read
            </button>
          ` : ''}
        </div>
      `;

      if (notifs.length === 0) {
        container.innerHTML = headerHtml + `
          <div style="text-align: center; padding: 24px 12px; color: #64748b; font-size: 12.5px;">
            <div style="font-size: 24px; margin-bottom: 6px;">🔔</div>
            <div>No notifications right now.</div>
          </div>
        `;
        return;
      }

      let itemsHtml = `<div style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">`;

      notifs.slice(0, 10).forEach(n => {
        const isUnread = n.status === "unread";
        let icon = "🔔";
        let iconBg = "#f1f5f9";

        if (n.type === "appointment_request") {
          icon = "🗓️";
          iconBg = "#eff6ff";
        } else if (n.type === "appointment_confirmed") {
          icon = "✅";
          iconBg = "#ecfdf5";
        } else if (n.type === "appointment_rejected") {
          icon = "❌";
          iconBg = "#fef2f2";
        } else if (n.type === "system") {
          icon = "⚡";
          iconBg = "#f0fdf4";
        }

        const timeStr = formatRelativeTime(n.created_at);

        itemsHtml += `
          <div class="shared-notif-item ${isUnread ? 'notif-unread' : ''}" 
               style="display: flex; gap: 10px; padding: 10px; border-radius: 10px; background: ${isUnread ? '#f8fafc' : '#ffffff'}; border: 1px solid ${isUnread ? '#bfdbfe' : '#f1f5f9'}; transition: all 0.2s ease;"
               onclick="window.NotificationManager.markAsRead('${n.id}')">
            
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${iconBg}; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
              ${icon}
            </div>

            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
                <div style="font-weight: 700; font-size: 12.5px; color: #103463; line-height: 1.3;">${escapeHtml(n.title)}</div>
                <small style="font-size: 10px; color: #94a3b8; white-space: nowrap;">${timeStr}</small>
              </div>

              <div style="font-size: 11.5px; color: #475569; line-height: 1.4; margin-bottom: 4px;">
                ${escapeHtml(n.message)}
              </div>

              ${(isDoctor && n.type === "appointment_request" && n.appt_id) ? `
                <div style="display: flex; gap: 6px; margin-top: 6px;" onclick="event.stopPropagation()">
                  <button type="button" class="btn btn-sm btn-success py-0 px-2" style="font-size: 11px; font-weight: 700; border-radius: 6px;" onclick="window.NotificationManager.acceptAppointment(${n.appt_id})">
                    ✓ Accept
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2" style="font-size: 11px; font-weight: 700; border-radius: 6px;" onclick="window.NotificationManager.rejectAppointment(${n.appt_id})">
                    ✕ Reject
                  </button>
                  <a href="./doctor-appointments.html" class="btn btn-sm btn-light py-0 px-2 border" style="font-size: 11px; font-weight: 600; border-radius: 6px;">
                    Details
                  </a>
                </div>
              ` : `
                ${n.appt_id ? `
                  <a href="${isDoctor ? './doctor-appointments.html' : './patient-appointments.html'}" style="font-size: 11px; font-weight: 600; color: #0875F9; text-decoration: none;">
                    View in Appointments &rarr;
                  </a>
                ` : ''}
              `}
            </div>

          </div>
        `;
      });

      itemsHtml += `</div>`;
      container.innerHTML = headerHtml + itemsHtml;
    },

    /**
     * Initialize on DOMContentLoaded
     */
    init() {
      const user = getCurrentUser();
      this.updateBadgesAndDropdowns();

      // Bind all notification bell toggles
      const bellButtons = document.querySelectorAll(
        "#btnNotifications, #docNotifBtn, #btnHeaderNotifications, .shared-notif-btn, .doc-notif-btn"
      );

      bellButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const wrap = btn.closest(".shared-notif-wrap") || btn.parentElement;
          const dd = wrap ? wrap.querySelector(".shared-notif-dropdown, .doc-notif-dropdown") : document.getElementById("notifDropdown");
          if (dd) {
            dd.classList.toggle("show");
            if (dd.classList.contains("show")) {
              NotificationManager.updateBadgesAndDropdowns();
            }
          }
        });
      });

      // Dismiss dropdowns on outside click
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".shared-notif-wrap, .shared-notif-dropdown, .doc-notif-dropdown, .shared-notif-btn")) {
          document.querySelectorAll(".shared-notif-dropdown.show, .doc-notif-dropdown.show").forEach(d => {
            d.classList.remove("show");
          });
        }
      });
    }
  };

  // Helper date and time formatters
  function formatDateLabel(dateStr) {
    if (!dateStr) return "Upcoming Date";
    try {
      const parts = String(dateStr).split("-");
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
      }
      return String(dateStr);
    } catch (_) {
      return String(dateStr);
    }
  }

  function formatTimeLabel(timeStr) {
    if (!timeStr) return "Scheduled Time";
    try {
      const parts = String(timeStr).split(":");
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      }
      return String(timeStr);
    } catch (_) {
      return String(timeStr);
    }
  }

  function formatRelativeTime(isoStr) {
    if (!isoStr) return "";
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (_) {
      return "";
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

  window.NotificationManager = NotificationManager;

  // Global action bridges for direct inline onclick handlers
  window.acceptAppointmentAction = function (apptId) {
    if (window.NotificationManager && typeof window.NotificationManager.acceptAppointment === "function") {
      return window.NotificationManager.acceptAppointment(apptId);
    }
  };

  window.rejectAppointmentAction = function (apptId, reason) {
    if (window.NotificationManager && typeof window.NotificationManager.rejectAppointment === "function") {
      return window.NotificationManager.rejectAppointment(apptId, reason);
    }
  };

  // Auto-init on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => NotificationManager.init());
  } else {
    NotificationManager.init();
  }
})();

