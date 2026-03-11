import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = "postgresql://neondb_owner:npg_NlxaOT60IiJK@ep-small-resonance-a47323qt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

try:
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    cur.execute("SELECT * FROM bugs")
    bugs = cur.fetchall()
    print(f"Total bugs in DB: {len(bugs)}")
    for b in bugs:
        print(f"- {b['bug_id']}: {b['title']}")
    
    cur.execute("SELECT * FROM users")
    users = cur.fetchall()
    print(f"Total users in DB: {len(users)}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
