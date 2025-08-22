/* static/js/wallet.js */
(() => {
  const $ = (s) => document.querySelector(s);
  const statusEl = $('#wallet-status');
  const btnEl = $('#connect-phantom');

  const setStatus = (txt) => { if (statusEl) statusEl.textContent = txt; };

  async function connect() {
    if (!window?.solana?.isPhantom) {
      alert('Phantom wallet not found. Please install the Phantom browser extension.');
      return;
    }
    try {
      const resp = await window.solana.connect(); // will open Phantom prompt
      const pk = resp.publicKey.toBase58();
      setStatus(`Wallet: ${pk.slice(0,4)}…${pk.slice(-4)}`);
      btnEl.textContent = 'Disconnect';
      btnEl.onclick = disconnect;
    } catch (e) {
      console.error('[wallet] connect error:', e);
      setStatus('Wallet: not connected');
    }
  }

  async function disconnect() {
    try { await window.solana.disconnect(); } catch {}
    setStatus('Wallet: not connected');
    btnEl.textContent = 'Connect Phantom';
    btnEl.onclick = connect;
  }

  window.addEventListener('load', () => {
    if (btnEl) btnEl.onclick = connect;

    if (window.solana) {
      window.solana.on('connect', () => {
        const pk = window.solana.publicKey?.toBase58?.() || '';
        if (pk) {
          setStatus(`Wallet: ${pk.slice(0,4)}…${pk.slice(-4)}`);
          if (btnEl) { btnEl.textContent = 'Disconnect'; btnEl.onclick = disconnect; }
        }
      });
      window.solana.on('disconnect', () => {
        setStatus('Wallet: not connected');
        if (btnEl) { btnEl.textContent = 'Connect Phantom'; btnEl.onclick = connect; }
      });
    }
  });
})();
