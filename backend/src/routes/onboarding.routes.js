// backend/src/routes/onboarding.routes.js
const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const jwt = require("jsonwebtoken");

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-this", (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
}

// POST /api/onboarding/domains - Save user's domain selection
router.post("/domains", authenticateToken, async (req, res) => {
  try {
    const { primaryDomain, supportingDomains } = req.body;
    const userEmail = req.user.email;

    if (!primaryDomain) {
      return res.status(400).json({ success: false, message: "Primary domain is required" });
    }

    // Validate domain IDs
    const validDomains = ["product", "marketing", "sales", "finance", "operations", "hr", "strategy", "entrepreneurship"];
    if (!validDomains.includes(primaryDomain)) {
      return res.status(400).json({ success: false, message: "Invalid primary domain" });
    }

    if (supportingDomains) {
      for (const domain of supportingDomains) {
        if (!validDomains.includes(domain)) {
          return res.status(400).json({ success: false, message: `Invalid supporting domain: ${domain}` });
        }
        if (domain === primaryDomain) {
          return res.status(400).json({ success: false, message: "Supporting domain cannot be the same as primary" });
        }
      }
      if (supportingDomains.length > 2) {
        return res.status(400).json({ success: false, message: "Maximum 2 supporting domains allowed" });
      }
    }

    // Update user with domain selections
    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
       {
        userType: "student", // or "professional" based on your logic
        primaryDomain,
        supportingDomains: supportingDomains || [],
        onboardingCompleted: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        primaryDomain: true,
        supportingDomains: true,
        onboardingCompleted: true,
      },
    });

    res.json({
      success: true,
      message: "Domains saved successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error("Error saving domains:", err);
    res.status(500).json({ success: false, message: "Failed to save domains" });
  }
});

module.exports = router;