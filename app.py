import os
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from dotenv import load_dotenv

import tools.db_models as db
import tools.export_service as export
import tools.db_init as db_init

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for frontend integration
CORS(app)

app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-key-fallback')
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
if os.environ.get('VERCEL') == '1':
    app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
    
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)) # 16MB max

# --- AUTO-INIT DB ---
# For SQLite: Init if file is missing
# For Postgres: Always attempt init on startup (it uses CREATE TABLE IF NOT EXISTS)
# In production/deployment, this ensures the new cloud DB is ready.
if os.environ.get('DATABASE_URL') or not os.path.exists(getattr(db, 'DB_PATH', '')):
    print("Ensuring database schema is initialized...")
    try:
        db_init.init_db()
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")

# Ensure upload folder exists for screenshot uploads
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- MOCK AUTH FOR MVP ---
# In a real app, this would use JWT or sessions. 
# For this MVP, we pass the user_id in headers or default to Admin if missing.
def get_current_user_id():
    # Attempt to read from header
    user_header = request.headers.get('X-User-ID')
    if user_header:
        # Simplistic resolution - assumes valid format
        try:
            return int(user_header)
        except:
            pass
    return 1 # Fallback to USR-1001 (QA Admin)

def get_current_user():
    user_id = get_current_user_id()
    return db.get_user_by_id(user_id)

# --- USERS API ---

@app.route('/api/users', methods=['GET'])
def list_users():
    users = db.get_all_users()
    return jsonify(users), 200

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    try:
        new_user = db.create_user(data['name'], data['email'], data['role'])
        return jsonify(new_user), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- BUGS API ---

@app.route('/api/bugs', methods=['GET'])
def list_bugs():
    filters = {}
    if 'status' in request.args: filters['status'] = request.args.get('status')
    if 'severity' in request.args: filters['severity'] = request.args.get('severity')
    if 'assignee_id' in request.args: filters['assignee_id'] = request.args.get('assignee_id')
    if 'module' in request.args: filters['module'] = request.args.get('module')
    if 'date_from' in request.args: filters['date_from'] = request.args.get('date_from')
    if 'date_to' in request.args: filters['date_to'] = request.args.get('date_to')
    
    current_user = get_current_user()
    bugs = db.get_all_bugs(filters, current_user=current_user)
    return jsonify(bugs), 200

@app.route('/api/bugs/<int:bug_id>', methods=['GET'])
def get_bug(bug_id):
    current_user = get_current_user()
    bug = db.get_bug_by_id(bug_id, current_user=current_user)
    if not bug:
        return jsonify({"error": "Not Found or Unauthorized", "message": f"Bug not found or you do not have access."}), 404
    return jsonify(bug), 200

@app.route('/api/bugs', methods=['POST'])
def create_bug():
    data = request.json
    reporter_id = get_current_user_id()
    try:
        new_bug = db.create_bug(data, reporter_id)
        return jsonify(new_bug), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/bugs/<int:bug_id>', methods=['PUT', 'PATCH'])
def update_bug(bug_id):
    updates = request.json
    changer_id = get_current_user_id()
    
    # Validation against state machine rules could be added here
    # For MVP, we trust the frontend UI state controls
    
    try:
        updated_bug = db.update_bug(bug_id, updates, changer_id)
        if not updated_bug:
             return jsonify({"error": "Not Found"}), 404
        return jsonify(updated_bug), 200
    except Exception as e:
         return jsonify({"error": str(e)}), 400

@app.route('/api/bugs/<int:bug_id>', methods=['DELETE'])
def delete_bug(bug_id):
    current_user = get_current_user()
    if not current_user or current_user.get('role') != 'QA':
        return jsonify({"error": "Unauthorized. Only QA (Admin) can delete tickets."}), 403
        
    try:
        success = db.delete_bug(bug_id)
        if success:
            return jsonify({"message": "Bug deleted successfully."}), 200
        else:
            return jsonify({"error": "Not Found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/bugs/<int:bug_id>/comments', methods=['POST'])
def add_comment(bug_id):
    data = request.json
    author_id = get_current_user_id()
    try:
        db.add_comment(bug_id, author_id, data['text'])
        return jsonify({"message": "Comment added."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/bugs/<int:bug_id>/screenshots', methods=['POST'])
def upload_screenshot(bug_id):
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        filename = file.filename
        # In real life, secure the filename with werkzeug.utils.secure_filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Save to DB
        url = f"/uploads/{filename}"
        db.add_screenshot(bug_id, filename, url)
        
        return jsonify({"message": "File uploaded", "url": url}), 201

@app.route('/api/modules', methods=['GET'])
def list_modules():
    modules = db.get_unique_modules()
    return jsonify(modules), 200

# --- DASHBOARD & ANALYTICS ---

@app.route('/api/system-status', methods=['GET'])
def system_status():
    db_url = os.environ.get('DATABASE_URL', 'NOT_SET')
    is_vercel = os.environ.get('VERCEL', '0')
    
    # Check DB Connection
    db_type = "PostgreSQL" if os.environ.get('DATABASE_URL') else "SQLite"
    conn_status = "Unknown"
    error = None
    
    try:
        conn = db.get_db_connection()
        conn.close()
        conn_status = "Connected"
    except Exception as e:
        conn_status = "Failed"
        error = str(e)
    
    return jsonify({
        "env": {
            "VERCEL": is_vercel,
            "DATABASE_URL_PRESENT": db_url != 'NOT_SET',
            "DATABASE_URL_START": db_url[:20] + "..." if db_url != 'NOT_SET' else "N/A"
        },
        "database": {
            "type": db_type,
            "status": conn_status,
            "error": error
        }
    }), 200

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    summary = db.get_dashboard_summary()
    return jsonify({"summary": summary}), 200

@app.route('/api/export', methods=['GET'])
def export_bugs():
    format_param = request.args.get('format', 'csv').lower()
    
    if format_param == 'csv':
        csv_data = export.export_bugs_to_csv()
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=bugs_export.csv"}
        )
    elif format_param == 'excel':
        excel_data = export.export_bugs_to_excel()
        return Response(
            excel_data,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-disposition": "attachment; filename=bugs_export.xlsx"}
        )
    else:
        return jsonify({"error": "Invalid format requested."}), 400

# --- STATIC FILE SERVING ---
# Serve frontend from static dir
@app.route('/')
def serve_index():
    return send_from_directory('templates', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"[START] Starting AI Bug Tracker on http://localhost:{port} (Debug: {debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)
