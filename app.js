// Fixed sample menu. All prices are stored in pesos and transactions stay in memory.
const PRODUCTS = [
  { id: 'rice', name: 'Rice (Plain)', price: 15, icon: '\u{1F35A}', tone: '#f6f0e5' },
  { id: 'chicken', name: 'Fried Chicken (1 pc)', price: 65, icon: '\u{1F357}', tone: '#fbefe4' },
  { id: 'adobo', name: 'Pork Adobo', price: 60, icon: '\u{1F372}', tone: '#f3ece7' },
  { id: 'vegetable', name: 'Vegetable Side Dish', price: 35, icon: '\u{1F957}', tone: '#eaf3e9' },
  { id: 'iced-tea', name: 'Iced Tea (cup)', price: 20, icon: '\u{1F9CB}', tone: '#f5ede7' },
  { id: 'water', name: 'Bottled Water', price: 20, icon: '\u{1F4A7}', tone: '#e9f2f6' },
];

const productList = document.querySelector('#product-list');
const cartItems = document.querySelector('#cart-items');
const orderTotal = document.querySelector('#order-total');
const cashInput = document.querySelector('#cash-input');
const paymentHint = document.querySelector('#payment-hint');
const checkoutButton = document.querySelector('#checkout-button');
const newTransactionButton = document.querySelector('#new-transaction');
const confirmation = document.querySelector('#payment-confirmation');
const receipt = document.querySelector('#receipt');
const receiptReference = document.querySelector('#receipt-reference');
const receiptLines = document.querySelector('#receipt-lines');
const receiptSummary = document.querySelector('#receipt-summary');
const cart = new Map();
let completedTransaction = null;
let transactionSequence = 1;

const money = (amount) => `\u20B1${amount.toFixed(2)}`;

function renderCart() {
  const entries = [...cart.values()];
  cartItems.replaceChildren();
  cartItems.classList.toggle('has-items', entries.length > 0);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-cart';
    empty.innerHTML = '<div class="empty-icon" aria-hidden="true">&#43;</div><h3>Your order is empty</h3><p>Select an item from the menu to add it here.</p>';
    cartItems.append(empty);
    orderTotal.textContent = money(0);
  } else {
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
            <button class="quantity-button decrease-button" type="button" aria-label="Decrease quantity">&#8722;</button>
            <span class="quantity-value" aria-live="polite"></span>
            <button class="quantity-button increase-button" type="button" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-button" type="button">Remove</button>
        </div>`;
      row.querySelector('.cart-item-name').textContent = product.name;
      row.querySelector('.cart-unit-price').textContent = `${money(product.price)} each`;
      row.querySelector('.cart-subtotal').textContent = money(subtotal);
      row.querySelector('.quantity-value').textContent = quantity;
      row.querySelectorAll('button').forEach((button) => { button.disabled = Boolean(completedTransaction); });
      row.querySelector('.increase-button').addEventListener('click', () => changeQuantity(product.id, 1));
      row.querySelector('.decrease-button').addEventListener('click', () => changeQuantity(product.id, -1));
      row.querySelector('.remove-button').addEventListener('click', () => removeItem(product.id));
      cartItems.append(row);
    }
    orderTotal.textContent = money(total);
  }

  const hasItems = entries.length > 0;
  cashInput.disabled = !hasItems || Boolean(completedTransaction);
  checkoutButton.disabled = !hasItems || Boolean(completedTransaction);
  newTransactionButton.disabled = !hasItems && !completedTransaction;
  productList.querySelectorAll('.product-card').forEach((button) => {
    button.disabled = Boolean(completedTransaction);
  });
  paymentHint.textContent = hasItems
    ? 'Enter the exact cash amount received. Change will be calculated after confirmation.'
    : 'Payment will be available after adding items.';
}

function addToCart(product) {
  if (completedTransaction) return;
  const existing = cart.get(product.id);
  cart.set(product.id, { product, quantity: (existing?.quantity ?? 0) + 1 });
  paymentHint.textContent = 'Enter the cash amount received.';
  renderCart();
}

function changeQuantity(productId, amount) {
  const entry = cart.get(productId);
  if (!entry || completedTransaction) return;
  const nextQuantity = entry.quantity + amount;
  if (nextQuantity <= 0) cart.delete(productId);
  else cart.set(productId, { ...entry, quantity: nextQuantity });
  renderCart();
}

function removeItem(productId) {
  if (completedTransaction) return;
  cart.delete(productId);
  renderCart();
}

function showPaymentError(message) {
  paymentHint.textContent = message;
  paymentHint.classList.add('payment-error');
  cashInput.setAttribute('aria-invalid', 'true');
}

function validatePayment() {
  const raw = cashInput.value.trim();
  if (cashInput.validity.badInput || (raw !== '' && !/^-?\d+(\.\d{1,2})?$/.test(raw))) {
    showPaymentError('Enter a valid number, such as 200 or 200.00.');
    return null;
  }
  if (raw === '') {
    showPaymentError('Enter the cash amount received.');
    cashInput.focus();
    return null;
  }
  const paid = Number(raw);
  if (!Number.isFinite(paid)) {
    showPaymentError('Enter a valid numeric payment amount.');
    return null;
  }
  if (paid < 0) {
    showPaymentError('Payment cannot be negative.');
    return null;
  }
  const total = [...cart.values()].reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  if (paid < total) {
    showPaymentError(`Insufficient payment. The total is ${money(total)}.`);
    return null;
  }
  return { paid, total };
}

function renderReceipt(transaction) {
  receiptReference.textContent = transaction.reference;
  receiptLines.replaceChildren();
  for (const { product, quantity } of transaction.items) {
    const line = document.createElement('div');
    line.className = 'receipt-line';
    const details = document.createElement('span');
    details.textContent = `${product.name} x ${quantity}`;
    const amount = document.createElement('strong');
    amount.textContent = money(product.price * quantity);
    line.append(details, amount);
    receiptLines.append(line);
  }
  receiptSummary.innerHTML = `
    <div><span>Total</span><strong>${money(transaction.total)}</strong></div>
    <div><span>Amount paid</span><strong>${money(transaction.paid)}</strong></div>
    <div class="change-row"><span>Change</span><strong>${money(transaction.change)}</strong></div>`;
  receipt.hidden = false;
}

function confirmPayment() {
  if (completedTransaction) return;
  paymentHint.classList.remove('payment-error');
  cashInput.removeAttribute('aria-invalid');
  const payment = validatePayment();
  if (!payment) return;

  const reference = `CAF-${String(transactionSequence).padStart(4, '0')}`;
  transactionSequence += 1;
  completedTransaction = {
    ...payment,
    change: payment.paid - payment.total,
    reference,
    items: [...cart.values()].map((entry) => ({ ...entry })),
  };
  confirmation.textContent = `Payment confirmed. Change due: ${money(completedTransaction.change)}.`;
  confirmation.hidden = false;
  renderReceipt(completedTransaction);
  renderCart();
}

function startNewTransaction() {
  cart.clear();
  completedTransaction = null;
  cashInput.value = '';
  cashInput.removeAttribute('aria-invalid');
  paymentHint.classList.remove('payment-error');
  confirmation.textContent = '';
  confirmation.hidden = true;
  receipt.hidden = true;
  receiptLines.replaceChildren();
  receiptSummary.replaceChildren();
  renderCart();
}

for (const product of PRODUCTS) {
  const button = document.createElement('button');
  button.className = 'product-card';
  button.type = 'button';
  button.setAttribute('aria-label', `${product.name}, ${money(product.price)}`);
  button.innerHTML = `
    <span class="product-visual" style="--tone: ${product.tone}" aria-hidden="true">${product.icon}</span>
    <span class="product-name"></span>
    <span class="product-price"></span>`;
  button.querySelector('.product-name').textContent = product.name;
  button.querySelector('.product-price').textContent = money(product.price);
  button.addEventListener('click', () => addToCart(product));
  productList.append(button);
}

cashInput.addEventListener('input', () => {
  paymentHint.classList.remove('payment-error');
  cashInput.removeAttribute('aria-invalid');
});
cashInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !checkoutButton.disabled) confirmPayment();
});
checkoutButton.addEventListener('click', confirmPayment);
newTransactionButton.addEventListener('click', startNewTransaction);
document.querySelector('#print-receipt').addEventListener('click', () => window.print());
renderCart();
