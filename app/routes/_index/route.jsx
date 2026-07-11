import { redirect } from "react-router";
import { authenticate } from "../../shopify.server";

// This app is App Store-distributed and embedded-only — every real visitor
// arrives through Shopify Admin, so "/" just forwards into the app shell
// like every other route. The previous version of this loader sniffed for a
// `shop` query param and showed a static marketing page otherwise, but
// Shopify Admin's own left-nav "app icon" load (and other in-app returns to
// the root) can hit this route without shop/host params attached yet.
// authenticate.admin handles that case correctly on its own — it responds
// with the App Bridge bootstrap script, which completes the handshake and
// reloads with the right context — so bypassing it here was what sent that
// load to a dead-end marketing page instead of the dashboard.
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  throw redirect(`/home${new URL(request.url).search}`);
};
