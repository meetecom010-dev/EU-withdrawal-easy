/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRevalidator } from "react-router";

// Populated once from the routes/_app.jsx loader and shared with every
// nested route/component via context, instead of each route fetching
// /api/shop on its own. React Router already skips re-running a parent
// loader on navigations between its child routes, so this data is loaded
// once per document load rather than on every route change.
const ShopContext = createContext(null);

export function ShopProvider({ shop: shopFromLoader, children }) {
  const revalidator = useRevalidator();
  const [shop, setShop] = useState(shopFromLoader);
  // Session-only — "Skip for now" sets this instead of persisting
  // onboardingCompleted to the database, so onboarding shows again next
  // time the app is opened. Plain in-memory state (not sessionStorage) so
  // it resets on a fresh page load, exactly like a closed dialog would.
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  // Same idea for the Home dashboard's setup guide card: dismissing it
  // shouldn't be permanent or survive a reload, only client-side tab
  // switches — living here (instead of each remount of Home re-reading
  // sessionStorage) does both for free.
  const [setupGuideDismissed, setSetupGuideDismissed] = useState(false);

  // The loader's shop is the source of truth on navigation/revalidation —
  // resync local state whenever it changes underneath us.
  useEffect(() => {
    setShop(shopFromLoader);
  }, [shopFromLoader]);

  // Lets a component apply an immediate, local update (e.g. syncing the
  // order-status extension status) without waiting on a full loader
  // revalidate — the caller is responsible for persisting the change.
  const patchShop = useCallback((patch) => {
    setShop((current) => ({ ...current, ...patch }));
  }, []);

  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
  }, []);

  const dismissSetupGuide = useCallback(() => {
    setSetupGuideDismissed(true);
  }, []);

  const value = useMemo(
    () => ({
      shop,
      // Call after a mutation (e.g. changing the plan, finishing onboarding)
      // to re-run the _app.jsx loader and refresh the shared shop data.
      refreshShop: () => revalidator.revalidate(),
      patchShop,
      onboardingDismissed,
      dismissOnboarding,
      setupGuideDismissed,
      dismissSetupGuide,
    }),
    [
      shop,
      revalidator,
      patchShop,
      onboardingDismissed,
      dismissOnboarding,
      setupGuideDismissed,
      dismissSetupGuide,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

function useShopContext(hookName) {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error(`${hookName} must be used within the ShopProvider set up in routes/_app.jsx`);
  }
  return context;
}

export function useShop() {
  return useShopContext("useShop").shop;
}

export function useRefreshShop() {
  return useShopContext("useRefreshShop").refreshShop;
}

export function usePatchShop() {
  return useShopContext("usePatchShop").patchShop;
}

export function useOnboardingDismissed() {
  return useShopContext("useOnboardingDismissed").onboardingDismissed;
}

export function useDismissOnboarding() {
  return useShopContext("useDismissOnboarding").dismissOnboarding;
}

export function useSetupGuideDismissed() {
  return useShopContext("useSetupGuideDismissed").setupGuideDismissed;
}

export function useDismissSetupGuide() {
  return useShopContext("useDismissSetupGuide").dismissSetupGuide;
}
