// backend/src/controllers/userOnboarding.controller.js
const prisma = require("../utils/prisma");

// ── POST /api/onboarding/set-user-type ──────────────────────────────────────
exports.setUserType = async (req, res) => {
  try {
    const { userType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const validTypes = ["STUDENT_EXPLORER", "PLACEMENT_PREP", "JUNIOR_PROFESSIONAL"];
    if (!userType || !validTypes.includes(userType)) {
      return res.status(400).json({ success: false, message: "Invalid user type" });
    }

    // ✅ FIXED: Use separate data variable to avoid parser confusion
    const updateData = { userType };
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({ success: true, message: "User type set successfully" });
  } catch (err) {
    console.error("setUserType error:", err);
    res.status(500).json({ success: false, message: "Failed to update user type" });
  }
};

// ── POST /api/onboarding/select-domains ─────────────────────────────────────
exports.selectDomains = async (req, res) => {
  try {
    const { primaryDomainId, supportingDomainIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!primaryDomainId) {
      return res.status(400).json({ success: false, message: "Primary domain is required" });
    }

    // Validate domain IDs exist
    const domains = await prisma.domain.findMany({
      where: { id: { in: [primaryDomainId, ...(supportingDomainIds || [])] } },
      select: { id: true },
    });
    const validIds = new Set(domains.map(d => d.id));
    
    if (!validIds.has(primaryDomainId)) {
      return res.status(400).json({ success: false, message: "Invalid primary domain" });
    }

    // ✅ FIXED: Use separate data variable to avoid parser confusion
    const updateData = { selectedDomainId: primaryDomainId };
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({ success: true, message: "Domains selected successfully" });
  } catch (err) {
    console.error("selectDomains error:", err);
    res.status(500).json({ success: false, message: "Failed to save domain preferences" });
  }
};