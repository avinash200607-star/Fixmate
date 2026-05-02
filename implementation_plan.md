# Goal Description

1. **Fix Admin Panel Display Issue**: Currently, the admin panel lacks a user section and doesn't provide a way to easily view a provider's full profile. We will add a "Users" section to view all registered users and add a "View Profile" link for each provider to easily inspect their profile.
2. **Light Mode / Dark Mode Feature**: Implement a global dark mode feature across the platform. This will be controlled by a toggle in the navbar, saving the user's preference in their browser.
3. **Hide Admin Login**: Hide all visible "Admin Login" links from regular users. The admin panel link will be dynamically injected into the navbar *only* when an admin successfully logs in, keeping the existence of the admin system hidden from standard users.

## User Review Required

- **Hiding Admin Login Strategy**: The strategy is to remove the "Admin login" links from `auth.html` and the navbar. Admins will need to navigate to `/admin-login.html` directly via the URL bar to log in. Once logged in, they will see the "Admin Panel" link in the standard navigation menu. Is this acceptable?
- **Dark Mode Scope**: The dark mode will use standard CSS variables (`[data-theme="dark"]`) and will primarily invert backgrounds and text colors. Is there a specific color palette you want for the dark mode? If not, a standard sleek dark gray/blue aesthetic will be used.

## Proposed Changes

### Backend Route Updates

#### [MODIFY] backend/routes/admin.js
- Add a new route `GET /api/admin/users` to fetch all regular users (excluding admins).
- Ensure existing `/api/admin/providers` route returns all necessary data for rendering profiles.

### Frontend HTML & CSS

#### [MODIFY] frontend/public/admin-panel.html
- Add an "All Users" section to display the fetched users.
- Update the provider table to include a link to `provider-view.html?id=${provider.id}` so the admin can view the full profile easily.
- Remove the hardcoded "Admin Login" button from the header.

#### [MODIFY] frontend/public/auth.html
- Remove the "Admin Login" link at the bottom of the form to hide it from normal users.

#### [MODIFY] frontend/public/style.css
- Define CSS variables for dark mode under `[data-theme="dark"]`. This will include colors like `--bg-dark`, `--text-dark`, etc.
- Add styles for the theme toggle button (moon/sun icon).

### Frontend Javascript

#### [MODIFY] frontend/public/logout.js
- **Dynamic Admin Link**: Update the `setupLogout` function so that if `user.role === 'admin'`, it dynamically injects an "Admin Panel" link into the navigation menu.
- **Theme Toggle**: Inject a Dark/Light mode toggle button into the `.nav-actions` area.
- Add logic to toggle the `data-theme` attribute on the `<html>` tag and save the user's preference to `localStorage`.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. Open the application and verify no "Admin Login" links are visible.
2. Navigate directly to `/admin-login.html`, log in as admin, and verify the "Admin Panel" link appears in the navbar.
3. Navigate to the Admin Panel and verify the new "All Users" list populates correctly.
4. Verify the "View Profile" link on a provider takes you to their detailed profile page.
5. Click the Dark/Light mode toggle in the navbar and ensure the theme switches smoothly and persists across page reloads.
