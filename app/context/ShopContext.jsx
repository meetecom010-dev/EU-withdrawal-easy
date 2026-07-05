/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */
import { createContext, useContext, useMemo } from "react";
import { useRevalidator } from "react-router";

// Populated once from the routes/_app.jsx loader and shared with every
// nested route/component via context, instead of each route fetching
// /api/shop on its own. React Router already skips re-running a parent
// loader on navigations between its child routes, so this data is loaded
// once per document load rather than on every route change.
const ShopContext = createContext(null);

export function ShopProvider({ shop, children }) {
  const revalidator = useRevalidator();

  const value = useMemo(
    () => ({
      shop,
      // Call after a mutation (e.g. changing the plan, finishing onboarding)
      // to re-run the _app.jsx loader and refresh the shared shop data.
      refreshShop: () => revalidator.revalidate(),
    }),
    [shop, revalidator],
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
