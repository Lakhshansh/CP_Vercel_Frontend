/**
 * ============================================================================
 * Multi Therapy - Centralized Cloudinary CDN Image Asset System
 * ============================================================================
 * Provides unified, secure, high-performance image optimization across ALL pages:
 * - Automatic format (WebP/AVIF) and quality optimization (f_auto, q_auto)
 * - Responsive image resizing and aspect-ratio preservation
 * - Graceful fallback handling for unavailable or broken image links
 * - Profile photo upload, preview, replacement, and deletion helpers
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CdnManager = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DEFAULT_CLOUD_NAME = "multitherapy";

  function getCloudName() {
    if (typeof window !== "undefined") {
      if (window.CLOUDINARY_CLOUD_NAME) return window.CLOUDINARY_CLOUD_NAME;
      try {
        const stored = localStorage.getItem("CLOUDINARY_CLOUD_NAME");
        if (stored) return stored.trim();
      } catch (e) {}
    }
    return DEFAULT_CLOUD_NAME;
  }

  const FALLBACK_ASSETS = {
    doctor: "./images/doctor-avatar.svg",
    patient: "./images/patient-avatar.svg",
    therapist: "./images/doctor-avatar.svg",
    logo: "./images/multi_therapy_logo_100x100.png",
    exercise: "./images/multi_therapy_logo_100x100.png",
    default: "./images/multi_therapy_logo_100x100.png"
  };

  /**
   * Build an optimized Cloudinary CDN URL with transformations
   * @param {string} source - Full URL, public_id, or local path
   * @param {Object} options - { width, height, crop, format, quality, gravity, dpr }
   * @returns {string} Fully optimized URL
   */
  function buildCdnUrl(source, options = {}) {
    if (!source || typeof source !== "string") {
      return FALLBACK_ASSETS.default;
    }

    const trimmed = source.trim();
    if (!trimmed) return FALLBACK_ASSETS.default;

    // Preserve data URLs as-is (e.g. temporary client preview)
    if (trimmed.startsWith("data:")) return trimmed;

    const cloudName = getCloudName();
    const width = options.width ? `w_${options.width}` : null;
    const height = options.height ? `h_${options.height}` : null;
    const crop = options.crop ? `c_${options.crop}` : (width || height ? "c_fill" : null);
    const gravity = options.gravity || (crop === "c_fill" || crop === "c_thumb" ? "g_auto" : null);
    const quality = options.quality ? `q_${options.quality}` : "q_auto";
    const format = options.format ? `f_${options.format}` : "f_auto";
    const dpr = options.dpr ? `dpr_${options.dpr}` : "dpr_auto";

    const transformSegments = [format, quality, dpr, crop, gravity, width, height].filter(Boolean);
    const transformStr = transformSegments.join(",");

    // Case 1: Already a Cloudinary URL
    if (trimmed.includes("res.cloudinary.com") && trimmed.includes("/upload/")) {
      const parts = trimmed.split("/upload/");
      const prefix = parts[0] + "/upload/";
      let remainder = parts[1];

      // Remove existing transformation segment if present
      if (remainder.match(/^[a-z0-9_,:]+\/(v[0-9]+\/.*)$/i)) {
        remainder = remainder.replace(/^[a-z0-9_,:]+\//, "");
      } else if (remainder.match(/^[a-z0-9_,:]+\/([a-z0-9_\/.-]+)$/i) && !remainder.startsWith("v")) {
        remainder = remainder.replace(/^[a-z0-9_,:]+\//, "");
      }

      return `${prefix}${transformStr}/${remainder}`;
    }

    // Case 2: Public ID without protocol (e.g. "multi_therapy/profiles/user_123")
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("./") && !trimmed.startsWith("/")) {
      return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${trimmed}`;
    }

    // Case 3: Local or relative path
    return trimmed;
  }

  /**
   * Determine best photo URL for a user record with automatic fallback
   * @param {Object|string} userOrPhoto
   * @param {Object} options
   * @returns {string}
   */
  function getCdnPhotoUrl(userOrPhoto, options = {}) {
    let photo = "";
    let role = "patient";

    if (userOrPhoto && typeof userOrPhoto === "object") {
      photo = userOrPhoto.profile_photo || userOrPhoto.photo || userOrPhoto.image || "";
      role = (userOrPhoto.role || "patient").toLowerCase();
    } else if (typeof userOrPhoto === "string") {
      photo = userOrPhoto;
    }

    if (photo && photo !== "REMOVE") {
      return buildCdnUrl(photo, options);
    }

    if (role.includes("doctor")) return FALLBACK_ASSETS.doctor;
    if (role.includes("therapist")) return FALLBACK_ASSETS.therapist;
    if (role.includes("patient")) return FALLBACK_ASSETS.patient;
    return FALLBACK_ASSETS.default;
  }

  /**
   * Safe image error fallback handler to prevent broken image displays
   */
  function handleImageError(imgEl, fallbackCategory = "default") {
    if (!imgEl || imgEl.dataset.fallbackApplied === "true") return;

    imgEl.dataset.fallbackApplied = "true";
    const customFallback = imgEl.dataset.fallbackSrc;
    if (customFallback) {
      imgEl.src = customFallback;
      return;
    }

    const cat = fallbackCategory.toLowerCase();
    if (cat.includes("doctor") || imgEl.className.includes("doc") || imgEl.id.includes("doc")) {
      imgEl.src = FALLBACK_ASSETS.doctor;
    } else if (cat.includes("patient") || imgEl.className.includes("patient") || imgEl.id.includes("patient")) {
      imgEl.src = FALLBACK_ASSETS.patient;
    } else if (cat.includes("therapist") || imgEl.className.includes("tp") || imgEl.id.includes("therapist")) {
      imgEl.src = FALLBACK_ASSETS.therapist;
    } else if (imgEl.alt && imgEl.alt.toLowerCase().includes("logo")) {
      imgEl.src = FALLBACK_ASSETS.logo;
    } else {
      imgEl.src = FALLBACK_ASSETS.default;
    }
  }

  /**
   * Upload an image to the backend / Cloudinary CDN endpoint
   */
  async function uploadImage(fileOrBase64, metadata = {}) {
    const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
    const uploadEndpoints = [
      `${apiBase}/api/cloudinary/upload`,
      `${apiBase}/api/upload-profile-photo`,
      "/api/upload-profile-photo",
      "/api/upload-photo"
    ];

    let result = null;
    let lastError = null;

    for (const endpoint of uploadEndpoints) {
      try {
        let res;
        if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
          const fd = new FormData();
          fd.append("profile_photo", fileOrBase64);
          if (metadata.user_id) fd.append("user_id", metadata.user_id);
          if (metadata.username) fd.append("username", metadata.username);
          if (metadata.role) fd.append("role", metadata.role);
          if (metadata.folder) fd.append("folder", metadata.folder);

          res = await fetch(endpoint, {
            method: "POST",
            body: fd
          });
        } else {
          res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile_photo: fileOrBase64,
              ...metadata
            })
          });
        }

        const data = await res.json().catch(() => null);

        if (res.ok && data && (data.success || data.photo_url || data.profile_photo)) {
          result = data;
          break;
        } else if (data && data.message) {
          lastError = new Error(data.message);
          if (res.status === 400 || res.status === 403) {
            throw lastError;
          }
        }
      } catch (err) {
        lastError = err;
        if (err.message && (err.message.includes("Cloudinary") || err.message.includes("format") || err.message.includes("credential"))) {
          throw err;
        }
      }
    }

    if (!result) {
      throw lastError || new Error("Failed to upload image to Cloudinary CDN and database.");
    }

    return result;
  }

  /**
   * Remove an image from Cloudinary CDN and database
   */
  async function deleteImage(metadata = {}) {
    const apiBase = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
    const deleteEndpoints = [
      `${apiBase}/api/cloudinary/delete`,
      `${apiBase}/api/remove-profile-photo`,
      "/api/remove-profile-photo"
    ];

    for (const endpoint of deleteEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}
    }

    return { success: true, message: "Photo removed locally." };
  }

  /**
   * Scan page DOM and attach CDN optimization and fallbacks to all images
   */
  function initCdnImages() {
    if (typeof document === "undefined") return;

    // 1. Process images with data-cdn-src
    const cdnImages = document.querySelectorAll("img[data-cdn-src]");
    cdnImages.forEach((img) => {
      const rawSrc = img.getAttribute("data-cdn-src");
      if (rawSrc) {
        const w = parseInt(img.getAttribute("data-cdn-width") || img.getAttribute("width") || "0", 10) || null;
        const h = parseInt(img.getAttribute("data-cdn-height") || img.getAttribute("height") || "0", 10) || null;
        img.src = buildCdnUrl(rawSrc, { width: w, height: h });
      }
    });

    // 2. Attach fallback listeners to all <img> tags
    const allImgs = document.querySelectorAll("img");
    allImgs.forEach((img) => {
      if (!img.dataset.cdnAttached) {
        img.dataset.cdnAttached = "true";
        img.addEventListener("error", function () {
          handleImageError(this, this.getAttribute("data-role") || "default");
        });
      }
    });
  }

  // Auto-initialize when DOM is ready
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initCdnImages);
    } else {
      initCdnImages();
    }
  }

  return {
    buildCdnUrl,
    getCdnPhotoUrl,
    uploadImage,
    deleteImage,
    handleImageError,
    initCdnImages,
    FALLBACK_ASSETS
  };
});

