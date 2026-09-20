import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";

// Replaces `react-router-serve`, which builds its Express app with the default
// `trust proxy` setting (off) and exposes no way to change it. Fly terminates
// TLS at its edge and forwards to this container over plain HTTP, so with
// `trust proxy` off Express reports `req.protocol === "http"` and React Router
// builds `request.url` as `http://eu-withdrawal-easy.fly.dev/...`. The browser
// meanwhile sends `Origin: https://eu-withdrawal-easy.fly.dev` on every action
// POST from the embedded admin, and React Router's CSRF guard (added in 7.12)
// rejects the mismatch with a bare 400 before the action ever runs — which
// killed every fetcher on the app (approve/reject, notes, refunds, order tags,
// holds), while GET loaders kept working. Trusting the proxy makes
// `X-Forwarded-Proto` authoritative, so the two origins line up again. It also
// keeps any other `new URL(request.url)` in the app on the right scheme.
const build = await import("./build/server/index.js");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(compression());
app.use(
  "/assets",
  express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
);
app.use(express.static("build/client", { maxAge: "1h" }));
app.use(morgan("tiny"));

app.all("*", createRequestHandler({ build, mode: process.env.NODE_ENV }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
