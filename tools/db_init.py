import sqlite3
import os

# For Vercel/Serverless: Use /tmp for SQLite as the main filesystem is read-only
if os.environ.get('VERCEL') == '1':
    DB_PATH = '/tmp/bugtracker.db'
else:
    DB_PATH = 'bugtracker.db'

def get_db_connection():
    """Returns a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schema and seeds initial data."""
    print(f"Initializing database at {os.path.abspath(DB_PATH)}...")
    
    conn = get_db_connection()
    c = conn.cursor()

    # 1. Create Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Create Bugs Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS bugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bug_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            steps_to_reproduce TEXT NOT NULL,
            expected_result TEXT NOT NULL,
            actual_result TEXT NOT NULL,
            severity TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'To Do',
            module TEXT,
            browser TEXT,
            os TEXT,
            device TEXT,
            app_version TEXT,
            reporter_id INTEGER NOT NULL,
            assignee_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporter_id) REFERENCES users (id),
            FOREIGN KEY (assignee_id) REFERENCES users (id)
        )
    ''')

    # 3. Create Bug Screenshots Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS bug_screenshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bug_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            url TEXT NOT NULL,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE
        )
    ''')

    # 4. Create Bug Comments Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS bug_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bug_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE,
            FOREIGN KEY (author_id) REFERENCES users (id)
        )
    ''')

    # 5. Create Audit Log Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bug_id INTEGER NOT NULL,
            field_changed TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by_id INTEGER NOT NULL,
            changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE,
            FOREIGN KEY (changed_by_id) REFERENCES users (id)
        )
    ''')

    # --- Seed Initial Users ---
    # Check if we already have users
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        print("Seeding initial users...")
        users_data = [
            ('USR-1001', 'QA Admin', 'qa@example.com', 'QA'),
            ('USR-1002', 'Tech Lead', 'lead@example.com', 'Lead'),
            ('USR-1003', 'Frontend Dev', 'frontend@example.com', 'Frontend Developer'),
            ('USR-1004', 'Backend Dev', 'backend@example.com', 'Backend Developer')
        ]
        c.executemany("INSERT INTO users (user_id, name, email, role) VALUES (?, ?, ?, ?)", users_data)

    conn.commit()
    conn.close()
    
    # Ensure the upload directory exists
    if os.environ.get('VERCEL') == '1':
        UPLOAD_FOLDER = '/tmp/uploads'
    else:
        UPLOAD_FOLDER = 'uploads'
        
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
        print(f"Created uploads folder at {os.path.abspath(UPLOAD_FOLDER)}")

    print("Database initialization complete.")

if __name__ == '__main__':
    init_db()
