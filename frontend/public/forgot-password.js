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

const form = document.getElementById("forgot-form");
const statusEl = document.getElementById("forgot-status");

const setStatus = (message, type = "") => {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Generating reset link...");

  try {
    const email = document.getElementById("forgot-email").value.trim();
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.message || "Failed to generate reset link.", "error");
      return;
    }

    if (result.resetLink) {
      setStatus("Reset link generated. Redirecting...", "success");
      setTimeout(() => {
        window.location.href = result.resetLink;
      }, 1000);
      return;
    }

    setStatus(result.message || "If this email exists, a reset link has been generated.", "success");
  } catch {
    setStatus("Unable to process request. Try again.", "error");
  }
});
