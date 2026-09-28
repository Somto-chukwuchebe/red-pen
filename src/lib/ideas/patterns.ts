// A bank of classic classroom activity patterns (written for Red Pen).
// The generator fills the placeholders with the lesson's own language:
//   {words}    — up to 6 key words     {word}  — one key word
//   {question} — a target question     {frame} — a sentence frame
//   {topic}    — what the lesson is about

export type Need = 'words' | 'questions' | 'frames' | 'topic';
export type Band = 'kg' | 'primary' | 'secondary';
export type StageHint = 'warm-up' | 'practice' | 'main' | 'review';

export interface Pattern {
  id: string;
  /** Classic game name, used to link to a matching game in the teacher's library. */
  game: string;
  needs: Need;
  bands: Band[];
  /** 'language' patterns suit language teaching; 'any' works for every subject. */
  subject: 'language' | 'any';
  energy: 'calm' | 'medium' | 'lively';
  stage: StageHint;
  en: { title: string; text: string };
  ru: { title: string; text: string };
}

const ALL: Band[] = ['kg', 'primary', 'secondary'];
const YOUNG: Band[] = ['kg', 'primary'];
const SCHOOL: Band[] = ['primary', 'secondary'];

export const PATTERNS: Pattern[] = [
  // ── Words ─────────────────────────────────────────────────────────────
  {
    id: 'flash-guess', game: 'Flash and guess', needs: 'words', bands: YOUNG, subject: 'any', energy: 'medium', stage: 'warm-up',
    en: { title: 'Flash and guess', text: 'Flash a picture card for one second; the first to say it wins a point. Cards: {words}.' },
    ru: { title: 'Угадай по вспышке', text: 'Покажите карточку на секунду — кто первым назовёт, получает очко. Карточки: {words}.' },
  },
  {
    id: 'whats-missing', game: "What's missing", needs: 'words', bands: ALL, subject: 'any', energy: 'calm', stage: 'practice',
    en: { title: 'What’s missing?', text: 'Show {words} on the board, children close their eyes, remove one. “What’s missing?” — they answer with a full word or sentence.' },
    ru: { title: 'Чего не хватает?', text: 'Выложите {words}, дети закрывают глаза, уберите одну карточку. «What’s missing?» — отвечают словом или фразой.' },
  },
  {
    id: 'slow-reveal', game: 'Slow reveal', needs: 'words', bands: ALL, subject: 'any', energy: 'calm', stage: 'warm-up',
    en: { title: 'Slow reveal', text: 'Uncover a picture of {word} bit by bit on the projector. Students guess with “Is it a…?”' },
    ru: { title: 'Медленное открытие', text: 'Постепенно открывайте картинку ({word}) на проекторе. Ученики угадывают: «Is it a…?»' },
  },
  {
    id: 'board-race', game: 'Board race', needs: 'words', bands: SCHOOL, subject: 'any', energy: 'lively', stage: 'review',
    en: { title: 'Board race', text: 'Two teams, one marker each. Call a category from today’s topic ({topic}); runners write a word, the team must say it aloud to score. Target words: {words}.' },
    ru: { title: 'Гонка у доски', text: 'Две команды, по маркеру. Назовите категорию по теме ({topic}); игроки пишут слово, команда должна произнести его вслух. Слова: {words}.' },
  },
  {
    id: 'mystery-bag', game: 'Mystery bag', needs: 'words', bands: YOUNG, subject: 'language', energy: 'calm', stage: 'practice',
    en: { title: 'Mystery bag', text: 'Put toys or picture cards for {words} in a cloth bag. A child feels one and guesses: “Is it a {word}?”' },
    ru: { title: 'Волшебный мешочек', text: 'Положите в мешочек игрушки или карточки ({words}). Ребёнок на ощупь угадывает: «Is it a {word}?»' },
  },
  {
    id: 'bingo', game: 'Bingo', needs: 'words', bands: ALL, subject: 'any', energy: 'calm', stage: 'practice',
    en: { title: 'Picture bingo', text: 'Children draw 4 of these in a grid: {words}. Call them out (or let a child call); first full row shouts “Bingo!” and reads their row back.' },
    ru: { title: 'Бинго с картинками', text: 'Дети рисуют в сетке 4 из слов: {words}. Называйте слова (или ведёт ребёнок); кто первым закрыл ряд — кричит «Bingo!» и читает свой ряд.' },
  },
  {
    id: 'hot-potato', game: 'Hot potato', needs: 'words', bands: YOUNG, subject: 'any', energy: 'lively', stage: 'practice',
    en: { title: 'Hot potato', text: 'Pass a ball to music. When it stops, show a card ({words}); whoever holds the ball names it, or answers “{question}”.' },
    ru: { title: 'Горячая картошка', text: 'Передавайте мяч под музыку. Музыка остановилась — покажите карточку ({words}); у кого мяч, тот называет её или отвечает на «{question}».' },
  },
  {
    id: 'loud-quiet', game: 'Loud and quiet', needs: 'words', bands: ['kg'], subject: 'language', energy: 'medium', stage: 'warm-up',
    en: { title: 'Loud and quiet', text: 'Say each word like a mouse, then like a lion: {words}. Children echo you with the same voice and a gesture.' },
    ru: { title: 'Тихо и громко', text: 'Говорите каждое слово как мышка, потом как лев: {words}. Дети повторяют тем же голосом и с жестом.' },
  },
  {
    id: 'touch-it', game: 'Touch something', needs: 'words', bands: ['kg'], subject: 'language', energy: 'lively', stage: 'practice',
    en: { title: 'Run and touch', text: 'Stick cards for {words} around the room. Call “Touch the {word}!” — children run, touch it and say the word.' },
    ru: { title: 'Беги и дотронься', text: 'Развесьте карточки ({words}) по классу. «Touch the {word}!» — дети бегут, касаются и называют слово.' },
  },
  {
    id: 'simon-says', game: 'Simon says', needs: 'words', bands: YOUNG, subject: 'language', energy: 'lively', stage: 'warm-up',
    en: { title: 'Simon says', text: 'Give commands with today’s words (“Simon says point to the {word}!”). Only move when you hear “Simon says”.' },
    ru: { title: 'Саймон говорит', text: 'Давайте команды с новыми словами («Simon says point to the {word}!»). Двигаемся, только если прозвучало «Simon says».' },
  },
  {
    id: 'charades', game: 'Charades', needs: 'words', bands: ALL, subject: 'any', energy: 'lively', stage: 'practice',
    en: { title: 'Charades', text: 'A child mimes one of {words}; the class guesses in a full sentence.' },
    ru: { title: 'Крокодил', text: 'Ребёнок изображает одно из слов ({words}); класс угадывает полным предложением.' },
  },
  {
    id: 'pictionary', game: 'Draw and guess', needs: 'words', bands: SCHOOL, subject: 'any', energy: 'medium', stage: 'practice',
    en: { title: 'Draw and guess', text: 'One student draws {word} (or another key word) on the board in 30 seconds; teams guess, then use it in a sentence.' },
    ru: { title: 'Рисуй и угадывай', text: 'Ученик за 30 секунд рисует на доске {word} (или другое слово урока); команды угадывают и составляют с ним предложение.' },
  },
  {
    id: 'odd-one-out', game: 'Odd one out', needs: 'words', bands: SCHOOL, subject: 'any', energy: 'calm', stage: 'warm-up',
    en: { title: 'Odd one out', text: 'Write groups of four words from {words} (add one that doesn’t belong). Pairs find the odd one out and explain why.' },
    ru: { title: 'Лишнее слово', text: 'Напишите группы по четыре слова из {words} (с одним лишним). Пары находят лишнее и объясняют почему.' },
  },
  {
    id: 'sort-it', game: 'Sort it', needs: 'words', bands: SCHOOL, subject: 'any', energy: 'calm', stage: 'practice',
    en: { title: 'Sort it', text: 'Mix cards for {words}. Groups sort them into two or three groups of their own choosing, then explain their groups to the class.' },
    ru: { title: 'Разложи по группам', text: 'Смешайте карточки ({words}). Группы делят их на две-три категории по своему выбору и объясняют классу.' },
  },

  // ── Questions ────────────────────────────────────────────────────────
  {
    id: 'find-someone', game: 'Find someone who', needs: 'questions', bands: SCHOOL, subject: 'language', energy: 'lively', stage: 'main',
    en: { title: 'Find someone who…', text: 'Everyone gets a grid of prompts and mingles asking “{question}”. Write a classmate’s name in each box, then report back.' },
    ru: { title: 'Найди того, кто…', text: 'У каждого сетка с заданиями; дети ходят по классу и спрашивают «{question}». Вписывают имена одноклассников и рассказывают о результатах.' },
  },
  {
    id: 'survey', game: 'Class survey', needs: 'questions', bands: SCHOOL, subject: 'language', energy: 'medium', stage: 'main',
    en: { title: 'Class survey', text: 'Each student asks five classmates “{question}” and records the answers, then reports: “Three people…”.' },
    ru: { title: 'Опрос класса', text: 'Каждый задаёт пятерым одноклассникам вопрос «{question}», записывает ответы и рассказывает: «Three people…».' },
  },
  {
    id: 'ball-toss', game: 'Ball toss', needs: 'questions', bands: YOUNG, subject: 'language', energy: 'medium', stage: 'warm-up',
    en: { title: 'Ball toss questions', text: 'Throw a soft ball and ask “{question}”. The catcher answers, then asks the same question and throws to someone new.' },
    ru: { title: 'Вопрос с мячом', text: 'Бросьте мяч и спросите «{question}». Поймавший отвечает, задаёт тот же вопрос и бросает дальше.' },
  },
  {
    id: 'hot-seat', game: 'Hot seat', needs: 'questions', bands: SCHOOL, subject: 'any', energy: 'medium', stage: 'main',
    en: { title: 'Hot seat', text: 'One student sits facing the class as a character from today’s topic ({topic}). The class interviews them, starting with “{question}”.' },
    ru: { title: 'Горячий стул', text: 'Ученик садится лицом к классу в роли персонажа по теме ({topic}). Класс берёт у него интервью, начиная с «{question}».' },
  },
  {
    id: 'chat-circles', game: 'Inside-outside circles', needs: 'questions', bands: SCHOOL, subject: 'any', energy: 'medium', stage: 'main',
    en: { title: 'Inside–outside circles', text: 'Two circles face each other. Partners ask and answer “{question}” for 30 seconds, then the outer circle moves one step.' },
    ru: { title: 'Карусель', text: 'Два круга лицом друг к другу. Пары 30 секунд спрашивают и отвечают «{question}», затем внешний круг сдвигается.' },
  },
  {
    id: 'twenty-questions', game: '20 questions', needs: 'words', bands: SCHOOL, subject: 'any', energy: 'calm', stage: 'practice',
    en: { title: '20 questions', text: 'Think of one of {words}. The class asks yes/no questions to find it in fewer than 20 tries.' },
    ru: { title: '20 вопросов', text: 'Загадайте одно из слов ({words}). Класс задаёт вопросы «да/нет» и должен угадать меньше чем за 20 попыток.' },
  },

  // ── Frames ───────────────────────────────────────────────────────────
  {
    id: 'model-chunk', game: 'Model the chunk', needs: 'frames', bands: YOUNG, subject: 'language', energy: 'calm', stage: 'practice',
    en: { title: 'Model the dialogue', text: 'Act “{frame}” with a volunteer or puppet. Class repeats in chorus, then halves, then rows, then pairs.' },
    ru: { title: 'Покажи диалог', text: 'Разыграйте «{frame}» с добровольцем или игрушкой. Класс повторяет хором, затем половинами, рядами и в парах.' },
  },
  {
    id: 'chain', game: 'Chain game', needs: 'frames', bands: ALL, subject: 'language', energy: 'medium', stage: 'practice',
    en: { title: 'Memory chain', text: 'Around the circle, each child says the frame and adds their own ending, repeating the ones before: “{frame}”.' },
    ru: { title: 'Цепочка', text: 'По кругу каждый говорит фразу со своим окончанием и повторяет предыдущие: «{frame}».' },
  },
  {
    id: 'stand-up-if', game: 'Stand up if', needs: 'frames', bands: YOUNG, subject: 'language', energy: 'lively', stage: 'warm-up',
    en: { title: 'Stand up if…', text: 'Say sentences with “{frame}”. Children stand if it’s true for them and repeat the sentence about themselves.' },
    ru: { title: 'Встань, если…', text: 'Говорите предложения по модели «{frame}». Дети встают, если это про них, и повторяют фразу о себе.' },
  },
  {
    id: 'two-truths', game: 'Two truths and a lie', needs: 'frames', bands: ['secondary'], subject: 'language', energy: 'calm', stage: 'main',
    en: { title: 'Two truths and a lie', text: 'Each student writes three sentences using “{frame}”, one false. The class asks questions to find the lie.' },
    ru: { title: 'Две правды и ложь', text: 'Каждый пишет три предложения по модели «{frame}», одно — ложное. Класс задаёт вопросы и ищет ложь.' },
  },
  {
    id: 'role-play', game: 'Role-play', needs: 'frames', bands: SCHOOL, subject: 'language', energy: 'medium', stage: 'main',
    en: { title: 'Mini role-play', text: 'Set up a quick scene about {topic}. Pairs act it using “{frame}”; two pairs perform for the class.' },
    ru: { title: 'Мини-сценка', text: 'Короткая сцена по теме «{topic}». Пары разыгрывают её, используя «{frame}»; две пары выступают перед классом.' },
  },
  {
    id: 'mingle', game: 'Mingle with role cards', needs: 'frames', bands: ['secondary'], subject: 'language', energy: 'lively', stage: 'main',
    en: { title: 'Role-card mingle', text: 'Give everyone a role card linked to {topic}. They meet as many people as possible using “{frame}”, then report who they met.' },
    ru: { title: 'Знакомство по карточкам', text: 'Раздайте карточки ролей по теме «{topic}». Ученики знакомятся с как можно большим числом людей, используя «{frame}», и рассказывают, с кем встретились.' },
  },

  // ── Topic (open speaking, any subject) ───────────────────────────────
  {
    id: 'would-you-rather', game: 'Would you rather', needs: 'topic', bands: SCHOOL, subject: 'language', energy: 'medium', stage: 'warm-up',
    en: { title: 'Would you rather…?', text: 'Ask two-choice questions about {topic}. Students move to one side of the room and say why: “I’d rather… because…”.' },
    ru: { title: 'Что бы ты выбрал?', text: 'Задавайте вопросы с двумя вариантами по теме «{topic}». Ученики переходят на одну сторону класса и объясняют: «I’d rather… because…».' },
  },
  {
    id: 'four-corners', game: 'Debate', needs: 'topic', bands: ['secondary'], subject: 'any', energy: 'medium', stage: 'main',
    en: { title: 'Four corners', text: 'Read a statement about {topic}. Students go to Agree / Disagree / Not sure / It depends and justify their choice.' },
    ru: { title: 'Четыре угла', text: 'Прочитайте утверждение по теме «{topic}». Ученики идут в угол «Согласен / Не согласен / Не уверен / Зависит» и объясняют выбор.' },
  },
  {
    id: 'just-a-minute', game: 'Just a minute', needs: 'topic', bands: ['secondary'], subject: 'any', energy: 'calm', stage: 'main',
    en: { title: 'Just a minute', text: 'In pairs, each student talks about {topic} for 60 seconds without stopping; the partner asks one follow-up question.' },
    ru: { title: 'Ровно минута', text: 'В парах каждый 60 секунд говорит без остановки на тему «{topic}»; партнёр задаёт один уточняющий вопрос.' },
  },
  {
    id: 'diamond', game: 'Diamond ranking', needs: 'topic', bands: ['secondary'], subject: 'any', energy: 'calm', stage: 'main',
    en: { title: 'Diamond ranking', text: 'Groups get nine cards about {topic} and rank them in a diamond, most important at the top, then defend their top card.' },
    ru: { title: 'Ромб приоритетов', text: 'Группы получают девять карточек по теме «{topic}», выстраивают их ромбом по важности и защищают верхнюю карточку.' },
  },
  {
    id: 'picture-talk', game: 'Picture talk', needs: 'topic', bands: ALL, subject: 'any', energy: 'calm', stage: 'warm-up',
    en: { title: 'Picture talk', text: 'Show one picture about {topic}. How many things can the class say about it in two minutes? Count the sentences on the board.' },
    ru: { title: 'Говорим по картинке', text: 'Покажите картинку по теме «{topic}». Сколько предложений о ней класс скажет за две минуты? Считайте на доске.' },
  },
  {
    id: 'think-pair-share', game: 'Think-pair-share', needs: 'topic', bands: SCHOOL, subject: 'any', energy: 'calm', stage: 'main',
    en: { title: 'Think–pair–share', text: 'Ask one open question about {topic}. One minute to think alone, two to discuss in pairs, then pairs share with the class.' },
    ru: { title: 'Подумай — обсуди — поделись', text: 'Задайте открытый вопрос по теме «{topic}». Минута подумать самому, две — обсудить в паре, затем пары делятся с классом.' },
  },
  {
    id: 'team-quiz', game: 'Quiz', needs: 'topic', bands: SCHOOL, subject: 'any', energy: 'lively', stage: 'review',
    en: { title: 'Team quiz', text: 'Quick-fire team quiz on {topic} (Baamboozle or on the board). Teams only score if they answer in a full sentence.' },
    ru: { title: 'Командная викторина', text: 'Быстрая викторина по теме «{topic}» (Baamboozle или на доске). Очко засчитывается только за ответ полным предложением.' },
  },
  {
    id: 'true-false', game: 'True or false', needs: 'topic', bands: ALL, subject: 'any', energy: 'lively', stage: 'review',
    en: { title: 'True or false?', text: 'Say statements about {topic}. Stand up for true, sit down for false; a volunteer corrects the false ones.' },
    ru: { title: 'Правда или нет?', text: 'Говорите утверждения по теме «{topic}». Правда — встаём, неправда — садимся; доброволец исправляет неверные.' },
  },
  {
    id: 'explain-partner', game: 'Explain to a partner', needs: 'topic', bands: SCHOOL, subject: 'any', energy: 'calm', stage: 'practice',
    en: { title: 'Explain it to a partner', text: 'Partner A explains today’s idea ({topic}) in their own words for one minute; B asks a question; then swap.' },
    ru: { title: 'Объясни партнёру', text: 'Партнёр A минуту объясняет своими словами тему урока («{topic}»); B задаёт вопрос; затем меняются.' },
  },
  {
    id: 'gallery-walk', game: 'Gallery walk', needs: 'topic', bands: SCHOOL, subject: 'any', energy: 'medium', stage: 'main',
    en: { title: 'Gallery walk', text: 'Groups make a quick poster about part of {topic}, then walk round the room and leave one question on each poster.' },
    ru: { title: 'Галерея', text: 'Группы делают короткий плакат о части темы «{topic}», затем обходят класс и оставляют на каждом плакате вопрос.' },
  },
  {
    id: 'exit-ticket', game: 'Exit ticket', needs: 'topic', bands: SCHOOL, subject: 'any', energy: 'calm', stage: 'review',
    en: { title: 'Exit ticket', text: 'Before leaving, each student says (or writes) one thing they learned about {topic} and one question they still have.' },
    ru: { title: 'Билет на выход', text: 'Перед уходом каждый говорит (или пишет) одну вещь, которую узнал о теме «{topic}», и один оставшийся вопрос.' },
  },
  {
    id: 'freeze-dance', game: 'Freeze dance', needs: 'topic', bands: ['kg'], subject: 'any', energy: 'lively', stage: 'practice',
    en: { title: 'Freeze dance', text: 'Dance to music; when it stops, freeze and name the picture you hold up about {topic}.' },
    ru: { title: 'Замри!', text: 'Танцуем под музыку; музыка остановилась — замираем и называем картинку по теме «{topic}», которую вы показываете.' },
  },
  {
    id: 'action-song', game: 'Action song', needs: 'topic', bands: ['kg'], subject: 'any', energy: 'lively', stage: 'warm-up',
    en: { title: 'Action song', text: 'Sing a short song about {topic} with a gesture for every key word; next time, stop singing and let the children fill in the words.' },
    ru: { title: 'Песня с движениями', text: 'Спойте короткую песню по теме «{topic}» с жестом на каждое ключевое слово; в следующий раз замолкайте и пусть дети допевают слова.' },
  },
];
