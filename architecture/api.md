# Architecture SOP: REST API

## Overview
The backend is a Flask API serving JSON to the frontend. It follows RESTful principles and separates concerns across routing, controllers, and services. CORS is enabled globally.

## Endpoints

### Bugs Collection

#### `GET /api/bugs`
Retrieves a list of bugs.
- **Query Params**: `status` (filter), `severity` (filter), `assignee` (filter), `search` (text matching), `sort` (column name), `order` (asc/desc), `page`, `limit`
- **Response**: Paginated array of Bug objects + metadata (total count, etc.).

#### `POST /api/bugs`
Creates a new bug report.
- **Body**: JSON matching the `Bug Report - Input Schema`.
- **Logic**: Auto-generates `BUG-XXXX` ID. Triggers initial audit log entry.
- **Response**: 201 Created. The newly created Bug object.

### Single Bug Resource

#### `GET /api/bugs/<bug_id>`
Retrieves full details for a single bug, including its comments, screenshots, and audit history.
- **Response**: 200 OK. The complete Bug object.

#### `PUT /api/bugs/<bug_id>`
Updates an existing bug report. Primarily used for status transitions and reassignments.
- **Body**: Partial updates (e.g., `{"status": "In Progress"}`).
- **Logic**: Enforces State Machine rules (gemini.md Section 1.4). Rejects forbidden transitions.
- **Audit**: Automatically records what fields changed in the `audit_log`.
- **Response**: 200 OK. The updated Bug object.

### Sub-resources

#### `POST /api/bugs/<bug_id>/comments`
Adds a new comment to a bug.
- **Body**: `{"author_id": "...", "text": "..."}`
- **Response**: 201 Created.

#### `POST /api/bugs/<bug_id>/screenshots`
Uploads a file and attaches it to a bug.
- **Format**: `multipart/form-data`. Key: `file`.
- **Logic**: Saves file to `uploads/` dir (creates dir if missing). Saves path in DB.
- **Response**: 201 Created. File metadata.

### Dashboard & Analytics

#### `GET /api/dashboard`
Provides aggregated summary statistics.
- **Response**: 200 OK. JSON matching the `Dashboard Payload Schema`. Fast, single-request load for the frontend.

#### `GET /api/export`
Exports bugs based on query filters.
- **Query Params**: `format` (csv/excel), plus standard search/filter params.
- **Logic**: Calls `export_service.py` to construct the file in memory.
- **Response**: 200 OK. Downloadable file attachment.

### User Management

#### `GET /api/users`
Lists all registered users. Useful for dropdowns (Assignee, Reporter).
- **Response**: 200 OK. Array of basic user objects.

#### `POST /api/users`
Creates a new user.
- **Body**: `{"name": "...", "email": "...", "role": "..."}`
- **Response**: 201 Created.

## Error Handling
The API must return standardized JSON errors:
```json
{
  "error": "Not Found",
  "message": "Bug BUG-1004 does not exist."
}
```
HTTP status codes must be used appropriately (400 Bad Request, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
