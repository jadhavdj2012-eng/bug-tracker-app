import os
import psycopg2
from psycopg2.extras import RealDictCursor
import sys

# Mocking the environment
os.environ['DATABASE_URL'] = "postgresql://neondb_owner:npg_NlxaOT60IiJK@ep-small-resonance-a47323qt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Import the logic
sys.path.append(os.getcwd())
from tools import db_models as db

try:
    print("Attempting to create a test bug...")
    bug_data = {
        "title": "Debug Bug",
        "description": "Debugging why bugs don't save",
        "steps_to_reproduce": "Step 1",
        "expected_result": "Saved",
        "actual_result": "Not saved",
        "severity": "Major",
        "priority": "P3"
    }
    # Reporter ID 1 is QA Admin
    new_bug = db.create_bug(bug_data, 1)
    print(f"Success! Created bug: {new_bug['bug_id']} (ID: {new_bug['id']})")
except Exception as e:
    print(f"FAILED to create bug: {e}")
    import traceback
    traceback.print_exc()
