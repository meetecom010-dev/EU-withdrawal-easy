// Helpers for showing a request's withdrawn items at the quantity an action
// actually covers (a return, a refund), as reported by the server's preview.

// A request item at a different quantity. The stored price is the line's total,
// so it's scaled with the quantity when that differs (e.g. 2 withdrawn, only 1
// shipped).
export function atQuantity(item, quantity) {
  if (quantity === item.quantity || !item.price || !item.quantity) {
    return { ...item, quantity };
  }
  return {
    ...item,
    quantity,
    price: { ...item.price, amount: (item.price.amount * quantity) / item.quantity },
  };
}

// [{ lineId, quantity }] from a preview -> full request items at those quantities.
export function resolveItems(items, entries) {
  return (entries ?? [])
    .map((entry) => {
      const item = items.find((candidate) => candidate.lineId === entry.lineId);
      return item ? atQuantity(item, entry.quantity) : null;
    })
    .filter(Boolean);
}

export function countUnits(entries) {
  return (entries ?? []).reduce((sum, entry) => sum + entry.quantity, 0);
}
