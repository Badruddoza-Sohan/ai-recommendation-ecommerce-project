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

type InvoiceItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export async function sendOrderInvoiceEmail(input: {
  to: string;
  customerName: string;
  orderNumber: string;
  orderDate: number;
  items: InvoiceItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentStatus: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry: string;
  shippingPostalCode: string;
  paymentMethod: string;
  invoiceUrl: string;
}): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || `MarketVerse AI <${process.env.SMTP_USER}>`;
  const transporter = createTransporter();
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] || character));
  const money = (value: number) => `BDT ${value.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
  const paymentStatus = input.paymentStatus.replace(/(^|\s)\S/g, (character) => character.toUpperCase());
  const paymentMethod = input.paymentMethod.replace(/(^|[_\s-])\S/g, (character) => character.toUpperCase());
  const itemRows = input.items.map((item) => `
    <tr>
      <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b;line-height:1.5;">${escapeHtml(item.name)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569;">${item.quantity}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569;white-space:nowrap;">${money(item.unitPrice)}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;font-weight:700;white-space:nowrap;">${money(item.unitPrice * item.quantity)}</td>
    </tr>`).join("");
  const shippingLines = [input.customerName, input.shippingAddress, input.shippingCity, input.shippingCountry, input.shippingPostalCode]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br />");
  const customerName = escapeHtml(input.customerName || "there");
  const orderNumber = escapeHtml(input.orderNumber);
  const orderDate = escapeHtml(new Date(input.orderDate).toLocaleString("en-BD"));

  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>MarketVerse Invoice ${orderNumber}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:700px;background:#ffffff;border:1px solid #dbe3ef;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:30px 34px;background:#312e81;color:#ffffff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td><h1 style="margin:0;font-size:25px;line-height:1.25;font-weight:800;">MarketVerse AI</h1><p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;line-height:1.5;">Order Confirmation / Invoice</p></td>
            <td align="right"><a href="${escapeHtml(input.invoiceUrl)}" style="display:inline-block;padding:11px 15px;background:#ffffff;color:#312e81;text-decoration:none;border-radius:7px;font-size:13px;font-weight:700;">Print Invoice</a></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:34px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:0 0 10px;font-size:17px;line-height:1.6;">Hi ${customerName},</td></tr><tr><td style="padding:0 0 28px;color:#475569;font-size:14px;line-height:1.7;">Thank you for your order. Your payment and order details are below.</td></tr></table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dbe3ef;border-radius:10px;background:#f8fafc;margin-bottom:30px;"><tr>
            <td width="33.33%" style="padding:18px 16px;border-right:1px solid #dbe3ef;vertical-align:top;"><div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.5px;line-height:1.5;">Order ID</div><div style="padding-top:7px;font-size:14px;font-weight:700;line-height:1.5;">${orderNumber}</div></td>
            <td width="33.33%" style="padding:18px 16px;border-right:1px solid #dbe3ef;vertical-align:top;"><div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.5px;line-height:1.5;">Date</div><div style="padding-top:7px;font-size:14px;font-weight:700;line-height:1.5;">${orderDate}</div></td>
            <td width="33.33%" style="padding:18px 16px;vertical-align:top;"><div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.5px;line-height:1.5;">Payment Status</div><div style="padding-top:7px;font-size:14px;font-weight:700;line-height:1.5;color:#4338ca;">${escapeHtml(paymentStatus)}</div></td>
          </tr><tr><td colspan="3" style="padding:0 16px 18px;color:#475569;font-size:13px;line-height:1.5;"><strong style="color:#334155;">Payment Method:</strong> ${escapeHtml(paymentMethod)}</td></tr></table>

          <h2 style="margin:0 0 13px;font-size:17px;line-height:1.4;color:#1e293b;">Products</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dbe3ef;border-radius:10px;overflow:hidden;border-collapse:separate;border-spacing:0;font-size:13px;margin-bottom:30px;"><thead><tr style="background:#eef2ff;"><th align="left" style="padding:13px 12px;color:#3730a3;font-size:11px;text-transform:uppercase;letter-spacing:.4px;">Product</th><th align="center" style="padding:13px 12px;color:#3730a3;font-size:11px;text-transform:uppercase;letter-spacing:.4px;">Qty</th><th align="right" style="padding:13px 12px;color:#3730a3;font-size:11px;text-transform:uppercase;letter-spacing:.4px;">Unit Price</th><th align="right" style="padding:13px 12px;color:#3730a3;font-size:11px;text-transform:uppercase;letter-spacing:.4px;">Amount</th></tr></thead><tbody>${itemRows}</tbody></table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:30px;"><tr><td width="55%"></td><td width="45%"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;"><tr><td style="padding:6px 0;color:#64748b;">Subtotal</td><td align="right" style="padding:6px 0;color:#334155;">${money(input.subtotal)}</td></tr><tr><td style="padding:6px 0;color:#64748b;">Shipping</td><td align="right" style="padding:6px 0;color:#334155;">${money(input.shipping)}</td></tr><tr><td style="padding:6px 0;color:#64748b;">Discount</td><td align="right" style="padding:6px 0;color:#334155;">-${money(input.discount)}</td></tr><tr><td style="padding:14px 0 4px;border-top:2px solid #cbd5e1;font-size:17px;font-weight:800;color:#0f172a;">Total</td><td align="right" style="padding:14px 0 4px;border-top:2px solid #cbd5e1;font-size:17px;font-weight:800;color:#312e81;">${money(input.total)}</td></tr></table></td></tr></table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:32px;"><tr><td style="padding:20px 22px;"><h2 style="margin:0 0 12px;font-size:17px;line-height:1.4;color:#1e293b;">Shipping Address</h2><p style="margin:0;color:#475569;font-size:14px;line-height:1.8;">${shippingLines}</p></td></tr></table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center"><a href="${escapeHtml(input.invoiceUrl)}" style="display:inline-block;padding:13px 22px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">Open / Print Invoice</a></td></tr></table>
        </td></tr>
        <tr><td style="padding:22px 34px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">This is an automated invoice from MarketVerse AI.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: input.to,
      subject: `MarketVerse order confirmation #${input.orderNumber}`,
      html,
      text: `Your MarketVerse order ${input.orderNumber} is confirmed. Total: ${money(input.total)}. View or print your invoice: ${input.invoiceUrl}`,
    });
    console.log(`[Mailer] Invoice email sent to ${input.to} for ${input.orderNumber}`);
    return true;
  } catch (error) {
    console.error(`[Mailer] Failed to send invoice email for ${input.orderNumber}:`, error);
    return false;
  }
}
