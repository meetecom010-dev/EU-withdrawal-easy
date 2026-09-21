/** @type {import("@react-router/dev/config").Config} */
export default {
  // This app runs embedded inside Shopify's admin (admin.shopify.com), which
  // proxies action requests such that the browser's Origin header comes back
  // as admin.shopify.com (or the shop's own myshopify.com domain) instead of
  // this app's own host. Without this, React Router's CSRF check rejects
  // every action submission (form/fetcher POST) with a 400 "Bad Request" —
  // e.g. clicking "place fulfillment order" on a withdrawal request.
  allowedActionOrigins: ["admin.shopify.com", "*.myshopify.com"],
};
