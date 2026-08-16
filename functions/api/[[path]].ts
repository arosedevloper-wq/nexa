import worker from "../../server/cloudflareWorker";

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);

  // If request is for an API endpoint or root worker logic
  if (url.pathname.startsWith("/api/")) {
    return worker.fetch(request, env, context);
  }

  return context.next();
}
