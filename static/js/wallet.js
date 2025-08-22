/* static/js/wallet.js */
(() => {
  const $ = (id) => document.getElementById(id);

  function provider() {
    return window.phantom?.solana || window.solana;
  }

  function short(pk) {
    const s = pk.toString();
    return `${s.slice(0, 4)}…${s.slice(-4)}`;
  }

  async function connect() {
    const p = provider();
    if (!p || !p.isPhantom) {
      alert("Phantom not detected. Install it from https://phantom.app");
      window.open("https://phantom.app", "_blank");
      return;
    }
    try {
      const resp = await p.connect({ onlyIfTrusted: false });
      setConnected(resp.publicKey);
    } catch (e) {
      console.error("connect error", e);
    }
  }

  async function disconnect() {
    try {
      await provider()?.disconnect();
    } catch (e) {
      console.error("disconnect error", e);
    }
  }

  function setConnected(pubkey) {
    const status = $("wallet-status");
    const btn = $("connect-phantom");
    if (!status || !btn) return;

    if (pubkey) {
      status.textContent = `Wallet: ${short(pubkey)}`;
      btn.textContent = "Disconnect";
      btn.onclick = disconnect;
    } else {
      status.textContent = "Wallet: not connected";
      btn.textContent = "Connect Phantom";
      btn.onclick = connect;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    // hook up events
    const p = provider();
    if (p) {
      p.on?.("connect", (pk) => setConnected(pk));
      p.on?.("disconnect", () => setConnected(null));
      if (p.isConnected && p.publicKey) setConnected(p.publicKey);
    }
    const btn = $("connect-phantom");
    if (btn) btn.onclick = connect; // default action
  });
})();
