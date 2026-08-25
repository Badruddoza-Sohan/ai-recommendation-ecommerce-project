import nodemailer from "nodemailer";
import "dotenv/config";

// Create a Gmail SMTP transporter using App Password
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE !== "false", // true for port 465
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

export async function sendOtpEmail(to: string, otp: string, userName?: string): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || `MarketVerse AI <${process.env.SMTP_USER}>`;
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 32px 24px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:12px 16px;margin-bottom:16px;">
                <span style="font-size:28px;">🛒</span>
              </div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">MarketVerse AI</h1>
              <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Your trusted multi-vendor marketplace</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 8px;font-weight:700;">Password Reset OTP</h2>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Hi ${userName || "there"}, we received a request to reset your MarketVerse password. Use the code below to proceed.
              </p>

              <!-- OTP Box -->
              <div style="background:#0f172a;border:2px dashed #4f46e5;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Your Verification Code</p>
                <div style="letter-spacing:12px;font-size:38px;font-weight:900;color:#818cf8;font-family:'Courier New',monospace;">${otp}</div>
                <p style="color:#64748b;font-size:12px;margin:12px 0 0;">⏱ Valid for <strong style="color:#94a3b8;">10 minutes</strong> only</p>
              </div>

              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 16px;">
                If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <div style="border-top:1px solid #334155;padding-top:20px;margin-top:8px;">
                <p style="color:#475569;font-size:12px;margin:0;text-align:center;">
                  This email was sent from <strong style="color:#64748b;">MarketVerse AI</strong> — Do not reply to this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:16px 32px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#334155;font-size:11px;margin:0;">© 2025 MarketVerse AI. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `🔐 Your MarketVerse Password Reset OTP: ${otp}`,
      html,
      text: `Your MarketVerse password reset OTP is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
    });
    console.log(`[Mailer] OTP email sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`[Mailer] Failed to send OTP email to ${to}:`, error);
    return false;
  }
}
