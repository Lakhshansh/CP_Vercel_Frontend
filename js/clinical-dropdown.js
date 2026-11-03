/**
 * Multi Therapy - Clinical Management Navigation Dropdown Controller
 * Handles click, tap, hover, keyboard navigation, outside-click dismissal,
 * viewport edge-alignment, and automatic active page highlighting.
 */

(function () {
  function initClinicalDropdowns() {
    const dropdowns = document.querySelectorAll(".nav-item-dropdown");

    // Auto-highlight active link and toggle if current page matches any dropdown item
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

    // Auto-detect if dropdown is near viewport right edge and align accordingly
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

    dropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector(".nav-dropdown-toggle");
      const menu = dropdown.querySelector(".nav-dropdown-menu");

      if (!toggle || !menu) return;

      // Click / Tap Toggle
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = dropdown.classList.contains("open");

        // Close any other open dropdowns first
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

    // Close when clicking outside
    document.addEventListener("click", function (e) {
      document.querySelectorAll(".nav-item-dropdown.open").forEach((dropdown) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove("open");
          const toggle = dropdown.querySelector(".nav-dropdown-toggle");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
      });
    });

    // Close when pressing Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".nav-item-dropdown.open").forEach((dropdown) => {
          dropdown.classList.remove("open");
          const toggle = dropdown.querySelector(".nav-dropdown-toggle");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initClinicalDropdowns);
  } else {
    initClinicalDropdowns();
  }
})();
