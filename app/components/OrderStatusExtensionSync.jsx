import { useCallback, useEffect, useRef } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useShop, usePatchShop } from "../context/ShopContext";
import { updateOrderStatusBlockStatus } from "../utils/api/shop";

const ORDER_STATUS_EXTENSION_HANDLE = "withdrawal-order-status";
const ORDER_STATUS_EXTENSION_TARGET = "customer-account.order-status.block.render";
const EXTENSION_CHECK_INTERVAL_MS = 10_000;

// Mounted once for the whole authenticated app shell (see routes/_app.jsx).
// Keeps Shop.orderStatusBlockAdded (Context + database) in sync with the
// live App Bridge extensions API, so every other component can just read
// shop.orderStatusBlockAdded instead of polling shopify.app.extensions()
// itself. Renders nothing.
export default function OrderStatusExtensionSync() {
  const shopify = useAppBridge();
  const { orderStatusBlockAdded } = useShop();
  const patchShop = usePatchShop();

  // Tracks the last value we've *confirmed* is saved in the database —
  // deliberately separate from the (optimistically updated) context value,
  // so a failed PATCH below still gets retried on the next tick instead of
  // being masked by the context already reflecting the new status.
  const lastPersistedRef = useRef(orderStatusBlockAdded);

  const syncStatus = useCallback(async () => {
    let active;
    try {
      const extensions = await shopify.app.extensions();
      const extension = extensions.find((ext) => ext.handle === ORDER_STATUS_EXTENSION_HANDLE);
      active =
        extension?.activations?.some(
          (activation) => activation.target === ORDER_STATUS_EXTENSION_TARGET,
        ) ?? false;
    } catch {
      return; // Transient App Bridge failure — the next tick will try again.
    }

    if (active === lastPersistedRef.current) {
      return;
    }

    patchShop({ orderStatusBlockAdded: active });
    try {
      await updateOrderStatusBlockStatus(active);
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
