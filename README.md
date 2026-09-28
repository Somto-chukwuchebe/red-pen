# Red Pen

A teaching workspace: today's lessons, the year's curriculum, the timetable, groups, a 30-second lesson log, a lesson planner with activity ideas, and a games and resources library. Progress tracking, and classroom tools for the projector. Built for English speaking clubs, and usable by any teacher.

- **Works offline.** Once opened, everything is cached on the device.
- **Private.** No accounts, no server. Children's names and notes never leave your devices.
- **Works in Russia without a VPN.** No Google Fonts, analytics or CDNs. Fonts and icons are bundled.

> The app's name lives in one place, `src/config.ts` (`APP_NAME`). Change it there and rebuild.

---

## Contents

0. [Daily use](#0-daily-use)
1. [Run it on your MacBook](#1-run-it-on-your-macbook)
2. [Install it on each device](#2-install-it-on-each-device)
3. [Back up, restore and move your data](#3-back-up-restore-and-move-your-data)
4. [Publish it on GitHub Pages](#4-publish-it-on-github-pages)
5. [Import your curriculum](#5-import-your-curriculum)
6. [Native iPhone and Android apps with widgets](#6-native-iphone-and-android-apps-with-widgets)
7. [For the curious: how it's built](#7-for-the-curious-how-its-built)
8. [Sharing Red Pen with other teachers](#8-sharing-red-pen-with-other-teachers)

---

## 0. Daily use

- **Today** lists today's lessons in order, with each group's next planned lesson. The next one is marked **Next**.
  - **Start lesson** shows the plan in big type, which works well on the projector: focus, key language, games and lesson stages with minutes. When you're done, tap **Done** or press **D**.
  - **Log** opens the quick log straight away.
- **The 30-second log:**
  1. Everyone is present unless you tap ✓ next to a name to mark them absent.
  2. **Participation** is optional: rate how each child took part in the lesson's activities, from 1 to 5 (1 Not engaged · 2 Reluctant · 3 OK · 4 Active · 5 Outstanding). **Everyone 4** fills the whole class, so you only change the few who stood out. Tap a number again to clear it.
  3. Tap what worked, and optionally the class energy (1–5, or press the number keys) and a note.
  4. Tap **Done** or press **D**.

  The group then moves on to its next planned lesson automatically. Cancelled lessons and test-week reviews don't move it on, and you can change where it goes under "Next time".

  **Low participation:** by default, a child rated 1–2 in each of their last 3 or more rated lessons (absences and unrated lessons are skipped) is flagged in amber ⚠ in the log, on the group page and on **Progress**. You can change where the flag starts in **Settings → Participation flags**: what counts as low (1 only, 1–2 or 1–3) and how many lessons in a row (2–6).
- **Week** shows the whole week: planned, taught, not logged yet (amber) and cancelled. Tap a lesson to log it or edit its log.
- **Groups → a group** has:
  - the progress bar and "Change the next lesson";
  - students (paste a list of names);
  - the can-do checklist for the current module;
  - **Participation**: the class average per lesson over time, and a grid of each student's ratings in recent lessons;
  - **Can-do** for the whole group, or **Each student** (tap a box: Not yet → Emerging → Secure);
  - the lesson history, with an **Attendance (CSV)** export for Excel or Google Sheets;
  - **Term summary**: a short report for the term (English or Russian, with or without names) to copy into a message, plus a per-student spreadsheet.
- **Progress** (sidebar, or **More** on phones) shows every group's coverage against where the plan says it should be by now (from the module months, or the school weeks gone), and every student who needs attention.

### Classroom tools (for the projector)

**Tools** (sidebar, **More** on phones, or the **Tools** button on the Start lesson screen) opens big, simple screens for the board. **Full screen** hides everything else, and **Esc** goes back to the list of tools. The group you pick is remembered.

| Tool | What it does | Keys |
|---|---|---|
| **Random student** | Picks a name from the group. Nobody is picked twice until everyone has had a turn, and the same child is never picked twice in a row across rounds. **New round** starts again. | Space or Enter: pick |
| **Scoreboard** | 2–4 teams with big + and − buttons. Team names can be edited; scores are kept until you reset. | 1–4: add a point · Shift+1–4: take one away |
| **Timer** | 1, 2, 3, 5 or 10 minutes, or your own time. Beeps at the end. It works from the clock, so it stays right even if the screen sleeps. | Space: start/pause · R: reset |
| **Dice** | 1–3 dice, with the total. | Space or Enter: roll |
| **Spinner wheel** | Your own list, the group's names, or the key words of the next lesson. Can remove each result so it doesn't come up again. | Space or Enter: spin |
| **Lesson stages** | Walks through the next lesson's plan (or your lesson framework) with a countdown for each stage and the time left in the lesson. Beeps once when a stage's time is up, then shows overtime in amber. | Space: start/pause · ←/→: stage |

On iPhone the beep only plays after you've tapped the screen once, and not when the phone is on silent.

### Planning and the library

- **Plan a lesson.** Use **Plan this lesson** (on a lesson in Curriculum), **Plan the next lesson** (on a group's page) or **Plan this lesson** on the Start lesson screen.
  - Start from your lesson framework or a blank plan. Each stage has a name, minutes and notes.
  - The total must match the lesson length. Red Pen warns in amber if it doesn't, and **Fit to N min** rescales the stages.
  - **Activity ideas** are made on the device from the lesson's topic and key language, using your own library first. Games played with this group recently are marked and suggested less. Tap **Add** to put an idea into a stage; **More ideas** gives a fresh set.
  - **Lesson card** prints a one-page plan, or saves it as a PDF.
- **Parallel groups** (e.g. 2a and 2b) share a curriculum, so they share each lesson's plan. In the planner, **Teach this next** gives another group the same lesson next; log each group separately.
- **Library** (sidebar, or **More** on phones) holds your games and resources. Levels run from kindergarten through grades 1–11 (write ranges like `KG–4`, `5–11` or `3`). Search and filter by level, skill, energy, prep time and projector. Choose a group to see what you've played with it, least recent first. Add, edit or delete anything, and attach a link or a file (stored on the device and included in backups). New teachers can add a starter set of 22 classic games, written for Red Pen, and edit them freely.
- **Suggested online resources** (Library → Resources) lists about 60 websites chosen for the teacher's subject: English, other languages, Russian, maths, science, music, art, history and geography, plus tools for any subject. They include Russian platforms such as Учи.ру, ЯКласс, Skysmart, РЭШ and МЭШ. Each shows its grades and cost and whether it's in Russian, and flags YouTube-based videos, which are slow in Russia. **Add to my library** makes it your own editable resource. The list is in `src/seed/suggestedResources.ts`.
- **Curriculum → Edit** lets you add, edit, reorder and delete modules and lessons, or create a new curriculum from scratch.

---

## 1. Run it on your MacBook

You need [Node.js](https://nodejs.org) (the "LTS" version). Check it's there by opening **Terminal** and typing `node -v`; you should see a version number.

The first time only, open Terminal in the project folder (Finder → right-click the `Red Pen` folder → **New Terminal at Folder**) and run:

```bash
npm install
```

Then, every time you want to run it:

```bash
npm start
```

Open the address it prints (usually <http://localhost:5173>). Your phone can open the second address (**Network: http://192.168.…:5173**) if it's on the same Wi-Fi. That's handy for a quick look, but install from the GitHub Pages address (section 4) for real use, because an installed app needs a secure `https://` address.

Stop it with **Ctrl + C**.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the automatic checks (curriculum import, schedule, backups…) |
| `npm run build` | Builds the finished app into the `dist` folder |
| `npm run preview` | Serves the finished build locally, to try it exactly as it will be published |
| `npm run check-curriculum` | Checks a Word curriculum and shows what would be imported (see section 5) |

---

## 2. Install it on each device

Open Red Pen's web address (section 4) on the device, then follow the steps below. The app also has an **Install** page (in **More** on phones) that detects your device and shows these steps with pictures.

> **Each device keeps its own data.** Installing on a new device gives you a fresh copy. Bring your data across with **Backup & move** (section 3).

### iPhone (iOS 16.4 or later)

1. Open the address in **Safari**.
2. Tap **Share** (the square with an up arrow) at the bottom.
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. From now on, always open Red Pen from its Home Screen icon.

**Why this matters on iPhone:** Safari can delete website data you haven't opened for a few weeks. Apps on the Home Screen are protected from this. Data in Safari and in the installed app are separate, so install first and add your data in the installed app.

### MacBook (macOS Sonoma or later)

1. Open the address in **Safari**.
2. Menu bar → **File → Add to Dock…** → **Add**.
3. Red Pen now has its own Dock icon and window, which is ideal for the projector.

(Or use Chrome/Edge: click the install icon at the right of the address bar.)

### Android

1. Open the address in **Chrome**.
2. Tap **⋮** → **Install app** (or **Add to Home screen** → **Install**).

### Windows or another laptop

1. Open the address in **Chrome** or **Edge**.
2. Click the install icon at the right end of the address bar (a monitor with a down arrow) → **Install**.

### Is my data protected?

Open **Settings → Storage**. "Protected" means the browser has agreed not to clear Red Pen's data to free up space. If it says "Not protected yet", tap **Ask for protection**. Installed apps usually get this automatically.

---

## 3. Back up, restore and move your data

Everything is in **Backup & move** (in **More** on phones).

- **Back up:** tap **Export all data**. On iPhone and Android the share sheet opens: choose **Save to Files**, or send it to yourself (Telegram "Saved Messages", email). On a laptop the file downloads.
  The file is named like `red-pen-iPhone-2026-09-28-1405.json`.
- **Restore or bring data in:** tap **Choose a backup file**. You'll see what the file contains, and what will be added, updated or removed, before anything changes. Then pick:
  - **Merge:** keep what's on this device and add what's new in the file. If the same thing was changed in both places, the newer change wins. Deleted things stay deleted.
  - **Replace:** make this device exactly like the file.
- **Which device has my latest data?** The status card shows when data last changed on this device, when you last backed it up, and which device the last import came from. If this device has changes that aren't in any backup, it says so.
- **Reminder:** if you've made changes and haven't backed up for 7 days, Red Pen shows a reminder on Today. You can change the number of days in **Settings**.

**Moving to another device:** export on the device with your latest data → send the file to the other device → there, **Choose a backup file** → **Replace** (if the other device is new) or **Merge** (if both have data you want).

---

## 4. Publish it on GitHub Pages

GitHub Pages hosts the app for free at `https://somto-chukwuchebe.github.io/red-pen/`. Only the app's code is public there; your data stays on your devices.

Nothing personal is published: no curriculum, games, students or logs. Those live only on your devices.

One-time setup:

1. On github.com, create a new repository called **red-pen** (it can be public; Pages on private repositories needs a paid plan).
2. In Terminal, in the project folder:
   ```bash
   git remote add origin https://github.com/Somto-chukwuchebe/red-pen.git
   git push -u origin main
   ```
3. On GitHub: **red-pen → Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to turn green (about 2 minutes). Your app is live at the address above.

After that, every `git push` publishes the new version automatically. Installed copies update themselves the next time they're opened with internet.

The workflow is in `.github/workflows/deploy.yml`. It runs the tests first and won't publish if any fail.

---

## 5. Import your curriculum

Red Pen has **no built-in curriculum**. Each teacher imports their own, so your curriculum lives only on your devices and never in the published app or the GitHub repository.

1. On the device, open **Settings → Curriculum → Import from Word or PDF** and choose your document (`.docx` or `.pdf`).
2. Red Pen reads it **on that device** (nothing is uploaded) and shows what it found: modules and lessons per curriculum, lesson frameworks, games and resources, plus anything it couldn't read.
3. Tap **Import**. Then, for each group, choose its curriculum in **Groups → the group → Edit**. The group starts at the first lesson; change that with "Change the next lesson".
4. **After editing the document**, import it again. Imported modules and lessons are refreshed. Lessons you added by hand, lesson plans you've filled in, and each group's position are kept.

**On a new device of yours**, either restore a backup (which brings everything: curriculum, groups, logs) or import the Word file again.

**Checking a document on the computer (optional):** keep it at `docs/curriculum.docx` (this folder is ignored by git, so it's never published) and run:

```bash
npm run check-curriculum
```

It prints the same summary without changing anything.

What the importer expects (see `src/import/parseCurriculum.ts`):

- `## Kindergarten`, with a `###` per group. Little group: *Month | Weeks 1–2 theme | Weeks 3–4 theme | Songs and rhymes | Play*. Middle/Older: *Month | Theme | Core words | Phrases | Songs | Games*.
- `## Grades 2–4`, with `### Grade N`. A bold line like "**Module 3: Food (Nov).** Key language: …", then a table *Week | Lesson A | Lesson B*. A "Review and show" module described in prose gets 8 lessons built from its description.
- `## Grades 5–8`, with `### Grade N`: *Module (month) | Lesson 1 | Lesson 2 | Lesson 3*. Empty cells ("–") are skipped.
- Optional: `## Lesson frameworks` (stage tables with minutes), `## Games bank` (*Game | Levels | How it works | Prep*), `## Resources` (*Resource | Use it for | Levels*, links kept).

**Word or PDF?** Word is exact: it keeps real headings and tables. A PDF only stores words and lines, so Red Pen rebuilds the structure from font sizes, bold text and table borders. Tested on your curriculum, the PDF gave exactly the same 525 lessons as the Word file. For PDFs:
- export from Word or Google Docs (a scanned PDF has no text to read);
- keep table borders visible;
- make headings bigger than body text;
- always check the preview (**Show every lesson found**) before importing.

You can also build or change a curriculum by hand: **Curriculum → Edit** or **New curriculum**.

---

## 6. Native iPhone and Android apps with widgets

*Planned for Phase 6.* This section will explain building the Capacitor apps in Xcode and Android Studio, installing them on your phones, and moving your data from the web app into the native app.

---

## 7. For the curious: how it's built

| Tool | Why |
|---|---|
| **Vite** + **React** + **TypeScript** | The app framework and build tool |
| **Tailwind CSS** | Styling, including light and dark mode |
| **Dexie** (IndexedDB) | The on-device database; `dexie-react-hooks` keeps screens live |
| **React Router** | Pages, with `#/…` addresses so GitHub Pages and the future native app need no server setup |
| **vite-plugin-pwa** | Makes it installable and offline; `@vite-pwa/assets-generator` makes all the icons and iPhone splash screens from `public/icon.svg` |
| **date-fns** | Date maths for weeks, quarters and holidays |
| **Recharts** | Progress charts (Phase 4) |
| **lucide-react** | Icons |
| **@fontsource-variable/inter**, **source-serif-4** | Fonts bundled into the app (Latin + Cyrillic) |
| **Vitest** + **Testing Library** + **fake-indexeddb** | Automatic tests |
| **mammoth**, **node-html-parser** | Read a Word curriculum inside the app. Loaded only when you import |
| **pdfjs-dist** (Mozilla pdf.js) | Reads a PDF curriculum inside the app. Loaded only when you import; cached so it works offline |
| **tsx** | Runs the optional `check-curriculum` script |

### Where things live

```
src/
  config.ts              app name and brand colours
  domain/types.ts        the data model
  db/                    database schema, saving/deleting, first-run setup, backups
  lib/                   pure logic: calendar, schedule, timetable checks, lesson pointer, stages,
                         activity ideas (lib/ideas), participation flags, progress, term summary,
                         classroom tools (picker, dice, wheel, clocks), sounds, platform detection
  i18n/en.ts, ru.ts      every piece of text in English and Russian
  pages/                 the screens (pages/tools: the classroom tools)
  components/            shared building blocks
  import/                reading a curriculum document (Word or PDF)
  seed/                  example groups and the default calendar
scripts/check-curriculum.ts    optional: check a Word curriculum on the computer
docs/                          your private documents (ignored by git)
public/icon.svg                the app icon (all other icons are generated from it)
```

### Data model notes

The model follows the brief, with these changes:

- **Groups point to a curriculum key** (e.g. `grade-2`, `kg-older`), not just a type or grade. Parallel groups share one curriculum, and KG Older 1 and 2 share one plan.
- **Groups store their exact next lesson** (`currentPlannedLessonId`); the current module is worked out from it.
- **Lesson frameworks are data**, imported from the curriculum document, with minutes per lesson length for kindergarten.
- **Class-teacher notes (`TeacherSync`)** have no screen any more; the table stays in the database only so older backups still import cleanly.
- **Can-do** is split into statements (per module) and marks (per group or per student).
- **"Times used / last used" for games** is calculated from lesson logs, so it can never drift out of step.
- **Every record has an `updatedAt` time**, and deletions are remembered, so **Merge** can combine two devices safely.
- **Attendance stores only absences**, because everyone is present by default.

### Database changes (migrations)

- **v2:** the library covers kindergarten to grade 11. Imported games and resources written for grades 2–8 were widened once ("5–8" → "5–11", "2–4" → "1–4"). Items you created yourself keep the range you chose, and backups made before v2 get the same widening when restored. Re-importing a document keeps the levels already in your library, but a fresh import on a new device uses the document's ranges. To keep KG–11 there too, restore a backup, or update the Levels column in your document.


`src/db/db.ts` defines the schema as `db.version(1)`. To change it later, add `db.version(2).stores({...}).upgrade(...)` below; existing data on every device is upgraded automatically the next time it opens.

---

## 8. Sharing Red Pen with other teachers

Send them the address: `https://somto-chukwuchebe.github.io/red-pen/`.

- **Everyone's data is separate and private.** Red Pen stores data only on the device where it's entered. Another teacher using the same address sees none of your groups, students or notes, and you see none of theirs.
- **First launch shows a setup wizard.** A new teacher chooses the language (English or Russian), enters their subject, then:
  - **starts from the example groups**, ticking the ones they need and renaming them;
  - **adds their own groups** (name, lessons per week, lesson length); or
  - **restores a backup** from another device.
  Then they set their school year: week 1, terms (quarters or trimesters) and holidays.
- **Curriculum:** there's no built-in curriculum. Each teacher imports their own from a Word document or PDF (section 5), or builds one by hand in **Curriculum**. The same goes for the games and resources library: each teacher's is their own.
- **Everything is customisable afterwards:** groups can be added, edited, archived or deleted, and name, subject, calendar and language are in **Settings**.
- Your own devices never see the wizard; it only appears on a device with no Red Pen data yet.
