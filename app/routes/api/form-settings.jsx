import { authenticate } from "../../shopify.server";

// Dummy in-memory store (resets on server restart) until a real
// FormSettings model exists — same request/response shape as /api/shop.
let formSettings = {
  fields: ["Order number", "Email", "Reason"],
  reasons: ["Changed my mind", "Wrong size", "Item defective", "Arrived late"],
};

// GET /api/form-settings -> current withdrawal form configuration
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return Response.json({ formSettings });
};

// PUT/PATCH /api/form-settings -> update fields/reasons
export const action = async ({ request }) => {
  await authenticate.admin(request);

  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await request.json();
    formSettings = { ...formSettings, ...body };
    return Response.json({ formSettings });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
