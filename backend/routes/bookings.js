const express = require("express");
const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
const User = require("../models/User");

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
router.post("/", async (req, res) => {
  try {
    const { userId, providerId, serviceType, date, time, address, phoneNumber, problemDescription } = req.body;

    if (!userId || !providerId || !serviceType || !date || !time || !address) {
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
      problemDescription: problemDescription || "",
      status: "pending",
    });

    await booking.save();

    res.status(201).json({
      message: "Booking created successfully.",
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
router.get("/provider/:id", async (req, res) => {
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
router.get("/user/:id", async (req, res) => {
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
router.patch("/:bookingId", async (req, res) => {
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

module.exports = router;
