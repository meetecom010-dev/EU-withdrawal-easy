import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { alertError } from "./services/slack/alert-error.server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
          alertError({ context: "ssr-render", error }).catch(() => {});
        },
      },
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}

// React Router's single point of failure for loader/action errors — called
// for every route (document requests, .data fetcher/action requests, and
// resource routes) whenever a loader or action throws. This is what actually
// catches things like a failed "place fulfillment order" click, which never
// goes through the onError above (that's React's own render-error hook, not
// React Router's route-error hook).
export function handleError(error, { request }) {
  // A client that navigated away or cancelled the request isn't a real
  // failure worth alerting on.
  if (request.signal.aborted) return;
  // TEMP DEBUG: pin down the exact Origin header Shopify's embedded admin
  // sends on live, since it's rejecting action submissions there but not in
  // local dev. Remove once allowedActionOrigins is set correctly.
  console.error("[debug] request.url host:", new URL(request.url).host, "| Origin header:", request.headers.get("origin"));
  console.error(error);
  alertError({
    context: "route-error",
    error,
    extra: { method: request.method, url: request.url },
  }).catch(() => {});
}
