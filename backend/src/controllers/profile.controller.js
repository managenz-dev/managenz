const prisma = require("../utils/prisma");
const bcrypt  = require("bcryptjs");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/profile
// Returns full profile of logged-in user
// ─────────────────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get stats
    const allSessions = await prisma.simulationSession.findMany({
      where:  { userId: user.id },
      select: { status: true },
    });

    const completedSessions = await prisma.simulationSession.findMany({
      where:   { userId: user.id, status: "COMPLETED", score: { isNot: null } },
      include: { score: true },
    });

    const scores   = completedSessions.map(s => s.score.overallScore);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;

    return res.json({
      success: true,
      data: {
        user: {
          id:             user.id,
          name:           user.name,
          username:       user.username   || null,
          email:          user.email,
          bio:            user.bio        || null,
          avatarUrl:      user.avatarUrl  || null,
          role:           user.role,
          emailVerified:  user.emailVerified,
          selectedDomain: user.selectedDomain || null,
          createdAt:      user.createdAt,
          subscription:   user.subscription
            ? { plan: user.subscription.plan, status: user.subscription.status }
            : null,
        },
        stats: {
          total:     allSessions.length,
          completed: completedSessions.length,
          avgScore,
          bestScore,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/check-username?username=xyz
// Checks if a username is available
// ─────────────────────────────────────────────────────────────────────────────
exports.checkUsername = async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username || username.trim().length < 3) {
      return res.json({ success: true, data: { available: false, message: "Username must be at least 3 characters" } });
    }

    const clean = username.trim().toLowerCase();

    // Validate format: letters, numbers, underscores, hyphens only
    if (!/^[a-z0-9_-]+$/.test(clean)) {
      return res.json({
        success: true,
        data: { available: false, message: "Only letters, numbers, _ and - are allowed" },
      });
    }

    // Check if taken by someone else
    const existing = await prisma.user.findFirst({
      where: {
        username: clean,
        NOT: { id: req.user.id },
      },
    });

    return res.json({
      success: true,
      data: {
        available: !existing,
        message:   existing ? "Username is already taken" : "Username is available",
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/profile
// Updates name, username, bio
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, username, bio } = req.body;

    const updates = {};

    // Name
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      updates.name = name.trim();
    }

    // Bio
    if (bio !== undefined) {
      updates.bio = bio.trim().slice(0, 200); // max 200 chars
    }

    // Username
    if (username !== undefined) {
      const clean = username.trim().toLowerCase();

      if (clean.length < 3) {
        return res.status(400).json({ success: false, message: "Username must be at least 3 characters" });
      }
      if (clean.length > 30) {
        return res.status(400).json({ success: false, message: "Username cannot exceed 30 characters" });
      }
      if (!/^[a-z0-9_-]+$/.test(clean)) {
        return res.status(400).json({ success: false, message: "Only letters, numbers, _ and - are allowed in username" });
      }

      // Check uniqueness
      const existing = await prisma.user.findFirst({
        where: { username: clean, NOT: { id: req.user.id } },
      });
      if (existing) {
        return res.status(409).json({ success: false, message: "Username is already taken" });
      }

      updates.username = clean;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data:  updates,
    });

    return res.json({
      success: true,
      data: {
        user: {
          id:       updatedUser.id,
          name:     updatedUser.name,
          username: updatedUser.username || null,
          bio:      updatedUser.bio      || null,
          email:    updatedUser.email,
        },
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/change-password
// Changes password after verifying current password
// ─────────────────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from current password" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data:  { passwordHash: hashedPassword },
    });

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};