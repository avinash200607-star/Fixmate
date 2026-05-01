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

const tabButtons = document.querySelectorAll(".tab-btn");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const statusText = document.getElementById("auth-status");
const loginRoleInput = document.getElementById("login-role");
const signupRoleInput = document.getElementById("signup-role");
const serviceTypeWrap = document.getElementById("service-type-wrap");

const googleLoginWrap = document.getElementById("google-login-btn");
const googleSignupWrap = document.getElementById("google-signup-btn");
let activeAuthTab = "login";

const setStatus = (msg, type = "") => {
  statusText.textContent = msg;
  statusText.className = `status ${type}`;
};

// ========================
// TAB SWITCH
// ========================
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    activeAuthTab = tab;

    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    loginForm.classList.toggle("hidden", tab !== "login");
    signupForm.classList.toggle("hidden", tab !== "signup");
  });
});

// ========================
// ROLE SWITCH
// ========================
document.querySelectorAll(".role-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.roleTarget;
    const role = btn.dataset.role;

    document.querySelectorAll(`.role-btn[data-role-target="${target}"]`)
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    if (target === "login") {
      loginRoleInput.value = role;
    } else {
      signupRoleInput.value = role;
      serviceTypeWrap.classList.toggle("hidden", role !== "provider");
    }
  });
});

// ========================
// SIGNUP
// ========================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  setStatus("Creating account...");

  const role = signupRoleInput.value;
  
  // Collect selected services if provider
  let serviceTypes = [];
  if (role === "provider") {
    const checkboxes = document.querySelectorAll("#service-type-wrap input[type='checkbox']:checked");
    serviceTypes = Array.from(checkboxes).map(cb => cb.value);
  }

  const payload = {
    name: document.getElementById("signup-name").value,
    email: document.getElementById("signup-email").value,
    password: document.getElementById("signup-password").value,
    role: role,
    serviceTypes: serviceTypes,
  };

  try {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || "Signup failed", "error");
      return;
    }

    setStatus("Signup successful! Please login.", "success");
    signupForm.reset();
  } catch (err) {
    setStatus("Server error. Try again.", "error");
  }
});

// ========================
// LOGIN
// ========================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  setStatus("Logging in...");

  const payload = {
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
    role: loginRoleInput.value,
  };

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || "Login failed", "error");
      return;
    }

    localStorage.setItem("fixmateUser", JSON.stringify(data.user));
    localStorage.setItem("fixmateToken", data.token);
    setStatus("Login successful!", "success");

    window.location.href = "/index.html";

  } catch (err) {
    setStatus("Server error. Try again.", "error");
  }
});

// ========================
// GOOGLE LOGIN
// ========================
async function handleGoogleSignInSuccess(response) {
  setStatus("Processing Google login...");

  try {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: response.credential,
        role: activeAuthTab === "signup" ? signupRoleInput.value : loginRoleInput.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || "Google login failed", "error");
      return;
    }

    localStorage.setItem("fixmateUser", JSON.stringify(data.user));
    localStorage.setItem("fixmateToken", data.token);
    setStatus("Login successful!", "success");

    window.location.href = "/index.html";

  } catch (err) {
    setStatus("Google login error", "error");
  }
}

// ========================
// INIT GOOGLE
// ========================
window.onload = async () => {
  try {
    const res = await fetch(`${API_URL}/config`);
    const config = await res.json();

    if (!config.googleClientId) return;

    google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: handleGoogleSignInSuccess
    });

    google.accounts.id.renderButton(googleLoginWrap, {
      theme: "outline",
      size: "large"
    });

    google.accounts.id.renderButton(googleSignupWrap, {
      theme: "outline",
      size: "large"
    });

  } catch (err) {
    console.log("Google init failed");
  }
};