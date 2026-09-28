# Red Pen

A teaching workspace for English speaking clubs: today's lessons, the year's curriculum, the timetable, groups and (coming next) lesson logs, progress and classroom tools.

- **Works offline.** Once opened, everything is cached on the device.
- **Private.** No accounts, no server. Children's names and notes never leave your devices.
- **Works in Russia without a VPN.** No Google Fonts, analytics or CDNs. Fonts and icons are bundled.

> The app's name lives in one place, `src/config.ts` (`APP_NAME`). Change it there and rebuild.

---

## Contents

1. [Run it on your MacBook](#1-run-it-on-your-macbook)
2. [Install it on each device](#2-install-it-on-each-device)
3. [Back up, restore and move your data](#3-back-up-restore-and-move-your-data)
4. [Publish it on GitHub Pages](#4-publish-it-on-github-pages)
5. [Re-import the curriculum](#5-re-import-the-curriculum)
6. [Native iPhone and Android apps with widgets](#6-native-iphone-and-android-apps-with-widgets)
7. [For the curious: how it's built](#7-for-the-curious-how-its-built)

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
| `npm run import-curriculum` | Reads `docs/curriculum.docx` and shows a summary (see section 5) |

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

**Note:** the curriculum is built into the app, so your curriculum text (not your students' data) is visible to anyone who opens that address.

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

## 5. Re-import the curriculum

1. Export your curriculum document as Word (`.docx`) and save it as `docs/curriculum.docx` (replace the old one).
2. Check what the importer finds (this writes nothing):
   ```bash
   npm run import-curriculum
   ```
   It prints the number of modules and lessons for each curriculum and group, and lists anything it couldn't read. Fix those in the document and run it again.
3. When the summary looks right, save it for the app:
   ```bash
   npm run import-curriculum -- --write
   ```
4. Publish (`git add -A && git commit -m "Update curriculum" && git push`).
5. On each device, open Red Pen → **Settings → Curriculum → Load the new curriculum**.
   Imported modules and lessons are replaced. Lessons you added by hand, lesson plans you've filled in, and each group's position are kept.

What the importer expects (see `scripts/lib/parse-curriculum.ts`):

- `## Kindergarten`, with a `###` per group. Little group: *Month | Weeks 1–2 theme | Weeks 3–4 theme | Songs and rhymes | Play*. Middle/Older: *Month | Theme | Core words | Phrases | Songs | Games*.
- `## Grades 2–4`, with `### Grade N`. A bold line "**Module 3: Tasty treats (Nov).** Key language: …", then a table *Week | Lesson A | Lesson B*. A "Review and show" module described in prose gets 8 lessons built from its description.
- `## Grades 5–8`, with `### Grade N`: *Module (month) | Lesson 1 | Lesson 2 | Lesson 3*. Empty cells ("–") are skipped.
- `## Lesson frameworks`: stage tables with minutes (used by the lesson planner).
- `## Games bank`: *Game | Levels | How it works | Prep*.
- `## Resources`: *Resource | Use it for | Levels* (links are kept).

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
| **mammoth**, **node-html-parser**, **tsx** | Used only by the curriculum import script |

### Where things live

```
src/
  config.ts              app name and brand colours
  domain/types.ts        the data model
  db/                    database schema, saving/deleting, first-run setup, backups
  lib/                   pure logic: calendar, schedule, timetable checks, platform detection
  i18n/en.ts, ru.ts      every piece of text in English and Russian
  pages/                 the screens
  components/            shared building blocks
  seed/                  starting data: groups, calendar and the imported curriculum
scripts/import-curriculum.ts   the curriculum importer
docs/curriculum.docx           your curriculum document
public/icon.svg                the app icon (all other icons are generated from it)
```

### Data model notes

The model follows the brief, with these changes:

- **Groups point to a curriculum key** (e.g. `grade-2`, `kg-older`), not just a type or grade. Parallel groups share one curriculum, and KG Older 1 and 2 share one plan.
- **Groups store their exact next lesson** (`currentPlannedLessonId`); the current module is worked out from it.
- **Lesson frameworks are data**, imported from the curriculum document, with minutes per lesson length for kindergarten.
- **Can-do** is split into statements (per module) and marks (per group or per student).
- **"Times used / last used" for games** is calculated from lesson logs, so it can never drift out of step.
- **Every record has an `updatedAt` time**, and deletions are remembered, so **Merge** can combine two devices safely.
- **Attendance stores only absences**, because everyone is present by default.

### Database changes (migrations)

`src/db/db.ts` defines the schema as `db.version(1)`. To change it later, add `db.version(2).stores({...}).upgrade(...)` below; existing data on every device is upgraded automatically the next time it opens.
