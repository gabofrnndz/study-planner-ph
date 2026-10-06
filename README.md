# DepEd Study Planner

Policy-aware, local-first study planner for Filipino students. Plain HTML/CSS/JS, no build step, data stays in your browser.

## Run
```
python3 -m http.server 8000
```
Open http://localhost:8000. (A server is needed so `data/policies.json` loads.)

## Features in this version
- Tasks: academic and non-academic (Personal, Household, Health, Other), with status and overdue labels
- Task repetition: daily, weekdays, weekly, monthly; completing a task creates the next one
- Cleaning reminders: rotating rosters per area (daily or weekly), today/tomorrow duty, browser notifications
- Competency tracker: student-entered competencies with your own statuses; assessed and demonstrated counts kept separate
- Exam planner: generates study sessions (one topic per day, practice, final review) into Tasks
- Calendar: 14-day agenda of due tasks, exams and cleaning duty, with source labels (personal, school announcement, unverified)
- Progress report: printable student-generated report (use Print > Save as PDF) and CSV export
- Analytics: completion rate, overdue count, 7-day workload, assessment averages (no grade prediction, no ranking)
- Study sessions respect a configurable daily limit
- Year-end summary in Reports (no automatic final-grade averaging)
- Offline support: service worker and web manifest (installable as a PWA when served over http://localhost or https)
- Grading-period tagging: choose the active term in the header; new tasks, grades, competencies and exams carry it, and the progress report filters by it
- Gradebook: scores labeled as student estimates; no official grade is produced because rules are unverified
- Policy registry: `data/policies.json` with status per issuance; three-term structure for SY 2026-2027
- JSON backup and restore

## Roadmap (from the plan)
Full month/week calendar views, dedicated PDF generation and official-calendar import.

## Policy note
Listed DepEd issuances are starting references only. Verify full text, effectivity and amendments before enabling official calculations. Term dates are intentionally null until loaded from the official calendar.

## License
MIT
