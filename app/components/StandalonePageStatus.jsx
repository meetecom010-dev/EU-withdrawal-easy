import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
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
const THEME_EXTENSION_UUID = "01a0bd99-6768-7142-980f-d2db94658a7d";
const THEME_BLOCK_HANDLE = "withdrawal-form";

// Shopify's built-in template groups, not merchant-specific resources — no
// theme/content scope is needed to offer these, since nothing is read or
// created via the Admin API. Picking one and deep-linking straight to it
// (rather than to a custom template we'd have to ask the merchant to create
// by hand first, with no way to deep-link that creation step) is what makes
// this a single click: Shopify's `addAppBlockId` param auto-inserts the block
// as its own new section on that template, so all that's left is Save.
// Labels live in en.json under blockSetup.storefront.templates.<value>.
const TEMPLATE_OPTIONS = ["page", "index", "product", "collection", "cart"];

const THEME_EDITOR_FALLBACK_URL = "https://admin.shopify.com/themes";

// Detection is fully automatic, same as OrderStatusExtensionStatus.jsx: this
// component just reads shop.themeBlockAdded and disappears once it's true.
// The actual polling lives in ThemeBlockExtensionSync.jsx (mounted once in
// routes/_app.jsx), via shopify.app.extensions() — confirmed working against
// a live response, no manual confirmation needed.
export default function StandalonePageStatus() {
  const { t } = useTranslation();
  const { shop, themeBlockAdded } = useShop();
  const [template, setTemplate] = useState(TEMPLATE_OPTIONS[0]);

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
    <s-banner tone="warning" heading={t("blockSetup.storefront.heading")}>
      <s-stack direction="block" gap="small-200">
        <s-paragraph>{t("blockSetup.storefront.body")}</s-paragraph>

        <s-select
          label={t("blockSetup.storefront.templateLabel")}
          value={template}
          onChange={(e) => setTemplate(e.currentTarget.value)}
        >
          {TEMPLATE_OPTIONS.map((value) => (
            <s-option key={value} value={value}>
              {t(`blockSetup.storefront.templates.${value}`)}
            </s-option>
          ))}
        </s-select>

        <s-ordered-list>
          {["open", "move", "save"].map((step) => (
            <s-list-item key={step}>
              <Trans
                i18nKey={`blockSetup.storefront.steps.${step}`}
                components={{ strong: <s-text type="strong" /> }}
              />
            </s-list-item>
          ))}
        </s-ordered-list>

        <s-paragraph color="subdued">{t("blockSetup.autoUpdate")}</s-paragraph>

        <s-stack direction="inline" gap="small-200">
          <s-button href={activateUrl} target="_blank">
            {t("blockSetup.addAppBlock")}
          </s-button>
        </s-stack>
      </s-stack>
    </s-banner>
  );
}
