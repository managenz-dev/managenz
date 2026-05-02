// backend/src/controllers/feedback.controller.js
const prisma = require("../utils/prisma");

// ── Helper: Calculate Grade Pattern based on scores ────────────────────────
function calculatePattern(scores) {
  if (!scores || scores.length === 0) return "MIXED";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Simple logic: A=80+, B=60-79, C=<60
  if (avg >= 80) return "MOSTLY_A";
  if (avg >= 60) return "MOSTLY_B";
  return "MOSTLY_C";
}

// ── GET: Fetch Act Feedback for Player ───────────────────────────────────────
exports.getActFeedback = async (req, res, next) => {
  try {
    const { simulationId, actNumber } = req.params;
    const { scores } = req.body;

    // 1. Calculate Pattern
    const pattern = calculatePattern(scores);

    // 2. Get Narrative
    const narrative = await prisma.actNarrative.findUnique({
      where: {
        simulationId_actNumber_gradePattern: {
          simulationId,
          actNumber: parseInt(actNumber),
          gradePattern: pattern,
        },
      },
      select: { message: true },
    });

    // 3. Get Variable Insight
    const variableInsights = await prisma.variableInsight.findMany({
      where: { simulationId },
      select: { variableName: true, insightText: true },
    });

    // 4. Get Dimension Grades
    const gradeBands = await prisma.gradeBandDescription.findMany({
      where: { simulationId },
    });

    return res.json({
      success: true,
      data: {
        pattern,
        narrative: narrative?.message || "Great effort so far. Keep analyzing the data.",
        insights: variableInsights,
        grades: gradeBands,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST: Save Intern Content ───────────────────────────────────────────────
exports.saveActFeedback = async (req, res, next) => {
  try {
    const { simulationId, actNumber, gradePattern, message } = req.body;

    await prisma.actNarrative.upsert({
      where: {
        simulationId_actNumber_gradePattern: {
          simulationId,
          actNumber: parseInt(actNumber),
          gradePattern,
        },
      },
      update: { message },
      create: {
        simulationId,
        actNumber: parseInt(actNumber),
        gradePattern,
        message,
      },
    });

    return res.json({ success: true, message: "Narrative saved successfully" });
  } catch (error) {
    next(error);
  }
};