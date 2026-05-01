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

let allBookings = [];
let currentUser = null;
let currentFilter = "all";

const bookingsList = document.getElementById("bookings-list");
const statusMessage = document.getElementById("status-message");
const filterTabs = document.querySelectorAll(".filter-tab");

const toPublicUrl = (maybePath) => {
  const raw = String(maybePath || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
};

// Check if user is logged in
const checkAuth = () => {
  const userString = localStorage.getItem("fixmateUser");
  if (!userString) {
    window.location.href = `auth.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }

  const user = JSON.parse(userString);
  if (user.role === "provider") {
    window.location.href = "provider-bookings.html";
    return null;
  }

  return user;
};

// Initialize
currentUser = checkAuth();

// Load user's bookings
const loadBookings = async () => {
  if (!currentUser) return;

  try {
    const response = await fetch(`${API_URL}/bookings/user/${currentUser.id}`);
    if (!response.ok) throw new Error("Failed to fetch bookings");

    allBookings = await response.json();
    renderBookings();
  } catch (error) {
    console.error("Error loading bookings:", error);
    showMessage("Unable to load bookings. Please try again.", "error");
  }
};

// Render bookings
const renderBookings = () => {
  let filteredBookings = allBookings;

  if (currentFilter !== "all") {
    filteredBookings = allBookings.filter((b) => b.status === currentFilter);
  }

  if (filteredBookings.length === 0) {
    bookingsList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <h3>No ${currentFilter !== "all" ? currentFilter : ""} bookings</h3>
        <p>${
          currentFilter === "all"
            ? "You haven't booked any services yet. Browse providers and create your first booking!"
            : `No ${currentFilter} bookings to display.`
        }</p>
        <a href="providers.html" class="btn btn-primary">Browse Services</a>
      </div>
    `;
    return;
  }

  bookingsList.innerHTML = filteredBookings
    .map((booking) => createBookingCard(booking))
    .join("");
};

// Create booking card HTML
const createBookingCard = (booking) => {
  const bookingDate = new Date(booking.booking_date + "T00:00:00");
  const formattedDate = bookingDate.toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const statusColor = {
    pending: "status-pending",
    confirmed: "status-confirmed",
    completed: "status-completed",
    cancelled: "status-cancelled",
  }[booking.status] || "status-pending";

  const statusText = {
    pending: "Waiting for provider confirmation...",
    confirmed: "Provider accepted! Service scheduled.",
    completed: "Service completed!",
    cancelled: "Booking cancelled.",
  }[booking.status] || "Pending";

  const providerName = booking.provider_name || "Service Provider";
  const providerInitial = String(providerName || "P").trim().charAt(0).toUpperCase() || "P";
  const providerService = booking.provider_service_type || booking.service_type || "";
  const providerProfileUrl = booking.provider_profile_image ? toPublicUrl(booking.provider_profile_image) : "";

  return `
    <div class="booking-card">
      <div class="booking-card-header">
        <div class="booking-card-title">
          <h3>${escapeHtml(booking.service_type)}</h3>
          <p class="booking-id">Booking #${String(booking.id).padStart(6, "0")}</p>
        </div>
        <span class="status-badge ${statusColor}" title="${statusText}">
          ${booking.status}
        </span>
      </div>

      <div class="booking-card-body">
        <div class="booking-detail">
          <span class="booking-detail-label">Date & Time</span>
          <span class="booking-detail-value">${formattedDate}</span>
          <span class="booking-detail-value" style="font-size: 0.9rem; color: #718096;">${booking.booking_time}</span>
        </div>

        <div class="booking-detail">
          <span class="booking-detail-label">Location</span>
          <span class="booking-detail-value">${escapeHtml(booking.location)}</span>
          <span class="address-value">${escapeHtml(booking.full_address)}</span>
        </div>

        <div class="booking-detail">
          <span class="booking-detail-label">Service</span>
          <span class="booking-detail-value">${escapeHtml(booking.service_type)}</span>
        </div>

        ${
          booking.problem_description
            ? `
          <div class="booking-detail">
            <span class="booking-detail-label">Notes</span>
            <span class="booking-detail-value">${escapeHtml(booking.problem_description)}</span>
          </div>
        `
            : ""
        }
      </div>

      <div class="provider-info">
        <div class="provider-avatar">${escapeHtml(providerInitial)}</div>
        <div class="provider-details">
          <p class="provider-name">${escapeHtml(providerName)}</p>
          <p class="provider-service">${providerService ? `<i class="fa-solid fa-briefcase"></i> ${escapeHtml(providerService)}` : ""}</p>
          <p class="provider-service"><i class="fa-solid fa-phone"></i> ${escapeHtml(booking.phone_number)}</p>
        </div>
      </div>

      ${
        booking.status === "pending"
          ? `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #718096; font-size: 0.9rem;">
              <i class="fa-solid fa-info-circle"></i> Waiting for provider response...
            </div>`
          : ""
      }
    </div>
  `;
};

// Show status message
const showMessage = (message, type = "success") => {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  setTimeout(() => {
    statusMessage.classList.remove("show");
  }, 4000);
};

// Filter tabs functionality
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.status;
    renderBookings();
  });
});

// Escape HTML to prevent XSS
const escapeHtml = (text) => {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Load bookings on page load
loadBookings();

// Refresh bookings every 30 seconds
setInterval(loadBookings, 30000);
