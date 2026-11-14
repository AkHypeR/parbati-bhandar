import { json, type Env } from "../../_lib/env";
import { ensureCustomerTables, getCustomer } from "../../_lib/customer-auth";
export const onRequestGet: PagesFunction<Env> = async ({request,env}) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request,env);
  return customer ? json({authenticated:true,customer},200,{"cache-control":"no-store"}) : json({authenticated:false},200,{"cache-control":"no-store"});
};
