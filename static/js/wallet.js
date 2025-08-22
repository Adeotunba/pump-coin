// static/js/wallet.js
(function () {
  const $ = (s) => document.querySelector(s);
  const statusEl = () => $("#wallet-status");
  const connectBtn = () => $("#connect-phantom");
  const disconnectBtn = () => $("#disconnect-phantom");

  function shorten(pk) { return pk.slice(0, 4) + "…" + pk.slice(-4); }
  function setConnected(pubkey) {
    if (statusEl()) statusEl().textContent = `Wallet: ${shorten(pubkey)}`;
    if (connectBtn()) connectBtn().classList.add("hidden");
    if (disconnectBtn()) disconnectBtn().classList.remove("hidden");
  }
  function setDisconnected() {
    if (statusEl()) statusEl().textContent = "Wallet: not connected";
    if (connectBtn()) connectBtn().classList.remove("hidden");
    if (disconnectBtn()) disconnectBtn().classList.add("hidden");
  }

  async function init() {
    // On GitHub Pages, ensure relative links resolve under /pump-coin/
    try {
      const isGh = location.hostname.endsWith("github.io");
      if (isGh) {
        const base = document.createElement("base");
        base.href = "/pump-coin/";
        document.head.prepend(base);
      }
    } catch {}

    const provider = window.solana || (window.phantom && window.phantom.solana);
    if (!provider || !provider.isPhantom) {
      if (statusEl()) statusEl().textContent = "Install Phantom to continue";
      if (connectBtn()) {
        connectBtn().textContent = "Install Phantom";
        connectBtn().onclick = () => window.open("https://phantom.app/", "_blank");
      }
      return;
    }

    provider.on("connect", () => setConnected(provider.publicKey.toBase58()));
    provider.on("disconnect", () => setDisconnected());

    // Try silent reconnect if user already approved on this origin
    try { await provider.connect({ onlyIfTrusted: true }); } catch {}
    if (provider.publicKey) setConnected(provider.publicKey.toBase58());
    else setDisconnected();

    if (connectBtn()) {
      connectBtn().onclick = async () => {
        try { await provider.connect(); }
        catch (e) { console.warn("Connect rejected", e); }
      };
    }
    if (disconnectBtn()) {
      disconnectBtn().onclick = async () => {
        try { await provider.disconnect(); } catch {}
      };
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
