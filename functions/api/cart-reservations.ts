import { json, type Env } from "../_lib/env";

type HoldItem = { productId: string; quantity: number; unit: string };

function stockUnits(item: { quantity: number; unit: string }, product: any): number | null {
  const clean = (value: unknown) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const itemUnit = clean(item.unit);
  const stockUnit = clean(product.unit);
  if (itemUnit === stockUnit) return Number(item.quantity);

  const measure = (value: string): { dimension: string; base: number } | null => {
    const match = value.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|gm|grams?|l|litres?|liters?|ml|millilitres?|milliliters?)\b/i);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (["kg", "kgs", "kilogram", "kilograms"].includes(unit)) return { dimension: "mass", base: amount * 1000 };
    if (["g", "gm", "gram", "grams"].includes(unit)) return { dimension: "mass", base: amount };
    if (["l", "litre", "litres", "liter", "liters"].includes(unit)) return { dimension: "volume", base: amount * 1000 };
    return { dimension: "volume", base: amount };
  };
  const requested = measure(itemUnit);
  const stored = measure(stockUnit);
  if (requested && stored && requested.dimension === stored.dimension && stored.base > 0) {
    return Number(item.quantity) * requested.base / stored.base;
  }

  // Packaged grocery variants (for example a 25g cereal pouch) are one
  // sellable piece each when inventory is tracked in pcs/pieces/units.
  const countableStockUnit = /^(pcs?|pieces?|units?|items?|nos?|numbers?)$/i.test(stockUnit);
  const packagedProduct = /(pouch|packet|pack|sachet|bottle|jar|tin|can|box|carton)/i.test(String(product.name || ""));
  if (countableStockUnit && (packagedProduct || /^(pcs?|pieces?|units?|items?|nos?|numbers?)$/i.test(itemUnit))) {
    return Number(item.quantity);
  }

  if (/(packet|pack|pouch|bottle|jar|bag)/i.test(stockUnit)) {
    const packCount = itemUnit.match(/(\d+)\s*[- ]?pack/i);
    if (packCount) return Number(item.quantity) * Number(packCount[1]);
    if (/(pack|packet|pouch|bottle|jar|bag)/i.test(itemUnit)) return Number(item.quantity);
  }
  if (/pair/i.test(stockUnit)) {
    const pieces = itemUnit.match(/(\d+)\s*(piece|pieces|pcs)/i);
    if (pieces) return Number(item.quantity) * Number(pieces[1]) / 2;
    if (/tray/i.test(itemUnit)) return Number(item.quantity) * 15;
    if (/dozen/i.test(itemUnit)) return Number(item.quantity) * 6;
    if (/pair/i.test(itemUnit)) return Number(item.quantity);
  }
  return null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body:any;
  try { body=await request.json(); } catch { return json({error:"Invalid cart reservation."},400); }
  const reservationId=String(body?.reservationId || "").slice(0,80);
  const items:HoldItem[]=Array.isArray(body?.items) ? body.items.slice(0,100).map((x:any)=>({
    productId:String(x.productId || "").slice(0,100),
    quantity:Math.max(0,Math.min(999,Number(x.quantity)||0)),
    unit:String(x.unit || "").slice(0,40)
  })).filter(x=>x.productId && x.quantity>0) : [];
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(reservationId)) return json({error:"Invalid cart session."},400);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cart_stock_reservations (
    reservation_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    expires_at INTEGER NOT NULL, PRIMARY KEY(reservation_id,product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_reservations (
    order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    PRIMARY KEY(order_id,product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cart_stock_reservation_guard (
    reservation_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
    CHECK(expected_count=actual_count)
  )`).run();
  const cleanupNow = Date.now();
  await env.DB.prepare("DELETE FROM cart_stock_reservations WHERE expires_at<=?").bind(cleanupNow).run();
  await env.DB.prepare("DELETE FROM cart_stock_reservation_guard WHERE NOT EXISTS (SELECT 1 FROM cart_stock_reservations h WHERE h.reservation_id=cart_stock_reservation_guard.reservation_id)").run();
  const totals=new Map<string,number>();
  for(const item of items){
    const row=await env.DB.prepare("SELECT data FROM products WHERE id=?").bind(item.productId).first<any>();
    if(!row) return json({error:"A product in your cart is no longer available. Refresh the store."},409);
    const product=JSON.parse(row.data);
    if(typeof product.stockQuantity!=="number") continue;
    const units=stockUnits(item,product);
    if(units===null || !Number.isFinite(units) || units<=0) return json({error:"Could not match the selected quantity for "+product.name+"."},409);
    totals.set(item.productId,(totals.get(item.productId)||0)+units);
  }
  const now=Date.now(), expires=now+10*60*1000;
  const statements:any[]=[
    env.DB.prepare("DELETE FROM cart_stock_reservations WHERE reservation_id=?").bind(reservationId),
    env.DB.prepare("DELETE FROM cart_stock_reservation_guard WHERE reservation_id=?").bind(reservationId)
  ];
  for(const [productId,quantity] of totals){
    statements.push(env.DB.prepare(`INSERT INTO cart_stock_reservations(reservation_id,product_id,quantity,expires_at)
      SELECT ?,?,?,? WHERE EXISTS(
        SELECT 1 FROM products p WHERE p.id=?
        AND COALESCE(json_extract(p.data,'$.inStock'),1)=1
        AND json_type(p.data,'$.stockQuantity') IN ('integer','real')
        AND ROUND(json_extract(p.data,'$.stockQuantity')
          - COALESCE((SELECT SUM(r.quantity) FROM order_stock_reservations r WHERE r.product_id=p.id),0)
          - COALESCE((SELECT SUM(h.quantity) FROM cart_stock_reservations h WHERE h.product_id=p.id AND h.expires_at>? AND h.reservation_id!=?),0),4)>=ROUND(?,4)
      )`).bind(reservationId,productId,quantity,expires,productId,now,reservationId,quantity));
  }
  statements.push(env.DB.prepare(`INSERT INTO cart_stock_reservation_guard(reservation_id,expected_count,actual_count)
    SELECT ?,?,(SELECT COUNT(*) FROM cart_stock_reservations WHERE reservation_id=?)`).bind(reservationId,totals.size,reservationId));
  try { await env.DB.batch(statements); }
  catch(error) {
    console.error("Cart stock reservation failed",error);
    return json({error:"This item was just added by another customer or there is not enough stock. Refresh the store and adjust your cart."},409);
  }
  return json({ok:true,expiresAt:expires},200,{"cache-control":"no-store"});
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  let body:any; try { body=await request.json(); } catch { return json({error:"Invalid request."},400); }
  const id=String(body?.reservationId || "").slice(0,80);
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(id)) return json({error:"Invalid cart session."},400);
  await env.DB.prepare("DELETE FROM cart_stock_reservations WHERE reservation_id=?").bind(id).run();
  await env.DB.prepare("DELETE FROM cart_stock_reservation_guard WHERE reservation_id=?").bind(id).run();
  return json({ok:true});
};
