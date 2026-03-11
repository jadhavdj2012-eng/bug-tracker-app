import os
import psycopg2

DATABASE_URL = "postgresql://neondb_owner:npg_NlxaOT60IiJK@ep-small-resonance-a47323qt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
