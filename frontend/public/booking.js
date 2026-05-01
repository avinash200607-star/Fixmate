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

// Get URL parameters
const params = new URLSearchParams(window.location.search);
const providerId = params.get("provider_id");
const selectedService = params.get("service");

let providerData = null;
let currentUser = null;

const form = document.getElementById("booking-form");
const statusEl = document.getElementById("status");
const confirmationModal = document.getElementById("confirmation-modal");
const phoneInput = document.getElementById("phone-number");

// Check if user is logged in
const checkAuth = () => {
  const userString = localStorage.getItem("fixmateUser");
  if (!userString) {
    window.location.href = `auth.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }
  return JSON.parse(userString);
};

// Initialize
currentUser = checkAuth();

if (phoneInput) {
  phoneInput.addEventListener("input", () => {
    // Keep only digits and enforce 10-digit mobile number.
    phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
  });
}

// Load provider data
const loadProvider = async () => {
  if (!providerId) {
    showError("Provider information missing");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/providers/${providerId}`);
    if (!response.ok) throw new Error("Provider not found");
    
    providerData = await response.json();
    populateProviderInfo();
  } catch (error) {
    console.error("Error loading provider:", error);
    showError("Unable to load provider details");
  }
};

// Populate provider information
const populateProviderInfo = () => {
  const serviceType = selectedService || (providerData.service_type ? providerData.service_type.split(",")[0].trim() : "");
  
  document.getElementById("service-type").value = serviceType;
  document.getElementById("provider-name").value = providerData.name;
  
  // Update summary
  updateSummary();
};

// Update summary with form data
const updateSummary = () => {
  const location = document.getElementById("location").value || "-";
  const date = document.getElementById("booking-date").value || "-";
  const timeRadio = document.querySelector('input[name="booking-time"]:checked');
  const time = timeRadio ? timeRadio.value : "-";
  
  document.getElementById("summary-service").textContent = document.getElementById("service-type").value;
  document.getElementById("summary-provider").textContent = providerData.name;
  document.getElementById("summary-date").textContent = date !== "-" ? formatDate(date) : "-";
  document.getElementById("summary-time").textContent = time;
  document.getElementById("summary-location").textContent = location;
  document.getElementById("summary-price").textContent = providerData.pricing || "Contact for pricing";
};

// Format date to readable format
const formatDate = (dateString) => {
  const options = { weekday: "short", year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-IN", options);
};

// Time slot configuration (start hour in 24-hour format)
const timeSlots = [
  { value: "09:00 - 11:00", startHour: 9, label: "9:00 AM - 11:00 AM" },
  { value: "11:00 - 13:00", startHour: 11, label: "11:00 AM - 1:00 PM" },
  { value: "14:00 - 16:00", startHour: 14, label: "2:00 PM - 4:00 PM" },
  { value: "16:00 - 18:00", startHour: 16, label: "4:00 PM - 6:00 PM" },
];

// Manage time slot availability
const updateTimeSlotAvailability = () => {
  const selectedDate = document.getElementById("booking-date").value;
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentHour = now.getHours();

  const timeSlotInputs = document.querySelectorAll('input[name="booking-time"]');
  const timeSlotLabels = document.querySelectorAll(".time-slot");

  timeSlotInputs.forEach((input, index) => {
    const label = timeSlotLabels[index];
    const slot = timeSlots[index];

    if (selectedDate === today) {
      // Today: disable past slots
      if (slot.startHour <= currentHour) {
        input.disabled = true;
        label.classList.add("time-slot-disabled");
        input.checked = false;
      } else {
        input.disabled = false;
        label.classList.remove("time-slot-disabled");
      }
    } else {
      // Future date: enable all slots
      input.disabled = false;
      label.classList.remove("time-slot-disabled");
    }
  });
};

// Add event listeners for summary updates and slot availability
document.getElementById("location").addEventListener("change", updateSummary);
document.getElementById("booking-date").addEventListener("change", () => {
  updateTimeSlotAvailability();
  updateSummary();
});
document.querySelectorAll('input[name="booking-time"]').forEach((radio) => {
  radio.addEventListener("change", updateSummary);
});

// Validate form
const validateForm = () => {
  const location = document.getElementById("location").value.trim();
  const fullAddress = document.getElementById("full-address").value.trim();
  const bookingDate = document.getElementById("booking-date").value;
  const bookingTime = document.querySelector('input[name="booking-time"]:checked');
  const phoneNumber = document.getElementById("phone-number").value.trim();

  if (!location) {
    showStatus("Please enter your city", "error");
    return false;
  }

  if (!fullAddress) {
    showStatus("Please enter your full address", "error");
    return false;
  }

  if (!bookingDate) {
    showStatus("Please select a date", "error");
    return false;
  }

  // Validate date is not in the past
  const selectedDate = new Date(bookingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    showStatus("Please select a future date", "error");
    return false;
  }

  if (!bookingTime) {
    showStatus("Please select a time slot", "error");
    return false;
  }

  if (!phoneNumber || phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
    showStatus("Please enter a valid 10-digit phone number", "error");
    return false;
  }

  return true;
};

// Show status message
const showStatus = (message, type = "") => {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
  statusEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

const showError = (message) => {
  showStatus(message, "error");
};

// Handle form submission
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  showStatus("Processing your booking...");

  const bookingData = {
    user_id: currentUser.id,
    provider_id: providerId,
    service_type: document.getElementById("service-type").value,
    location: document.getElementById("location").value.trim(),
    full_address: document.getElementById("full-address").value.trim(),
    booking_date: document.getElementById("booking-date").value,
    booking_time: document.querySelector('input[name="booking-time"]:checked').value,
    phone_number: document.getElementById("phone-number").value.trim(),
    problem_description: document.getElementById("problem-description").value.trim(),
  };

  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("fixmateToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers,
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();

    if (!response.ok) {
      showError(result.message || "Failed to create booking");
      return;
    }

    // Show confirmation modal
    showConfirmation(result.booking);
  } catch (error) {
    console.error("Error:", error);
    showError("Unable to process booking. Try again.");
  }
});

// Show confirmation modal
const showConfirmation = (booking) => {
  document.getElementById("booking-id").textContent = `#${String(booking.id).padStart(6, "0")}`;
  document.getElementById("modal-service").textContent = booking.service_type;
  document.getElementById("modal-date").textContent = formatDate(booking.booking_date);
  document.getElementById("modal-time").textContent = booking.booking_time;
  document.getElementById("modal-phone").textContent = booking.phone_number;

  confirmationModal.classList.remove("hidden");
};

// Modal actions
document.getElementById("view-bookings-btn").addEventListener("click", () => {
  // Redirect to user dashboard or bookings page
  window.location.href = "user-bookings.html";
});

document.getElementById("continue-browsing-btn").addEventListener("click", () => {
  window.location.href = "providers.html";
});

// Set minimum date to today
const today = new Date().toISOString().split("T")[0];
document.getElementById("booking-date").setAttribute("min", today);

// Initialize time slot availability on page load
document.getElementById("booking-date").addEventListener("input", updateTimeSlotAvailability);

// Load provider on page load
loadProvider();
