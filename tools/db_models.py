import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, List, Optional, Any
import sqlite3

if os.environ.get('VERCEL') == '1':
    DB_PATH = '/tmp/bugtracker.db'
else:
    DB_PATH = 'bugtracker.db'

# Connection helper to detect environment
def get_db_connection():
    db_url = os.environ.get('DATABASE_URL')
    
    if db_url:
        # Use PostgreSQL (Neon.tech)
        conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
        return conn
    else:
        # Fallback to SQLite
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def execute_query(query: str, params: tuple = (), fetch_one=False, fetch_all=False, commit=False):
    conn = get_db_connection()
    is_postgres = hasattr(conn, 'cursor_factory')
    
    try:
        if is_postgres:
            cur = conn.cursor()
            # Replace ? with %s for Postgres compatibility
            postgres_query = query.replace('?', '%s')
            cur.execute(postgres_query, params)
            
            result = None
            if fetch_one:
                row = cur.fetchone()
                result = dict(row) if row else None
            elif fetch_all:
                rows = cur.fetchall()
                result = [dict(r) for r in rows]
            
            if commit:
                conn.commit()
            return result
        else:
            cur = conn.cursor()
            cur.execute(query, params)
            
            result = None
            if fetch_one:
                row = cur.fetchone()
                result = dict(row) if row else None
            elif fetch_all:
                rows = cur.fetchall()
                result = [dict(r) for r in rows]
                
            if commit:
                conn.commit()
            return result
    finally:
        conn.close()

# --- USER MODELS ---

def get_all_users() -> List[Dict[str, Any]]:
    return execute_query("SELECT * FROM users", fetch_all=True)

def get_user_by_id(user_db_id: int) -> Optional[Dict[str, Any]]:
    return execute_query("SELECT * FROM users WHERE id = ?", (user_db_id,), fetch_one=True)

def create_user(name: str, email: str, role: str) -> Dict[str, Any]:
    # Custom logic for ID generation
    users = get_all_users()
    count = len(users)
    new_user_id = f"USR-{1000 + count + 1}"
    
    conn = get_db_connection()
    cur = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    
    try:
        q = "INSERT INTO users (user_id, name, email, role) VALUES (%s, %s, %s, %s) RETURNING id" if is_postgres else "INSERT INTO users (user_id, name, email, role) VALUES (?, ?, ?, ?)"
        params = (new_user_id, name, email, role)
        
        if is_postgres:
            cur.execute(q, params)
            new_id = cur.fetchone()['id']
        else:
            cur.execute(q, params)
            new_id = cur.lastrowid
            
        conn.commit()
        return get_user_by_id(new_id)
    finally:
        conn.close()

# --- BUG MODELS ---

def get_all_bugs(filters: Dict[str, Any] = None, current_user: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    query = """
        SELECT b.*, u_reporter.name as reporter_name, u_assignee.name as assignee_name, u_assignee.role as assignee_role
        FROM bugs b
        LEFT JOIN users u_reporter ON b.reporter_id = u_reporter.id
        LEFT JOIN users u_assignee ON b.assignee_id = u_assignee.id
        WHERE 1=1
    """
    params = []
    
    if current_user:
        role = current_user.get('role', '')
        if role in ['Frontend Developer', 'Backend Developer']:
            query += " AND b.assignee_id = ?"
            params.append(current_user['id'])
            
    if filters:
        for field in ['status', 'severity', 'assignee_id', 'module']:
            if filters.get(field):
                query += f" AND b.{field} = ?"
                params.append(filters[field])
        if filters.get('date_from'):
            query += " AND date(b.created_at) >= date(?)"
            params.append(filters['date_from'])
        if filters.get('date_to'):
            query += " AND date(b.created_at) <= date(?)"
            params.append(filters['date_to'])
            
    query += " ORDER BY b.created_at DESC"
    return execute_query(query, tuple(params), fetch_all=True)

def get_bug_by_id(bug_internal_id: int, current_user: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
    bug_query = """
        SELECT b.*, u_reporter.name as reporter_name, u_assignee.name as assignee_name, u_assignee.role as assignee_role
        FROM bugs b
        LEFT JOIN users u_reporter ON b.reporter_id = u_reporter.id
        LEFT JOIN users u_assignee ON b.assignee_id = u_assignee.id
        WHERE b.id = ?
    """
    params = [bug_internal_id]
    
    if current_user:
        role = current_user.get('role', '')
        if role in ['Frontend Developer', 'Backend Developer']:
            bug_query += " AND b.assignee_id = ?"
            params.append(current_user['id'])
            
    bug = execute_query(bug_query, tuple(params), fetch_one=True)
    if not bug: return None
    
    bug['screenshots'] = execute_query("SELECT * FROM bug_screenshots WHERE bug_id = ?", (bug_internal_id,), fetch_all=True)
    
    comments_query = """
        SELECT c.*, u.name as author_name
        FROM bug_comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.bug_id = ?
        ORDER BY c.timestamp ASC
    """
    bug['comments'] = execute_query(comments_query, (bug_internal_id,), fetch_all=True)
    
    audit_query = """
        SELECT a.*, u.name as changed_by_name
        FROM audit_log a
        LEFT JOIN users u ON a.changed_by_id = u.id
        WHERE a.bug_id = ?
        ORDER BY a.changed_at DESC
    """
    bug['audit_history'] = execute_query(audit_query, (bug_internal_id,), fetch_all=True)
    
    return bug

def create_bug(bug_data: Dict[str, Any], reporter_id: int) -> Dict[str, Any]:
    # Bug ID generation logic (simplistic)
    all_bugs = execute_query("SELECT id FROM bugs", fetch_all=True)
    count = len(all_bugs)
    new_bug_id = f"BUG-{1000 + count + 1}"
    
    columns = ['bug_id', 'title', 'description', 'steps_to_reproduce', 'expected_result', 'actual_result', 'severity', 'priority', 'reporter_id']
    values = [
        new_bug_id, 
        bug_data.get('title'), 
        bug_data.get('description'), 
        bug_data.get('steps_to_reproduce') or '', 
        bug_data.get('expected_result'), 
        bug_data.get('actual_result'), 
        bug_data.get('severity', 'Minor'), 
        bug_data.get('priority', 'P3'), 
        reporter_id
    ]
    
    if not bug_data.get('module') or str(bug_data.get('module')).strip() == '':
        bug_data['module'] = 'Other'

    for opt in ['module', 'assignee_id']:
        if opt in bug_data:
            columns.append(opt)
            values.append(bug_data[opt])
            
    conn = get_db_connection()
    cur = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    
    try:
        placeholder = "%s" if is_postgres else "?"
        q = f"INSERT INTO bugs ({', '.join(columns)}) VALUES ({', '.join([placeholder]*len(values))})"
        if is_postgres: q += " RETURNING id"
        
        if is_postgres:
            cur.execute(q, values)
            new_id = cur.fetchone()['id']
        else:
            cur.execute(q, values)
            new_id = cur.lastrowid
            
        # Audit log
        aq = "INSERT INTO audit_log (bug_id, field_changed, new_value, changed_by_id) VALUES (%s, %s, %s, %s)" if is_postgres else "INSERT INTO audit_log (bug_id, field_changed, new_value, changed_by_id) VALUES (?, ?, ?, ?)"
        cur.execute(aq, (new_id, "status", "To Do", reporter_id))
        
        conn.commit()
        return get_bug_by_id(new_id)
    finally:
        conn.close()

def update_bug(bug_internal_id: int, updates: Dict[str, Any], changer_id: int) -> Optional[Dict[str, Any]]:
    current_bug = get_bug_by_id(bug_internal_id)
    if not current_bug: return None
    
    conn = get_db_connection()
    cur = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    
    try:
        update_cols = []
        update_vals = []
        
        for key, new_val in updates.items():
            if key in current_bug and current_bug[key] != new_val:
                placeholder = "%s" if is_postgres else "?"
                update_cols.append(f"{key} = {placeholder}")
                update_vals.append(new_val)
                
                old_val_str = str(current_bug[key]) if current_bug[key] is not None else ""
                new_val_str = str(new_val) if new_val is not None else ""
                
                aq = "INSERT INTO audit_log (bug_id, field_changed, old_value, new_value, changed_by_id) VALUES (%s, %s, %s, %s, %s)" if is_postgres else "INSERT INTO audit_log (bug_id, field_changed, old_value, new_value, changed_by_id) VALUES (?, ?, ?, ?, ?)"
                cur.execute(aq, (bug_internal_id, key, old_val_str, new_val_str, changer_id))
                
        if update_cols:
            update_vals.append(bug_internal_id)
            placeholder = "%s" if is_postgres else "?"
            q = f"UPDATE bugs SET {', '.join(update_cols)}, updated_at = CURRENT_TIMESTAMP WHERE id = {placeholder}"
            cur.execute(q, update_vals)
            conn.commit()
        
        return get_bug_by_id(bug_internal_id)
    finally:
        conn.close()

def delete_bug(bug_internal_id: int) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = "%s" if is_postgres else "?"
    
    try:
        cur.execute(f"DELETE FROM bug_comments WHERE bug_id = {placeholder}", (bug_internal_id,))
        cur.execute(f"DELETE FROM bug_screenshots WHERE bug_id = {placeholder}", (bug_internal_id,))
        cur.execute(f"DELETE FROM audit_log WHERE bug_id = {placeholder}", (bug_internal_id,))
        cur.execute(f"DELETE FROM bugs WHERE id = {placeholder}", (bug_internal_id,))
        conn.commit()
        return True
    finally:
        conn.close()

def add_comment(bug_internal_id: int, author_id: int, text: str):
    q = "INSERT INTO bug_comments (bug_id, author_id, text) VALUES (%s, %s, %s)" if os.environ.get('DATABASE_URL') else "INSERT INTO bug_comments (bug_id, author_id, text) VALUES (?, ?, ?)"
    execute_query(q, (bug_internal_id, author_id, text), commit=True)

def add_screenshot(bug_internal_id: int, filename: str, url: str):
    q = "INSERT INTO bug_screenshots (bug_id, filename, url) VALUES (%s, %s, %s)" if os.environ.get('DATABASE_URL') else "INSERT INTO bug_screenshots (bug_id, filename, url) VALUES (?, ?, ?)"
    execute_query(q, (bug_internal_id, filename, url), commit=True)

def get_dashboard_summary(filters: Dict[str, Any] = None, current_user: Dict[str, Any] = None) -> Dict[str, Any]:
    summary = {
        "total_bugs": 0,
        "by_status": {"to_do": 0, "in_progress": 0, "fixed": 0, "retest": 0, "closed": 0, "rejected": 0},
        "by_severity": {"major": 0, "minor": 0, "trivial": 0},
        "by_priority": {"p1": 0, "p2": 0, "p3": 0, "p4": 0},
        "by_assignee": {}
    }
    
    conditions = ["1=1"]
    params = []
    
    if current_user:
        role = current_user.get('role', '')
        if role in ['Frontend Developer', 'Backend Developer']:
            conditions.append("b.assignee_id = ?")
            params.append(current_user['id'])
            
    if filters:
        if filters.get('module'):
            conditions.append("b.module = ?")
            params.append(filters['module'])
            
    where_clause = "WHERE " + " AND ".join(conditions)
    
    # Simple queries on bugs table only
    total_res = execute_query(f"SELECT COUNT(*) as total FROM bugs b {where_clause}", tuple(params), fetch_one=True)
    summary["total_bugs"] = total_res['total'] if total_res else 0
    
    status_rows = execute_query(f"SELECT b.status, COUNT(*) as count FROM bugs b {where_clause} GROUP BY b.status", tuple(params), fetch_all=True)
    for row in status_rows:
        k = row['status'].lower().replace(" ", "_")
        if k in summary["by_status"]: summary["by_status"][k] = row['count']
        
    severity_rows = execute_query(f"SELECT b.severity, COUNT(*) as count FROM bugs b {where_clause} GROUP BY b.severity", tuple(params), fetch_all=True)
    for row in severity_rows:
        k = row['severity'].lower()
        if k in summary["by_severity"]: summary["by_severity"][k] = row['count']
        
    priority_rows = execute_query(f"SELECT b.priority, COUNT(*) as count FROM bugs b {where_clause} GROUP BY b.priority", tuple(params), fetch_all=True)
    for row in priority_rows:
        k = row['priority'].lower()
        if k in summary["by_priority"]: summary["by_priority"][k] = row['count']
        
    # Assignee query: LEFT JOIN must come BEFORE WHERE clause
    assignee_query = f"SELECT u.name, COUNT(b.id) as count FROM bugs b LEFT JOIN users u ON b.assignee_id = u.id {where_clause} GROUP BY u.name"
    assignee_rows = execute_query(assignee_query, tuple(params), fetch_all=True)
    for row in assignee_rows:
        k = row['name'] if row['name'] else "Unassigned"
        summary["by_assignee"][k] = row['count']
        
    return summary

def get_unique_modules() -> List[str]:
    rows = execute_query("SELECT DISTINCT module FROM bugs WHERE module IS NOT NULL AND module != ''", fetch_all=True)
    return [r['module'] for r in rows]
