// Suggested online resources, chosen by the teacher's subject.
// Descriptions are written for Red Pen. Teachers add any suggestion to their own
// library with one tap, then edit it like their own.

import type { Resource } from '../domain/types';
import { parseLevels } from '../import/text';

export type SubjectTag = 'english' | 'languages' | 'russian' | 'maths' | 'science' | 'music' | 'art' | 'humanities' | 'any';

export interface Suggestion {
  id: string;
  name: string;
  url: string;
  subjects: SubjectTag[];
  levels: string;
  cost: 'free' | 'account' | 'paid-extras';
  /** A Russian-language site (and a Russian platform: reliable without a VPN). */
  russian?: boolean;
  /** Its videos are on YouTube, which is very slow in Russia without a VPN. */
  youtube?: boolean;
  en: string;
  ru: string;
}

export const SUGGESTIONS: Suggestion[] = [
  // ── English ──────────────────────────────────────────────────────────
  { id: 'super-simple', name: 'Super Simple Songs', url: 'https://supersimple.com', subjects: ['english'], levels: 'KG–2', cost: 'free', youtube: true,
    en: 'Hello and goodbye songs, action songs and free printable flashcards and colouring pages.', ru: 'Песни-приветствия и прощания, песни с движениями, бесплатные карточки и раскраски для печати.' },
  { id: 'dream-english', name: 'Dream English', url: 'https://www.dreamenglish.com', subjects: ['english'], levels: 'KG–2', cost: 'free', youtube: true,
    en: 'Simple songs for complete beginners, with free flashcards and lesson ideas.', ru: 'Простые песни для самых начинающих, бесплатные карточки и идеи для уроков.' },
  { id: 'mes-english', name: 'MES English', url: 'https://www.mes-english.com', subjects: ['english'], levels: 'KG–4', cost: 'free',
    en: 'Printable flashcards, bingo cards, board games and worksheets sorted by topic.', ru: 'Карточки, бинго, настольные игры и рабочие листы для печати по темам.' },
  { id: 'learnenglish-kids', name: 'LearnEnglish Kids (British Council)', url: 'https://learnenglishkids.britishcouncil.org', subjects: ['english'], levels: '1–6', cost: 'free',
    en: 'Short stories, songs, games and videos to show on the projector.', ru: 'Короткие истории, песни, игры и видео для показа на проекторе.' },
  { id: 'learnenglish-teens', name: 'LearnEnglish Teens (British Council)', url: 'https://learnenglishteens.britishcouncil.org', subjects: ['english'], levels: '7–11', cost: 'free',
    en: 'Short videos, texts and grammar practice that make good discussion starters.', ru: 'Короткие видео, тексты и грамматика — хорошие поводы для обсуждения.' },
  { id: 'islcollective', name: 'ISL Collective', url: 'https://en.islcollective.com', subjects: ['english'], levels: '3–11', cost: 'account',
    en: 'Thousands of teacher-made worksheets, speaking cards, board games and video quizzes.', ru: 'Тысячи рабочих листов, карточек для говорения, настольных игр и видеовикторин от учителей.' },
  { id: 'esl-games-plus', name: 'ESL Games Plus', url: 'https://www.eslgamesplus.com', subjects: ['english'], levels: '1–6', cost: 'free',
    en: 'Projector games for vocabulary and grammar, played in teams.', ru: 'Командные игры на проекторе для лексики и грамматики.' },
  { id: 'breaking-news', name: 'Breaking News English', url: 'https://breakingnewsenglish.com', subjects: ['english'], levels: '7–11', cost: 'free',
    en: 'Real news stories at seven levels, with discussion questions and listening.', ru: 'Настоящие новости на семи уровнях сложности с вопросами для обсуждения и аудио.' },
  { id: 'film-english', name: 'Film English', url: 'https://film-english.com', subjects: ['english'], levels: '7–11', cost: 'free',
    en: 'Lesson plans built around short films, with speaking tasks.', ru: 'Планы уроков по коротким фильмам с заданиями на говорение.' },
  { id: 'esl-brains', name: 'ESL Brains', url: 'https://eslbrains.com', subjects: ['english'], levels: '8–11', cost: 'paid-extras',
    en: 'Discussion lessons for teens on current topics, many free.', ru: 'Уроки-дискуссии для подростков на актуальные темы, многие бесплатно.' },
  { id: 'conversation-questions', name: 'Conversation Questions (iTESLj)', url: 'https://iteslj.org/questions/', subjects: ['english'], levels: '5–11', cost: 'free',
    en: 'Lists of discussion questions on hundreds of topics — ready for speaking clubs.', ru: 'Списки вопросов для обсуждения на сотни тем — готово для разговорного клуба.' },
  { id: 'esl-lab', name: 'Randall’s ESL Cyber Listening Lab', url: 'https://www.esl-lab.com', subjects: ['english'], levels: '7–11', cost: 'free',
    en: 'Graded listening activities with quizzes and follow-up discussion.', ru: 'Аудирование по уровням с тестами и вопросами для обсуждения.' },
  { id: 'starfall', name: 'Starfall', url: 'https://www.starfall.com', subjects: ['english'], levels: 'KG–2', cost: 'paid-extras',
    en: 'Phonics, first reading and songs for the youngest learners.', ru: 'Фоника, первое чтение и песни для самых маленьких.' },
  { id: 'kiz-phonics', name: 'Kiz Phonics', url: 'https://www.kizphonics.com', subjects: ['english'], levels: 'KG–3', cost: 'free',
    en: 'Phonics worksheets, readers and games, step by step.', ru: 'Рабочие листы по фонике, книжки для чтения и игры по шагам.' },
  { id: 'storyline-online', name: 'Storyline Online', url: 'https://storylineonline.net', subjects: ['english'], levels: 'KG–4', cost: 'free', youtube: true,
    en: 'Picture books read aloud by actors, with activity guides.', ru: 'Книжки с картинками, которые читают вслух актёры, с заданиями.' },
  { id: 'games-to-learn-english', name: 'Games to Learn English', url: 'https://www.gamestolearnenglish.com', subjects: ['english'], levels: '2–7', cost: 'free',
    en: 'Simple online games for vocabulary and sentence building, good on the projector.', ru: 'Простые онлайн-игры на лексику и построение предложений, удобно на проекторе.' },
  { id: 'eslkidstuff', name: 'ESL KidStuff', url: 'https://www.eslkidstuff.com', subjects: ['english'], levels: 'KG–4', cost: 'paid-extras',
    en: 'Lesson plans, flashcards, songs and classroom games for young learners.', ru: 'Планы уроков, карточки, песни и игры для младших школьников.' },
  { id: 'oxford-owl', name: 'Oxford Owl', url: 'https://www.oxfordowl.co.uk', subjects: ['english'], levels: 'KG–4', cost: 'account',
    en: 'A free e-book library of levelled readers for young children.', ru: 'Бесплатная библиотека электронных книг по уровням для маленьких детей.' },
  { id: 'lingualeo', name: 'Lingualeo', url: 'https://lingualeo.com', subjects: ['english'], levels: '5–11', cost: 'paid-extras', russian: true,
    en: 'Vocabulary training in Russian for homework between lessons.', ru: 'Тренировка слов с объяснениями на русском — домашняя практика между уроками.' },

  // ── Other languages ───────────────────────────────────────────────────
  { id: 'lyrics-training', name: 'LyricsTraining', url: 'https://lyricstraining.com', subjects: ['english', 'languages'], levels: '5–11', cost: 'free',
    en: 'Fill in the missing words of real songs — English, German, French, Spanish and more.', ru: 'Вставляйте пропущенные слова в настоящие песни — английский, немецкий, французский, испанский и др.' },
  { id: 'dw-learn-german', name: 'DW Learn German', url: 'https://learngerman.dw.com', subjects: ['languages'], levels: '5–11', cost: 'free',
    en: 'Free German courses from beginner level, with video and audio.', ru: 'Бесплатные курсы немецкого с нуля, с видео и аудио.' },
  { id: 'goethe', name: 'Goethe-Institut: German exercises', url: 'https://www.goethe.de/de/spr/ueb.html', subjects: ['languages'], levels: '3–11', cost: 'free',
    en: 'German exercises and games for children and teens.', ru: 'Упражнения и игры по немецкому для детей и подростков.' },
  { id: 'tv5monde', name: 'TV5Monde: Apprendre le français', url: 'https://apprendre.tv5monde.com', subjects: ['languages'], levels: '5–11', cost: 'free',
    en: 'French learning with short news and video clips at every level.', ru: 'Французский по коротким новостям и видео на всех уровнях.' },
  { id: 'bonjour-de-france', name: 'Bonjour de France', url: 'https://www.bonjourdefrance.com', subjects: ['languages'], levels: '5–11', cost: 'free',
    en: 'French exercises, games and grammar tests by level.', ru: 'Упражнения, игры и грамматические тесты по французскому по уровням.' },
  { id: 'profedeele', name: 'ProfeDeELE', url: 'https://www.profedeele.es', subjects: ['languages'], levels: '5–11', cost: 'free',
    en: 'Spanish lessons, exercises and grammar explanations.', ru: 'Уроки, упражнения и объяснения грамматики по испанскому.' },
  { id: 'spanish-playground', name: 'Spanish Playground', url: 'https://www.spanishplayground.net', subjects: ['languages'], levels: 'KG–6', cost: 'free',
    en: 'Songs, games and printables for teaching Spanish to children.', ru: 'Песни, игры и материалы для печати для обучения детей испанскому.' },
  { id: 'chinese-grammar', name: 'Chinese Grammar Wiki', url: 'https://resources.allsetlearning.com/chinese/grammar/', subjects: ['languages'], levels: '7–11', cost: 'free',
    en: 'Clear explanations of Chinese grammar patterns by level.', ru: 'Понятные объяснения грамматики китайского языка по уровням.' },

  // ── Russian platforms and tools for any subject ───────────────────────
  { id: 'resh', name: 'РЭШ — Российская электронная школа', url: 'https://resh.edu.ru', subjects: ['any', 'english', 'russian', 'maths', 'science', 'humanities'], levels: '1–11', cost: 'free', russian: true,
    en: 'Video lessons and exercises for every school subject, following the Russian curriculum.', ru: 'Видеоуроки и упражнения по всем предметам школьной программы.' },
  { id: 'uchi', name: 'Учи.ру', url: 'https://uchi.ru', subjects: ['any', 'english', 'russian', 'maths', 'science'], levels: '1–11', cost: 'paid-extras', russian: true,
    en: 'Interactive exercises and olympiads; teachers can set homework to a class.', ru: 'Интерактивные задания и олимпиады; учитель может задавать классу домашние задания.' },
  { id: 'yaklass', name: 'ЯКласс', url: 'https://www.yaklass.ru', subjects: ['any', 'english', 'russian', 'maths', 'science', 'humanities'], levels: '1–11', cost: 'paid-extras', russian: true,
    en: 'Theory and self-checking exercises for school subjects, with class tracking.', ru: 'Теория и задания с автопроверкой по школьным предметам, отслеживание класса.' },
  { id: 'skysmart', name: 'Skysmart Класс', url: 'https://edu.skysmart.ru', subjects: ['any', 'english', 'russian', 'maths', 'science'], levels: '1–11', cost: 'free', russian: true,
    en: 'Interactive homework matched to Russian textbooks, including English; free for teachers.', ru: 'Интерактивные домашние задания по российским учебникам, включая английский; бесплатно для учителей.' },
  { id: 'mesh', name: 'Библиотека МЭШ', url: 'https://uchebnik.mos.ru', subjects: ['any', 'english', 'russian', 'maths', 'science', 'humanities'], levels: '1–11', cost: 'account', russian: true,
    en: 'Moscow Electronic School library: lesson scenarios, tests and apps (Moscow teacher login).', ru: 'Библиотека Московской электронной школы: сценарии уроков, тесты и приложения (вход для учителей Москвы).' },
  { id: 'infourok', name: 'Инфоурок', url: 'https://infourok.ru', subjects: ['any'], levels: 'KG–11', cost: 'free', russian: true,
    en: 'A large bank of teacher-made lesson plans, presentations and tests.', ru: 'Большая база планов уроков, презентаций и тестов от учителей.' },
  { id: 'wordwall', name: 'Wordwall', url: 'https://wordwall.net', subjects: ['any', 'english', 'languages'], levels: '1–11', cost: 'paid-extras',
    en: 'Make quizzes, matching and word games in minutes, or search ready ones by topic or textbook.', ru: 'Викторины, сопоставления и игры со словами за пару минут или готовые — по теме или учебнику.' },
  { id: 'learningapps', name: 'LearningApps', url: 'https://learningapps.org', subjects: ['any', 'english', 'languages'], levels: '1–11', cost: 'free',
    en: 'Interactive matching, ordering and quiz tasks; very popular with Russian teachers.', ru: 'Интерактивные задания на сопоставление, порядок и викторины; очень популярно у российских учителей.' },
  { id: 'baamboozle', name: 'Baamboozle', url: 'https://www.baamboozle.com', subjects: ['any', 'english'], levels: '1–11', cost: 'paid-extras',
    en: 'Team quiz games on the projector — no student devices needed.', ru: 'Командные викторины на проекторе — ученикам не нужны устройства.' },
  { id: 'liveworksheets', name: 'Liveworksheets', url: 'https://www.liveworksheets.com', subjects: ['any', 'english', 'languages'], levels: '1–11', cost: 'account',
    en: 'Turn worksheets into self-marking online exercises, or use thousands of ready ones.', ru: 'Превращайте рабочие листы в онлайн-упражнения с автопроверкой или берите готовые.' },
  { id: 'quizlet', name: 'Quizlet', url: 'https://quizlet.com', subjects: ['any', 'english', 'languages'], levels: '3–11', cost: 'paid-extras',
    en: 'Flashcard sets and word games for vocabulary practice at home.', ru: 'Наборы карточек и игры со словами для практики дома.' },
  { id: 'wayground', name: 'Wayground (formerly Quizizz)', url: 'https://wayground.com', subjects: ['any'], levels: '3–11', cost: 'paid-extras',
    en: 'Live and homework quizzes with instant results.', ru: 'Викторины в классе и на дом с мгновенными результатами.' },
  { id: 'flippity', name: 'Flippity', url: 'https://www.flippity.net', subjects: ['any'], levels: '1–11', cost: 'free',
    en: 'Turn a simple spreadsheet into flashcards, quiz shows, spinners and bingo.', ru: 'Превращает простую таблицу в карточки, викторины, колесо и бинго.' },
  { id: 'classroomscreen', name: 'Classroomscreen', url: 'https://classroomscreen.com', subjects: ['any'], levels: 'KG–11', cost: 'paid-extras',
    en: 'Timers, noise meter, random name picker and work symbols for the projector.', ru: 'Таймеры, шумомер, случайный выбор имени и значки работы для проектора.' },
  { id: 'mentimeter', name: 'Mentimeter', url: 'https://www.mentimeter.com', subjects: ['any'], levels: '5–11', cost: 'paid-extras',
    en: 'Live polls and word clouds from students’ phones.', ru: 'Опросы и облака слов в реальном времени с телефонов учеников.' },
  { id: 'padlet', name: 'Padlet', url: 'https://padlet.com', subjects: ['any'], levels: '3–11', cost: 'paid-extras',
    en: 'A shared online board for ideas, pictures and short answers.', ru: 'Общая онлайн-доска для идей, картинок и коротких ответов.' },

  // ── Russian language and literature ─────────────────────────────────
  { id: 'gramota', name: 'Грамота.ру', url: 'https://gramota.ru', subjects: ['russian'], levels: '5–11', cost: 'free', russian: true,
    en: 'Russian dictionaries, spelling rules and help with tricky cases.', ru: 'Словари, правила орфографии и помощь в трудных случаях.' },
  { id: 'arzamas', name: 'Arzamas', url: 'https://arzamas.academy', subjects: ['russian', 'humanities', 'art'], levels: '8–11', cost: 'free', russian: true,
    en: 'Short courses on literature, history and art for teenagers and adults.', ru: 'Короткие курсы по литературе, истории и искусству для подростков и взрослых.' },

  // ── Maths ────────────────────────────────────────────────────────────
  { id: 'math-playground', name: 'Math Playground', url: 'https://www.mathplayground.com', subjects: ['maths'], levels: '1–6', cost: 'free',
    en: 'Maths games, logic puzzles and word problems for primary school.', ru: 'Математические игры, логические задачи и текстовые задачи для начальной школы.' },
  { id: 'geogebra', name: 'GeoGebra', url: 'https://www.geogebra.org', subjects: ['maths'], levels: '5–11', cost: 'free',
    en: 'Interactive geometry, graphs and ready-made classroom activities (also in Russian).', ru: 'Интерактивная геометрия, графики и готовые задания (есть на русском).' },
  { id: 'desmos', name: 'Desmos', url: 'https://www.desmos.com', subjects: ['maths'], levels: '7–11', cost: 'free',
    en: 'A graphing calculator and classroom activities for algebra and functions.', ru: 'Графический калькулятор и задания по алгебре и функциям.' },
  { id: 'nrich', name: 'NRICH (University of Cambridge)', url: 'https://nrich.maths.org', subjects: ['maths'], levels: '1–11', cost: 'free',
    en: 'Rich problem-solving tasks and games for every age.', ru: 'Задачи на рассуждение и математические игры для любого возраста.' },
  { id: 'khan', name: 'Khan Academy', url: 'https://www.khanacademy.org', subjects: ['maths', 'science'], levels: '1–11', cost: 'free', youtube: true,
    en: 'Video explanations and practice exercises with progress tracking.', ru: 'Видеообъяснения и упражнения с отслеживанием прогресса.' },
  { id: 'sdamgia', name: 'РЕШУ ОГЭ / ЕГЭ', url: 'https://oge.sdamgia.ru', subjects: ['maths', 'russian', 'english', 'science', 'humanities'], levels: '9–11', cost: 'free', russian: true,
    en: 'Exam-style tasks with answers for ОГЭ and ЕГЭ practice in every subject.', ru: 'Задания в формате ОГЭ и ЕГЭ с ответами по всем предметам.' },

  // ── Science ──────────────────────────────────────────────────────────
  { id: 'phet', name: 'PhET Interactive Simulations', url: 'https://phet.colorado.edu', subjects: ['science', 'maths'], levels: '5–11', cost: 'free',
    en: 'Free physics, chemistry, biology and maths simulations (also in Russian).', ru: 'Бесплатные симуляции по физике, химии, биологии и математике (есть на русском).' },
  { id: 'nasa-space-place', name: 'NASA Space Place', url: 'https://spaceplace.nasa.gov', subjects: ['science'], levels: '1–6', cost: 'free',
    en: 'Space and Earth science games, crafts and explanations for children.', ru: 'Игры, поделки и объяснения о космосе и Земле для детей.' },
  { id: 'science-kids', name: 'Science Kids', url: 'https://www.sciencekids.co.nz', subjects: ['science'], levels: '1–6', cost: 'free',
    en: 'Science facts, quizzes, experiments and games for primary school.', ru: 'Научные факты, викторины, опыты и игры для начальной школы.' },

  // ── Music and art ────────────────────────────────────────────────────
  { id: 'chrome-music-lab', name: 'Chrome Music Lab', url: 'https://musiclab.chromeexperiments.com', subjects: ['music', 'english'], levels: 'KG–8', cost: 'free',
    en: 'Play with rhythm, melody and sound on the projector; great for song and action lessons.', ru: 'Ритм, мелодия и звук на проекторе; отлично для уроков с песнями и движением.' },
  { id: 'musictheory', name: 'musictheory.net', url: 'https://www.musictheory.net', subjects: ['music'], levels: '5–11', cost: 'free',
    en: 'Short music theory lessons and ear-training exercises.', ru: 'Короткие уроки теории музыки и упражнения для развития слуха.' },
  { id: 'classics-for-kids', name: 'Classics for Kids', url: 'https://www.classicsforkids.com', subjects: ['music'], levels: '1–6', cost: 'free',
    en: 'Composers, listening games and lesson plans about classical music.', ru: 'Композиторы, игры на слушание и планы уроков о классической музыке.' },
  { id: 'google-arts', name: 'Google Arts & Culture', url: 'https://artsandculture.google.com', subjects: ['art', 'humanities', 'english'], levels: '1–11', cost: 'free',
    en: 'Museum collections, virtual tours and art games — great picture prompts for speaking.', ru: 'Коллекции музеев, виртуальные экскурсии и игры — отличные картинки для говорения.' },
  { id: 'tate-kids', name: 'Tate Kids', url: 'https://www.tate.org.uk/kids', subjects: ['art'], levels: '1–6', cost: 'free',
    en: 'Art games, quizzes and ideas for making art with children.', ru: 'Игры, викторины и идеи для творчества с детьми.' },

  // ── History and geography ───────────────────────────────────────────
  { id: 'seterra', name: 'Seterra (geography quizzes)', url: 'https://www.geoguessr.com/seterra', subjects: ['humanities', 'english'], levels: '3–11', cost: 'free',
    en: 'Map quizzes on countries, capitals and flags — good for team games.', ru: 'Викторины по картам: страны, столицы, флаги — подходит для командных игр.' },
];

/** Which suggestion groups fit a subject the teacher typed (in English or Russian). */
export function subjectTags(subject: string | undefined): SubjectTag[] {
  const s = (subject ?? '').toLowerCase();
  if (!s || /english|англ/.test(s)) return ['english'];
  if (/german|french|spanish|chinese|italian|japanese|language|немец|француз|испан|китай|итальян|японск|иностран/.test(s)) return ['languages'];
  if (/russian|русск|литератур|literature/.test(s)) return ['russian'];
  if (/math|алгебр|геометр|математ/.test(s)) return ['maths'];
  if (/science|physics|chemistry|biology|физик|хими|биолог|окружающ|природ|естеств/.test(s)) return ['science'];
  if (/music|музык/.test(s)) return ['music'];
  if (/art|изо|рисован|искусств/.test(s)) return ['art'];
  if (/history|geograph|social|истори|географ|общество/.test(s)) return ['humanities'];
  return ['any'];
}

/** Suggestions for a subject: its own resources first, then tools for any subject. */
export function suggestionsFor(tag: SubjectTag, level?: string): Suggestion[] {
  const fits = (x: Suggestion) => !level || parseLevels(x.levels).includes(level);
  const own = SUGGESTIONS.filter((x) => x.subjects.includes(tag) && fits(x));
  const general = tag === 'any' ? [] : SUGGESTIONS.filter((x) => x.subjects.includes('any') && !x.subjects.includes(tag) && fits(x));
  return [...own, ...general];
}

export function suggestionToResource(x: Suggestion, lang: 'en' | 'ru', now = Date.now()): Resource {
  return {
    id: `sugg-${x.id}`,
    name: x.name,
    useFor: lang === 'ru' ? x.ru : x.en,
    levels: x.levels,
    levelTags: parseLevels(x.levels),
    link: x.url,
    skills: [],
    needsProjector: false,
    fileId: null,
    custom: true,
    updatedAt: now,
  };
}
