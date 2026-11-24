// Live-readings switch: GET returns whether readings are open; POST (with the PIN) changes it.
// The PIN lives in the Netlify environment variable LIVE_PIN, set in the Netlify dashboard.
import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore({ name: "live", consistency: "strong" });
  const readOpen = async () => (await store.get("open")) === "1";

  if (req.method === "GET") return json({ open: await readOpen() });

  if (req.method === "POST") {
    const pin = process.env.LIVE_PIN;
    if (!pin) return json({ error: "No LIVE_PIN is set in Netlify yet." }, 503);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
    if (String(body.pin || "") !== pin) return json({ error: "Wrong PIN" }, 401);

    if (typeof body.open === "boolean") await store.set("open", body.open ? "1" : "0");
    return json({ open: await readOpen() });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/status" };
