// ManaGenz — Email Utility (via Resend)
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "noreply@managenz.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ── Verification Email ────────────────────
exports.sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${FRONTEND_URL}/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your ManaGenz account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #6366f1; margin-bottom: 8px;">ManaGenz</h1>
        <p style="color: #888; margin-bottom: 32px;">Train Like a Real Manager</p>
        
        <h2 style="margin-bottom: 16px;">Welcome, ${name}! 👋</h2>
        <p style="color: #ccc; line-height: 1.6;">
          You're one step away from training like a real manager. 
          Click the button below to verify your email and unlock your simulations.
        </p>
        
        <a href="${verifyUrl}" 
           style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 24px 0;">
          Verify Email Address
        </a>
        
        <p style="color: #666; font-size: 14px;">
          This link expires in 24 hours. If you didn't create a ManaGenz account, you can safely ignore this email.
        </p>
        
        <hr style="border-color: #333; margin: 32px 0;" />
        <p style="color: #555; font-size: 12px;">ManaGenz — Simulation-based managerial decision training</p>
      </div>
    `,
  });
};

// ── Password Reset Email ──────────────────
exports.sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${FRONTEND_URL}/auth/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your ManaGenz password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #6366f1; margin-bottom: 8px;">ManaGenz</h1>
        
        <h2 style="margin-bottom: 16px;">Reset your password</h2>
        <p style="color: #ccc; line-height: 1.6;">
          Hi ${name}, we received a request to reset your password. 
          Click the button below to create a new one.
        </p>
        
        <a href="${resetUrl}" 
           style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 24px 0;">
          Reset Password
        </a>
        
        <p style="color: #666; font-size: 14px;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        
        <hr style="border-color: #333; margin: 32px 0;" />
        <p style="color: #555; font-size: 12px;">ManaGenz — Simulation-based managerial decision training</p>
      </div>
    `,
  });
};

// ── Payment Receipt Email ─────────────────
exports.sendPaymentReceiptEmail = async (email, name, plan, amount) => {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Payment confirmed — ManaGenz Premium",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #6366f1; margin-bottom: 8px;">ManaGenz</h1>
        
        <h2 style="margin-bottom: 16px;">🎉 Premium Unlocked!</h2>
        <p style="color: #ccc; line-height: 1.6;">
          Hi ${name}, your payment was successful. Welcome to ManaGenz Premium!
        </p>
        
        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 4px 0; color: #888;">Plan: <strong style="color: #fff;">${plan}</strong></p>
          <p style="margin: 4px 0; color: #888;">Amount: <strong style="color: #fff;">₹${amount}</strong></p>
        </div>
        
        <a href="${FRONTEND_URL}/dashboard" 
           style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Start Simulating
        </a>
        
        <hr style="border-color: #333; margin: 32px 0;" />
        <p style="color: #555; font-size: 12px;">ManaGenz — Simulation-based managerial decision training</p>
      </div>
    `,
  });
};