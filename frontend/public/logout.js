// Global Utilities for FixMate
// Handles: Theme Toggle, Admin Link Injection, and Logout
// Usage: Add <script src="logout.js"></script> to any page

const setupThemeToggle = () => {
  const navActions = document.querySelector(".nav-actions");
  if (!navActions) return;

  // Create theme toggle button
  const themeToggle = document.createElement("button");
  themeToggle.className = "theme-toggle-btn";
  themeToggle.title = "Toggle Dark Mode";
  
  // Check saved theme or system preference
  const savedTheme = localStorage.getItem("fixmateTheme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
  
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  // Add styles for the toggle
  const style = document.createElement("style");
  style.textContent = `
    .theme-toggle-btn {
      background: none;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 9px 12px;
      cursor: pointer;
      color: var(--muted);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .theme-toggle-btn:hover {
      background: var(--light);
      color: var(--primary);
    }
  `;
  document.head.appendChild(style);

  // Toggle logic
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("fixmateTheme", newTheme);
    
    themeToggle.innerHTML = newTheme === "dark" 
      ? '<i class="fa-solid fa-sun"></i>' 
      : '<i class="fa-solid fa-moon"></i>';
  });

  navActions.insertBefore(themeToggle, navActions.firstChild);
};

const setupAdminLink = (user) => {
  if (!user || user.role !== "admin") return;

  const menu = document.querySelector(".menu");
  if (!menu) return;

  // Check if Admin Panel link already exists to avoid duplicates
  const existingAdminLink = Array.from(menu.querySelectorAll("a")).find(a => a.textContent.includes("Admin Panel"));
  if (existingAdminLink) return;

  const adminLink = document.createElement("a");
  adminLink.href = "admin-panel.html";
  adminLink.textContent = "Admin Panel";
  
  // Highlight if currently on admin panel
  if (window.location.pathname.includes("admin-panel.html")) {
    adminLink.className = "active";
  }

  menu.appendChild(adminLink);
};

const setupLogout = () => {
  setupThemeToggle();

  const user = JSON.parse(localStorage.getItem("fixmateUser") || "{}");
  
  setupAdminLink(user);

  if (!user.id) {
    // Not logged in, don't show profile
    return;
  }

  const navActions = document.querySelector(".nav-actions");
  if (!navActions) return;

  // Create profile dropdown wrapper
  const profileDropdown = document.createElement("div");
  profileDropdown.className = "user-profile-dropdown";
  profileDropdown.innerHTML = `
    <button class="profile-btn" title="Profile menu">
      ${user.profilePicture ? `<img src="${user.profilePicture}" alt="${user.name}" class="profile-pic" />` : `<div class="profile-pic-placeholder">${user.name?.charAt(0).toUpperCase() || 'U'}</div>`}
      <span class="profile-name">${user.name || 'Profile'}</span>
    </button>
    <div class="dropdown-menu">
      <div class="dropdown-header">
        <p class="dropdown-name">${user.name || 'User'}</p>
        <p class="dropdown-email">${user.email || ''}</p>
      </div>
      <hr class="dropdown-divider" />
      <a href="/${user.role === 'provider' ? 'provider-profile' : 'user-bookings'}.html" class="dropdown-link">
        <i class="fa-solid fa-user"></i> ${user.role === 'provider' ? 'My Profile' : 'My Bookings'}
      </a>
      ${user.role === 'provider' ? `<a href="/provider-bookings.html" class="dropdown-link"><i class="fa-solid fa-calendar-check"></i> Manage Bookings</a>` : ''}
      <a href="/user-bookings.html" class="dropdown-link" id="bookings-link" style="display:none;"><i class="fa-solid fa-calendar-check"></i> My Bookings</a>
      <hr class="dropdown-divider" />
      <button class="dropdown-link logout-btn">
        <i class="fa-solid fa-sign-out-alt"></i> Logout
      </button>
    </div>
  `;

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    .user-profile-dropdown {
      position: relative;
      margin-left: 10px;
    }

    .profile-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 6px 10px;
      cursor: pointer;
      font-weight: 500;
      color: var(--text);
      transition: all 0.3s ease;
    }

    .profile-btn:hover {
      border-color: var(--primary);
      background: var(--light);
    }

    .profile-pic {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid var(--border);
    }

    .profile-pic-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-2));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .profile-name {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      width: 240px;
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(10, 37, 64, 0.15);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
      pointer-events: none;
    }

    .user-profile-dropdown.active .dropdown-menu {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: all;
    }

    .dropdown-header {
      padding: 12px 16px;
    }

    .dropdown-name {
      margin: 0;
      font-weight: 600;
      color: var(--text);
      font-size: 0.95rem;
    }

    .dropdown-email {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: var(--muted);
    }

    .dropdown-divider {
      margin: 0;
      border: none;
      border-top: 1px solid var(--border);
    }

    .dropdown-link {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: none;
      color: var(--text);
      text-decoration: none;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 500;
      text-align: left;
      transition: background 0.2s ease;
    }

    .dropdown-link:hover {
      background: var(--light);
      color: var(--primary);
    }

    .logout-btn {
      color: #c6263a;
    }

    .logout-btn:hover {
      background: #fee2e2;
      color: #991b1b;
    }

    @media (max-width: 768px) {
      .profile-name {
        display: none;
      }

      .dropdown-menu {
        width: 200px;
      }
    }
  `;
  document.head.appendChild(style);

  // Add click handlers
  const profileBtn = profileDropdown.querySelector(".profile-btn");
  const logoutBtn = profileDropdown.querySelector(".logout-btn");

  profileBtn.addEventListener("click", () => {
    profileDropdown.classList.toggle("active");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target)) {
      profileDropdown.classList.remove("active");
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("fixmateUser");
    localStorage.removeItem("fixmateToken");
    window.location.href = "/auth.html";
  });

  // Insert before or replace existing auth buttons
  const existingAuthBtns = navActions.querySelectorAll(".btn");
  if (existingAuthBtns.length > 0) {
    // Replace login/signup buttons with profile dropdown
    existingAuthBtns.forEach((btn) => btn.remove());
  }

  navActions.appendChild(profileDropdown);
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupLogout);
} else {
  setupLogout();
}
