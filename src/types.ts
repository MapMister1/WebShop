export type Money = number;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: Money | null;
  inventory: number;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  short_description: string;
  category_id: string | null;
  category_name?: string | null;
  price: Money;
  compare_at_price: Money | null;
  currency: string;
  sku: string;
  status: string;
  featured: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface CartItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface CartLine {
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface CartQuote {
  lines: CartLine[];
  subtotal: Money;
  shipping: Money;
  discount: Money;
  total: Money;
  currency: string;
}

export interface OrderSummary {
  order_number: string;
  email: string;
  total: Money;
  currency: string;
  shipping_name: string | null;
  shipping_address: string | null;
  items: Array<{ title: string; variant_name: string | null; quantity: number; unit_price: Money }>;
}
