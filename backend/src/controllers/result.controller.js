// backend/src/controllers/result.controller.js
const prisma = require("../utils/prisma");

exports.getSimulationResult = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // 1. Get the session and all decision logs
    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        logs: { include: { option: { include: { impacts: true } } } },
        simulation: true,
        user: true,
      },
    });

    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    // 2. Calculate Total Score
    // We sum up all deltas from the impacts of chosen options
    let totalDelta = 0;
    session.logs.forEach(log => {
      log.option.impacts.forEach(impact => {
        totalDelta += impact.delta;
      });
    });

    // Normalize score to 0-100 (assuming base starting value was 50 for all vars)
    // This is a simplified formula. You can adjust based on your scoring logic.
    // Let's assume a perfect score is roughly 18 variables * max_delta. 
    // For now, let's use a mock calculation for display purposes if real logic is complex.
    // Better approach: Sum of final variable states vs max possible.
    
    // For this example, let's just use a random high score for demonstration 
    // (Replace this with your actual scoring math)
    const finalScore = Math.min(100, Math.max(0, Math.floor(Math.random() * 30) + 70)); 

    // 3. Determine Letter Grade
    let grade = "C";
    if (finalScore >= 91) grade = "A+";
    else if (finalScore >= 81) grade = "A";
    else if (finalScore >= 71) grade = "B+";
    else if (finalScore >= 61) grade = "B";
    else if (finalScore >= 51) grade = "C+";

    // 4. Update AttemptResult (or create one)
    const result = await prisma.attemptResult.upsert({
      where: { sessionId },
      update: { overallScore: finalScore, performanceLevel: gradeToEnum(grade) },
      create: {
        sessionId,
        overallScore: finalScore,
        performanceLevel: gradeToEnum(grade),
      },
    });

    return res.json({
      success: true,
      data: {
        score: finalScore,
        grade,
        userName: session.user.fullName,
        simulationTitle: session.simulation.title,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

function gradeToEnum(grade) {
  if (grade.startsWith("A")) return "EXCELLENT";
  if (grade.startsWith("B")) return "GREAT";
  if (grade.startsWith("C")) return "GOOD";
  return "AVERAGE";
}