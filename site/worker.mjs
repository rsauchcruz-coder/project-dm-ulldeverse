const FILE_PATH = /\.[a-z0-9]{1,8}$/i;

export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response("Static assets binding unavailable.", { status: 503 });
    }

    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed.", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && !FILE_PATH.test(url.pathname)) {
      const shellUrl = new URL("/index.html", url);
      response = await env.ASSETS.fetch(new Request(shellUrl, request));
    }

    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
