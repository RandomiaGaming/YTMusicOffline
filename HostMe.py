from flask import Flask
from flask import send_from_directory
import os
import webbrowser

host = "localhost"
port = 8080
url = f"http://{host}:{port}/"
root = os.getcwd()
app = Flask(__name__)


@app.route("/")
def serve_index():
    return send_from_directory(root, "index.html")


@app.route("/<path:filename>")
def serve_file(filename):
    return send_from_directory(root, filename)


print(f"Hosting {root} at {url}...")
if not webbrowser.open(url):
    os.system(f"xdg-open {url}")

app.run(host="localhost", port=8080)
