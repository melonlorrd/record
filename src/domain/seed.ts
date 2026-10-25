/**
 * Deterministic sample seed generator for Kosh.
 *
 * Go vs TypeScript note:
 * Uses a pure Mulberry32 pseudo-random number generator (PRNG) with a fixed seed.
 * Generating sample data is completely reproducible across runs and test environments.
 */

import { AppData, Category, Entry } from './types';
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
    lastModified: nowMs,
  };
}
