import { json, type Env } from "../_lib/env";

type HoldItem = { productId: string; quantity: number; unit: string };

function stockUnits(item: HoldItem, product: any): number | null {
  const clean = (v: unknown) => String(v || "").trim().toLowerCase().replace(/\\s+/g, " ");
  const requestedUnit = clean(item.unit), stockUnit = clean(product.unit);
  if (requestedUnit === stockUnit) return Number(item.quantity);
  const measure = (v: string): { dimension: string; base: number } | null => {
    const m = v.match(/(\\d+(?:\\.\\d+)?)\\s*(kg|kgs|kilograms?|g|gm|grams?|l|litres?|liters?|ml|millilitres?|milliliters?)\\b/i);
    if (!m) return null;
    const n = Number(m[1]), u = m[2].toLowerCase();
    if (["kg","kgs","kilogram","kilograms"].includes(u)) return {dimension:"mass",base:n*1000};
    if (["g","gm","gram","grams"].includes(u)) return {dimension:"mass",base:n};
    if (["l","litre","litres","liter","liters"].includes(u)) return {dimension:"volume",base:n*1000};
    return {dimension:"volume",base:n};
  };
  const req=measure(requestedUnit), base=measure(stockUnit);
  if(req && base && req.dimension===base.dimension && base.base>0) return Number(item.quantity)*req.base/base.base;
  if (/(packet|pack|pouch|bottle|jar|bag)/i.test(stockUnit)) {
    const count=requestedUnit.match(/(\\d+)\\s*[- ]?pack/i);
    if(count) return Number(item.quantity)*Number(count[1]);
    if (/(pack|packet|pouch|bottle|jar|bag)/i.test(requestedUnit)) return Number(item.quantity);
  }
  if (/pair/i.test(stockUnit)) {
    const pieces=requestedUnit.match(/(\\d+)\\s*(piece|pieces|pcs)/i);
    if(pieces) return Number(item.quantity)*Number(pieces[1])/2;
    if(/tray/i.test(requestedUnit)) return Number(item.quantity)*15;
    if(/dozen/i.test(requestedUnit)) return Number(item.quantity)*6;
    if(/pair/i.test(requestedUnit)) return Number(item.quantity);
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
