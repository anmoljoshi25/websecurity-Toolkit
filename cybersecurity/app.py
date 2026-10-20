from flask import Flask, render_template, request, jsonify, session
from urllib.parse import urlparse
import requests
import ipaddress
import socket
import os
import sqlite3
import secrets
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash


app = Flask(__name__)
app.secret_key = os.environ.get("WS_TOOLKIT_SECRET", "dev-only-change-this-secret-" + secrets.token_hex(16))
DATABASE = os.path.join(os.path.dirname(__file__), "users.db")


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Please sign in to use this tool."}), 401
        return view(*args, **kwargs)
    return wrapped


init_db()


# =========================================
# HOME PAGE
# =========================================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/auth/me")
def auth_me():
    if session.get("user_id"):
        return jsonify({"logged_in": True, "username": session.get("username", "")})
    return jsonify({"logged_in": False})


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if len(username) < 3 or len(username) > 40:
        return jsonify({"error": "Choose a username between 3 and 40 characters."}), 400
    if not all(ch.isalnum() or ch in "._-" for ch in username):
        return jsonify({"error": "Username can use letters, numbers, dots, underscores and hyphens only."}), 400
    if len(password) < 8:
        return jsonify({"error": "Use a password with at least 8 characters."}), 400
    try:
        with get_db() as db:
            cursor = db.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                                (username, generate_password_hash(password)))
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        return jsonify({"error": "That username is already registered. Please sign in instead."}), 409
    session.clear()
    session["user_id"] = user_id
    session["username"] = username
    return jsonify({"message": "Account created. You are signed in.", "username": username})


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    with get_db() as db:
        user = db.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Username or password is incorrect."}), 401
    session.clear()
    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"message": "Welcome back! You are signed in.", "username": user["username"]})


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify({"message": "You have signed out."})


# =========================================
# TARGET CLASSIFICATION
# Supports public, local, private, loopback and reserved lab targets.
# The Flask server itself binds to 127.0.0.1, so this is intended for
# local coursework/lab use. Do not expose this scanner directly to the
# public internet without adding authentication and SSRF protections.
# =========================================

def classify_ip(ip):
    flags = []
    if ip.is_loopback:
        flags.append("loopback")
    if ip.is_private:
        flags.append("private")
    if ip.is_link_local:
        flags.append("link-local")
    if ip.is_reserved:
        flags.append("reserved")
    if ip.is_multicast:
        flags.append("multicast")
    if ip.is_unspecified:
        flags.append("unspecified")
    return flags


def normalize_target(url):
    url = url.strip()
    if not url:
        return None, "URL is required."

    if not urlparse(url).scheme:
        url = "http://" + url

    parsed = urlparse(url)
    if parsed.scheme not in ["http", "https"]:
        return None, "Only HTTP and HTTPS URLs are supported."
    if not parsed.hostname:
        return None, "A valid hostname or IP address is required."
    if parsed.username or parsed.password:
        return None, "URLs containing embedded usernames or passwords are not supported."
    return url, None


def get_target_scope(url):
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    addresses = []

    try:
        addresses.append(ipaddress.ip_address(hostname))
    except ValueError:
        try:
            infos = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
            for info in infos:
                try:
                    addr = info[4][0].split('%')[0]
                    ip = ipaddress.ip_address(addr)
                    if ip not in addresses:
                        addresses.append(ip)
                except ValueError:
                    continue
        except socket.gaierror:
            return {"hostname": hostname, "addresses": [], "scopes": ["unresolved"]}

    scopes = []
    for ip in addresses:
        scopes.extend(classify_ip(ip))
    if not scopes:
        scopes = ["public/normal"]
    else:
        scopes = list(dict.fromkeys(scopes))
    return {
        "hostname": hostname,
        "addresses": [str(ip) for ip in addresses],
        "scopes": scopes
    }


def is_allowed_target(url):
    # The project is a local coursework scanner. All HTTP/HTTPS target
    # classes are intentionally supported, including private/reserved labs.
    normalized, error = normalize_target(url)
    return bool(normalized and not error)


def request_target(url):
    return requests.get(
        url,
        timeout=(3.05, 7),
        allow_redirects=True,
        headers={"User-Agent": "WS-Toolkit/1.0 Security Learning Scanner"}
    )


# =========================================
# VULNERABILITY SCANNER
# =========================================

@app.route("/api/scan-vulnerability", methods=["POST"])
@login_required
def scan_vulnerability():

    data = request.get_json(silent=True) or {}

    target = data.get("url", "")
    target, error = normalize_target(target)
    if error:
        return jsonify({"error": error}), 400

    try:
        response = request_target(target)
        scope = get_target_scope(target)

        findings = []

        # HTTPS check
        if target.startswith("https://"):

            findings.append({
                "name": "HTTPS",
                "status": "Present"
            })

        else:

            findings.append({
                "name": "HTTPS",
                "status": "Not detected"
            })

        # Server header
        if "Server" in response.headers:

            findings.append({
                "name": "Server header",
                "status":
                    "Exposed: " +
                    response.headers["Server"]
            })

        else:

            findings.append({
                "name": "Server header",
                "status": "Not exposed"
            })

        # Security headers
        security_headers = [
            "Content-Security-Policy",
            "X-Content-Type-Options",
            "X-Frame-Options",
            "Strict-Transport-Security"
        ]

        for header in security_headers:

            findings.append({
                "name": header,
                "status":
                    "Present"
                    if header in response.headers
                    else "Missing"
            })

        # A small set of additional passive checks.
        cookie_header = response.headers.get("Set-Cookie", "")
        if cookie_header:
            findings.append({
                "name": "Cookie flags",
                "status": "Check Secure/HttpOnly/SameSite attributes"
            })
        else:
            findings.append({"name": "Cookies", "status": "No Set-Cookie header observed"})

        findings.append({
            "name": "Target scope",
            "status": ", ".join(scope["scopes"])
        })

        return jsonify({
            "target": target,
            "final_url": response.url,
            "status_code": response.status_code,
            "content_type": response.headers.get("Content-Type", "Unknown"),
            "findings": findings,
            "scope": scope
        })

    except requests.RequestException as error:

        return jsonify({
            "error":
                f"Could not connect to target: {error}"
        }), 400


# =========================================
# SECURITY HEADER CHECKER
# =========================================

@app.route("/api/check-headers", methods=["POST"])
@login_required
def check_headers():

    data = request.get_json(silent=True) or {}

    target = data.get("url", "")
    target, error = normalize_target(target)
    if error:
        return jsonify({"error": error}), 400

    required_headers = [

        "Content-Security-Policy",

        "Strict-Transport-Security",

        "X-Content-Type-Options",

        "X-Frame-Options",

        "Referrer-Policy",

        "Permissions-Policy"

    ]

    try:

        response = request_target(target)

        results = []

        for header in required_headers:

            results.append({

                "name": header,

                "present":
                    header in response.headers

            })

        return jsonify({
            "target": target,
            "final_url": response.url,
            "status_code": response.status_code,
            "headers": results,
            "scope": get_target_scope(target)
        })

    except requests.RequestException as error:

        return jsonify({

            "error":
                f"Could not connect to target: {error}"

        }), 400


# =========================================
# ERROR HANDLERS
# =========================================

@app.errorhandler(404)
def page_not_found(error):

    return jsonify({
        "error": "Page not found."
    }), 404


@app.errorhandler(500)
def server_error(error):

    return jsonify({
        "error": "Internal server error."
    }), 500


# =========================================
# RUN SERVER
# =========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )