# app.py
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="static", static_url_path="/static")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/mint")
def mint():
    return send_from_directory("static", "mint.html")

@app.route("/raydium")
def raydium():
    return send_from_directory("static", "raydium.html")

@app.route("/healthz")
def healthz():
    return "ok", 200

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
