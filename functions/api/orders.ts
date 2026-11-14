import { json, ownerRequired, type Env } from "../_lib/env";
import { purgeExpiredCustomerOrders } from "../_lib/order-retention";
import { sendPushNotification } from "@mmmike/web-push/send";
import { ensureCustomerTables, getCustomer } from "../_lib/customer-auth";

type OrderItem = { productId?: string; name: string; quantity: number; unit: string; price: number; unavailable?: boolean; stockRefunded?: boolean };

function stockUnitsForOrder(item: { quantity: number; unit: string }, product: any): number | null {
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
  // Packaged catalogue products represent one sellable SKU per selected quantity.
  if (/(pouch|packet|pack|sachet|bottle|jar|tin|can|box|carton)/i.test(String(product.name || ""))) return Number(item.quantity);
  if (/pair/i.test(stockUnit)) {
    const pieces = itemUnit.match(/(\d+)\s*(piece|pieces|pcs)/i);
    if (pieces) return Number(item.quantity) * Number(pieces[1]) / 2;
    if (/tray/i.test(itemUnit)) return Number(item.quantity) * 15;
    if (/dozen/i.test(itemUnit)) return Number(item.quantity) * 6;
    if (/pair/i.test(itemUnit)) return Number(item.quantity);
  }
  return null;
}
const ensureTable = async (env: Env) => {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (order_id TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, created_at INTEGER NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_push_subscriptions (customer_id TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
   id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
   note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'new',
   created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, order_number INTEGER
  )`).run();
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN ready_at INTEGER").run().catch(() => {});
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN archived_at INTEGER").run().catch(() => {});
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN estimated_ready_at INTEGER").run().catch(() => {});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cart_stock_reservations (
    reservation_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    expires_at INTEGER NOT NULL, PRIMARY KEY (reservation_id, product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_reservations (
    order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    PRIMARY KEY (order_id, product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_reservation_guard (
    order_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
    CHECK (expected_count = actual_count)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_deductions (
    order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    PRIMARY KEY (order_id, product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_deduction_guard (
    order_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
    CHECK (expected_count = actual_count)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_refunds (
    order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    PRIMARY KEY (order_id, product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_refund_guard (
    order_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
    CHECK (expected_count = actual_count)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_refund_checks (
    check_id TEXT NOT NULL, order_id TEXT NOT NULL, product_id TEXT NOT NULL,
    PRIMARY KEY (check_id, product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS order_stock_refund_guard_v2 (
    check_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
    CHECK (expected_count = actual_count)
  )`).run();
  const columns = await env.DB.prepare("PRAGMA table_info(customer_orders)").all<any>();
  if (!(columns.results || []).some((column: any) => column.name === "order_number")) {
    await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN order_number INTEGER").run();
  }
  if (!(columns.results || []).some((column: any) => column.name === "stock_deducted")) await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0").run();
  if (!(columns.results || []).some((column: any) => column.name === "confirmed_at")) await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN confirmed_at INTEGER").run();
  const unnumbered = await env.DB.prepare("SELECT id FROM customer_orders WHERE order_number IS NULL ORDER BY created_at ASC, id ASC").all<any>();
  let nextNumber = 1;
  for (const row of unnumbered.results || []) {
    await env.DB.prepare("UPDATE customer_orders SET order_number=? WHERE id=?").bind(nextNumber++, row.id).run();
  }
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_sequence (name TEXT PRIMARY KEY, value INTEGER NOT NULL)").run();
  const maximum = await env.DB.prepare("SELECT COALESCE(MAX(order_number),0) AS value FROM customer_orders").first<any>();
  await env.DB.prepare("INSERT INTO order_sequence (name,value) VALUES ('customer_orders',?) ON CONFLICT(name) DO UPDATE SET value=MAX(value,excluded.value)").bind(Number(maximum?.value || 0)).run();
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid order." }, 400); }
  await ensureTable(env);
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to your customer account before placing an order." }, 401, { "cache-control": "no-store" });
  await purgeExpiredCustomerOrders(env);
  await env.DB.prepare("DELETE FROM order_stock_reservations WHERE order_id NOT IN (SELECT id FROM customer_orders)").run();

  // Enforce store hours and maintenance on the server as well as in the UI.
  const settingsRow = await env.DB.prepare("SELECT data FROM store_settings WHERE id=1").first<any>();
  let storeSettings: any = {};
  try { storeSettings = settingsRow?.data ? JSON.parse(settingsRow.data) : {}; } catch { storeSettings = {}; }
  const now = Date.now();
  const maintenanceActive = storeSettings.maintenanceMode === true &&
    !(typeof storeSettings.maintenanceUntil === "number" && now >= storeSettings.maintenanceUntil);
  const istNow = new Date(now + 5.5 * 60 * 60 * 1000);
  const istHour = istNow.getUTCHours();
  const scheduledOpen = istHour >= 7 && istHour < 22;
  const storeOpen = storeSettings.autoSchedule === true
    ? scheduledOpen
    : storeSettings.isOpen !== false;
  if (maintenanceActive) return json({ error: "The store is temporarily closed. Please place your order after it reopens." }, 403);
  if (!storeOpen) return json({ error: "The store is currently closed. Online orders are paused until the store opens." }, 403);

  const name = customer.name;
  const phone = customer.phone;
  const note = String(body?.note || "").trim().slice(0, 500);
  const items = Array.isArray(body?.items) ? body.items.slice(0, 100).map((x: any) => ({
    productId: x.productId ? String(x.productId).slice(0, 100) : undefined, name: String(x.name || "").slice(0, 120), quantity: Math.max(1, Math.min(999, Number(x.quantity) || 1)),
    unit: String(x.unit || "").slice(0, 30), price: Math.max(0, Number(x.price) || 0)
  })) : [];
  if (!name || phone.length < 10 || phone.length > 15 || !items.length || items.some((x: OrderItem) => !x.name)) return json({ error: "Please enter your name, valid phone number and at least one item." }, 400);

  // Deduct inventory atomically when the order is placed. Cart contents never
  // reserve stock, so customers can build carts freely; checkout is the single
  // point where live stock is validated and decremented.
  const requestedByProduct = new Map<string, { quantity: number; name: string }>();
  const parsePriceMeasure = (value: unknown): { dimension: string; amount: number } | null => {
    const match = String(value || "").trim().toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|gm|grams?|l|litres?|liters?|ml|millilitres?|milliliters?)\b/i);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (["kg", "kgs", "kilogram", "kilograms"].includes(unit)) return { dimension: "mass", amount: amount * 1000 };
    if (["g", "gm", "gram", "grams"].includes(unit)) return { dimension: "mass", amount };
    if (["l", "litre", "litres", "liter", "liters"].includes(unit)) return { dimension: "volume", amount: amount * 1000 };
    return { dimension: "volume", amount };
  };

  for (const item of items) {
    if (!item.productId) return json({ error: "A cart item could not be matched to the live catalogue. Refresh your cart and try again." }, 409);
    const productRow = await env.DB.prepare("SELECT data FROM products WHERE id=?").bind(item.productId).first<any>();
    if (!productRow) return json({ error: item.name + " is no longer available. Please refresh your cart." }, 409);
    const product = JSON.parse(productRow.data);

    // Resolve the selected sellable size/pack and price from the live catalogue.
    const selectedUnit = String(item.unit || "").trim().toLowerCase();
    const baseUnit = String(product.unit || "").trim().toLowerCase();
    let trustedPrice: number | null = null;
    if (selectedUnit === baseUnit) trustedPrice = Number(product.price);
    else {
      const variety = Array.isArray(product.varieties)
        ? product.varieties.find((entry: any) => String(entry.label || "").trim().toLowerCase() === selectedUnit)
        : undefined;
      if (variety) {
        if (variety.inStock === false) return json({ error: item.name + " is no longer available in the selected size." }, 409);
        trustedPrice = Number(variety.price);
      } else {
        const baseMeasure = parsePriceMeasure(product.unit);
        const selectedMeasure = parsePriceMeasure(item.unit);
        const customWeightsAllowed = product.allowCustomWeights === true ||
          (product.allowCustomWeights === undefined && (!Array.isArray(product.varieties) || product.varieties.length === 0));
        if (customWeightsAllowed && baseMeasure && selectedMeasure &&
            baseMeasure.dimension === selectedMeasure.dimension && baseMeasure.amount > 0) {
          trustedPrice = Math.max(1, Math.round(Number(product.price) * selectedMeasure.amount / baseMeasure.amount));
        }
      }
    }
    if (trustedPrice === null || !Number.isFinite(trustedPrice) || trustedPrice < 0) {
      return json({ error: "The selected size or price for " + item.name + " has changed. Refresh your cart and try again." }, 409);
    }
    item.name = String(product.name || item.name).slice(0, 120);
    item.price = trustedPrice;

    if (typeof product.stockQuantity === "number") {
      if (product.stockQuantity <= 0) {
        await env.DB.prepare("UPDATE products SET data=json_set(data,'$.inStock',json('false'),'$.updatedAt',?),updated_at=? WHERE id=?")
          .bind(now,now,item.productId).run();
        return json({ error: item.name + " is now out of stock. Please remove it from your cart." }, 409);
      }
      if (product.inStock === false) {
        return json({ error: item.name + " is now out of stock. Please remove it from your cart." }, 409);
      }
      const units = stockUnitsForOrder(item, product);
      if (units === null || !Number.isFinite(units) || units <= 0) {
        return json({ error: "Could not match the ordered unit for " + item.name + " with its stock unit. Please contact the store." }, 409);
      }
      const current = requestedByProduct.get(item.productId) || { quantity: 0, name: item.name };
      current.quantity += units;
      requestedByProduct.set(item.productId, current);
    }
  }

  const total = items.reduce((sum: number, x: OrderItem) => sum + x.price * x.quantity, 0);
  const sequence = await env.DB.prepare("INSERT INTO order_sequence (name,value) VALUES ('customer_orders',1) ON CONFLICT(name) DO UPDATE SET value=value+1 RETURNING value").first<any>();
  const orderNumber = Number(sequence?.value || 1);
  const id = crypto.randomUUID();
  const deductionStatements: any[] = [
    env.DB.prepare("INSERT INTO customer_orders (id,order_number,customer_id,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at,stock_deducted) VALUES (?,?,?,?,?,?,?,?, 'new',?,?,2)")
      .bind(id,orderNumber,customer.id,name,phone,note,JSON.stringify(items),total,now,now)
  ];
  for (const [productId, requested] of requestedByProduct) {
    const qty = requested.quantity;
    deductionStatements.push(
      env.DB.prepare(`UPDATE products
        SET data=json_set(
          data,
          '$.stockQuantity',MAX(0,ROUND(json_extract(data,'$.stockQuantity')-?,4)),
          '$.inStock',CASE WHEN ROUND(json_extract(data,'$.stockQuantity')-?,4)<=0 THEN json('false') ELSE json('true') END,
          '$.updatedAt',?
        ),updated_at=?
        WHERE id=? AND json_type(data,'$.stockQuantity') IN ('integer','real')
          AND COALESCE(json_extract(data,'$.inStock'),1)=1
          AND ROUND(json_extract(data,'$.stockQuantity'),4)>=ROUND(?,4)`)
        .bind(qty,qty,now,now,productId,qty),
      env.DB.prepare(`INSERT INTO order_stock_deductions(order_id,product_id,quantity)
        SELECT ?,?,? WHERE changes()=1`).bind(id,productId,qty)
    );
  }
  if (requestedByProduct.size) {
    deductionStatements.push(env.DB.prepare(`INSERT INTO order_stock_deduction_guard(order_id,expected_count,actual_count)
      SELECT ?,?,(SELECT COUNT(*) FROM order_stock_deductions WHERE order_id=?)`)
      .bind(id,requestedByProduct.size,id));
  }
  deductionStatements.push(
    env.DB.prepare("UPDATE customer_orders SET stock_deducted=1 WHERE id=? AND stock_deducted=2").bind(id)
  );
  try {
    await env.DB.batch(deductionStatements);
    const saved = await env.DB.prepare("SELECT stock_deducted FROM customer_orders WHERE id=?").bind(id).first<any>();
    if (Number(saved?.stock_deducted) !== 1) throw new Error("Stock deduction transaction did not complete.");
  } catch (error) {
    console.error("Atomic checkout stock deduction failed", error);
    return json({ error: "Stock changed while you were checking out. Your order was not placed. Please refresh your cart and try again." }, 409);
  }
  const subscription = body?.pushSubscription;
  if (subscription && typeof subscription.endpoint === "string" && typeof subscription.keys?.p256dh === "string" && typeof subscription.keys?.auth === "string" && subscription.endpoint.startsWith("https://")) {
    await env.DB.prepare("INSERT OR REPLACE INTO push_subscriptions (order_id,subscription_json,created_at) VALUES (?,?,?)")
      .bind(id,JSON.stringify({endpoint:subscription.endpoint,keys:{p256dh:subscription.keys.p256dh,auth:subscription.keys.auth}}),now).run();
  }
  return json({ ok: true, orderId: id, orderNumber, createdAt: now }, 201, { "cache-control": "no-store" });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  // Retain customer order history for seven days from order creation, regardless of status.
  await purgeExpiredCustomerOrders(env);
  const rows = await env.DB.prepare("SELECT id,order_number,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at,estimated_ready_at FROM customer_orders WHERE archived_at IS NULL ORDER BY order_number DESC LIMIT 100").all<any>();
  return json({ orders: (rows.results || []).map((r: any) => ({ id:r.id, orderNumber:r.order_number, customerName:r.customer_name, customerPhone:r.customer_phone, note:r.note, items:JSON.parse(r.items_json), total:r.total, status:r.status, createdAt:r.created_at, updatedAt:r.updated_at, estimatedReadyAt:r.estimated_ready_at || null })) }, 200, { "cache-control": "no-store" });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  await purgeExpiredCustomerOrders(env);
  let body: any; try { body = await request.json(); } catch { return json({error:"Invalid update."},400); }
  const status = String(body?.status || "");
  if (!["new","processing","review","ready","unavailable","completed","cancelled"].includes(status) || !body?.id) return json({error:"Invalid order status."},400);
  const hasEstimateUpdate = Object.prototype.hasOwnProperty.call(body, "estimatedReadyAt");
  const estimatedReadyAt = !hasEstimateUpdate || body.estimatedReadyAt === null ? null : Number(body.estimatedReadyAt);
  if (hasEstimateUpdate && estimatedReadyAt !== null && (!Number.isFinite(estimatedReadyAt) || estimatedReadyAt <= Date.now() || estimatedReadyAt > Date.now() + 48 * 60 * 60 * 1000)) return json({error:"Choose an estimated ready time within the next 48 hours."},400);
  const id = String(body.id);
  const order = await env.DB.prepare("SELECT status,customer_id,customer_name,order_number,items_json,stock_deducted FROM customer_orders WHERE id=?").bind(id).first<any>();
  if (!order) return json({error:"Order not found."},404);
  if (Array.isArray(body.items) && !["new","processing","review"].includes(order.status)) {
    return json({error:"Item availability can only be changed before the order is ready."},409);
  }
  if (status === "review") return json({error:"Use Processing instead of the legacy review status."},400);
  if (status === "cancelled" && ["ready","completed"].includes(order.status)) {
    return json({error:"A ready or completed order cannot be cancelled from this screen."},409);
  }
  const savedItems: OrderItem[] = JSON.parse(order.items_json || "[]");
  if (Array.isArray(body.items) && body.items.length !== savedItems.length) return json({error:"Order items do not match. Refresh and try again."},409);
  // Only accept the per-item availability flag from the browser; preserve trusted
  // product names, IDs, quantities, units and prices stored with the original order.
  const items: OrderItem[] = savedItems.map((item, index) => ({
    ...item,
    // Once an item has been refunded to inventory, it stays unavailable on
    // this order so a repeated owner update cannot accidentally re-charge it.
    unavailable: item.stockRefunded ? true : (Array.isArray(body.items) ? !!body.items[index]?.unavailable : !!item.unavailable)
  }));
  let changes = 0;
  if (status === "unavailable") {
    for (const item of items) item.unavailable = true;
  }
  const refundAll = status === "cancelled" || status === "unavailable";
  // Only restore stock that checkout/confirmation actually deducted. Orders can
  // contain catalogue items without stock tracking; those must not block cancellation.
  const deductionRows = Number(order.stock_deducted || 0) === 1
    ? await env.DB.prepare("SELECT product_id FROM order_stock_deductions WHERE order_id=?").bind(id).all<any>()
    : { results: [] as any[] };
  const deductedProductIds = new Set((deductionRows.results || []).map((row: any) => String(row.product_id)));
  const refundCandidates = items.filter(item => !item.stockRefunded && (refundAll || item.unavailable));
  if (deductedProductIds.size > 0 && refundCandidates.some(item => !item.productId)) {
    return json({error:"This order has a stock deduction that cannot be matched to an item. The order was not changed; contact support."},409);
  }
  const refundLines = refundCandidates.filter(item => item.productId && deductedProductIds.has(String(item.productId)));
  const shouldRefundNow = Number(order.stock_deducted || 0) === 1 && refundLines.length > 0;
  if (shouldRefundNow) {
    const refunds = new Map<string, number>();
    for (const item of refundLines) {
      if (!item.productId) {
        return json({error:"Could not restore " + item.name + " because its inventory product link is missing. The order was not cancelled; refresh and try again."},409);
      }
      const row = await env.DB.prepare("SELECT data FROM products WHERE id=?").bind(item.productId).first<any>();
      if (!row) {
        return json({error:"Could not restore " + item.name + " because its inventory record was not found. The order was not cancelled; contact support."},409);
      }
      const product = JSON.parse(row.data);
      if (typeof product.stockQuantity !== "number" || !Number.isFinite(product.stockQuantity)) {
        return json({error:"Inventory quantity is not configured for " + item.name + ". The order was not cancelled; check its stock settings."},409);
      }
      const units = stockUnitsForOrder(item, product);
      if (units === null || !Number.isFinite(units) || units <= 0) {
        return json({error:"Could not calculate the stock refund for " + item.name + ". The order was not cancelled; review its inventory unit."},409);
      }
      refunds.set(item.productId, (refunds.get(item.productId) || 0) + units);
      // Mark refunded only after the product and quantity have been validated.
      item.stockRefunded = true;
    }
    const now = Date.now();
    const refundCheckId = crypto.randomUUID();
    const refundStatements: any[] = [
      // Compare-and-swap the exact order snapshot before touching inventory.
      // This prevents two owner tabs (or a retry) from refunding the same lines twice.
      env.DB.prepare("UPDATE customer_orders SET stock_deducted=3 WHERE id=? AND stock_deducted=1 AND items_json=?")
        .bind(id, order.items_json),
      // CHECK(expected_count=actual_count) aborts the whole D1 batch if the
      // order was already changed/refunded by another request.
      env.DB.prepare("INSERT INTO order_stock_refund_guard_v2(check_id,expected_count,actual_count) SELECT ?,1,changes()")
        .bind(refundCheckId + ":lock")
    ];
    for (const [productId, quantity] of refunds) {
      refundStatements.push(
        env.DB.prepare(`UPDATE products SET data=json_set(
          data,
          '$.stockQuantity',ROUND(json_extract(data,'$.stockQuantity')+?,4),
          '$.inStock',json('true'),
          '$.updatedAt',?
        ),updated_at=? WHERE id=? AND json_type(data,'$.stockQuantity') IN ('integer','real')
          AND EXISTS (SELECT 1 FROM customer_orders WHERE id=? AND stock_deducted=3)`)
          .bind(quantity,now,now,productId,id),
        env.DB.prepare(`INSERT INTO order_stock_refunds(order_id,product_id,quantity)
          SELECT ?,?,? WHERE changes()=1
          ON CONFLICT(order_id,product_id) DO UPDATE SET quantity=order_stock_refunds.quantity+excluded.quantity`)
          .bind(id,productId,quantity),
        env.DB.prepare(`INSERT INTO order_stock_refund_checks(check_id,order_id,product_id)
          SELECT ?,?,? WHERE changes()=1`).bind(refundCheckId,id,productId)
      );
    }
    if (refunds.size) {
      refundStatements.push(env.DB.prepare(`INSERT INTO order_stock_refund_guard_v2(check_id,expected_count,actual_count)
        SELECT ?,?,(SELECT COUNT(*) FROM order_stock_refund_checks WHERE check_id=?)`)
        .bind(refundCheckId,refunds.size,refundCheckId));
    }
    const revisedTotal = status === "cancelled" ? 0 : items.reduce((sum, item) => sum + (item.unavailable ? 0 : item.price * item.quantity), 0);
    refundStatements.push(
      env.DB.prepare("UPDATE customer_orders SET status=?,items_json=?,total=?,updated_at=?,estimated_ready_at=CASE WHEN ? IN ('cancelled','unavailable') THEN NULL ELSE estimated_ready_at END,stock_deducted=1 WHERE id=? AND stock_deducted=3")
        .bind(status,JSON.stringify(items),revisedTotal,now,status,id),
      env.DB.prepare("DELETE FROM order_stock_reservations WHERE order_id=?").bind(id)
    );
    try {
      const results = await env.DB.batch(refundStatements);
      changes = Number(results[results.length - 2]?.meta?.changes || 0);
      if (!changes) return json({error:"The order changed while its stock refund was being processed. Refresh and try again."},409);
    } catch (error) {
      console.error("Atomic order stock refund failed",error);
      return json({error:"Could not safely restore the unavailable items to inventory. Refresh the order and try again."},409);
    }
  } else if (status === "completed" && order.status !== "ready" && order.status !== "completed") {
    return json({error:"Only a ready order can be marked completed."},409);
  }
  if (shouldRefundNow) {
    // The refund and order update were committed together above.
  } else if (status === "ready" && order.status !== "ready" && !Number(order.stock_deducted || 0)) {
    if (items.length && items.every(item => item.unavailable)) {
      return json({error:"All items are marked unavailable. At least one available item is required to mark this order ready."},409);
    }

    // Aggregate lines for the same product so different cart varieties/weights
    // are deducted together from the single inventory record.
    const deductions = new Map<string, { quantity: number; product: any; updatedAt: number }>();
    for (const item of items) {
      if (item.unavailable || !item.productId) continue;
      const row = await env.DB.prepare("SELECT data,updated_at FROM products WHERE id=?").bind(item.productId).first<any>();
      if (!row) return json({error:"The product " + item.name + " no longer exists in inventory. Mark it unavailable before confirming."},409);
      const product = JSON.parse(row.data);
      if (typeof product.stockQuantity !== "number") continue;
      if (product.inStock === false) {
        return json({error:item.name + " is currently marked unavailable in inventory. Mark this order item unavailable or restore the product's availability first."},409);
      }
      const units = stockUnitsForOrder(item, product);
      if (units === null || !Number.isFinite(units) || units <= 0) {
        return json({error:"Could not match the ordered unit for " + item.name + " with its stock unit (" + String(product.unit || "not set") + "). Update the product unit before confirming."},409);
      }
      const current = deductions.get(item.productId) || { quantity: 0, product, updatedAt: Date.now() };
      current.quantity += units;
      deductions.set(item.productId, current);
    }

    for (const [productId, entry] of deductions) {
      if (Number(entry.product.stockQuantity) + 1e-9 < entry.quantity) {
        return json({error:"Not enough stock for " + entry.product.name + ". Mark it unavailable or update stock."},409);
      }
    }

    // D1 executes batch statements transactionally. The temporary state (2)
    // prevents concurrent Ready clicks from deducting the same order twice.
    // SQL decrements the current JSON stock value, and the guard table forces
    // the entire transaction to roll back if any product has changed/ran short.
    const statements = [
      env.DB.prepare("UPDATE customer_orders SET stock_deducted=2 WHERE id=? AND stock_deducted=0 AND status!='ready'").bind(id)
    ];
    for (const [productId, entry] of deductions) {
      const qty = entry.quantity;
      const now = Date.now();
      statements.push(
        env.DB.prepare(`UPDATE products
          SET data = json_set(
            data,
            '$.stockQuantity', MAX(0, ROUND(json_extract(data,'$.stockQuantity') - ?, 4)),
            '$.inStock', CASE WHEN ROUND(json_extract(data,'$.stockQuantity') - ?, 4) <= 0 THEN json('false') ELSE json('true') END,
            '$.updatedAt', ?
          ), updated_at=?
          WHERE id=? AND json_type(data,'$.stockQuantity') IN ('integer','real')
            AND ROUND(json_extract(data,'$.stockQuantity'), 4) >= ROUND(?, 4)
            AND COALESCE(json_extract(data,'$.inStock'),1)=1
            AND EXISTS (SELECT 1 FROM customer_orders WHERE id=? AND stock_deducted=2)`)
          .bind(qty, qty, now, now, productId, qty, id),
        env.DB.prepare(`INSERT INTO order_stock_deductions (order_id,product_id,quantity)
          SELECT ?,?,? WHERE changes()=1
            AND EXISTS (SELECT 1 FROM customer_orders WHERE id=? AND stock_deducted=2)`)
          .bind(id, productId, qty, id)
      );
    }
    statements.push(
      env.DB.prepare("DELETE FROM order_stock_reservations WHERE order_id=?").bind(id),
      env.DB.prepare(`INSERT INTO order_stock_deduction_guard (order_id,expected_count,actual_count)
        SELECT ?,?,(SELECT COUNT(*) FROM order_stock_deductions WHERE order_id=?)`)
        .bind(id, deductions.size, id),
      env.DB.prepare("UPDATE customer_orders SET stock_deducted=1,status='ready',items_json=?,updated_at=?,confirmed_at=COALESCE(confirmed_at,?),ready_at=COALESCE(ready_at,?),estimated_ready_at=NULL WHERE id=? AND stock_deducted=2")
        .bind(JSON.stringify(items), Date.now(), Date.now(), Date.now(), id)
    );
    try {
      const results = await env.DB.batch(statements);
      if (!results[0]?.meta?.changes) return json({error:"This order has already had its stock deducted. Refresh the order list."},409);
      changes = Number(results[results.length - 1]?.meta?.changes || 0);
      // The guard row is retained as an audit record and blocks a second deduction.
    } catch (error) {
      console.error("Atomic order stock deduction failed", error);
      return json({error:"Stock changed while this order was being confirmed. Refresh the order, review availability, and try again."},409);
    }
  } else {
    const updateStatement = env.DB.prepare("UPDATE customer_orders SET status=?,items_json=?,updated_at=?,confirmed_at=CASE WHEN ?='ready' THEN COALESCE(confirmed_at,?) ELSE confirmed_at END,ready_at=CASE WHEN ?='ready' THEN COALESCE(ready_at,?) ELSE ready_at END,estimated_ready_at=CASE WHEN ?=1 THEN ? WHEN ?='ready' THEN NULL ELSE estimated_ready_at END WHERE id=?")
      .bind(status,JSON.stringify(items),Date.now(),status,Date.now(),status,Date.now(),hasEstimateUpdate ? 1 : 0,estimatedReadyAt,status,id);
    if (["cancelled","unavailable"].includes(status)) {
      const results = await env.DB.batch([updateStatement,env.DB.prepare("DELETE FROM order_stock_reservations WHERE order_id=?").bind(id)]);
      changes = Number(results[0]?.meta.changes || 0);
    } else {
      const result = await updateStatement.run();
      changes = Number(result.meta.changes || 0);
    }
  }
  let notification = "not-configured";
  if ((["processing","ready","unavailable","completed","cancelled"].includes(status) || hasEstimateUpdate) && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
    const profileSaved = order.customer_id ? await env.DB.prepare("SELECT subscription_json FROM customer_push_subscriptions WHERE customer_id=?").bind(order.customer_id).first<any>() : null;
    const saved = profileSaved || await env.DB.prepare("SELECT subscription_json FROM push_subscriptions WHERE order_id=?").bind(id).first<any>();
    if (saved?.subscription_json) {
      const estimateText = estimatedReadyAt ? new Date(estimatedReadyAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
      const messages: Record<string,{title:string;body:string}> = {
        processing:{title:"Your order is being processed",body:"Parbati Bhandar has started preparing your order."},
        ready:{title:"Your order is ready!",body:"Your order is ready for pickup or delivery from Parbati Bhandar."},
        unavailable:{title:"Order update from Parbati Bhandar",body:"There is an availability update for your Parbati Bhandar order. Please contact the store."},
        completed:{title:"Order completed",body:"Your Parbati Bhandar order has been marked completed. Thank you!"},
        cancelled:{title:"Order cancelled",body:"Your Parbati Bhandar order has been cancelled. Please contact the store if you have questions."}
      };
      if (hasEstimateUpdate) messages[status] = { title: estimatedReadyAt ? "Updated preparation estimate" : "Order estimate updated", body: estimatedReadyAt ? "Parbati Bhandar expects your order to be ready around " + estimateText + ". We’ll let you know if anything changes." : "The previous estimated ready time has been cleared. Please check your order status for updates." };
      try {
        const delivered = await sendPushNotification(JSON.parse(saved.subscription_json),{...messages[status],url:"/",tag:"order-" + id},{publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT},{ttl:3600,urgency:"high"});
        notification = delivered ? "sent" : "subscription-expired";
        if (!delivered) await env.DB.prepare("DELETE FROM push_subscriptions WHERE order_id=?").bind(id).run();
      } catch (error) { console.error("Order push notification failed",error); notification = "send-failed"; }
    } else notification = "customer-not-subscribed";
  }
  return json({ok:true,changes,notification,estimatedReadyAt:hasEstimateUpdate ? estimatedReadyAt : undefined});
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  let body: any; try { body = await request.json(); } catch { return json({ error: "Invalid delete request." }, 400); }
  const id = String(body?.id || "").trim();
  if (!id) return json({ error: "Order ID is required." }, 400);
  const order = await env.DB.prepare("SELECT status,stock_deducted FROM customer_orders WHERE id=? AND archived_at IS NULL").bind(id).first<any>();
  if (!order) return json({ error: "Order not found or already archived." }, 404, { "cache-control": "no-store" });
  if (Number(order.stock_deducted || 0) === 1 && !["cancelled","completed","unavailable"].includes(String(order.status))) {
    return json({ error: "This order still affects inventory. Cancel or complete it before archiving." }, 409, { "cache-control": "no-store" });
  }
  const archivedAt = Date.now();
  const result = await env.DB.prepare("UPDATE customer_orders SET archived_at=?,updated_at=? WHERE id=? AND archived_at IS NULL").bind(archivedAt,archivedAt,id).run();
  return json({ ok: true, archived: Number(result.meta.changes || 0) === 1 }, 200, { "cache-control": "no-store" });
};
