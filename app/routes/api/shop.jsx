import { authenticate } from "../../shopify.server";
import { getRequestT } from "../../i18n/server";
import connectDB from "../../db.server";
import Shop from "../../models/shop.server";
import { getOrCreateShop } from "../../services/shop.server";

// The plan is not writable here: billing is Shopify App Pricing, so the
// merchant's plan is only ever synced from Shopify
// (services/subscription.server.js), never taken from the client.
const ALLOWED_SHOP_FIELDS = [
  "onboardingCompleted",
  "orderStatusBlockAdded",
  "themeBlockAdded",
];

// GET /api/shop -> current shop details + pricing plan
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  return Response.json({ shop });
};

// PUT/PATCH /api/shop -> update onboarding / extension status flags
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  await connectDB();

  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json();
    const update = {};
    for (const field of ALLOWED_SHOP_FIELDS) {
      if (body?.[field] !== undefined) {
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return Response.json(
        { error: getRequestT(request)("errors.noValidFields") },
        { status: 400 },
      );
    }

    const shop = await Shop.findOneAndUpdate(
      { shop: session.shop },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return Response.json({ shop });
  }

  return Response.json({ error: getRequestT(request)("errors.methodNotAllowed") }, { status: 405 });
};
