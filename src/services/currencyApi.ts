/**
 * Currency Exchange Rate Service.
 *
 * Uses free, public, high-availability exchange rate APIs (no API key required).
 * Primary: open.er-api.com
 * Fallback: cdn.jsdelivr.net currency-api
 */

export interface ExchangeRateResult {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated?: string;
  provider: string;
}

/**
 * Fetches the live market exchange rate from `fromCurrency` to `toCurrency`.
 * Example: fetchLiveExchangeRate('INR', 'USD') => rate: 0.0118... (1 INR = 0.0118 USD)
 */
export async function fetchLiveExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRateResult> {
  const from = fromCurrency.toUpperCase().trim();
  const to = toCurrency.toUpperCase().trim();

  if (from === to) {
    return {
      fromCurrency: from,
      toCurrency: to,
      rate: 1,
      lastUpdated: new Date().toISOString(),
      provider: 'identity',
    };
  }

  // 1. Try Primary API: open.er-api.com
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.result === 'success' && data.rates && typeof data.rates[to] === 'number') {
        return {
          fromCurrency: from,
          toCurrency: to,
          rate: data.rates[to],
          lastUpdated: data.time_last_update_utc,
          provider: 'open.er-api.com',
        };
      }
    }
  } catch (err) {
    console.warn('Primary exchange rate API failed, falling back to backup API:', err);
  }

  // 2. Try Fallback API: jsdelivr currency-api
  try {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromLower}.json`,
      { headers: { Accept: 'application/json' } }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data[fromLower] && typeof data[fromLower][toLower] === 'number') {
        return {
          fromCurrency: from,
          toCurrency: to,
          rate: data[fromLower][toLower],
          lastUpdated: data.date,
          provider: 'jsdelivr.currency-api',
        };
      }
    }
  } catch (err) {
    console.warn('Backup exchange rate API failed:', err);
  }

  throw new Error(
    `Unable to retrieve live exchange rates for ${from} to ${to}. Please check your network connection and try again.`
  );
}
