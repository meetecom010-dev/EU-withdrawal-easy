import connectDB from "../db.server";
import Shop from "../models/shop.server";

// Called from the afterAuth hook whenever a shop installs or re-authenticates.
export async function upsertShopOnInstall(shop) {
  await connectDB();
  await Shop.findOneAndUpdate(
    { shop },
    { $setOnInsert: { shop }, $set: { isActive: true, uninstalledAt: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

// Called from the app/uninstalled webhook.
export async function markShopUninstalled(shop) {
  await connectDB();
  await Shop.findOneAndUpdate(
    { shop },
    { $set: { isActive: false, uninstalledAt: new Date() } },
  );
}

// Returns the shop doc, creating a default one if it doesn't exist yet so
// callers always get a predictable shape.
export async function getOrCreateShop(shop) {
  await connectDB();
  const doc = await Shop.findOneAndUpdate(
    { shop },
    { $setOnInsert: { shop } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc;
}
