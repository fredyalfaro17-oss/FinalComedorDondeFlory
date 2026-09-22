// src/vendedores.js - Lógica interactiva del portal móvil para vendedores
import { getSales, addSale, updateSaleProperty, clearAllSales, subscribeSales, VENDEDORES, FORMAS_PAGO } from './db.js';

let allSales = [];
let selectedVendor = 'FREDY';
let currentFilter = 'TODOS'; // 'TODOS', 'PENDIENTES', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'NO PAGO'
let searchQuery = '';

// Leer parámetro inicial de la URL si existe (ej. ?vendedor=FREDY)
const urlParams = new URLSearchParams(window.location.search);
const vendorFromUrl = urlParams.get('vendedor') || urlParams.get('vendor');
if (vendorFromUrl && (VENDEDORES.includes(vendorFromUrl.toUpperCase()) || vendorFromUrl.toUpperCase() === 'TODOS')) {
  selectedVendor = vendorFromUrl.toUpperCase();
} else {
  // O recuperar último vendedor seleccionado en este dispositivo
  const savedVendor = localStorage.getItem('flory_active_vendor');
  if (savedVendor && (VENDEDORES.includes(savedVendor) || savedVendor === 'TODOS')) {
    selectedVendor = savedVendor;
  }
}

// Inicialización de la vista
document.addEventListener('DOMContentLoaded', () => {
  renderVendorPills();
  initEventListeners();
  startClock();

  // Suscripción en tiempo real a las ventas
  subscribeSales((sales) => {
    allSales = sales;
    renderDashboard();
  });
});

function startClock() {
  const clockEl = document.getElementById('live-clock');
  const dateEl = document.getElementById('current-date');
  
  const updateTime = () => {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
    }
  };
  updateTime();
  setInterval(updateTime, 1000);
}

function renderVendorPills() {
  const container = document.getElementById('vendor-chips-container');
  if (!container) return;

  const vendorsList = ['TODOS', ...VENDEDORES];

  container.innerHTML = vendorsList.map(v => {
    const isSelected = v === selectedVendor;
    return `
      <button 
        type="button"
        onclick="window.selectVendor('${v}')"
        class="shrink-0 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 border ${
          isSelected 
            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-105' 
            : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800'
        }"
      >
        ${v === 'TODOS' ? '🌐 TODOS' : '🛵 ' + v}
      </button>
    `;
  }).join('');
}

window.selectVendor = function(vendor) {
  selectedVendor = vendor;
  localStorage.setItem('flory_active_vendor', vendor);
  
  // Actualizar URL sin recargar para fácil guardado o compartir
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('vendedor', vendor);
  window.history.replaceState({}, '', newUrl);

  renderVendorPills();
  renderDashboard();
};

function initEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderDashboard();
    });
  }

  // Filtros rápidos
  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('bg-amber-500', 'text-slate-950', 'border-amber-400');
        b.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-800');
      });
      btn.classList.remove('bg-slate-900', 'text-slate-300', 'border-slate-800');
      btn.classList.add('bg-amber-500', 'text-slate-950', 'border-amber-400');

      currentFilter = btn.dataset.filter;
      renderDashboard();
    });
  });
}

function renderDashboard() {
  // 1. Filtrar ventas por vendedor seleccionado
  let vendorSales = allSales;
  if (selectedVendor !== 'TODOS') {
    vendorSales = allSales.filter(s => s.vendedor === selectedVendor);
  }

  // 2. Calcular estadísticas financieras
  let totalRecaudado = 0;
  let totalEfectivo = 0;
  let countEfectivo = 0;
  let totalTransferencia = 0;
  let countTransferencia = 0;
  let totalTarjeta = 0;
  let countTarjeta = 0;
  let totalPendientes = 0;
  let countPendientes = 0;

  vendorSales.forEach(sale => {
    const total = Number(sale.total) || 0;
    totalRecaudado += total;

    if (sale.pago === 'EFECTIVO') {
      totalEfectivo += total;
      countEfectivo++;
    } else if (sale.pago === 'TRANSFERENCIA') {
      totalTransferencia += total;
      countTransferencia++;
    } else if (sale.pago === 'TARJETA') {
      totalTarjeta += total;
      countTarjeta++;
    } else {
      // '-' o 'NO PAGO' o sin asignar
      totalPendientes += total;
      countPendientes++;
    }
  });

  // Actualizar métricas en la interfaz
  const elTotal = document.getElementById('stat-total');
  const elEfectivo = document.getElementById('stat-efectivo');
  const elEfectivoCount = document.getElementById('stat-efectivo-count');
  const elTransferencia = document.getElementById('stat-transferencia');
  const elTransferenciaCount = document.getElementById('stat-transferencia-count');
  const elTarjeta = document.getElementById('stat-tarjeta');
  const elTarjetaCount = document.getElementById('stat-tarjeta-count');
  const elPendientes = document.getElementById('stat-pendientes');
  const elPendientesCount = document.getElementById('stat-pendientes-count');
  const badgePendientes = document.getElementById('badge-pendientes-pill');
  const vendorNameHeader = document.getElementById('active-vendor-title');

  if (elTotal) elTotal.textContent = `Q ${totalRecaudado.toFixed(2)}`;
  if (elEfectivo) elEfectivo.textContent = `Q ${totalEfectivo.toFixed(2)}`;
  if (elEfectivoCount) elEfectivoCount.textContent = `${countEfectivo} pedidos`;
  if (elTransferencia) elTransferencia.textContent = `Q ${totalTransferencia.toFixed(2)}`;
  if (elTransferenciaCount) elTransferenciaCount.textContent = `${countTransferencia} pedidos`;
  if (elTarjeta) elTarjeta.textContent = `Q ${totalTarjeta.toFixed(2)}`;
  if (elTarjetaCount) elTarjetaCount.textContent = `${countTarjeta} pedidos`;
  if (elPendientes) elPendientes.textContent = `Q ${totalPendientes.toFixed(2)}`;
  if (elPendientesCount) elPendientesCount.textContent = `${countPendientes} por cobrar`;

  if (badgePendientes) {
    if (countPendientes > 0) {
      badgePendientes.classList.remove('hidden');
      badgePendientes.textContent = countPendientes;
    } else {
      badgePendientes.classList.add('hidden');
    }
  }

  if (vendorNameHeader) {
    vendorNameHeader.textContent = selectedVendor === 'TODOS' ? 'TODOS LOS VENDEDORES' : selectedVendor;
  }

  // 3. Filtrar ventas para la lista según búsqueda y botón activo
  let displaySales = vendorSales;

  if (currentFilter === 'PENDIENTES') {
    displaySales = displaySales.filter(s => !s.pago || s.pago === '-' || s.pago === 'NO PAGO');
  } else if (currentFilter === 'EFECTIVO') {
    displaySales = displaySales.filter(s => s.pago === 'EFECTIVO');
  } else if (currentFilter === 'TRANSFERENCIA') {
    displaySales = displaySales.filter(s => s.pago === 'TRANSFERENCIA');
  } else if (currentFilter === 'TARJETA') {
    displaySales = displaySales.filter(s => s.pago === 'TARJETA');
  }

  if (searchQuery) {
    displaySales = displaySales.filter(s => 
      (s.customerName && s.customerName.toLowerCase().includes(searchQuery)) ||
      (s.phone && s.phone.includes(searchQuery)) ||
      (s.items && s.items.toLowerCase().includes(searchQuery)) ||
      (s.vendedor && s.vendedor.toLowerCase().includes(searchQuery)) ||
      (String(s.id).includes(searchQuery))
    );
  }

  renderSalesCards(displaySales);
}

function renderSalesCards(sales) {
  const container = document.getElementById('orders-cards-container');
  if (!container) return;

  if (sales.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 px-4 text-center bg-slate-900/50 border border-slate-800 rounded-3xl">
        <div class="w-16 h-16 bg-slate-800 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          🍽️
        </div>
        <h3 class="text-lg font-bold text-white mb-1">No hay pedidos en esta vista</h3>
        <p class="text-sm text-slate-400 max-w-sm mx-auto mb-4">
          ${searchQuery ? 'No encontramos coincidencias para tu búsqueda.' : 'No hay pedidos pendientes o registrados para este filtro en este momento.'}
        </p>
        <button 
          type="button"
          onclick="window.seedDemoSales()"
          class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          <span>✨</span> Cargar 4 pedidos de prueba para demostrar
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = sales.map(sale => {
    const isPaid = sale.pago && sale.pago !== '-' && sale.pago !== 'NO PAGO';
    const isEfectivo = sale.pago === 'EFECTIVO';
    const isTransf = sale.pago === 'TRANSFERENCIA';
    const isTarjeta = sale.pago === 'TARJETA';
    const isNoPago = sale.pago === 'NO PAGO';

    let statusBadge = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        PENDIENTE DE COBRO
      </span>
    `;

    if (isEfectivo) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          💵 EFECTIVO
        </span>
      `;
    } else if (isTransf) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
          📲 TRANSFERENCIA
        </span>
      `;
    } else if (isTarjeta) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
          💳 TARJETA
        </span>
      `;
    } else if (isNoPago) {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
          ❌ NO PAGÓ
        </span>
      `;
    }

    // Limpiar teléfono para llamada/whatsapp
    const cleanPhone = sale.phone ? sale.phone.replace(/[^0-9]/g, '') : '';
    const phoneActions = cleanPhone && cleanPhone.length >= 8 ? `
      <div class="flex items-center gap-2 mt-1">
        <a href="tel:${cleanPhone}" class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          📞 Llamar (${cleanPhone})
        </a>
        <a href="https://wa.me/502${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
          💬 WhatsApp
        </a>
      </div>
    ` : `<p class="text-xs text-slate-500 mt-0.5">Sin teléfono registrado</p>`;

    return `
      <div 
        id="sale-card-${sale.id}"
        class="bg-slate-900 border ${isPaid ? 'border-slate-800' : 'border-amber-500/30 shadow-lg shadow-amber-500/5'} rounded-2xl p-4 md:p-5 transition-all duration-300 hover:border-slate-700 flex flex-col justify-between"
      >
        <!-- Header de la tarjeta -->
        <div>
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-mono">
                  #${sale.id}
                </span>
                <span class="text-xs text-slate-400 font-medium">🕒 ${sale.time || '--:--'}</span>
                ${selectedVendor === 'TODOS' ? `
                  <span class="text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    🛵 ${sale.vendedor || '-'}
                  </span>
                ` : ''}
              </div>
              <h4 class="text-base md:text-lg font-bold text-white mt-1.5 leading-snug">
                ${sale.customerName || 'Cliente Mostrador'}
              </h4>
              ${phoneActions}
            </div>
            
            <div class="text-right shrink-0">
              <div class="text-xl md:text-2xl font-black text-amber-400 font-sans">
                Q ${(Number(sale.total) || 0).toFixed(2)}
              </div>
              <div class="mt-1">
                ${statusBadge}
              </div>
            </div>
          </div>

          <!-- Detalle del pedido -->
          <div class="bg-slate-950/60 rounded-xl p-3 my-3 border border-slate-800/80">
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>🍲</span> Platillos del pedido:
            </p>
            <p class="text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
              ${sale.items || 'Sin detalle especificado'}
            </p>
          </div>
        </div>

        <!-- Botones de Acción de Cobro Inmediato (1 toque) -->
        <div class="pt-2 border-t border-slate-800/60 mt-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Marcar Método de Pago:
            </span>
            ${selectedVendor !== 'TODOS' ? `
              <div class="flex items-center gap-1">
                <span class="text-[11px] text-slate-400">Vendedor:</span>
                <select 
                  onchange="window.handleVendorChange(${sale.id}, this.value)"
                  class="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-blue-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  ${VENDEDORES.map(v => `<option value="${v}" ${sale.vendedor === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button 
              type="button"
              onclick="window.handlePaymentChange(${sale.id}, 'EFECTIVO')"
              class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 border ${
                isEfectivo 
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30' 
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
              }"
            >
              <span>💵</span> EFECTIVO
            </button>

            <button 
              type="button"
              onclick="window.handlePaymentChange(${sale.id}, 'TRANSFERENCIA')"
              class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 border ${
                isTransf 
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30' 
                  : 'bg-sky-950/40 text-sky-300 border-sky-800/60 hover:bg-sky-900/60'
              }"
            >
              <span>📲</span> TRANSF.
            </button>

            <button 
              type="button"
              onclick="window.handlePaymentChange(${sale.id}, 'TARJETA')"
              class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 border ${
                isTarjeta 
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30' 
                  : 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:bg-purple-900/60'
              }"
            >
              <span>💳</span> TARJETA
            </button>

            <button 
              type="button"
              onclick="window.handlePaymentChange(${sale.id}, 'NO PAGO')"
              class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 border ${
                isNoPago 
                  ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-600/30' 
                  : 'bg-red-950/30 text-red-400 border-red-900/50 hover:bg-red-900/40'
              }"
            >
              <span>❌</span> NO PAGÓ
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Acción al presionar método de pago
window.handlePaymentChange = function(saleId, nuevoPago) {
  // Animación / Toast táctil
  showToast(`✅ Pedido #${saleId} marcado como: ${nuevoPago}`);
  
  // Guardar en base de datos local / nube
  updateSaleProperty(saleId, 'pago', nuevoPago);

  // Destacar tarjeta momentáneamente
  const card = document.getElementById(`sale-card-${saleId}`);
  if (card) {
    card.classList.add('ring-2', 'ring-amber-400');
    setTimeout(() => {
      card.classList.remove('ring-2', 'ring-amber-400');
    }, 400);
  }
};

// Reasignar vendedor si fuera necesario
window.handleVendorChange = function(saleId, nuevoVendedor) {
  updateSaleProperty(saleId, 'vendedor', nuevoVendedor);
  showToast(`🛵 Pedido #${saleId} reasignado a: ${nuevoVendedor}`);
};

// Toast notification flotante para teléfonos
function showToast(message) {
  let toast = document.getElementById('flory-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'flory-toast';
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/95 text-white px-5 py-3 rounded-2xl border border-amber-500/50 shadow-2xl shadow-black/80 text-sm font-semibold flex items-center gap-2 backdrop-blur-md transition-all duration-300 opacity-0 translate-y-4 pointer-events-none';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('opacity-0', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-4');
  }, 2200);
}

// Cargar pedidos de demostración para probar de inmediato
window.seedDemoSales = function() {
  const sampleOrders = [
    {
      customerName: 'Carlos Méndez (Zona 1)',
      phone: '5544-1234',
      vendedor: 'FREDY',
      pago: '-',
      total: 60,
      items: '2x Caldo de Res con Verduras'
    },
    {
      customerName: 'Oficina Central Don Flory',
      phone: '4122-8899',
      vendedor: 'FREDY',
      pago: '-',
      total: 95,
      items: '2x Pollo Frito, 1x Flautas de Pollo'
    },
    {
      customerName: 'Dra. María Alvarado',
      phone: '4567-9911',
      vendedor: 'JAIME',
      pago: '-',
      total: 35,
      items: '1x Alambre de Res con queso Mozzarella'
    },
    {
      customerName: 'Taller San José',
      phone: '5877-2233',
      vendedor: 'VIEJO',
      pago: '-',
      total: 70,
      items: '2x Costilla en Barbacoa'
    }
  ];

  sampleOrders.forEach(o => addSale(o));
  showToast('✨ 4 pedidos de prueba cargados');
};

window.handleClearAllSales = function() {
  if (confirm('¿Estás seguro de que deseas borrar todo el historial de ventas del día?')) {
    clearAllSales();
    showToast('🗑️ Historial borrado');
  }
};
