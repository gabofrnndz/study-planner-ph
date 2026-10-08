# DepEd Study Planner

Policy-aware, local-first study planner for Filipino students. Plain HTML/CSS/JS, no build step. Data stays in your browser (localStorage). Purple themed, with a sidebar dashboard layout.

## Run
```
python3 -m http.server 8000
```
Open http://localhost:8000. A server is needed so `data/policies.json` and the service worker load. It also deploys as-is to GitHub Pages.

## Pages
Dashboard (profile, setup checklist, today's schedule, due soon, current grades, competency progress, upcoming exams, announcements), Calendar, Subjects, Assignments, Competencies, Grades & Assessments, Exams, Progress, Report Card, School-Year Archive, Cleaning reminders, Settings.

## Highlights
- Non-academic tasks (Personal, Household, Health, Other) alongside academic types
- Task repetition: daily, weekdays, weekly, monthly; completing a task creates the next one
- Cleaning reminders: rotating rosters with today/tomorrow duty and browser notifications
- Configurable grading periods (T1-T3 by default; use Q1-Q4 or semesters in Settings); records are tagged by school year and period
- Exam planner that creates study sessions within a daily limit
- Calendar with source labels (personal, school announcement, unverified) and category filter
- Quick-add bar, edit and delete on every record, JSON backup/restore, CSV export, print to PDF, offline PWA

## Setup and automatic grading-period tagging
First launch opens a 3-step setup: learner profile (name, school, school type, grade, section, strand, curriculum pathway, school year, grading period structure), school calendar, and study preferences. Enter the term start and end dates from your school's official calendar; the app never guesses dates. Then:
- The active period follows today's date automatically (turn off in Settings, or by picking a period manually in the top bar).
- New tasks are tagged from their due date, exams from their exam date, and grades and competencies from today's date. Dates that fall in a break keep the active period.
- Calendar changes can be applied to existing tasks and exams with "Re-tag by date". Grades and competencies are never re-tagged automatically.
- The curriculum pathway sets the default grading group for new subjects (Grade 12 existing curriculum uses the DO 8 weights).
- Preferred study days and the daily session limit are respected when exam study sessions are created.

## Grading (DepEd Order No. 015, s. 2026)
Grades are computed from your raw scores: percentage score per component, weighted by the subject's grading group (set per subject), initial grade, then the adjusted SY 2026-2027 transmutation table, term grade and descriptor. Exams split into Summative Test 1 (30%), Summative Test 2 (30%) and Term Exam (40%). Final grade is the rounded average of all term grades, shown only when every term has one. Each result shows its full computation and is labeled an estimate.

**Verification status:** the official PDFs could not be fetched automatically, so weights, the transmutation table and descriptors in `src/policy.js` come from published summaries (`verified: false`). Table values below an initial grade of about 42 are extrapolated. Check `src/policy.js` against DO 015, s. 2026 and fix any difference. DO 017, s. 2026 is listed in the registry but its content was not read.

Reports are student-generated, not official records.

## Fonts
Inter and Poppins are bundled in `fonts/` (SIL Open Font License), so the app looks the same offline.

## Roadmap
Month/week calendar grid, official calendar import, verifying `src/policy.js` against the official text, PDF generation without the print dialog.

## License
MIT
