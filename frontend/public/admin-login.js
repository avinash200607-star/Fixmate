// API Configuration
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : window.location.protocol + '//' + window.location.host + '/api';

const adminForm = document.getElementById("admin-login-form");
const adminStatus = document.getElementById("admin-status");

const setAdminStatus = (message, type = "") => {
  adminStatus.textContent = message;
  adminStatus.className = `status ${type}`.trim();
};

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAdminStatus("Logging in...");

    const payload = {
      email: document.getElementById("admin-email").value.trim(),
      password: document.getElementById("admin-password").value,
    };

    try {
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setAdminStatus(result.message || "Login failed.", "error");
        return;
      }

      localStorage.setItem("fixmateUser", JSON.stringify(result.user));
      setAdminStatus("Login successful. Redirecting...", "success");
      window.location.href = "/admin-panel";
    } catch (error) {
      setAdminStatus("Unable to login. Try again.", "error");
    }
  });
}
