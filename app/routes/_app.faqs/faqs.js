// The FAQ content shown on /faqs, kept here so the page component stays pure
// layout. Each answer is a list of paragraphs plus an optional bullet list and
// a closing paragraph — enough structure for the "why isn't the form showing"
// style answers without putting markup in the data.
//
// Everything here describes behaviour that exists in the app today: the
// deadline rules come from services/withdrawal-deadline.server.js, the
// automation choices from routes/_app.form-setup/constants.js, and the email
// list from services/email/registry.js. Change those and change these.

export const FAQS = [
  {
    id: "what-it-does",
    question: "What does this app do?",
    paragraphs: [
      "It gives your EU customers a proper right-of-withdrawal form, and gives you one place to handle what comes out of it.",
      "Customers open the form from their order, pick the items they want to withdraw from, and confirm. Every submission lands in Withdrawal Requests with the order, the items, the reason and the refund deadline attached, and the emails around it go out on their own.",
    ],
  },
  {
    id: "where-form-appears",
    question: "Where do customers see the withdrawal form?",
    paragraphs: [
      "There are two placements, and you can use either one or both. Pick them in Form Setup:",
    ],
    bullets: [
      "Order status page — the page a customer lands on after checkout, and the one they reach again from their order confirmation email.",
      "Standalone storefront page — a dedicated page in your theme, for customers who come looking for it later.",
    ],
    closing:
      "Turning a placement on in Form Setup is only half of it: each one also needs its app block added once in the theme editor. The setup guide on Home tracks whether that has been done and links you straight there.",
  },
  {
    id: "form-not-showing",
    question: "A customer says the form isn't showing. What should I check?",
    paragraphs: ["Work down this list — it's roughly in order of how often each one is the cause:"],
    bullets: [
      "The form's master toggle is off, or the placement they're using isn't enabled (Form Setup).",
      "The app block hasn't been added to that surface in the theme editor yet.",
      "The order's country isn't in your eligible list — check whether you're set to all EU countries or to a specific few.",
      "The withdrawal window has already closed for that order (see the deadline question below).",
      "The order was cancelled, or a request for it is already open — only one open request per order is allowed.",
    ],
  },
  {
    id: "deadline",
    question: "How is the withdrawal deadline worked out?",
    paragraphs: [
      "Under the EU consumer rights directive the withdrawal period runs from the day the goods are received, not the day they were ordered — and a customer may withdraw at any point before they receive them. The app follows exactly that:",
    ],
    bullets: [
      "Not fulfilled yet — the window hasn't started, so the order is always eligible.",
      "Delivered, with a delivery date from the carrier — the window runs from that date plus your days-after-delivery setting (14 by default).",
      "Shipped, but no delivery date reported — the carrier's own delivery estimate is used, and failing that the ship date plus your estimated transit days.",
    ],
    closing:
      "With a split shipment the window counts from the last parcel, so it can't close before everything has landed.",
  },
  {
    id: "transit-days",
    question: "What is the estimated transit days setting for?",
    paragraphs: [
      "Plenty of carriers never report a delivery date back to Shopify. Without one there's nothing to count the 14 days from, so the app falls back to the ship date plus the transit days you set here.",
      "Set it to roughly how long your parcels normally take to arrive. Setting it too low closes a customer's window early, so when in doubt be generous.",
    ],
  },
  {
    id: "countries-languages",
    question: "Which countries and languages are covered?",
    paragraphs: [
      "Every EU country is eligible by default. If you only sell into a few, switch to the specific-countries mode in Form Setup and pick them.",
      "The form ships in 11 languages: English, German, French, Dutch, Italian, Spanish, Polish, Swedish, Portuguese, Lithuanian and Finnish. It follows the buyer's own language automatically.",
      "English is the base. Anything you leave blank in a translation falls back to the English wording field by field, so a half-finished translation never shows an empty label to a customer.",
    ],
  },
  {
    id: "after-submit",
    question: "What happens right after a customer submits?",
    paragraphs: ["Four things, in this order:"],
    bullets: [
      "The request is saved as Pending and appears in Withdrawal Requests.",
      "The customer gets a confirmation email. That one always sends — it's the legal acknowledgement of their withdrawal.",
      "You get a notification email, if you've turned that template on.",
      "Your automation rules run, holding fulfillment or tagging the order depending on what you've set up.",
    ],
  },
  {
    id: "automation",
    question: "What do the automation settings actually do?",
    paragraphs: [
      "They split by where the order is when the request arrives, because the two situations allow very different things.",
    ],
    bullets: [
      "Before the order ships — fulfillment can be held so the parcel doesn't go out while you review it, with a fallback if nobody acts within the number of days you set. You can tag the order too.",
      "After delivery — the goods are already with the customer, so holding fulfillment isn't an option. You get a notification, and can tag the order.",
    ],
    closing: "Automation never decides a request for you: approving, rejecting and refunding stay manual.",
  },
  {
    id: "emails",
    question: "Which emails does the app send, and can I edit them?",
    paragraphs: ["Four templates, all editable under Email Templates:"],
    bullets: [
      "Customer withdrawal confirmation — sent on submission, and always on.",
      "New request notification — sent to you, optional.",
      "Withdrawal approved — sent to the customer when you approve, optional.",
      "Withdrawal rejected — sent to the customer when you reject, optional.",
    ],
    closing:
      "You can rewrite the subject and body of any of them, in any supported language, and drop in variables like the order number, the customer's name or the requested items. The live preview beside the editor shows the result as you type.",
  },
  {
    id: "approve-reject",
    question: "How do I approve, reject and refund a request?",
    paragraphs: [
      "Open the request from Withdrawal Requests. The detail page carries everything you need: the items the customer picked, their reason, the order's state in Shopify, and your own notes.",
      "Approve or reject it there. You can then refund the requested items, or cancel and refund the whole order, without leaving the page.",
      "The refund deadline sits at the top and counts from the moment the request was submitted — refunds are due within 14 days of the withdrawal under EU rules, so the page keeps showing how long is left and flags it clearly once that date has passed.",
    ],
  },
];
