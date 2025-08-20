import os
import re
import json
import base64
import secrets
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# -------------------------------------------------
# App setup
# -------------------------------------------------
load_dotenv()

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"
META_DIR = STATIC_DIR / "meta"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
META_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

PORT = int(os.getenv("PORT", "5000"))

# -------------------------------------------------
# Pages (served from /static)
# -------------------------------------------------
@app.route("/")
def home():
    return app.send_static_file("index.html")

@app.route("/mint")
def mint_page():
    return app.send_static_file("mint.html")

@app.route("/raydium")
def raydium_page():
    return app.send_static_file("raydium.html")

@app.route("/guardian")
def guardian_page():
    return app.send_static_file("guardian.html")

# -------------------------------------------------
# Utilities
# -------------------------------------------------
def host_base() -> str:
    # e.g., "http://127.0.0.1:5000"
    return (request.host_url or "").rstrip("/")

def slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or secrets.token_urlsafe(4)

# -------------------------------------------------
# Health
# -------------------------------------------------
@app.route("/health")
def health():
    return jsonify({"ok": True, "ts": datetime.utcnow().isoformat() + "Z"})

# -------------------------------------------------
# Upload image (expects data_url)
# -------------------------------------------------
@app.route("/upload-asset", methods=["POST"])
def upload_asset():
    data = request.get_json(force=True) or {}
    data_url = data.get("data_url") or ""
    if not data_url.startswith("data:image/"):
        return jsonify({"ok": False, "error": "Expected data_url starting with data:image/"}), 400

    try:
        header, b64 = data_url.split(",", 1)
        ext = "png"
        if "image/png" in header:
            ext = "png"
        elif "image/jpeg" in header or "image/jpg" in header:
            ext = "jpg"
        elif "image/webp" in header:
            ext = "webp"

        raw = base64.b64decode(b64)
        fname = f"{secrets.token_urlsafe(8)}.{ext}"
        fpath = UPLOADS_DIR / fname
        with open(fpath, "wb") as f:
            f.write(raw)

        url = f"{host_base()}/static/uploads/{fname}"
        return jsonify({"ok": True, "url": url, "filename": fname})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

# -------------------------------------------------
# Save metadata JSON (Metaplex-style)
# -------------------------------------------------
@app.route("/save-metadata", methods=["POST"])
def save_metadata():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "Your Meme Token").strip()
    symbol = (data.get("symbol") or "MEME").strip()
    description = (data.get("description") or "").strip()
    image_url = (data.get("image_url") or "").strip()
    external_url = (data.get("external_url") or "").strip()
    attributes = data.get("attributes") or []

    # Minimal Metaplex metadata schema
    meta = {
        "name": name,
        "symbol": symbol,
        "description": description,
        "image": image_url,
        "external_url": external_url,
        "attributes": attributes,
        "properties": {
            "files": [{"uri": image_url, "type": "image/png"}],
            "category": "image"
        }
    }

    try:
        base = slugify(name)
        fname = f"{base}-{secrets.token_urlsafe(6)}.json"
        fpath = META_DIR / fname
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        url = f"{host_base()}/static/meta/{fname}"
        return jsonify({"ok": True, "url": url, "filename": fname, "meta": meta})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

# -------------------------------------------------
# Marketing generator (simple template-based)
# -------------------------------------------------
@app.route("/generate", methods=["POST"])
def generate_copy():
    data = request.get_json(force=True) or {}
    token_name = (data.get("token_name") or "Your Meme Token").strip()
    symbol = (data.get("symbol") or "MEME").strip().upper()
    tier_sol = float(data.get("tier_sol") or 0.5)
    schedule_iso = data.get("schedule_iso")
    network = (data.get("network") or "devnet").strip()

    when = schedule_iso or "TBA"
    hashtag = f"#{symbol}"

    tweet = (
        f"{token_name} (${symbol}) launching on Solana {network}!\n"
        f"Fair vibes. No presale. Community-first.\n"
        f"Mint window: {when}\n"
        f"Tier: {tier_sol} SOL  {hashtag} #Solana #memecoin\n"
        f"Get prepped: {host_base()}/"
    )

    telegram = (
        f"<b>{token_name} (${symbol})</b>\n"
        f"Network: {network}\n"
        f"Mint window: {when}\n"
        f"Tier: {tier_sol} SOL\n"
        f"Launch wizard: <a href='{host_base()}/'>{host_base()}/</a>"
    )

    disc_embed = {
        "title": f"{token_name} (${symbol}) — Launch",
        "description": (
            f"• Network: {network}\n"
            f"• Mint: {when}\n"
            f"• Tier: {tier_sol} SOL\n"
            f"• Prep: {host_base()}/"
        )
    }

    long_desc = (
        f"{token_name} (${symbol}) is a community-first launch on Solana {network}. "
        f"Transparent steps, open launch pack, and fair mechanics. "
        f"No promise of profit—just memes, culture, and coordination."
    )

    return jsonify({
        "ok": True,
        "tweet": tweet,
        "telegram_message": telegram,
        "discord_embed": disc_embed,
        "description": long_desc
    })

# -------------------------------------------------
# Prelaunch microsite (returns static HTML string)
# -------------------------------------------------
@app.route("/prelaunch", methods=["POST"])
def prelaunch():
    data = request.get_json(force=True) or {}
    name = (data.get("token_name") or "Your Meme Token").strip()
    symbol = (data.get("symbol") or "MEME").strip().upper()
    pitch = (data.get("pitch") or "Community-first fair launch on Solana.").strip()
    mint_time = data.get("mint_time") or "TBA"
    network = (data.get("network") or "devnet").strip()

    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name} (${symbol}) — Prelaunch</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
</head><body>
  <h1>{name} (${symbol})</h1>
  <p><b>Network:</b> {network}</p>
  <p><b>Mint window:</b> {mint_time}</p>
  <p>{pitch}</p>
  <p>Wizard: <a href="{host_base()}/">{host_base()}/</a></p>
</body></html>"""
    return jsonify({"ok": True, "html": html})

# -------------------------------------------------
# Affiliate link (dummy generator)
# -------------------------------------------------
@app.route("/ref-link", methods=["POST"])
def ref_link():
    data = request.get_json(force=True) or {}
    symbol = (data.get("symbol") or "MEME").strip().upper()
    code = secrets.token_urlsafe(6)
    # This is a simple demo link; you can later implement real tracking/redirect.
    link = f"{host_base()}/?utm_source=ref&utm_code={code}&s={symbol}"
    share = 0.15  # 15% as a demo
    return jsonify({"ok": True, "code": code, "link": link, "share": share})

# -------------------------------------------------
# Run
# -------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
