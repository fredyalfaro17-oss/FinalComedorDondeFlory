import { menuData } from './data.js'
import { getSales, addSale, updateSaleProperty as dbUpdateSaleProperty, clearAllSales, hasTrashBackup, restoreLastClearedSales, subscribeSales, VENDEDORES, FORMAS_PAGO, getTodayKey, normalizePayment, normalizeVendor, searchCustomers, saveCustomer, deleteCustomer, getCustomers, subscribeCustomers, getDeviceId, isCajaDevice, unlockCajaWithPin, verifyAdminPin, lockCajaDevice } from './db.js'

const ExcelJS = window.ExcelJS || {};
const saveAs = window.saveAs || function() {};


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
  deliveryTime: '',
  vendedor: '',
  pago: 'EFECTIVO'
};

// --- DOM Elements ---
const categoriesContainer = document.getElementById('categories-container');
const menuContainer = document.getElementById('menu-container');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const clearCartBtn = document.getElementById('clear-cart-btn');
const generateTicketBtn = document.getElementById('generate-ticket-btn');
const modalOverlay = document.getElementById('modal-overlay');

const mobileCartBtn = document.getElementById('mobile-cart-btn');
const closeCartMobileBtn = document.getElementById('close-cart-mobile-btn');
const cartSidebar = document.getElementById('cart-sidebar');
const mobileCartBadge = document.getElementById('mobile-cart-badge');

// --- Initialization ---
function init() {
  renderCategories();
  // Set initial category (today)
  currentCategory = getTodayId();
  renderMenu();
  setupEventListeners();
  updateCartUI();

  if (window.location.hash === '#vendedores' || window.location.search.includes('vendedores') || window.location.search.includes('qr')) {
    setTimeout(openShareVendorsModal, 200);
  }
}

// --- Rendering ---

function renderCategories() {
  const categoriesHtml = menuData.categories.map(cat => `
    <button 
      class="cat-btn px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-extrabold uppercase tracking-wide whitespace-nowrap border border-slate-800/80 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700 transition-all focus:outline-none select-none ${cat.id === currentCategory ? 'active' : ''}" 
      data-id="${cat.id}"
      style="--cat-color: ${cat.color}; --cat-color-alpha: ${cat.color}44"
    >
      ${cat.name}
    </button>
  `).join('');

  const exitBtnHtml = `
    <a href="index.html" 
      class="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-extrabold uppercase tracking-wide whitespace-nowrap border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 ml-3 select-none"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span>SALIR</span>
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
    <div class="menu-item-card bg-slate-900/95 border border-slate-800/90 hover:border-amber-500/50 p-4 sm:p-5 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all duration-200 active:scale-[0.98] shadow-md hover:shadow-xl hover:shadow-amber-500/5 relative overflow-hidden" data-item='${JSON.stringify(item)}'>
      <div class="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
      <div>
        <div class="flex justify-between items-start gap-3 mb-2">
          <h3 class="font-black text-base sm:text-lg text-white group-hover:text-amber-400 transition-colors leading-snug">${item.name}</h3>
          <div class="shrink-0 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black text-base sm:text-lg shadow-sm font-mono tracking-tight">
            Q${item.price.toFixed(0)}
          </div>
        </div>
        ${item.description ? `<p class="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">${item.description}</p>` : ''}
      </div>
      <div class="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-wider">Toca para ordenar</span>
        <button type="button" class="add-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 group-hover:bg-amber-500 text-slate-300 group-hover:text-slate-950 font-bold text-xs border border-slate-700/80 group-hover:border-amber-400 transition-all shadow-sm">
          <span class="text-sm font-black">+</span>
          <span>Pedir</span>
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
      <div class="flex flex-col items-center justify-center h-full text-slate-600 opacity-60 space-y-3 animate-fade-in p-6 text-center">
        <div class="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl shadow-inner">
          🛒
        </div>
        <div>
          <p class="font-bold text-slate-400 text-sm">Tu orden está vacía</p>
          <p class="text-xs text-slate-500 mt-0.5">Selecciona platillos del menú para comenzar</p>
        </div>
      </div>
    `;
    cartTotalEl.textContent = 'Q0.00';
    clearCartBtn.classList.add('hidden');
    generateTicketBtn.disabled = true;
    if (mobileCartBadge) mobileCartBadge.classList.add('hidden');
    return;
  }

  clearCartBtn.classList.remove('hidden');
  generateTicketBtn.disabled = false;

  let total = 0;
  cartItemsContainer.innerHTML = cart.map((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    return `
      <div class="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 p-3.5 rounded-2xl flex flex-col gap-2.5 transition-all shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm text-white truncate leading-snug">${item.name}</h4>
            ${item.description ? `<p class="text-xs text-slate-400 italic mt-0.5 line-clamp-2">${item.description}</p>` : ''}
            <span class="text-[11px] font-semibold text-slate-500 font-mono">Q${item.price.toFixed(2)} c/u</span>
          </div>
          <span class="font-black text-amber-400 text-sm font-mono shrink-0">Q${subtotal.toFixed(2)}</span>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <button class="remove-cart-item text-slate-500 hover:text-red-400 transition-colors p-1 text-xs flex items-center gap-1 font-semibold" data-index="${index}" title="Quitar platillo">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            <span>Quitar</span>
          </button>

          <!-- Stepper rápido de cantidad -->
          <div class="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
            <button type="button" class="cart-qty-minus w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white font-bold transition-all active:scale-90" data-index="${index}">-</button>
            <span class="w-7 text-center font-bold text-xs text-white font-mono">${item.quantity}</span>
            <button type="button" class="cart-qty-plus w-7 h-7 flex items-center justify-center rounded-lg text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold transition-all active:scale-90" data-index="${index}">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cartTotalEl.textContent = `Q${total.toFixed(2)}`;

  // Listeners para quitar
  document.querySelectorAll('.remove-cart-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      cart.splice(index, 1);
      updateCartUI();
    });
  });

  // Listeners para steppers + y -
  document.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      if (cart[index]) {
        cart[index].quantity += 1;
        updateCartUI();
      }
    });
  });

  document.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      if (cart[index]) {
        if (cart[index].quantity > 1) {
          cart[index].quantity -= 1;
        } else {
          cart.splice(index, 1);
        }
        updateCartUI();
      }
    });
  });

  // Update mobile badge
  if (mobileCartBadge) {
    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (totalQty > 0) {
      mobileCartBadge.textContent = totalQty;
      mobileCartBadge.classList.remove('hidden');
    } else {
      mobileCartBadge.classList.add('hidden');
    }
  }
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
    <div id="modal-content" class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in mx-auto my-12 ${itemImage ? 'special-bg' : ''}" ${itemImage ? `style="--modal-bg-image: url('${itemImage}')"` : ''}>
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

function getHtmlTicketDocument(ticketHtml) {
  return `
    <!DOCTYPE html>
    <html style="color-scheme: light; background: #ffffff;">
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            width: 100% !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #ticket-preview {
            width: 100% !important;
            max-width: 100% !important;
            padding: 4mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .ticket-header {
            text-align: center !important;
            margin-bottom: 5px !important;
          }
          .ticket-header h2 {
            font-size: 14pt !important;
            font-weight: 900 !important;
            margin: 0 0 2pt 0 !important;
            text-transform: uppercase !important;
          }
          .ticket-info,
          .ticket-meta {
            font-size: 10pt !important;
            font-weight: 600 !important;
            color: #000000 !important;
            margin: 0 !important;
            line-height: 1.1 !important;
            text-align: center !important;
          }
          .ticket-meta {
            border-top: 1px solid #000000 !important;
            border-bottom: 1px solid #000000 !important;
            padding: 3px 0 !important;
            margin-top: 5px !important;
            display: block !important;
          }
          .customer-section {
            border: 1px solid #000000 !important;
            background: #ffffff !important;
            padding: 6px !important;
            margin: 8px 0 !important;
            border-radius: 4px !important;
          }
          .customer-data {
            font-size: 10pt !important;
            margin: 4px 0 !important;
            display: block !important;
            color: #000000 !important;
          }
          .customer-data .label {
            font-weight: 900 !important;
            margin-right: 2pt !important;
          }
          .customer-data .value {
            font-weight: 900 !important;
            font-size: 16pt !important;
          }
          .customer-data.delivery-data {
            border-top: 1px dashed #000000 !important;
            border-bottom: 1px dashed #000000 !important;
            padding: 3px 0 !important;
            margin: 4px 0 !important;
          }
          .customer-data.delivery-data .value {
            font-size: 16pt !important;
            font-weight: 900 !important;
          }
          .items-list {
            margin-top: 8px !important;
          }
          .ticket-row {
            font-size: 11pt !important;
            font-weight: 700 !important;
            display: flex !important;
            justify-content: space-between !important;
            border-bottom: 1px dashed #000000 !important;
            padding: 4px 0 !important;
            color: #000000 !important;
          }
          .ticket-row span:first-child {
            flex: 1 !important;
            text-align: left !important;
          }
          .ticket-row span:last-child {
            flex: 0 0 auto !important;
            text-align: right !important;
            margin-left: 10px !important;
          }
          .item-description {
            font-size: 12pt !important;
            font-weight: 500 !important;
            font-style: italic !important;
            color: #000000 !important;
            padding-left: 10px !important;
            margin-bottom: 4px !important;
            font-family: 'Playfair Display', Georgia, serif !important;
          }
          .total-section {
            border-top: 2px solid #000000 !important;
            padding-top: 6px !important;
            margin-top: 10px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
            color: #000000 !important;
          }
          .total-section .label {
            font-size: 11pt !important;
            font-weight: 900 !important;
          }
          .total-section .value {
            font-size: 16pt !important;
            font-weight: 900 !important;
          }
          .ticket-footer {
            border-top: 1px dashed #000000 !important;
            padding-top: 8px !important;
            margin-top: 12px !important;
            text-align: center !important;
            color: #000000 !important;
          }
          .ticket-footer p {
            margin: 2px 0 !important;
          }
          .ticket-footer p:first-child {
            font-size: 11pt !important;
            font-weight: 900 !important;
          }
          .ticket-footer p:last-child {
            font-size: 9pt !important;
          }
          .print-hidden {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${ticketHtml}
      </body>
    </html>
  `;
}

// ============================================================================
// --- Motor de Auto-Impresión Térmica Xprinter en Caja ---
// ============================================================================

function getPrintedSalesKey() {
  return `flory_printed_sales_${getTodayKey()}`;
}

function getPrintedSaleIds() {
  try {
    const raw = localStorage.getItem(getPrintedSalesKey());
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(arr.map(Number));
  } catch (e) {
    return new Set();
  }
}

export function markSaleAsPrinted(saleId) {
  try {
    if (!saleId) return;
    const ids = getPrintedSaleIds();
    ids.add(Number(saleId));
    localStorage.setItem(getPrintedSalesKey(), JSON.stringify(Array.from(ids)));
  } catch (e) {}
}

let hasInitializedPrintedCache = false;
function initPrintedSalesCache() {
  if (hasInitializedPrintedCache) return;
  const existing = getSales();
  const ids = getPrintedSaleIds();
  const now = Date.now();
  existing.forEach(s => {
    // Si la orden fue creada o solicitada en los últimos 5 minutos, NO la marcamos como ya impresa automáticamente
    const hasRecentPrintReq = s.printRequested && (now - Number(s.printRequested) < 5 * 60 * 1000);
    const saleTime = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
    const isVeryRecent = saleTime && (now - saleTime < 5 * 60 * 1000);
    if (!hasRecentPrintReq && !isVeryRecent) {
      ids.add(Number(s.id));
    }
  });
  localStorage.setItem(getPrintedSalesKey(), JSON.stringify(Array.from(ids)));
  hasInitializedPrintedCache = true;
}

// Alerta sonora (chime de 2 tonos) usando Web Audio API nativo
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.24); // D6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.start(now);
    osc.stop(now + 0.7);
  } catch (e) {}
}

// Toast flotante en pantalla para notificar de la orden e impresión en caja
function showAutoPrintToast(sale) {
  let toast = document.getElementById('flory-autoprint-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'flory-autoprint-toast';
    toast.className = 'fixed top-4 right-4 z-[400] max-w-sm bg-slate-900/95 border-2 border-amber-500 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 flex flex-col gap-2';
    document.body.appendChild(toast);
  }

  const cust = sale.customerName || 'Cliente Mostrador';
  const tot = Number(sale.total || 0).toFixed(2);
  const vend = sale.vendedor ? `🛵 ${sale.vendedor}` : '🍽️ Venta Directa';

  toast.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="text-2xl animate-bounce">🖨️</span>
        <div>
          <h4 class="font-black text-amber-400 text-sm">¡NUEVO PEDIDO RECIBIDO!</h4>
          <p class="text-xs text-slate-300 font-bold">${cust} &bull; <span class="text-amber-300 font-mono">Q${tot}</span></p>
          <p class="text-[11px] text-slate-400">${vend} | No. #${sale.id}</p>
        </div>
      </div>
      <button onclick="this.closest('#flory-autoprint-toast').remove()" class="text-slate-400 hover:text-white text-sm font-bold p-1">✕</button>
    </div>
    <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px]">
      <span class="text-emerald-400 font-semibold flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Enviando a Xprinter...
      </span>
      <button onclick="window.reprintTicket(${sale.id})" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all active:scale-95 shadow">
        Re-imprimir
      </button>
    </div>
  `;

  clearTimeout(window.__autoprintToastTimer);
  window.__autoprintToastTimer = setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => toast.remove(), 400);
    }
  }, 7000);
}

// Formatear hora de entrega a formato estándar 24h 00:00 (ej: 12:30, 20:00, 08:30)
export function formatDeliveryTime(timeStr) {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  if (!trimmed || trimmed === '-') return '';
  
  // Si tiene AM/PM
  const ampmMatch = trimmed.match(/\s*(AM|PM)\s*$/i);
  if (ampmMatch) {
    const isPM = ampmMatch[1].toUpperCase() === 'PM';
    const cleanTime = trimmed.replace(ampmMatch[0], '').trim();
    const parts = cleanTime.split(':');
    let h = parseInt(parts[0], 10);
    let m = parts[1] ? parts[1].replace(/\D/g, '').substring(0, 2) : '00';
    if (m.length === 1) m = m + '0';
    if (!isNaN(h)) {
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      const hStr = h < 10 ? `0${h}` : `${h}`;
      return `${hStr}:${m}`;
    }
  }

  // Si tiene formato de hora con dos puntos (ej: "20:00", "12:30", "8:30")
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    let h = parseInt(parts[0], 10);
    let m = parts[1] ? parts[1].replace(/\D/g, '').substring(0, 2) : '00';
    if (m.length === 1) m = m + '0';
    if (!m) m = '00';
    
    if (!isNaN(h)) {
      const hStr = h < 10 ? `0${h}` : `${h}`;
      return `${hStr}:${m}`;
    }
  }

  // Si solo son dígitos (ej: "8" -> "08:00", "12" -> "12:00", "20" -> "20:00")
  if (/^\d{1,2}$/.test(trimmed)) {
    let h = parseInt(trimmed, 10);
    const hStr = h < 10 ? `0${h}` : `${h}`;
    return `${hStr}:00`;
  }

  return trimmed;
}

// Máscara y auto-formateo para insertar automáticamente los dos puntos y formato 00:00
export function formatTimeInput(value, isBlur = false) {
  if (!value) return '';
  let str = String(value).trim();

  // Si ya tiene los dos puntos ":"
  if (str.includes(':')) {
    const parts = str.split(':');
    let h = parts[0].replace(/\D/g, '').slice(0, 2);
    let m = parts[1].replace(/\D/g, '').slice(0, 2);

    if (isBlur) {
      if (h.length === 1) h = '0' + h;
      if (h && m.length === 1) m = m + '0';
      if (h && !m) m = '00';
    }

    return `${h}:${m}`;
  }

  // Solo números sin dos puntos
  const digits = str.replace(/\D/g, '');
  if (!digits) return '';

  // 1 o 2 dígitos
  if (digits.length <= 2) {
    const num = parseInt(digits, 10);
    // Si escribió un número mayor a 23 (ej: 83, 45, 90), el primer dígito es la hora
    if (num > 23 && digits.length === 2) {
      const h = isBlur ? '0' + digits[0] : digits[0];
      return `${h}:${digits[1]}`;
    }
    if (isBlur && digits.length >= 1) {
      const h = digits.length === 1 ? '0' + digits : digits;
      return `${h}:00`;
    }
    return digits;
  }

  // 3 dígitos (ej: "830" -> "08:30", "123" -> "12:3")
  if (digits.length === 3) {
    const firstDigit = parseInt(digits[0], 10);
    // Si empieza con 3 a 9 (ej: 830, 715), es hora de 1 dígito
    if (firstDigit > 2) {
      const h = isBlur ? '0' + digits[0] : digits[0];
      return `${h}:${digits.slice(1, 3)}`;
    }
    // Si empieza con 0, 1 o 2 (ej: "123" mientras escribe 12:30)
    if (isBlur) {
      const firstTwo = parseInt(digits.slice(0, 2), 10);
      if (firstTwo > 12) {
        return `${digits.slice(0, 2)}:${digits[2]}0`;
      }
      return `0${digits[0]}:${digits.slice(1, 3)}`;
    }
    return `${digits.slice(0, 2)}:${digits[2]}`;
  }

  // 4 dígitos o más (ej: "1230" -> "12:30", "2000" -> "20:00", "0830" -> "08:30")
  if (digits.length >= 4) {
    const h = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    return `${h}:${m}`;
  }

  return digits;
}

export function setupTimeMask(inputEl, onChangeCallback) {
  if (!inputEl) return;

  inputEl.addEventListener('input', (e) => {
    // Si está borrando con Backspace o Delete, permitimos borrar sin forzar los dos puntos
    if (e.inputType && e.inputType.startsWith('delete')) {
      if (typeof onChangeCallback === 'function') {
        onChangeCallback(inputEl.value);
      }
      return;
    }

    const val = inputEl.value;
    const formatted = formatTimeInput(val, false);
    if (formatted !== val) {
      inputEl.value = formatted;
    }
    if (typeof onChangeCallback === 'function') {
      onChangeCallback(inputEl.value);
    }
  });

  inputEl.addEventListener('blur', () => {
    const val = inputEl.value;
    if (!val) return;
    const formatted = formatTimeInput(val, true);
    if (formatted !== val) {
      inputEl.value = formatted;
    }
    if (typeof onChangeCallback === 'function') {
      onChangeCallback(inputEl.value);
    }
  });
}

// Generador reusable del HTML del ticket térmico
export function generateTicketPreviewHtml(data) {
  const dateStr = data.dateStr || (data.date ? data.date.split('-').reverse().join('/') : new Date().toLocaleDateString('es-ES'));
  const correlativeNum = data.correlativeNum || data.id || 1;
  const custName = data.customerName || (data.customerInfo && data.customerInfo.name) || '';
  const custPhone = data.phone || (data.customerInfo && data.customerInfo.phone) || '';
  
  // 1. Obtener deliveryTime explícito o desde customerInfo
  let rawDeliveryTime = data.deliveryTime || (data.customerInfo && data.customerInfo.deliveryTime) || '';
  
  // 2. Si no hay deliveryTime explícito (ej: órdenes guardadas antes del fix como orden #175)
  // pero la orden tiene un tiempo guardado y cliente registrado, usar data.time como hora de entrega
  if (!rawDeliveryTime && data.time && custName && custName.toLowerCase() !== 'cliente mostrador') {
    rawDeliveryTime = data.time;
  }

  const deliveryTime = formatDeliveryTime(rawDeliveryTime);
  const timeStr = data.timeStr || data.orderTime || (rawDeliveryTime && rawDeliveryTime === data.time ? '' : data.time) || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const vendorName = data.vendedor || (data.customerInfo && data.customerInfo.vendedor) || '';
  const total = Number(data.total) || 0;

  let itemsHtml = '';
  if (Array.isArray(data.cartItems) && data.cartItems.length > 0) {
    itemsHtml = data.cartItems.map(item => `
      <div class="ticket-row text-sm mb-1">
        <span class="flex-1 font-black text-black break-words pr-2">${item.quantity}x ${item.name}</span>
        <span class="font-black text-black shrink-0">Q${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</span>
      </div>
      ${item.description ? `<div class="item-description mb-2 pl-4 leading-tight">${item.description}</div>` : ''}
    `).join('');
  } else if (Array.isArray(data.cart) && data.cart.length > 0) {
    itemsHtml = data.cart.map(item => `
      <div class="ticket-row text-sm mb-1">
        <span class="flex-1 font-black text-black break-words pr-2">${item.quantity}x ${item.name}</span>
        <span class="font-black text-black shrink-0">Q${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      ${item.description ? `<div class="item-description mb-2 pl-4 leading-tight">${item.description}</div>` : ''}
    `).join('');
  } else if (data.items) {
    const list = String(data.items).split(', ');
    itemsHtml = list.map(itemStr => `
      <div class="ticket-row text-sm mb-1">
        <span class="flex-1 font-black text-black break-words pr-2">${itemStr}</span>
      </div>
    `).join('');
  }

  return `
    <div id="ticket-preview" class="ticket-container ticket-sawtooth bg-white shadow-2xl rounded-t-xl text-black">
      <div class="ticket-header space-y-0.5">
        <h2 class="text-xl font-bold uppercase tracking-tighter">Comedor Donde Flory</h2>
        <p class="ticket-info">Sabor Casero y Profesional</p>
        <p class="ticket-info">4ta. Calle 4-69 Zona 1</p>
        <p class="ticket-info">Tel: 4259-7488</p>
        <div class="py-1 border-y border-slate-200 mt-2 flex justify-center text-center ticket-meta">
          <span>FECHA: ${dateStr} ${timeStr}</span>
        </div>
      </div>
      
      <div class="ticket-number-container">
        <div class="ticket-number-box">
          No. ${correlativeNum}
        </div>
      </div>
      
      ${(custName || custPhone || deliveryTime || vendorName) ? `
        <div class="mb-4 text-sm space-y-2 bg-slate-50 p-3 rounded border border-slate-200 customer-section">
          ${custName ? `<p class="customer-data"><span class="label">CLIENTE:</span> <span class="value font-black">${custName.toUpperCase()}</span></p>` : ''}
          ${custPhone ? `<p class="customer-data phone-data whitespace-nowrap"><span class="label">Tel.:</span> <span class="value font-black text-2xl">${custPhone}</span></p>` : ''}
          ${deliveryTime ? `<p class="customer-data delivery-data"><span class="label">HORA DE ENTREGA:</span> <span class="value font-black text-2xl">${deliveryTime}</span></p>` : ''}
          ${vendorName ? `<p class="customer-data"><span class="label">VENDEDOR:</span> <span class="value font-black">${vendorName.toUpperCase()}</span></p>` : ''}
        </div>
        <div class="border-b-2 border-dashed border-slate-200 mb-4 print-hidden"></div>
      ` : ''}

      <div class="space-y-2 mb-4 items-list">
        ${itemsHtml}
      </div>

      <div class="border-t-2 border-black pt-3 mt-4 space-y-2">
        <div class="flex items-end gap-2 total-section">
          <span class="text-sm font-bold uppercase label">TOTAL A PAGAR:</span>
          <span class="text-2xl font-black value">Q${total.toFixed(2)}</span>
        </div>
      </div>

      <div class="payment-checkboxes">
        <div class="payment-col">
          <div class="checkbox-row">
            <span class="checkbox-box"></span>
            <span class="payment-line"></span>
          </div>
          <span class="payment-label">Efect.</span>
        </div>
        <div class="payment-col">
          <div class="checkbox-row">
            <span class="checkbox-box"></span>
            <span class="payment-line"></span>
          </div>
          <span class="payment-label">Transf.</span>
        </div>
        <div class="payment-col">
          <div class="checkbox-row">
            <span class="checkbox-box"></span>
            <span class="payment-line"></span>
          </div>
          <span class="payment-label">Tarj.</span>
        </div>
      </div>

      <div class="ticket-footer space-y-2 mt-4">
        <p class="font-bold">¡Buen provecho!</p>
        <p>Gracias por su preferencia</p>
      </div>
    </div>
  `;
}

// Imprimir un ticket específico en la impresora Xprinter
export function printTicketForSale(sale, isAuto = false) {
  const container = document.getElementById('silent-print-container');
  if (!container) return;

  // Asegurar que cualquier modal esté cerrado para no interferir en la impresión
  if (modalOverlay) {
    modalOverlay.classList.add('hidden');
  }

  container.innerHTML = generateTicketPreviewHtml(sale);
  container.classList.remove('hidden');

  if (isAuto) {
    playNotificationChime();
    showAutoPrintToast(sale);
  }

  markSaleAsPrinted(sale.id);

  try {
    window.print();
  } catch (err) {
    console.error('Error al imprimir ticket:', err);
  }

  const cleanup = () => {
    container.classList.add('hidden');
    container.innerHTML = '';
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 2500);
}

window.reprintTicket = function(saleId) {
  const sales = getSales();
  const sale = sales.find(s => Number(s.id) === Number(saleId));
  if (sale) {
    printTicketForSale(sale, false);
  } else {
    alert(`No se encontró la venta #${saleId}`);
  }
};

window.requestPrintInCaja = function(saleId, event) {
  const reqTime = Date.now();
  dbUpdateSaleProperty(saleId, 'printRequested', reqTime);
  const btn = event?.currentTarget;
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>✅</span> ¡Enviado!';
    btn.classList.add('bg-emerald-800', 'text-white', 'border-emerald-400');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('bg-emerald-800', 'text-white', 'border-emerald-400');
    }, 3000);
  }
  showReportToast(`🖨️ Pedido #${saleId} enviado a la computadora de caja`);
};

window.smartPrintSale = function(saleId, event) {
  const isTouchDevice = typeof window !== 'undefined' && (
    window.innerWidth < 1024 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );

  if (isTouchDevice) {
    // Si estamos en tablet o teléfono, mandar la orden de impresión automática a caja
    window.requestPrintInCaja(saleId, event);
  } else {
    // Si estamos en la computadora de caja, imprimir directamente en la Xprinter
    const sales = getSales();
    const sale = sales.find(s => Number(s.id) === Number(saleId));
    if (sale) {
      printTicketForSale(sale, false);
      const btn = event?.currentTarget;
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>✅</span> Imprimiendo...';
        btn.classList.add('bg-emerald-800', 'text-white', 'border-emerald-400');
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.remove('bg-emerald-800', 'text-white', 'border-emerald-400');
        }, 2500);
      }
    }
  }
};

const printQueue = [];
let isPrintingQueue = false;

function enqueueSalePrint(sale, isAuto = true) {
  markSaleAsPrinted(sale.id);
  printQueue.push({ sale, isAuto });
  processPrintQueue();
}

function processPrintQueue() {
  if (isPrintingQueue || printQueue.length === 0) return;
  isPrintingQueue = true;
  const item = printQueue.shift();
  printTicketForSale(item.sale, item.isAuto);
  setTimeout(() => {
    isPrintingQueue = false;
    processPrintQueue();
  }, 2600);
}

const handledPrintRequestTokens = new Set();
function getPrintRequestToken(sale) {
  return `${sale.id}_${sale.printRequested}`;
}

function checkAutoPrintQueue(sales) {
  if (!Array.isArray(sales)) return;
  if (!hasInitializedPrintedCache) {
    initPrintedSalesCache();
    sales.forEach(s => {
      if (s && s.printRequested) {
        const isRecent = (Date.now() - Number(s.printRequested)) < 5 * 60 * 1000;
        if (!isRecent) {
          handledPrintRequestTokens.add(getPrintRequestToken(s));
        }
      }
    });
  }

  const isEnabled = localStorage.getItem('flory_autoprint_enabled') !== 'false';
  const printedIds = getPrintedSaleIds();
  const myDeviceId = getDeviceId();
  const now = Date.now();
  const today = getTodayKey();
  const clearedAt = Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0;

  for (const sale of sales) {
    const saleId = Number(sale.id);
    const saleTime = sale.updatedAt ? new Date(sale.updatedAt).getTime() : 0;

    // Escudo 1: Si la orden fue creada antes del último borrado de hoy, NUNCA imprimir
    if (clearedAt > 0 && saleTime > 0 && saleTime <= clearedAt) {
      markSaleAsPrinted(saleId);
      continue;
    }

    // Caso 1: Solicitud manual o explícita de impresión remota desde tablet / celular / vendedor
    if (sale.printRequested && Number(sale.printRequested) > 0) {
      const isRecentReq = (now - Number(sale.printRequested)) < 5 * 60 * 1000;
      const token = getPrintRequestToken(sale);
      if (!handledPrintRequestTokens.has(token)) {
        handledPrintRequestTokens.add(token);
        if (isRecentReq) {
          // Imprimir en la computadora con Xprinter de inmediato
          enqueueSalePrint(sale, true);
        } else {
          markSaleAsPrinted(saleId);
        }
        continue;
      }
    }

    // Caso 2: Nueva orden entrante creada en otro dispositivo (tablet, mesero, celular)
    if (!printedIds.has(saleId)) {
      // Escudo 2: Solo auto-imprimir si es una orden fresca creada en los últimos 5 minutos
      const isFreshOrder = saleTime ? (now - saleTime < 5 * 60 * 1000) : false;
      if (isEnabled && (!sale.sourceDevice || sale.sourceDevice !== myDeviceId) && isFreshOrder) {
        enqueueSalePrint(sale, true);
      } else {
        markSaleAsPrinted(saleId);
      }
    }
  }
}

export function initAutoPrintToggle() {
  let isAutoPrintEnabled = localStorage.getItem('flory_autoprint_enabled');
  if (isAutoPrintEnabled === null) {
    isAutoPrintEnabled = 'true';
    localStorage.setItem('flory_autoprint_enabled', isAutoPrintEnabled);
  }

  const updateUI = () => {
    const btn = document.getElementById('toggle-autoprint-btn');
    const ind = document.getElementById('autoprint-indicator');
    const txt = document.getElementById('autoprint-text');
    const txtSm = document.getElementById('autoprint-text-sm');
    if (!btn) return;

    const active = localStorage.getItem('flory_autoprint_enabled') === 'true';
    if (active) {
      btn.className = 'hidden md:flex text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 sm:px-3 py-1.5 rounded-md hover:bg-emerald-500/30 transition-all items-center gap-1.5 shadow-sm active:scale-95';
      if (ind) ind.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      if (txt) txt.textContent = '🖨️ AUTO-PRINT: ON';
      if (txtSm) txtSm.textContent = '🖨️ ON';
      btn.title = 'Auto-impresión en caja ACTIVADA. Los pedidos de tablets/celulares saldrán automáticamente en la Xprinter.';
    } else {
      btn.className = 'hidden md:flex text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 sm:px-3 py-1.5 rounded-md hover:bg-slate-700 hover:text-white transition-all items-center gap-1.5 shadow-sm active:scale-95';
      if (ind) ind.className = 'w-2 h-2 rounded-full bg-slate-500';
      if (txt) txt.textContent = '🖨️ AUTO-PRINT: OFF';
      if (txtSm) txtSm.textContent = '🖨️ OFF';
      btn.title = 'Auto-impresión en caja DESACTIVADA. Toca para activarla.';
    }
  };

  updateUI();

  const btn = document.getElementById('toggle-autoprint-btn');
  if (btn) {
    btn.onclick = () => {
      const current = localStorage.getItem('flory_autoprint_enabled') === 'true';
      const next = !current;
      localStorage.setItem('flory_autoprint_enabled', next ? 'true' : 'false');
      updateUI();
      // Desbloquear audio con el primer click
      playNotificationChime();
      showReportToast(next ? '🖨️ Auto-impresión en Xprinter ACTIVADA' : '⏸️ Auto-impresión en Xprinter PAUSADA');
    };
  }
}

function syncCustomerInputs() {
  const elTime = document.getElementById('customer-time');
  if (elTime && elTime.value) customerInfo.deliveryTime = elTime.value;
  const elName = document.getElementById('customer-name');
  if (elName && elName.value) customerInfo.name = elName.value.trim();
  const elPhone = document.getElementById('customer-phone');
  if (elPhone && elPhone.value) customerInfo.phone = elPhone.value.trim();
  const elVendedor = document.getElementById('customer-vendedor');
  if (elVendedor && elVendedor.value) customerInfo.vendedor = elVendedor.value;
  const elPago = document.getElementById('customer-pago');
  if (elPago && elPago.value) customerInfo.pago = elPago.value;
}

function openTicketModal() {
  syncCustomerInputs();

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES');
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const sales = getSales();
  const correlativeNum = sales.length > 0 ? Math.max(...sales.map(s => s.id || 0)) + 1 : 1;

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const ticketContentHtml = generateTicketPreviewHtml({
    dateStr,
    timeStr,
    correlativeNum,
    customerInfo,
    deliveryTime: customerInfo.deliveryTime,
    cart,
    total
  });

  modalOverlay.innerHTML = `
    <div class="flex flex-col items-center gap-6 animate-scale-in w-full max-w-sm mx-auto my-12">
      ${ticketContentHtml}

      <div class="flex flex-col gap-2 w-full">
        <!-- Botón para enviar la orden a caja y que la computadora imprima automáticamente -->
        <button id="send-caja-btn" class="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 active:scale-95 text-base border border-emerald-400/30">
          <span class="text-xl">🚀</span> Enviar Orden a Caja (Auto-Imprimir)
        </button>
        <button id="print-rawbt-btn" class="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
          ⚡ Imprimir (Directo Xprinter/RawBT)
        </button>
        <div class="flex gap-3 w-full">
          <button id="close-ticket-btn" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all">
            Cerrar
          </button>
          <button id="print-ticket-btn" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
            Imprimir (Sistema)
          </button>
        </div>
        <button id="copy-ticket-btn" class="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
          Copiar Ticket
        </button>
        <span class="text-center text-[10px] text-slate-500 mt-1">Soporte Xprinter v2.6 &bull; Auto-Print Activo</span>
      </div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');

  const btnSendCaja = document.getElementById('send-caja-btn');
  if (btnSendCaja) {
    btnSendCaja.onclick = () => {
      syncCustomerInputs();
      const saved = saveSale(total, true);
      cart = [];
      updateCartUI();
      resetCustomerInfo();
      modalOverlay.classList.add('hidden');
      showReportToast(`🚀 ¡Orden #${saved.id} enviada! Imprimiéndose en la computadora de caja...`);
    };
  }

  document.getElementById('close-ticket-btn').onclick = () => modalOverlay.classList.add('hidden');

  document.getElementById('print-rawbt-btn').onclick = () => {
    syncCustomerInputs();
    const ticketText = copyTicketText(true);
    saveSale(total);
    
    // Base64 encode for RawBT text mode
    const base64Text = btoa(unescape(encodeURIComponent(ticketText)));
    
    // Construct Android Chrome Intent URL for plain text printing in RawBT
    const intentUrl = `intent:data:text/plain;base64,${base64Text}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    window.location.href = intentUrl;
    
    cart = [];
    updateCartUI();
    resetCustomerInfo();
    modalOverlay.classList.add('hidden');
  };

  document.getElementById('print-ticket-btn').onclick = () => {
    syncCustomerInputs();
    const saved = saveSale(total);
    cart = [];
    updateCartUI();
    resetCustomerInfo();
    modalOverlay.classList.add('hidden');
    printTicketForSale(saved, false);
  };

  document.getElementById('copy-ticket-btn').onclick = (e) => {
    syncCustomerInputs();
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

function copyTicketText(returnOnly = false) {
  syncCustomerInputs();
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES');
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const sales = getSales();
  const correlativeNum = sales.length > 0 ? Math.max(...sales.map(s => s.id || 0)) + 1 : 1;
  const ticketId = Math.random().toString(36).substr(2, 9).toUpperCase();

  // Helper for word wrapping
  const wrapText = (text, maxLength) => {
    if (!text) return [""];
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

  // Centered boxed correlative number for ticket
  const numText = `No. ${correlativeNum}`;
  const boxWidth = numText.length + 4; // padding & border characters
  const boxPadding = " ".repeat(Math.max(0, Math.floor((width - boxWidth) / 2)));
  text += `${boxPadding}┌${'─'.repeat(boxWidth - 2)}┐\n`;
  text += `${boxPadding}│ ${numText} │\n`;
  text += `${boxPadding}└${'─'.repeat(boxWidth - 2)}┘\n\n`;

  // Customer info - if available with a nice box
  const delTime = customerInfo.deliveryTime ? formatDeliveryTime(customerInfo.deliveryTime) : '';
  if (customerInfo.name || customerInfo.phone || delTime) {
    text += `┌${'─'.repeat(width - 2)}┐\n`;
    if (customerInfo.name) {
      const wrappedName = wrapText(customerInfo.name.toUpperCase(), width - 13);
      text += `│ CLIENTE: ${wrappedName[0].padEnd(width - 13, ' ')} │\n`;
      for (let i = 1; i < wrappedName.length; i++) {
        text += `│          ${wrappedName[i].padEnd(width - 13, ' ')} │\n`;
      }
    }
    if (customerInfo.phone) {
      text += `│ TEL:     ${customerInfo.phone.padEnd(width - 13, ' ')} │\n`;
    }
    if (delTime) {
      text += `│ ENTREGA: ${delTime.padEnd(width - 13, ' ')} │\n`;
    }
    text += `└${'─'.repeat(width - 2)}┘\n`;
  } else {
    // If no customer info, add a small spacer or just continue
    // text += `\n`; 
  }

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
  text += `${separator}\n`;

  // Payment checklists in plain text
  text += `[ ] ____   [ ] ____   [ ] ____\n`;
  text += ` Efect.    Transf.     Tarj.\n`;
  text += `${separator}\n\n`; // Keep some space at very bottom for tearing

  // Footer
  text += '¡Buen provecho!\n';
  text += 'Gracias por su preferencia\n\n\n'; // Feed paper


  if (!returnOnly) {
    navigator.clipboard.writeText(text);
  }
  return text;
}

function resetCustomerInfo() {
  customerInfo = {
    name: '',
    phone: '',
    deliveryTime: '',
    vendedor: '',
    pago: 'EFECTIVO'
  };
  const elName = document.getElementById('customer-name');
  const elPhone = document.getElementById('customer-phone');
  const elTime = document.getElementById('customer-time');
  const elVendedor = document.getElementById('customer-vendedor');
  const elPago = document.getElementById('customer-pago');
  const clearBtn = document.getElementById('customer-clear-btn');
  const suggestionsBox = document.getElementById('customer-suggestions');

  if (elName) elName.value = '';
  if (elPhone) elPhone.value = '';
  if (elTime) elTime.value = '';
  if (elVendedor) elVendedor.value = '';
  if (elPago) elPago.value = 'EFECTIVO';
  if (clearBtn) clearBtn.classList.add('hidden');
  if (suggestionsBox) {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
  }
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

// --- Sistema de Autocompletado Inteligente de Clientes ---

function setupCustomerAutocomplete() {
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const suggestionsBox = document.getElementById('customer-suggestions');
  const clearBtn = document.getElementById('customer-clear-btn');

  if (!nameInput || !suggestionsBox) return;

  let highlightedIndex = -1;
  let currentMatches = [];

  const updateSuggestionsPosition = () => {
    if (!suggestionsBox || suggestionsBox.classList.contains('hidden')) return;
    const rect = nameInput.getBoundingClientRect();
    suggestionsBox.style.top = `${rect.bottom + 6}px`;
    suggestionsBox.style.left = `${Math.max(8, rect.left)}px`;
    suggestionsBox.style.width = `${Math.min(window.innerWidth - 16, Math.max(rect.width, 320))}px`;
  };

  window.addEventListener('resize', updateSuggestionsPosition);
  window.addEventListener('scroll', updateSuggestionsPosition, true);

  const hideSuggestions = () => {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
    highlightedIndex = -1;
    currentMatches = [];
  };

  const selectCustomer = (client) => {
    if (!client) return;
    nameInput.value = client.name;
    customerInfo.name = client.name;

    if (client.phone && client.phone !== '-') {
      const formatted = formatPhoneNumber(client.phone);
      if (phoneInput) {
        phoneInput.value = formatted;
        phoneInput.classList.add('ring-2', 'ring-emerald-500/80');
        setTimeout(() => phoneInput.classList.remove('ring-2', 'ring-emerald-500/80'), 1500);
      }
      customerInfo.phone = formatted;
    }

    if (clearBtn) clearBtn.classList.remove('hidden');

    hideSuggestions();
  };

  const renderSuggestions = (matches, query) => {
    currentMatches = matches;
    highlightedIndex = -1;

    if (matches.length === 0) {
      hideSuggestions();
      return;
    }

    updateSuggestionsPosition();

    const qLower = query.toLowerCase().trim();

    suggestionsBox.innerHTML = `
      <div class="p-2.5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between text-[11px] text-slate-400">
        <span class="font-bold flex items-center gap-1 text-amber-400">
          <span>👥</span> ${matches.length} ${matches.length === 1 ? 'cliente encontrado' : 'clientes coincidentes'}:
        </span>
        <span class="text-[10px] text-slate-500">Toca para autocompletar</span>
      </div>
      <div class="divide-y divide-slate-800/80">
        ${matches.map((c, idx) => {
          let displayName = c.name;
          const matchPos = c.name.toLowerCase().indexOf(qLower);
          if (matchPos !== -1 && qLower.length > 0) {
            const before = c.name.slice(0, matchPos);
            const match = c.name.slice(matchPos, matchPos + qLower.length);
            const after = c.name.slice(matchPos + qLower.length);
            displayName = `${before}<span class="text-amber-400 underline font-black decoration-amber-400/80">${match}</span>${after}`;
          }

          const phoneDisplay = c.phone && c.phone !== '-'
            ? `<span class="text-emerald-400 font-semibold flex items-center gap-1">📞 ${c.phone}</span>`
            : `<span class="text-slate-500 italic text-[11px]">Sin teléfono</span>`;

          return `
            <div 
              class="customer-suggestion-item px-3.5 py-2.5 hover:bg-slate-800/90 active:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
              data-index="${idx}"
            >
              <div class="min-w-0 flex-1">
                <div class="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 truncate">
                  👤 ${displayName}
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  ${phoneDisplay}
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button 
                  type="button" 
                  class="select-btn text-[11px] font-bold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-600 hover:text-white border border-emerald-700/70 px-2.5 py-1 rounded-lg transition-all active:scale-95"
                  data-index="${idx}"
                >
                  Elegir
                </button>
                <button 
                  type="button" 
                  class="delete-btn text-[11px] font-bold text-rose-400 bg-rose-950/50 hover:bg-rose-600 hover:text-white border border-rose-800/70 px-2 py-1 rounded-lg transition-all active:scale-95"
                  data-name="${encodeURIComponent(c.name)}"
                  title="Eliminar este cliente del directorio"
                >
                  ✕ Eliminar
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    suggestionsBox.classList.remove('hidden');

    suggestionsBox.querySelectorAll('.customer-suggestion-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) return;
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(item.dataset.index, 10);
        selectCustomer(currentMatches[idx]);
      });
    });

    suggestionsBox.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetName = decodeURIComponent(btn.dataset.name);
        if (confirm(`¿Deseas eliminar a "${targetName}" del directorio de clientes?`)) {
          deleteCustomer(targetName);
          showReportActionToast(`Cliente "${targetName}" eliminado`);
          const val = nameInput.value.trim();
          const updatedMatches = searchCustomers(val);
          renderSuggestions(updatedMatches, val);
        }
      });
    });
  };

  // Evento Input en Cliente
  nameInput.addEventListener('input', (e) => {
    const val = e.target.value;
    customerInfo.name = val;

    if (clearBtn) {
      if (val.trim()) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    if (!val || val.trim().length < 1) {
      hideSuggestions();
      return;
    }

    const matches = searchCustomers(val.trim());
    renderSuggestions(matches, val.trim());
  });

  // Mostrar sugerencias al hacer focus si ya hay texto
  nameInput.addEventListener('focus', () => {
    const val = nameInput.value.trim();
    if (val.length >= 1) {
      const matches = searchCustomers(val);
      renderSuggestions(matches, val);
    }
  });

  // Teclado (Flechas, Enter y Tab para navegar y autocompletar)
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (!e.shiftKey) {
        e.preventDefault(); // Evita siempre que el cursor salte a la 'X' o a otro elemento

        const hasSuggestions = !suggestionsBox.classList.contains('hidden') && currentMatches.length > 0;
        if (hasSuggestions) {
          if (highlightedIndex >= 0 && highlightedIndex < currentMatches.length) {
            selectCustomer(currentMatches[highlightedIndex]);
          } else if (currentMatches.length === 1) {
            selectCustomer(currentMatches[0]);
          }
        }
        
        hideSuggestions();
        customerInfo.name = nameInput.value.trim();

        // Salta directamente al espacio del número de teléfono (incluso si el cliente es nuevo / no existe)
        if (phoneInput) {
          phoneInput.focus();
        }
      } else {
        hideSuggestions();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const hasSuggestions = !suggestionsBox.classList.contains('hidden') && currentMatches.length > 0;
      if (hasSuggestions) {
        if (highlightedIndex >= 0 && highlightedIndex < currentMatches.length) {
          selectCustomer(currentMatches[highlightedIndex]);
        } else if (currentMatches.length === 1) {
          selectCustomer(currentMatches[0]);
        }
      }
      hideSuggestions();
      customerInfo.name = nameInput.value.trim();
      if (phoneInput) {
        phoneInput.focus();
      }
      return;
    }

    if (suggestionsBox.classList.contains('hidden') || currentMatches.length === 0) return;

    const items = suggestionsBox.querySelectorAll('.customer-suggestion-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % items.length;
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
      updateHighlight(items);
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  function updateHighlight(items) {
    items.forEach((it, idx) => {
      if (idx === highlightedIndex) {
        it.classList.add('bg-slate-800', 'border-l-4', 'border-amber-400');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('bg-slate-800', 'border-l-4', 'border-amber-400');
      }
    });
  }

  // Búsqueda inversa: si el usuario escribe un teléfono ya conocido
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      const raw = e.target.value.replace(/\D/g, '');
      if (raw.length === 8 && (!nameInput.value || nameInput.value.trim() === '')) {
        const matches = searchCustomers(raw);
        if (matches.length > 0) {
          selectCustomer(matches[0]);
        }
      }
    });
  }

  // Botón Limpiar Cliente
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      customerInfo.name = '';
      customerInfo.phone = '';
      clearBtn.classList.add('hidden');
      hideSuggestions();
      nameInput.focus();
    });
  }

  // Cerrar sugerencias al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!nameInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      hideSuggestions();
    }
  });
}

// --- Event Listeners ---

function setupEventListeners() {
  // Inicializar autocompletado inteligente de clientes
  setupCustomerAutocomplete();

  // Phone with auto-formatting
  const phoneInput = document.getElementById('customer-phone');
  if (phoneInput) {
    phoneInput.oninput = (e) => {
      const formatted = formatPhoneNumber(e.target.value);
      e.target.value = formatted;
      customerInfo.phone = formatted;
    };
  }

  const elTime = document.getElementById('customer-time');
  if (elTime) {
    setupTimeMask(elTime, (val) => {
      customerInfo.deliveryTime = val;
    });
  }

  const elVendedor = document.getElementById('customer-vendedor');
  if (elVendedor) elVendedor.onchange = (e) => customerInfo.vendedor = e.target.value;

  const elPago = document.getElementById('customer-pago');
  if (elPago) {
    elPago.onchange = (e) => customerInfo.pago = e.target.value;
    elPago.oninput = (e) => customerInfo.pago = e.target.value;
  }

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

  const vendorsLinkBtn = document.getElementById('vendors-link-btn');
  if (vendorsLinkBtn) vendorsLinkBtn.onclick = openShareVendorsModal;

  initAutoPrintToggle();

  if (mobileCartBtn && cartSidebar) {
    mobileCartBtn.onclick = () => cartSidebar.classList.remove('hidden');
  }
  
  if (closeCartMobileBtn && cartSidebar) {
    closeCartMobileBtn.onclick = () => cartSidebar.classList.add('hidden');
  }

  // Close modal on background click (except if report modal is open to avoid accidental close while editing on phones)
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) {
      if (document.getElementById('report-table-body') || document.getElementById('report-cards-container')) {
        return;
      }
      modalOverlay.classList.add('hidden');
    }
  };
}

// --- Reports ---

function saveSale(total, requestPrintInCaja = false) {
  syncCustomerInputs();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const deliveryTime = (customerInfo && customerInfo.deliveryTime) || '';
  const saleTime = deliveryTime || timeStr;

  const sale = addSale({
    date: getTodayKey(),
    time: saleTime,
    orderTime: timeStr,
    deliveryTime: deliveryTime,
    customerName: customerInfo.name || 'Cliente Mostrador',
    phone: customerInfo.phone || '-',
    vendedor: (customerInfo.vendedor && customerInfo.vendedor !== '-') ? customerInfo.vendedor : '',
    pago: (customerInfo.pago && customerInfo.pago !== '-') ? customerInfo.pago : 'EFECTIVO',
    total: total,
    items: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
    cartItems: cart.map(i => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      description: i.description || ''
    })),
    sourceDevice: getDeviceId(),
    printRequested: requestPrintInCaja ? Date.now() : 0
  });

  // Marcar como ya procesado localmente en esta pestaña/equipo si no se pidió autoimpresión inmediata por cola
  if (sale && sale.id && !requestPrintInCaja) {
    markSaleAsPrinted(sale.id);
  }

  return sale;
}

function getPaymentSelectStyle(pago) {
  const norm = normalizePayment(pago);
  switch (norm) {
    case 'EFECTIVO':
      return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 shadow-emerald-950/50';
    case 'TRANSFERENCIA':
      return 'bg-sky-950/90 text-sky-300 border-sky-500/80 shadow-sky-950/50';
    case 'TARJETA':
      return 'bg-purple-950/90 text-purple-300 border-purple-500/80 shadow-purple-950/50';
    case 'NO PAGO':
      return 'bg-red-950/90 text-red-300 border-red-500/80 shadow-red-950/50';
    default:
      return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 shadow-emerald-950/50';
  }
}

function showReportToast(message) {
  let toast = document.getElementById('report-action-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'report-action-toast';
    toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-slate-900/95 text-white px-5 py-3 rounded-2xl border border-emerald-500/60 shadow-2xl shadow-black text-xs sm:text-sm font-bold flex items-center gap-2 backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 -translate-y-4';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span>⚡</span> ${message}`;
  toast.classList.remove('opacity-0', '-translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__reportActionToastTimer);
  window.__reportActionToastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-4');
  }, 2200);
}

function renderReportContent(sales, textFilter = '', vendorFilter = '', customerFilter = '') {
  let filteredSales = sales;
  
  if (vendorFilter) {
    filteredSales = filteredSales.filter(s => normalizeVendor(s.vendedor) === vendorFilter);
  }
  
  if (textFilter) {
    filteredSales = filteredSales.filter(s => (s.items || '').toLowerCase().includes(textFilter.toLowerCase()));
  }

  if (customerFilter) {
    filteredSales = filteredSales.filter(s => (s.customerName || '').toLowerCase().includes(customerFilter.toLowerCase()));
  }

  let totalDia = 0;
  let totalEfectivo = 0;
  let totalTransferencia = 0;
  let totalTarjeta = 0;
  let totalNoPago = 0;
  let cantidadFiltrada = 0;

  const tableRows = filteredSales.map(sale => {
    const saleTotal = Number(sale.total) || 0;
    const pagoNorm = normalizePayment(sale.pago);
    const vendNorm = normalizeVendor(sale.vendedor);

    totalDia += saleTotal;
    if (pagoNorm === 'EFECTIVO') totalEfectivo += saleTotal;
    else if (pagoNorm === 'TRANSFERENCIA') totalTransferencia += saleTotal;
    else if (pagoNorm === 'TARJETA') totalTarjeta += saleTotal;
    else if (pagoNorm === 'NO PAGO') totalNoPago += saleTotal;
    else totalEfectivo += saleTotal;

    if (textFilter) {
      const itemsArray = (sale.items || '').split(', ');
      itemsArray.forEach(item => {
        if (item.toLowerCase().includes(textFilter.toLowerCase())) {
          const match = item.match(/^(\d+)x/);
          if (match) {
            cantidadFiltrada += parseInt(match[1], 10);
          }
        }
      });
    }

    const cleanPhone = sale.phone ? String(sale.phone).replace(/[^0-9]/g, '') : '';
    const phoneHtml = cleanPhone && cleanPhone.length >= 8
      ? `<a href="tel:${cleanPhone}" class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">📞 ${sale.phone}</a>`
      : `<span class="text-slate-500 text-xs">${sale.phone || '-'}</span>`;

    return `
      <tr id="report-row-${sale.id}" class="report-table-row border-b border-slate-800 hover:bg-slate-800/60 transition-colors cursor-pointer select-text">
        <td class="px-2 py-2.5 text-center font-mono font-bold text-amber-400 whitespace-nowrap text-xs">#${sale.id}</td>
        <td class="px-2 py-2.5 font-semibold text-white text-xs sm:text-sm whitespace-nowrap max-w-[140px] truncate" title="${sale.customerName || 'Cliente Mostrador'}">${sale.customerName || 'Cliente Mostrador'}</td>
        <td class="px-2 py-2.5 text-center whitespace-nowrap">${phoneHtml}</td>
        <td class="px-2 py-2.5 text-center whitespace-nowrap">
          <input 
            type="text" 
            id="report-delivery-${sale.id}"
            value="${sale.deliveryTime || (sale.customerName && sale.customerName.toLowerCase() !== 'cliente mostrador' ? sale.time : '') || ''}" 
            placeholder="00:00" 
            title="Hora de entrega (puedes editarla aquí directamente)"
            oninput="window.handleReportTimeInput(this, event)"
            onblur="window.handleReportTimeBlur(this, ${sale.id})"
            class="w-16 sm:w-20 text-center text-xs font-mono font-bold py-1 px-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm cursor-text"
          />
        </td>
        <td class="px-2 py-2.5 text-xs italic text-slate-300 min-w-[120px] max-w-[180px] leading-tight break-words">${sale.items || '-'}</td>
        <td class="px-2 py-2.5 text-center whitespace-nowrap">
          <select 
            id="report-pago-${sale.id}"
            onchange="window.updateSaleProperty(${sale.id}, 'pago', this.value, this)" 
            class="text-xs font-bold py-1.5 px-2 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm ${getPaymentSelectStyle(pagoNorm)}"
          >
            <option value="EFECTIVO" ${pagoNorm === 'EFECTIVO' ? 'selected' : ''}>💵 EFECTIVO</option>
            <option value="TRANSFERENCIA" ${pagoNorm === 'TRANSFERENCIA' ? 'selected' : ''}>📲 TRANSF.</option>
            <option value="TARJETA" ${pagoNorm === 'TARJETA' ? 'selected' : ''}>💳 TARJETA</option>
            <option value="NO PAGO" ${pagoNorm === 'NO PAGO' ? 'selected' : ''}>❌ NO PAGÓ</option>
          </select>
        </td>
        <td class="px-2 py-2.5 text-center whitespace-nowrap">
          <select 
            id="report-vendor-${sale.id}"
            onchange="window.updateSaleProperty(${sale.id}, 'vendedor', this.value, this)" 
            class="text-xs font-bold py-1.5 px-2 rounded-xl bg-slate-900 border border-slate-700 text-blue-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm max-w-[125px]"
          >
            <option value="" ${!vendNorm ? 'selected' : ''}>-- Sin Vendedor --</option>
            ${VENDEDORES.map(v => `<option value="${v}" ${vendNorm === v ? 'selected' : ''}>🛵 ${v}</option>`).join('')}
          </select>
        </td>
        <td class="px-2 py-2.5 text-right font-black text-amber-400 whitespace-nowrap text-sm font-sans">
          Q${saleTotal.toFixed(2)}
        </td>
        <td class="px-2 py-2.5 text-center whitespace-nowrap">
          <button type="button" onclick="window.smartPrintSale(${sale.id}, event)" title="Imprimir ticket (Automático en Xprinter)" class="py-1 px-2 rounded-lg bg-slate-800 hover:bg-emerald-900/60 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-600 transition-all text-xs active:scale-90 flex items-center justify-center gap-1 font-bold mx-auto">🖨️</button>
        </td>
      </tr>
    `;
  }).join('');

  const cardRows = filteredSales.map(sale => {
    const saleTotal = Number(sale.total) || 0;
    const pagoNorm = normalizePayment(sale.pago);
    const vendNorm = normalizeVendor(sale.vendedor);
    const cleanPhone = sale.phone ? String(sale.phone).replace(/[^0-9]/g, '') : '';
    const phoneActions = cleanPhone && cleanPhone.length >= 8 ? `
      <div class="flex items-center gap-2 mt-1.5">
        <a href="tel:${cleanPhone}" class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
          📞 Llamar
        </a>
        <a href="https://wa.me/502${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/50">
          💬 WhatsApp
        </a>
      </div>
    ` : '';

    return `
      <div id="report-card-${sale.id}" class="report-card-item bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg hover:border-slate-700 transition-all cursor-pointer">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                #${sale.id}
              </span>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="text-xs text-slate-400 font-medium">🛵 Entrega:</span>
                <input 
                  type="text" 
                  id="report-card-delivery-${sale.id}"
                  value="${sale.deliveryTime || (sale.customerName && sale.customerName.toLowerCase() !== 'cliente mostrador' ? sale.time : '') || ''}" 
                  placeholder="00:00" 
                  title="Hora de entrega (puedes editarla aquí)"
                  oninput="window.handleReportTimeInput(this, event)"
                  onblur="window.handleReportTimeBlur(this, ${sale.id})"
                  class="w-24 text-center text-xs font-mono font-bold py-0.5 px-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
            <h4 class="text-base font-bold text-white mt-1 leading-snug">
              ${sale.customerName || 'Cliente Mostrador'}
            </h4>
            ${phoneActions}
          </div>
          <div class="text-right shrink-0">
            <div class="text-xl font-black text-amber-400 font-sans">
              Q${saleTotal.toFixed(2)}
            </div>
            <div class="flex items-center justify-end mt-1">
              <button type="button" onclick="window.smartPrintSale(${sale.id}, event)" title="Imprimir ticket en la impresora Xprinter" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-700/80 transition-all active:scale-95 shadow-sm">
                <span>🖨️</span> Imprimir Ticket
              </button>
            </div>
          </div>
        </div>

        <div class="bg-slate-950/70 rounded-xl p-3 text-xs text-slate-300 border border-slate-800/80 leading-relaxed">
          <span class="text-slate-500 font-bold uppercase text-[10px] block mb-1">Platillos del pedido:</span>
          ${sale.items || 'Sin detalle especificado'}
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-800">
          <div>
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Forma de Pago:
            </label>
            <select 
              id="report-card-pago-${sale.id}"
              onchange="window.updateSaleProperty(${sale.id}, 'pago', this.value, this)"
              class="w-full text-xs sm:text-sm font-bold py-2.5 px-3 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm ${getPaymentSelectStyle(pagoNorm)}"
            >
              <option value="EFECTIVO" ${pagoNorm === 'EFECTIVO' ? 'selected' : ''}>💵 EFECTIVO</option>
              <option value="TRANSFERENCIA" ${pagoNorm === 'TRANSFERENCIA' ? 'selected' : ''}>📲 TRANSFERENCIA</option>
              <option value="TARJETA" ${pagoNorm === 'TARJETA' ? 'selected' : ''}>💳 TARJETA</option>
              <option value="NO PAGO" ${pagoNorm === 'NO PAGO' ? 'selected' : ''}>❌ NO PAGÓ</option>
            </select>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Vendedor:</span>
            <select 
              id="report-card-vendor-${sale.id}"
              onchange="window.updateSaleProperty(${sale.id}, 'vendedor', this.value, this)"
              class="flex-1 text-xs font-bold py-2 px-2.5 rounded-xl bg-slate-950 border border-slate-700 text-blue-300 cursor-pointer"
            >
              <option value="" ${!vendNorm ? 'selected' : ''}>-- Sin Vendedor --</option>
              ${VENDEDORES.map(v => `<option value="${v}" ${vendNorm === v ? 'selected' : ''}>🛵 ${v}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return { tableRows, cardRows, totalDia, totalEfectivo, totalTransferencia, totalTarjeta, totalNoPago, cantidadFiltrada, isEmpty: filteredSales.length === 0 };
}

function openReportModal() {
  window.renderReportModal();
}

window.updateSaleProperty = function(saleId, property, value, targetElement) {
  window.__isLocalReportUpdate = true;
  try {
    // 1. Guardar en base de datos local y sincronizar con la nube
    dbUpdateSaleProperty(saleId, property, value);

    // 2. Si es cambio de forma de pago y tenemos el elemento select, actualizar estilos en el DOM en tiempo real
    if (targetElement && property === 'pago') {
      targetElement.className = targetElement.className
        .replace(/bg-\S+/g, '')
        .replace(/text-\S+/g, '')
        .replace(/border-\S+/g, '')
        .replace(/shadow-\S+/g, '')
        .trim() + ` ${getPaymentSelectStyle(value)}`;

      // También sincronizar el otro select (tarjeta <-> tabla) si ambos existen
      const isCard = targetElement.id && targetElement.id.startsWith('report-card-pago-');
      const otherId = isCard ? `report-pago-${saleId}` : `report-card-pago-${saleId}`;
      const otherEl = document.getElementById(otherId);
      if (otherEl) {
        otherEl.value = value;
        otherEl.className = otherEl.className
          .replace(/bg-\S+/g, '')
          .replace(/text-\S+/g, '')
          .replace(/border-\S+/g, '')
          .replace(/shadow-\S+/g, '')
          .trim() + ` ${getPaymentSelectStyle(value)}`;
      }
    }

    // 3. Si es cambio de vendedor, sincronizar en ambos lados
    if (targetElement && property === 'vendedor') {
      const isCard = targetElement.id && targetElement.id.startsWith('report-card-vendor-');
      const otherVendorId = isCard ? `report-vendor-${saleId}` : `report-card-vendor-${saleId}`;
      const otherVendorEl = document.getElementById(otherVendorId);
      if (otherVendorEl) {
        otherVendorEl.value = value;
      }
    }

    // 4. Si es cambio de hora de entrega, sincronizar ambos inputs y actualizar 'time'
    if (property === 'deliveryTime') {
      dbUpdateSaleProperty(saleId, 'time', value);
      const isCard = targetElement && targetElement.id && targetElement.id.startsWith('report-card-delivery-');
      const otherId = isCard ? `report-delivery-${saleId}` : `report-card-delivery-${saleId}`;
      const otherEl = document.getElementById(otherId);
      if (otherEl) otherEl.value = value;
      if (targetElement) {
        targetElement.classList.add('border-emerald-500', 'text-emerald-300');
        setTimeout(() => targetElement.classList.remove('border-emerald-500', 'text-emerald-300'), 1500);
      }
    }

    // 4. Refrescar barra de totales financieros sin destruir los elementos del DOM de la tabla
    if (typeof window.__refreshReportSummary === 'function') {
      window.__refreshReportSummary();
    }

    // 5. Mostrar confirmación visual táctil inmediata (Toast flotante)
    showReportToast(`Pedido #${saleId} guardado: ${value}`);
  } finally {
    setTimeout(() => {
      window.__isLocalReportUpdate = false;
    }, 600);
  }
};

window.handleReportTimeInput = function(el, event) {
  if (event && event.inputType && event.inputType.startsWith('delete')) return;
  const formatted = formatTimeInput(el.value, false);
  if (formatted !== el.value) {
    el.value = formatted;
  }
};

window.handleReportTimeBlur = function(el, saleId) {
  const formatted = formatTimeInput(el.value, true);
  if (formatted !== el.value) {
    el.value = formatted;
  }
  window.updateSaleProperty(saleId, 'deliveryTime', el.value, el);
};

// Sincronización en vivo: auto-impresión de nuevos pedidos y refresco del informe
subscribeSales((sales) => {
  if (Array.isArray(sales) && sales.length === 0) {
    printQueue.length = 0;
    handledPrintRequestTokens.clear();
  }

  // 1. Monitoreo y auto-impresión en caja de nuevos pedidos o solicitudes remotas
  checkAutoPrintQueue(sales);

  // 2. Refresco en vivo del modal de reporte si está abierto
  if (typeof window.__refreshReportModal === 'function') {
    if (window.__isLocalReportUpdate) {
      return;
    }

    const activeEl = document.activeElement;
    const isInteracting = activeEl && (
      activeEl.tagName === 'SELECT' || 
      activeEl.tagName === 'INPUT'
    ) && (
      document.getElementById('report-table-body')?.contains(activeEl) || 
      document.getElementById('report-cards-container')?.contains(activeEl)
    );

    if (isInteracting) {
      // Posponer el refresco hasta que el usuario termine de interactuar con el control
      const handleBlur = () => {
        activeEl.removeEventListener('blur', handleBlur);
        if (typeof window.__refreshReportModal === 'function' && !window.__isLocalReportUpdate) {
          window.__refreshReportModal();
        }
      };
      activeEl.addEventListener('blur', handleBlur, { once: true });
      return;
    }

    window.__refreshReportModal();
  }
});

window.renderReportModal = function() {
  const sales = getSales();
  let currentReportView = localStorage.getItem('flory_report_view') || (window.innerWidth < 768 ? 'cards' : 'table');
  
  modalOverlay.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-[97vw] xl:max-w-7xl h-[95vh] sm:h-auto sm:max-h-[94vh] flex flex-col shadow-2xl animate-scale-in mx-auto my-auto overflow-hidden">
      <!-- Modal Header -->
      <div class="p-3.5 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-800/50 shrink-0">
        <div class="shrink-0 flex items-center justify-between w-full md:w-auto">
          <div>
            <h2 class="text-lg sm:text-2xl font-bold font-playfair text-white flex items-center gap-2.5 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              INFORME DE VENTAS DEL DÍA
            </h2>
            <p class="text-xs sm:text-sm text-slate-400 mt-0.5">Sincronizado en tiempo real con teléfonos y computadoras</p>
          </div>
          
          <button id="close-report-btn" class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-xl transition-colors md:hidden border border-slate-700/50" title="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        
        <!-- Controls: Filters and View Toggle -->
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- View Toggle (Table vs Cards) -->
          <div class="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-700 shrink-0">
            <button id="report-view-table-btn" type="button" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-slate-950 shadow">
              <span>📋</span> Tabla
            </button>
            <button id="report-view-cards-btn" type="button" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white">
              <span>📱</span> Tarjetas
            </button>
          </div>

          <div class="relative flex-1 sm:w-44 min-w-[120px]">
            <input type="text" id="report-customer-search" placeholder="Cliente..." 
              class="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-amber-500 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-2.5 top-2 text-slate-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>

          <div class="relative flex-1 sm:w-36 min-w-[110px]">
            <input type="text" id="report-search" placeholder="Platillo..." 
              class="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-amber-500 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-2.5 top-2 text-slate-500"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
          </div>

          <select id="report-vendor-filter" class="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 transition-all w-full sm:w-36 cursor-pointer font-semibold shrink-0">
            <option value="">Vendedores</option>
            ${VENDEDORES.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>

          <button id="close-report-btn-desktop" class="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-700/50" title="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 bg-slate-950">
        
        <!-- Mobile Table Scroll Tip -->
        <div id="report-table-tip" class="sm:hidden flex items-center justify-between bg-slate-900/90 border border-amber-500/30 px-3 py-1.5 rounded-xl mb-2 text-xs text-amber-400">
          <span class="flex items-center gap-1.5 font-medium">
            <span>👉</span> Desliza la tabla horizontalmente
          </span>
          <span class="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
            ↔ Deslizar
          </span>
        </div>

        <!-- Table View -->
        <div id="report-table-view" class="report-scroll-container rounded-2xl border border-slate-800 overflow-x-auto shadow-inner bg-slate-900/40">
          <table class="w-full text-sm text-left text-slate-300 border-collapse min-w-[760px] lg:min-w-full">
            <thead class="text-xs text-slate-400 uppercase bg-slate-900/90 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th scope="col" class="px-2 py-3 text-center whitespace-nowrap">No.</th>
                <th scope="col" class="px-2 py-3 whitespace-nowrap">CLIENTE</th>
                <th scope="col" class="px-2 py-3 text-center whitespace-nowrap">TELÉFONO</th>
                <th scope="col" class="px-2 py-3 text-center whitespace-nowrap">HORA</th>
                <th scope="col" class="px-2 py-3">DETALLE</th>
                <th scope="col" class="px-2 py-3 text-center whitespace-nowrap">PAGO</th>
                <th scope="col" class="px-2 py-3 text-center whitespace-nowrap">VENDEDOR</th>
                <th scope="col" class="px-2 py-3 text-right whitespace-nowrap">TOTAL</th>
                <th scope="col" class="px-2 py-3 text-center whitespace-nowrap">TICKET</th>
              </tr>
            </thead>
            <tbody id="report-table-body">
              <!-- Rows injected here -->
            </tbody>
          </table>
        </div>

        <!-- Cards View (for mobile) -->
        <div id="report-cards-view" class="hidden">
          <div id="report-cards-container" class="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
            <!-- Cards injected here -->
          </div>
        </div>

      </div>

      <!-- Financial Summary Bar -->
      <div id="report-summary-bar" class="bg-slate-800/90 border-t border-slate-700/80 p-3 sm:p-4 px-4 sm:px-6 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
        <!-- Totals injected here -->
      </div>

      <!-- Modal Footer -->
      <div class="p-3.5 sm:p-5 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex flex-wrap justify-between items-center gap-3 shrink-0">
        ${isCajaDevice() ? `
          <div class="flex items-center flex-wrap gap-2">
            <button id="clear-sales-btn" class="text-xs sm:text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3.5 py-2 rounded-xl transition-colors border border-transparent hover:border-red-500/20 active:scale-95">
              🗑️ Borrar Historial
            </button>
            ${hasTrashBackup() ? `
              <button id="restore-sales-btn" class="text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-3 py-2 rounded-xl transition-colors border border-amber-500/30 flex items-center gap-1.5 active:scale-95" title="Recuperar las ventas que fueron borradas por error">
                🔄 Restaurar Borrado
              </button>
            ` : ''}
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 select-none" title="Equipo autorizado como Caja Central">
                <span>🖥️</span> <span>Caja Autorizada</span>
              </span>
              <button id="relock-caja-btn" class="text-[11px] text-slate-400 hover:text-amber-300 hover:bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700/60 transition-colors" title="Volver a bloquear este dispositivo para que requiera PIN">
                🔒 Bloquear
              </button>
            </div>
          </div>
        ` : `
          <div class="flex items-center flex-wrap gap-2">
            <div class="text-xs text-slate-400 flex items-center gap-1.5 py-2 px-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span>🔒</span> <span>Cierre protegido</span>
            </div>
            <button id="unlock-caja-btn" class="text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-3 py-2 rounded-xl transition-colors border border-amber-500/30 flex items-center gap-1.5 active:scale-95" title="Desbloquear este equipo como Caja Principal con PIN">
              🔑 Desbloquear Caja
            </button>
          </div>
        `}

        <div class="flex items-center gap-2">
          <button id="close-report-bottom-btn" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95 text-xs sm:text-sm">
            ✕ Cerrar
          </button>
          <button id="export-excel-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 active:scale-95 text-xs sm:text-sm" ${sales.length === 0 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"></path><path d="m18 21-4-4"></path><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"></path></svg>
            Exportar a Excel
          </button>
        </div>
      </div>
    </div>
  `;

  const tbody = document.getElementById('report-table-body');
  const cardsContainer = document.getElementById('report-cards-container');
  const summaryBar = document.getElementById('report-summary-bar');
  const searchInput = document.getElementById('report-search');
  const customerSearchInput = document.getElementById('report-customer-search');
  const vendorFilter = document.getElementById('report-vendor-filter');

  function setView(view) {
    currentReportView = view;
    localStorage.setItem('flory_report_view', view);
    const tableView = document.getElementById('report-table-view');
    const cardsView = document.getElementById('report-cards-view');
    const tip = document.getElementById('report-table-tip');
    const tableBtn = document.getElementById('report-view-table-btn');
    const cardsBtn = document.getElementById('report-view-cards-btn');

    if (view === 'cards') {
      if (tableView) tableView.classList.add('hidden');
      if (cardsView) cardsView.classList.remove('hidden');
      if (tip) tip.classList.add('hidden');
      if (cardsBtn) {
        cardsBtn.className = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-slate-950 shadow';
      }
      if (tableBtn) {
        tableBtn.className = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white';
      }
    } else {
      if (tableView) tableView.classList.remove('hidden');
      if (cardsView) cardsView.classList.add('hidden');
      if (tip) tip.classList.remove('hidden');
      if (tableBtn) {
        tableBtn.className = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-slate-950 shadow';
      }
      if (cardsBtn) {
        cardsBtn.className = 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white';
      }
    }
  }

  function renderSummaryBar(totalDia, totalEfectivo, totalTransferencia, totalTarjeta, totalNoPago, cantidadFiltrada, textFilter, vendFilter, custFilter) {
    if (!summaryBar) return;
    const isFiltered = textFilter || vendFilter || custFilter;
    
    const paymentTotalsHtml = `
      <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5 text-xs bg-slate-900/90 px-3 sm:px-4 py-2 rounded-2xl border border-slate-700/80 shadow-inner">
        <div class="flex items-center gap-1.5 bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-800/50">
          <span class="text-emerald-400 font-bold text-xs">💵 EFECTIVO:</span>
          <span class="text-white font-extrabold text-xs sm:text-sm">Q${totalEfectivo.toFixed(2)}</span>
        </div>
        <div class="flex items-center gap-1.5 bg-sky-950/50 px-2.5 py-1 rounded-xl border border-sky-800/50">
          <span class="text-sky-400 font-bold text-xs">📲 TRANSFERENCIA:</span>
          <span class="text-white font-extrabold text-xs sm:text-sm">Q${totalTransferencia.toFixed(2)}</span>
        </div>
        <div class="flex items-center gap-1.5 bg-purple-950/50 px-2.5 py-1 rounded-xl border border-purple-800/50">
          <span class="text-purple-400 font-bold text-xs">💳 TARJETA:</span>
          <span class="text-white font-extrabold text-xs sm:text-sm">Q${totalTarjeta.toFixed(2)}</span>
        </div>
        <div class="flex items-center gap-1.5 bg-red-950/50 px-2.5 py-1 rounded-xl border border-red-800/50">
          <span class="text-red-400 font-bold text-xs">❌ NO PAGÓ:</span>
          <span class="text-red-300 font-extrabold text-xs sm:text-sm">Q${totalNoPago.toFixed(2)}</span>
        </div>
      </div>
    `;

    summaryBar.innerHTML = `
      <div class="flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
        ${textFilter ? `
          <div class="text-xs sm:text-sm font-bold text-emerald-400 whitespace-nowrap bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40">
            CANTIDAD VENDIDA: <span class="text-white text-sm sm:text-base font-black ml-1">${cantidadFiltrada}</span>
          </div>
        ` : ''}
        ${paymentTotalsHtml}
      </div>
      
      <div class="flex items-center justify-center sm:justify-end gap-2.5 mt-2 sm:mt-0 w-full sm:w-auto">
        <div class="text-slate-400 uppercase tracking-wider font-bold text-xs sm:text-sm whitespace-nowrap">
          Total ${isFiltered ? 'Filtrado' : 'General'}:
        </div>
        <div class="text-amber-400 text-2xl sm:text-3xl font-black whitespace-nowrap tracking-tight">
          Q${totalDia.toFixed(2)}
        </div>
      </div>
    `;
  }

  function updateDisplay() {
    if (!tbody || !summaryBar) return;
    const textFilter = searchInput ? searchInput.value : '';
    const vendFilter = vendorFilter ? vendorFilter.value : '';
    const custFilter = customerSearchInput ? customerSearchInput.value : '';
    const currentSales = getSales();
    const { tableRows, cardRows, totalDia, totalEfectivo, totalTransferencia, totalTarjeta, totalNoPago, cantidadFiltrada, isEmpty } = renderReportContent(currentSales, textFilter, vendFilter, custFilter);
    
    tbody.innerHTML = !isEmpty ? tableRows : `
      <tr>
        <td colspan="9" class="px-4 py-12 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-50"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
            ${(textFilter || vendFilter || custFilter) ? 'No se encontraron resultados para esta búsqueda' : 'No hay ventas'}
          </div>
        </td>
      </tr>
    `;

    if (cardsContainer) {
      cardsContainer.innerHTML = !isEmpty ? cardRows : `
        <div class="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          <p class="text-sm">No se encontraron ventas para este filtro</p>
        </div>
      `;
    }

    renderSummaryBar(totalDia, totalEfectivo, totalTransferencia, totalTarjeta, totalNoPago, cantidadFiltrada, textFilter, vendFilter, custFilter);
    highlightSelected();
  }

  // --- Resaltado Interactivo de Fila / Tarjeta Seleccionada (Efecto Excel) ---
  let selectedSaleId = null;

  function highlightSelected() {
    if (!selectedSaleId) return;
    const row = document.getElementById(`report-row-${selectedSaleId}`);
    if (row) row.classList.add('report-row-highlight');
    const card = document.getElementById(`report-card-${selectedSaleId}`);
    if (card) card.classList.add('report-card-highlight');
  }

  function setSelectedSale(id) {
    if (selectedSaleId) {
      const prevRow = document.getElementById(`report-row-${selectedSaleId}`);
      if (prevRow) prevRow.classList.remove('report-row-highlight');
      const prevCard = document.getElementById(`report-card-${selectedSaleId}`);
      if (prevCard) prevCard.classList.remove('report-card-highlight');
    }
    selectedSaleId = id;
    highlightSelected();
  }

  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (row && row.id && row.id.startsWith('report-row-')) {
        const id = row.id.replace('report-row-', '');
        setSelectedSale(id);
      }
    });

    tbody.addEventListener('focusin', (e) => {
      const row = e.target.closest('tr');
      if (row && row.id && row.id.startsWith('report-row-')) {
        const id = row.id.replace('report-row-', '');
        setSelectedSale(id);
      }
    });
  }

  if (cardsContainer) {
    cardsContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.report-card-item');
      if (card && card.id && card.id.startsWith('report-card-')) {
        const id = card.id.replace('report-card-', '');
        setSelectedSale(id);
      }
    });

    cardsContainer.addEventListener('focusin', (e) => {
      const card = e.target.closest('.report-card-item');
      if (card && card.id && card.id.startsWith('report-card-')) {
        const id = card.id.replace('report-card-', '');
        setSelectedSale(id);
      }
    });
  }

  // Permite recalcular totales sin redibujar la tabla completa
  window.__refreshReportSummary = () => {
    const textFilter = searchInput ? searchInput.value : '';
    const vendFilter = vendorFilter ? vendorFilter.value : '';
    const custFilter = customerSearchInput ? customerSearchInput.value : '';
    const currentSales = getSales();
    let totalDia = 0, totalEfectivo = 0, totalTransferencia = 0, totalTarjeta = 0, totalNoPago = 0, cantidadFiltrada = 0;
    
    let filteredSales = currentSales;
    if (vendFilter) filteredSales = filteredSales.filter(s => normalizeVendor(s.vendedor) === vendFilter);
    if (textFilter) filteredSales = filteredSales.filter(s => (s.items || '').toLowerCase().includes(textFilter.toLowerCase()));
    if (custFilter) filteredSales = filteredSales.filter(s => (s.customerName || '').toLowerCase().includes(custFilter.toLowerCase()));

    filteredSales.forEach(s => {
      const tot = Number(s.total) || 0;
      const p = normalizePayment(s.pago);
      totalDia += tot;
      if (p === 'EFECTIVO') totalEfectivo += tot;
      else if (p === 'TRANSFERENCIA') totalTransferencia += tot;
      else if (p === 'TARJETA') totalTarjeta += tot;
      else if (p === 'NO PAGO') totalNoPago += tot;
      else totalEfectivo += tot;

      if (textFilter) {
        const itemsArray = (s.items || '').split(', ');
        itemsArray.forEach(item => {
          if (item.toLowerCase().includes(textFilter.toLowerCase())) {
            const match = item.match(/^(\d+)x/);
            if (match) cantidadFiltrada += parseInt(match[1], 10);
          }
        });
      }
    });

    renderSummaryBar(totalDia, totalEfectivo, totalTransferencia, totalTarjeta, totalNoPago, cantidadFiltrada, textFilter, vendFilter, custFilter);
    highlightSelected();
  };

  // Registrar callback para refresco dinámico
  window.__refreshReportModal = updateDisplay;

  // Initial render
  updateDisplay();
  setView(currentReportView);

  // Search events
  if (searchInput) searchInput.addEventListener('input', () => updateDisplay());
  if (customerSearchInput) customerSearchInput.addEventListener('input', () => updateDisplay());
  if (vendorFilter) vendorFilter.addEventListener('change', () => updateDisplay());

  // View switch buttons
  const tableBtn = document.getElementById('report-view-table-btn');
  const cardsBtn = document.getElementById('report-view-cards-btn');
  if (tableBtn) tableBtn.addEventListener('click', () => setView('table'));
  if (cardsBtn) cardsBtn.addEventListener('click', () => setView('cards'));

  // Close handlers
  const handleClose = () => {
    window.__refreshReportModal = null;
    window.__refreshReportSummary = null;
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('flex');
  };

  const closeBtn = document.getElementById('close-report-btn');
  const closeBtnDesktop = document.getElementById('close-report-btn-desktop');
  const closeBottomBtn = document.getElementById('close-report-bottom-btn');
  if (closeBtn) closeBtn.onclick = handleClose;
  if (closeBtnDesktop) closeBtnDesktop.onclick = handleClose;
  if (closeBottomBtn) closeBottomBtn.onclick = handleClose;

  const unlockCajaBtn = document.getElementById('unlock-caja-btn');
  if (unlockCajaBtn) {
    unlockCajaBtn.onclick = () => {
      const pin = prompt('🔐 Ingrese el PIN de Administrador (4 dígitos) para autorizar este equipo como Caja:');
      if (pin === null) return;
      if (unlockCajaWithPin(pin)) {
        alert('✅ ¡Equipo autorizado como Caja Principal!\nYa puedes gestionar y borrar el historial en este dispositivo.');
        window.renderReportModal();
      } else {
        alert('❌ PIN incorrecto.');
      }
    };
  }

  const relockCajaBtn = document.getElementById('relock-caja-btn');
  if (relockCajaBtn) {
    relockCajaBtn.onclick = () => {
      lockCajaDevice();
      window.renderReportModal();
      alert('🔒 Dispositivo protegido nuevamente.\nAhora requerirá el PIN para acceder a las opciones de Caja.');
    };
  }

  const clearSalesBtn = document.getElementById('clear-sales-btn');
  if (clearSalesBtn) {
    clearSalesBtn.onclick = () => {
      if (!isCajaDevice()) {
        const pin = prompt('🔐 Ingrese el PIN de Administrador (5577) para autorizar el borrado:');
        if (pin === null) return;
        if (!unlockCajaWithPin(pin)) {
          alert('❌ PIN incorrecto.');
          return;
        }
      }

      const pinConfirm = prompt('⚠️ ¿Estás seguro de que deseas borrar el historial de ventas del día?\n\nℹ️ Se guardará una copia de seguridad en la papelera.\n\nPara confirmar, escribe el PIN de Administrador (5577):');
      if (pinConfirm === null) return;
      if (!verifyAdminPin(pinConfirm)) {
        alert('❌ PIN incorrecto. No se borró el historial.');
        return;
      }

      clearAllSales();
      window.renderReportModal();
      alert('🗑️ Historial de ventas borrado correctamente.');
    };
  }

  const restoreSalesBtn = document.getElementById('restore-sales-btn');
  if (restoreSalesBtn) {
    restoreSalesBtn.onclick = () => {
      if (!isCajaDevice()) {
        const pin = prompt('🔐 Ingrese el PIN de Administrador para restaurar el historial:');
        if (pin === null) return;
        if (!unlockCajaWithPin(pin)) {
          alert('❌ PIN incorrecto.');
          return;
        }
      }
      if (confirm('¿Deseas restaurar las ventas borradas de hoy desde la copia de respaldo?')) {
        const ok = restoreLastClearedSales();
        if (ok) {
          window.renderReportModal();
          alert('✅ Ventas restauradas correctamente.');
        } else {
          alert('No se encontraron ventas para restaurar.');
        }
      }
    };
  }

  document.getElementById('export-excel-btn').onclick = () => {
    const latestSales = getSales();
    exportToExcel(latestSales);
  };

  const reportTableView = document.getElementById('report-table-view');
  if (reportTableView) {
    reportTableView.addEventListener('wheel', (e) => {
      if (reportTableView.scrollWidth > reportTableView.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          reportTableView.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }
    }, { passive: false });
  }

  modalOverlay.classList.remove('hidden');
  modalOverlay.classList.add('flex');
};

function openShareVendorsModal() {
  const origin = window.location.origin;
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  
  // En la computadora usamos el túnel público HTTPS para que el celular pueda conectarse
  let publicHost = localStorage.getItem('flory_public_tunnel') || 'https://within-nails-both-got.trycloudflare.com';
  let effectiveDomain = isLocal ? publicHost : origin;
  let baseUrl = `${effectiveDomain.replace(/\/+$/, '')}/vendedores.html`;
  
  const renderModalContent = () => {
    modalOverlay.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl animate-scale-in mx-auto my-6 overflow-hidden">
        <!-- Modal Header -->
        <div class="p-5 sm:p-6 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
              📱
            </div>
            <div>
              <h2 class="text-lg sm:text-xl font-bold font-playfair text-white">Portal de Vendedores</h2>
              <p class="text-xs text-slate-400">Acceso móvil para registrar cobros en tiempo real</p>
            </div>
          </div>
          <button id="close-share-modal" class="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
            ✕
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-5 sm:p-6 space-y-5 overflow-y-auto">
          
          <!-- QR Code & Quick Scan -->
          <div class="bg-slate-950/80 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div class="bg-white p-3 rounded-2xl shrink-0 shadow-xl shadow-black/60 flex items-center justify-center">
              <img 
                id="qr-image"
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(baseUrl)}" 
                alt="Código QR Portal Vendedores" 
                class="w-36 h-36 object-contain"
              />
            </div>
            <div class="space-y-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Escanear con Cámara del Celular
              </span>
              <h3 class="text-base font-bold text-white leading-snug">
                Abre la cámara de tu iPhone o Android y enfoca este código QR.
              </h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Te abrirá directamente el portal móvil de cobros con conexión segura HTTPS.
              </p>
            </div>
          </div>

          <!-- Enlace Público del Celular -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Enlace Público para Celular:</label>
              ${isLocal ? `<span class="text-[10px] text-amber-500 font-semibold">(Túnel HTTPS Activo)</span>` : ''}
            </div>
            <div class="flex gap-2">
              <input 
                id="general-link-input"
                type="text" 
                value="${baseUrl}" 
                class="flex-1 bg-slate-950 border border-slate-700 text-xs text-amber-300 font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
              />
              <button 
                id="copy-general-link-btn"
                class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0"
              >
                <span>📋</span> Copiar
              </button>
            </div>
          </div>

          <!-- Enlaces Directos por Vendedor (WhatsApp) -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Enviar enlace directo a cada vendedor por WhatsApp:
            </label>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              ${VENDEDORES.map(v => {
                const vendorUrl = `${baseUrl}?vendedor=${encodeURIComponent(v)}`;
                const waText = encodeURIComponent(`Hola ${v}, aquí tienes tu enlace de Comedor Donde Flory para ver tus pedidos y marcar tus cobros (Efectivo/Transferencia/Tarjeta) en vivo: ${vendorUrl}`);
                return `
                  <div class="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
                    <div class="flex items-center gap-2">
                      <span class="text-xs">🛵</span>
                      <span class="text-xs font-bold text-white">${v}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button 
                        onclick="navigator.clipboard.writeText('${vendorUrl}'); window.showMiniNotice('¡Link de ${v} copiado!');"
                        class="text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                        title="Copiar link"
                      >
                        Copiar
                      </button>
                      <a 
                        href="https://api.whatsapp.com/send?text=${waText}" 
                        target="_blank"
                        class="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/50 px-2.5 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1 transition-colors"
                        title="Enviar a WhatsApp"
                      >
                        <span>💬</span> WhatsApp
                      </a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Botón para Abrir Portal -->
          <div class="pt-3 border-t border-slate-800 flex justify-between items-center">
            <span class="text-xs text-slate-500">¿Quieres revisar la vista móvil?</span>
            <a 
              href="${baseUrl}" 
              target="_blank" 
              class="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 px-4 py-2 rounded-xl border border-slate-700 transition-all"
            >
              Abrir Vista de Vendedores ↗
            </a>
          </div>

        </div>
      </div>
    `;

    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');

    const closeBtn = document.getElementById('close-share-modal');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modalOverlay.classList.add('hidden');
        modalOverlay.classList.remove('flex');
      };
    }

    const copyBtn = document.getElementById('copy-general-link-btn');
    if (copyBtn) {
      copyBtn.onclick = (e) => {
        const input = document.getElementById('general-link-input');
        navigator.clipboard.writeText(input.value);
        e.target.innerHTML = '<span>✅</span> ¡Copiado!';
        setTimeout(() => {
          e.target.innerHTML = '<span>📋</span> Copiar';
        }, 2000);
      };
    }

    const inputLink = document.getElementById('general-link-input');
    if (inputLink) {
      inputLink.onchange = (e) => {
        const val = e.target.value.trim();
        if (val) {
          baseUrl = val;
          const hostPart = val.replace(/\/vendedores\.html.*/, '');
          localStorage.setItem('flory_public_tunnel', hostPart);
          renderModalContent();
        }
      };
    }
  };

  renderModalContent();
}

window.showMiniNotice = function(msg) {
  let notice = document.getElementById('flory-mini-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'flory-mini-notice';
    notice.className = 'fixed bottom-6 right-6 z-[300] bg-slate-900 text-amber-400 px-4 py-2.5 rounded-xl border border-amber-500/50 shadow-2xl text-xs font-bold pointer-events-none transition-all duration-300 opacity-0';
    document.body.appendChild(notice);
  }
  notice.textContent = msg;
  notice.classList.remove('opacity-0');
  notice.classList.add('opacity-100');
  setTimeout(() => {
    notice.classList.remove('opacity-100');
    notice.classList.add('opacity-0');
  }, 2000);
};

async function exportToExcel(sales) {
  if (!sales || sales.length === 0) {
    alert('No hay ventas para exportar.');
    return;
  }

  console.log('🚀 Iniciando exportación a Excel...');
  console.log('Datos a procesar:', sales.length, 'ventas');

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Ventas');

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
  const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  const currencyFmt = 'Q#,##0.00';

  // Row 1: Title
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'INFORME DE VENTAS DEL DÍA';
  titleCell.fill = headerFill;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // Row 2: Headers
  const headers = ["No.", "NOMBRE DEL CLIENTE", "TELEFONO", "HORA", "DETALLE DE PEDIDO", "TOTAL", "FORMA DE PAGO", "VENDEDOR"];
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
    { key: 'pedido', width: 45 },
    { key: 'total', width: 15 },
    { key: 'pago', width: 18 },
    { key: 'vendedor', width: 18 },
    { key: 'extra_col', width: 18 }
  ];

  // Set AutoFilter for the header row
  worksheet.autoFilter = 'A2:H2';

  // Force Excel to recalculate all formulas when the workbook opens
  workbook.calcProperties.fullCalcOnLoad = true;

  console.log('Filtrando ventas por horario...');
  const morningSales = sales.filter(s => {
    if (!s.time || typeof s.time !== 'string') return true; // Default to morning if time is weird
    const hour = parseInt(s.time.split(':')[0]);
    return isNaN(hour) ? true : hour < 11;
  });
  
  const afternoonSales = sales.filter(s => {
    if (!s.time || typeof s.time !== 'string') return false;
    const hour = parseInt(s.time.split(':')[0]);
    return isNaN(hour) ? false : hour >= 11;
  });

  console.log(`Ventas filtradas: Mañana(${morningSales.length}), Tarde(${afternoonSales.length})`);

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
      row.getCell('E').value = sale.items;
      row.getCell('F').value = sale.total;
      
      const pagoCell = row.getCell('G');
      pagoCell.value = normalizePayment(sale.pago);
      pagoCell.dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: false,
        formulae: ['"EFECTIVO,TRANSFERENCIA,TARJETA,NO PAGO"']
      };

      const vendedorCell = row.getCell('H');
      vendedorCell.value = normalizeVendor(sale.vendedor);
      vendedorCell.dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: false,
        formulae: ['"FREDY,JAIME,VIEJO,ANDRES Jr.,LOCAL,FERNANDO,HÉCTOR"']
      };
      
      row.getCell('F').numFmt = currencyFmt;

      // Color alternado suave (cebra celeste tenue) y bordes definidos
      const isEven = (currentRow % 2 === 0);
      const zebraFill = isEven
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FC' } }
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

      ['A','B','C','D','E','F','G','H'].forEach(col => {
        const c = row.getCell(col);
        c.border = borderThin;
        c.fill = zebraFill;
      });

      currentRow++;
    });
    return { start, end: currentRow - 1 };
  };

  const totalRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  const addTotalRow = (label, range) => {
    const row = worksheet.getRow(currentRow);
    row.getCell('E').value = label;
    row.getCell('E').font = { bold: true };
    row.getCell('E').alignment = { horizontal: 'right' };
    if (range.start <= range.end) {
      row.getCell('F').value = { formula: `SUM(F${range.start}:F${range.end})` };
    } else {
      row.getCell('F').value = 0;
    }
    row.getCell('F').numFmt = currencyFmt;
    row.getCell('F').font = { bold: true };
    
    // Apply gray fill to cells A-G
    ['A','B','C','D','E','F','G','H'].forEach(col => {
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
  grandTotalRow.getCell('E').value = 'TOTAL GENERAL DEL DÍA';
  grandTotalRow.getCell('E').font = { bold: true, size: 12 };
  grandTotalRow.getCell('E').alignment = { horizontal: 'right' };
  grandTotalRow.getCell('F').value = { formula: `F${morningTotalIndex} + F${afternoonTotalIndex}` };
  grandTotalRow.getCell('F').numFmt = currencyFmt;
  grandTotalRow.getCell('F').font = { bold: true, size: 12 };
  
  // Apply gray fill
  ['A','B','C','D','E','F','G','H'].forEach(col => {
    grandTotalRow.getCell(col).fill = totalRowFill;
    grandTotalRow.getCell(col).border = borderThin;
  });
  
  currentRow += 3;

  console.log('Adding conditional formatting...');
  // Resaltado de fila activa (Amarillo suave elegante que resalta toda la fila)
  worksheet.addConditionalFormatting({
    ref: 'A3:H1000',
    rules: [
      {
        type: 'expression',
        formulae: ['ROW()=CELL("row")'],
        style: {
          fill: { 
            type: 'pattern', 
            pattern: 'solid', 
            bgColor: { argb: 'FFFFF9C4' } // Amarillo pastel resaltador suave
          }
        }
      }
    ]
  });

  // Add elegant conditional formatting for the VENDEDOR column (H)
  worksheet.addConditionalFormatting({
    ref: 'H3:H1000',
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
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"FERNANDO"'],
        style: { 
          font: { color: { argb: 'FF7B241C' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDEDEC' } }
        }
      },
      {
        type: 'cellIs', operator: 'equal', formulae: ['"HÉCTOR"'],
        style: { 
          font: { color: { argb: 'FF0E6655' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE8F8F5' } }
        }
      }
    ]
  });

  // Add elegant conditional formatting for the FORMA DE PAGO column (G)
  worksheet.addConditionalFormatting({
    ref: 'G3:G1000',
    rules: [
      {
        type: 'cellIs', operator: 'equal', formulae: ['"NO PAGO"'],
        style: { 
          font: { color: { argb: 'FF922B21' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FADBD8' } }
        }
      }
    ]
  });

  // Summaries by Vendor
  const vendorColors = {
    'FREDY': { font: 'FF154360', fill: 'FFD4E6F1' },
    'JAIME': { font: 'FF145A32', fill: 'FFD5F5E3' },
    'VIEJO': { font: 'FF7E5109', fill: 'FFFDEBD0' },
    'ANDRES Jr.': { font: 'FF512E5F', fill: 'FFF5EEF8' },
    'LOCAL': { font: 'FF424949', fill: 'FFE5E8E8' },
    'FERNANDO': { font: 'FF7B241C', fill: 'FFFDEDEC' },
    'HÉCTOR': { font: 'FF0E6655', fill: 'FFE8F8F5' }
  };
  const vendors = ['FREDY', 'JAIME', 'VIEJO', 'ANDRES Jr.', 'LOCAL', 'FERNANDO', 'HÉCTOR'];
  const vendorTotalRows = [];
  
  vendors.forEach(v => {
    // Header for this vendor table
    const headRow = worksheet.getRow(currentRow);
    headRow.getCell('C').value = v;
    headRow.getCell('D').value = 'EFECTIVO';
    headRow.getCell('E').value = 'TRANSFERENCIA';
    headRow.getCell('F').value = 'TARJETA';
    headRow.getCell('G').value = 'NO PAGO';
    headRow.getCell('H').value = 'TOTAL';

    ['C','D','E','F','G','H'].forEach(col => {
      const cell = headRow.getCell(col);
      let fontColor = 'FF000000';
      let fillColor = 'FFA6A6A6';
      if (col === 'C') {
        fontColor = vendorColors[v].font;
        fillColor = vendorColors[v].fill;
      } else if (col === 'G') {
        fontColor = 'FF922B21';
        fillColor = 'FFFADBD8';
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
    const formulaBase = `SUMIFS(F3:F${maxRow}, H3:H${maxRow}, "${v}", G3:G${maxRow}, `;
    
    dataRow.getCell('D').value = { formula: formulaBase + '"EFECTIVO")' };
    dataRow.getCell('E').value = { formula: formulaBase + '"TRANSFERENCIA")' };
    dataRow.getCell('F').value = { formula: formulaBase + '"TARJETA")' };
    dataRow.getCell('G').value = { formula: formulaBase + '"NO PAGO")' };
    dataRow.getCell('H').value = { formula: `D${currentRow} + E${currentRow} + F${currentRow} + G${currentRow}` };
    
    vendorTotalRows.push(currentRow);

    ['C','D','E','F','G','H'].forEach(col => {
      const cell = dataRow.getCell(col);
      if(col !== 'C') cell.numFmt = currencyFmt;
      if (col === 'H') {
        cell.font = { bold: true };
      } else if (col === 'G') {
        cell.font = { bold: true, color: { argb: 'FF922B21' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } };
      }
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
  finalTotalRow.getCell('H').alignment = { horizontal: 'center', vertical: 'middle' };
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
    { width: 45 }, // E - Detalle de Pedido
    { width: 15 }, // F - Total
    { width: 18 }, // G - Forma de Pago
    { width: 18 }, // H - Vendedor
  ];

  // ---- Row 1: Title ----
  searchSheet.mergeCells('A1:H1');
  const sTitle = searchSheet.getCell('A1');
  sTitle.value = '🔍 BUSCADOR INTELIGENTE DE VENTAS — Comedor Donde Flory';
  sTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  searchSheet.getRow(1).height = 30;

  // ---- Row 2: Instruction banner ----
  searchSheet.mergeCells('A2:H2');
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
    formulae: ['"FREDY,JAIME,VIEJO,ANDRES Jr.,LOCAL,OTROS,FERNANDO,HÉCTOR"']
  };
  vendorInput.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE066' } };
  vendorInput.border = borderThin;
  vendorInput.alignment = { horizontal: 'center', vertical: 'middle' };
  vendorInput.font   = { bold: true, size: 12 };

  const pagoInput = searchSheet.getCell('E4');
  pagoInput.dataValidation = {
    type: 'list', allowBlank: true, showErrorMessage: false,
    formulae: ['"EFECTIVO,TRANSFERENCIA,TARJETA,NO PAGO"']
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
  sHeader.values = ['No.', 'NOMBRE DEL CLIENTE', 'TELÉFONO', 'HORA', 'DETALLE DE PEDIDO', 'TOTAL', 'FORMA DE PAGO', 'VENDEDOR'];
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
    dr.getCell('H').value = { formula: `'Reporte de Ventas'!H${sale.excelRow}` };
    dr.hidden = true; // hide from view; INDEX/MATCH still reads them
    dataRow++;
  });
  const DATA_END = dataRow - 1;
  console.log('Adding formulas for Buscador Inteligente...');

  // ---- Row 7: INDEX/MATCH formulas for universal compatibility ----
  // FILTER() causes corruption in older Excel versions when exported by ExcelJS.
  // We use a helper column H to tag matching rows, and INDEX/MATCH to pull them up.
  searchSheet.getCell('J999').value = 0; // Base for MAX

  if (DATA_END >= DATA_START) {
    // 1. Helper column formulas in rows 1000+
    for (let i = DATA_START; i <= DATA_END; i++) {
      searchSheet.getCell(`J${i}`).value = { 
        formula: `IF(AND(OR($C$4="", H${i}=$C$4), OR($E$4="", G${i}=$E$4)), MAX($J$999:J${i-1})+1, "")` 
      };
    }

    // 2. Results formulas in rows 7 to 7 + sales.length
    const resultsEndRow = 7 + sales.length - 1;
    for (let i = 7; i <= resultsEndRow; i++) {
      const rowNumOffset = i - 6; // Row 7 is match #1
      ['A','B','C','D','E','F','G', 'H'].forEach(col => {
        const cell = searchSheet.getCell(`${col}${i}`);
        cell.value = { 
          formula: `IFERROR(INDEX(${col}$${DATA_START}:${col}$${DATA_END}, MATCH(${rowNumOffset}, $J$${DATA_START}:$J$${DATA_END}, 0)), "")` 
        };
        // Apply styling to results area
        if (col === 'F') cell.numFmt = currencyFmt;
        cell.border = borderThin;
        if (col !== 'B' && col !== 'E') cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }
  } else {
    searchSheet.getCell('A7').value = 'No hay ventas registradas.';
  }

  // Resaltado de fila activa en Buscador Inteligente
  searchSheet.addConditionalFormatting({
    ref: 'A7:H1000',
    rules: [
      {
        type: 'expression',
        formulae: ['ROW()=CELL("row")'],
        style: {
          fill: { 
            type: 'pattern', 
            pattern: 'solid', 
            bgColor: { argb: 'FFFFF9C4' } // Amarillo pastel resaltador suave
          }
        }
      }
    ]
  });

  // Add elegant conditional formatting for the FORMA DE PAGO column (G) on Buscador Inteligente
  searchSheet.addConditionalFormatting({
    ref: 'G7:G1000',
    rules: [
      {
        type: 'cellIs', operator: 'equal', formulae: ['"NO PAGO"'],
        style: { 
          font: { color: { argb: 'FF922B21' }, bold: true },
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FADBD8' } }
        }
      }
    ]
  });

  // Export
  console.log('Generando buffer del archivo...');
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    // Validate buffer — XLSX files always start with PK (ZIP magic bytes 0x50 0x4B)
    const uint8 = new Uint8Array(buffer);
    console.log('Buffer generado exitosamente (Tamaño:', buffer.byteLength, 'bytes)');
    console.log('Magic bytes:', uint8[0].toString(16), uint8[1].toString(16), '(debe ser 50 4b)');
    if (uint8[0] !== 0x50 || uint8[1] !== 0x4B) {
      throw new Error(`El buffer generado no es un archivo ZIP/XLSX válido. Magic bytes: ${uint8[0].toString(16)} ${uint8[1].toString(16)}`);
    }
    
    const blob = new Blob([uint8], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `REPORTE_FLORY_${new Date().toISOString().split('T')[0]}.xlsx`;
    console.log('Disparando descarga:', fileName);
    
    // Use URL.createObjectURL for reliable binary download in all browsers
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    console.log('✅ Exportación completada.');
    } catch (error) {
      console.error('❌ Error en el proceso de ExcelJS:', error);
      alert('Error al construir el libro de Excel: ' + error.message);
    }
  } catch (error) {
    console.error('❌ Error fatal en exportToExcel:', error);
    alert('No se pudo iniciar la exportación. Error: ' + error.message);
  }
}

// --- INITIALIZATION ---


// Start the APP
window.addEventListener('DOMContentLoaded', init);
