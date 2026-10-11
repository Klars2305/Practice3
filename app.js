// Fixed menu data for the cafeteria counter.
const PRODUCTS = [
  { id: 'rice', name: 'Rice (Plain)', price: 15, icon: '🍚', tone: '#f6f0e5' },
  { id: 'chicken', name: 'Fried Chicken (1 pc)', price: 65, icon: '🍗', tone: '#fbefe4' },
  { id: 'adobo', name: 'Pork Adobo', price: 60, icon: '🍲', tone: '#f3ece7' },
  { id: 'vegetable', name: 'Vegetable Side Dish', price: 35, icon: '🥗', tone: '#eaf3e9' },
  { id: 'iced-tea', name: 'Iced Tea (cup)', price: 20, icon: '🧋', tone: '#f5ede7' },
  { id: 'water', name: 'Bottled Water', price: 20, icon: '💧', tone: '#e9f2f6' },
];

const productList = document.querySelector('#product-list');
const cartItems = document.querySelector('#cart-items');
const orderTotal = document.querySelector('#order-total');
const cart = new Map();
const money = (amount) => `₱${amount.toFixed(2)}`;

function renderCart() {
  const entries = [...cart.values()];
  cartItems.replaceChildren();
  cartItems.classList.toggle('has-items', entries.length > 0);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-cart';
    empty.innerHTML = '<div class="empty-icon" aria-hidden="true">＋</div><h3>Your order is empty</h3><p>Select an item from the menu to add it here.</p>';
    cartItems.append(empty);
    orderTotal.textContent = money(0);
    return;
  }

  let total = 0;
  for (const { product, quantity } of entries) {
    const subtotal = product.price * quantity;
    total += subtotal;

    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-row-top">
        <div><div class="cart-item-name"></div><div class="cart-unit-price"></div></div>
        <div class="cart-subtotal"></div>
      </div>
      <div class="cart-row-bottom">
        <div class="quantity-controls" aria-label="Quantity controls">
          <button class="quantity-button decrease-button" type="button" aria-label="Decrease quantity">−</button>
          <span class="quantity-value" aria-live="polite"></span>
          <button class="quantity-button increase-button" type="button" aria-label="Increase quantity">+</button>
        </div>
        <button class="remove-button" type="button">Remove</button>
      </div>
    `;
    row.querySelector('.cart-item-name').textContent = product.name;
    row.querySelector('.cart-unit-price').textContent = `${money(product.price)} each`;
    row.querySelector('.cart-subtotal').textContent = money(subtotal);
    row.querySelector('.quantity-value').textContent = quantity;
    row.querySelector('.increase-button').addEventListener('click', () => changeQuantity(product.id, 1));
    row.querySelector('.decrease-button').addEventListener('click', () => changeQuantity(product.id, -1));
    row.querySelector('.remove-button').addEventListener('click', () => removeItem(product.id));
    cartItems.append(row);
  }
  orderTotal.textContent = money(total);
}

function addToCart(product) {
  const existing = cart.get(product.id);
  cart.set(product.id, { product, quantity: (existing?.quantity ?? 0) + 1 });
  renderCart();
}

function changeQuantity(productId, amount) {
  const entry = cart.get(productId);
  if (!entry) return;
  const nextQuantity = entry.quantity + amount;
  if (nextQuantity <= 0) cart.delete(productId);
  else cart.set(productId, { ...entry, quantity: nextQuantity });
  renderCart();
}

function removeItem(productId) {
  cart.delete(productId);
  renderCart();
}

// Keeping the menu data in one array makes prices easy to review and reuse.
for (const product of PRODUCTS) {
  const button = document.createElement('button');
  button.className = 'product-card';
  button.type = 'button';
  button.setAttribute('aria-label', `${product.name}, ₱${product.price.toFixed(2)}`);
  button.innerHTML = `
    <span class="product-visual" style="--tone: ${product.tone}" aria-hidden="true">${product.icon}</span>
    <span class="product-name"></span>
    <span class="product-price"></span>
  `;
  button.querySelector('.product-name').textContent = product.name;
  button.querySelector('.product-price').textContent = `₱${product.price.toFixed(2)}`;
  button.addEventListener('click', () => addToCart(product));
  productList.append(button);
}

renderCart();
