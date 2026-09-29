import { describe, expect, it } from 'vitest';
import { messageFacts, parentMessage, type ParentMessageInput } from './parentMessage';
import type { HistoryPoint } from './participation';

const lessons = (ratings: (number | null | 'absent')[]): HistoryPoint[] =>
  ratings.map((r, i) => ({ logId: `l${i}`, date: `2026-09-${String(i + 1).padStart(2, '0')}`, absent: r === 'absent', rating: r === 'absent' ? null : r }));

const input = (history: HistoryPoint[], extra: Partial<ParentMessageInput> = {}): ParentMessageInput => ({
  name: 'Маша',
  group: '2a',
  subject: 'English',
  history,
  canDo: [
    { text: 'say hello and goodbye', level: 'secure' },
    { text: 'name family members', level: 'emerging' },
    { text: 'count to ten', level: null },
  ],
  topic: 'Hello! and My family',
  teacherName: 'Somto',
  ...extra,
});

describe('parent message', () => {
  it('looks at the last 8 lessons and spots a rising or falling trend', () => {
    expect(messageFacts(lessons([1, 1, 1, 5, 3, 3, 4, 4, 5, 5]))).toMatchObject({ lessons: 8, attended: 8, trend: 'up' });
    expect(messageFacts(lessons([5, 5, 4, 4, 3, 2]))).toMatchObject({ trend: 'down' });
    expect(messageFacts(lessons([4, 'absent', 4, 4, 5])).attended).toBe(4);
    expect(messageFacts(lessons([4])).average).toBeNull(); // one rating isn't enough to say anything
  });

  it('writes an encouraging English message with what the child can do', () => {
    const text = parentMessage(input(lessons([5, 4, 5, 5, 4, 5])), 'en');
    expect(text).toContain('Маша has been at all of the last 6 lessons.');
    expect(text).toContain('takes a very active part');
    expect(text).toContain('can now say hello and goodbye.');
    expect(text).toContain('Next we’re working on: name family members.');
    expect(text).toContain('Thank you for your support!');
    expect(text.endsWith('Best wishes,\nSomto')).toBe(true);
  });

  it('adds a gentle tip for home when participation is low, and mentions missed lessons', () => {
    const text = parentMessage(input(lessons([2, 'absent', 1, 'absent', 2, 'absent'])), 'en');
    expect(text).toContain('has missed 3 of the last 6 lessons');
    expect(text).toContain('quite quiet');
    expect(text).toContain('At home, it really helps');
  });

  it('writes Russian in the present tense, with the name only in its basic form', () => {
    const text = parentMessage(input(lessons([3, 3, 4, 4]), { teacherName: undefined }), 'ru');
    expect(text).toContain('Здравствуйте! Коротко о занятиях по английскому языку (Маша, группа 2a).');
    expect(text).toContain('Посещаемость: 4 из 4 последних занятий.');
    expect(text).toContain('Маша активно участвует в заданиях на уроке.');
    expect(text).toContain('Маша уже умеет: say hello and goodbye.');
    expect(text).toContain('Сейчас мы проходим тему «Hello! and My family».');
    // No gendered past-tense verbs.
    // (\b doesn't work with Cyrillic, so match whole words by spaces and punctuation.)
    expect(text).not.toMatch(/(^|[\s,.])(был|была|участвовал|участвовала|посетил|посетила)([\s,.]|$)/);
    expect(text.endsWith('С уважением')).toBe(true);
  });

  it('names another subject plainly', () => {
    expect(parentMessage(input([], { subject: 'Maths' }), 'ru')).toContain('по предмету «Maths»');
    expect(parentMessage(input([], { subject: 'Maths' }), 'en')).toContain('from our Maths lessons');
  });
});
