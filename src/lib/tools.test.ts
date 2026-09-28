import { describe, expect, it } from 'vitest';
import { addTurn, draw, formatClock, makeTeams, newBag, noiseLevel, rollDice, spinTo, stageClock, turnsOn, wheelIndex, type Bag } from './tools';

/** A repeatable pseudo-random sequence for tests. */
const seq = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('random picker', () => {
  it('picks everyone once before anyone twice', () => {
    const all = ['a', 'b', 'c', 'd', 'e'];
    let bag: Bag = newBag(all);
    const rng = seq(7);
    const round: string[] = [];
    for (let i = 0; i < all.length; i++) {
      const r = draw(bag, all, rng);
      round.push(r.item!);
      bag = r.bag;
    }
    expect([...round].sort()).toEqual(all);
    // Next round: the last person picked isn't picked first again.
    const next = draw(bag, all, rng);
    expect(next.item).not.toBe(round[round.length - 1]);
  });

  it('never repeats the same person twice in a row across many rounds', () => {
    const all = ['a', 'b', 'c'];
    let bag = newBag(all);
    const rng = seq(3);
    let prev: string | null = null;
    for (let i = 0; i < 60; i++) {
      const r = draw(bag, all, rng);
      expect(r.item).not.toBe(prev);
      prev = r.item;
      bag = r.bag;
    }
  });

  it('keeps up with students added or removed mid-round', () => {
    let bag = draw(newBag(['a', 'b', 'c']), ['a', 'b', 'c'], seq(2)).bag;
    const r = draw(bag, ['a', 'b', 'c', 'd'], seq(5));
    bag = r.bag;
    expect([...bag.left, ...bag.picked].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(draw(bag, [], seq()).item).toBeNull();
  });
});

describe('dice, clock and wheel', () => {
  it('rolls dice within range', () => {
    const rolls = rollDice(300, seq(9));
    expect(Math.min(...rolls)).toBe(1);
    expect(Math.max(...rolls)).toBe(6);
  });

  it('formats times', () => {
    expect([formatClock(75), formatClock(0), formatClock(600), formatClock(-30)]).toEqual(['1:15', '0:00', '10:00', '+0:30']);
  });

  it('finds the segment under the pointer, and spins to land on a chosen one', () => {
    expect(wheelIndex(0, 4)).toBe(0);
    expect(wheelIndex(-10 + 360, 4)).toBe(0);
    expect(wheelIndex(350, 4)).toBe(0);
    expect(wheelIndex(270, 4)).toBe(1); // turned 270° clockwise → segment 1 is at the top
    const rng = seq(4);
    let angle = 0;
    for (let target = 0; target < 6; target++) {
      const next = spinTo(angle, 6, target, rng);
      expect(next - angle).toBeGreaterThan(5 * 360 - 360);
      expect(wheelIndex(next, 6)).toBe(target);
      angle = next;
    }
  });
});

describe('lesson stages timer', () => {
  it('counts down the current stage and the whole lesson', () => {
    const minutes = [5, 25, 10];
    expect(stageClock(minutes, 0, 0)).toEqual({ index: 0, remaining: 300, lessonRemaining: 2400 });
    expect(stageClock(minutes, 1, 60)).toEqual({ index: 1, remaining: 1440, lessonRemaining: 2040 });
    expect(stageClock(minutes, 2, 660)).toMatchObject({ remaining: -60, lessonRemaining: -60 });
  });
});

describe('turns from the picker', () => {
  it('counts turns per day and starts again the next day', () => {
    let turns = addTurn(undefined, 'a', '2026-09-28');
    turns = addTurn(turns, 'a', '2026-09-28');
    turns = addTurn(turns, 'b', '2026-09-28');
    expect(turnsOn(turns, '2026-09-28')).toEqual({ a: 2, b: 1 });
    expect(turnsOn(turns, '2026-09-29')).toEqual({});
    expect(addTurn(turns, 'b', '2026-09-29').counts).toEqual({ b: 1 });
  });
});

describe('team maker', () => {
  it('puts everyone in exactly one team, with sizes within one of each other', () => {
    const kids = Array.from({ length: 11 }, (_, i) => `k${i}`);
    for (const count of [2, 3, 4]) {
      const teams = makeTeams(kids, count, seq(count));
      expect(teams).toHaveLength(count);
      expect(teams.flat().sort()).toEqual([...kids].sort());
      const sizes = teams.map((t) => t.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });
  it('mixes the class differently each time', () => {
    const kids = Array.from({ length: 12 }, (_, i) => i);
    const rng = seq(3);
    expect(makeTeams(kids, 2, rng)).not.toEqual(makeTeams(kids, 2, rng));
  });
});

describe('noise meter', () => {
  it('maps silence to 0, full scale to 100 and −30 dB to the middle', () => {
    expect(noiseLevel(0)).toBe(0);
    expect(noiseLevel(1)).toBe(100);
    expect(noiseLevel(10 ** (-30 / 20))).toBe(50);
    expect(noiseLevel(1e-6)).toBe(0);
  });
});
