export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) {
        return response;
      }
      // SPA Fallback: If not a file request (no extension), serve index.html for client-side routing
      if (!url.pathname.includes(".")) {
        return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
      }
      return response;
    } catch {
      return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
    }
  },
};
