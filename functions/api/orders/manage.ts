import { json, type Env } from "../../_lib/env";
import { ensureCustomerTables, getCustomer } from "../../_lib/customer-auth";
import { purgeExpiredCustomerOrders } from "../../_lib/order-retention";

type Item = { productId?: string; name: string; quantity: number; unit: string; price: number; unavailable?: boolean; stockRefunded?: boolean };
function stockUnits(item: Item, product: any): number | null {
  const clean=(v:unknown)=>String(v||"").trim().toLowerCase().replace(/\s+/g," ");
  const iu=clean(item.unit), su=clean(product.unit);
  if(iu===su) return Number(item.quantity);
  const measure=(v:string):{dimension:string;base:number}|null=>{
    const m=v.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|gm|grams?|l|litres?|liters?|ml|millilitres?|milliliters?)\b/i);
    if(!m)return null; const n=Number(m[1]),u=m[2].toLowerCase();
    if(["kg","kgs","kilogram","kilograms"].includes(u))return {dimension:"mass",base:n*1000};
    if(["g","gm","gram","grams"].includes(u))return {dimension:"mass",base:n};
    if(["l","litre","litres","liter","liters"].includes(u))return {dimension:"volume",base:n*1000};
    return {dimension:"volume",base:n};
  };
  const a=measure(iu),b=measure(su);
  if(a&&b&&a.dimension===b.dimension&&b.base>0)return Number(item.quantity)*a.base/b.base;
  if(/^(pcs?|pieces?|units?|items?|nos?|numbers?)$/i.test(su) && (/(pouch|packet|pack|sachet|bottle|jar|tin|can|box|carton)/i.test(String(product.name||""))||/^(pcs?|pieces?|units?|items?|nos?|numbers?)$/i.test(iu)))return Number(item.quantity);
  if(/(packet|pack|pouch|bottle|jar|bag)/i.test(su)){const m=iu.match(/(\d+)\s*[- ]?pack/i);if(m)return Number(item.quantity)*Number(m[1]);if(/(pack|packet|pouch|bottle|jar|bag)/i.test(iu))return Number(item.quantity);}
  if(/(pouch|packet|pack|sachet|bottle|jar|tin|can|box|carton)/i.test(String(product.name||"")))return Number(item.quantity);
  return null;
}
async function prepare(env:Env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS customer_orders (id TEXT PRIMARY KEY, customer_id TEXT, items_json TEXT NOT NULL, total REAL NOT NULL, status TEXT NOT NULL, updated_at INTEGER NOT NULL, stock_deducted INTEGER NOT NULL DEFAULT 0)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_stock_deductions (order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL, PRIMARY KEY(order_id,product_id))").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_stock_refunds (order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL, PRIMARY KEY(order_id,product_id))").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS customer_order_action_guard (action_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL, CHECK(expected_count=actual_count))").run();
}

export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
  await ensureCustomerTables(env); await prepare(env);
  const customer=await getCustomer(request,env);
  if(!customer)return json({error:"Please sign in to manage your order."},401,{"cache-control":"no-store"});
  await purgeExpiredCustomerOrders(env);
  let body:any;try{body=await request.json();}catch{return json({error:"Invalid order update."},400);}
  const id=String(body?.id||"").trim(), action=String(body?.action||"");
  if(!id||!["cancel","edit"].includes(action))return json({error:"Invalid order action."},400);
  const order=await env.DB.prepare("SELECT id,customer_id,items_json,total,status,stock_deducted FROM customer_orders WHERE id=? AND customer_id=? AND archived_at IS NULL").bind(id,customer.id).first<any>();
  if(!order)return json({error:"Order not found in your account."},404);
  if(action==="cancel" && order.status!=="new")return json({error:"Orders can only be cancelled before the store starts processing them."},409);
  if(action==="edit" && !["new","processing"].includes(String(order.status)))return json({error:"Orders can only be edited until the store marks them ready."},409);
  const original:Item[]=JSON.parse(order.items_json||"[]");
  if(!original.length)return json({error:"This order has no editable items."},409);
  const now=Date.now(), actionId=crypto.randomUUID();
  const deductionRows=Number(order.stock_deducted||0)===1?(await env.DB.prepare("SELECT product_id,quantity FROM order_stock_deductions WHERE order_id=?").bind(id).all<any>()).results||[]:[];
  const oldDeductions=new Map<string,number>(deductionRows.map((r:any)=>[String(r.product_id),Number(r.quantity||0)]));
  if(action==="cancel"){
    const refundMap=new Map<string,number>();
    const marked=original.map(item=>({...item}));
    for(const [productId,quantity] of oldDeductions){
      if(!(quantity>0))continue;
      const row=await env.DB.prepare("SELECT data FROM products WHERE id=?").bind(productId).first<any>();
      if(!row)return json({error:"An inventory item is missing. The order was not cancelled; please contact the store."},409);
      const product=JSON.parse(row.data);
      const matching=marked.filter(x=>x.productId===productId&&!x.stockRefunded);
      const units=matching.reduce((sum,item)=>sum+(stockUnits(item,product)||0),0);
      if(!matching.length||!Number.isFinite(units)||units<=0)return json({error:"Could not safely match an item to inventory. The order was not cancelled."},409);
      refundMap.set(productId,units);
      matching.forEach(x=>x.stockRefunded=true);
    }
    const statements:any[]=[
      env.DB.prepare("UPDATE customer_orders SET stock_deducted=3 WHERE id=? AND customer_id=? AND status='new' AND stock_deducted=1 AND items_json=?").bind(id,customer.id,order.items_json),
      env.DB.prepare("INSERT INTO customer_order_action_guard(action_id,expected_count,actual_count) SELECT ?,1,changes()").bind(actionId+":lock")
    ];
    for(const [productId,quantity] of refundMap){
      statements.push(
        env.DB.prepare("UPDATE products SET data=json_set(data,'$.stockQuantity',ROUND(json_extract(data,'$.stockQuantity')+?,4),'$.inStock',json('true'),'$.updatedAt',?),updated_at=? WHERE id=? AND json_type(data,'$.stockQuantity') IN ('integer','real') AND EXISTS(SELECT 1 FROM customer_orders WHERE id=? AND stock_deducted=3)").bind(quantity,now,now,productId,id),
        env.DB.prepare("INSERT INTO order_stock_refunds(order_id,product_id,quantity) SELECT ?,?,? WHERE changes()=1 ON CONFLICT(order_id,product_id) DO UPDATE SET quantity=order_stock_refunds.quantity+excluded.quantity").bind(id,productId,quantity),
        env.DB.prepare("INSERT INTO customer_order_action_guard(action_id,expected_count,actual_count) SELECT ?,1 WHERE changes()=1").bind(actionId+":refund:"+productId)
      );
    }
    statements.push(
      env.DB.prepare("INSERT INTO customer_order_action_guard(action_id,expected_count,actual_count) SELECT ?,?,(SELECT COUNT(*) FROM customer_order_action_guard WHERE action_id LIKE ?)").bind(actionId+":count",refundMap.size+1,actionId+":%"),
      env.DB.prepare("UPDATE customer_orders SET status='cancelled',items_json=?,total=0,updated_at=?,estimated_ready_at=NULL,stock_deducted=1 WHERE id=? AND customer_id=? AND stock_deducted=3").bind(JSON.stringify(marked),now,id,customer.id),
      env.DB.prepare("DELETE FROM order_stock_reservations WHERE order_id=?").bind(id)
    );
    try{const result=await env.DB.batch(statements);if(!result[result.length-2]?.meta?.changes)return json({error:"The order changed while cancellation was being processed. Refresh and try again."},409);}
    catch(error){console.error("Customer order cancellation/refund failed",error);return json({error:"We could not safely cancel this order and restore inventory. Please contact the store."},409);}
    return json({ok:true,status:"cancelled"});
  }

  if(original.some(item=>item.unavailable||item.stockRefunded))return json({error:"This order can no longer be edited because an item has an availability adjustment."},409);
  if(!Array.isArray(body.quantities)||body.quantities.length!==original.length)return json({error:"Refresh your order before editing it."},400);
  const quantities=body.quantities.map((v:any)=>Number(v));
  if(quantities.some(v=>!Number.isInteger(v)||v<0||v>999)||quantities.every(v=>v===0))return json({error:"Keep at least one item and use quantities from 1 to 999."},400);
  const revised:Item[]=original.filter((_,i)=>quantities[i]>0).map((item)=>({...item,quantity:quantities[original.indexOf(item)]}));
  const desired=new Map<string,number>();
  for(const item of revised){
    if(!item.productId)continue;
    const row=await env.DB.prepare("SELECT data FROM products WHERE id=?").bind(item.productId).first<any>();
    if(!row)return json({error:item.name+" is no longer in the catalogue."},409);
    const product=JSON.parse(row.data);
    if(typeof product.stockQuantity==="number"){
      const units=stockUnits(item,product);
      if(units===null||!Number.isFinite(units)||units<=0)return json({error:"Could not match "+item.name+" to its inventory unit."},409);
      desired.set(item.productId,(desired.get(item.productId)||0)+units);
    }
  }
  const productIds=new Set([...oldDeductions.keys(),...desired.keys()]);
  const deltas=new Map<string,number>();
  for(const productId of productIds){
    const delta=(desired.get(productId)||0)-(oldDeductions.get(productId)||0);
    if(Math.abs(delta)>0.00001)deltas.set(productId,delta);
  }
  const statements:any[]=[
    env.DB.prepare("UPDATE customer_orders SET stock_deducted=3 WHERE id=? AND customer_id=? AND status IN ('new','processing') AND stock_deducted=1 AND items_json=?").bind(id,customer.id,order.items_json),
    env.DB.prepare("INSERT INTO customer_order_action_guard(action_id,expected_count,actual_count) SELECT ?,1,changes()").bind(actionId+":lock")
  ];
  for(const [productId,delta] of deltas){
    const row=await env.DB.prepare("SELECT data FROM products WHERE id=?").bind(productId).first<any>();
    if(!row)return json({error:"An inventory item is missing. No changes were saved."},409);
    const product=JSON.parse(row.data);
    if(typeof product.stockQuantity!=="number")return json({error:"Inventory tracking changed for an item. No changes were saved."},409);
    if(delta>0&&product.inStock===false)return json({error:(product.name||"An item")+" is currently unavailable, so its quantity cannot be increased."},409);
    if(delta>0&&Number(product.stockQuantity)+1e-9<delta)return json({error:"Not enough stock is available to increase "+(product.name||"an item")+"'s quantity."},409);
    statements.push(
      env.DB.prepare("UPDATE products SET data=json_set(data,'$.stockQuantity',ROUND(json_extract(data,'$.stockQuantity')-?,4),'$.inStock',CASE WHEN ROUND(json_extract(data,'$.stockQuantity')-?,4)<=0 THEN json('false') ELSE json('true') END,'$.updatedAt',?),updated_at=? WHERE id=? AND json_type(data,'$.stockQuantity') IN ('integer','real') AND (ROUND(json_extract(data,'$.stockQuantity'),4)>=ROUND(?,4) OR ?<=0) AND EXISTS(SELECT 1 FROM customer_orders WHERE id=? AND stock_deducted=3)").bind(delta,delta,now,now,productId,Math.max(0,delta),delta,id),
      env.DB.prepare("INSERT INTO customer_order_action_guard(action_id,expected_count,actual_count) SELECT ?,1,changes()").bind(actionId+":stock:"+productId)
    );
  }
  statements.push(
    env.DB.prepare("INSERT INTO customer_order_action_guard(action_id,expected_count,actual_count) SELECT ?,?,(SELECT COUNT(*) FROM customer_order_action_guard WHERE action_id LIKE ?)").bind(actionId+":count",deltas.size+1,actionId+":%"),
    ...Array.from(productIds).map(productId=>desired.has(productId)
      ? env.DB.prepare("INSERT INTO order_stock_deductions(order_id,product_id,quantity) VALUES(?,?,?) ON CONFLICT(order_id,product_id) DO UPDATE SET quantity=excluded.quantity").bind(id,productId,desired.get(productId))
      : env.DB.prepare("DELETE FROM order_stock_deductions WHERE order_id=? AND product_id=?").bind(id,productId)),
    env.DB.prepare("UPDATE customer_orders SET items_json=?,total=?,updated_at=?,stock_deducted=1 WHERE id=? AND customer_id=? AND status IN ('new','processing') AND stock_deducted=3").bind(JSON.stringify(revised),revised.reduce((sum,item)=>sum+item.price*item.quantity,0),now,id,customer.id)
  );
  try{const result=await env.DB.batch(statements);if(!result[result.length-1]?.meta?.changes)return json({error:"The order changed while it was being edited. Refresh and try again."},409);}
  catch(error){console.error("Customer order edit transaction failed",error);return json({error:"Could not safely update your order or inventory. Please try again."},409);}
  return json({ok:true,status:"new"});
};
