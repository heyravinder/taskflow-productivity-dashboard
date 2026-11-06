# TaskFlow – Smart Productivity Dashboard

A responsive task manager with a Kanban board, calendar, analytics and streak tracking. Built with vanilla JavaScript — no framework, no backend.

## Live Demo

[View TaskFlow Live](https://capable-dasik-b9d47a.netlify.app/)

## Features
- Dashboard: total / completed / pending / overdue counters, completion bar, daily goal, streak
- Tasks: add, edit, delete (confirm), duplicate, archive/restore, subtasks, notes, priorities, custom categories, recurring tasks
- Search, filters (status, priority, category, today/week/month) and sorting
- Bulk select → complete, archive or delete
- Kanban board with drag-and-drop · monthly calendar
- Analytics: weekly chart, category chart, 5-week activity heatmap, productivity score and insights
- Subtask progress bars and drag-to-reorder subtasks
- Command palette (`Ctrl/Cmd+K`) and undo after delete (`Ctrl/Cmd+Z` or the Undo button)
- Installable PWA that works offline
- Dark/light mode, keyboard shortcuts (`N` new, `/` search, `D` theme), JSON import/export, due-time reminders
- Data saved in `localStorage`; accessible labels and keyboard support

## Tech
HTML5 · CSS3 · JavaScript (ES6) · localStorage · Chart.js · Lucide Icons

## Run locally
Play it with VS Code Live Server (service workers need `http://`, not `file://`).

## Work without a CDN (optional)
```
sh download-vendor.sh
```
This saves Chart.js and Lucide into `vendor/`. The app loads them from there first and falls back to the CDN. After the first visit the service worker also caches everything for offline use.

## Structure
```
index.html
css/style.css
js/app.js
sw.js · manifest.json · icon-*.png
vendor/ (Chart.js + Lucide, after download)
```

## Author
Ravinder Singh — [GitHub](https://github.com/heyravinder) · [LinkedIn](https://linkedin.com/in/ravinder-singh-a32485448)
