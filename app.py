# app.py
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from dotenv import load_dotenv
import sqlite3, os, html

load_dotenv()  # loads .env from project root
DB_PATH = os.environ.get("SQLITE_DB", "example.db")
REFRESH_INTERVAL = float(os.environ.get("REFRESH_INTERVAL", "2"))

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def table_has_columns(conn, table: str, required):
    cur = conn.execute(f"PRAGMA table_info('{table}')")
    cols = [r[1].lower() for r in cur.fetchall()]
    normalized = [c.replace('-', '_') for c in cols]
    return all((r in normalized) for r in required)

@app.route("/api/tables")
def api_tables():
    required = ['id', 'content', 'created_at']
    detected = []
    try:
        conn = get_connection()
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        names = [r['name'] for r in cur.fetchall()]
        for name in names:
            if table_has_columns(conn, name, required):
                detected.append(name)
        conn.close()
        return jsonify({"tables": detected})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/rows/<table>")
def api_rows(table):
    # basic sanitization
    if not all(c.isalnum() or c in "_-" for c in table):
        return jsonify({"error": "Invalid table name"}), 400

    limit = int(request.args.get("limit", "200"))
    q = request.args.get("q")
    since_id = request.args.get("since_id")

    try:
        conn = get_connection()
        cur = conn.execute(f"PRAGMA table_info('{table}')")
        cols = [r['name'] for r in cur.fetchall()]
        created_col = None
        for c in cols:
            if c.lower().replace('-', '_') == 'created_at':
                created_col = c
                break
        if 'id' not in cols or 'content' not in cols:
            return jsonify({"error": "Table missing id/content columns"}), 400

        base_sql = f"SELECT id, content, {created_col or 'NULL'} as created_at FROM '{table}'"
        where = []
        params = []
        if since_id is not None:
            where.append("id > ?"); params.append(since_id)
        if q:
            where.append("content LIKE ?"); params.append(f"%{q}%")
        if where:
            base_sql += " WHERE " + " AND ".join(where)
        base_sql += f" ORDER BY id DESC LIMIT {limit}"

        cur = conn.execute(base_sql, params)
        rows = [{"id": r["id"], "content": r["content"], "created_at": r["created_at"]} for r in cur.fetchall()]
        conn.close()
        return jsonify({"rows": rows, "meta": {"limit": limit}})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve the static index.html as the root
@app.route("/")
def index():
    # inject a small config into index via simple replacement to avoid template engines
    path = os.path.join(app.static_folder, "index.html")
    with open(path, "r", encoding="utf-8") as f:
        html_content = f.read()
    html_content = html_content.replace("%REFRESH_MS%", str(int(REFRESH_INTERVAL * 1000)))
    html_content = html_content.replace("%DB_PATH%", html.escape(DB_PATH))
    return Response(html_content, mimetype="text/html")

if __name__ == "__main__":
    print(f"Starting server for DB: {DB_PATH}. Open http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
