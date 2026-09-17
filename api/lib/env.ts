import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  appId: optional("APP_ID", "local_app_id"),
  appUrl: optional("APP_URL", "http://localhost:5173"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  ownerUnionId: optional("OWNER_UNION_ID"),
  // CORS — comma-separated list of allowed origins, e.g. "https://mystore.com"
  corsOrigin: optional("CORS_ORIGIN", "*"),
  port: parseInt(optional("PORT", "3000")),
  // Google OAuth
  googleClientId: optional("GOOGLE_CLIENT_ID"),
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET"),
  // SMTP / Nodemailer
  smtpHost: optional("SMTP_HOST", "smtp.gmail.com"),
  smtpPort: parseInt(optional("SMTP_PORT", "465")),
  smtpSecure: optional("SMTP_SECURE", "true") !== "false",
  smtpUser: optional("SMTP_USER"),
  smtpPass: optional("SMTP_PASS"),
  smtpFrom: optional("SMTP_FROM"),
  // SSLCommerz
  sslcommerzStoreId: optional("SSLCOMMERZ_STORE_ID"),
  sslcommerzStorePassword: optional("SSLCOMMERZ_STORE_PASSWORD"),
  sslcommerzIsLive: optional("SSLCOMMERZ_IS_LIVE") === "true",
  kimiAuthUrl: optional("KIMI_AUTH_URL", "https://auth.kimi.com"),
  kimiOpenUrl: optional("KIMI_OPEN_URL", "https://open.kimi.com"),
};

