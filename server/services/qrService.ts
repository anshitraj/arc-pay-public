/**
 * QR Code Service
 * Generates QR codes for payment intents with deep link support
 */

// Use dynamic import for qrcode (it's available via dependencies)
let QRCode: any;
async function getQRCode() {
  if (!QRCode) {
    QRCode = (await import('qrcode')).default;
  }
  return QRCode;
}

export interface QRCodeOptions {
  paymentId: string;
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate QR code data URL for a payment intent
 * Deep link format: arcpay://pay?invoiceId=XYZ
 */
export async function generatePaymentQRCode(options: QRCodeOptions): Promise<string> {
  const { paymentId, size = 256, errorCorrectionLevel = 'M' } = options;
  const qrcode = await getQRCode();

  // Generate deep link
  const deepLink = `arcpay://pay?invoiceId=${paymentId}`;

  // Generate QR code as data URL
  const dataUrl = await qrcode.toDataURL(deepLink, {
    width: size,
    errorCorrectionLevel,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return dataUrl;
}

/**
 * Generate QR code for hosted checkout fallback
 * Format: https://pay.arcpaykit.com/checkout/{paymentId}
 */
export async function generateCheckoutQRCode(
  paymentId: string,
  baseUrl: string = 'https://pay.arcpaykit.com',
  size: number = 256
): Promise<string> {
  const qrcode = await getQRCode();
  const checkoutUrl = `${baseUrl}/checkout/${paymentId}`;

  const dataUrl = await qrcode.toDataURL(checkoutUrl, {
    width: size,
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return dataUrl;
}

/**
 * Generate both deep link and fallback QR codes
 */
export async function generatePaymentQRCodes(
  paymentId: string,
  baseUrl?: string
): Promise<{ deepLink: string; fallback: string }> {
  const [deepLink, fallback] = await Promise.all([
    generatePaymentQRCode({ paymentId }),
    generateCheckoutQRCode(paymentId, baseUrl),
  ]);

  return { deepLink, fallback };
}

