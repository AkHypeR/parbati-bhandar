import { json, type Env } from "../../_lib/env";
import { purgeExpiredCustomerOrders } from "../../_lib/order-retention";
import { ensureCustomerTables, getCustomer } from "../../_lib/customer-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  await ensureCustomerTables(env);
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN ready_at INTEGER").run().catch(() => {});
  const customer = await getCustomer(request, env);
  if (!customer) return json({error:"Please sign in to view your orders."},401,{"cache-control":"no-store"});
  const phone = customer.phone;
  await purgeExpiredCustomerOrders(env);

  if (url.searchParams.get("history") === "1") {
    const rows = await env.DB.prepare(
      "SELECT order_number,items_json,status,total,created_at,updated_at,confirmed_at,ready_at FROM customer_orders WHERE customer_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 50"
    ).bind(customer.id, Date.now() - 7 * 24 * 60 * 60 * 1000).all<any>();
    const orders = (rows.results || []).map((row: any) => ({
      orderNumber: Number(row.order_number),
      status: row.status,
      total: Number(row.total || 0),
      confirmedAt: row.confirmed_at || null,
      readyAt: row.ready_at || row.confirmed_at || null,
      items: (JSON.parse(row.items_json || "[]") as any[]).map(item => ({
        name:item.name, quantity:item.quantity, unit:item.unit, price:Number(item.price || 0), lineTotal:Number(item.price || 0) * Number(item.quantity || 0), unavailable:!!item.unavailable
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    return json({orders,retentionDays:7},200,{"cache-control":"no-store"});
  }

  const orderNumber = Number(url.searchParams.get("orderNumber"));
  if (!Number.isInteger(orderNumber) || orderNumber < 1) return json({error:"Enter a valid order number and phone number."},400);
  const row = await env.DB.prepare("SELECT order_number,customer_id,customer_phone,items_json,status,total,created_at,updated_at,confirmed_at,ready_at FROM customer_orders WHERE order_number=?").bind(orderNumber).first<any>();
  if (!row || row.customer_id !== customer.id || String(row.customer_phone).replace(/\D/g, "") !== phone) return json({error:"No matching order was found. Check the details and try again."},404);
  const items = (JSON.parse(row.items_json || "[]") as any[]).map(item => ({name:item.name,quantity:item.quantity,unit:item.unit,price:Number(item.price || 0),lineTotal:Number(item.price || 0)*Number(item.quantity || 0),unavailable:!!item.unavailable}));
  return json({orderNumber:Number(row.order_number),status:row.status,total:Number(row.total || 0),confirmedAt:row.confirmed_at || null,readyAt:row.ready_at || row.confirmed_at || null,items,createdAt:row.created_at,updatedAt:row.updated_at},200,{"cache-control":"no-store"});
};
