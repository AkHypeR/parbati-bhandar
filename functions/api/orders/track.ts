import { json, type Env } from "../../_lib/env";
import { purgeExpiredCustomerOrders } from "../../_lib/order-retention";
import { ensureCustomerTables, getCustomer } from "../../_lib/customer-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to view your orders." }, 401, { "cache-control": "no-store" });
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN ready_at INTEGER").run().catch(() => {});
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN estimated_ready_at INTEGER").run().catch(() => {});
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN archived_at INTEGER").run().catch(() => {});
  const phone = customer.phone;

  await purgeExpiredCustomerOrders(env);

  if (url.searchParams.get("history") === "1") {
    const rows = await env.DB.prepare(
      "SELECT id,order_number,customer_phone,items_json,status,total,created_at,updated_at,confirmed_at,ready_at,estimated_ready_at FROM customer_orders WHERE archived_at IS NULL AND (customer_id=? OR (customer_id IS NULL AND customer_phone=?)) ORDER BY created_at DESC LIMIT 100"
    ).bind(customer.id, phone).all<any>();
    const orders = (rows.results || []).map((row: any) => ({
      id: row.id,
      orderNumber: Number(row.order_number),
      status: row.status,
      total: (JSON.parse(row.items_json || "[]") as any[]).filter(item => !item.unavailable).reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
      unavailableDeduction: (JSON.parse(row.items_json || "[]") as any[]).filter(item => item.unavailable).reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
      confirmedAt: row.confirmed_at || null,
      readyAt: row.ready_at || row.confirmed_at || null,
      estimatedReadyAt: row.estimated_ready_at || null,
      items: (JSON.parse(row.items_json || "[]") as any[]).map(item => ({
        name:item.name, quantity:item.quantity, unit:item.unit, price:Number(item.price || 0), lineTotal:Number(item.price || 0) * Number(item.quantity || 0), unavailable:!!item.unavailable
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    return json({orders,retentionDays:365},200,{"cache-control":"no-store"});
  }

  const orderNumber = Number(url.searchParams.get("orderNumber"));
  if (!Number.isInteger(orderNumber) || orderNumber < 1) return json({error:"Enter a valid order number and phone number."},400);
  const row = await env.DB.prepare("SELECT id,order_number,customer_id,customer_phone,items_json,status,total,created_at,updated_at,confirmed_at,ready_at,estimated_ready_at FROM customer_orders WHERE order_number=? AND archived_at IS NULL AND (customer_id=? OR (customer_id IS NULL AND customer_phone=?))").bind(orderNumber, customer.id, phone).first<any>();
  if (!row || String(row.customer_phone || "").replace(/\D/g, "") !== phone) return json({error:"No matching order was found. Check the details and try again."},404);
  const items = (JSON.parse(row.items_json || "[]") as any[]).map(item => ({name:item.name,quantity:item.quantity,unit:item.unit,price:Number(item.price || 0),lineTotal:Number(item.price || 0)*Number(item.quantity || 0),unavailable:!!item.unavailable}));
  const unavailableDeduction = items.filter((item:any) => item.unavailable).reduce((sum:number,item:any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const finalTotal = items.filter((item:any) => !item.unavailable).reduce((sum:number,item:any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  return json({id:row.id,orderNumber:Number(row.order_number),status:row.status,total:finalTotal,originalTotal:Number(row.total || 0),unavailableDeduction,confirmedAt:row.confirmed_at || null,readyAt:row.ready_at || row.confirmed_at || null,estimatedReadyAt:row.estimated_ready_at || null,items,createdAt:row.created_at,updatedAt:row.updated_at},200,{"cache-control":"no-store"});
};
