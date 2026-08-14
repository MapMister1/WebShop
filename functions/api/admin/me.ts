import { Env, getAdmin, json } from '../../_shared';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const admin = await getAdmin(request, env);
  return json(admin ? { authenticated: true, email: admin.email } : { authenticated: false });
};
