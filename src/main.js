import './style.css'
import { menuData } from './data.js'

// --- State ---
let currentCategory = menuData.categories[0].id;
let cart = [];
let customerInfo = {
  name: '',
  phone: '',
  deliveryTime: ''
};

// --- DOM Elements ---
const categoriesContainer = document.getElementById('categories-container');
const menuContainer = document.getElementById('menu-container');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const clearCartBtn = document.getElementById('clear-cart-btn');
const generateTicketBtn = document.getElementById('generate-ticket-btn');
const modalOverlay = document.getElementById('modal-overlay');

// --- Initialization ---
function init() {
  renderCategories();
  renderMenu();
  setupEventListeners();
  updateCartUI();
}

// --- Rendering ---

function renderCategories() {
  categoriesContainer.innerHTML = menuData.categories.map(cat => `
    <button 
      class="cat-btn px-6 py-2.5 rounded-full text-base font-bold uppercase tracking-wide whitespace-nowrap border border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white transition-all ${cat.id === currentCategory ? 'active' : ''}" 
      data-id="${cat.id}"
      style="--cat-color: ${cat.color}; --cat-color-alpha: ${cat.color}44"
    >
      ${cat.name}
    </button>
  `).join('');

  // Add event listeners to category buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.id;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMenu();
    });
  });
}

function renderMenu() {
  const category = menuData.categories.find(c => c.id === currentCategory);
  if (!category) return;

  menuContainer.innerHTML = category.items.map(item => `
    <div class="menu-item-card bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between group cursor-pointer animate-slide-up" data-item='${JSON.stringify(item)}'>
      <div class="flex justify-between items-start gap-4 mb-2">
        <div>
          <h3 class="font-black text-xl text-white group-hover:text-red-400 transition-colors">${item.name}</h3>
          ${item.description ? `<p class="text-xs text-slate-500 mt-1.5 leading-relaxed">${item.description}</p>` : ''}
        </div>
        <span class="font-black text-red-500 text-xl">Q${item.price.toFixed(0)}</span>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="add-btn bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-slate-300 transition-all hover:scale-110 active:scale-95 group-hover:bg-red-600 group-hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
        </button>
      </div>
    </div>
  `).join('');

  // Add click listeners to items
  document.querySelectorAll('.menu-item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const item = JSON.parse(card.dataset.item);
      openItemModal(item);
    });
  });
}

function updateCartUI() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-slate-600 opacity-50 space-y-4 animate-fade-in">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
        <p class="font-medium">Tu carrito está vacío</p>
      </div>
    `;
    cartTotalEl.textContent = 'Q0.00';
    clearCartBtn.classList.add('hidden');
    generateTicketBtn.disabled = true;
    return;
  }

  clearCartBtn.classList.remove('hidden');
  generateTicketBtn.disabled = false;

  let total = 0;
  cartItemsContainer.innerHTML = cart.map((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    return `
      <div class="bg-slate-800/80 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between gap-4 animate-slide-right">
        <div class="flex-1 min-w-0">
          <h4 class="font-black text-base text-white truncate">${item.name}</h4>
          ${item.description ? `<p class="text-sm text-slate-400 font-medium italic mt-0.5 line-clamp-2">${item.description}</p>` : ''}
          <p class="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider">${item.quantity} × Q${item.price.toFixed(2)}</p>
        </div>
        <div class="flex flex-col items-end gap-2 shrink-0">
          <span class="font-black text-red-500 text-base">Q${subtotal.toFixed(2)}</span>
          <button class="remove-cart-item text-slate-500 hover:text-red-500 transition-colors p-1" data-index="${index}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  cartTotalEl.textContent = `Q${total.toFixed(2)}`;

  // Remove listeners
  document.querySelectorAll('.remove-cart-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      cart.splice(index, 1);
      updateCartUI();
    });
  });
}

// --- Modals ---

function openItemModal(item) {
  let qty = 1;

  modalOverlay.innerHTML = `
    <div id="modal-content" class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in">
      <div class="bg-gradient-to-br from-red-600 to-red-900 p-8 text-white relative">
        <button id="close-modal-btn" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
        <h3 class="text-2xl font-bold font-playfair pr-6">${item.name}</h3>
        <p class="text-sm text-white/70 mt-2">Precio: Q${item.price.toFixed(2)}</p>
      </div>
      
      <div class="p-8 space-y-8">
        <div class="flex flex-col items-center gap-4">
          <label class="text-xs uppercase tracking-widest text-slate-500 font-bold">Cantidad</label>
          <div class="flex items-center gap-8">
            <button class="qty-btn" id="qty-minus">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path></svg>
            </button>
            <span class="text-5xl font-bold text-white tabular-nums w-16 text-center" id="qty-display">1</span>
            <button class="qty-btn" id="qty-plus">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            </button>
          </div>
        </div>
        
        <div class="flex flex-col gap-4">
          <label class="text-xs uppercase tracking-widest text-slate-500 font-bold">Detalles Adicionales (Opcional)</label>
          <textarea id="custom-details" maxlength="150" rows="2" 
            class="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-base focus:outline-none focus:border-red-500 transition-colors placeholder:text-slate-600"
            placeholder="Ej: Solo verduras, sin arroz..."></textarea>
        </div>
        
        <button id="add-to-cart-btn" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-red-900/30 transition-all active:scale-[0.98]">
          Añadir al Carrito — Q<span id="subtotal-display">${item.price.toFixed(2)}</span>
        </button>
      </div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');

  const updateQty = (newQty) => {
    qty = Math.max(1, Math.min(newQty, 99));
    document.getElementById('qty-display').textContent = qty;
    document.getElementById('subtotal-display').textContent = (item.price * qty).toFixed(2);
  };

  document.getElementById('qty-plus').onclick = () => updateQty(qty + 1);
  document.getElementById('qty-minus').onclick = () => updateQty(qty - 1);
  document.getElementById('close-modal-btn').onclick = () => modalOverlay.classList.add('hidden');
  document.getElementById('add-to-cart-btn').onclick = () => {
    const customDescription = document.getElementById('custom-details').value.trim();
    addItemToCart(item, qty, customDescription);
    modalOverlay.classList.add('hidden');
  };
}

function openTicketModal() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES');
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const ticketId = Math.random().toString(36).substr(2, 9).toUpperCase();

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  modalOverlay.innerHTML = `
    <div class="flex flex-col items-center gap-6 animate-scale-in w-full max-w-sm">
      <div id="ticket-preview" class="ticket-container bg-white shadow-2xl rounded-lg text-black">
        <div class="ticket-header space-y-0.5">
          <h2 class="text-xl font-bold uppercase tracking-tighter">Comedor Donde Flory</h2>
          <p class="ticket-info">Sabor Casero y Profesional</p>
          <p class="ticket-info">4ta. Calle 4-69 Zona 1</p>
          <p class="ticket-info">Tel: 4259-7488</p>
          <div class="py-1 border-y border-slate-200 mt-2 flex justify-center text-center ticket-meta">
            <span>FECHA: ${dateStr} ${timeStr}</span>
          </div>
        </div>
        
        ${(customerInfo.name || customerInfo.phone || customerInfo.deliveryTime) ? `
          <div class="mb-4 text-sm space-y-2 bg-slate-50 p-3 rounded border border-slate-200 customer-section">
            ${customerInfo.name ? `<p class="customer-data"><span class="label">CLIENTE:</span> <span class="value font-black">${customerInfo.name.toUpperCase()}</span></p>` : ''}
            ${customerInfo.phone ? `<p class="customer-data"><span class="label">TELÉFONO:</span> <span class="value font-black text-2xl">${customerInfo.phone}</span></p>` : ''}
            ${customerInfo.deliveryTime ? `<p class="customer-data"><span class="label">ENTREGA:</span> <span class="value font-black text-2xl">${customerInfo.deliveryTime}</span></p>` : ''}
          </div>
          <div class="border-b-2 border-dashed border-slate-200 mb-4 print-hidden"></div>
        ` : ''}

        <div class="space-y-2 mb-4 items-list">
          ${cart.map(item => `
            <div class="ticket-row text-sm mb-1">
              <span class="flex-1 font-black text-black break-words pr-2">${item.quantity}x ${item.name}</span>
              <span class="font-black text-black shrink-0">Q${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            ${item.description ? `<div class="item-description mb-2 pl-4 leading-tight">${item.description}</div>` : ''}
          `).join('')}
        </div>

        <div class="border-t-2 border-black pt-3 mt-4 space-y-2">
          <div class="flex items-end gap-2 total-section">
            <span class="text-sm font-bold uppercase label">TOTAL A PAGAR:</span>
            <span class="text-2xl font-black value">Q${total.toFixed(2)}</span>
          </div>
        </div>

        <div class="ticket-footer space-y-2 mt-4">
          <p class="font-bold">¡Buen provecho!</p>
          <p>Gracias por su preferencia</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 w-full">
        <div class="flex gap-3 w-full">
          <button id="close-ticket-btn" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all">
            Cerrar
          </button>
          <button id="print-ticket-btn" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Imprimir
          </button>
        </div>
        <button id="copy-ticket-btn" class="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
          Copiar Ticket
        </button>
      </div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');

  document.getElementById('close-ticket-btn').onclick = () => modalOverlay.classList.add('hidden');

  document.getElementById('print-ticket-btn').onclick = () => {
    window.print();
    cart = [];
    updateCartUI();
    resetCustomerInfo();
    modalOverlay.classList.add('hidden');
  };

  document.getElementById('copy-ticket-btn').onclick = (e) => {
    copyTicketText();
    const btn = e.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg> ¡Copiado!`;
    btn.classList.replace('bg-green-600', 'bg-emerald-700');
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.replace('bg-emerald-700', 'bg-green-600');
      cart = [];
      updateCartUI();
      resetCustomerInfo();
      modalOverlay.classList.add('hidden');
    }, 1500);
  };
}

// --- Actions ---

function addItemToCart(item, quantity, customDescription) {
  // Use custom description if provided, otherwise fallback to item.description (if any)
  const description = customDescription || item.description || "";

  // Find item by name, price AND description to keep distinct variations separate
  const existingItem = cart.find(i => i.name === item.name && i.price === item.price && i.description === description);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ ...item, quantity, description });
  }
  updateCartUI();
}

function copyTicketText() {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES');
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const ticketId = Math.random().toString(36).substr(2, 9).toUpperCase();

  // Thermal printer width is typically 32 characters
  const width = 32;
  const separator = '-'.repeat(width);

  let text = '';

  // Header - centered
  text += 'COMEDOR DONDE FLORY\n';
  text += 'Sabor Casero y Profesional\n';
  text += '4ta. Calle 4-69 Zona 1\n';
  text += '📞 4259-7488\n'; // Removed extra newline

  // Date and ID
  const dateLine = `FECHA: ${dateStr} ${timeStr}`;
  const datePadding = " ".repeat(Math.max(0, Math.floor((width - dateLine.length) / 2)));
  text += `${separator}\n`; // Moving separator up
  text += `${datePadding}${dateLine}\n`;
  text += `${separator}\n`; // Removed extra newline

  // Customer info - if available
  if (customerInfo.name || customerInfo.phone || customerInfo.deliveryTime) {
    if (customerInfo.name) {
      text += `CLIENTE: ${customerInfo.name.toUpperCase()}\n`;
    }
    if (customerInfo.phone) {
      text += `TELÉFONO: ${customerInfo.phone}\n`;
    }
    if (customerInfo.deliveryTime) {
      text += `ENTREGA: ${customerInfo.deliveryTime}\n`;
    }
    text += `${separator}\n`; // Removed extra newline
  } else {
    // If no customer info, add a small spacer or just continue
    // text += `\n`; 
  }


  // Helper for word wrapping
  const wrapText = (text, maxLength) => {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      if (currentLine.length + 1 + words[i].length <= maxLength) {
        currentLine += ' ' + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Items
  cart.forEach(item => {
    // Calculate space for name on the first line
    // Format: "1x Item Name      Q10.00"
    // We need to ensure the price is always fast right aligned

    const priceStr = `Q${(item.price * item.quantity).toFixed(2)}`;
    const quantityStr = `${item.quantity}x `;

    // Available width for name on first line: Total Width - Price - Quantity - 1 (space)
    const availableForName = width - priceStr.length - quantityStr.length - 1;

    const nameWords = item.name.split(' ');
    let currentNameLine = "";
    let nameLines = [];

    // Word wrap logic for name
    nameWords.forEach(word => {
      if ((currentNameLine + word).length <= availableForName) {
        currentNameLine += (currentNameLine.length > 0 ? " " : "") + word;
      } else {
        if (currentNameLine.length > 0) nameLines.push(currentNameLine);
        currentNameLine = word;
        // If a single word is too long, we might need to split it or handle subsequent lines
        // For subsequent lines, we have full width (32 chars)
      }
    });
    if (currentNameLine.length > 0) nameLines.push(currentNameLine);

    // First line construction
    const firstLineName = nameLines[0] || "";
    // Pad appropriately to push price to right
    const paddingLength = width - quantityStr.length - firstLineName.length - priceStr.length;
    const padding = " ".repeat(Math.max(0, paddingLength));

    text += `${quantityStr}${firstLineName}${padding}${priceStr}\n`;

    // Subsequent name lines
    for (let i = 1; i < nameLines.length; i++) {
      text += `   ${nameLines[i]}\n`; // Indent subsequent name lines slightly
    }

    // Description
    if (item.description) {
      // Wrap description to width - 2 (indent)
      const descLines = wrapText(`(${item.description})`, width - 2);
      descLines.forEach(line => text += `  ${line}\n`);
    }
  });

  // Separator before total
  text += `${separator}\n`;

  // Total (Right Aligned)
  const totalLabel = 'TOTAL A PAGAR:';
  const totalAmount = `Q${total.toFixed(2)}`;

  // Left aligned format: [Label] [Amount]
  text += `${totalLabel} ${totalAmount}\n`;
  text += `${separator}\n\n`; // Keep some space at very bottom for tearing

  // Footer
  text += '¡Buen provecho!\n';
  text += 'Gracias por su preferencia\n\n\n'; // Feed paper


  navigator.clipboard.writeText(text);
}

function resetCustomerInfo() {
  customerInfo = {
    name: '',
    phone: '',
    deliveryTime: ''
  };
  document.getElementById('customer-name').value = '';
  document.getElementById('customer-phone').value = '';
  document.getElementById('customer-time').value = '';
}

// --- Utilities ---

function formatPhoneNumber(value) {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Format as xxxx-xxxx
  if (digits.length <= 4) {
    return digits;
  } else if (digits.length <= 8) {
    return digits.slice(0, 4) + '-' + digits.slice(4);
  } else {
    return digits.slice(0, 4) + '-' + digits.slice(4, 8);
  }
}

// --- Event Listeners ---

function setupEventListeners() {
  // Sync Customer Info
  document.getElementById('customer-name').oninput = (e) => customerInfo.name = e.target.value;

  // Phone with auto-formatting
  const phoneInput = document.getElementById('customer-phone');
  phoneInput.oninput = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    e.target.value = formatted;
    customerInfo.phone = formatted;
  };

  document.getElementById('customer-time').oninput = (e) => customerInfo.deliveryTime = e.target.value;

  // Manual Add
  const addManual = () => {
    const nameInput = document.getElementById('manual-name');
    const priceInput = document.getElementById('manual-price');
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (name && !isNaN(price)) {
      addItemToCart({ name, price }, 1);
      nameInput.value = '';
      priceInput.value = '';
    }
  };

  document.getElementById('add-manual-btn').onclick = addManual;
  document.getElementById('manual-price').onkeydown = (e) => {
    if (e.key === 'Enter') addManual();
  };

  // Cart Actions
  clearCartBtn.onclick = () => {
    cart = [];
    updateCartUI();
    resetCustomerInfo();
  };

  generateTicketBtn.onclick = openTicketModal;

  // Close modal on background click
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
  };
}

// Start the APP
window.addEventListener('DOMContentLoaded', init);
