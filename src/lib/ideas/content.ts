// Pulls usable language out of a lesson's key language and focus:
//   words      — short items to practise ("frog", "horse", "teddy bear")
//   questions  — "How old are you?", "Can you swim?"
//   frames     — sentence patterns ("I can… / I can't…", "It's got blue eyes.")
//   topic      — what the lesson is about, for open speaking tasks

export interface LessonContent {
  words: string[];
  questions: string[];
  frames: string[];
  topic: string;
}

const clean = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,.·–-]+|[\s;,·–-]+$/g, '')
    .trim();

const unique = (xs: string[]) => {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = x.toLowerCase();
    if (!x || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const isQuestion = (s: string) => /\?\s*$/.test(s) || /\?\s+(Yes|No|It'?s|I'?m|She|He|They)\b/i.test(s);
/** "I like… / I don't like…", "It's got…", "Where's Grandma? She's in the kitchen." */
const isFrame = (s: string) => /(…|\.\.\.|\/)/.test(s) || /^(I|I'm|It|It's|He|She|They|We|This|There|My|You|Let's)\b/.test(s) || s.split(' ').length >= 4;

export function extractContent(keyLanguage: string, focus: string): LessonContent {
  const words: string[] = [];
  const questions: string[] = [];
  const frames: string[] = [];

  // Remove labels like "Weeks 1–2:", "Words:", "Phrases:" that the importer adds.
  const kl = keyLanguage.replace(/Weeks? \d(–\d)?:\s*/g, '').replace(/\b(Words|Phrases):\s*/g, '');
  const chunks = kl
    .split(/\s+·\s+|;\s+|\n/)
    .map(clean)
    .filter(Boolean);

  for (const chunk of chunks) {
    // Split "How old are you? I'm…" into the question and the answer frame.
    const qa = /^(.+?\?)\s+(.+)$/.exec(chunk);
    if (qa && !/\?$/.test(qa[2])) {
      questions.push(clean(qa[1]));
      frames.push(clean(qa[2]));
      continue;
    }
    if (isQuestion(chunk)) {
      questions.push(clean(chunk));
      continue;
    }
    const parts = chunk.split(/,\s*/).map(clean).filter(Boolean);
    // A list of short items is vocabulary; anything else is a sentence frame.
    if (parts.length >= 2 && parts.every((p) => p.split(' ').length <= 3 && !/[.!?…]$/.test(p))) {
      words.push(...parts);
    } else if (isFrame(chunk)) {
      frames.push(chunk);
    } else if (chunk.split(' ').length <= 3) {
      words.push(chunk);
    } else {
      frames.push(chunk);
    }
  }

  // The focus often contains the lesson's target question or sentence.
  const focusParts = focus.split(/(?<=[.?!])\s+|:\s+/).map(clean).filter(Boolean);
  for (const p of focusParts) {
    if (isQuestion(p) && p.split(' ').length <= 10) questions.push(p);
    else if (/^(I|It|He|She|They|We|My|This|There)\b.*[.!]$/.test(p) && p.split(' ').length <= 10) frames.push(p);
  }

  const topic = clean(focus.split(/[:;]/)[0] || focus) || clean(chunks[0] ?? '');
  return {
    words: unique(words.map((w) => w.replace(/[.!]$/, ''))),
    questions: unique(questions),
    frames: unique(frames),
    topic,
  };
}
