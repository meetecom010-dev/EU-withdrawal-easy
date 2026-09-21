/** @type {import("@react-router/dev/config").Config} */
export default {
  // react-router-serve runs a plain Express app with `trust proxy` disabled,
  // so req.protocol is always "http" even though Fly's edge terminates TLS
  // and only forwards plain HTTP internally. That makes React Router's CSRF
  // check compare "https://eu-withdrawal-easy.fly.dev" (the real Origin
  // header from the browser) against "http://eu-withdrawal-easy.fly.dev"
  // (the scheme-wrong URL it reconstructs) — same host, different scheme —
  // and reject every action submission with 400 Bad Request. Confirmed via
  // temporary logging (see git history) rather than guessed.
  //
  // isAllowedOrigin only compares the *host*, not the scheme, so whitelisting
  // the app's own host here bypasses the broken scheme comparison entirely.
  allowedActionOrigins: ["eu-withdrawal-easy.fly.dev"],
};
