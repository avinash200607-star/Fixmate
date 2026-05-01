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

const form = document.getElementById("reset-form");
const statusEl = document.getElementById("reset-status");

const setStatus = (message, type = "") => {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
};

const token = new URLSearchParams(window.location.search).get("token") || "";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!token) {
    setStatus("Invalid reset token.", "error");
    return;
  }
  if (newPassword.length < 6) {
    setStatus("Password must be at least 6 characters.", "error");
    return;
  }
  if (newPassword !== confirmPassword) {
    setStatus("Passwords do not match.", "error");
    return;
  }

  setStatus("Resetting password...");
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.message || "Failed to reset password.", "error");
      return;
    }
    setStatus("Password reset successful. Redirecting to login...", "success");
    setTimeout(() => {
      window.location.href = "/auth.html";
    }, 1200);
  } catch {
    setStatus("Unable to reset password. Try again.", "error");
  }
});
