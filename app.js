// ---- Shopify settings ------------------------------------------------------
// SHOP is your store's myshopify.com address. VARIANTS are the variant IDs from each
// product's "Create checkout link" (the number after /cart/ in that link).
const SHOP = "i0kir8-pq.myshopify.com";
const VARIANTS = { 1: "70054841974818", 2: "70054842040354", 3: "70054842073122" };
const LABELS = { 1: "One-card reading · $5", 2: "Two-card reading · $10", 3: "Three-card reading · $15" };
// ----------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const dialog = $("checkout"), ig = $("ig"), agree = $("agree"), go = $("go"), err = $("error");
let chosen = null;

async function isOpen() {
  try {
    const r = await fetch("/api/status", { cache: "no-store" });
    return (await r.json()).open === true;
  } catch { return false; }
}

function show(open) {
  $("open").hidden = !open;
  if (!open && dialog.open) dialog.close();
}

async function refresh() { show(await isOpen()); }
refresh();
setInterval(refresh, 15000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

const cleanHandle = () => ig.value.trim().replace(/^@+/, "").replace(/\s+/g, "");
function validate() { go.disabled = !(cleanHandle() && agree.checked); }
ig.addEventListener("input", () => { if (ig.value.startsWith("@")) ig.value = ig.value.replace(/^@+/, ""); validate(); });
agree.addEventListener("change", validate);

document.querySelectorAll("button.reading[data-cards]").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosen = btn.dataset.cards;
    $("checkout-title").textContent = LABELS[chosen];
    err.textContent = "";
    agree.checked = false;
    validate();
    dialog.showModal();
    ig.focus();
  });
});

// If someone comes back from Shopify with the browser's back button, reset the form.
window.addEventListener("pageshow", () => { go.textContent = "Continue to checkout"; validate(); refresh(); });

$("cancel").addEventListener("click", () => dialog.close());

$("checkout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (go.disabled) return;
  go.disabled = true;
  go.textContent = "One moment…";

  const reset = () => { go.textContent = "Continue to checkout"; validate(); };

  if (!(await isOpen())) {
    show(false);
    reset();
    return;
  }
  if (!SHOP || !VARIANTS[chosen]) {
    err.textContent = "Checkout isn't connected yet. Please try again in a moment.";
    reset();
    return;
  }

  const params = new URLSearchParams();
  params.set("attributes[Instagram]", "@" + cleanHandle());
  params.set("attributes[Agreed to terms]", new Date().toISOString());
  params.set("ref", "live");
  window.location.href = `https://${SHOP}/cart/${VARIANTS[chosen]}:1?${params}`;
});
