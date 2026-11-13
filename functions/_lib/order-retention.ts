import type { Env } from "./env";

/** Delete customer orders and related records seven days after creation. */
export async function purgeExpiredCustomerOrders(env: Env): Promise<void> {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM push_subscriptions WHERE order_id IN (SELECT id FROM customer_orders WHERE created_at < ?)").bind(cutoff),
    env.DB.prepare("DELETE FROM order_stock_deductions WHERE order_id IN (SELECT id FROM customer_orders WHERE created_at < ?)").bind(cutoff),
    env.DB.prepare("DELETE FROM order_stock_deduction_guard WHERE order_id IN (SELECT id FROM customer_orders WHERE created_at < ?)").bind(cutoff),
    env.DB.prepare("DELETE FROM customer_orders WHERE created_at < ?").bind(cutoff),
  ]);
}
