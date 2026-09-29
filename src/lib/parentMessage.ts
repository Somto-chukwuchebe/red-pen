// A short, friendly message to a child's parents, built on the device from the log
// (no AI, nothing sent anywhere). The teacher edits it before sending.
//
// Russian: written in the present tense and with the name only in its basic form, so it
// never needs the child's gender or the name's case endings (Маша/Маши, Артём/Артёма).

import type { CanDoLevel } from '../domain/types';
import { DEFAULT_FLAG_RULE, lowStreak, type FlagRule, type HistoryPoint } from './participation';

/** How many of the group's latest lessons the message looks at. */
export const MESSAGE_LESSONS = 8;

export interface ParentMessageInput {
  name: string;
  group: string;
  subject: string;
  /** The student's lessons, oldest first (studentHistory). */
  history: HistoryPoint[];
  /** The current module's can-do statements with this child's mark (or the group's). */
  canDo: { text: string; level: CanDoLevel | null }[];
  topic: string | null;
  teacherName?: string;
  rule?: FlagRule;
}

export interface MessageFacts {
  lessons: number;
  attended: number;
  average: number | null;
  trend: 'up' | 'down' | null;
  low: boolean;
}

/** The numbers behind the message (exported for tests). */
export function messageFacts(history: HistoryPoint[], rule: FlagRule = DEFAULT_FLAG_RULE): MessageFacts {
  const recent = history.slice(-MESSAGE_LESSONS);
  const rated = recent.filter((h) => !h.absent && h.rating !== null).map((h) => h.rating!);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  let trend: MessageFacts['trend'] = null;
  if (rated.length >= 4) {
    const half = Math.floor(rated.length / 2);
    const diff = avg(rated.slice(-half)) - avg(rated.slice(0, rated.length - half));
    trend = diff >= 0.5 ? 'up' : diff <= -0.5 ? 'down' : null;
  }
  const average = rated.length >= 2 ? avg(rated) : null;
  return {
    lessons: recent.length,
    attended: recent.filter((h) => !h.absent).length,
    average,
    trend,
    low: lowStreak(history, rule) >= rule.streak || (average !== null && average < 2.5),
  };
}

const isEnglish = (subject: string) => /english|англ/i.test(subject);

export function parentMessage(input: ParentMessageInput, lang: 'en' | 'ru'): string {
  const { name, subject, teacherName } = input;
  const f = messageFacts(input.history, input.rule);
  const secure = input.canDo.filter((c) => c.level === 'secure').slice(0, 3).map((c) => c.text);
  const building = input.canDo.filter((c) => c.level === 'emerging' || c.level === 'not-yet').slice(0, 2).map((c) => c.text);
  const missedMany = f.lessons > 0 && f.attended / f.lessons < 0.75;
  const needsTip = f.low || f.trend === 'down';
  const lines: string[] = [];

  if (lang === 'ru') {
    const subj = isEnglish(subject) ? 'по английскому языку' : `по предмету «${subject}»`;
    lines.push(`Здравствуйте! Коротко о занятиях ${subj} (${name}, группа ${input.group}).`);
    if (f.lessons) lines.push(`Посещаемость: ${f.attended} из ${f.lessons === 1 ? '1 занятия' : `${f.lessons} последних занятий`}.${missedMany ? ' Будет здорово, если получится приходить регулярнее.' : ''}`);
    if (f.average !== null) {
      lines.push(
        f.average >= 4.3
          ? `На уроках ${name} очень активно участвует в заданиях: отвечает, играет, помогает другим.`
          : f.average >= 3.5
            ? `${name} активно участвует в заданиях на уроке.`
            : f.average >= 2.5
              ? `${name} участвует в заданиях, и сейчас мы работаем над тем, чтобы говорить на уроке чаще.`
              : `Пока ${name} на уроках больше молчит, и мы работаем над уверенностью, чтобы смелее включаться в задания.`,
      );
      if (f.trend === 'up') lines.push('За последние уроки активность заметно выросла.');
      if (f.trend === 'down') lines.push('На последних уроках активность немного снизилась.');
    }
    if (input.topic) lines.push(`Сейчас мы проходим тему «${input.topic}».`);
    if (secure.length) lines.push(`${name} уже умеет: ${secure.join('; ')}.`);
    if (building.length) lines.push(`Дальше работаем над: ${building.join('; ')}.`);
    lines.push(needsTip ? `Дома очень помогает, если ${name} научит вас паре слов или песенке с урока — хватит одной-двух минут.` : 'Спасибо за поддержку!');
    lines.push('', teacherName ? `С уважением,\n${teacherName}` : 'С уважением');
  } else {
    lines.push(`Hello! Here’s a short update on ${name} from our ${subject} lessons.`);
    if (f.lessons) {
      lines.push(
        f.attended === f.lessons
          ? `${name} has been at all of the last ${f.lessons} lessons.`
          : missedMany
            ? `${name} has missed ${f.lessons - f.attended} of the last ${f.lessons} lessons, so it would help to come more regularly.`
            : `${name} has been at ${f.attended} of the last ${f.lessons} lessons.`,
      );
    }
    if (f.average !== null) {
      lines.push(
        f.average >= 4.3
          ? `${name} takes a very active part in the activities: answering, joining in the games and helping others.`
          : f.average >= 3.5
            ? `${name} takes an active part in the lesson activities.`
            : f.average >= 2.5
              ? `${name} joins in with the activities, and we’re working on speaking up more often.`
              : `${name} is quite quiet in lessons at the moment, and we’re working on the confidence to join in.`,
      );
      if (f.trend === 'up') lines.push('Participation has grown noticeably over the last few lessons.');
      if (f.trend === 'down') lines.push('Participation has dipped a little in the last few lessons.');
    }
    if (input.topic) lines.push(`We’re currently working on “${input.topic}”.`);
    if (secure.length) lines.push(`${name} can now ${secure.join('; ')}.`);
    if (building.length) lines.push(`Next we’re working on: ${building.join('; ')}.`);
    lines.push(needsTip ? `At home, it really helps to ask ${name} to teach you a few words or a song from the lesson — a minute or two is enough.` : 'Thank you for your support!');
    lines.push('', teacherName ? `Best wishes,\n${teacherName}` : 'Best wishes');
  }
  return lines.join('\n');
}
