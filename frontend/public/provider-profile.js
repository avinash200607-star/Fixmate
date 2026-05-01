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

  // Build portfolio image HTML with full URLs
  const portfolio = (profile.portfolioImages || [])
    .map((img) => {
      let imageSrc = img;
      if (img.startsWith("/uploads/")) {
        imageSrc = `${window.location.protocol}//${window.location.host}${img}`;
      } else if (img.startsWith("/")) {
        imageSrc = `${window.location.protocol}//${window.location.host}${img}`;
      }
      return `<article class="portfolio-card"><img src="${imageSrc}" alt="Work sample" onerror="this.src='https://via.placeholder.com/150x150?text=Portfolio'" /></article>`;
    })
    .join("");

  const profileImageUrl = profile.profileImage || profile.profile_image || "https://via.placeholder.com/90x90?text=FM";
  
  // If it's a relative path from uploads, make it absolute
  let imageSrc = profileImageUrl;
  if (profileImageUrl.startsWith("/uploads/")) {
    imageSrc = `${window.location.protocol}//${window.location.host}${profileImageUrl}`;
  } else if (profileImageUrl.startsWith("/")) {
    imageSrc = `${window.location.protocol}//${window.location.host}${profileImageUrl}`;
  }
  
  console.log("Image URL:", profileImageUrl, "Final src:", imageSrc);
  console.log("Portfolio images:", profile.portfolioImages);

  previewEl.className = "profile-preview";
  previewEl.innerHTML = `
    <div class="provider-header">
      <img class="provider-avatar-pic" src="${imageSrc}" alt="Provider profile image" onerror="this.src='https://via.placeholder.com/90x90?text=FM'" />
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
  // Set selected services - handle both serviceType (string) and serviceTypes (array)
  const serviceTypeString = profile?.serviceType || user.serviceType || "";
  setSelectedServices(serviceTypeString);
};

const loadProfile = async () => {
  try {
    const res = await fetch(`${API_URL}/providers/profile/${user.id}`);
    console.log("Fetch response status:", res.status);
    
    if (!res.ok) {
      console.log("Profile not found or error");
      renderProfile(null);
      return;
    }
    
    const data = await res.json();
    console.log("Profile data loaded:", data);
    
    fillForm(data.profile);
    renderProfile(data.profile);
  } catch (error) {
    console.error("Error loading profile:", error);
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

  const formData = new FormData();
  formData.append("userId", user.id);
  formData.append("serviceTypes", selectedServices.join(", "));
  formData.append("experience", document.getElementById("experience").value.trim());
  formData.append("pricing", document.getElementById("pricing").value.trim());
  formData.append("location", document.getElementById("location").value.trim());
  formData.append("phoneNumber", document.getElementById("phoneNumber").value.trim());
  formData.append("description", document.getElementById("description").value.trim());

  // Add profile image if selected
  const profileImage = document.getElementById("profileImage").files[0];
  if (profileImage) {
    formData.append("profileImage", profileImage);
  }

  // Add portfolio images if selected
  const portfolioFiles = document.getElementById("portfolioImages").files;
  for (const file of portfolioFiles) {
    formData.append("portfolioImages", file);
  }

  try {
    const res = await fetch(`${API_URL}/providers/profile`, {
      method: "POST",
      body: formData,
    });
    const result = await res.json();

    if (!res.ok) {
      setStatus(result.message || "Failed to save profile.", "error");
      return;
    }

    setStatus("Profile saved successfully.", "success");
    await loadProfile();
    document.getElementById("profileImage").value = "";
    document.getElementById("portfolioImages").value = "";
  } catch {
    setStatus("Unable to save profile.", "error");
  }
});

displayUserProfile();
loadProfile();
