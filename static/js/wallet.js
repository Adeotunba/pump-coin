// static/js/wallet.js
(() => {
  const getProvider = () => window.solana || (window.phantom && window.phantom.solana);
  const short = (s) => (s && s.length > 8) ? `${s.slice(0,4)}…${s.slice(-4)}` : s;

  async function connectPhantom() {
    const provider = getProvider();
    if (!provider || !provider.isPhantom) {
      alert("Phantom wallet not found. Please install it first.");
      window.open("https://phantom.app/download", "_blank");
      return;
    }
    try {
      const { publicKey } = await provider.connect({ onlyIfTrusted: false });
      const pk = publicKey.toBase58();
      localStorage.setItem("wallet_pubkey", pk);
      document.querySelectorAll("[data-wallet-text]").forEach(el => el.textContent = short(pk));
      document.querySelectorAll('[data-connect="phantom"]').forEach(btn => btn.classList.add("connected"));
      console.log("Connected:", pk);
    } catch (e) {
      console.error("Wallet connect error:", e);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-connect="phantom"]').forEach(btn => {
      btn.addEventListener("click", connectPhantom);
    });
    const stored = localStorage.getItem("wallet_pubkey");
    if (stored) {
      document.querySelectorAll("[data-wallet-text]").forEach(el => el.textContent = short(stored));
    }
  });
})();
