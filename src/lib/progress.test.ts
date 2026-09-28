import { describe, expect, it } from 'vitest';
import { SEED_HOLIDAYS, SEED_QUARTERS, SEED_YEAR_START } from '../seed/groups';
import { expectedCovered, groupProgress } from './progress';

const cal = { yearStart: SEED_YEAR_START, quarters: SEED_QUARTERS, holidays: SEED_HOLIDAYS };
// Two modules of 8 lessons: Sep–Oct and Nov.
const modules = [
  { id: 'm1', monthNums: [9, 10] },
  { id: 'm2', monthNums: [11] },
];
const ordered = Array.from({ length: 16 }, (_, i) => `l${i}`);
const lessonModule = new Map(ordered.map((id, i) => [id, i < 8 ? 'm1' : 'm2']));
const per = new Map([['m1', 8], ['m2', 8]]);

describe('where a group should be', () => {
  it('spreads each module over its months', () => {
    expect(expectedCovered(cal, modules, per, '2026-09-01')).toBeCloseTo(0);
    expect(expectedCovered(cal, modules, per, '2026-10-01')).toBeCloseTo(4); // halfway through Sep–Oct
    expect(expectedCovered(cal, modules, per, '2026-11-16')).toBeCloseTo(8 + 8 * (15 / 30));
    expect(expectedCovered(cal, modules, per, '2027-03-01')).toBeCloseTo(16);
  });

  it('falls back to teaching weeks when modules have no months', () => {
    const undated = [{ id: 'm1', monthNums: [] }, { id: 'm2', monthNums: [] }];
    // Week 5 of 34 teaching weeks.
    expect(expectedCovered(cal, undated, per, '2026-09-28')).toBeCloseTo((5 / 34) * 16);
  });

  it('says whether the group is on track, behind or ahead', () => {
    expect(groupProgress(cal, modules, ordered, lessonModule, 'l4', '2026-10-01')).toMatchObject({ covered: 4, diff: 0, state: 'on-track' });
    expect(groupProgress(cal, modules, ordered, lessonModule, 'l1', '2026-10-15')).toMatchObject({ covered: 1, state: 'behind' });
    expect(groupProgress(cal, modules, ordered, lessonModule, 'l12', '2026-10-01')).toMatchObject({ state: 'ahead', diff: 8 });
    expect(groupProgress(cal, modules, [], lessonModule, null, '2026-10-01').state).toBe('none');
  });
});
