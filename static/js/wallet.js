<script>
// static/js/wallet.js
(function () {
  const $ = (s) => document.querySelector(s);
  const statusEl = () => $("#wallet-status");
  const connectBtn = () => $("#connect-phantom");
  const disconnectBtn = () => $("#disconnect-phantom");

  function provider() {
    return window.phantom?.solana || window.solana;
  }

  async function setStatus(pubkey) {
    if (statusEl()) {
      if (pubkey) {
        const s = pubkey.toBase58();
        statusEl().textContent = `Wallet: ${s.slice(0, 4)}…${s.slice(-4)}`;
      } else {
        statusEl().textContent = "Wallet: not connected";
      }
    }
    if (connectBtn()) connectBtn().style.display = pubkey ? "none" : "inline-block";
    if (disconnectBtn()) disconnectBtn().style.display = pubkey ? "inline-block" : "none";
  }

  async function connectPhantom() {
    const p = provider();
    if (!p?.isPhantom) {
      alert("Phantom not found. Install the Phantom extension, unlock it, then reload.");
      return;
    }
    try {
      const resp = await p.connect({ onlyIfTrusted: false });
      await setStatus(resp.publicKey);
    } catch (e) {
      console.error("[wallet] connect error", e);
      alert("Connect was rejected or failed.");
    }
  }

  async function disconnectPhantom() {
    try {
      const p = provider();
      if (p?.disconnect) await p.disconnect();
    } finally {
      await setStatus(null);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (connectBtn()) connectBtn().addEventListener("click", connectPhantom);
    if (disconnectBtn()) disconnectBtn().addEventListener("click", disconnectPhantom);

    const p = provider();
    if (p) {
      p.on?.("connect", () => setStatus(p.publicKey));
      p.on?.("disconnect", () => setStatus(null));
      p.connect?.({ onlyIfTrusted: true })
        .then(() => setStatus(p.publicKey))
        .catch(() => setStatus(null));
    } else {
      setStatus(null);
    }
    console.log("[wallet] ready on", location.pathname);
  });

  // expose for quick debugging in DevTools
  window.pumpcoin = { provider, connectPhantom, disconnectPhantom };
})();
</script>
