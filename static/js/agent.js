// static/js/agent.js
(function () {
  const root = document.createElement("div");
  root.innerHTML = `
    <style>
      #pc-agent { position: fixed; right: 16px; bottom: 16px; z-index: 9999; font-family: system-ui, sans-serif; }
      #pc-open { width: 52px; height: 52px; border-radius: 999px; border: none; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,.25);}
      #pc-panel { display:none; width: 320px; height: 420px; background:#0b1220; color:#cde3ff; border:1px solid #1f2a44; border-radius: 14px; overflow: hidden; }
      #pc-head { background:#0f172a; padding:10px 12px; font-weight:600; display:flex; justify-content:space-between; align-items:center;}
      #pc-body { padding:10px; height: 300px; overflow:auto; }
      #pc-form { display:flex; gap:6px; padding:10px; border-top:1px solid #1f2a44;}
      #pc-form input { flex:1; padding:8px 10px; border-radius:10px; border:1px solid #1f2a44; background:#0b1220; color:#cde3ff;}
      #pc-form button { padding:8px 12px; border-radius:10px; border:1px solid #1f2a44; background:#1e293b; color:#fff; cursor:pointer;}
      .pc-row { margin:8px 0; }
      .pc-a { background:#0f172a; padding:8px 10px; border-radius:10px; display:inline-block; }
    </style>
    <div id="pc-agent">
      <button id="pc-open">💬</button>
      <div id="pc-panel">
        <div id="pc-head">
          <span>pump.coin helper</span>
          <button id="pc-close" style="background:none;border:none;color:#9fb3d9;cursor:pointer;font-size:18px;">✕</button>
        </div>
        <div id="pc-body"></div>
        <div id="pc-form">
          <input id="pc-input" placeholder="Ask me about minting, metadata, Raydium…" />
          <button id="pc-send">Send</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector("#pc-panel");
  root.querySelector("#pc-open").onclick = () => { panel.style.display = "block"; };
  root.querySelector("#pc-close").onclick = () => { panel.style.display = "none"; };

  const body = root.querySelector("#pc-body");
  function addMsg(text) {
    const row = document.createElement("div");
    row.className = "pc-row";
    row.innerHTML = `<div class="pc-a">${text}</div>`;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  addMsg("Hi! I can guide you. Try: “How do I mint?”, “Save metadata?”, or “Raydium LP?”.");
  const input = root.querySelector("#pc-input");

  async function send() {
    const q = input.value.trim();
    if (!q) return;
    addMsg(`You: ${q}`);
    input.value = "";
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q })
      });
      const j = await r.json();
      addMsg(j.answer || "Okay.");
    } catch (e) {
      addMsg("Network error.");
    }
  }

  root.querySelector("#pc-send").onclick = send;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
})();
