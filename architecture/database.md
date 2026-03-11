# Architecture SOP: Database

## Overview
The AI Bug Tracker uses SQLite for the MVP phase. The database schema is designed to store bugs, user information, comments, and an audit trail to track status changes.

## Database Location
The database file will be stored at the project root as `bugtracker.db`.

## Tables

### 1. `users`
Stores user accounts and role definitions.
- `id` (INTEGER, Primary Key, Auto-increment)
- `user_id` (TEXT, Unique) - e.g., USR-1234
- `name` (TEXT, Not Null)
- `email` (TEXT, Unique, Not Null)
- `role` (TEXT, Not Null) - Enum: ['QA', 'Developer', 'Lead', 'Admin']
- `avatar_url` (TEXT)
- `created_at` (DATETIME, Default: CURRENT_TIMESTAMP)

### 2. `bugs`
The core table storing bug reports.
- `id` (INTEGER, Primary Key, Auto-increment)
- `bug_id` (TEXT, Unique, Not Null) - e.g., BUG-1001
- `title` (TEXT, Not Null)
- `description` (TEXT, Not Null)
- `steps_to_reproduce` (TEXT, Not Null)
- `expected_result` (TEXT, Not Null)
- `actual_result` (TEXT, Not Null)
- `severity` (TEXT, Not Null) - Enum: ['Critical', 'Major', 'Minor', 'Trivial']
- `priority` (TEXT, Not Null) - Enum: ['P1', 'P2', 'P3', 'P4']
- `status` (TEXT, Not Null, Default: 'To Do') - Enum: ['To Do', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Rejected']
- `module` (TEXT)
- `browser` (TEXT)
- `os` (TEXT)
- `device` (TEXT)
- `app_version` (TEXT)
- `reporter_id` (INTEGER, Foreign Key to `users.id`)
- `assignee_id` (INTEGER, Foreign Key to `users.id`)
- `created_at` (DATETIME, Default: CURRENT_TIMESTAMP)
- `updated_at` (DATETIME, Default: CURRENT_TIMESTAMP)

### 3. `bug_screenshots`
Stores references to uploaded screenshot files.
- `id` (INTEGER, Primary Key, Auto-increment)
- `bug_id` (INTEGER, Foreign Key to `bugs.id`, Not Null)
- `filename` (TEXT, Not Null)
- `url` (TEXT, Not Null)
- `uploaded_at` (DATETIME, Default: CURRENT_TIMESTAMP)

### 4. `bug_comments`
Stores discussion threads on bugs.
- `id` (INTEGER, Primary Key, Auto-increment)
- `bug_id` (INTEGER, Foreign Key to `bugs.id`, Not Null)
- `author_id` (INTEGER, Foreign Key to `users.id`, Not Null)
- `text` (TEXT, Not Null)
- `timestamp` (DATETIME, Default: CURRENT_TIMESTAMP)

### 5. `audit_log`
Tracks history of all status changes for compliance and visibility.
- `id` (INTEGER, Primary Key, Auto-increment)
- `bug_id` (INTEGER, Foreign Key to `bugs.id`, Not Null)
- `field_changed` (TEXT, Not Null)
- `old_value` (TEXT)
- `new_value` (TEXT)
- `changed_by_id` (INTEGER, Foreign Key to `users.id`, Not Null)
- `changed_at` (DATETIME, Default: CURRENT_TIMESTAMP)

## Initialization Strategy
The `tools/db_init.py` script will be responsible for creating these tables if they do not exist. It will also seed some baseline Admin and QA users so the application is immediately usable.
