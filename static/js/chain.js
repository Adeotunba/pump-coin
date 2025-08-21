<!-- Include these on pages that use chain.js (e.g., mint.html) -->
<script src="https://unpkg.com/@solana/web3.js@1.95.0/lib/index.iife.js"></script>
<script type="module" src="/static/js/chain.js"></script>
// /static/js/chain.js  (ES module)
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "https://esm.sh/@solana/spl-token@0.4.3";

import {
  PROGRAM_ID as TM_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "https://esm.sh/@metaplex-foundation/mpl-token-metadata@2.7.0";

// Helpers
const web3 = window.solanaWeb3 || window.solana?.web3 || window.solanaWeb3 || window.solana;
const { PublicKey, SystemProgram, Transaction, Connection, Keypair } = window.solanaWeb3;

const DEVNET = "https://api.devnet.solana.com";
const connection = new Connection(DEVNET, "confirmed");

function shortPk(pk){ return pk ? pk.slice(0,4)+"…"+pk.slice(-4) : ""; }

async function getProvider() {
  if (!window.solana || !window.solana.isPhantom) {
    throw new Error("Phantom not found. Install Phantom to continue.");
  }
  return window.solana;
}

function bn(amount) {
  if (typeof amount === "bigint") return amount;
  if (typeof amount === "number") return BigInt(Math.floor(amount));
  return BigInt(amount.toString());
}

function toBaseUnits(human, decimals){
  const d = BigInt(decimals);
  const factor = 10n ** d;
  // Allow human as string number
  if (typeof human === "string" && human.includes(".")) {
    const [a,b=""] = human.split(".");
    const frac = (b + "0".repeat(Number(d))).slice(0, Number(d));
    return BigInt(a) * factor + BigInt(frac);
  }
  return BigInt(human) * factor;
}

// Optional: create Metadata PDA and instruction (only if uri provided)
function makeMetadataIx(mintPk, updateAuthPk, name, symbol, uri){
  if (!uri) return null;
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TM_PROGRAM_ID.toBuffer(), mintPk.toBuffer()],
    TM_PROGRAM_ID
  );

  const dataV2 = {
    name: name?.slice(0,32) || "",
    symbol: symbol?.slice(0,10) || "",
    uri: uri?.slice(0,200) || "",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  };

  const keys = {
    metadata: metadataPda,
    mint: mintPk,
    mintAuthority: updateAuthPk,
    payer: updateAuthPk,
    updateAuthority: updateAuthPk,
  };

  return createCreateMetadataAccountV3Instruction(keys, { data: dataV2, isMutable: true, collectionDetails: null });
}

async function createMintAndMetadata({ name, symbol, decimals, supply, uri }) {
  const provider = await getProvider();
  const walletPk = new PublicKey(provider.publicKey.toString());

  // Devnet airdrop (helpful for fresh wallets)
  try {
    const bal = await connection.getBalance(walletPk);
    if (bal < 0.05 * 1e9) {
      const sig = await connection.requestAirdrop(walletPk, 1e9); // 1 SOL
      await connection.confirmTransaction(sig, "confirmed");
    }
  } catch(_) {}

  const mintKP = Keypair.generate();
  const mintPk = mintKP.publicKey;

  const rent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const tx = new Transaction();

  // 1) Create Mint account
  tx.add(SystemProgram.createAccount({
    fromPubkey: walletPk,
    newAccountPubkey: mintPk,
    space: MINT_SIZE,
    lamports: rent,
    programId: TOKEN_PROGRAM_ID,
  }));

  // 2) Initialize Mint
  tx.add(createInitializeMint2Instruction(mintPk, decimals, walletPk, walletPk, TOKEN_PROGRAM_ID));

  // 3) Create ATA for wallet
  const ata = getAssociatedTokenAddressSync(mintPk, walletPk);
  tx.add(createAssociatedTokenAccountInstruction(walletPk, ata, walletPk, mintPk));

  // 4) Mint initial supply (optional)
  const units = toBaseUnits(supply || "0", decimals);
  if (units > 0n) {
    tx.add(createMintToInstruction(mintPk, ata, walletPk, Number(units))); // spl-token iife expects number for now
  }

  // 5) Metadata (optional, only if URI provided)
  const mdIx = makeMetadataIx(mintPk, walletPk, name, symbol, uri);
  if (mdIx) tx.add(mdIx);

  // Prepare tx: partial sign with mint keypair
  tx.feePayer = walletPk;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.partialSign(mintKP);

  // Phantom signs and sends
  const signed = await provider.signTransaction(tx);
  const raw = signed.serialize();
  const sig = await connection.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 3 });
  await connection.confirmTransaction(sig, "confirmed");

  // Persist for our wizard
  localStorage.setItem("mintedMint", mintPk.toString());
  return { signature: sig, mint: mintPk.toString(), ata: ata.toString() };
}

// Wire up a simple button if present
async function onClickCreate() {
  const btn = document.getElementById("btnCreateMint");
  if (btn) btn.disabled = true;

  try {
    const name = (document.getElementById("in_name")?.value || "").trim();
    const symbol = (document.getElementById("in_symbol")?.value || "").trim();
    const decimals = parseInt(document.getElementById("in_decimals")?.value || "6", 10);
    const supply = (document.getElementById("in_supply")?.value || "0").trim();
    const uri = (document.getElementById("in_uri")?.value || "").trim();

    if (!window.solana?.publicKey) {
      await window.solana.connect({ onlyIfTrusted: false });
    }

    const res = await createMintAndMetadata({ name, symbol, decimals, supply, uri });
    alert(`Mint created!\nMint: ${res.mint}\nTx: ${res.signature}`);
    // Jump back to wizard step 2
    location.href = `/?mint=${encodeURIComponent(res.mint)}&go=2`;
  } catch (e) {
    console.error(e);
    alert(`Mint failed: ${e.message || e}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Auto-bind if button exists
window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnCreateMint");
  if (btn) btn.addEventListener("click", onClickCreate);
});

// Expose for manual calls if needed
window.pumpcoin = { createMintAndMetadata };
