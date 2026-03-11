# Architecture SOP: Frontend

## Overview
The MVP uses Vanilla HTML, CSS, and JavaScript without a build step or complex framework. It embraces modern browser features (Fetch API, DOM manipulation, CSS Grid/Flexbox) for a lightweight, performant application.

## Structure

```
AI Bug Tracker/
├── static/
│   ├── css/
│   │   ├── style.css         # Main stylesheet (variables, resets)
│   │   ├── dashboard.css     # Dashboard specific styles
│   │   ├── form.css          # Form styling
│   │   └── kanban.css        # Status board styles
│   ├── js/
│   │   ├── app.js            # Main entry and routing logic
│   │   ├── api.js            # Fetch wrappers for endpoints
│   │   ├── ui.js             # Shared DOM manipulation utilities
│   │   └── views/            # View-specific logic
│   │       ├── dashboard.js
│   │       ├── bugForm.js
│   │       ├── kanban.js
│   │       └── bugDetail.js
│   └── assets/               # Icons, images
└── templates/
    └── index.html            # Main SPA container
```

## Navigation (SPA Routing)
The frontend functions as a Single Page Application (SPA). `index.html` contains an empty `<main id="app-container">`. Navigation updates the URL hash `#dashboard`, `#create`, `#board`, `#bug/BUG-1001`, which triggers rendering of the respective view inside the container.

## Views

### 1. Dashboard View
- **Purpose**: High-level overview.
- **Components**:
  - Summary Cards (Total, To Do, In Progress, Fixed).
  - Severity Breakdown Chart (CSS based).
  - Recent Bugs Table.
- **Data Source**: `GET /api/dashboard`

### 2. Kanban Board View (Status Board)
- **Purpose**: Visual workflow management.
- **Components**:
  - Columns matching the State Machine: To Do, In Progress, Fixed, Retest, Closed/Rejected.
  - Draggable bug cards (HTML5 Drag and Drop API).
- **Data Source**: `GET /api/bugs`

### 3. Bug Creation / Edit Form
- **Purpose**: Structured input for reporting/editing.
- **Components**:
  - Validated inputs for Title, Description, Steps, Expected, Actual.
  - Dropdowns for Severity, Priority, Module.
  - File input for Screenshots.
- **Data Source**: Form Submission -> `POST /api/bugs` or `PUT /api/bugs/<id>`

### 4. Bug Detail View
- **Purpose**: Deep dive into a single bug.
- **Components**:
  - Header with Status Badge.
  - Main Details (Description, steps, env).
  - Screenshot Gallery.
  - Comment Thread.
  - Audit Trail Log.
  - Workflow Action Buttons (e.g., "Start Progress", "Mark Fixed" based on current status and user role).
- **Data Source**: `GET /api/bugs/<id>`

## Design System
- **Colors**: Deep dark theme (e.g., `#0f172a` background, `#1e293b` surfaces) mixed with vibrant status colors (Red for Critical/To Do, Blue for In Progress, Green for Fixed/Closed).
- **Typography**: Modern sans-serif (Inter or system default).
- **Layout**: CSS Grid for main layout structure (Sidebar + Content). Flexbox for internal component alignment.

## State Management
A simple global `AppState` object in `app.js` holds the currently logged-in user context.
```json
{
  "currentUser": {
    "id": 1,
    "role": "QA",
    "name": "Alice"
  }
}
```
This state dictates which action buttons are shown/hidden based on Access Control rules (e.g., only QA sees the "Close Bug" button on a Retest bug).
