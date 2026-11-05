/**
 * Multi Therapy - Clinical Management Navigation Dropdown & Header Controller
 * Handles click, tap, hover, keyboard navigation, outside-click dismissal,
 * viewport edge-alignment, automatic active page highlighting, and
 * universal mobile hamburger navigation toggle.
 */

(function () {
  function initClinicalDropdowns() {
    const dropdowns = document.querySelectorAll(".nav-item-dropdown");

    // 1. Auto-highlight active link and toggle if current page matches any dropdown item
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-dropdown-link").forEach((link) => {
      const href = link.getAttribute("href") ? link.getAttribute("href").split("/").pop().split("?")[0].split("#")[0] : "";
      if (href && (href === currentPath || (currentPath === "" && href === "index.html"))) {
        link.classList.add("active");
        const parentDropdown = link.closest(".nav-item-dropdown");
        if (parentDropdown) {
          const toggle = parentDropdown.querySelector(".nav-dropdown-toggle");
          if (toggle) toggle.classList.add("active");
        }
      }
    });

    // 2. Auto-detect if dropdown is near viewport right edge and align accordingly
    function adjustDropdownAlignment() {
      if (window.innerWidth >= 992) {
        dropdowns.forEach((dropdown) => {
          const rect = dropdown.getBoundingClientRect();
          if (rect.right + 120 > window.innerWidth) {
            dropdown.classList.add("align-right");
          } else {
            dropdown.classList.remove("align-right");
          }
        });
      }
    }

    adjustDropdownAlignment();
    window.addEventListener("resize", adjustDropdownAlignment);

    // 3. Dropdown Toggle (Click & Tap)
    dropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector(".nav-dropdown-toggle");
      const menu = dropdown.querySelector(".nav-dropdown-menu");

      if (!toggle || !menu) return;

      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = dropdown.classList.contains("open");

        // Close other dropdowns first
        document.querySelectorAll(".nav-item-dropdown.open").forEach((other) => {
          if (other !== dropdown) {
            other.classList.remove("open");
            const otherToggle = other.querySelector(".nav-dropdown-toggle");
            if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
          }
        });

        if (isOpen) {
          dropdown.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        } else {
          dropdown.classList.add("open");
          toggle.setAttribute("aria-expanded", "true");
        }
      });

      // Close when clicking any link inside the menu
      menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", function () {
          dropdown.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    });

    // 4. Universal Mobile Navigation Hamburger Toggle
    const navToggles = document.querySelectorAll(
      ".pt-nav-toggle, .ts-nav-toggle, .tp-nav-toggle, .apt-nav-toggle, .ex-nav-toggle, .cp-nav-toggle, .ph-nav-toggle, .doc-nav-toggle, [data-nav-toggle], #navToggle, #docNavToggle"
    );

    navToggles.forEach((btn) => {
      if (btn.dataset.universalNavAttached) return;
      btn.dataset.universalNavAttached = "true";

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const header = btn.closest("header, nav, .cp-navbar, .pt-header, .tp-header, .apt-header, .ex-header, .ts-header, .ph-header, .doc-header") || document;
        const navMenu = header.querySelector(
          ".pt-nav-menu, .ts-nav-menu, .tp-nav-menu, .apt-nav-menu, .ex-nav-menu, .cp-nav-menu, .ph-nav-menu, .doc-nav-menu, #navMenu, #tpNavMenu, #aptNavMenu, #exNavMenu, #docNavMenu"
        );

        if (navMenu) {
          const isOpening = !navMenu.classList.contains("active") && !navMenu.classList.contains("open");
          navMenu.classList.toggle("active");
          navMenu.classList.toggle("open");
          btn.setAttribute("aria-expanded", isOpening ? "true" : "false");
        }
      });
    });

    // 5. Close dropdowns & mobile menus when clicking outside
    document.addEventListener("click", function (e) {
      // Close dropdowns
      document.querySelectorAll(".nav-item-dropdown.open").forEach((dropdown) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove("open");
          const toggle = dropdown.querySelector(".nav-dropdown-toggle");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
      });

      // Close mobile menus if clicked outside
      if (window.innerWidth <= 991) {
        const isToggleClick = e.target.closest(
          ".pt-nav-toggle, .ts-nav-toggle, .tp-nav-toggle, .apt-nav-toggle, .ex-nav-toggle, .cp-nav-toggle, .ph-nav-toggle, .doc-nav-toggle, #navToggle, #docNavToggle"
        );
        if (!isToggleClick) {
          document.querySelectorAll(
            ".pt-nav-menu.active, .ts-nav-menu.active, .tp-nav-menu.active, .apt-nav-menu.active, .ex-nav-menu.active, .cp-nav-menu.open, .ph-nav-menu.open, .doc-nav-menu.open"
          ).forEach((menu) => {
            if (!menu.contains(e.target)) {
              menu.classList.remove("active", "open");
            }
          });
        }
      }
    });

    // 6. Close dropdowns & mobile menus on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".nav-item-dropdown.open").forEach((dropdown) => {
          dropdown.classList.remove("open");
          const toggle = dropdown.querySelector(".nav-dropdown-toggle");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        });
        document.querySelectorAll(
          ".pt-nav-menu.active, .ts-nav-menu.active, .tp-nav-menu.active, .apt-nav-menu.active, .ex-nav-menu.active, .cp-nav-menu.open, .ph-nav-menu.open, .doc-nav-menu.open"
        ).forEach((menu) => {
          menu.classList.remove("active", "open");
        });
      }
    });
  // 7. Universal Single Floating WhatsApp Button Enforcer
  function ensureSingleFloatingWhatsApp() {
    try {
      const waButtons = Array.from(document.querySelectorAll('.floating-whatsapp-btn'));
      
      // Also check any fixed anchor linking to wa.me that may lack the class
      document.querySelectorAll('a[href*="wa.me"]').forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && !waButtons.includes(el)) {
          el.classList.add('floating-whatsapp-btn');
          waButtons.push(el);
        }
      });

      if (waButtons.length > 1) {
        // Keep only the first one, remove duplicates
        for (let i = 1; i < waButtons.length; i++) {
          waButtons[i].remove();
        }
      } else if (waButtons.length === 0 && document.body) {
        // Create standard floating WhatsApp button if not present in markup
        const waLink = document.createElement('a');
        waLink.href = 'https://wa.me/919468650893';
        waLink.target = '_blank';
        waLink.rel = 'noopener noreferrer';
        waLink.className = 'floating-whatsapp-btn';
        waLink.title = 'Chat with us on WhatsApp';
        waLink.setAttribute('aria-label', 'Chat with us on WhatsApp');
        waLink.innerHTML = '<img src="./images/whatsapp-us.png" alt="WhatsApp Us" width="48" height="48" style="height: 48px; width: auto; display: block; border-radius: 9999px;">';
        document.body.appendChild(waLink);
      } else if (waButtons.length === 1) {
        const btn = waButtons[0];
        btn.setAttribute('aria-label', 'Chat with us on WhatsApp');
        if (!btn.getAttribute('target')) btn.setAttribute('target', '_blank');
        if (!btn.getAttribute('rel')) btn.setAttribute('rel', 'noopener noreferrer');
      }
    } catch (e) {
      console.warn("Floating WhatsApp singleton guard:", e);
    }
  }

  // 8. Universal Single Page Footer Enforcer
  function ensureSingleFooter() {
    try {
      const footers = document.querySelectorAll('footer');
      if (footers.length > 1) {
        // If multiple footers exist on the page, keep the last one (main page footer) or remove redundant ones
        for (let i = 0; i < footers.length - 1; i++) {
          // If previous footer is an inner card/dialog footer, convert tag to div
          const f = footers[i];
          const div = document.createElement('div');
          Array.from(f.attributes).forEach(attr => div.setAttribute(attr.name, attr.value));
          div.innerHTML = f.innerHTML;
          div.classList.add('sub-footer-container');
          f.parentNode.replaceChild(div, f);
        }
      }
    } catch (e) {
      console.warn("Footer singleton guard:", e);
    }
  }

  
    // 4b. Universal Notification Dropdown Controller
    function initUniversalNotifications() {
      const notifBtns = document.querySelectorAll(
        "#btnHeaderNotifications, .shared-notif-btn, #docNotifBtn, #btnNotifications, #btnNavNotifications"
      );

      notifBtns.forEach((btn) => {
        if (btn.dataset.universalNotifAttached) return;
        btn.dataset.universalNotifAttached = "true";

        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();

          const parent = btn.closest(".shared-notif-wrap") || btn.parentElement;
          const dropdown = parent.querySelector(
            ".shared-notif-dropdown, .doc-notif-dropdown, .apt-dropdown-menu, #headerNotifDropdown, #docNotifDropdown, #notifDropdown"
          ) || document.getElementById("headerNotifDropdown") || document.getElementById("docNotifDropdown") || document.getElementById("notifDropdown");

          if (dropdown) {
            dropdown.classList.toggle("show");
          }
        });
      });

      // Dismiss notification dropdown when clicking outside
      document.addEventListener("click", function (e) {
        if (!e.target.closest("#btnHeaderNotifications, .shared-notif-btn, #docNotifBtn, #btnNotifications, #btnNavNotifications, .shared-notif-dropdown, .doc-notif-dropdown, .apt-dropdown-menu, #headerNotifDropdown, #docNotifDropdown, #notifDropdown")) {
          document.querySelectorAll(
            ".shared-notif-dropdown.show, .doc-notif-dropdown.show, .apt-dropdown-menu.show, #headerNotifDropdown.show, #docNotifDropdown.show, #notifDropdown.show"
          ).forEach((menu) => menu.classList.remove("show"));
        }
      });
    }
    initUniversalNotifications();

  function initPageStandards() {
    initClinicalDropdowns();
    ensureSingleFloatingWhatsApp();
    ensureSingleFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageStandards);
  } else {
    initPageStandards();
  }

  window.addEventListener("load", function() {
    ensureSingleFloatingWhatsApp();
    ensureSingleFooter();
  });
})();
