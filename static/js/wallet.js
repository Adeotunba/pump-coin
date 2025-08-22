// static/js/wallet.js
(function () {
  function short(pk) {
    const s = pk.toString();
    return s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
  }

  function $(id) { return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", () => {
    const statusEl = $("wallet-status");
    const connectBtn = $("connect-phantom");
    const disconnectBtn = $("disconnect-phantom");

    const phantom = window?.phantom?.solana;

    function setDisconnected() {
      if (statusEl) statusEl.textContent = "Wallet: not connected";
      if (connectBtn) connectBtn.style.display = "inline-flex";
      if (disconnectBtn) disconnectBtn.style.display = "none";
    }

    function setConnected(pubkey) {
      if (statusEl) statusEl.textContent = `Wallet: ${short(pubkey)}`;
      if (connectBtn) connectBtn.style.display = "none";
      if (disconnectBtn) disconnectBtn.style.display = "inline-flex";
    }

    async function connect() {
      if (!phantom || !phantom.isPhantom) {
        window.open("https://phantom.app/download", "_blank");
        return;
      }
      try {
        const { publicKey } = await phantom.connect({ onlyIfTrusted: false });
        setConnected(publicKey);
      } catch (e) {
        console.warn("connect cancelled/failed:", e);
      }
    }

    async function disconnect() {
      try { await phantom?.disconnect?.(); } catch {}
      setDisconnected();
    }

    // Wire buttons
    connectBtn?.addEventListener("click", connect);
    disconnectBtn?.addEventListener("click", disconnect);

    // Listen to Phantom events
    if (phantom) {
      phantom.on?.("connect", (pk) => setConnected(pk));
      phantom.on?.("disconnect", setDisconnected);
      if (phantom.isConnected && phantom.publicKey) {
        setConnected(phantom.publicKey);
      } else {
        setDisconnected();
      }
    } else {
      setDisconnected();
    }
  });
})();
