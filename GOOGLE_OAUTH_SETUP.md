# Google OAuth Setup Guide for FixMate

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Name it "FixMate" and click "Create"
4. Wait for the project to be created

## Step 2: Enable Google Sign-In API

1. In the Cloud Console, go to **APIs & Services** → **Enabled APIs & services**
2. Click **"+ Enable APIs and Services"**
3. Search for "Google+ API" and enable it
4. Search for "Identity Toolkit API" and enable it

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **OAuth 2.0 Client ID**
3. If asked to configure the OAuth consent screen first:
   - Click "Configure Consent Screen"
   - Select "External"
   - Fill in:
     - App name: FixMate
     - User support email: your-email@gmail.com
     - Developer contact: your-email@gmail.com
   - Click "Save and Continue" through all screens
4. Back to creating credentials:
   - Choose **"Web application"**
   - Name: "FixMate Web"
   - Add Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost`
     - Your production domain (e.g., `https://yourapp.com`)
   - Add Authorized redirect URIs:
     - `http://localhost:3000/auth`
     - `http://localhost/auth`
     - Your production URL (e.g., `https://yourapp.com/auth`)
   - Click "Create"

## Step 4: Copy Your Client ID

1. You'll see your OAuth credentials
2. Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

## Step 5: Add Client ID to FixMate

1. Open `auth.js`
2. Find this line:
   ```javascript
   const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE";
   ```
3. Replace with your actual Client ID:
   ```javascript
   const GOOGLE_CLIENT_ID = "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com";
   ```

## Step 6: Test Google Sign-In

1. Start the FixMate server:
   ```bash
   npm start
   ```
2. Go to `http://localhost:3000/auth`
3. You should see "Continue with Google" buttons on login and signup forms
4. Click to test Google authentication

## How It Works

### Login Flow:
1. User clicks "Continue with Google"
2. Google authentication window opens
3. User signs in with their Google account
4. Frontend receives Google ID token
5. Backend verifies token and extracts user info (name, email)
6. Backend checks if user exists:
   - **If exists:** Log them in
   - **If not exists:** Create new user account as "user" role
7. User data stored in localStorage
8. User redirected to appropriate dashboard

### Security Features:
- ✅ Google token verification on backend
- ✅ Token expiration validation
- ✅ Email verification via Google
- ✅ Secure password hashing for auto-generated passwords
- ✅ User data stored in encrypted database
- ✅ CORS protection
- ✅ HTTPS recommended for production

## Environment Variables (Optional but Recommended)

For production, use environment variables:

```bash
# .env file
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NODE_ENV=production
PORT=3000
```

Update `auth.js`:
```javascript
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
```

## Production Notes

For production use, install the official Google Auth Library:
```bash
npm install google-auth-library
```

Update `server.js` to use full JWT verification:
```javascript
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ticket = await client.verifyIdToken({
  idToken: token,
  audience: process.env.GOOGLE_CLIENT_ID,
});

const payload = ticket.getPayload();
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Google is not defined" | Ensure Google Sign-In script is loaded: Check `<script src="https://accounts.google.com/gsi/client"></script>` in auth.html |
| "Unauthorized origin" | Add your domain to authorized origins in Google Cloud Console |
| Token verification fails | Check that token is valid and not expired |
| User not created | Ensure database connection is working |
| Users can only be "user" role | Google login always creates "user" role; use manual signup for providers |

## Features Included

✅ "Continue with Google" button on login and signup pages
✅ Google token verification on backend
✅ Automatic user account creation
✅ Secure password handling for OAuth users
✅ Email as unique identifier
✅ Responsive design
✅ Error handling and user feedback
✅ Auto-redirect to appropriate dashboard
