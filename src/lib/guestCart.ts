export const GUEST_CART_KEY = "guest_cart_items";

export type GuestCartItem = {
  id: number;
  productId: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  quantity: number;
};

function safeParse(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getGuestCartItems(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(GUEST_CART_KEY));
}

export function saveGuestCartItems(items: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("guest-cart-updated"));
}

export function getGuestCartCount() {
  return getGuestCartItems().reduce((sum, item) => sum + item.quantity, 0);
}

export function getGuestCartTotal() {
  return getGuestCartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function addGuestCartItem(item: Omit<GuestCartItem, "id">) {
  const existingItems = getGuestCartItems();
  const existing = existingItems.find((cartItem) => cartItem.productId === item.productId);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    existingItems.push({ ...item, id: item.productId });
  }

  saveGuestCartItems(existingItems);
}

export function updateGuestCartItem(productId: number, quantity: number) {
  const items = getGuestCartItems();
  const updated = items.map((item) =>
    item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
  );
  saveGuestCartItems(updated);
  return updated;
}

export function removeGuestCartItem(productId: number) {
  const items = getGuestCartItems().filter((item) => item.productId !== productId);
  saveGuestCartItems(items);
  return items;
}

export function clearGuestCart() {
  saveGuestCartItems([]);
}
