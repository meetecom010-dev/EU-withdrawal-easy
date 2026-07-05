const LAW_ITEMS = [
  {
    icon: "check-circle-filled",
    tone: "success",
    text: "A clearly labeled, always-available withdrawal button on the order status page",
  },
  {
    icon: "arrow-right",
    tone: "info",
    text: "A two-step flow: submit intent to withdraw, then a separate explicit confirmation",
  },
  {
    icon: "envelope",
    tone: "info",
    text: "An automatic confirmation email sent on a durable medium",
  },
];

export default function WelcomeStep() {
  return (
    <s-stack direction="block" gap="large-100">
      <s-stack direction="block" gap="small-200">

        <s-grid gridTemplateColumns="1fr 150px" gap="large-500">
          <s-stack gap="base">
            <s-stack direction="block" gap="small-500">
              <s-heading>Welcome to EU Withdrawal 👋</s-heading>
              <s-badge tone="success">Setup takes about 1 minutes</s-badge>
            </s-stack>
            <s-paragraph color="subdued">
              From 19 June 2026, EU Directive 2023/2673 (Article 11a CRD)
              requires any store selling to EU consumers to provide a
              dedicated, two-step withdrawal function on every order — not just
              a general returns policy.
            </s-paragraph>
            <s-paragraph color="subdued">
              This app adds that withdrawal button to your customers&rsquo;
              order status page, handles the required two-step confirmation, sends
              the mandatory confirmation email, and gives you a dashboard to
              manage incoming requests.
            </s-paragraph>
          </s-stack>
          <s-stack>
            <s-image
              src="https://cdn.shopify.com/s/files/1/0644/8149/3130/files/onboarding-image.png?v=1783251888"
              alt="welcome image"
              aspectRatio="1/1"
              objectFit="cover"
              borderRadius="base"
              inlineSize="fill"
            />
          </s-stack>
        </s-grid>
      </s-stack>
      <s-divider></s-divider>
      <s-stack direction="block" gap="small-200">
        <s-heading>What the law requires</s-heading>
        <s-stack direction="block" gap="small-200">
          {LAW_ITEMS.map((item) => (
            <s-stack key={item.text} direction="inline" gap="small-200" alignItems="center">
              <s-icon type={item.icon} tone={item.tone}></s-icon>
              <s-text>{item.text}</s-text>
            </s-stack>
          ))}
        </s-stack>
      </s-stack>
      <s-banner heading="Non-compliance penalty" tone="warning">
        <s-paragraph>
          If the withdrawal function is missing or broken, the standard
          14-day withdrawal period automatically extends to 12 months and 14
          days for every affected order.
        </s-paragraph>
      </s-banner>
    </s-stack>
  );
}
