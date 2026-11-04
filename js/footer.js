/**
 * Multi Therapy - Global Professional Healthcare Footer Component
 * Standardizes the 4-column professional footer across all pages,
 * adjusts relative links for clean routing, and prevents duplicate footers.
 */

(function () {
  'use strict';

  /**
   * Determine the appropriate relative base path depending on the current pathname depth.
   */
  function getBasePath() {
    if (typeof window === 'undefined') return './';
    const path = window.location.pathname.replace(/\\/g, '/');
    // If inside a subfolder (e.g., /admin/ or /nested/), calculate relative depth
    const segments = path.split('/').filter(Boolean);
    // Ignore root-level files like /doctors, /doctors.html, /index.html
    if (segments.length > 1) {
      const depth = segments.length - 1;
      return '../'.repeat(depth);
    }
    return './';
  }

  /**
   * Return the canonical HTML template for the 4-column professional footer.
   */
  function getFooterHTML(base) {
    return `
    <div class="mt-footer-container">
      <div class="mt-footer-grid">
        
        <!-- Column 1: Multi Therapy Branding -->
        <div class="mt-footer-col mt-col-divider">
          <div class="mt-footer-brand-wrap">
            <img src="${base}images/multi_therapy_logo_100x100.png" alt="Multi Therapy Logo" class="mt-footer-logo" width="52" height="52" loading="lazy">
            <div>
              <div class="mt-footer-brand-title">Multi Therapy</div>
              <div class="mt-footer-brand-tagline">Care • Support • Progress • Together</div>
            </div>
          </div>
          <p class="mt-footer-desc">
            A comprehensive clinical management platform empowering Cerebral Palsy patients, doctors, physiotherapists, and family caregivers.
          </p>
        </div>

        <!-- Column 2: Quick Links -->
        <div class="mt-footer-col mt-col-divider">
          <h4 class="mt-footer-heading">Quick Links</h4>
          <ul class="mt-footer-links">
            <li><a href="${base}index.html"><span class="mt-footer-link-bullet">›</span> Home</a></li>
            <li><a href="${base}index.html#about"><span class="mt-footer-link-bullet">›</span> About Us</a></li>
            <li><a href="${base}index.html#services"><span class="mt-footer-link-bullet">›</span> Services</a></li>
            <li><a href="${base}subscription-pricing.html"><span class="mt-footer-link-bullet">›</span> Subscription Plans</a></li>
            <li><a href="${base}login.html"><span class="mt-footer-link-bullet">›</span> Patient Login</a></li>
            <li><a href="${base}doctor-login.html"><span class="mt-footer-link-bullet">›</span> Doctor Login</a></li>
            <li><a href="${base}index.html#contact" id="footerContactLink"><span class="mt-footer-link-bullet">›</span> Contact</a></li>
          </ul>
        </div>

        <!-- Column 3: Patient Portal -->
        <div class="mt-footer-col mt-col-divider">
          <h4 class="mt-footer-heading">Patient Portal</h4>
          <ul class="mt-footer-links">
            <li><a href="${base}appointments.html"><span class="mt-footer-link-bullet">›</span> Appointments</a></li>
            <li><a href="${base}therapy-sessions.html"><span class="mt-footer-link-bullet">›</span> Therapy Sessions</a></li>
            <li><a href="${base}patients.html"><span class="mt-footer-link-bullet">›</span> Patients Directory</a></li>
            <li><a href="${base}signup.html"><span class="mt-footer-link-bullet">›</span> Patient Sign Up</a></li>
            <li><a href="${base}doctor-home.html"><span class="mt-footer-link-bullet">›</span> Doctor Portal</a></li>
          </ul>
        </div>

        <!-- Column 4: Support & Location -->
        <div class="mt-footer-col">
          <h4 class="mt-footer-heading">Support &amp; Location</h4>
          <div class="mt-footer-contact-list">
            
            <div class="mt-footer-contact-item">
              <div class="mt-footer-icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.89 12.04 8.01 12.2C8.13 12.37 9.72 14.82 12.16 15.87C12.74 16.12 13.19 16.27 13.55 16.38C14.13 16.57 14.67 16.54 15.08 16.48C15.55 16.41 16.51 15.9 16.71 15.33C16.92 14.76 16.92 14.28 16.86 14.17C16.79 14.07 16.63 14.01 16.38 13.89C16.14 13.77 14.93 13.18 14.71 13.1C14.48 13.02 14.32 12.98 14.16 13.22C13.99 13.46 13.53 14.01 13.39 14.17C13.25 14.33 13.11 14.35 12.87 14.23C12.63 14.11 11.85 13.85 10.92 13.03C10.2 12.39 9.71 11.6 9.57 11.36C9.43 11.12 9.55 10.99 9.68 10.87C9.79 10.76 9.92 10.59 10.05 10.44C10.17 10.29 10.21 10.18 10.29 10.02C10.37 9.86 10.33 9.72 10.27 9.6C10.21 9.48 9.73 8.29 9.53 7.81C9.33 7.33 9.14 7.4 8.99 7.39C8.85 7.38 8.69 7.38 8.53 7.38V7.33Z"/>
                </svg>
              </div>
              <div>
                <div style="font-size: 11.5px; color: #00d2ff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">WhatsApp</div>
                <a href="https://wa.me/919468650893" target="_blank" rel="noopener noreferrer" style="font-weight: 700; font-size: 14.5px;">+91 9468650893</a>
              </div>
            </div>

            <div class="mt-footer-contact-item">
              <div class="mt-footer-icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div>
                <div style="font-size: 11.5px; color: #00d2ff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Email</div>
                <a href="mailto:info@multitherapy.org">info@multitherapy.org</a>
              </div>
            </div>

            <div class="mt-footer-contact-item">
              <div class="mt-footer-icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style="font-size: 11.5px; color: #00d2ff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Working Hours</div>
                <span>Mon–Sat, 8:00 AM–6:00 PM</span>
              </div>
            </div>

            <div class="mt-footer-contact-item">
              <div class="mt-footer-icon-box" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <div style="font-size: 11.5px; color: #00d2ff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Location</div>
                <span>Jaipur, Rajasthan, India</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Footer Bottom -->
      <div class="mt-footer-bottom">
        <div class="mt-footer-copyright">
          <span>&copy; 2026 Multi Therapy. All rights reserved.</span>
          <span style="opacity: 0.5;">•</span>
          <span style="color: #38bdf8; font-size: 12px; font-weight: 600;">Care • Support • Progress • Together</span>
        </div>
        <div class="mt-footer-social-wrap" aria-label="Social media links">
          <a href="https://www.youtube.com/@multitherapy" target="_blank" rel="noopener noreferrer" class="mt-social-btn" title="YouTube" aria-label="Multi Therapy on YouTube">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
          <a href="https://www.instagram.com/multitherapy" target="_blank" rel="noopener noreferrer" class="mt-social-btn" title="Instagram" aria-label="Multi Therapy on Instagram">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://www.linkedin.com/company/multitherapy" target="_blank" rel="noopener noreferrer" class="mt-social-btn" title="LinkedIn" aria-label="Multi Therapy on LinkedIn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
          <a href="https://www.facebook.com/multitherapy" target="_blank" rel="noopener noreferrer" class="mt-social-btn" title="Facebook" aria-label="Multi Therapy on Facebook">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
        </div>
      </div>

    </div>
    `;
  }

  /**
   * Initialize and harmonize the footer across the page.
   */
  function initFooter() {
    const base = getBasePath();

    // 1. Identify all footers currently in the document
    const footers = document.querySelectorAll('footer');

    if (footers.length === 0) {
      // Create new footer element
      const footerEl = document.createElement('footer');
      footerEl.className = 'mt-unified-footer';
      footerEl.setAttribute('role', 'contentinfo');
      footerEl.innerHTML = getFooterHTML(base);
      document.body.appendChild(footerEl);
    } else {
      // Standardize the primary footer and remove any duplicate footers
      const primaryFooter = footers[footers.length - 1]; // Use last footer (typically at end of page)
      primaryFooter.className = 'mt-unified-footer';
      primaryFooter.setAttribute('role', 'contentinfo');

      // If the markup is outdated or non-standard, update its innerHTML cleanly
      if (!primaryFooter.querySelector('.mt-footer-grid') || primaryFooter.classList.contains('mt-footer-wrap') || primaryFooter.classList.contains('mt-admin-footer')) {
        primaryFooter.innerHTML = getFooterHTML(base);
      } else {
        // Adjust relative paths inside primary footer for nested paths if base is not './'
        if (base !== './') {
          primaryFooter.querySelectorAll('img[src^="./"], a[href^="./"]').forEach(function (el) {
            if (el.tagName === 'IMG') {
              const src = el.getAttribute('src');
              if (src.startsWith('./')) el.setAttribute('src', base + src.slice(2));
            } else if (el.tagName === 'A') {
              const href = el.getAttribute('href');
              if (href.startsWith('./')) el.setAttribute('href', base + href.slice(2));
            }
          });
        }
      }

      // Remove any earlier duplicate footer elements if present
      for (let i = 0; i < footers.length - 1; i++) {
        footers[i].remove();
      }
    }
  }

  // Export public initializer
  window.renderMultiTherapyFooter = initFooter;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
  } else {
    initFooter();
  }
})();

