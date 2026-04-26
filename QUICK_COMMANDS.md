# FixMate - Quick Command Reference

## Setup Commands

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm start

# Server runs at http://localhost:3000
```

## Environment Setup

```bash
# Edit .env and add:
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/fixmate
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

## Testing APIs with cURL

### Auth - Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### Auth - Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### Auth - Admin Login
```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fixmate.com",
    "password": "admin123"
  }'
```

### Providers - List All
```bash
curl http://localhost:3000/api/providers
```

### Providers - Get Specific
```bash
curl http://localhost:3000/api/providers/PROVIDER_ID
```

### Bookings - Create
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "providerId": "PROVIDER_ID",
    "serviceType": "Plumbing",
    "date": "2024-05-01",
    "time": "10:00",
    "address": "123 Main Street",
    "phoneNumber": "9876543210"
  }'
```

### Bookings - Get User Bookings
```bash
curl http://localhost:3000/api/bookings/user/USER_ID
```

### Bookings - Get Provider Bookings
```bash
curl http://localhost:3000/api/bookings/provider/PROVIDER_ID
```

### Bookings - Update Status
```bash
curl -X PATCH http://localhost:3000/api/bookings/BOOKING_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted"
  }'
```

### Admin - List All Providers
```bash
curl http://localhost:3000/api/admin/providers
```

### Admin - List Pending Providers
```bash
curl http://localhost:3000/api/admin/providers/pending
```

### Admin - Approve Provider
```bash
curl -X PATCH http://localhost:3000/api/admin/providers/PROVIDER_ID/approve
```

### Admin - Reject Provider
```bash
curl -X PATCH http://localhost:3000/api/admin/providers/PROVIDER_ID/reject
```

### Admin - Delete Provider
```bash
curl -X DELETE http://localhost:3000/api/admin/providers/PROVIDER_ID
```

## Git Commands

```bash
# Initialize Git
git init

# Add all files
git add .

# Commit changes
git commit -m "FixMate MongoDB Migration"

# Add remote
git remote add origin https://github.com/yourusername/fixmate.git

# Push to GitHub
git push -u origin main

# Check status
git status

# View logs
git log --oneline
```

## Render Deployment

```bash
# Preview deployment logs
# (In Render Dashboard)

# Redeploy latest code
git push origin main

# View live app
# https://fixmate.onrender.com
```

## MongoDB Commands (Optional)

```bash
# Connect to MongoDB Atlas using mongosh
mongosh "mongodb+srv://username:password@cluster.mongodb.net/fixmate"

# List databases
show databases

# Use fixmate database
use fixmate

# List collections
show collections

# View users
db.users.find()

# View providers
db.providers.find()

# View bookings
db.bookings.find()

# Count documents
db.users.countDocuments()

# Delete test data
db.bookings.deleteMany({})
```

## Development Tips

### Check Node Version
```bash
node --version
npm --version
```

### Clear npm Cache
```bash
npm cache clean --force
```

### Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Test Specific Route
```bash
# Use Postman or VS Code REST Client extension
# Create test.http file:

@baseUrl = http://localhost:3000

GET @baseUrl/api/config

###

POST @baseUrl/api/auth/login
Content-Type: application/json

{
  "email": "admin@fixmate.com",
  "password": "admin123",
  "role": "admin"
}
```

### Monitor Logs
```bash
# In development
npm start

# View MongoDB connection logs
# Check Render Dashboard logs
```

## Troubleshooting Commands

```bash
# Find process on port 3000
lsof -i :3000

# Kill process on port 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9

# Find process on Windows
netstat -ano | findstr :3000

# Kill process on Windows
taskkill /PID <PID> /F

# Check .env file content
cat .env

# Verify MongoDB connection
curl http://localhost:3000/api/config
```

## Useful Environment Variables

```env
# Development
NODE_ENV=development
PORT=3000

# Production (Render)
NODE_ENV=production
PORT=3000
```

## Common Status Codes

```
200 OK                    - Request successful
201 Created              - Resource created
400 Bad Request          - Invalid input
401 Unauthorized         - Authentication failed
403 Forbidden            - Not allowed
404 Not Found            - Resource doesn't exist
409 Conflict             - Email already exists
500 Server Error         - Internal error
```

## File Structure Quick Reference

```
backend/
├── config/db.js          # MongoDB connection
├── models/
│   ├── User.js
│   ├── Provider.js
│   └── Booking.js
├── routes/
│   ├── auth.js
│   ├── providers.js
│   ├── bookings.js
│   └── admin.js
├── server.js             # Main app
└── uploads/              # File storage
```

## Quick Deploy Checklist

```bash
# 1. Test locally
npm install
npm start
# Visit http://localhost:3000/api/config

# 2. Push to GitHub
git add .
git commit -m "Production ready"
git push origin main

# 3. In Render Dashboard
# - Create new web service
# - Connect GitHub repo
# - Add environment variables
# - Deploy

# 4. Monitor
# - Check Render logs
# - Test API endpoints
# - Change admin password
```

## Performance Monitoring

```bash
# View server logs
npm start

# Check response times
curl -w "Time: %{time_total}s\n" http://localhost:3000/api/providers

# Monitor MongoDB
# Use MongoDB Atlas Dashboard
```

## Backup & Maintenance

```bash
# Export MongoDB data
mongodump --uri "mongodb+srv://..." --out ./backup

# View Render backups
# (Render Dashboard → Settings → Backups)

# Update packages
npm update
npm audit fix
```

---

**Version:** 2.0  
**Updated:** 2024
