import { json, type Env } from "../../_lib/env";
import { purgeExpiredCustomerOrders } from "../../_lib/order-retention";
import { ensureCustomerTables } from "../../_lib/customer-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  await ensureCustomerTables(env);
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN ready_at INTEGER").run().catch(() => {});
  await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN estimated_ready_at INTEGER").run().catch(() => {});
  const phone = String(url.searchParams.get("phone") || "").replace(/\D/g, "");
  if (phone.length < 10) return json({error:"Enter the 10-digit phone number used at checkout."},400,{"cache-control":"no-store"});
  await purgeExpiredCustomerOrders(env);

  if (url.searchParams.get("history") === "1") {
    const rows = await env.DB.prepare(
      "SELECT order_number,customer_phone,items_json,status,total,created_at,updated_at,confirmed_at,ready_at,estimated_ready_at FROM customer_orders WHERE customer_phone=? ORDER BY created_at DESC LIMIT 100"
    ).bind(phone).all<any>();
    const orders = (rows.results || []).map((row: any) => ({
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
  const row = await env.DB.prepare("SELECT order_number,customer_id,customer_phone,items_json,status,total,created_at,updated_at,confirmed_at,ready_at,estimated_ready_at FROM customer_orders WHERE order_number=?").bind(orderNumber).first<any>();
  if (!row || String(row.customer_phone || "").replace(/\D/g, "") !== phone) return json({error:"No matching order was found. Check the details and try again."},404);
  const items = (JSON.parse(row.items_json || "[]") as any[]).map(item => ({name:item.name,quantity:item.quantity,unit:item.unit,price:Number(item.price || 0),lineTotal:Number(item.price || 0)*Number(item.quantity || 0),unavailable:!!item.unavailable}));
  const unavailableDeduction = items.filter((item:any) => item.unavailable).reduce((sum:number,item:any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const finalTotal = items.filter((item:any) => !item.unavailable).reduce((sum:number,item:any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  return json({orderNumber:Number(row.order_number),status:row.status,total:finalTotal,originalTotal:Number(row.total || 0),unavailableDeduction,confirmedAt:row.confirmed_at || null,readyAt:row.ready_at || row.confirmed_at || null,estimatedReadyAt:row.estimated_ready_at || null,items,createdAt:row.created_at,updatedAt:row.updated_at},200,{"cache-control":"no-store"});
};
