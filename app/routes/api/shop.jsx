import { authenticate } from "../../shopify.server";
import connectDB from "../../db.server";
import Shop from "../../models/shop.server";
import { getOrCreateShop } from "../../services/shop.server";

const ALLOWED_PLAN_FIELDS = ["name", "price", "currency", "interval"];

// GET /api/shop -> current shop details + pricing plan
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  return Response.json({ shop });
};

// PUT/PATCH /api/shop -> update the plan
// DELETE /api/shop -> reset the plan back to Free
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  await connectDB();

  if (request.method === "DELETE") {
    const shop = await Shop.findOneAndUpdate(
      { shop: session.shop },
      { $set: { plan: {} } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return Response.json({ shop });
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json();
    const planUpdate = {};
    for (const field of ALLOWED_PLAN_FIELDS) {
      if (body?.[field] !== undefined) {
        planUpdate[`plan.${field}`] = body[field];
      }
    }

    if (Object.keys(planUpdate).length === 0) {
      return Response.json(
        { error: "No valid plan fields provided" },
        { status: 400 },
      );
    }

    const shop = await Shop.findOneAndUpdate(
      { shop: session.shop },
      { $set: planUpdate },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return Response.json({ shop });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
