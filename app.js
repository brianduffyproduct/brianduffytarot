// ---- Shopify settings ------------------------------------------------------
// SHOP is your store's myshopify.com address. Each product's variant is the number
// after /cart/ in that product's checkout link.
const SHOP = "i0kir8-pq.myshopify.com";
const PRODUCTS = {
  1:     { variant: "70054841974818", label: "One-card reading · $5",   mode: "live" },
  2:     { variant: "70054842040354", label: "Two-card reading · $10",  mode: "live" },
  3:     { variant: "70054842073122", label: "Three-card reading · $15", mode: "live" },
  video: { variant: "70068115963938", label: "Video reading · $33",     mode: "video" },
};
// ----------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const dialog = $("checkout"), ig = $("ig"), num = $("num"), agree = $("agree"), go = $("go"), err = $("error");
const videoNums = [$("v1"), $("v2"), $("v3")];
let chosen = null;
const mode = () => (chosen ? PRODUCTS[chosen].mode : "live");

async function isOpen() {
  try {
    const r = await fetch("/api/status", { cache: "no-store" });
    return (await r.json()).open === true;
  } catch { return false; }
}

function show(open) {
  $("open").hidden = !open;
  // Only a live reading's popup closes when readings close; the video reading is always on sale.
  if (!open && dialog.open && mode() === "live") dialog.close();
}

async function refresh() { show(await isOpen()); }
refresh();
setInterval(refresh, 15000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

const cleanHandle = () => ig.value.trim().replace(/^@+/, "").replace(/\s+/g, "");
const toCard = (input) => { const n = Number(input.value.trim()); return Number.isInteger(n) && n >= 1 && n <= 78 ? n : null; };
const RANGE_MSG = "Please pick a whole number from 1 to 78.";

function validate() {
  let ok = agree.checked, msg = "";
  if (mode() === "live") {
    if (num.value.trim() && !toCard(num)) msg = RANGE_MSG;
    ok = ok && cleanHandle() && toCard(num);
  } else {
    const typed = videoNums.filter((i) => i.value.trim());
    const cards = videoNums.map(toCard);
    if (typed.some((i) => !toCard(i))) msg = RANGE_MSG;
    else if (cards.every(Boolean) && new Set(cards).size < 3) msg = "Please pick three different numbers.";
    ok = ok && cards.every(Boolean) && !msg;
  }
  err.textContent = msg;
  go.disabled = !ok;
}

const digitsOnly = (input) => input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, ""); validate(); });
ig.addEventListener("input", () => { if (ig.value.startsWith("@")) ig.value = ig.value.replace(/^@+/, ""); validate(); });
agree.addEventListener("change", validate);
[num, ...videoNums].forEach(digitsOnly);

document.querySelectorAll("button.reading[data-product]").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosen = btn.dataset.product;
    const isVideo = mode() === "video";
    $("checkout-title").textContent = PRODUCTS[chosen].label;
    $("live-fields").hidden = isVideo;
    $("video-fields").hidden = !isVideo;
    agree.checked = false;
    [num, ...videoNums].forEach((i) => (i.value = ""));
    validate();
    dialog.showModal();
    (isVideo ? videoNums[0] : ig).focus();
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
  const product = PRODUCTS[chosen];

  if (product.mode === "live" && !(await isOpen())) {
    show(false);
    reset();
    return;
  }

  const params = new URLSearchParams();
  if (product.mode === "live") {
    params.set("attributes[Instagram]", "@" + cleanHandle());
    params.set("attributes[Random number]", String(toCard(num)));
  } else {
    videoNums.forEach((input, i) => params.set(`attributes[Card ${i + 1}]`, String(toCard(input))));
  }
  params.set("attributes[Agreed to terms]", new Date().toISOString());
  params.set("ref", product.mode);
  window.location.href = `https://${SHOP}/cart/${product.variant}:1?${params}`;
});
