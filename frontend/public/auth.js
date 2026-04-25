const tabButtons = document.querySelectorAll(".tab-btn");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const statusText = document.getElementById("auth-status");
const loginRoleInput = document.getElementById("login-role");
const signupRoleInput = document.getElementById("signup-role");
const serviceTypeWrap = document.getElementById("service-type-wrap");
const serviceTypeInput = document.getElementById("signup-service-type");

const googleLoginWrap = document.getElementById("google-login-btn");
const googleSignupWrap = document.getElementById("google-signup-btn");
let activeAuthTab = "login";

const setGoogleVisibility = (visible) => {
  if (!googleLoginWrap || !googleSignupWrap) return;
  googleLoginWrap.classList.toggle("hidden", !visible);
  googleSignupWrap.classList.toggle("hidden", !visible);
};

const getRedirectTarget = () => {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (!next) return "";
  // only allow same-origin relative redirects
  if (next.startsWith("/") || /^[a-zA-Z0-9_\-./]+$/.test(next)) {
    return next.startsWith("/") ? next : `/${next}`;
  }
  return "";
};

const redirectAfterLogin = (user) => {
  const next = getRedirectTarget();
  if (next) {
    window.location.href = next;
    return;
  }

  if (user?.role === "provider") {
    window.location.href = "/provider-dashboard.html";
    return;
  }

  if (user?.role === "admin") {
    window.location.href = "/admin-panel";
    return;
  }

  window.location.href = "/index.html";
};

const setStatus = (message, type = "") => {
  statusText.textContent = message;
  statusText.className = `status ${type}`.trim();
};

const switchTab = (targetTab) => {
  activeAuthTab = targetTab;
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === targetTab);
  });
  loginForm.classList.toggle("hidden", targetTab !== "login");
  signupForm.classList.toggle("hidden", targetTab !== "signup");
  setStatus("");
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

// Get selected services
const getSelectedServices = () => {
  const checkboxes = document.querySelectorAll('#service-type-wrap input[type="checkbox"]:checked');
  return Array.from(checkboxes).map((cb) => cb.value);
};

document.querySelectorAll(".role-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.roleTarget;
    const role = button.dataset.role;
    const roleButtons = document.querySelectorAll(`.role-btn[data-role-target="${target}"]`);

    roleButtons.forEach((item) => item.classList.toggle("active", item === button));

    if (target === "login") {
      loginRoleInput.value = role;
      return;
    }

    signupRoleInput.value = role;
    const isProvider = role === "provider";
    serviceTypeWrap.classList.toggle("hidden", !isProvider);
  });
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const role = signupRoleInput.value;
  let selectedServices = [];
  
  if (role === "provider") {
    selectedServices = getSelectedServices();
    if (selectedServices.length === 0) {
      setStatus("Please select at least one service type.", "error");
      return;
    }
  }
  
  setStatus("Creating account...");

  const payload = {
    name: document.getElementById("signup-name").value.trim(),
    email: document.getElementById("signup-email").value.trim(),
    password: document.getElementById("signup-password").value,
    role: role,
    serviceTypes: selectedServices,
  };

  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let result = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      setStatus(result?.message || "Signup failed. Please try again.", "error");
      return;
    }

    setStatus("Account created successfully. Please login.", "success");
    signupForm.reset();
    // Uncheck all checkboxes
    document.querySelectorAll('#service-type-wrap input[type="checkbox"]').forEach((cb) => (cb.checked = false));
    serviceTypeWrap.classList.add("hidden");
    signupRoleInput.value = "user";
    document.querySelectorAll('.role-btn[data-role-target="signup"]').forEach((button) => {
      button.classList.toggle("active", button.dataset.role === "user");
    });
    switchTab("login");
  } catch (error) {
    const isLikelyOffline =
      window.location.protocol === "file:" ||
      String(error?.message || "").toLowerCase().includes("failed to fetch");

    setStatus(
      isLikelyOffline
        ? "Server not reachable. Start the server (npm start) and open http://localhost:3000/auth"
        : "Unable to create account. Try again.",
      "error"
    );
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Logging in...");

  const payload = {
    email: document.getElementById("login-email").value.trim(),
    password: document.getElementById("login-password").value,
    role: loginRoleInput.value,
  };

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let result = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      setStatus(result?.message || "Login failed.", "error");
      return;
    }

    const userData = {
      ...result.user,
      profilePicture: result.user.profilePicture || null,
    };
    localStorage.setItem("fixmateUser", JSON.stringify(userData));
    setStatus("Login successful. Redirecting...", "success");
    redirectAfterLogin(result.user);
  } catch (error) {
    const isLikelyOffline =
      window.location.protocol === "file:" ||
      String(error?.message || "").toLowerCase().includes("failed to fetch");

    setStatus(
      isLikelyOffline
        ? "Server not reachable. Start the server (npm start) and open http://localhost:3000/auth"
        : "Unable to login. Try again.",
      "error"
    );
  }
});

// Google OAuth Handler
const handleGoogleSignInSuccess = async (response) => {
  setStatus("Processing Google authentication...");

  try {
    const isSignup = activeAuthTab === "signup";
    const role = isSignup ? signupRoleInput.value : loginRoleInput.value;

    let selectedServices = [];
    if (isSignup && role === "provider") {
      selectedServices = getSelectedServices();
      if (selectedServices.length === 0) {
        setStatus("Please select at least one service type.", "error");
        return;
      }
    }

    const backendResponse = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: response.credential,
        role,
        serviceTypes: selectedServices,
      }),
    });

    const result = await backendResponse.json();

    if (!backendResponse.ok) {
      setStatus(result.message || "Google authentication failed.", "error");
      return;
    }

    // Store user data with profile picture
    const userData = {
      ...result.user,
      profilePicture: result.user.profilePicture || null,
    };
    localStorage.setItem("fixmateUser", JSON.stringify(userData));
    setStatus("Authentication successful. Redirecting...", "success");
    redirectAfterLogin(result.user);
  } catch (error) {
    console.error("Google authentication error:", error);
    setStatus("Authentication failed. Please try again.", "error");
  }
};

const handleGoogleSignInError = () => {
  setStatus("Google Sign-In failed. Please try again.", "error");
};

// Initialize Google Sign-In buttons when page loads
window.addEventListener("load", () => {
  (async () => {
    try {
      const response = await fetch("/api/config");
      const config = await response.json();
      const googleClientId = config?.googleClientId;

      if (!googleClientId) {
        setGoogleVisibility(false);
        // Keep UI clean when OAuth isn't configured
        return;
      }

      if (!window.google?.accounts?.id) {
        setGoogleVisibility(false);
        setStatus("Google Sign-In failed to load. Please refresh.", "error");
        return;
      }

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignInSuccess,
      });

      setGoogleVisibility(true);

      // Render login button
      google.accounts.id.renderButton(googleLoginWrap, {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "continue_with",
      });

      // Render signup button
      google.accounts.id.renderButton(googleSignupWrap, {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "signup_with",
      });
    } catch (error) {
      setGoogleVisibility(false);
    }
  })();
});
