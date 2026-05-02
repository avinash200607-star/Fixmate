// API Configuration - Works on all devices (localhost, mobile, production)
const API_URL = (() => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // If we're on localhost, use localhost:3000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:3000/api`;
  }
  
  // For IP addresses or domain names, use the current location
  const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
  return `${baseUrl}/api`;
})();

const BASE_URL = (() => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:3000`;
  }
  return port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
})();

// Get provider ID from URL
const params = new URLSearchParams(window.location.search);
const providerId = params.get("id");

const profileLoading = document.querySelector(".profile-loading");
const profileContainer = document.querySelector(".profile-container");
const modalElement = document.getElementById("image-modal");
const modalImage = document.getElementById("modal-image");
const modalClose = document.getElementById("modal-close");

const toPublicUrl = (maybePath) => {
  const raw = String(maybePath || "").trim();
  if (!raw) return "";
  // If it's already an absolute URL, return as-is
  if (/^https?:\/\//i.test(raw)) return raw;
  // If it's a relative path, ensure it starts with /
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BASE_URL}${path}`;
};

// Modal controls
modalClose.addEventListener("click", closeModal);
modalElement.addEventListener("click", (e) => {
  if (e.target === modalElement) {
    closeModal();
  }
});

function openModal(imageSrc) {
  modalImage.src = imageSrc;
  modalElement.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalElement.classList.add("hidden");
  document.body.style.overflow = "auto";
}

// Fetch and display provider profile
async function loadProviderProfile() {
  if (!providerId) {
    showError("Provider not found");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/providers/${providerId}`);
    if (!response.ok) {
      throw new Error("Provider not found");
    }

    const provider = await response.json();
    displayProvider(provider);
  } catch (error) {
    console.error("Error loading provider:", error);
    showError(
      "Unable to load provider profile. Please go back and try again."
    );
  }
}

function displayProvider(provider) {
  // Set profile image
  const mainImage = document.getElementById("profile-main-image");
  const profileImageUrl = toPublicUrl(provider.profile_image);
  if (profileImageUrl) {
    mainImage.src = profileImageUrl;
  } else {
    mainImage.src =
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80";
  }

  // Set provider info
  document.getElementById("provider-name").textContent = escapeHtml(
    provider.name
  );
  document.getElementById("provider-service").textContent = escapeHtml(
    provider.service_type
  );
  document.getElementById("provider-experience").textContent =
    provider.experience_years + "+";
  document.getElementById("provider-location").textContent = escapeHtml(
    provider.location
  );
  document.getElementById("provider-pricing").textContent = escapeHtml(
    provider.pricing
  );
  document.getElementById("provider-description").textContent = escapeHtml(
    provider.description
  );

  // Load portfolio images
  loadPortfolioGallery(provider.portfolio_images);

  // Hide loading, show profile
  profileLoading.style.display = "none";
  profileContainer.classList.remove("hidden");

  // Add event listeners
  setupActionButtons(provider);
}

function loadPortfolioGallery(portfolioImagesJson) {
  const gallery = document.getElementById("portfolio-gallery");

  let portfolioImages = [];
  if (portfolioImagesJson) {
    try {
      portfolioImages = JSON.parse(portfolioImagesJson);
    } catch (e) {
      console.warn("Could not parse portfolio images:", e);
    }
  }

  if (!portfolioImages || portfolioImages.length === 0) {
    gallery.innerHTML = `
      <div class="no-gallery">
        <i class="fa-solid fa-image"></i>
        <p>No portfolio images available yet.</p>
      </div>
    `;
    return;
  }

  gallery.innerHTML = portfolioImages
    .map(
      (image, index) => {
        const imgUrl = toPublicUrl(image);
        const safeUrl = escapeHtml(imgUrl);
        return `
    <div class="gallery-item" data-image="${safeUrl}" onclick="openModal('${safeUrl}')">
      <img src="${safeUrl}" alt="Portfolio ${index + 1}" />
    </div>
  `;
      }
    )
    .join("");
}

function setupActionButtons(provider) {
  const bookBtn = document.getElementById("book-btn");
  const contactBtn = document.getElementById("contact-btn");

  bookBtn.addEventListener("click", () => {
    const service = provider.service_type ? provider.service_type.split(",")[0].trim() : "";
    window.location.href = `booking.html?provider_id=${provider.id}&service=${encodeURIComponent(service)}`;
  });

  contactBtn.addEventListener("click", () => {
    const phone = provider.phone_number || "Not added";
    alert(`Contact info for ${provider.name}\nPhone: ${phone}`);
  });
}

function showError(message) {
  profileLoading.innerHTML = `
    <div style="text-align: center; color: #e53e3e;">
      <i class="fa-solid fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
      <p>${escapeHtml(message)}</p>
      <a href="providers.html" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">Back to Providers</a>
    </div>
  `;
  profileLoading.style.display = "block";
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text || "").replace(/[&<>"']/g, (m) => map[m]);
}

// Load profile on page load
loadProviderProfile();
