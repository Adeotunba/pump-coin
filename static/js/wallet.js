// static/js/wallet.js
(() => {
  const $ = (s) => document.querySelector(s);
  const statusEl = () => $('#wallet-status');
  const btnEl = () => $('#connect-phantom');

  const setStatus = (t) => { if (statusEl()) statusEl().textContent = t; };
  const setBtn = (t, dis=false) => { if (btnEl()) { btnEl().textContent = t; btnEl().disabled = dis; } };

  function short(pk) { return pk ? pk.slice(0,4) + "…" + pk.slice(-4) : ""; }

  async function connectPhantom() {
    const p = window.solana;
    if (!p || !p.isPhantom) {
      setStatus("Phantom not found");
      window.open("https://phantom.app/download", "_blank", "noopener");
      return;
    }
    try {
      setBtn("Connecting…", true);
      const { publicKey } = await p.connect({ onlyIfTrusted: false });
      const pk = publicKey?.toBase58?.();
      setStatus("Wallet: " + short(pk));
      setBtn("Disconnect");
      btnEl().dataset.connected = "1";
    } catch (e) {
      console.log("[wallet] connect error:", e);
      setBtn("Connect Phantom");
    } finally {
      setBtn(btnEl().dataset.connected ? "Disconnect" : "Connect Phantom");
    }
  }

  function disconnectPhantom() {
    try { window.solana?.disconnect?.(); } catch(e){}
    setStatus("Wallet: not connected");
    setBtn("Connect Phantom");
    if (btnEl()) btnEl().dataset.connected = "";
  }

  window.addEventListener("DOMContentLoaded", () => {
    if (!btnEl()) { console.log("[wallet] button missing"); return; }
    setStatus("Wallet: not connected");
    setBtn("Connect Phantom");

    btnEl().addEventListener("click", () => {
      if (btnEl().dataset.connected) disconnectPhantom();
      else connectPhantom();
    });

    if (window.solana?.isPhantom) {
      window.solana.on?.("disconnect", () => disconnectPhantom());
      window.solana.connect({ onlyIfTrusted: true })
        .then(({ publicKey }) => {
          const pk = publicKey?.toBase58?.();
          if (pk) {
            setStatus("Wallet: " + short(pk));
            btnEl().dataset.connected = "1";
            setBtn("Disconnect");
          }
        })
        .catch(() => {});
    } else {
      console.log("[wallet] Phantom not injected");
    }
  });
})();
