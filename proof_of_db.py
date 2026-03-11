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
    print("Creating a PROOF OF IDENTITY bug...")
    bug_data = {
        "title": "PROOF_OF_IDENTITY_999",
        "description": "If you see this, we are in the same DB",
        "steps_to_reproduce": "Step 1",
        "expected_result": "Visible",
        "actual_result": "Visible",
        "severity": "Major",
        "priority": "P3"
    }
    new_bug = db.create_bug(bug_data, 1)
    print(f"ID: {new_bug['id']}, Title: {new_bug['title']}")
except Exception as e:
    print(f"Error: {e}")
