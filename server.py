import os, json, base64, urllib.request
from urllib.error import URLError, HTTPError
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

APP_PORT = int(os.environ.get("PORT", "5000"))
APP_HOST = os.environ.get("HOST", "0.0.0.0")

# --- Solana RPC (devnet by default)
RPC_URL = os.environ.get("PUMP_RPC", "https://api.devnet.solana.com")
TREASURY = os.environ.get("PUMP_TREASURY", "")  # set to your SOL address for fee checks

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

# -------------------------------
# Static pages
# -------------------------------
@app.route("/")
def root():
    return send_from_directory("static", "index.html")

@app.route("/mint")
def page_mint():
    return send_from_directory("static", "mint.html")

@app.route("/raydium")
def page_raydium():
    return send_from_directory("static", "raydium.html")

@app.route("/guardian")
def page_guardian():
    return send_from_directory("static", "guardian.html")

# -------------------------------
# Health + env
# -------------------------------
@app.route("/health")
def health():
    return jsonify(ok=True, rpc=RPC_URL, treasury=bool(TREASURY))

@app.route("/api/env")
def api_env():
    return jsonify(network="devnet" if "devnet" in RPC_URL else "mainnet", rpc=RPC_URL, treasury=TreasuryOrNone())

def TreasuryOrNone():
    return TREASURY if TREASURY else None

# -------------------------------
# Verify a payment by signature
# Body: { "signature": "...", "minLamports": 2000000, "to": "<optional override>" }
# -------------------------------
@app.route("/api/verify-payment", methods=["POST"])
def verify_payment():
    try:
        data = request.get_json(force=True) or {}
        sig = data.get("signature", "").strip()
        min_lamports = int(data.get("minLamports", 0))
        to_addr = (data.get("to") or TREASURY or "").strip()

        if not sig:
            return jsonify(ok=False, error="Missing signature"), 400
        if not to_addr:
            return jsonify(ok=False, error="Treasury not configured"), 500

        # Solana getTransaction (jsonParsed) — confirmed or finalized
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [sig, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}]
        }
        req = urllib.request.Request(RPC_URL, data=json.dumps(payload).encode("utf-8"),
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            tx = json.loads(resp.read().decode("utf-8"))

        tx_result = (tx.get("result") or {})
        if not tx_result:
            return jsonify(ok=False, error="Transaction not found"), 404
        if tx_result.get("meta", {}).get("err"):
            return jsonify(ok=False, error="Transaction failed on-chain"), 400

        # Look for a system transfer to our treasury >= min_lamports
        message = tx_result.get("transaction", {}).get("message", {})
        inst = message.get("instructions", [])
        found = False
        amt = 0
        for ix in inst:
            if ix.get("program") == "system" and ix.get("parsed", {}).get("type") == "transfer":
                info = ix.get("parsed", {}).get("info", {})
                if info.get("destination") == to_addr:
                    amt = int(info.get("lamports", 0))
                    if amt >= min_lamports:
                        found = True
                        break

        return jsonify(ok=found, lamports=amt, to=to_addr, signature=sig)
    except (HTTPError, URLError) as e:
        return jsonify(ok=False, error=f"RPC error: {e}"), 502
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

# -------------------------------
# Front-desk AI (stubbed FAQ + lead capture)
# Body: { "message": "..." , "email": "optional", "handle": "optional" }
# -------------------------------
FAQ = [
    ("mint", "To mint: Connect Phantom → fill name/symbol/decimals/supply → click Create Mint. Start on devnet. After success, we’ll show your mint address and guide Step 2."),
    ("renounce", "Renounce = permanently remove your authority. Only do this when you’re sure. Use Guardian to Check → Renounce Mint → Renounce Freeze."),
    ("raydium", "After minting, head to Raydium to create a pool and add liquidity. We prefill your mint + decimals to reduce errors."),
    ("fee", "Platform fee covers infra and support. Pay once per mint to unlock Create Mint. Receipts are verifiable on-chain."),
    ("metadata", "Upload your image and JSON, then set the on-chain Metadata URI. We recommend permanent storage (Arweave/Bundlr) for trust.")
]
@app.route("/api/agent", methods=["POST"])
def agent():
    try:
        data = request.get_json(force=True) or {}
        msg = (data.get("message") or "").lower()
        email = (data.get("email") or "").strip()
        handle = (data.get("handle") or "").strip()

        # rudimentary routing
        answer = None
        for key, val in FAQ:
            if key in msg:
                answer = val
                break
        if not answer:
            answer = "I can help with mint, metadata, Raydium, fees, or renounce. Ask me anything or type 'mint help'."

        # here you could store leads to a file/db/CRM — we keep it simple:
        if email or handle:
            print(f"[LEAD] email={email} handle={handle} msg={msg}")

        return jsonify(ok=True, answer=answer)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

# -------------------------------
# Run
# -------------------------------
if __name__ == "__main__":
    print(f"[pump.coin] starting on http://127.0.0.1:{APP_PORT}  (RPC={RPC_URL})")
    app.run(host=APP_HOST, port=APP_PORT)
