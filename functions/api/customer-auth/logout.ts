import { json, type Env } from "../../_lib/env";
import { clearCustomerSession } from "../../_lib/customer-auth";
export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
  await clearCustomerSession(request,env);
  return json({ok:true},200,{"set-cookie":"pb_customer=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0","cache-control":"no-store"});
};
