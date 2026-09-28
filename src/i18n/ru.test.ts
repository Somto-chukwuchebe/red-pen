import { describe, expect, it } from 'vitest';
import { ru } from './ru';

describe('Russian strings', () => {
  it('uses the right plural forms', () => {
    expect([1, 2, 5, 11, 21, 22, 25, 112].map((n) => ru.common.lessons(n))).toEqual([
      '1 урок', '2 урока', '5 уроков', '11 уроков', '21 урок', '22 урока', '25 уроков', '112 уроков',
    ]);
  });
});
