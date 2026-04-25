let allBookings = [];
let currentProvider = null;
let currentFilter = "all";

const bookingsList = document.getElementById("bookings-list");
const statusMessage = document.getElementById("status-message");
const filterTabs = document.querySelectorAll(".filter-tab");

// Check if provider is logged in
const checkAuth = () => {
  const userString = localStorage.getItem("fixmateUser");
  if (!userString) {
    window.location.href = `auth.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }

  const user = JSON.parse(userString);
  if (user.role !== "provider") {
    window.location.href = `auth.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }

  return user;
};

// Initialize
currentProvider = checkAuth();

// Logout is handled globally by logout.js (profile dropdown)

// Load provider's bookings
const loadBookings = async () => {
  if (!currentProvider) return;

  try {
    const response = await fetch(`/api/bookings/provider/${currentProvider.id}`);
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
            ? "You haven't received any bookings yet. Check back soon!"
            : `No ${currentFilter} bookings to display.`
        }</p>
      </div>
    `;
    return;
  }

  bookingsList.innerHTML = filteredBookings
    .map((booking) => createBookingCard(booking))
    .join("");

  // Add event listeners to action buttons
  document.querySelectorAll(".btn-accept").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const bookingId = e.target.dataset.bookingId;
      updateBookingStatus(bookingId, "confirmed");
    });
  });

  document.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const bookingId = e.target.dataset.bookingId;
      updateBookingStatus(bookingId, "cancelled");
    });
  });

  document.querySelectorAll(".btn-complete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const bookingId = e.target.dataset.bookingId;
      updateBookingStatus(bookingId, "completed");
    });
  });
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

  let actionButtons = "";

  if (booking.status === "pending") {
    actionButtons = `
      <button class="btn-action btn-accept" data-booking-id="${booking.id}">
        <i class="fa-solid fa-check"></i> Accept
      </button>
      <button class="btn-action btn-reject" data-booking-id="${booking.id}">
        <i class="fa-solid fa-times"></i> Reject
      </button>
    `;
  } else if (booking.status === "confirmed") {
    actionButtons = `
      <button class="btn-action btn-complete" data-booking-id="${booking.id}">
        <i class="fa-solid fa-check-double"></i> Mark Complete
      </button>
    `;
  }

  return `
    <div class="booking-card">
      <div class="booking-card-header">
        <div class="booking-card-title">
          <h3>${escapeHtml(booking.service_type)}</h3>
          <p class="booking-id">Booking #${String(booking.id).padStart(6, "0")}</p>
        </div>
        <span class="status-badge ${statusColor}">${booking.status}</span>
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
            <span class="booking-detail-label">Problem Description</span>
            <span class="booking-detail-value">${escapeHtml(booking.problem_description)}</span>
          </div>
        `
            : ""
        }
      </div>

      <div class="customer-info">
        <div class="customer-avatar">
          U
        </div>
        <div class="customer-contact">
          <p class="customer-name">Customer</p>
          <p class="customer-phone"><i class="fa-solid fa-phone"></i> ${escapeHtml(booking.phone_number)}</p>
        </div>
      </div>

      ${
        actionButtons
          ? `<div class="booking-card-actions">${actionButtons}</div>`
          : ""
      }
    </div>
  `;
};

// Update booking status
const updateBookingStatus = async (bookingId, newStatus) => {
  try {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) throw new Error("Failed to update booking");

    // Update local data
    const numericId = Number(bookingId);
    const booking = allBookings.find((b) => b.id === numericId);
    if (booking) {
      booking.status = newStatus;
    }

    renderBookings();

    const statusText = {
      confirmed: "Booking accepted! Customer will be notified.",
      cancelled: "Booking rejected!",
      completed: "Booking marked as complete!",
    }[newStatus] || "Booking updated!";

    showMessage(statusText, "success");
  } catch (error) {
    console.error("Error updating booking:", error);
    showMessage("Failed to update booking. Please try again.", "error");
  }
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
