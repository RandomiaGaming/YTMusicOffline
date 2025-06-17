# User Settings
host = "127.0.0.1"
port = 8080
custom_root = None
open_in_browser = True

# Import builtins (part of python)
import sys
import webbrowser
import hashlib
import os
import time
import subprocess

# Import pip dependencies
try:
    import flask
except:
    print(f"ERROR: Dependency flask not found. Would you like to install it now? (y/n)")
    choice = input().lower()
    if choice == "y" or choice == "yes":
        print()            
        print(f"> python -m pip install flask")
        errorCode = subprocess.run("python -m pip install flask", env=os.environ.copy()).returncode
        print()
        if errorCode != 0:
           print(f"ERROR: python -m pip install flask failed with error code {errorCode}.")
           sys.exit(1)
        import flask
    else:
        print(f"Execution cannot continue without required dependency flask.")
        sys.exit(1)

# Init flask
url = f"http://{host}:{port}/"
if custom_root != None:
    root = custom_root
else:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = flask.Flask("YTMusicOffline")

# Define flask methods and endpoints
def compute_etag(filepath):
    hash_bytes = hashlib.sha256(filepath.encode("utf-8")).digest()
    hash_int = int.from_bytes(hash_bytes) % 1000000000
    return f"{hash_int}"

@app.route("/api/save_database", methods=["POST"])
def update_database():
    database_path = os.path.join(root, "database", "database.json")
    database_json = flask.request.data.decode("utf-8")
    with open(database_path, "w", encoding="utf-8") as file:
        file.write(database_json)
    return flask.make_response("", 200)

@app.route("/")
def serve_slash():
    file_path = os.path.join(root, "client", "index.html")
    return serve_file(file_path)

@app.route("/<path:file_name>")
def serve_slash_filename(file_name):
    file_path = os.path.join(root, "client", file_name)
    return serve_file(file_path)

@app.route("/database/<path:file_name>")
def serve_slash_database_slash_filename(file_name):
    file_path = os.path.join(root, "database", file_name)
    return serve_file(file_path)

def serve_file(file_path):
    time.sleep(0.5)
    response = flask.send_from_directory(os.path.dirname(file_path), os.path.basename(file_path))
    response.headers.pop("Content-Disposition", None)
    response.headers.pop("Date", None)
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Etag"] = compute_etag(file_path)
    return response

# Run server and catch errors
try:
    print(f"Hosting {root} at {url}...")
    if open_in_browser:
        if not webbrowser.open(url):
            if (os.system(f"start {url}") != 0):
                if (os.system(f"xdg-open {url}") != 0):
                    print(f"Failed to launch {url} please open manually.")
    app.run(host=host, port=port)
except KeyboardInterrupt:
    sys.exit(0)
except:
    raise