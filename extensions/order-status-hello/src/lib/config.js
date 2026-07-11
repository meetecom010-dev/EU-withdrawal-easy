// The deployed URL of this app's backend — matches `application_url` in
// shopify.app.toml. `shopify app dev` inlines root .env values into
// `process.env.*` references at build time, so APP_URL there (see
// .env.example) drives this during local development.
//
// That inlining doesn't happen for production builds/deploys, and `process`
// itself doesn't exist in the deployed extension's sandbox — referencing it
// unguarded would throw and take the whole extension down. The try/catch
// below is what makes that safe: when the reference wasn't substituted away
// at build time, accessing it throws, and PRODUCTION_APP_URL is used
// instead. Keep PRODUCTION_APP_URL up to date with this app's real URL.
const PRODUCTION_APP_URL = "https://example.com";

function resolveAppUrl() {
  try {
    // eslint-disable-next-line no-undef -- replaced at build time in dev, see comment above
    return process.env.APP_URL || PRODUCTION_APP_URL;
  } catch {
    return PRODUCTION_APP_URL;
  }
}

export const APP_URL = resolveAppUrl();
