const express = require("express");
const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const mapBookingStatusForFrontend = (status) => {
  const statusMap = {
    pending: "pending",
    accepted: "confirmed",
    rejected: "cancelled",
    completed: "completed",
  };
  return statusMap[status] || "pending";
};

// POST /api/bookings (Create new booking)
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Support both snake_case (from frontend) and camelCase formats
    const userId = req.user.id;
    const providerId = req.body.providerId || req.body.provider_id;
    const serviceType = req.body.serviceType || req.body.service_type;
    const date = req.body.date || req.body.booking_date;
    const time = req.body.time || req.body.booking_time;
    const address = req.body.address || req.body.location || req.body.full_address;
    const phoneNumber = req.body.phoneNumber || req.body.phone_number;
    const problemDescription = req.body.problemDescription || req.body.problem_description || "";

    if (!providerId || !serviceType || !date || !time || !address) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number." });
    }

    const provider = await Provider.findById(providerId);
    if (!provider || !provider.approved) {
      return res.status(400).json({ message: "Provider is not approved yet." });
    }

    const booking = new Booking({
      userId,
      providerId,
      serviceType,
      date,
      time,
      address,
      phoneNumber,
      problemDescription,
      status: "pending",
    });

    await booking.save();

    res.status(201).json({
      message: "Booking created successfully. Waiting for provider response.",
      booking: {
        id: booking._id,
        user_id: booking.userId,
        provider_id: booking.providerId,
        service_type: booking.serviceType,
        location: address,
        full_address: address,
        booking_date: booking.date,
        booking_time: booking.time,
        phone_number: booking.phoneNumber,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ message: "Failed to create booking." });
  }
});

// GET /api/bookings/provider/:id (Get bookings for provider)
router.get("/provider/:id", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ providerId: req.params.id })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const result = bookings.map((b) => ({
      ...b.toObject(),
      service_type: b.serviceType,
      booking_date: b.date,
      booking_time: b.time,
      full_address: b.address,
      status: mapBookingStatusForFrontend(b.status),
    }));

    res.json(result);
  } catch (error) {
    console.error("Provider bookings error:", error);
    res.status(500).json({ message: "Failed to fetch provider bookings." });
  }
});

// GET /api/bookings/user/:id (Get bookings for user)
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.id })
      .populate("providerId", "location serviceTypes")
      .sort({ createdAt: -1 });

    const result = bookings.map((b) => ({
      ...b.toObject(),
      service_type: b.serviceType,
      booking_date: b.date,
      booking_time: b.time,
      full_address: b.address,
      status: mapBookingStatusForFrontend(b.status),
    }));

    res.json(result);
  } catch (error) {
    console.error("User bookings error:", error);
    res.status(500).json({ message: "Failed to fetch user bookings." });
  }
});

// PATCH /api/bookings/:bookingId (Update booking status)
router.patch("/:bookingId", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["pending", "accepted", "rejected", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }

    await Booking.findByIdAndUpdate(req.params.bookingId, { status }, { new: true });

    res.json({ message: "Booking status updated successfully." });
  } catch (error) {
    console.error("Booking status update error:", error);
    res.status(500).json({ message: "Failed to update booking." });
  }
});

// PATCH /api/bookings/:bookingId/accept (Accept booking)
router.patch("/:bookingId/accept", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: "accepted" },
      { new: true }
    ).populate("userId", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    res.json({
      message: "✓ Booking accepted successfully.",
      booking: {
        id: booking._id,
        user_id: booking.userId,
        service_type: booking.serviceType,
        booking_date: booking.date,
        booking_time: booking.time,
        status: "confirmed"
      }
    });
  } catch (error) {
    console.error("Accept booking error:", error);
    res.status(500).json({ message: "Failed to accept booking." });
  }
});

// PATCH /api/bookings/:bookingId/reject (Reject booking)
router.patch("/:bookingId/reject", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: "rejected" },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    res.json({
      message: "✗ Booking rejected successfully.",
      booking: {
        id: booking._id,
        status: "cancelled"
      }
    });
  } catch (error) {
    console.error("Reject booking error:", error);
    res.status(500).json({ message: "Failed to reject booking." });
  }
});

// GET /api/bookings/provider/:id/pending (Get pending bookings for provider)
router.get("/provider/:id/pending", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ providerId: req.params.id, status: "pending" })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const result = bookings.map((b) => ({
      ...b.toObject(),
      service_type: b.serviceType,
      booking_date: b.date,
      booking_time: b.time,
      full_address: b.address,
      phone_number: b.phoneNumber,
      status: "pending",
    }));

    res.json(result);
  } catch (error) {
    console.error("Pending bookings error:", error);
    res.status(500).json({ message: "Failed to fetch pending bookings." });
  }
});

module.exports = router;
