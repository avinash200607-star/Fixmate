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
    const response = await fetch("/api/auth/forgot-password", {
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
