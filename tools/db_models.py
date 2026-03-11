import sqlite3
from typing import Dict, List, Optional, Any
import uuid

DB_PATH = 'bugtracker.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- USER MODELS ---

def get_all_users() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    users = conn.execute("SELECT * FROM users").fetchall()
    conn.close()
    return [dict(u) for u in users]

def get_user_by_id(user_db_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_db_id,)).fetchone()
    conn.close()
    return dict(user) if user else None

def create_user(name: str, email: str, role: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Generate ID based on current count
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    new_user_id = f"USR-{1000 + count + 1}"
    
    cursor.execute(
        "INSERT INTO users (user_id, name, email, role) VALUES (?, ?, ?, ?)",
        (new_user_id, name, email, role)
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_user_by_id(new_id)


# --- BUG MODELS ---

def get_all_bugs(filters: Dict[str, Any] = None, current_user: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    
    query = """
        SELECT b.*, u_reporter.name as reporter_name, u_assignee.name as assignee_name, u_assignee.role as assignee_role
        FROM bugs b
        LEFT JOIN users u_reporter ON b.reporter_id = u_reporter.id
        LEFT JOIN users u_assignee ON b.assignee_id = u_assignee.id
        WHERE 1=1
    """
    params = []
    
    # Enforce role-based visibility if user is provided
    if current_user:
        role = current_user.get('role', '')
        if role == 'Frontend Developer':
            query += " AND (u_assignee.role = 'Frontend Developer' OR b.assignee_id = ?)"
            params.append(current_user['id'])
        elif role == 'Backend Developer':
            query += " AND (u_assignee.role = 'Backend Developer' OR b.assignee_id = ?)"
            params.append(current_user['id'])
        # QA and Lead roles have no additional WHERE clause, they see everything.
        
    if filters:
        if filters.get('status'):
            query += " AND b.status = ?"
            params.append(filters['status'])
        if filters.get('severity'):
            query += " AND b.severity = ?"
            params.append(filters['severity'])
        if filters.get('assignee_id'):
            query += " AND b.assignee_id = ?"
            params.append(filters['assignee_id'])
        if filters.get('module'):
            query += " AND b.module = ?"
            params.append(filters['module'])
        if filters.get('date_from'):
            query += " AND date(b.created_at) >= date(?)"
            params.append(filters['date_from'])
        if filters.get('date_to'):
            query += " AND date(b.created_at) <= date(?)"
            params.append(filters['date_to'])
            
    query += " ORDER BY b.created_at DESC"
    
    bugs = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(bug) for bug in bugs]


def get_bug_by_id(bug_internal_id: int, current_user: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    
    # Get Bug Details
    bug_query = """
        SELECT b.*, u_reporter.name as reporter_name, u_assignee.name as assignee_name, u_assignee.role as assignee_role
        FROM bugs b
        LEFT JOIN users u_reporter ON b.reporter_id = u_reporter.id
        LEFT JOIN users u_assignee ON b.assignee_id = u_assignee.id
        WHERE b.id = ?
    """
    
    params = [bug_internal_id]
    
    # Enforce role-based visibility if user is provided
    if current_user:
        role = current_user.get('role', '')
        if role == 'Frontend Developer':
            bug_query += " AND (u_assignee.role = 'Frontend Developer' OR b.assignee_id = ?)"
            params.append(current_user['id'])
        elif role == 'Backend Developer':
            bug_query += " AND (u_assignee.role = 'Backend Developer' OR b.assignee_id = ?)"
            params.append(current_user['id'])
            
    bug = conn.execute(bug_query, tuple(params)).fetchone()
    
    if not bug:
        conn.close()
        return None
        
    bug_dict = dict(bug)
    
    # Get Screenshots
    screenshots = conn.execute("SELECT * FROM bug_screenshots WHERE bug_id = ?", (bug_internal_id,)).fetchall()
    bug_dict['screenshots'] = [dict(s) for s in screenshots]
    
    # Get Comments
    comments_query = """
        SELECT c.*, u.name as author_name
        FROM bug_comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.bug_id = ?
        ORDER BY c.timestamp ASC
    """
    comments = conn.execute(comments_query, (bug_internal_id,)).fetchall()
    bug_dict['comments'] = [dict(c) for c in comments]
    
    # Get Audit Log
    audit_query = """
        SELECT a.*, u.name as changed_by_name
        FROM audit_log a
        LEFT JOIN users u ON a.changed_by_id = u.id
        WHERE a.bug_id = ?
        ORDER BY a.changed_at DESC
    """
    audit = conn.execute(audit_query, (bug_internal_id,)).fetchall()
    bug_dict['audit_history'] = [dict(a) for a in audit]
    
    conn.close()
    return bug_dict


def create_bug(bug_data: Dict[str, Any], reporter_id: int) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM bugs")
    count = cursor.fetchone()[0]
    new_bug_id = f"BUG-{1000 + count + 1}"
    
    columns = [
        'bug_id', 'title', 'description', 'steps_to_reproduce', 
        'expected_result', 'actual_result', 'severity', 'priority', 
        'reporter_id'
    ]
    
    # Map required fields
    values = [
        new_bug_id,
        bug_data.get('title'),
        bug_data.get('description'),
        bug_data.get('steps_to_reproduce'),
        bug_data.get('expected_result'),
        bug_data.get('actual_result'),
        bug_data.get('severity', 'Minor'),
        bug_data.get('priority', 'P3'),
        reporter_id
    ]
    
    # Map optional fields
    for opt_field in ['module', 'assignee_id']:
        if opt_field in bug_data:
            columns.append(opt_field)
            values.append(bug_data[opt_field])
            
    placeholders = ", ".join(["?"] * len(columns))
    col_str = ", ".join(columns)
    
    cursor.execute(f"INSERT INTO bugs ({col_str}) VALUES ({placeholders})", values)
    new_id = cursor.lastrowid
    
    # Initial Audit Log
    cursor.execute(
        "INSERT INTO audit_log (bug_id, field_changed, new_value, changed_by_id) VALUES (?, ?, ?, ?)",
        (new_id, "status", "To Do", reporter_id)
    )
    
    conn.commit()
    conn.close()
    
    return get_bug_by_id(new_id)


def update_bug(bug_internal_id: int, updates: Dict[str, Any], changer_id: int) -> Optional[Dict[str, Any]]:
    # 1. Fetch current bug state for audit diffs
    current_bug = get_bug_by_id(bug_internal_id)
    if not current_bug: return None
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    update_cols = []
    update_vals = []
    
    for key, new_val in updates.items():
        if key in current_bug and current_bug[key] != new_val:
            update_cols.append(f"{key} = ?")
            update_vals.append(new_val)
            
            # Log to audit trail
            old_val_str = str(current_bug[key]) if current_bug[key] is not None else ""
            new_val_str = str(new_val) if new_val is not None else ""
            cursor.execute(
                "INSERT INTO audit_log (bug_id, field_changed, old_value, new_value, changed_by_id) VALUES (?, ?, ?, ?, ?)",
                (bug_internal_id, key, old_val_str, new_val_str, changer_id)
            )
            
    if update_cols:
        update_cols.append("updated_at = CURRENT_TIMESTAMP")
        query = f"UPDATE bugs SET {', '.join(update_cols)} WHERE id = ?"
        update_vals.append(bug_internal_id)
        cursor.execute(query, update_vals)
        conn.commit()
        
    conn.close()
    return get_bug_by_id(bug_internal_id)

def delete_bug(bug_internal_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM bugs WHERE id = ?", (bug_internal_id,))
    if not cursor.fetchone():
        conn.close()
        return False
        
    # Delete related records
    cursor.execute("DELETE FROM bug_comments WHERE bug_id = ?", (bug_internal_id,))
    cursor.execute("DELETE FROM bug_screenshots WHERE bug_id = ?", (bug_internal_id,))
    cursor.execute("DELETE FROM audit_log WHERE bug_id = ?", (bug_internal_id,))
    # Delete bug
    cursor.execute("DELETE FROM bugs WHERE id = ?", (bug_internal_id,))
    
    conn.commit()
    conn.close()
    return True

def add_comment(bug_internal_id: int, author_id: int, text: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO bug_comments (bug_id, author_id, text) VALUES (?, ?, ?)",
        (bug_internal_id, author_id, text)
    )
    conn.commit()
    conn.close()


def add_screenshot(bug_internal_id: int, filename: str, url: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO bug_screenshots (bug_id, filename, url) VALUES (?, ?, ?)",
        (bug_internal_id, filename, url)
    )
    conn.commit()
    conn.close()


def get_dashboard_summary() -> Dict[str, Any]:
    conn = get_db_connection()
    
    summary = {
        "total_bugs": 0,
        "by_status": {"to_do": 0, "in_progress": 0, "fixed": 0, "retest": 0, "closed": 0, "rejected": 0},
        "by_severity": {"major": 0, "minor": 0, "trivial": 0},
        "by_priority": {"p1": 0, "p2": 0, "p3": 0, "p4": 0}
    }
    
    summary["total_bugs"] = conn.execute("SELECT COUNT(*) FROM bugs").fetchone()[0]
    
    # Status
    for row in conn.execute("SELECT status, COUNT(*) FROM bugs GROUP BY status"):
        k = row[0].lower().replace(" ", "_").replace("to_do", "to_do")
        if k in summary["by_status"]: summary["by_status"][k] = row[1]
        
    # Severity
    for row in conn.execute("SELECT severity, COUNT(*) FROM bugs GROUP BY severity"):
        k = row[0].lower()
        if k in summary["by_severity"]: summary["by_severity"][k] = row[1]
        
    # Priority
    for row in conn.execute("SELECT priority, COUNT(*) FROM bugs GROUP BY priority"):
        k = row[0].lower()
        if k in summary["by_priority"]: summary["by_priority"][k] = row[1]
        
    conn.close()
    return summary

def get_unique_modules() -> List[str]:
    conn = get_db_connection()
    modules = conn.execute("SELECT DISTINCT module FROM bugs WHERE module IS NOT NULL AND module != ''").fetchall()
    conn.close()
    return [m[0] for m in modules]
