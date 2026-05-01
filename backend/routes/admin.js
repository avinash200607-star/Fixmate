const express = require("express");
const Provider = require("../models/Provider");
const User = require("../models/User");
const Booking = require("../models/Booking");

const router = express.Router();

const providerToFrontend = (provider, user) => ({
  id: provider._id,
  provider_id: provider._id,
  name: user?.name || "Provider",
  service_type: provider.serviceTypes ? provider.serviceTypes.join(", ") : "",
  experience_years: provider.experience || 0,
  pricing: provider.price ? `Starting at Rs.${provider.price}` : "Contact for pricing",
  location: provider.location || "",
  phone_number: provider.phoneNumber || "",
  review_status: provider.reviewStatus || "",
  description: provider.description || "Experienced service provider.",
  profile_image: provider.profileImage || null,
  portfolio_images: JSON.stringify(provider.portfolioImages || []),
});

// GET /api/admin/providers/pending (Get pending provider approvals)
router.get("/providers/pending", async (_req, res) => {
  try {
    const providers = await Provider.find({ reviewStatus: "pending" })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const result = providers.map((provider) => providerToFrontend(provider, provider.userId));
    res.json(result);
  } catch (error) {
    console.error("Pending providers error:", error);
    res.status(500).json({ message: "Failed to fetch pending providers." });
  }
});

// GET /api/admin/providers (Get all providers)
router.get("/providers", async (_req, res) => {
  try {
    const providers = await Provider.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const result = providers.map((provider) => providerToFrontend(provider, provider.userId));
    res.json(result);
  } catch (error) {
    console.error("All providers error:", error);
    res.status(500).json({ message: "Failed to fetch providers." });
  }
});

// PATCH /api/admin/providers/:id/approve (Approve provider)
router.patch("/providers/:id/approve", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Invalid provider id." });
    }

    await Provider.findByIdAndUpdate(
      req.params.id,
      { approved: true, reviewStatus: "approved" },
      { new: true }
    );

    res.json({ message: "Provider approved successfully." });
  } catch (error) {
    console.error("Approve provider error:", error);
    res.status(500).json({ message: "Failed to approve provider." });
  }
});

// PATCH /api/admin/providers/:id/reject (Reject provider)
router.patch("/providers/:id/reject", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Invalid provider id." });
    }

    await Provider.findByIdAndUpdate(
      req.params.id,
      { approved: false, reviewStatus: "rejected" },
      { new: true }
    );

    res.json({ message: "Provider rejected successfully." });
  } catch (error) {
    console.error("Reject provider error:", error);
    res.status(500).json({ message: "Failed to reject provider." });
  }
});

// DELETE /api/admin/providers/:id (Delete provider profile)
router.delete("/providers/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Invalid provider id." });
    }

    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }

    // Delete all bookings for this provider
    await Booking.deleteMany({ providerId: req.params.id });

    // Delete provider profile
    await Provider.findByIdAndDelete(req.params.id);

    // Change user role back to user
    await User.findByIdAndUpdate(provider.userId, { role: "user" });

    res.json({ message: "Provider profile deleted permanently." });
  } catch (error) {
    console.error("Delete provider error:", error);
    res.status(500).json({ message: "Failed to delete provider profile." });
  }
});

module.exports = router;
