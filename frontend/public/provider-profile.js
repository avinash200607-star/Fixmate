// API Configuration
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : window.location.protocol + '//' + window.location.host + '/api';

const form = document.getElementById("provider-profile-form");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("profile-preview");

const user = JSON.parse(localStorage.getItem("fixmateUser") || "{}");
if (user.role !== "provider") {
  window.location.href = `auth.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

// Display profile picture and user info
const displayUserProfile = () => {
  const avatarEl = document.getElementById("profile-avatar");
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");

  if (user.profilePicture) {
    avatarEl.src = user.profilePicture;
    avatarEl.classList.add("show");
  }

  if (nameEl) nameEl.textContent = user.name || "Provider";
  if (emailEl) emailEl.textContent = user.email || "";
};

const setStatus = (message, type = "") => {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
};

const escapeHtml = (text) =>
  String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Get selected services from checkboxes
const getSelectedServices = () => {
  const checkboxes = document.querySelectorAll('form input[type="checkbox"]:checked');
  return Array.from(checkboxes).map((cb) => cb.value);
};

// Set checked services based on stored value
const setSelectedServices = (servicesString) => {
  const services = servicesString ? servicesString.split(",").map((s) => s.trim()) : [];
  document.querySelectorAll('form input[type="checkbox"]').forEach((cb) => {
    cb.checked = services.includes(cb.value);
  });
};

const renderProfile = (profile) => {
  if (!profile) {
    previewEl.className = "profile-preview empty";
    previewEl.textContent = "No profile data yet.";
    return;
  }

  const portfolio = (profile.portfolioImages || [])
    .map(
      (img) =>
        `<article class="portfolio-card"><img src="${escapeHtml(img)}" alt="Work sample" /></article>`
    )
    .join("");

  previewEl.className = "profile-preview";
  previewEl.innerHTML = `
    <div class="provider-header">
      <img src="${escapeHtml(profile.profileImage || "https://via.placeholder.com/90x90?text=FM")}" alt="Provider profile image" />
      <div class="provider-info">
        <h3>${escapeHtml(profile.name)}</h3>
        <p>${escapeHtml(profile.serviceType)}</p>
      </div>
    </div>
    <div class="provider-meta">
      <div><strong>Experience:</strong> ${escapeHtml(profile.experience)} years</div>
      <div><strong>Pricing:</strong> ${escapeHtml(profile.pricing)}</div>
      <div><strong>Location:</strong> ${escapeHtml(profile.location)}</div>
      <div><strong>Phone:</strong> ${escapeHtml(profile.phoneNumber || "Not added")}</div>
      <div><strong>Description:</strong> ${escapeHtml(profile.description)}</div>
    </div>
    <h4>Portfolio</h4>
    <div class="portfolio-grid">${portfolio || "<p>No work images uploaded yet.</p>"}</div>
  `;
};

const fillForm = (profile) => {
  // Auto-fill from user data if available
  document.getElementById("name").value = profile?.name || user.name || "";
  document.getElementById("experience").value = profile?.experience || "";
  document.getElementById("pricing").value = profile?.pricing || "";
  document.getElementById("location").value = profile?.location || "";
  document.getElementById("phoneNumber").value = profile?.phoneNumber || "";
  document.getElementById("description").value = profile?.description || "";
  // Set selected services
  setSelectedServices(profile?.serviceType || user.serviceType || "");
};

const loadProfile = async () => {
  try {
    const res = await fetch(`${API_URL}/providers/profile/${user.id}`);
    if (!res.ok) {
      renderProfile(null);
      return;
    }
    const data = await res.json();
    fillForm(data.profile);
    renderProfile(data.profile);
  } catch {
    renderProfile(null);
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const selectedServices = getSelectedServices();
  if (selectedServices.length === 0) {
    setStatus("Please select at least one service type.", "error");
    return;
  }
  
  setStatus("Saving profile...");

  const payload = {
    userId: user.id,
    serviceTypes: selectedServices,
    experience: document.getElementById("experience").value.trim(),
    price: document.getElementById("pricing").value.trim(),
    location: document.getElementById("location").value.trim(),
    phoneNumber: document.getElementById("phoneNumber").value.trim(),
    description: document.getElementById("description").value.trim(),
    profileImage: null,
  };

  try {
    const res = await fetch(`${API_URL}/providers/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (!res.ok) {
      setStatus(result.message || "Failed to save profile.", "error");
      return;
    }

    setStatus("Profile saved successfully.", "success");
    await loadProfile();
  } catch {
    setStatus("Unable to save profile.", "error");
  }
});

displayUserProfile();
loadProfile();
