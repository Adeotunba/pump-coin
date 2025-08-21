// Minimal Phantom connect helper (no <script> wrappers)
(function () {
  const btn = document.getElementById('connectBtn');
  const addr = document.getElementById('walletAddr');

  function shorten(pk) { return pk.slice(0, 4) + '…' + pk.slice(-4); }

  async function connectPhantom() {
    try {
      const p = window.solana;
      if (!p || !p.isPhantom) {
        alert("Phantom not detected. Please install Phantom Wallet.");
        window.open("https://phantom.app/", "_blank");
        return;
      }
      const resp = await p.connect({ onlyIfTrusted: false });
      const pubkey = resp?.publicKey?.toString?.();
      if (pubkey) {
        if (addr) addr.textContent = shorten(pubkey);
        if (btn) {
          btn.textContent = "Connected";
          btn.disabled = true;
          btn.classList.add("opacity-70","cursor-not-allowed");
        }
        localStorage.setItem("wallet_pubkey", pubkey);
      }
    } catch (e) {
      console.error("Phantom connect error:", e);
      alert("Could not connect wallet. Check Phantom popup or unlock your wallet.");
    }
  }

  async function bootstrap() {
    const p = window.solana;
    if (p?.isPhantom) {
      try {
        const resp = await p.connect({ onlyIfTrusted: true });
        const pubkey = resp?.publicKey?.toString?.();
        if (pubkey) {
          if (addr) addr.textContent = shorten(pubkey);
          if (btn) {
            btn.textContent = "Connected";
            btn.disabled = true;
            btn.classList.add("opacity-70","cursor-not-allowed");
          }
          localStorage.setItem("wallet_pubkey", pubkey);
        }
      } catch {}
    }
  }

  if (btn) btn.addEventListener("click", connectPhantom);
  document.addEventListener("DOMContentLoaded", bootstrap);
})();
