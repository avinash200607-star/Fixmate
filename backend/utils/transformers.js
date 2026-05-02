// Shared data transformation utilities

/**
 * Convert provider document to frontend format
 * @param {Object} provider - Provider document from database
 * @param {Object} user - Associated user document
 * @param {Object} req - Express request object (for building image URLs)
 * @returns {Object} Formatted provider object for frontend
 */
const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;

  const protocol = req.protocol || "http";
  const host = req.get("host") || req.hostname;
  return `${protocol}://${host}${imagePath}`;
};

const providerToFrontend = (provider, user, req) => ({
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
  profile_image: buildImageUrl(req, provider.profileImage),
  portfolio_images: JSON.stringify(
    (provider.portfolioImages || []).map((img) => buildImageUrl(req, img))
  ),
});

module.exports = { providerToFrontend, buildImageUrl };
