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

## Policy note
Grades, transmuted grades, final rating and general average are typed in by the student. The app computes no official grade until the grading rules in DepEd Order No. 015, s. 2026 are verified and configured. Listed issuances are starting references only; verify full text and amendments. Reports are student-generated, not official records.

## Roadmap
Month/week calendar grid, official calendar import, rule-based grade computation once verified, PDF generation without the print dialog, self-hosted fonts.

## License
MIT
