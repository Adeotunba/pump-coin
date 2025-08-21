// /static/js/agent.js
(function(){
  const style = document.createElement("style");
  style.textContent = `
  .pc-agent { position: fixed; right: 16px; bottom: 16px; z-index: 9999; font-family: ui-sans-serif,system-ui; }
  .pc-bubble { background:#0ea5e9; color:#fff; border-radius:999px; padding:12px 16px; cursor:pointer; box-shadow:0 8px 20px rgba(0,0,0,.25); }
  .pc-panel { width: 320px; height: 420px; background:#0b1220; color:#cbd5e1; border:1px solid #1f2937; border-radius:16px; overflow:hidden; display:none; flex-direction:column; box-shadow:0 20px 48px rgba(0,0,0,.35); }
  .pc-header { padding:12px 16px; background:#0f172a; color:#e2e8f0; font-weight:600; display:flex; justify-content:space-between; align-items:center; }
  .pc-body { flex:1; padding:12px; overflow:auto; }
  .pc-msg { margin:8px 0; padding:10px 12px; border-radius:12px; }
  .pc-msg.user { background:#1e293b; }
  .pc-msg.bot { background:#0f172a; border:1px solid #1f2937; }
  .pc-input { display:flex; gap:8px; padding:12px; border-top:1px solid #1f2937; background:#0b1220; }
  .pc-input input { flex:1; padding:10px 12px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#e2e8f0; }
  .pc-input button { padding:10px 12px; border-radius:8px; background:#0ea5e9; color:#fff; border:none; }
  .pc-lead { display:flex; gap:6px; margin-top:8px; }
  .pc-lead input { flex:1; padding:8px 10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#e2e8f0; }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "pc-agent";
  root.innerHTML = `
    <div id="pcBubble" class="pc-bubble">Need help? 💬</div>
    <div id="pcPanel" class="pc-panel">
      <div class="pc-header">pump.coin Assistant <button id="pcClose" style="background:none;border:none;color:#94a3b8">✕</button></div>
      <div id="pcBody" class="pc-body"></div>
      <div class="pc-input">
        <input id="pcText" placeholder="Ask about mint, metadata, fees, Raydium…">
        <button id="pcSend">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const bubble = root.querySelector("#pcBubble");
  const panel = root.querySelector("#pcPanel");
  const body  = root.querySelector("#pcBody");
  const close = root.querySelector("#pcClose");
  const text  = root.querySelector("#pcText");
  const send  = root.querySelector("#pcSend");

  function showPanel(){ panel.style.display = "flex"; bubble.style.display="none"; greet(); }
  function hidePanel(){ panel.style.display = "none"; bubble.style.display="inline-block"; }
  bubble.onclick = showPanel; close.onclick = hidePanel;

  function addMsg(who, msg){
    const div = document.createElement("div");
    div.className = `pc-msg ${who}`;
    div.textContent = msg;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function greet(){
    if (body.dataset.greeted) return;
    body.dataset.greeted = "1";
    addMsg("bot", "Hi! I can guide you through minting, metadata, Raydium liquidity, fees, and renounce.");
    addMsg("bot", "Try: “How do I mint?”, “What does renounce mean?”, or “What’s the fee?”");
  }

  async function ask(msg){
    addMsg("user", msg);
    // light client-side routing
    const m = msg.toLowerCase();
    if (m.includes("mint")) return addMsg("bot", "Connect Phantom → fill name/symbol/decimals/supply → Create Mint. Start on devnet. We’ll show your mint address and guide Step 2.");
    if (m.includes("renounce")) return addMsg("bot", "Renounce removes your authority forever. Use Guardian: Check → Renounce Mint → Renounce Freeze. Only when you’re sure.");
    if (m.includes("raydium")) return addMsg("bot", "After mint, create a Raydium pool and add liquidity. We prefill mint + decimals to avoid mistakes.");
    if (m.includes("fee")) return addMsg("bot", "Pay the platform fee once to unlock ‘Create Mint’. It’s verifiable on-chain. You’ll see the prompt before minting.");
    // fallback to server (can be swapped to LLM later)
    try{
      const r = await fetch("/api/agent", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ message: msg })
      });
      const j = await r.json();
      addMsg("bot", j.answer || "I’m here to help! Ask me about mint, metadata, Raydium, or fees.");
    }catch(e){
      addMsg("bot", "Network hiccup. Try again in a moment.");
    }
  }

  send.onclick = ()=> { if (text.value.trim()) { ask(text.value.trim()); text.value=""; } };
  text.addEventListener("keydown", (e)=> { if (e.key === "Enter") send.click(); });
})();
