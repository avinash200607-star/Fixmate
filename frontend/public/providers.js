// API Configuration
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : window.location.protocol + '//' + window.location.host + '/api';

let allProviders = [];
let currentFilter = "all";

const providersList = document.getElementById("providers-list");
const filterButtons = document.querySelectorAll(".filter-btn");
const filterToggle = document.getElementById("filter-toggle");
const filtersContainer = document.getElementById("filters");

const toPublicUrl = (maybePath) => {
  const raw = String(maybePath || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
};

// Check URL for service parameter
const params = new URLSearchParams(window.location.search);
const serviceParam = params.get("service");

if (serviceParam) {
  currentFilter = serviceParam;
}

// Toggle filters on mobile
filterToggle.addEventListener("click", () => {
  filtersContainer.classList.toggle("show");
});

// Add filter button listeners
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.service;
    renderProviders();

    // Close filters on mobile after selection
    if (window.innerWidth <= 768) {
      filtersContainer.classList.remove("show");
    }
  });
});

// Fetch all providers from backend
async function fetchProviders() {
  try {
    const response = await fetch(`${API_URL}/providers`);
    if (!response.ok) throw new Error("Failed to fetch providers");
    allProviders = await response.json();
    
    // Set active filter button if service parameter was provided
    if (serviceParam) {
      filterButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.service === serviceParam);
      });
    }
    
    renderProviders();
  } catch (error) {
    console.error("Error fetching providers:", error);
    providersList.innerHTML = `
      <div class="no-providers">
        <i class="fa-solid fa-exclamation-circle"></i>
        <p>Unable to load providers. Please try again later.</p>
      </div>
    `;
  }
}

// Filter and render providers
function renderProviders() {
  let filteredProviders = allProviders;

  if (currentFilter !== "all") {
    filteredProviders = allProviders.filter((p) => {
      // Split comma-separated services and check if the filter matches any
      const services = p.service_type
        ? p.service_type.split(",").map((s) => s.trim())
        : [];
      return services.includes(currentFilter);
    });
  }

  if (filteredProviders.length === 0) {
    providersList.innerHTML = `
      <div class="no-providers">
        <i class="fa-solid fa-search"></i>
        <p>No providers found for this service. Try another category!</p>
      </div>
    `;
    return;
  }

  providersList.innerHTML = filteredProviders
    .map((provider) => createProviderCard(provider))
    .join("");

  // Add event listeners to buttons
  document.querySelectorAll(".btn-view-profile").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = `provider-view.html?id=${btn.dataset.providerId}`;
    });
  });

  document.querySelectorAll(".btn-book-service").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const providerId = btn.previousElementSibling.dataset.providerId;
      const service = allProviders.find((p) => p.id == providerId)?.service_type?.split(",")[0].trim() || "";
      window.location.href = `booking.html?provider_id=${providerId}&service=${encodeURIComponent(service)}`;
    });
  });
}

// Create provider card HTML
function createProviderCard(provider) {
  const profileImageUrl = toPublicUrl(provider.profile_image);
  const imageHtml = profileImageUrl
    ? `<img src="${profileImageUrl}" alt="${provider.name}" />`
    : `<i class="fa-solid fa-user"></i>`;

  return `
    <div class="provider-card">
      <div class="provider-image ${!profileImageUrl ? "no-image" : ""}">
        ${imageHtml}
        <div class="provider-badge">
          <i class="fa-solid fa-star"></i>
          4.8
        </div>
      </div>
      <div class="provider-content">
        <div class="provider-header">
          <div class="provider-name">${escapeHtml(provider.name)}</div>
          <div class="provider-service">${escapeHtml(provider.service_type)}</div>
        </div>

        <div class="provider-info">
          <div class="info-item">
            <div class="info-item-label">Experience</div>
            <div class="info-item-value">${provider.experience_years}+ yrs</div>
          </div>
          <div class="info-item">
            <div class="info-item-label">Location</div>
            <div class="info-item-value">${escapeHtml(provider.location)}</div>
          </div>
        </div>

        <div class="provider-price">${escapeHtml(provider.pricing)}</div>

        <div class="provider-description">${escapeHtml(
          provider.description
        )}</div>
        <div class="provider-description"><i class="fa-solid fa-phone"></i> ${escapeHtml(provider.phone_number || "Contact after booking")}</div>

        <div class="provider-actions">
          <button class="btn-view-profile" data-provider-id="${provider.id}">
            View Profile
          </button>
          <button class="btn-book-service">Book Service</button>
        </div>
      </div>
    </div>
  `;
}

// Utility function to escape HTML
function escapeHtml(text) {
  text = String(text ?? "");
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Initialize page
fetchProviders();
