/**
 * Dynamic Currency Configuration & Indian Rupee (INR) Formatter
 * Supports dynamic database-driven settings with localized en-IN formatting.
 */

export const DEFAULT_CURRENCY_CONFIG = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
} as const;

export interface FormatCurrencyOptions {
  includeSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Formats numeric values to Indian Rupee standard format (e.g. ₹1,200.00, ₹1,50,000.00)
 */
export function formatCurrency(
  val: number | string | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  const {
    includeSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (val === null || val === undefined) {
    return includeSymbol ? `${DEFAULT_CURRENCY_CONFIG.symbol}0.00` : '0.00';
  }

  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num)) {
    return includeSymbol ? `${DEFAULT_CURRENCY_CONFIG.symbol}0.00` : '0.00';
  }

  try {
    const formatted = new Intl.NumberFormat(DEFAULT_CURRENCY_CONFIG.locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(num);

    return includeSymbol ? `${DEFAULT_CURRENCY_CONFIG.symbol}${formatted}` : formatted;
  } catch {
    const fallback = num.toFixed(minimumFractionDigits);
    return includeSymbol ? `${DEFAULT_CURRENCY_CONFIG.symbol}${fallback}` : fallback;
  }
}

/**
 * Server-side helper to dynamically fetch active system settings from the database
 */
export async function getSystemCurrencyConfig() {
  try {
    const { prisma } = await import('@/lib/prisma');
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['CURRENCY_CODE', 'CURRENCY_SYMBOL', 'CURRENCY_LOCALE'] },
      },
    });

    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });

    return {
      code: configMap['CURRENCY_CODE'] || DEFAULT_CURRENCY_CONFIG.code,
      symbol: configMap['CURRENCY_SYMBOL'] || DEFAULT_CURRENCY_CONFIG.symbol,
      locale: configMap['CURRENCY_LOCALE'] || DEFAULT_CURRENCY_CONFIG.locale,
    };
  } catch (err) {
    // Graceful fallback to INR defaults
    return DEFAULT_CURRENCY_CONFIG;
  }
}
