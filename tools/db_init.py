import sqlite3
import psycopg2
import os

def get_db_connection():
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        return psycopg2.connect(db_url)
    else:
        # Fallback to SQLite
        if os.environ.get('VERCEL') == '1':
            DB_PATH = '/tmp/bugtracker.db'
        else:
            DB_PATH = 'bugtracker.db'
        return sqlite3.connect(DB_PATH)

def init_db():
    db_url = os.environ.get('DATABASE_URL')
    print(f"Initializing database... {'(Postgres)' if db_url else '(SQLite)'}")
    
    conn = get_db_connection()
    c = conn.cursor()

    # Define schema using SERIAL for Postgres and AUTOINCREMENT for SQLite
    id_type = "SERIAL PRIMARY KEY" if db_url else "INTEGER PRIMARY KEY AUTOINCREMENT"

    # 1. Users Table
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS users (
            id {id_type},
            user_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Bugs Table
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS bugs (
            id {id_type},
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporter_id) REFERENCES users (id),
            FOREIGN KEY (assignee_id) REFERENCES users (id)
        )
    ''')

    # 3. Bug Screenshots
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS bug_screenshots (
            id {id_type},
            bug_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            url TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE
        )
    ''')

    # 4. Bug Comments
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS bug_comments (
            id {id_type},
            bug_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE,
            FOREIGN KEY (author_id) REFERENCES users (id)
        )
    ''')

    # 5. Audit Log
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS audit_log (
            id {id_type},
            bug_id INTEGER NOT NULL,
            field_changed TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by_id INTEGER NOT NULL,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE,
            FOREIGN KEY (changed_by_id) REFERENCES users (id)
        )
    ''')

    # --- Seed Initial Users ---
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        print("Seeding initial users...")
        users_data = [
            ('USR-1001', 'QA Admin', 'qa@example.com', 'QA'),
            ('USR-1002', 'Tech Lead', 'lead@example.com', 'Lead'),
            ('USR-1003', 'Frontend Dev', 'frontend@example.com', 'Frontend Developer'),
            ('USR-1004', 'Backend Dev', 'backend@example.com', 'Backend Developer')
        ]
        placeholder = "%s" if db_url else "?"
        c.executemany(f"INSERT INTO users (user_id, name, email, role) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})", users_data)

    conn.commit()
    conn.close()
    
    # Ensure local upload dir exists (not needed for serverless but good for dev)
    if not db_url:
        up = 'uploads' if not os.environ.get('VERCEL') else '/tmp/uploads'
        if not os.path.exists(up):
            os.makedirs(up)

    print("Database initialization complete.")

if __name__ == '__main__':
    init_db()
