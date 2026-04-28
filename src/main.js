import './style.css'
import { menuData } from './data.js'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'


// --- State ---
const getTodayId = () => {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const todayId = days[new Date().getDay()];
  return menuData.categories.some(cat => cat.id === todayId) ? todayId : menuData.categories[0].id;
};

let currentCategory = getTodayId();
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
  // Set initial category (today)
  currentCategory = getTodayId();
  renderMenu();
  setupEventListeners();
  updateCartUI();
}

// --- Rendering ---

function renderCategories() {
  const categoriesHtml = menuData.categories.map(cat => `
    <button 
      class="cat-btn px-6 py-2.5 rounded-full text-base font-bold uppercase tracking-wide whitespace-nowrap border border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white transition-all ${cat.id === currentCategory ? 'active' : ''}" 
      data-id="${cat.id}"
      style="--cat-color: ${cat.color}; --cat-color-alpha: ${cat.color}44"
    >
      ${cat.name}
    </button>
  `).join('');

  const exitBtnHtml = `
    <a href="index.html" 
      class="px-6 py-2.5 rounded-full text-base font-bold uppercase tracking-wide whitespace-nowrap border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 ml-4"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      SALIR
    </a>
  `;

  categoriesContainer.innerHTML = categoriesHtml + exitBtnHtml;

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

function getItemImage(item) {
  const name = item.name.toLowerCase();
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

  if (!days.includes(currentCategory)) return null;

  // Specific high-priority matches
  if (name.includes('caldo de res')) return '/caldo-de-res.png';
  if (name.includes('caldo de pata')) return '/caldo-de-pata.png';
  if (name.includes('hilachas')) return '/hilachas.png';
  if (name.includes('pepián')) return '/pepian.png';

  // Categorical fallbacks
  if (name.includes('pollo') || name.includes('pechuga')) return '/pollo.png';
  if (name.includes('res') || name.includes('milanesa') || name.includes('bistec') || name.includes('carne') || name.includes('costilla')) return '/res.png';

  return '/comida-general.png';
}

function openItemModal(item) {
  let qty = 1;
  const itemImage = getItemImage(item);

  modalOverlay.innerHTML = `
    <div id="modal-content" class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in ${itemImage ? 'special-bg' : ''}" ${itemImage ? `style="--modal-bg-image: url('${itemImage}')"` : ''}>
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
    saveSale(total);
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
      saveSale(total);
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

  const viewReportBtn = document.getElementById('view-report-btn');
  if (viewReportBtn) viewReportBtn.onclick = openReportModal;

  // Close modal on background click
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
  };
}

// --- Reports ---

function saveSale(total) {
  const sales = JSON.parse(localStorage.getItem('daily_sales') || '[]');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const saleTime = customerInfo.deliveryTime || timeStr;

  const sale = {
    id: sales.length + 1,
    date: now.toISOString().split('T')[0],
    time: saleTime,
    customerName: customerInfo.name || 'Cliente Mostrador',
    phone: customerInfo.phone || '-',
    vendedor: customerInfo.vendedor || '-',
    pago: customerInfo.pago || '-',
    total: total,
    items: cart.map(i => `${i.quantity}x ${i.name}`).join(', ')
  };

  sales.push(sale);
  localStorage.setItem('daily_sales', JSON.stringify(sales));
}

function renderReportContent(sales) {
  let totalDia = 0;
  const tableRows = sales.map(sale => {
    totalDia += sale.total;
    return `
      <tr class="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
        <td class="px-4 py-3 text-center">${sale.id}</td>
        <td class="px-4 py-3">${sale.customerName}</td>
        <td class="px-4 py-3 text-center">${sale.phone}</td>
        <td class="px-4 py-3 text-center">${sale.time}</td>
        <td class="px-4 py-3 text-center font-semibold text-emerald-400">${sale.pago}</td>
        <td class="px-4 py-3 text-center font-semibold text-blue-400">${sale.vendedor}</td>
        <td class="px-4 py-3 text-right font-bold text-amber-400">Q${sale.total.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return { tableRows, totalDia, totalsHtml: '', isEmpty: sales.length === 0 };
}

function openReportModal() {
  window.renderReportModal();
}

window.renderReportModal = function() {
  const sales = JSON.parse(localStorage.getItem('daily_sales') || '[]');
  const { tableRows, totalDia, totalsHtml, isEmpty } = renderReportContent(sales);

  modalOverlay.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
      <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
        <div>
          <h2 class="text-2xl font-bold font-playfair text-white flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            INFORME DE VENTAS DEL DÍA
          </h2>
          <p class="text-sm text-slate-400 mt-1">Resumen de transacciones y formas de pago</p>
        </div>
        <button id="close-report-btn" class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
      </div>

      <div class="flex-1 overflow-auto p-6 bg-slate-950">
        <div class="rounded-xl border border-slate-800 overflow-hidden">
          <table class="w-full text-sm text-left text-slate-300">
            <thead class="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-800">
              <tr>
                <th scope="col" class="px-4 py-4 text-center w-16">No.</th>
                <th scope="col" class="px-4 py-4">NOMBRE DEL CLIENTE</th>
                <th scope="col" class="px-4 py-4 text-center">TELÉFONO</th>
                <th scope="col" class="px-4 py-4 text-center">HORA</th>
                <th scope="col" class="px-4 py-4 text-center">PAGO</th>
                <th scope="col" class="px-4 py-4 text-center">VENDEDOR</th>
                <th scope="col" class="px-4 py-4 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${!isEmpty ? tableRows : `
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center text-slate-500">
                    <div class="flex flex-col items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-50"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                      No hay ventas
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
            <tfoot class="bg-slate-900 border-t border-slate-800 font-bold text-white">
              <tr>
                <td colspan="6" class="px-4 py-4 text-right text-slate-400">Total Mostrado...</td>
                <td class="px-4 py-4 text-right text-amber-500 text-lg">Q${totalDia.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex justify-between items-center shrink-0">
        <button id="clear-sales-btn" class="text-sm font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
          Borrar Historial
        </button>
        <button id="export-excel-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2" ${sales.length === 0 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"></path><path d="m18 21-4-4"></path><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"></path></svg>
          Descargar Excel (.xlsx)
        </button>
      </div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');

  document.getElementById('close-report-btn').onclick = () => modalOverlay.classList.add('hidden');

  document.getElementById('clear-sales-btn').onclick = () => {
    if (confirm('¿Estás seguro de que deseas borrar TODAS las ventas de hoy? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('daily_sales');
      window.renderReportModal();
    }
  };

  const exportBtn = document.getElementById('export-excel-btn');
  if (exportBtn) {
    exportBtn.onclick = async () => {
      await exportToExcel(sales); // Export all sales, the excel has summaries
    };
  }
}

async function exportToExcel(sales) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Ventas');

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  const currencyFmt = 'Q#,##0.00';

  // Row 1: Title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INFORME DE VENTAS DEL DÍA';
  titleCell.fill = headerFill;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Row 2: Headers
  const headers = ["No.", "NOMBRE DEL CLIENTE", "TELEFONO", "HORA", "TOTAL", "FORMA DE PAGO", "VENDEDOR"];
  const headerRow = worksheet.getRow(2);
  headerRow.values = headers;
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  });

  // Column Widths
  worksheet.columns = [
    { key: 'id', width: 6 },
    { key: 'name', width: 35 },
    { key: 'phone', width: 25 },
    { key: 'time', width: 10 },
    { key: 'total', width: 15 },
    { key: 'pago', width: 18 },
    { key: 'vendedor', width: 18 },
    { key: 'vendorTotal', width: 15 }
  ];

  // Set AutoFilter for the header row
  worksheet.autoFilter = 'A2:G2';

  // Force Excel to recalculate all formulas when the workbook opens
  workbook.calcProperties.fullCalcOnLoad = true;

  const morningSales = sales.filter(s => parseInt(s.time.split(':')[0]) < 11);
  const afternoonSales = sales.filter(s => parseInt(s.time.split(':')[0]) >= 11);

  let currentRow = 3;

  const addSalesRows = (saleList) => {
    const start = currentRow;
    saleList.forEach(sale => {
      sale.excelRow = currentRow;
      const row = worksheet.getRow(currentRow);
      row.getCell('A').value = sale.id;
      row.getCell('B').value = sale.customerName;
      row.getCell('C').value = sale.phone;
      row.getCell('D').value = sale.time;
      row.getCell('E').value = sale.total;
      
      const pagoCell = row.getCell('F');
      pagoCell.value = sale.pago;
      pagoCell.dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: false,
        formulae: ['"EFECTIVO,TRANSFERENCIA,TARJETA"']
      };

      const vendedorCell = row.getCell('G');
      vendedorCell.value = sale.vendedor;
      vendedorCell.dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: false,
        formulae: ['"FREDY,JAIME,VIEJO,ANDRES Jr.,LOCAL"']
      };
      
      row.getCell('E').numFmt = currencyFmt;
      currentRow++;
    });
    return { start, end: currentRow - 1 };
  };

  const totalRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  const addTotalRow = (label, range) => {
    const row = worksheet.getRow(currentRow);
    row.getCell('D').value = label;
    row.getCell('D').font = { bold: true };
    row.getCell('D').alignment = { horizontal: 'right' };
    if (range.start <= range.end) {
      row.getCell('E').value = { formula: `SUM(E${range.start}:E${range.end})` };
    } else {
      row.getCell('E').value = 0;
    }
    row.getCell('E').numFmt = currencyFmt;
    row.getCell('E').font = { bold: true };
    
    // Apply gray fill to cells A-G
    ['A','B','C','D','E','F','G'].forEach(col => {
      row.getCell(col).fill = totalRowFill;
      row.getCell(col).border = borderThin;
    });

    currentRow++;
    return currentRow - 1; // Return the row index of the total
  };

  // Morning
  const morningRange = addSalesRows(morningSales);
  const morningTotalIndex = addTotalRow('Total de la mañana', morningRange);
  currentRow++; // blank line

  // Afternoon
  const afternoonRange = addSalesRows(afternoonSales);
  const afternoonTotalIndex = addTotalRow('Total de la Tarde', afternoonRange);
  currentRow++; // blank line

  // Grand Total
  const grandTotalRow = worksheet.getRow(currentRow);
  grandTotalRow.getCell('D').value = 'TOTAL GENERAL DEL DÍA';
  grandTotalRow.getCell('D').font = { bold: true, size: 12 };
  grandTotalRow.getCell('D').alignment = { horizontal: 'right' };
  grandTotalRow.getCell('E').value = { formula: `E${morningTotalIndex} + E${afternoonTotalIndex}` };
  grandTotalRow.getCell('E').numFmt = currencyFmt;
  grandTotalRow.getCell('E').font = { bold: true, size: 12 };
  
  // Apply gray fill
  ['A','B','C','D','E','F','G'].forEach(col => {
    grandTotalRow.getCell(col).fill = totalRowFill;
    grandTotalRow.getCell(col).border = borderThin;
  });
  
  currentRow += 3;


  // Add elegant conditional formatting for the VENDEDOR column (G)
  worksheet.addConditionalFormatting({
    ref: 'G3:G1000',
    rules: [
      {
        type: 'cellIs', operator: 'equal', formulae: ['"FREDY"'],
        style: { 
          font: { color: { argb: 'FF154360' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD4E6F1' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"JAIME"'],
        style: { 
          font: { color: { argb: 'FF145A32' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD5F5E3' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"VIEJO"'],
        style: { 
          font: { color: { argb: 'FF7E5109' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDEBD0' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"ANDRES Jr."'],
        style: { 
          font: { color: { argb: 'FF512E5F' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF5EEF8' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"LOCAL"'],
        style: { 
          font: { color: { argb: 'FF424949' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE5E8E8' } }
        }
      }
    ]
  });
  // Summaries by Vendor
  const vendors = ['FREDY', 'JAIME', 'VIEJO', 'ANDRES Jr.', 'LOCAL'];
  const vendorTotalRows = [];
  
  vendors.forEach(v => {
    // Header for this vendor table
    const headRow = worksheet.getRow(currentRow);
    headRow.getCell('D').value = v;
    headRow.getCell('E').value = 'EFECTIVO';
    headRow.getCell('F').value = 'TRANSFERENCIA';
    headRow.getCell('G').value = 'TARJETA';
    headRow.getCell('H').value = 'TOTAL';
    
    const vendorColors = {
      'FREDY': { font: 'FF154360', fill: 'FFD4E6F1' },
      'JAIME': { font: 'FF145A32', fill: 'FFD5F5E3' },
      'VIEJO': { font: 'FF7E5109', fill: 'FFFDEBD0' },
      'ANDRES Jr.': { font: 'FF512E5F', fill: 'FFF5EEF8' },
      'LOCAL': { font: 'FF424949', fill: 'FFE5E8E8' }
    };

    ['D','E','F','G','H'].forEach(col => {
      const cell = headRow.getCell(col);
      let fontColor = 'FF000000';
      let fillColor = 'FFA6A6A6';
      if (col === 'D') {
        fontColor = vendorColors[v].font;
        fillColor = vendorColors[v].fill;
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.font = { bold: true, color: { argb: fontColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    currentRow++;

    // Data for this vendor table
    const dataRow = worksheet.getRow(currentRow);
    const maxRow = (afternoonRange.end || morningRange.end || 3);
    const formulaBase = `SUMIFS(E3:E${maxRow}, G3:G${maxRow}, "${v}", F3:F${maxRow}, `;
    
    dataRow.getCell('E').value = { formula: formulaBase + '"EFECTIVO")' };
    dataRow.getCell('F').value = { formula: formulaBase + '"TRANSFERENCIA")' };
    dataRow.getCell('G').value = { formula: formulaBase + '"TARJETA")' };
    dataRow.getCell('H').value = { formula: `E${currentRow} + F${currentRow} + G${currentRow}` };
    
    vendorTotalRows.push(currentRow);

    ['D','E','F','G','H'].forEach(col => {
      const cell = dataRow.getCell(col);
      if(col !== 'D') cell.numFmt = currencyFmt;
      if (col === 'H') cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    
    currentRow += 2;
  });

  // --- FINAL TOTAL VENDIDO POR TODOS ---
  const finalTotalRow = worksheet.getRow(currentRow);
  finalTotalRow.getCell('G').value = 'TOTAL VENDIDO';
  finalTotalRow.getCell('G').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  finalTotalRow.getCell('G').alignment = { horizontal: 'center', vertical: 'middle' };
  finalTotalRow.getCell('G').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  
  finalTotalRow.getCell('H').value = { formula: vendorTotalRows.map(r => `H${r}`).join('+') };
  finalTotalRow.getCell('H').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  finalTotalRow.getCell('H').numFmt = currencyFmt;
  finalTotalRow.getCell('H').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  finalTotalRow.getCell('H').border = borderThin;
  finalTotalRow.getCell('G').border = borderThin;

  currentRow += 3;



  // --- SECOND SHEET: BUSCADOR INTELIGENTE ---
  // ARCHITECTURE:
  //   • All sales written as STATIC VALUES in hidden rows 1000+ (same sheet).
  //   • ONE Excel FILTER formula in A7 spills results automatically.
  //   • C4 = Vendor selector  |  E4 = Payment selector.
  //   • Empty selector = show all. Works in Excel 365 / Excel 2019+.
  const searchSheet = workbook.addWorksheet('Buscador Inteligente');
  searchSheet.views = [{ showGridLines: false }];

  searchSheet.columns = [
    { width: 6  }, // A - No.
    { width: 35 }, // B - Nombre del Cliente
    { width: 20 }, // C - Teléfono
    { width: 12 }, // D - Hora
    { width: 15 }, // E - Total
    { width: 18 }, // F - Forma de Pago
    { width: 18 }, // G - Vendedor
  ];

  // ---- Row 1: Title ----
  searchSheet.mergeCells('A1:G1');
  const sTitle = searchSheet.getCell('A1');
  sTitle.value = '🔍 BUSCADOR INTELIGENTE DE VENTAS — Comedor Donde Flory';
  sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  searchSheet.getRow(1).height = 30;

  // ---- Row 2: Instruction banner ----
  searchSheet.mergeCells('A2:G2');
  const instrCell = searchSheet.getCell('A2');
  instrCell.value = 'Selecciona Vendedor en C4 y/o Forma de Pago en E4 — los resultados aparecen solos ↓';
  instrCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
  instrCell.alignment = { horizontal: 'center', vertical: 'middle' };
  instrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  searchSheet.getRow(2).height = 18;

  // ---- Row 3: Labels ----
  searchSheet.getCell('B3').value = 'VENDEDOR:';
  searchSheet.getCell('B3').font = { bold: true, size: 11 };
  searchSheet.getCell('B3').alignment = { horizontal: 'right', vertical: 'middle' };
  searchSheet.getCell('D3').value = 'FORMA DE PAGO:';
  searchSheet.getCell('D3').font = { bold: true, size: 11 };
  searchSheet.getCell('D3').alignment = { horizontal: 'right', vertical: 'middle' };
  searchSheet.getRow(3).height = 20;

  // ---- Row 4: Yellow dropdown inputs ----
  const vendorInput = searchSheet.getCell('C4');
  vendorInput.dataValidation = {
    type: 'list', allowBlank: true, showErrorMessage: false,
    formulae: ['"FREDY,JAIME,VIEJO,ANDRES Jr.,LOCAL,OTROS"']
  };
  vendorInput.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE066' } };
  vendorInput.border = borderThin;
  vendorInput.alignment = { horizontal: 'center', vertical: 'middle' };
  vendorInput.font   = { bold: true, size: 12 };

  const pagoInput = searchSheet.getCell('E4');
  pagoInput.dataValidation = {
    type: 'list', allowBlank: true, showErrorMessage: false,
    formulae: ['"EFECTIVO,TRANSFERENCIA,TARJETA"']
  };
  pagoInput.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE066' } };
  pagoInput.border = borderThin;
  pagoInput.alignment = { horizontal: 'center', vertical: 'middle' };
  pagoInput.font   = { bold: true, size: 12 };

  searchSheet.getRow(4).height = 24;

  // ---- Row 5: Spacer ----
  searchSheet.getRow(5).height = 8;

  // ---- Row 6: Results table header ----
  const sHeader = searchSheet.getRow(6);
  sHeader.values = ['No.', 'NOMBRE DEL CLIENTE', 'TELÉFONO', 'HORA', 'TOTAL', 'FORMA DE PAGO', 'VENDEDOR'];
  sHeader.height = 22;
  sHeader.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderThin;
  });

  // ---- Rows 1000+: ALL sales linked live to Sheet 1 (source for FILTER) ----
  const DATA_START = 1000;
  let dataRow = DATA_START;
  sales.forEach(sale => {
    const dr = searchSheet.getRow(dataRow);
    dr.getCell('A').value = { formula: `'Reporte de Ventas'!A${sale.excelRow}` };
    dr.getCell('B').value = { formula: `'Reporte de Ventas'!B${sale.excelRow}` };
    dr.getCell('C').value = { formula: `'Reporte de Ventas'!C${sale.excelRow}` };
    dr.getCell('D').value = { formula: `'Reporte de Ventas'!D${sale.excelRow}` };
    dr.getCell('E').value = { formula: `'Reporte de Ventas'!E${sale.excelRow}` };
    dr.getCell('F').value = { formula: `'Reporte de Ventas'!F${sale.excelRow}` };
    dr.getCell('G').value = { formula: `'Reporte de Ventas'!G${sale.excelRow}` };
    dr.hidden = true; // hide from view; INDEX/MATCH still reads them
    dataRow++;
  });
  const DATA_END = dataRow - 1;

  // ---- Row 7: INDEX/MATCH formulas for universal compatibility ----
  // FILTER() causes corruption in older Excel versions when exported by ExcelJS.
  // We use a helper column H to tag matching rows, and INDEX/MATCH to pull them up.
  searchSheet.getCell('H999').value = 0; // Base for MAX

  if (DATA_END >= DATA_START) {
    // 1. Helper column formulas in rows 1000+
    for (let i = DATA_START; i <= DATA_END; i++) {
      searchSheet.getCell(`H${i}`).value = { 
        formula: `IF(AND(OR($C$4="", G${i}=$C$4), OR($E$4="", F${i}=$E$4)), MAX($H$999:H${i-1})+1, "")` 
      };
    }

    // 2. Results formulas in rows 7 to 7 + sales.length
    const resultsEndRow = 7 + sales.length - 1;
    for (let i = 7; i <= resultsEndRow; i++) {
      const rowNumOffset = i - 6; // Row 7 is match #1
      ['A','B','C','D','E','F','G'].forEach(col => {
        const cell = searchSheet.getCell(`${col}${i}`);
        cell.value = { 
          formula: `IFERROR(INDEX(${col}$${DATA_START}:${col}$${DATA_END}, MATCH(${rowNumOffset}, $H$${DATA_START}:$H$${DATA_END}, 0)), "")` 
        };
        // Apply styling to results area
        if (col === 'E') cell.numFmt = currencyFmt;
        cell.border = borderThin;
        if (col !== 'B') cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }
  } else {
    searchSheet.getCell('A7').value = 'No hay ventas registradas.';
  }


  // Export
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `REPORTE_DONDE_FLORY_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error al generar el Excel:', error);
    alert('Hubo un error al generar el archivo de Excel. Por favor, revisa la consola.');
  }
}

// --- INITIALIZATION ---


// Start the APP
window.addEventListener('DOMContentLoaded', init);
