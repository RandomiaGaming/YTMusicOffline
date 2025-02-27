DEBUG = True
host = "127.0.0.1"
port = 8080
custom_root = None

# Import builtins (part of python)
import webbrowser
import hashlib
import os
import datetime

# Import externals (must be installed with pip)
try:
    from flask import *
except:
    print("Error missing dependency. Flask is required. Would you like to install flask now? (y/n)")
    choice = input()
    if choice == "y" or choice == "yes":
        print()
        print("> pip install flask")
        os.system("pip install flask")
        print()
        from flask import *
    else:
        print("Execution cannot continue without required dependency flask. Aborting.")
        exit()

if not DEBUG:
    try:
        from gevent import pywsgi
    except:
        print("Error missing dependency. Gevent is required. Would you like to install gevent now? (y/n)")
        choice = input()
        if choice == "y" or choice == "yes":
            print()
            print("> pip install gevent")
            os.system("pip install gevent")
            print()
            from gevent import pywsgi
        else:
            print(
                "Execution cannot continue without required dependency gevent. Aborting.")
            exit()

url = f"http://{host}:{port}/"
if custom_root != None:
    root = custom_root
else:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = Flask("YTMOffline")


def compute_etag(filepath):
    hash_bytes = hashlib.sha256(filepath.encode("utf-8")).digest()
    hash_int = int.from_bytes(hash_bytes) % 1000000000
    return f"\"{hash_int}\""


@app.route("/api/save_database", methods=["POST"])
def update_database():
    database_path = os.path.join(root, "database", "database2.json")
    database_json = request.data.decode("utf-8")
    with open(database_path, "w") as file:
        file.write(database_json)
    return make_response("", 200)


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
    print("Got request for " + file_path)
    response = send_from_directory(os.path.dirname(file_path), os.path.basename(file_path))
    response.headers.pop("Content-Disposition", None)
    response.headers.pop("Date", None)
    response.headers["Cache-Control"] = "public, max-age=7200"
    response.headers["Accept-Ranges"] = "bytes"
    one_year_later = datetime.datetime.now(
        datetime.timezone.utc) + datetime.timedelta(seconds=7200)
    response.headers["Expires"] = one_year_later.strftime(
        "%a, %d %b %Y %H:%M:%S GMT")
    response.headers["Etag"] = compute_etag(file_path)
    return response


def open_in_browser(url):
    if not webbrowser.open(url):
        if (os.system(f"start {url}") != 0):
            if (os.system(f"xdg-open {url}") != 0):
                print(f"Failed to launch {url} please open manually.")


try:
    print(f"Hosting {root} at {url}...")
    open_in_browser(url)
    if DEBUG:
        app.run(host=host, port=port)
    else:
        server = pywsgi.WSGIServer((host, port), app)
        server.serve_forever()
except KeyboardInterrupt:
    exit()
except:
    raise
