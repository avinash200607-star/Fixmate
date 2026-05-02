const { body, validationResult } = require("express-validator");

/**
 * Sanitization middleware for common input fields
 */

const validateEmail = body("email")
  .trim()
  .toLowerCase()
  .isEmail()
  .withMessage("Please provide a valid email address")
  .normalizeEmail();

const validatePassword = body("password")
  .trim()
  .isLength({ min: 6 })
  .withMessage("Password must be at least 6 characters long")
  .matches(/[A-Za-z]/)
  .withMessage("Password must contain at least one letter")
  .matches(/[0-9]/)
  .withMessage("Password must contain at least one number");

const validateName = body("name")
  .trim()
  .isLength({ min: 2 })
  .withMessage("Name must be at least 2 characters long")
  .isLength({ max: 100 })
  .withMessage("Name must not exceed 100 characters")
  .escape();

const validatePhone = body("phoneNumber", "phone_number")
  .optional()
  .matches(/^\d{10}$/)
  .withMessage("Phone number must be exactly 10 digits");

const sanitizeDescription = body("description", "problemDescription", "problem_description")
  .optional()
  .trim()
  .isLength({ max: 1000 })
  .withMessage("Description must not exceed 1000 characters")
  .escape();

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: "Validation failed", 
      errors: errors.array() 
    });
  }
  next();
};

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  sanitizeDescription,
  handleValidationErrors,
};
