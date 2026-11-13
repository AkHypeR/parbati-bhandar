import { json, type Env } from "../../_lib/env";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const orderNumber = Number(url.searchParams.get("orderNumber"));
  const phone = String(url.searchParams.get("phone") || "").replace(/\\D/g, "").slice(0, 15);
  if (!Number.isInteger(orderNumber) || orderNumber < 1 || phone.length < 10) return json({error:"Enter a valid order number and phone number."},400);
  const row = await env.DB.prepare("SELECT order_number,customer_phone,items_json,status,created_at,updated_at FROM customer_orders WHERE order_number=?").bind(orderNumber).first<any>();
  if (!row || String(row.customer_phone).replace(/\\D/g, "") !== phone) return json({error:"No matching order was found. Check the details and try again."},404);
  const items = (JSON.parse(row.items_json || "[]") as any[]).map(item => ({name:item.name,quantity:item.quantity,unit:item.unit,unavailable:!!item.unavailable}));
  return json({orderNumber:row.order_number,status:row.status,items,createdAt:row.created_at,updatedAt:row.updated_at},200,{"cache-control":"no-store"});
};
