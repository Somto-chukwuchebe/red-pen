// An optional starter set of classic classroom games, written for Red Pen.
// Teachers add it from the Library if they want it; every game can then be
// edited or deleted like their own.

import type { Game } from '../domain/types';
import { parseLevels } from '../import/text';

type Starter = Pick<Game, 'levels' | 'levelTags' | 'skills' | 'energy' | 'prepMinutes' | 'needsProjector'> & {
  key: string;
  en: { name: string; how: string; prep: string };
  ru: { name: string; how: string; prep: string };
};


const STARTERS: Starter[] = [
  { key: 'flash-and-guess', levels: 'KG–4', levelTags: parseLevels('KG–4'), skills: ['vocabulary', 'speaking'], energy: 'medium', prepMinutes: 5, needsProjector: false,
    en: { name: 'Flash and guess', how: 'Flash a picture card for a second; the first to name it wins a point.', prep: 'Picture cards' },
    ru: { name: 'Угадай по вспышке', how: 'Покажите карточку на секунду; кто первым назовёт, получает очко.', prep: 'Карточки с картинками' } },
  { key: 'whats-missing', levels: 'KG–6', levelTags: parseLevels('KG–6'), skills: ['vocabulary', 'speaking'], energy: 'calm', prepMinutes: 2, needsProjector: false,
    en: { name: "Kim's game / What's missing?", how: 'Show 6–10 objects or cards, cover them, remove one. The class says what’s missing.', prep: 'Objects or cards' },
    ru: { name: 'Чего не хватает?', how: 'Покажите 6–10 предметов или карточек, закройте, уберите один. Класс называет, чего не хватает.', prep: 'Предметы или карточки' } },
  { key: 'simon-says', levels: 'KG–4', levelTags: parseLevels('KG–4'), skills: ['listening', 'movement'], energy: 'lively', prepMinutes: 0, needsProjector: false,
    en: { name: 'Simon says', how: 'Give commands; children follow only when the command starts with “Simon says”.', prep: 'None' },
    ru: { name: 'Саймон говорит', how: 'Давайте команды; дети выполняют только те, что начинаются с «Simon says».', prep: 'Нет' } },
  { key: 'hot-potato', levels: 'KG–5', levelTags: parseLevels('KG–5'), skills: ['speaking'], energy: 'lively', prepMinutes: 1, needsProjector: false,
    en: { name: 'Hot potato', how: 'Pass a ball to music. When it stops, the child holding it answers a question or names a card.', prep: 'Soft ball, music' },
    ru: { name: 'Горячая картошка', how: 'Передавайте мяч под музыку. Музыка остановилась — у кого мяч, тот отвечает на вопрос или называет карточку.', prep: 'Мягкий мяч, музыка' } },
  { key: 'mystery-bag', levels: 'KG–4', levelTags: parseLevels('KG–4'), skills: ['vocabulary', 'speaking'], energy: 'calm', prepMinutes: 3, needsProjector: false,
    en: { name: 'Mystery bag', how: 'A child feels an object inside a cloth bag and guesses: “Is it a…?”', prep: 'Cloth bag, small objects' },
    ru: { name: 'Волшебный мешочек', how: 'Ребёнок на ощупь угадывает предмет в мешочке: «Is it a…?»', prep: 'Мешочек, мелкие предметы' } },
  { key: 'freeze-dance', levels: 'KG–2', levelTags: parseLevels('KG–2'), skills: ['movement', 'vocabulary'], energy: 'lively', prepMinutes: 1, needsProjector: false,
    en: { name: 'Freeze dance', how: 'Dance to music; when it stops, freeze and name the card you hold up.', prep: 'Music, cards' },
    ru: { name: 'Замри!', how: 'Танцуем под музыку; музыка остановилась — замираем и называем карточку, которую вы показываете.', prep: 'Музыка, карточки' } },
  { key: 'bingo', levels: 'KG–11', levelTags: parseLevels('KG–11'), skills: ['listening', 'vocabulary'], energy: 'calm', prepMinutes: 5, needsProjector: false,
    en: { name: 'Picture bingo', how: 'Children draw or pick 4–9 items in a grid; call them out; the first full row says “Bingo!” and reads it back.', prep: 'Bingo grids' },
    ru: { name: 'Бинго', how: 'Дети рисуют или выбирают 4–9 слов в сетке; вы называете; кто первым закрыл ряд — «Bingo!» и читает его.', prep: 'Сетки для бинго' } },
  { key: 'charades', levels: 'KG–11', levelTags: parseLevels('KG–11'), skills: ['speaking', 'movement'], energy: 'lively', prepMinutes: 2, needsProjector: false,
    en: { name: 'Charades', how: 'Mime a word or action; the team guesses in a full sentence.', prep: 'Word cards' },
    ru: { name: 'Крокодил', how: 'Изобразите слово или действие; команда угадывает полным предложением.', prep: 'Карточки со словами' } },
  { key: 'board-race', levels: '1–11', levelTags: parseLevels('1–11'), skills: ['vocabulary', 'writing'], energy: 'lively', prepMinutes: 0, needsProjector: false,
    en: { name: 'Board race', how: 'Two teams, one marker each. Call a category; runners write a word and the team says it aloud to score.', prep: 'Board, 2 markers' },
    ru: { name: 'Гонка у доски', how: 'Две команды, по маркеру. Назовите категорию; игроки пишут слово, команда произносит его, чтобы получить очко.', prep: 'Доска, 2 маркера' } },
  { key: 'find-someone-who', levels: '2–11', levelTags: parseLevels('2–11'), skills: ['speaking', 'listening'], energy: 'lively', prepMinutes: 10, needsProjector: false,
    en: { name: 'Find someone who', how: 'Everyone mingles with a grid of prompts and finds a classmate for each box, then reports back.', prep: 'Grids' },
    ru: { name: 'Найди того, кто…', how: 'Все ходят по классу с сеткой заданий и находят одноклассника для каждой клетки, затем рассказывают.', prep: 'Сетки' } },
  { key: 'class-survey', levels: '2–11', levelTags: parseLevels('2–11'), skills: ['speaking', 'listening'], energy: 'medium', prepMinutes: 5, needsProjector: false,
    en: { name: 'Class survey', how: 'Everyone asks five classmates one question, then reports the results.', prep: 'Survey sheets' },
    ru: { name: 'Опрос класса', how: 'Каждый задаёт один вопрос пятерым одноклассникам и рассказывает результаты.', prep: 'Листы опроса' } },
  { key: 'hot-seat', levels: '3–11', levelTags: parseLevels('3–11'), skills: ['speaking'], energy: 'medium', prepMinutes: 0, needsProjector: false,
    en: { name: 'Hot seat', how: 'One student sits facing the class as a character or famous person; the class interviews them.', prep: 'None' },
    ru: { name: 'Горячий стул', how: 'Ученик садится лицом к классу в роли персонажа или знаменитости; класс берёт у него интервью.', prep: 'Нет' } },
  { key: 'twenty-questions', levels: '3–11', levelTags: parseLevels('3–11'), skills: ['speaking'], energy: 'calm', prepMinutes: 0, needsProjector: false,
    en: { name: '20 questions', how: 'Think of a word; the class asks yes/no questions to guess it in fewer than 20 tries.', prep: 'None' },
    ru: { name: '20 вопросов', how: 'Загадайте слово; класс задаёт вопросы «да/нет» и угадывает меньше чем за 20 попыток.', prep: 'Нет' } },
  { key: 'two-truths', levels: '5–11', levelTags: parseLevels('5–11'), skills: ['speaking'], energy: 'calm', prepMinutes: 0, needsProjector: false,
    en: { name: 'Two truths and a lie', how: 'Say three sentences about yourself, one false; the class asks questions to find the lie.', prep: 'None' },
    ru: { name: 'Две правды и ложь', how: 'Скажите о себе три предложения, одно ложное; класс задаёт вопросы и ищет ложь.', prep: 'Нет' } },
  { key: 'would-you-rather', levels: '4–11', levelTags: parseLevels('4–11'), skills: ['speaking'], energy: 'medium', prepMinutes: 5, needsProjector: false,
    en: { name: 'Would you rather', how: 'Ask a two-choice question; students move to one side and explain why.', prep: 'Question list' },
    ru: { name: 'Что бы ты выбрал?', how: 'Задайте вопрос с двумя вариантами; ученики переходят на одну сторону и объясняют почему.', prep: 'Список вопросов' } },
  { key: 'four-corners', levels: '6–11', levelTags: parseLevels('6–11'), skills: ['speaking'], energy: 'medium', prepMinutes: 5, needsProjector: false,
    en: { name: 'Debate (four corners)', how: 'Read a statement; students go to Agree / Disagree / Not sure / It depends and justify.', prep: 'Statements' },
    ru: { name: 'Четыре угла', how: 'Прочитайте утверждение; ученики идут в угол «Согласен / Не согласен / Не уверен / Зависит» и объясняют.', prep: 'Утверждения' } },
  { key: 'just-a-minute', levels: '6–11', levelTags: parseLevels('6–11'), skills: ['speaking'], energy: 'calm', prepMinutes: 2, needsProjector: false,
    en: { name: 'Just a minute', how: 'Speak on a topic for 60 seconds without stopping; the partner asks one follow-up question.', prep: 'Topic cards' },
    ru: { name: 'Ровно минута', how: 'Говорите на тему 60 секунд без остановки; партнёр задаёт один уточняющий вопрос.', prep: 'Карточки с темами' } },
  { key: 'role-play', levels: '1–11', levelTags: parseLevels('1–11'), skills: ['speaking'], energy: 'medium', prepMinutes: 10, needsProjector: false,
    en: { name: 'Role-play (shop, café, doctor)', how: 'Set up a counter with props or a menu; customers and staff swap roles.', prep: 'Props, menus' },
    ru: { name: 'Ролевая игра (магазин, кафе, врач)', how: 'Сделайте «прилавок» с реквизитом или меню; покупатели и продавцы меняются ролями.', prep: 'Реквизит, меню' } },
  { key: 'team-quiz', levels: '1–11', levelTags: parseLevels('1–11'), skills: ['speaking', 'review'], energy: 'lively', prepMinutes: 15, needsProjector: true,
    en: { name: 'Team quiz', how: 'Team quiz on the projector or board; teams score only for full-sentence answers.', prep: 'Quiz questions' },
    ru: { name: 'Командная викторина', how: 'Викторина на проекторе или доске; очко только за ответ полным предложением.', prep: 'Вопросы' } },
  { key: 'odd-one-out', levels: '2–11', levelTags: parseLevels('2–11'), skills: ['vocabulary', 'speaking'], energy: 'calm', prepMinutes: 5, needsProjector: false,
    en: { name: 'Odd one out', how: 'Show four words or pictures; pairs find the one that doesn’t belong and explain why.', prep: 'Word sets' },
    ru: { name: 'Лишнее слово', how: 'Покажите четыре слова или картинки; пары находят лишнее и объясняют почему.', prep: 'Наборы слов' } },
  { key: 'chain-story', levels: '4–11', levelTags: parseLevels('4–11'), skills: ['speaking'], energy: 'medium', prepMinutes: 0, needsProjector: false,
    en: { name: 'Chain story', how: 'Each student adds one sentence to a class story, using the target language.', prep: 'None' },
    ru: { name: 'История по цепочке', how: 'Каждый добавляет к общей истории одно предложение с нужной лексикой или грамматикой.', prep: 'Нет' } },
  { key: 'exit-ticket', levels: '2–11', levelTags: parseLevels('2–11'), skills: ['review'], energy: 'calm', prepMinutes: 0, needsProjector: false,
    en: { name: 'Exit ticket', how: 'Before leaving, each student says or writes one thing they learned and one question they still have.', prep: 'None' },
    ru: { name: 'Билет на выход', how: 'Перед уходом каждый говорит или пишет, что узнал, и один оставшийся вопрос.', prep: 'Нет' } },
];

export const STARTER_COUNT = STARTERS.length;

/** The starter games in the teacher's language, ready to add to their library. */
export function starterGames(lang: 'en' | 'ru', now = Date.now()): Game[] {
  return STARTERS.map((s) => {
    const t = lang === 'ru' ? s.ru : s.en;
    return {
      id: `starter-${s.key}`,
      name: t.name,
      levels: s.levels,
      levelTags: s.levelTags,
      howItWorks: t.how,
      prep: t.prep,
      skills: s.skills,
      energy: s.energy,
      prepMinutes: s.prepMinutes,
      needsProjector: s.needsProjector,
      link: '',
      fileId: null,
      custom: true,
      updatedAt: now,
    };
  });
}
