import { unauthenticated } from "../../shopify.server";

// Every automation call happens outside an admin request — a customer
// submitted the form, or cron fired — so there's no session to authenticate
// against. `unauthenticated.admin` is the supported way to reach the Admin API
// with the shop's stored offline token.
export function adminClientFor(shop) {
  return unauthenticated.admin(shop).then(({ admin }) => admin);
}

// Shopify reports failure two different ways and both have to be checked:
// transport/GraphQL `errors` at the top level, and per-mutation `userErrors`
// nested inside the payload, which come back with HTTP 200. Collapsing both
// into one thrown error means callers can't accidentally treat a rejected
// mutation as a success — the mistake that would silently skip a hold.
export class ShopifyApiError extends Error {
  constructor(message, { operation, userErrors = [], graphqlErrors = [] } = {}) {
    super(message);
    this.name = "ShopifyApiError";
    this.operation = operation;
    this.userErrors = userErrors;
    this.graphqlErrors = graphqlErrors;
  }

  // What gets written to the automation log — the merchant-facing "why didn't
  // this work" detail, without the stack.
  toLogData() {
    return {
      operation: this.operation,
      userErrors: this.userErrors,
      graphqlErrors: this.graphqlErrors.map((error) => error.message),
    };
  }
}

async function execute(admin, operation, query, variables) {
  const response = await admin.graphql(query, { variables });
  const body = await response.json();

  if (body.errors?.length) {
    throw new ShopifyApiError(
      `${operation} failed: ${body.errors.map((error) => error.message).join("; ")}`,
      { operation, graphqlErrors: body.errors },
    );
  }

  return body.data ?? {};
}

export async function adminQuery(admin, { operation, query, variables }) {
  return execute(admin, operation, query, variables);
}

// `userErrorKeys` exists because a few mutations expose more than one error
// list — orderCancel has both `userErrors` and `orderCancelUserErrors`, and
// only the latter carries the interesting codes.
export async function adminMutation(
  admin,
  { operation, query, variables, payloadKey, userErrorKeys = ["userErrors"] },
) {
  const data = await execute(admin, operation, query, variables);
  const payload = data[payloadKey];

  if (!payload) {
    throw new ShopifyApiError(`${operation} returned no ${payloadKey} payload`, { operation });
  }

  const userErrors = userErrorKeys.flatMap((key) => payload[key] ?? []);
  if (userErrors.length > 0) {
    throw new ShopifyApiError(
      `${operation} failed: ${userErrors.map((error) => error.message).join("; ")}`,
      { operation, userErrors },
    );
  }

  return payload;
}
