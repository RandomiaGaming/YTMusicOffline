from flask import Flask, send_from_directory
import os

app = Flask(__name__)

# Serve files from the current directory
@app.route('/<path:filename>')
def serve_file(filename):
    # Replace '.' with the directory you want to serve
    directory = os.getcwd()  # or specify any directory path here
    return send_from_directory(directory, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
