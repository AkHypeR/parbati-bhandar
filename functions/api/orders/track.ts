import { json, type Env } from "../../_lib/env";
import { purgeExpiredCustomerOrders } from "../../_lib/order-retention";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const phone = String(url.searchParams.get("phone") || "").replace(/\D/g, "").slice(0, 15);
  if (phone.length < 10) return json({error:"Enter a valid phone number."},400);

  await purgeExpiredCustomerOrders(env);

  if (url.searchParams.get("history") === "1") {
    const rows = await env.DB.prepare(
      "SELECT order_number,items_json,status,total,created_at,updated_at,confirmed_at FROM customer_orders WHERE customer_phone=? AND created_at>=? ORDER BY created_at DESC LIMIT 50"
    ).bind(phone, Date.now() - 7 * 24 * 60 * 60 * 1000).all<any>();
    const orders = (rows.results || []).map((row: any) => ({
      orderNumber: row.order_number,
      status: row.status,
      total: Number(row.total || 0),
      confirmedAt: row.confirmed_at || null,
      items: (JSON.parse(row.items_json || "[]") as any[]).map(item => ({
        name:item.name, quantity:item.quantity, unit:item.unit, unavailable:!!item.unavailable
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    return json({orders,retentionDays:7},200,{"cache-control":"no-store"});
  }

  const orderNumber = Number(url.searchParams.get("orderNumber"));
  if (!Number.isInteger(orderNumber) || orderNumber < 1) return json({error:"Enter a valid order number and phone number."},400);
  const row = await env.DB.prepare("SELECT order_number,customer_phone,items_json,status,total,created_at,updated_at,confirmed_at FROM customer_orders WHERE order_number=?").bind(orderNumber).first<any>();
  if (!row || String(row.customer_phone).replace(/\D/g, "") !== phone) return json({error:"No matching order was found. Check the details and try again."},404);
  const items = (JSON.parse(row.items_json || "[]") as any[]).map(item => ({name:item.name,quantity:item.quantity,unit:item.unit,unavailable:!!item.unavailable}));
  return json({orderNumber:row.order_number,status:row.status,total:Number(row.total || 0),confirmedAt:row.confirmed_at || null,items,createdAt:row.created_at,updatedAt:row.updated_at},200,{"cache-control":"no-store"});
};
