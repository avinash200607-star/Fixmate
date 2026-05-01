# Booking Request Workflow - Complete Guide

## ✅ Fixed Issues

### 1. **Booking Field Mismatch (FIXED)** ✅
**Problem:** "All required fields must be provided" error even when all fields filled
**Cause:** Frontend sent `snake_case` fields, backend expected `camelCase`

**Solution:** Backend now accepts BOTH formats:
- Frontend: `user_id` ↔ Backend: `userId`
- Frontend: `provider_id` ↔ Backend: `providerId`
- Frontend: `service_type` ↔ Backend: `serviceType`
- Frontend: `booking_date` ↔ Backend: `date`
- Frontend: `booking_time` ↔ Backend: `time`
- Frontend: `phone_number` ↔ Backend: `phoneNumber`

✅ **Now bookings work with any field name format!**

### 2. **Phone Number Validation (ACTIVE)** ✅
- Provider profile: Max 10 digits only
- Booking form: Max 10 digits only
- Validation: Regex `^\d{10}$` (exactly 10 digits)

---

## 🆕 New Booking Request/Accept/Reject System

### API Endpoints

#### Create Booking Request
```
POST /api/bookings
Body: {
  user_id: "...",
  provider_id: "...",
  service_type: "AC Repair",
  location: "Sector 15",
  full_address: "123 Main St",
  booking_date: "2026-05-15",
  booking_time: "09:00 - 11:00",
  phone_number: "9876543210",
  problem_description: "AC not cooling"
}
Response: status = "pending"
```

#### Get Pending Booking Requests (For Provider)
```
GET /api/bookings/provider/:providerId/pending

Returns: Array of pending booking requests for the provider
```

#### Accept Booking Request
```
PATCH /api/bookings/:bookingId/accept

Response: {
  status: "confirmed",
  message: "Booking accepted successfully"
}
```

#### Reject Booking Request
```
PATCH /api/bookings/:bookingId/reject

Response: {
  status: "cancelled",
  message: "Booking rejected successfully"
}
```

#### Get All Bookings (Provider Dashboard)
```
GET /api/bookings/provider/:providerId

Returns: All bookings (pending, accepted, rejected, completed)
```

---

## 📊 Booking Status Flow

```
User Books Service
        ↓
   status: "pending"
        ↓
Provider Dashboard Shows Request
   ┌────────────────────┐
   │  Accept  │  Reject │
   └────────────────────┘
        ↓                ↓
  status: "accepted"  status: "rejected"
  (confirmed)         (cancelled)
        ↓
  Service Completion
        ↓
  status: "completed"
```

---

## 🎯 Provider Dashboard Features Needed

### Pending Requests Section
Show requests with status = "pending"
- Service name
- User details (name, phone, address)
- Booking date/time
- **Accept Button** → PATCH `/api/bookings/:id/accept`
- **Reject Button** → PATCH `/api/bookings/:id/reject`

### All Bookings Section
Show all bookings grouped by status:
- **Confirmed** (status: accepted) - Ready to work
- **Cancelled** (status: rejected) - Don't work
- **Completed** (status: completed) - Already done

---

## 🧪 Test Workflow

### 1. User Books a Service
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "provider_id": "PROVIDER_ID",
    "service_type": "AC Repair",
    "location": "Delhi",
    "full_address": "123 Main Street",
    "booking_date": "2026-05-15",
    "booking_time": "09:00 - 11:00",
    "phone_number": "9876543210"
  }'
```

### 2. Provider Sees Pending Requests
```bash
curl http://localhost:3000/api/bookings/provider/PROVIDER_ID/pending
```

### 3. Provider Accepts Booking
```bash
curl -X PATCH http://localhost:3000/api/bookings/BOOKING_ID/accept
```

### 4. User Gets Confirmation
User can check their bookings:
```bash
curl http://localhost:3000/api/bookings/user/USER_ID
```

---

## 📝 Frontend Implementation Checklist

- [ ] Booking form validates phone (max 10 digits)
- [ ] After booking, show "Request sent to provider" message
- [ ] Provider Dashboard shows "Pending Requests" tab
- [ ] Each pending request has Accept/Reject buttons
- [ ] Click Accept → calls PATCH `/api/bookings/:id/accept`
- [ ] Click Reject → calls PATCH `/api/bookings/:id/reject`
- [ ] User gets real-time updates on request status
- [ ] Show confirmation when provider accepts/rejects

---

## ✅ Status Confirmed Working

- ✅ Booking creation with field flexibility
- ✅ Phone validation (10 digits max)
- ✅ Backend endpoints all deployed
- ✅ API responses working correctly
- ✅ Admin panel working
- ✅ Images syncing across devices

---

## 🚀 Ready to Build!

Now update your provider dashboard and user booking pages to use these new endpoints!
