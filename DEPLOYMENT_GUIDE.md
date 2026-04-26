# FixMate Production Deployment Guide

## Overview
FixMate is now production-ready with MongoDB Atlas cloud database, modular routing, and CORS support.

## Prerequisites
- Node.js 14+ installed
- MongoDB Atlas account (free tier available)
- Render.com account (for free/paid deployment)
- Google OAuth credentials (for Google login)

---

## Step 1: Set Up MongoDB Atlas

### 1.1 Create MongoDB Atlas Cluster
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in with your account
3. Create a new project named "FixMate"
4. Create a cluster:
   - Choose the **FREE M0 tier** (sufficient for development/small projects)
   - Select your preferred region (close to your users)
   - Wait for cluster to deploy (5-10 minutes)

### 1.2 Get Connection String
1. Click "Connect" on your cluster
2. Select "Connect your application"
3. Choose "Node.js" driver
4. Copy the connection string (MongoDB URI)
5. Replace `<password>` and `<username>` with your database credentials

**Example:** 
```
mongodb+srv://admin:mypassword@fixmate-cluster.mongodb.net/fixmate?retryWrites=true&w=majority
```

### 1.3 Whitelist IP Addresses
1. Go to "Network Access"
2. Click "Add IP Address"
3. For development: Add your local machine IP
4. For production: Add `0.0.0.0/0` (allows all IPs - use with caution)

---

## Step 2: Set Up Environment Variables

### 2.1 Create `.env` File
```bash
cp .env.example .env
```

### 2.2 Update `.env` with Your Credentials
```env
# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-deployed-domain.onrender.com

# MongoDB
MONGO_URI=mongodb+srv://admin:password@fixmate-cluster.mongodb.net/fixmate?retryWrites=true&w=majority

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## Step 3: Deploy to Render

### 3.1 Prepare for Deployment
1. Ensure all code is committed to Git:
```bash
git init
git add .
git commit -m "Initial commit: MongoDB migration"
```

2. Push to GitHub:
```bash
git remote add origin https://github.com/yourusername/fixmate.git
git branch -M main
git push -u origin main
```

### 3.2 Deploy on Render
1. Visit [Render.com](https://render.com)
2. Sign up with GitHub account
3. Click "New +" → "Web Service"
4. Select your GitHub repository
5. Configure:
   - **Name:** fixmate-app
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Paid if needed)

6. Add Environment Variables:
   - Click "Advanced" → "Add Environment Variable"
   - Add all variables from your `.env` file:
     - `PORT=3000`
     - `NODE_ENV=production`
     - `MONGO_URI=...`
     - `GOOGLE_CLIENT_ID=...`
     - `FRONTEND_URL=https://your-render-url.onrender.com`

7. Click "Create Web Service"
8. Wait for deployment (2-5 minutes)

### 3.3 Get Your Live URL
- After deployment completes, your app will be live at:
  ```
  https://fixmate-app.onrender.com
  ```

---

## Step 4: Local Development Setup

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Create Local `.env` File
```bash
cp .env.example .env
```

### 4.3 Update `.env` for Local Development
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MONGO_URI=mongodb+srv://admin:password@fixmate-cluster.mongodb.net/fixmate?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=your_google_client_id
```

### 4.4 Start Development Server
```bash
npm start
```

Server will run at: `http://localhost:3000`

---

## Step 5: Database Schema Reference

### User Schema
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (hashed),
  role: String (user, provider, admin),
  googleId: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Provider Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  serviceTypes: [String],
  experience: Number,
  price: Number,
  location: String,
  phoneNumber: String,
  description: String,
  profileImage: String (URL),
  approved: Boolean,
  reviewStatus: String (pending, approved, rejected),
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  providerId: ObjectId (ref: Provider),
  serviceType: String,
  date: String (YYYY-MM-DD),
  time: String (HH:MM),
  address: String,
  phoneNumber: String,
  problemDescription: String,
  status: String (pending, accepted, rejected, completed),
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Providers
- `GET /api/providers` - Get all approved providers
- `GET /api/providers/:id` - Get specific provider
- `POST /api/providers/profile` - Save/Update provider profile
- `GET /api/provider/profile/:providerId` - Get provider profile

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/user/:id` - Get user's bookings
- `GET /api/bookings/provider/:id` - Get provider's bookings
- `PATCH /api/bookings/:bookingId` - Update booking status

### Admin
- `GET /api/admin/providers` - Get all providers
- `GET /api/admin/providers/pending` - Get pending providers
- `PATCH /api/admin/providers/:id/approve` - Approve provider
- `PATCH /api/admin/providers/:id/reject` - Reject provider
- `DELETE /api/admin/providers/:id` - Delete provider

---

## Production Best Practices

### Security
✅ Enable CORS with specific origins (set `FRONTEND_URL`)
✅ Use HTTPS/SSL (Render provides free SSL)
✅ Store sensitive data in environment variables
✅ Hash passwords with bcrypt (already implemented)
✅ Validate all inputs (implemented in routes)

### Performance
✅ MongoDB indexes on frequently queried fields
✅ Use connection pooling (Mongoose default)
✅ Implement caching for provider listings
✅ Compress responses (gzip via Express)

### Monitoring
- Enable Render logs for error tracking
- Use MongoDB Atlas monitoring dashboard
- Set up alerts for high error rates
- Monitor server response times

### Scaling (Future)
- Use Redis for session caching
- Implement rate limiting (express-rate-limit)
- Add pagination to large endpoints
- Use CDN for static assets

---

## Troubleshooting

### MongoDB Connection Issues
**Error:** `MongooseError: Cannot connect to MongoDB`

**Solutions:**
1. Verify `MONGO_URI` in `.env` is correct
2. Check MongoDB Atlas IP whitelist includes your IP
3. Verify username/password are correct
4. Check network connectivity

### Render Deployment Fails
**Error:** `Build failed` or `Application crashed`

**Solutions:**
1. Check build logs in Render dashboard
2. Ensure `npm install` succeeds locally
3. Verify all environment variables are set
4. Check for syntax errors: `npm run dev`

### Google OAuth Not Working
**Error:** `Invalid or expired token`

**Solutions:**
1. Verify `GOOGLE_CLIENT_ID` is set in `.env`
2. Add Render URL to Google Console authorized origins
3. Check token hasn't expired (tokens valid for ~1 hour)

---

## First Admin User

**Default Admin Credentials:**
- Email: `admin@fixmate.com`
- Password: `admin123`

⚠️ **IMPORTANT:** Change password immediately after first login!

---

## Maintenance & Updates

### Backup MongoDB Data
```bash
# MongoDB Atlas automatically backs up data daily
# Access backups in Atlas dashboard: Backup → Automated Backups
```

### Update Dependencies
```bash
npm update
npm audit fix
```

### Deploy Updates
1. Make code changes and commit
2. Push to GitHub: `git push origin main`
3. Render automatically redeploys on push

---

## Support & Resources

- MongoDB Docs: https://docs.mongodb.com/
- Mongoose Docs: https://mongoosejs.com/
- Render Docs: https://render.com/docs
- Express.js: https://expressjs.com/

---

**Deployment Status:** ✅ Ready for Production
**Last Updated:** 2024
**Version:** 2.0 (MongoDB Migration)
