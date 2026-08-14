import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { adminApi, beginCheckout, getCategories, getProduct, getProducts, getSuccess, sendContact } from './lib/api';
import { track } from './lib/analytics';
import { useCart } from './lib/cart';
import { discountPercent, formatMoney } from './lib/format';
import type { CartLine, Category, OrderSummary, Product, ProductVariant } from './types';

function Layout() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const nav = (
    <>
      <NavLink to="/shop">Shop</NavLink>
      <NavLink to="/shop?category=chains">Chains</NavLink>
      <NavLink to="/shop?category=rings">Rings</NavLink>
      <NavLink to="/about">About</NavLink>
      <NavLink to="/contact">Contact</NavLink>
    </>
  );
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">Atelier Supply</Link>
        <nav className="desktop-nav">{nav}</nav>
        <div className="header-actions">
          <Link to="/cart" className="cart-link">Cart ({cart.count})</Link>
          <button className="icon-button" aria-label="Open navigation" onClick={() => setOpen(!open)}>Menu</button>
        </div>
        {open && <nav className="mobile-nav" onClick={() => setOpen(false)}>{nav}</nav>}
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<Success />} />
          <Route path="/about" element={<StaticPage kind="about" />} />
          <Route path="/shipping" element={<StaticPage kind="shipping" />} />
          <Route path="/returns" element={<StaticPage kind="returns" />} />
          <Route path="/privacy" element={<StaticPage kind="privacy" />} />
          <Route path="/terms" element={<StaticPage kind="terms" />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export function App() {
  return <Layout />;
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <h2>Atelier Supply</h2>
        <p>Minimal jewelry and finishing pieces selected for everyday styling.</p>
        <p className="fine-print">Some products may be sourced from third-party marketplaces or suppliers and fulfilled through external partners.</p>
      </div>
      <nav>
        <Link to="/shipping">Shipping</Link>
        <Link to="/returns">Returns</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/admin">Admin</Link>
      </nav>
    </footer>
  );
}

function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    void Promise.all([getProducts('?sort=featured&limit=8'), getCategories()]).then(([p, c]) => {
      setProducts(p.products);
      setCategories(c.categories);
    });
  }, []);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p>Chains, jewelry, accessories</p>
          <h1>Everyday finishing pieces with a clean, modern point of view.</h1>
          <Link className="button primary" to="/shop">Shop collection</Link>
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>Featured</h2>
          <Link to="/shop?sort=featured">View all</Link>
        </div>
        <ProductGrid products={products.filter((p) => p.featured).slice(0, 4)} />
      </section>
      <section className="section two-column">
        <div>
          <h2>New arrivals</h2>
          <ProductGrid products={products.slice(0, 4)} compact />
        </div>
        <div>
          <h2>Shop categories</h2>
          <div className="category-list">
            {categories.map((category) => <Link key={category.id} to={`/shop?category=${category.slug}`}>{category.name}</Link>)}
          </div>
          <p className="intro">The catalog is editable in the admin dashboard, including materials, shipping copy, supplier notes, costs, imagery, variants, and policy text.</p>
        </div>
      </section>
    </>
  );
}

function Shop() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const page = Number(params.get('page') ?? '1');
  useEffect(() => {
    setLoading(true);
    void Promise.all([getProducts(`?${params.toString()}`), getCategories()])
      .then(([p, c]) => {
        setProducts(p.products);
        setTotal(p.total);
        setCategories(c.categories);
      })
      .finally(() => setLoading(false));
  }, [params]);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setParams(next);
  };
  return (
    <section className="section shop-layout">
      <aside className="filters">
        <h1>Shop</h1>
        <input placeholder="Search" value={params.get('q') ?? ''} onChange={(e) => set('q', e.target.value)} />
        <select value={params.get('category') ?? ''} onChange={(e) => set('category', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
        <div className="price-row">
          <input type="number" placeholder="Min" value={params.get('min') ?? ''} onChange={(e) => set('min', e.target.value)} />
          <input type="number" placeholder="Max" value={params.get('max') ?? ''} onChange={(e) => set('max', e.target.value)} />
        </div>
        <select value={params.get('sort') ?? 'featured'} onChange={(e) => set('sort', e.target.value)}>
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
        </select>
      </aside>
      <div>
        {loading ? <div className="skeleton-grid" /> : <ProductGrid products={products} />}
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</button>
          <span>Page {page} of {Math.max(1, Math.ceil(total / 12))}</span>
          <button disabled={page >= Math.ceil(total / 12)} onClick={() => set('page', String(page + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  if (!products.length) return <p className="empty">No products found.</p>;
  return (
    <div className={compact ? 'product-grid compact' : 'product-grid'}>
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discount = discountPercent(product.price, product.compare_at_price);
  return (
    <Link className="product-card" to={`/products/${product.slug}`}>
      <img src={product.images[0]?.image_url ?? '/placeholder.svg'} alt={product.images[0]?.alt_text ?? product.title} loading="lazy" />
      <div className="product-meta">
        <h3>{product.title}</h3>
        <p>{product.short_description}</p>
        <div className="price">
          <span>{formatMoney(product.price, product.currency)}</span>
          {product.compare_at_price && <s>{formatMoney(product.compare_at_price, product.currency)}</s>}
          {discount && <em>{discount}% off</em>}
        </div>
      </div>
    </Link>
  );
}

function ProductPage() {
  const { slug = '' } = useParams();
  const cart = useCart();
  const navigate = useNavigate();
  const [data, setData] = useState<{ product: Product; related: Product[] } | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const product = data?.product;
  const variant = product?.variants.find((v) => v.id === variantId) ?? null;
  useEffect(() => {
    void getProduct(slug).then((next) => {
      setData(next);
      setVariantId(next.product.variants[0]?.id ?? null);
      track('product_view', { product_id: next.product.id, slug: next.product.slug });
      document.title = `${next.product.title} | Atelier Supply`;
    });
  }, [slug]);
  if (!product) return <section className="section"><p>Loading product...</p></section>;
  const activePrice = variant?.price ?? product.price;
  const inventory = variant?.inventory ?? product.variants.reduce((sum, v) => sum + v.inventory, 0);
  const add = () => {
    cart.add(product, variantId, qty);
    track('add_to_cart', { product_id: product.id, quantity: qty });
  };
  return (
    <section className="section product-page">
      <div className="gallery">
        {product.images.map((image) => <img key={image.id} src={image.image_url} alt={image.alt_text} />)}
      </div>
      <div className="product-detail">
        <p>{product.category_name}</p>
        <h1>{product.title}</h1>
        <div className="price large"><span>{formatMoney(activePrice, product.currency)}</span>{product.compare_at_price && <s>{formatMoney(product.compare_at_price, product.currency)}</s>}</div>
        <p>{product.short_description}</p>
        <div className="rich-text" dangerouslySetInnerHTML={{ __html: product.description }} />
        {product.variants.length > 0 && (
          <label>Variant
            <select value={variantId ?? ''} onChange={(e) => setVariantId(e.target.value)}>
              {product.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
        )}
        <label>Quantity
          <input type="number" min="1" max="99" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </label>
        <p className={inventory > 0 ? 'stock' : 'stock out'}>{inventory > 0 ? 'Available' : 'Currently unavailable'}</p>
        <div className="button-row">
          <button className="button primary" disabled={inventory <= 0} onClick={add}>Add to cart</button>
          <button className="button" disabled={inventory <= 0} onClick={() => { add(); navigate('/checkout'); }}>Buy now</button>
        </div>
        <div className="info-box">
          <h2>Shipping and product information</h2>
          <p>Estimated delivery varies by destination and supplier processing. Tracking is provided when available. Product origin, exact materials, and delivery details are editable in the admin panel.</p>
          <p className="fine-print">This item may be sourced from a third-party marketplace or supplier.</p>
        </div>
      </div>
      <section className="related">
        <h2>Related products</h2>
        <ProductGrid products={data.related} compact />
      </section>
    </section>
  );
}

function Cart() {
  const cart = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    if (!cart.items.length) {
      setProducts([]);
      return;
    }
    void getProducts(`?ids=${cart.items.map((i) => i.productId).join(',')}&limit=50`).then((res) => setProducts(res.products));
  }, [cart.items]);
  const lines = useMemo(() => makeLines(cart.items, products), [cart.items, products]);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = subtotal > 0 ? 0 : 0;
  return (
    <section className="section">
      <h1>Your cart</h1>
      {!cart.items.length ? <p className="empty">Your cart is empty.</p> : (
        <>
          <div className="cart-lines">
            {lines.map((line) => (
              <div className="cart-line" key={`${line.product.id}-${line.variant?.id ?? 'default'}`}>
                <img src={line.product.images[0]?.image_url} alt={line.product.title} />
                <div>
                  <h2>{line.product.title}</h2>
                  <p>{line.variant?.name}</p>
                  <p>{formatMoney(line.unitPrice, line.product.currency)}</p>
                </div>
                <input type="number" min="1" value={line.quantity} onChange={(e) => cart.update(line.product.id, line.variant?.id ?? null, Number(e.target.value))} />
                <strong>{formatMoney(line.lineTotal, line.product.currency)}</strong>
                <button onClick={() => cart.remove(line.product.id, line.variant?.id ?? null)}>Remove</button>
              </div>
            ))}
          </div>
          <div className="summary">
            <p><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></p>
            <p><span>Estimated shipping</span><strong>{shipping === 0 ? 'Calculated at Stripe' : formatMoney(shipping)}</strong></p>
            <p><span>Total</span><strong>{formatMoney(subtotal + shipping)}</strong></p>
            <button className="button primary" onClick={() => navigate('/checkout')}>Checkout</button>
          </div>
        </>
      )}
    </section>
  );
}

function Checkout() {
  const cart = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const start = async () => {
    setLoading(true);
    setError('');
    try {
      track('begin_checkout', { items: cart.count });
      const res = await beginCheckout(cart.items, code || undefined);
      window.location.assign(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  };
  return (
    <section className="section checkout">
      <h1>Checkout</h1>
      <p>Payment and shipping details are handled securely by Stripe. Card information is never stored by this store.</p>
      <input placeholder="Discount code" value={code} onChange={(e) => setCode(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button className="button primary" disabled={!cart.items.length || loading} onClick={start}>{loading ? 'Opening Stripe...' : 'Continue to Stripe'}</button>
    </section>
  );
}

function Success() {
  const [params] = useSearchParams();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const sessionId = params.get('session_id');
    if (!sessionId) {
      setError('Missing checkout session.');
      return;
    }
    void getSuccess(sessionId).then((res) => {
      setOrder(res.order);
      track('purchase', { order_number: res.order.order_number, total: res.order.total });
    }).catch((err) => setError(err.message));
  }, [params]);
  return (
    <section className="section">
      <h1>Order confirmation</h1>
      {error && <p className="error">{error}</p>}
      {order && (
        <div className="summary wide">
          <p><span>Order</span><strong>{order.order_number}</strong></p>
          <p><span>Email</span><strong>{order.email}</strong></p>
          <p><span>Paid</span><strong>{formatMoney(order.total, order.currency)}</strong></p>
          <p><span>Ship to</span><strong>{order.shipping_name ?? 'Confirmed in Stripe'}</strong></p>
          <p>{order.shipping_address}</p>
          <h2>Items</h2>
          {order.items.map((item) => <p key={`${item.title}-${item.variant_name}`}>{item.quantity} x {item.title} {item.variant_name ? `(${item.variant_name})` : ''}</p>)}
          <p>Next step: the order will be reviewed for fulfillment and tracking will be added when available.</p>
        </div>
      )}
    </section>
  );
}

function Contact() {
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    try {
      await sendContact({ name: data.name, email: data.email, message: data.message, website: data.website });
      setState('sent');
      event.currentTarget.reset();
    } catch {
      setState('error');
    }
  };
  return (
    <section className="section narrow">
      <h1>Contact</h1>
      <form className="form" onSubmit={submit}>
        <input name="website" className="hidden-field" tabIndex={-1} autoComplete="off" />
        <label>Name<input name="name" required /></label>
        <label>Email<input type="email" name="email" required /></label>
        <label>Message<textarea name="message" required rows={6} /></label>
        <button className="button primary">Send</button>
      </form>
      {state === 'sent' && <p className="success">Message sent.</p>}
      {state === 'error' && <p className="error">Please try again in a moment.</p>}
    </section>
  );
}

function StaticPage({ kind }: { kind: string }) {
  const copy: Record<string, { title: string; body: string[] }> = {
    about: { title: 'About', body: ['Atelier Supply is a small fashion-accessories storefront focused on simple styling pieces.', 'Product descriptions, policies, and origin details are editable so claims can stay accurate as suppliers change.'] },
    shipping: { title: 'Shipping and Delivery', body: ['Orders require processing before shipment. Estimated delivery ranges vary by destination, supplier, carrier, and customs handling.', 'Tracking is provided when available. Customs, import charges, taxes, or local delivery fees may be charged by the destination country and are not guaranteed in advance.'] },
    returns: { title: 'Returns and Refunds', body: ['Return eligibility, time windows, and item condition requirements are managed by store policy and should be reviewed before purchase.', 'Refunds are processed only after payment confirmation and order review. Final policy text can be edited in the admin dashboard.'] },
    privacy: { title: 'Privacy Policy', body: ['The store collects information needed to process orders, provide customer support, prevent abuse, and comply with payment and tax obligations.', 'Payment card data is handled by Stripe and is not stored by this storefront.'] },
    terms: { title: 'Terms', body: ['By purchasing, you agree that product availability, delivery estimates, and supplier fulfillment details may vary.', 'The store does not imply affiliation with third-party brands unless explicitly stated and verifiable.'] }
  };
  return <section className="section narrow"><h1>{copy[kind].title}</h1>{copy[kind].body.map((p) => <p key={p}>{p}</p>)}</section>;
}

function Admin() {
  const [auth, setAuth] = useState(false);
  const [tab, setTab] = useState('dashboard');
  useEffect(() => { void adminApi.me().then((r) => setAuth(r.authenticated)); }, []);
  if (!auth) return <AdminLogin onAuth={() => setAuth(true)} />;
  return (
    <section className="section admin">
      <div className="admin-tabs">
        {['dashboard', 'products', 'orders', 'settings'].map((name) => <button key={name} onClick={() => setTab(name)} className={tab === name ? 'active' : ''}>{name}</button>)}
        <button onClick={() => adminApi.logout().then(() => setAuth(false))}>Logout</button>
      </div>
      {tab === 'dashboard' && <AdminDashboard />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'orders' && <AdminOrders />}
      {tab === 'settings' && <AdminSettings />}
    </section>
  );
}

function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    try {
      if (data.bootstrapKey) await adminApi.setup({ email: data.email, password: data.password, bootstrapKey: data.bootstrapKey });
      else await adminApi.login({ email: data.email, password: data.password });
      onAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };
  return (
    <section className="section narrow">
      <h1>Admin</h1>
      <form className="form" onSubmit={submit}>
        <label>Email<input type="email" name="email" required /></label>
        <label>Password<input type="password" name="password" minLength={12} required /></label>
        <label>Bootstrap key<input name="bootstrapKey" placeholder="Only for first admin setup" /></label>
        <button className="button primary">Continue</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function AdminDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { void adminApi.dashboard().then(setData); }, []);
  return <div><h1>Dashboard</h1><pre className="admin-pre">{JSON.stringify(data, null, 2)}</pre></div>;
}

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const load = () => void adminApi.products().then((r) => setProducts(r.products));
  useEffect(load, []);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    await adminApi.saveProduct({
      id: data.id || undefined,
      title: data.title,
      slug: data.slug,
      short_description: data.short_description,
      description: data.description,
      price: Math.round(Number(data.price) * 100),
      compare_at_price: data.compare_at_price ? Math.round(Number(data.compare_at_price) * 100) : null,
      cost_price: data.cost_price ? Math.round(Number(data.cost_price) * 100) : null,
      sku: data.sku,
      category_id: data.category_id || null,
      featured: data.featured === 'on',
      published: data.published === 'on',
      status: 'active',
      images: [{ image_url: data.image_url, alt_text: data.title, sort_order: 0 }],
      variants: [{ name: data.variant_name || 'Default', sku: data.variant_sku || data.sku, price: null, inventory: Number(data.inventory), attributes: {} }],
      supplier_name: data.supplier_name,
      supplier_product_url: data.supplier_product_url,
      supplier_product_id: data.supplier_product_id,
      supplier_cost: data.supplier_cost ? Math.round(Number(data.supplier_cost) * 100) : null,
      fulfillment_notes: data.fulfillment_notes
    });
    load();
    event.currentTarget.reset();
  };
  return (
    <div className="admin-grid">
      <form className="form" onSubmit={save}>
        <h1>Products</h1>
        <input name="id" placeholder="Existing product ID to update" />
        <input name="title" placeholder="Title" required />
        <input name="slug" placeholder="slug" required />
        <textarea name="short_description" placeholder="Short description" required />
        <textarea name="description" placeholder="Description HTML" rows={5} required />
        <input name="price" type="number" step="0.01" placeholder="Price" required />
        <input name="compare_at_price" type="number" step="0.01" placeholder="Compare-at price" />
        <input name="cost_price" type="number" step="0.01" placeholder="Internal cost" />
        <input name="sku" placeholder="SKU" required />
        <input name="category_id" placeholder="Category ID" />
        <input name="image_url" placeholder="Image URL" required />
        <input name="variant_name" placeholder="Variant name" />
        <input name="variant_sku" placeholder="Variant SKU" />
        <input name="inventory" type="number" placeholder="Inventory" required />
        <input name="supplier_name" placeholder="Internal supplier name" />
        <input name="supplier_product_url" placeholder="Internal supplier URL" />
        <input name="supplier_product_id" placeholder="Internal supplier product ID" />
        <input name="supplier_cost" type="number" step="0.01" placeholder="Internal supplier cost" />
        <textarea name="fulfillment_notes" placeholder="Internal fulfillment notes" />
        <label className="check"><input type="checkbox" name="featured" /> Featured</label>
        <label className="check"><input type="checkbox" name="published" defaultChecked /> Published</label>
        <button className="button primary">Save product</button>
      </form>
      <div>{products.map((p) => <div className="admin-row" key={p.id}><span>{p.title}</span><span>{p.sku}</span><button onClick={() => adminApi.deleteProduct(p.id).then(load)}>Delete</button></div>)}</div>
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<Array<Record<string, string | number>>>([]);
  const load = () => void adminApi.orders().then((r) => setOrders(r.orders as Array<Record<string, string | number>>));
  useEffect(load, []);
  return <div><h1>Orders</h1>{orders.map((o) => <div className="admin-row" key={String(o.id)}><span>{o.order_number}</span><span>{o.email}</span><span>{formatMoney(Number(o.total), String(o.currency))}</span><select defaultValue={String(o.fulfillment_status)} onChange={(e) => adminApi.updateOrder(String(o.id), { fulfillment_status: e.target.value }).then(load)}><option>unfulfilled</option><option>processing</option><option>shipped</option><option>delivered</option><option>cancelled</option></select></div>)}</div>;
}

function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  useEffect(() => { void adminApi.settings().then((r) => setSettings(r.settings)); }, []);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    await adminApi.saveSettings(data);
  };
  return <form className="form" onSubmit={save}><h1>Editable policy text</h1>{['shipping_policy', 'returns_policy', 'privacy_policy', 'terms_policy', 'product_disclosure'].map((key) => <label key={key}>{key}<textarea name={key} defaultValue={settings[key] ?? ''} rows={5} /></label>)}<button className="button primary">Save settings</button></form>;
}

function makeLines(items: Array<{ productId: string; variantId: string | null; quantity: number }>, products: Product[]): CartLine[] {
  return items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return [];
    const variant = product.variants.find((v) => v.id === item.variantId) ?? null;
    const unitPrice = variant?.price ?? product.price;
    return [{ product, variant, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity }];
  });
}
