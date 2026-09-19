import { useCallback, useEffect, useRef } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useShop, usePatchShop } from "../context/ShopContext";
import { updateThemeBlockAdded } from "../utils/api/shop";

// Must match blocks/withdrawal-form.liquid's filename. Not matched against
// the extension's own top-level handle from shopify.extension.toml —
// confirmed via shopify.app.extensions() that Shopify reports a fixed
// generic handle ("theme-app-extension") for that slot regardless of the
// configured value, since an app can only have one theme app extension
// (unlike UI extensions, where multiple with distinct handles are normal).
// The block-level handle is the real, reliable discriminator.
const THEME_BLOCK_HANDLE = "withdrawal-form";
const EXTENSION_CHECK_INTERVAL_MS = 5_000;

// Mounted once for the whole authenticated app shell (see routes/_app.jsx),
// same as OrderStatusExtensionSync — keeps Shop.themeBlockAdded (Context +
// database) in sync with the live App Bridge extensions API, so
// StandalonePageStatus.jsx just reads shop.themeBlockAdded instead of
// polling itself.
//
// Confirmed shape via a live shopify.app.extensions() response: for a
// `type: "theme_app_extension"` entry, `activations` is a list of this app's
// blocks/embeds, each with its own `handle`, `status` ("active" once placed
// on a theme), and a nested `activations` array of the actual theme
// placements.
export default function ThemeBlockExtensionSync() {
  const shopify = useAppBridge();
  const { themeBlockAdded } = useShop();
  const patchShop = usePatchShop();

  // Tracks the last value we've *confirmed* is saved in the database —
  // deliberately separate from the (optimistically updated) context value,
  // so a failed PATCH below still gets retried on the next tick instead of
  // being masked by the context already reflecting the new status.
  const lastPersistedRef = useRef(themeBlockAdded);

  const syncStatus = useCallback(async () => {
    let active;
    try {
      const extensions = await shopify.app.extensions();
      const block = extensions
        .filter((ext) => ext.type === "theme_app_extension")
        .flatMap((ext) => ext.activations ?? [])
        .find((activation) => activation.handle === THEME_BLOCK_HANDLE);
      active = block?.status === "active";
    } catch {
      return; // Transient App Bridge failure — the next tick will try again.
    }

    if (active === lastPersistedRef.current) {
      return;
    }

    patchShop({ themeBlockAdded: active });
    try {
      await updateThemeBlockAdded(active);
      lastPersistedRef.current = active;
    } catch {
      // Leave lastPersistedRef stale so the next tick retries the write.
    }
  }, [shopify, patchShop]);

  useEffect(() => {
    syncStatus();
    const intervalId = setInterval(syncStatus, EXTENSION_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [syncStatus]);

  return null;
}
