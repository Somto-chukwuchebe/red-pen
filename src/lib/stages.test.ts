import { describe, expect, it } from 'vitest';
import { checkStages, fitStages } from './stages';

const st = (name: string, minutes: number) => ({ name, minutes, notes: '' });

describe('stage minutes', () => {
  it('passes when stages add up to the lesson length', () => {
    expect(checkStages([st('Warm-up', 5), st('Game', 25), st('Goodbye', 10)], 40)).toMatchObject({ total: 40, diff: 0, ok: true, incomplete: [] });
  });

  it('reports how far over or under the plan is', () => {
    expect(checkStages([st('Warm-up', 5), st('Game', 40)], 40)).toMatchObject({ total: 45, diff: 5, ok: false });
    expect(checkStages([st('Warm-up', 5)], 15)).toMatchObject({ total: 5, diff: -10, ok: false });
  });

  it('flags unnamed or zero-minute stages, and an empty plan', () => {
    expect(checkStages([st('', 5), st('Game', 0)], 5).incomplete).toEqual([0, 1]);
    expect(checkStages([], 40).ok).toBe(false);
  });

  it('rescales a plan to another lesson length', () => {
    const fitted = fitStages([st('A', 5), st('B', 25), st('C', 10)], 30);
    expect(fitted.reduce((s, x) => s + x.minutes, 0)).toBe(30);
    expect(fitted.map((x) => x.minutes)).toEqual([4, 18, 8]);
  });
});
