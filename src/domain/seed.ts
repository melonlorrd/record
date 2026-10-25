/**
 * Deterministic sample seed generator for Kosh.
 *
 * Go vs TypeScript note:
 * Uses a pure Mulberry32 pseudo-random number generator (PRNG) with a fixed seed.
 * Generating sample data is completely reproducible across runs and test environments.
 */

import { AppData, Category, Entry, PortfolioHolding } from './types';
import { getDefaultTimezone } from './dates';

class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Returns float [0, 1)
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Integer between min and max inclusive
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Pick random element from array
  pick<T>(items: readonly T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[idx]!;
  }
}

// Fixed UUIDs for categories so exports/imports/tests are consistent
export const SEED_CATEGORIES: Category[] = [
  {
    id: 'c1111111-1111-4111-8111-111111111111',
    name: 'Housing & Rent',
    color: '#0969da', // GitHub Blue
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    name: 'Groceries & Essentials',
    color: '#1a7f37', // GitHub Forest Green
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    name: 'Work Food & Chai',
    color: '#d29922', // GitHub Amber / Chai
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  },
  {
    id: 'c4444444-4444-4444-8444-444444444444',
    name: 'Dining & Outings',
    color: '#bf3989', // GitHub Plum
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  },
  {
    id: 'c5555555-5555-4555-8555-555555555555',
    name: 'Subscriptions & Bills',
    color: '#58a6ff', // GitHub Sky Blue
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  },
  {
    id: 'c6666666-6666-4666-8666-666666666666',
    name: 'Gadgets & Impulse',
    color: '#8250df', // GitHub Purple
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  },
  {
    id: 'c7777777-7777-4777-8777-777777777777',
    name: 'Income & Salary',
    color: '#2da44e', // GitHub Green
    archived: false,
    updatedAt: 1720000000000,
    deleted: false,
  },
];

export const SEED_HOLDINGS: PortfolioHolding[] = [
  {
    id: 'd1111111-1111-4111-8111-111111111111',
    assetClass: 'gold',
    name: 'Physical Gold 24K Minted Coins (999 Purity)',
    symbolOrFolio: 'PHYSICAL_GOLD_24K',
    sector: 'Physical Bullion / Commodities',
    units: 20,
    buyAvgPriceCents: 1208715,     // ₹12,087.15 / gram (Principal ₹2,41,743.00)
    currentNavOrPriceCents: 1527464, // ₹15,274.64 / gram (Current ₹3,05,492.80, +26.4%)
    notes: '20g 24K minted gold coins in vault (cost ₹2,41,743)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd2222222-2222-4222-8222-222222222222',
    assetClass: 'mutual_fund',
    name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    symbolOrFolio: 'PPFAS_FLEXI',
    sector: 'Flexi Cap Equity / Mutual Fund',
    units: 684.797,
    buyAvgPriceCents: 9053,        // ₹90.53 / unit (Principal ₹61,994.67)
    currentNavOrPriceCents: 8898,  // ₹88.98 / unit (Current ₹60,931.18, -1.7%)
    notes: 'Parag Parikh Flexi Cap Fund Direct Plan (AMFI: 122639)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd3333333-3333-4333-8333-333333333333',
    assetClass: 'equity',
    name: 'Hyundai Motor India Limited',
    symbolOrFolio: 'HYUNDAI.NS',
    sector: 'Automobiles & Passenger Vehicles',
    units: 7,
    buyAvgPriceCents: 182290,      // ₹1,822.90 (Principal ₹12,760.30)
    currentNavOrPriceCents: 207840,// ₹2,078.40 (Current ₹14,548.80, +14.0%)
    notes: 'NSE holding (Creta, Talegaon)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd4444444-4444-4444-8444-444444444444',
    assetClass: 'equity',
    name: 'Bharat Electronics Limited',
    symbolOrFolio: 'BEL.NS',
    sector: 'Defence Electronics & Strategic Avionics',
    units: 15,
    buyAvgPriceCents: 39800,       // ₹398.00 (Principal ₹5,970.00)
    currentNavOrPriceCents: 38635, // ₹386.35 (Current ₹5,795.25, -2.9%)
    notes: '15 shares @ ₹398.00 (NSE)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd5555555-5555-4555-8555-555555555555',
    assetClass: 'equity',
    name: 'Bharat Heavy Electricals Limited',
    symbolOrFolio: 'BHEL.NS',
    sector: 'Heavy Electrical Equipment & Capital Goods',
    units: 10,
    buyAvgPriceCents: 23435,       // ₹234.35 (Principal ₹2,343.50)
    currentNavOrPriceCents: 41560, // ₹415.60 (Current ₹4,156.00, +77.3%)
    notes: 'NSE holding (Thermal Power & Vande Bharat)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd6666666-6666-4666-8666-666666666666',
    assetClass: 'equity',
    name: 'National Aluminium Company Ltd',
    symbolOrFolio: 'NATIONALUM.BO',
    sector: 'Metals & Mining',
    units: 10,
    buyAvgPriceCents: 38000,       // ₹380.00 (Principal ₹3,800.00)
    currentNavOrPriceCents: 34535, // ₹345.35 (Current ₹3,453.50, -9.1%)
    notes: 'BSE holding (Damanjodi, Utkal D)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd7777777-7777-4777-8777-777777777777',
    assetClass: 'equity',
    name: 'NTPC Limited',
    symbolOrFolio: 'NTPC.BO',
    sector: 'Power Generation & Clean Energy',
    units: 10,
    buyAvgPriceCents: 38939,       // ₹389.39 (Principal ₹3,893.90)
    currentNavOrPriceCents: 32115, // ₹321.15 (Current ₹3,211.50, -17.5%)
    notes: 'BSE holding (NTPC Green Energy / Renewables)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd8888888-8888-4888-8888-888888888888',
    assetClass: 'equity',
    name: 'Tata Power Company Limited',
    symbolOrFolio: 'TATAPOWER.BO',
    sector: 'Utilities, Renewables & EV Infrastructure',
    units: 5,
    buyAvgPriceCents: 44119,       // ₹441.19 (Principal ₹2,205.95)
    currentNavOrPriceCents: 35845, // ₹358.45 (Current ₹1,792.25, -18.8%)
    notes: 'BSE holding (TPREL, Rooftop Solar, EV Charging)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'd9999999-9999-4999-8999-999999999999',
    assetClass: 'equity',
    name: 'Infosys Limited',
    symbolOrFolio: 'INFY.NS',
    sector: 'Information Technology & Enterprise AI',
    units: 1,
    buyAvgPriceCents: 194400,      // ₹1,944.00 (Principal ₹1,944.00)
    currentNavOrPriceCents: 102100,// ₹1,021.00 (Current ₹1,021.00, -47.5%)
    notes: 'NSE holding (Topaz, Finacle)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
  {
    id: 'daaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    assetClass: 'equity',
    name: 'Tejas Networks Limited',
    symbolOrFolio: 'TEJASNET.BO',
    sector: 'Telecommunication Equipment & Optical Networking',
    units: 1,
    buyAvgPriceCents: 119410,      // ₹1,194.10 (Principal ₹1,194.10)
    currentNavOrPriceCents: 49430, // ₹494.30 (Current ₹494.30, -58.6%)
    notes: 'BSE holding (BSNL 4G, Tata Sons)',
    createdAt: 1720000000000,
    updatedAt: 1727827200000,
    deleted: false,
  },
];

export function generateSampleData(
  nowMs: number = Date.now(),
  tz: string = getDefaultTimezone(),
  seed: number = 42
): AppData {
  const rng = new SeededRNG(seed);
  const entries: Entry[] = [];

  const rentCat = SEED_CATEGORIES[0]!;
  const groceryCat = SEED_CATEGORIES[1]!;
  const workFoodCat = SEED_CATEGORIES[2]!;
  const diningCat = SEED_CATEGORIES[3]!;
  const billsCat = SEED_CATEGORIES[4]!;
  const gadgetCat = SEED_CATEGORIES[5]!;
  const incomeCat = SEED_CATEGORIES[6]!;

  const daysBack = 120; // ~4 full months
  const now = new Date(nowMs);

  let idCounter = 1;
  const nextId = (): string => {
    const hex = (idCounter++).toString(16).padStart(12, '0');
    return `e0000000-0000-4000-8000-${hex}`;
  };

  for (let dayOffset = daysBack; dayOffset >= 0; dayOffset--) {
    const curDate = new Date(now);
    curDate.setDate(now.getDate() - dayOffset);
    const dayOfWeek = curDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayOfMonth = curDate.getDate();

    // 1. Monthly Salary (1st of month)
    if (dayOfMonth === 1) {
      curDate.setHours(9, 30, 0, 0);
      entries.push({
        id: nextId(),
        kind: 'income',
        amountCents: 12500000, // ₹1,25,000.00
        categoryId: incomeCat.id,
        occurredAt: curDate.getTime(),
        tz,
        tags: ['salary', 'primary-income'],
        note: 'Monthly Salary Credit',
        createdAt: curDate.getTime(),
        updatedAt: curDate.getTime(),
        deviceId: 'seed-device',
        deleted: false,
      });
    }

    // 2. Monthly Rent (2nd of month)
    if (dayOfMonth === 2) {
      curDate.setHours(10, 15, 0, 0);
      entries.push({
        id: nextId(),
        kind: 'expense',
        amountCents: 2800000, // ₹28,000.00
        categoryId: rentCat.id,
        occurredAt: curDate.getTime(),
        tz,
        intent: 'need',
        tags: ['rent', 'fixed-cost'],
        note: 'Apartment Rent Transfer',
        createdAt: curDate.getTime(),
        updatedAt: curDate.getTime(),
        deviceId: 'seed-device',
        deleted: false,
      });
    }

    // 3. Monthly Subscriptions & Utilities
    if (dayOfMonth === 5) {
      curDate.setHours(14, 0, 0, 0);
      entries.push({
        id: nextId(),
        kind: 'expense',
        amountCents: 64900, // ₹649.00
        categoryId: billsCat.id,
        occurredAt: curDate.getTime(),
        tz,
        intent: 'want',
        tags: ['subscription', 'entertainment'],
        note: 'Netflix 4K Plan',
        createdAt: curDate.getTime(),
        updatedAt: curDate.getTime(),
        deviceId: 'seed-device',
        deleted: false,
      });
    }

    if (dayOfMonth === 12) {
      curDate.setHours(12, 0, 0, 0);
      entries.push({
        id: nextId(),
        kind: 'expense',
        amountCents: 119900, // ₹1,199.00
        categoryId: billsCat.id,
        occurredAt: curDate.getTime(),
        tz,
        intent: 'need',
        tags: ['utility', 'internet'],
        note: 'Fiber Broadband Bill',
        createdAt: curDate.getTime(),
        updatedAt: curDate.getTime(),
        deviceId: 'seed-device',
        deleted: false,
      });
    }

    // 4. Occasional Freelance Consulting Income
    if (dayOfMonth === 18 && rng.next() > 0.4) {
      curDate.setHours(16, 45, 0, 0);
      entries.push({
        id: nextId(),
        kind: 'income',
        amountCents: rng.nextInt(2000000, 4500000), // ₹20,000 - ₹45,000
        categoryId: incomeCat.id,
        occurredAt: curDate.getTime(),
        tz,
        tags: ['freelance', 'client-work'],
        note: 'API Architecture Consulting Payout',
        createdAt: curDate.getTime(),
        updatedAt: curDate.getTime(),
        deviceId: 'seed-device',
        deleted: false,
      });
    }

    // 5. Workday Habits (Monday - Friday)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (isWeekday) {
      // 75% chance of morning chai/coffee & quick breakfast near office
      if (rng.next() < 0.75) {
        curDate.setHours(rng.nextInt(10, 11), rng.nextInt(10, 50), 0, 0);
        entries.push({
          id: nextId(),
          kind: 'expense',
          amountCents: rng.nextInt(4000, 12000), // ₹40 - ₹120 (Micro-purchase)
          categoryId: workFoodCat.id,
          occurredAt: curDate.getTime(),
          tz,
          intent: 'need',
          tags: ['tea', 'office'],
          note: rng.pick(['Irani chai & bun maska', 'Filter coffee & biscuit', 'Cutting chai break', 'Espresso']),
          createdAt: curDate.getTime(),
          updatedAt: curDate.getTime(),
          deviceId: 'seed-device',
          deleted: false,
        });
      }

      // 60% chance of afternoon snack / chai
      if (rng.next() < 0.60) {
        curDate.setHours(rng.nextInt(16, 17), rng.nextInt(15, 45), 0, 0);
        entries.push({
          id: nextId(),
          kind: 'expense',
          amountCents: rng.nextInt(5000, 18000), // ₹50 - ₹180 (Micro-purchase)
          categoryId: workFoodCat.id,
          occurredAt: curDate.getTime(),
          tz,
          intent: rng.pick(['need', 'want']),
          tags: ['snacks', 'work-break'],
          note: rng.pick(['Samosa & lemon soda', 'Puffs & cold brew', 'Office canteen snack', 'Fruit juice']),
          createdAt: curDate.getTime(),
          updatedAt: curDate.getTime(),
          deviceId: 'seed-device',
          deleted: false,
        });
      }

      // 30% chance of cafeteria / team lunch
      if (rng.next() < 0.30) {
        curDate.setHours(13, rng.nextInt(5, 40), 0, 0);
        entries.push({
          id: nextId(),
          kind: 'expense',
          amountCents: rng.nextInt(22000, 48000), // ₹220 - ₹480
          categoryId: workFoodCat.id,
          occurredAt: curDate.getTime(),
          tz,
          intent: 'need',
          tags: ['lunch'],
          note: 'Team thali lunch',
          createdAt: curDate.getTime(),
          updatedAt: curDate.getTime(),
          deviceId: 'seed-device',
          deleted: false,
        });
      }
    }

    // 6. Weekly Groceries (Weekends or mid-week restock)
    if ((dayOfWeek === 6 || dayOfWeek === 0) && rng.next() < 0.55) {
      curDate.setHours(rng.nextInt(10, 13), rng.nextInt(10, 50), 0, 0);
      entries.push({
        id: nextId(),
        kind: 'expense',
        amountCents: rng.nextInt(160000, 390000), // ₹1,600 - ₹3,900
        categoryId: groceryCat.id,
        occurredAt: curDate.getTime(),
        tz,
        intent: 'need',
        tags: ['groceries', 'supermarket'],
        note: rng.pick(['Weekly vegetable & dairy basket', 'Supermarket grocery haul', 'Fresh produce & pulses']),
        createdAt: curDate.getTime(),
        updatedAt: curDate.getTime(),
        deviceId: 'seed-device',
        deleted: false,
      });
    }

    // 7. Weekend Outings, Dining, and Socializing (Friday night, Saturday, Sunday)
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      if (rng.next() < 0.65) {
        curDate.setHours(rng.nextInt(19, 22), rng.nextInt(10, 50), 0, 0);
        const isImpulse = rng.next() < 0.35;
        entries.push({
          id: nextId(),
          kind: 'expense',
          amountCents: rng.nextInt(110000, 380000), // ₹1,100 - ₹3,800
          categoryId: diningCat.id,
          occurredAt: curDate.getTime(),
          tz,
          intent: isImpulse ? 'impulse' : 'want',
          tags: ['dining', 'weekend'],
          note: rng.pick(['Craft brewery dinner with friends', 'Woodfired pizza & dessert', 'Sushi date night', 'Biryani house outing']),
          createdAt: curDate.getTime(),
          updatedAt: curDate.getTime(),
          deviceId: 'seed-device',
          deleted: false,
        });
      }
    }

    // 8. Occasional Gadget / Gear Impulse Purchases (1-2 times per month)
    if (dayOfMonth === 14 || dayOfMonth === 26) {
      if (rng.next() < 0.40) {
        curDate.setHours(rng.nextInt(21, 23), rng.nextInt(10, 55), 0, 0);
        entries.push({
          id: nextId(),
          kind: 'expense',
          amountCents: rng.nextInt(250000, 890000), // ₹2,500 - ₹8,900
          categoryId: gadgetCat.id,
          occurredAt: curDate.getTime(),
          tz,
          intent: 'impulse',
          tags: ['gadgets', 'online-shopping'],
          note: rng.pick(['Mechanical keyboard switches & keycaps', 'Wireless noise-cancelling earbuds', 'Desk light bar', 'Smart home smart plug set']),
          createdAt: curDate.getTime(),
          updatedAt: curDate.getTime(),
          deviceId: 'seed-device',
          deleted: false,
        });
      }
    }
  }

  // Sort chronologically ascending
  entries.sort((a, b) => a.occurredAt - b.occurredAt);

  return {
    version: 1,
    entries,
    categories: [...SEED_CATEGORIES],
    holdings: [...SEED_HOLDINGS],
    lastModified: nowMs,
  };
}
