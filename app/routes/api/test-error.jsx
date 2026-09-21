// Temporary route to verify the Slack error-alerting pipeline end-to-end.
// Safe to hit — throws before touching the DB or Shopify. Remove after
// confirming the alert arrives.
export const loader = async () => {
  throw new Error("Test error for Slack alerting verification");
};
