/**
 * SSLCommerz Gateway Helper (Sandbox Mode)
 * Default credentials use official test store: testbox / qwerty
 */

export interface SSLCommerzInitParams {
  storeId?: string;
  storePasswd?: string;
  totalAmount: number;
  currency?: string;
  tranId: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl?: string;
  cusName: string;
  cusEmail: string;
  cusAdd1: string;
  cusCity: string;
  cusPostcode: string;
  cusCountry?: string;
  cusPhone: string;
  productName: string;
  productCategory?: string;
}

export interface SSLCommerzInitResponse {
  status: string; // "SUCCESS" | "FAILED"
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  redirectGatewayURL?: string;
  storeBanner?: string;
  storeLogo?: string;
  desc?: string[];
}

export interface SSLCommerzValidateResponse {
  status: string; // "VALID" | "FAILED" | "INVALID_TRANSACTION"
  tran_date?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  store_amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  card_no?: string;
  card_issuer?: string;
  card_brand?: string;
  card_issuer_country?: string;
  currency_amount?: string;
  verify_sign?: string;
  verify_key?: string;
}

const SSLCOMMERZ_SANDBOX_BASE = "https://sandbox.sslcommerz.com";
const SSLCOMMERZ_LIVE_BASE = "https://securepay.sslcommerz.com";
const PLACEHOLDER_VALUES = new Set([
  "testbox",
  "qwerty",
  "your_merchant_store_id",
  "your_merchant_password",
  "merchant",
  "demo",
  "password",
  "",
]);

function getSSLCommerzCredentials() {
  const configuredStoreId = (process.env.SSLCOMMERZ_STORE_ID || "").trim();
  const configuredStorePassword = (process.env.SSLCOMMERZ_STORE_PASSWORD || "").trim();
  const hasValidMerchantCredentials =
    !!configuredStoreId &&
    !!configuredStorePassword &&
    !PLACEHOLDER_VALUES.has(configuredStoreId.toLowerCase()) &&
    !PLACEHOLDER_VALUES.has(configuredStorePassword.toLowerCase());

  const isLive = hasValidMerchantCredentials && process.env.SSLCOMMERZ_IS_LIVE === "true";

  return {
    isLive,
    storeId: hasValidMerchantCredentials ? configuredStoreId : "testbox",
    storePasswd: hasValidMerchantCredentials ? configuredStorePassword : "qwerty",
    hasValidMerchantCredentials,
  };
}

export async function initiateSSLCommerzPayment(
  params: SSLCommerzInitParams
): Promise<SSLCommerzInitResponse> {
  const { storeId, storePasswd, isLive, hasValidMerchantCredentials } = getSSLCommerzCredentials();
  const effectiveStoreId = params.storeId || storeId;
  const effectiveStorePasswd = params.storePasswd || storePasswd;

  if (!hasValidMerchantCredentials) {
    console.warn(
      "[SSLCommerz] No valid merchant credentials configured. Falling back to sandbox test credentials. Set SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD and enable live mode only in production."
    );
  }

  const baseUrl = isLive ? SSLCOMMERZ_LIVE_BASE : SSLCOMMERZ_SANDBOX_BASE;
  const endpoint = `${baseUrl}/gwprocess/v4/api.php`;

  const formData = new URLSearchParams();
  formData.append("store_id", effectiveStoreId);
  formData.append("store_passwd", effectiveStorePasswd);
  formData.append("total_amount", params.totalAmount.toFixed(2));
  formData.append("currency", params.currency || "BDT");
  formData.append("tran_id", params.tranId);
  formData.append("success_url", params.successUrl);
  formData.append("fail_url", params.failUrl);
  formData.append("cancel_url", params.cancelUrl);
  if (params.ipnUrl) formData.append("ipn_url", params.ipnUrl);

  // Customer Details
  formData.append("cus_name", params.cusName || "Customer");
  formData.append("cus_email", params.cusEmail || "customer@example.com");
  formData.append("cus_add1", params.cusAdd1 || "Dhaka");
  formData.append("cus_city", params.cusCity || "Dhaka");
  formData.append("cus_postcode", params.cusPostcode || "1200");
  formData.append("cus_country", params.cusCountry || "Bangladesh");
  formData.append("cus_phone", params.cusPhone || "01700000000");

  // Shipping & Product Profile
  formData.append("shipping_method", "NO");
  formData.append("product_name", params.productName || "E-Commerce Purchase");
  formData.append("product_category", params.productCategory || "General");
  formData.append("product_profile", "general");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = (await response.json()) as SSLCommerzInitResponse;
    return data;
  } catch (error) {
    console.error("SSLCommerz Payment Initiation Error:", error);
    return {
      status: "FAILED",
      failedreason: error instanceof Error ? error.message : "Network error initiating payment",
    };
  }
}

export async function validateSSLCommerzPayment(
  valId: string
): Promise<SSLCommerzValidateResponse> {
  const { storeId, storePasswd, isLive } = getSSLCommerzCredentials();

  const baseUrl = isLive ? SSLCOMMERZ_LIVE_BASE : SSLCOMMERZ_SANDBOX_BASE;
  const endpoint = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
    valId
  )}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(
    storePasswd
  )}&format=json`;

  try {
    const response = await fetch(endpoint);
    const data = (await response.json()) as SSLCommerzValidateResponse;
    return data;
  } catch (error) {
    console.error("SSLCommerz Validation Error:", error);
    return {
      status: "FAILED",
    };
  }
}
