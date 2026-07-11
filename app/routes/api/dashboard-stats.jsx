import { authenticate } from "../../shopify.server";
import { getDashboardStats } from "../../services/withdrawal-request.server";

// GET /api/dashboard-stats -> summary tiles for app/routes/_app.home
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const stats = await getDashboardStats(session.shop);
  return Response.json({ stats });
};
