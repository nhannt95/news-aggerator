# Frontend UI Prompt — News Aggregator Intelligence Platform

## Overview

Design a single-page web application for a **News Aggregator Intelligence Platform** that collects news articles from multiple sources, classifies them using AI, translates content into multiple languages, and generates analytical reports. The platform serves multiple departments/projects (e.g., Legal, ER/Emergency Response) from one unified interface.

---

## Design System

Follow the **"Digital Curator"** aesthetic — a dark, cinematic, editorial intelligence platform.

### Colors
- Base canvas: `#060e20`
- Surface L0: `#060e20`, L1: `#091328`, L2: `#192540`, L3: `#1f2b49`
- Primary accent: `#85adff` (gradient 135deg to `#6e9fff`)
- Secondary: `#9093ff` (data viz)
- Tertiary / AI accent: `#ac8aff` (purple, for AI insights)
- Text: `#dee5ff` (never pure white), muted: `#a3aac4`
- Error: `#ff716c`, Success: `#6fcf97`
- No 1px solid borders — use tonal depth only
- Cards: `border-radius: 0.75rem`, ambient shadow `0px 24px 48px rgba(0,0,0,0.4)`

### Typography
- Manrope (700/800) — headlines, hero text
- Inter (300–600) — body, labels, navigation
- Tabs/nav: all-caps, `letter-spacing: 0.05em`

### Layout
- Collapsible sidebar navigation (left)
- Main content area (right)
- No dividers — use 4px left accent bar on hover
- 32px vertical gap between feed items
- Glassmorphism for AI insight panels (40% opacity, 24px backdrop blur)

---

## Page Structure

### Sidebar Navigation
- Logo / App name: "Synthetica News"
- Navigation items:
  - Dashboard (home icon)
  - Articles (newspaper icon)
  - Sources (globe icon)
  - Scheduler (clock icon)
  - Settings (gear icon)
- Project switcher dropdown at top: "Legal Task", "ER Task", "All Projects"
- Language switcher: VI / EN / KO

---

## Section 1: Dashboard (Public)

The default landing page. Shows overview metrics and recent activity across all projects.

### Top Stats Row (4 cards)
- **Total Articles Today**: count of articles crawled today
- **Relevant Articles**: count where `is_relevant = true`
- **Pending Review**: count where `is_relevant = true` AND not yet approved
- **Reports Generated**: count where `report_generated = true`

### Charts Area (2 columns)
- **Left**: Line chart — "Articles Over Time" (last 7 days), grouped by project
- **Right**: Donut chart — "Relevance Distribution" (relevant vs irrelevant vs pending)

### Recent Articles Feed
- List of latest processed articles, each row shows:
  - Relevance indicator (colored dot: green = relevant, red = irrelevant, yellow = pending)
  - Title (truncated)
  - Source name + language badge (VI, EN, KO)
  - Published date
  - Relevance score (progress bar or number)
  - Project tag (Legal / ER)
- Click row → opens Article Detail Modal

---

## Section 2: Articles (Review & Approval)

Main working area for reviewing classified articles.

### Filter Bar
- Project: dropdown (All / Legal Task / ER Task)
- Relevance: dropdown (All / Relevant / Irrelevant)
- Status: dropdown (All / Pending Review / Approved / Rejected)
- Report: dropdown (All / Report Generated / No Report)
- Source: dropdown (All / Thanh Nien / Dan Tri / ...)
- Date range picker
- Search by title/content

### Articles Table
| Column | Description |
|---|---|
| Checkbox | Bulk selection |
| Title | Article title (clickable → detail modal) |
| Source | Site name + favicon |
| Language | Badge (VI/EN/KO) |
| Published | Date/time |
| Relevance | Score bar (0-100) + relevant/irrelevant badge |
| Status | Pending / Approved / Rejected |
| Report | Generated / Not yet |
| Actions | View, Approve, Reject buttons |

### Bulk Actions Bar (appears when items selected)
- Approve Selected
- Reject Selected
- Generate Report for Selected

### Article Detail Modal
When clicking an article, show a full modal with:

**Left panel (60%)**:
- Title (large)
- Meta: source, author, published date, language
- Relevance score + matched topics tags
- AI Classification result: reason + recommendation
- Content (markdown rendered)
- Images gallery (thumbnails from `images` array)

**Right panel (40%)**:
- **Language tabs**: VI / EN / KO (from `translations` object)
- Each tab shows:
  - Summary
  - Analysis
  - Recommendation
  - Translated content
- Approval section at bottom:
  - Approve / Reject buttons
  - Notes textarea (optional)

---

## Section 3: Sources Management (Admin)

Manage news sources per project.

### Sources Table
| Column | Description |
|---|---|
| Site ID | Unique identifier |
| Name | Source name |
| Domain | Website domain |
| Project | Associated project |
| Language | Source language |
| Last Crawled | Datetime |
| Active | Toggle switch |
| Actions | Edit, Delete |

### Add/Edit Source Modal
Form fields:
- Site ID (auto-generate or manual)
- Name
- Latest Page URL (the listing page to crawl)
- Domain (auto-fill from URL)
- Category
- Language: dropdown (vi, en, ko, ja, ...)
- Project: dropdown (legal_task, er_task, ...)
- Target Languages: multi-select checkboxes (vi, en, ko, ja, ...)
- Relevance Threshold: slider (0-100, default 70)
- **Crawl Settings** section:
  - Listing Selector: text input (CSS selector for article list area)
  - Content Selector: text input (CSS selector for article content)
  - Article URL Pattern: text input (regex pattern)
  - Helper text: "CSS selector examples: `div.detail-cmain`, `div.singular-content`"
  - Helper text: "URL pattern examples: `-185\d+\.htm$`, `-\d+\.htm$`"
- Active: toggle

---

## Section 4: Scheduler (Admin)

View and manage scheduled crawl jobs.

### Scheduler Jobs Table
| Column | Description |
|---|---|
| Job ID | Unique identifier |
| Project | Project name |
| Trigger Type | Badge: Cron / Interval |
| Schedule | Human-readable (e.g., "Every day at 08:00") |
| Timezone | e.g., Asia/Ho_Chi_Minh |
| Enabled | Toggle switch |
| Actions | Edit, Delete, Run Now |

### Add/Edit Job Modal
- Job ID
- Project: dropdown
- Trigger Type: radio (Cron / Interval)
- If Cron: hour, minute, day_of_week fields
- If Interval: minutes/hours input
- Timezone: dropdown
- Input Payload: JSON editor
- Enabled: toggle

---

## Section 5: Settings (Admin)

### Runtime Configs
- Project selector tabs
- For each project, show collapsible sections:
  - **Agents**: table of agent configs (role, goal, LLM model, enabled toggle)
  - **Tasks**: table of task configs (description, assigned agent, enabled toggle)
  - **Crews**: table of crew configs (process type, agents list, tasks list, enabled toggle)
- Edit inline or via modal

### System Info
- API Health status
- Ollama connection status + model info
- Current running scheduler jobs

---

## API Endpoints (Backend)

The frontend consumes these REST APIs:

```
GET    /health
GET    /news-sites?project_name=
GET    /processed-articles?project_name=&require_summary=&require_relevant=&report_generated=
POST   /processed-articles                     (save articles)
POST   /reported-articles                      (save reports)
GET    /scheduler-configs
GET    /projects/{project_name}/runtime-config
GET    /runtime-configs
POST   /admin/runtime/reset
POST   /projects/{project_name}/run
```

---

## Key Interactions

1. **Project switching**: Changing project in sidebar filters ALL data (dashboard, articles, sources)
2. **Language switching**: Changes UI language AND default translation tab in article detail
3. **Real-time feel**: Dashboard stats should feel live (polling or refresh button)
4. **Approval workflow**: Pending → Approved/Rejected, with bulk actions
5. **Responsive**: Desktop-first but tablet-friendly

---

## Tech Stack Suggestion
- Framework: React / Next.js or Vue 3
- Styling: Tailwind CSS (dark mode, custom color tokens matching design system)
- Charts: Recharts or Chart.js
- Icons: Google Material Symbols Outlined
- Fonts: Manrope + Inter (Google Fonts)
