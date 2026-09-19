import { useState } from "react";
import { useShop } from "../context/ShopContext";

// The theme app extension's block identity, used to build the deep link
// below. This is NOT the `uid` from shopify.extension.toml — that's a local,
// stable identifier the CLI uses to track "this is the same extension" across
// deploys; it's never what Shopify's servers hand back as the extension's own
// identity. The real, server-assigned id only exists after a deploy, in
// .shopify/deploy-bundle/manifest.json's `uuid` field for this extension's
// module entry (dev-only sessions never get one — deep links need a deployed
// + released version to resolve against). Re-check that file if this ever
// needs updating (e.g. after deleting and recreating the extension).
const THEME_EXTENSION_UUID = "01a0b5cc-8493-7292-a25f-2168e67538c9";
const THEME_BLOCK_HANDLE = "withdrawal-form";

// Shopify's built-in template groups, not merchant-specific resources — no
// theme/content scope is needed to offer these, since nothing is read or
// created via the Admin API. Picking one and deep-linking straight to it
// (rather than to a custom template we'd have to ask the merchant to create
// by hand first, with no way to deep-link that creation step) is what makes
// this a single click: Shopify's `addAppBlockId` param auto-inserts the block
// as its own new section on that template, so all that's left is Save.
const TEMPLATE_OPTIONS = [
  { value: "page", label: "Pages (default page template)" },
  { value: "index", label: "Home page" },
  { value: "product", label: "Product pages" },
  { value: "collection", label: "Collection pages" },
  { value: "cart", label: "Cart page" },
];

const THEME_EDITOR_FALLBACK_URL = "https://admin.shopify.com/themes";

// Detection is fully automatic, same as OrderStatusExtensionStatus.jsx: this
// component just reads shop.themeBlockAdded and disappears once it's true.
// The actual polling lives in ThemeBlockExtensionSync.jsx (mounted once in
// routes/_app.jsx), via shopify.app.extensions() — confirmed working against
// a live response, no manual confirmation needed.
export default function StandalonePageStatus() {
  const { shop, themeBlockAdded } = useShop();
  const [template, setTemplate] = useState(TEMPLATE_OPTIONS[0].value);

  if (themeBlockAdded) {
    return null;
  }

  const storeHandle = shop?.replace(/\.myshopify\.com$/, "");
  // `target=newAppsSection` is required — without it the theme editor tries to
  // slot the block into an existing section on the template (most templates
  // don't have an app-block slot at all) instead of creating a fresh section
  // to hold it, and fails with a generic "problem with the app block" error.
  const activateUrl = storeHandle
    ? `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?template=${template}&addAppBlockId=${THEME_EXTENSION_UUID}/${THEME_BLOCK_HANDLE}&target=newAppsSection`
    : THEME_EDITOR_FALLBACK_URL;

  return (
    <s-banner tone="warning" heading="Standalone withdrawal page not set up yet">
      <s-stack direction="block" gap="small-200">
        <s-paragraph>
          Choose where the withdrawal button should appear, then click Activate — the theme
          editor opens with the button already added as a section on that template.
        </s-paragraph>

        <s-select
          label="Where should it appear?"
          value={template}
          onChange={(e) => setTemplate(e.currentTarget.value)}
        >
          {TEMPLATE_OPTIONS.map((option) => (
            <s-option key={option.value} value={option.value}>
              {option.label}
            </s-option>
          ))}
        </s-select>

        <s-ordered-list>
          <s-list-item>
            Click <s-text type="strong">Activate</s-text> — the theme editor opens and the button
            is added as a section.
          </s-list-item>
          <s-list-item>Drag the section to where you want it on the page.</s-list-item>
          <s-list-item>
            Click <s-text type="strong">Save</s-text> in the top right.
          </s-list-item>
        </s-ordered-list>

        <s-paragraph color="subdued">
          This warning updates automatically within a few seconds of the block being saved.
        </s-paragraph>

        <s-stack direction="inline" gap="small-200">
          <s-button href={activateUrl} target="_blank">
            Activate
          </s-button>
        </s-stack>
      </s-stack>
    </s-banner>
  );
}
