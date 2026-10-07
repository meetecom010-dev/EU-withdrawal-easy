import { adminQuery } from "./client.server";

// The merchant's contact email, used as the recipient for "Notify only"
// alerts. Not stored locally on purpose — a shop that changes its contact
// address in Shopify should start receiving alerts there without this app
// needing to notice.
const SHOP_CONTACT_QUERY = `#graphql
  query WithdrawalShopContact {
    shop {
      name
      email
    }
  }
`;

const SHOP_GID_QUERY = `#graphql
  query ShopGid {
    shop {
      id
    }
  }
`;

export async function fetchShopGid(admin) {
  const data = await adminQuery(admin, { operation: "ShopGid", query: SHOP_GID_QUERY });
  return data.shop?.id ?? null;
}

export async function fetchShopContact(admin) {
  const data = await adminQuery(admin, {
    operation: "WithdrawalShopContact",
    query: SHOP_CONTACT_QUERY,
  });
  return data.shop ?? null;
}
