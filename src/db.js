// src/db.js - Capa de datos unificada y sincronización en tiempo real (Firebase Firestore + LocalStorage + SSE)

export const VENDEDORES = [
  'FREDY',
  'JAIME',
  'VIEJO',
  'ANDRES Jr.',
  'LOCAL',
  'FERNANDO',
  'HÉCTOR'
];

export const FORMAS_PAGO = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'TARJETA',
  'NO PAGO'
];

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDplqV6vDZcBx-VnAmtY18bHK2UXdpOsio",
  authDomain: "comedor-flory.firebaseapp.com",
  projectId: "comedor-flory",
  storageBucket: "comedor-flory.firebasestorage.app",
  messagingSenderId: "952649934921",
  appId: "1:952649934921:web:2ccabd7d6c50d6b7a5f798"
};

const STORAGE_KEY = 'daily_sales';
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('flory_sales_sync') : null;
const listeners = new Set();
let cachedSales = null;

// Obtener fecha local (evita desfases de zona horaria UTC)
export function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Notificar a observadores locales
function notifyListeners(sales) {
  listeners.forEach(cb => {
    try {
      cb(sales);
    } catch (e) {
      console.error('Error in sales listener:', e);
    }
  });
}

// Normalizar métodos de pago válidos (EFECTIVO, TRANSFERENCIA, TARJETA, NO PAGO)
export function normalizePayment(pago) {
  if (!pago) return 'EFECTIVO';
  const clean = String(pago).trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // quita acentos (NO PAGÓ -> NO PAGO)
  if (clean === 'TRANSFERENCIA' || clean.startsWith('TRANS')) return 'TRANSFERENCIA';
  if (clean === 'TARJETA' || clean.startsWith('TARJ')) return 'TARJETA';
  if (clean === 'NO PAGO' || clean === 'NOPAGO' || clean.startsWith('NO PAG') || clean.startsWith('NO_PAG')) return 'NO PAGO';
  if (clean === 'EFECTIVO' || clean.startsWith('EFEC')) return 'EFECTIVO';
  // Histórico '-' o 'PENDIENTE' migran automáticamente a EFECTIVO
  return 'EFECTIVO';
}

// Generador de ID único por dispositivo/navegador
const DEVICE_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem('flory_device_id') || (() => {
      const id = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem('flory_device_id', id);
      return id;
    })())
  : 'server';

export function getDeviceId() {
  return DEVICE_ID;
}

// Identificador de rol del dispositivo (Computadora central de Caja vs Tablets/Móviles)
export const CAJA_ADMIN_PIN = '5577';

export function isCajaDevice() {
  if (typeof window === 'undefined') return false;

  // 1. Rol forzado o desbloqueado con PIN en localStorage
  const role = localStorage.getItem('flory_device_role');
  if (role === 'caja') return true;
  if (role === 'tablet' || role === 'vendedor') return false;

  // 2. Si corre en localhost o 127.0.0.1 (servidor nativo de Caja en la PC principal)
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true;

  // 3. Cualquier dispositivo conectado por red Wi-Fi (IP local, tablet, celular) NO es Caja
  return false;
}

export function verifyAdminPin(pin) {
  return String(pin || '').trim() === CAJA_ADMIN_PIN;
}

export function unlockCajaWithPin(pin) {
  if (verifyAdminPin(pin)) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flory_device_role', 'caja');
    }
    return true;
  }
  return false;
}

export function lockCajaDevice() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('flory_device_role');
  }
}

// Normalizar vendedores válidos (o vacío si no tiene ninguno asignado)
export function normalizeVendor(vendor) {
  if (!vendor || vendor === '-' || vendor === 'SIN ASIGNAR' || vendor === 'Sin Asignar') {
    return '';
  }
  const clean = String(vendor).trim().toUpperCase();
  const found = VENDEDORES.find(v => v.toUpperCase() === clean);
  return found || '';
}

// Sanitizar y reparar registros de ventas heredados
export function sanitizeSale(sale, index = 0) {
  if (!sale || typeof sale !== 'object') return null;
  return {
    ...sale,
    id: Number(sale.id) || (index + 1),
    total: Number(sale.total) || 0,
    pago: normalizePayment(sale.pago),
    vendedor: normalizeVendor(sale.vendedor),
    cartItems: Array.isArray(sale.cartItems) ? sale.cartItems : [],
    printRequested: Number(sale.printRequested) || 0,
    sourceDevice: sale.sourceDevice || '',
    deliveryTime: sale.deliveryTime || '',
    orderTime: sale.orderTime || ''
  };
}

// Respaldo de seguridad diario inviolable en localStorage
export function saveSafetyBackup(sales) {
  try {
    if (!Array.isArray(sales) || sales.length === 0 || typeof window === 'undefined') return;
    const today = getTodayKey();
    const localClearedAt = Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0;
    const validSales = localClearedAt > 0
      ? sales.filter(s => {
          const t = s && s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
          return t > localClearedAt;
        })
      : sales;
    if (validSales.length === 0) return;

    const backupKey = `flory_sales_backup_${today}`;
    const rawBackup = localStorage.getItem(backupKey);
    const existingBackup = rawBackup ? JSON.parse(rawBackup) : [];
    const mergedBackup = mergeSalesLists(existingBackup, validSales);
    localStorage.setItem(backupKey, JSON.stringify(mergedBackup));
  } catch (e) {}
}

// Unión inteligente (Merge) de listas de ventas evitando duplicados o pérdida de órdenes
export function mergeSalesLists(listA = [], listB = []) {
  const map = new Map();
  const today = getTodayKey();
  const localClearedAt = typeof window !== 'undefined'
    ? (Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0)
    : 0;

  const getSaleTimestamp = (s) => {
    if (!s) return 0;
    if (s.updatedAt) {
      const t = new Date(s.updatedAt).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  const processSale = (s) => {
    if (!s) return;
    const clean = sanitizeSale(s);
    if (!clean || !clean.id) return;

    // Escudo 1: Si la orden pertenece explícitamente a otra fecha, descartar (pertenece a días anteriores)
    if (clean.date && clean.date !== today) {
      return;
    }

    // Escudo 2: Si hubo borrado hoy en este día y esta orden es anterior o igual al borrado, descartarla
    if (localClearedAt > 0) {
      const saleTime = getSaleTimestamp(clean);
      if (saleTime > 0 && saleTime <= localClearedAt) {
        return;
      }
    }

    const id = Number(clean.id);

    if (!map.has(id)) {
      map.set(id, clean);
    } else {
      const existing = map.get(id);
      const existingTime = getSaleTimestamp(existing);
      const incomingTime = getSaleTimestamp(clean);

      // Priorizar el registro con actualización más reciente
      let base = incomingTime >= existingTime ? { ...existing, ...clean } : { ...clean, ...existing };
      
      // Preservar la solicitud de impresión si alguno de los dos la tiene pendiente
      const printRequested = Math.max(Number(clean.printRequested) || 0, Number(existing.printRequested) || 0);
      base.printRequested = printRequested;

      map.set(id, base);
    }
  };

  (listA || []).forEach(processSale);
  (listB || []).forEach(processSale);

  return Array.from(map.values()).sort((a, b) => Number(a.id) - Number(b.id));
}

// Obtener todas las ventas del día (inmediato desde caché o localStorage)
export function getSales() {
  const today = getTodayKey();

  if (typeof window !== 'undefined') {
    const activeDate = localStorage.getItem('flory_sales_active_date');
    if (activeDate && activeDate !== today) {
      // Cambio de día detectado: archivar ventas del día anterior
      const oldRaw = localStorage.getItem(STORAGE_KEY);
      if (oldRaw && oldRaw !== '[]') {
        try {
          localStorage.setItem(`flory_sales_archive_${activeDate}`, oldRaw);
        } catch (e) {}
      }
      // Iniciar el nuevo día completamente en cero en este dispositivo
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem('flory_sales_active_date', today);
      cachedSales = [];
      return [];
    } else if (!activeDate) {
      localStorage.setItem('flory_sales_active_date', today);
    }
  }

  if (cachedSales !== null) {
    return cachedSales;
  }
  try {

    const localClearedAt = typeof window !== 'undefined'
      ? (Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0)
      : 0;

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    let needsResave = false;
    const sanitized = parsed
      .filter(s => {
        if (localClearedAt > 0) {
          const t = s && s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
          if (t > 0 && t <= localClearedAt) {
            needsResave = true;
            return false;
          }
        }
        return true;
      })
      .map((s, idx) => {
        const clean = sanitizeSale(s, idx);
        if (s.pago !== clean.pago || s.vendedor !== clean.vendedor || Number(s.total) !== clean.total) {
          needsResave = true;
        }
        return clean;
      });
    cachedSales = sanitized;
    if (needsResave && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      saveSafetyBackup(sanitized);
      syncWithCloud(sanitized);
    }
    return cachedSales;
  } catch (err) {
    console.error('Error parsing daily_sales:', err);
    return [];
  }
}

// Guardar array de ventas y emitir evento
export function persistSales(sales, emit = true, syncApi = true, syncCloud = true) {
  try {
    const today = getTodayKey();
    if (typeof window !== 'undefined') {
      localStorage.setItem('flory_sales_active_date', today);
    }
    const sanitized = (sales || []).map((s, idx) => sanitizeSale(s, idx));
    cachedSales = sanitized;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    saveSafetyBackup(sanitized);
    if (emit) {
      if (syncChannel) {
        syncChannel.postMessage({ type: 'SALES_UPDATED', sales: sanitized });
      }
      notifyListeners(sanitized);
    }
    if (syncApi) {
      postApiAction({ action: 'SAVE_ALL', sales: sanitized });
    }
    if (syncCloud) {
      syncWithCloud(sanitized);
    }
  } catch (err) {
    console.error('Error persisting sales:', err);
  }
}

// Agregar una nueva venta
export function addSale(saleData) {
  const sales = getSales();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const newSale = {
    id: sales.length > 0 ? Math.max(...sales.map(s => Number(s.id) || 0)) + 1 : 1,
    date: saleData.date || getTodayKey(),
    time: saleData.time || timeStr,
    orderTime: saleData.orderTime || timeStr,
    deliveryTime: saleData.deliveryTime || '',
    customerName: saleData.customerName || 'Cliente Mostrador',
    phone: saleData.phone || '-',
    vendedor: normalizeVendor(saleData.vendedor),
    pago: normalizePayment(saleData.pago),
    total: Number(saleData.total) || 0,
    items: saleData.items || '',
    cartItems: Array.isArray(saleData.cartItems) ? saleData.cartItems : [],
    printRequested: Number(saleData.printRequested) || 0,
    sourceDevice: saleData.sourceDevice || getDeviceId(),
    updatedAt: new Date().toISOString()
  };

  sales.push(newSale);
  cachedSales = sales;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  saveSafetyBackup(sales);

  if (syncChannel) {
    syncChannel.postMessage({ type: 'SALES_UPDATED', sales });
  }
  notifyListeners(sales);

  // Auto-registrar cliente en el directorio
  if (newSale.customerName && newSale.customerName.toLowerCase() !== 'cliente mostrador') {
    saveCustomer({
      name: newSale.customerName,
      phone: newSale.phone,
      vendedor: newSale.vendedor
    });
  }

  // Sincronizar en la nube en tiempo real
  syncWithCloud(sales);
  postApiAction({ action: 'ADD_SALE', sale: newSale });

  return newSale;
}

// Actualizar una propiedad específica de una venta (ej: pago, vendedor)
export function updateSaleProperty(saleId, property, value) {
  const sales = getSales();
  const index = sales.findIndex(s => Number(s.id) === Number(saleId));
  if (index !== -1) {
    let finalValue = value;
    if (property === 'pago') finalValue = normalizePayment(value);
    if (property === 'vendedor') finalValue = normalizeVendor(value);

    sales[index][property] = finalValue;
    sales[index].updatedAt = new Date().toISOString();
    cachedSales = sales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));

    if (syncChannel) {
      syncChannel.postMessage({ type: 'SALES_UPDATED', sales });
    }
    notifyListeners(sales);

    // Enviar cambio a Firebase y servidor central de inmediato
    syncWithCloud(sales);
    postApiAction({ 
      action: 'UPDATE_PROP', 
      id: Number(saleId), 
      property, 
      value: finalValue,
      sale: sales[index]
    });

    return sales[index];
  }
  return null;
}

// Borrar historial (Acción exclusiva de la Computadora Central de Caja)
export function clearAllSales() {
  if (!isCajaDevice()) {
    console.warn('⚠️ Intento de borrado ignorado: solo permitido desde la computadora central de Caja.');
    alert('⚠️ Esta acción solo está permitida desde la computadora central de caja.');
    return false;
  }

  const clearTimestamp = Date.now();
  const today = getTodayKey();

  // Guardar copia de seguridad en la Papelera antes de borrar
  const currentSales = getSales();
  if (currentSales && currentSales.length > 0) {
    try {
      localStorage.setItem(`flory_sales_trash_backup_${today}`, JSON.stringify(currentSales));
      localStorage.setItem(`flory_sales_trash_timestamp_${today}`, String(clearTimestamp));
    } catch (e) {
      console.warn('No se pudo guardar respaldo en papelera:', e);
    }
  }

  localStorage.setItem(`flory_sales_cleared_at_${today}`, String(clearTimestamp));
  localStorage.removeItem(`flory_sales_backup_${today}`);
  localStorage.removeItem(STORAGE_KEY);
  cachedSales = [];

  if (syncChannel) {
    syncChannel.postMessage({ type: 'SALES_CLEARED', clearedAt: clearTimestamp, sales: [] });
  }
  notifyListeners([]);

  syncWithCloud([], clearTimestamp);
  postApiAction({ action: 'CLEAR', clearedAt: clearTimestamp });
  return true;
}

// Comprobar si hay respaldo en papelera para el día de hoy
export function hasTrashBackup() {
  if (typeof window === 'undefined') return false;
  const today = getTodayKey();
  const raw = localStorage.getItem(`flory_sales_trash_backup_${today}`);
  if (!raw) return false;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0;
  } catch (e) {
    return false;
  }
}

// Restaurar el historial borrado desde la papelera de hoy
export function restoreLastClearedSales() {
  if (!isCajaDevice()) {
    alert('⚠️ Esta acción solo está permitida desde la computadora central de caja.');
    return false;
  }
  const today = getTodayKey();
  const raw = localStorage.getItem(`flory_sales_trash_backup_${today}`);
  if (!raw) return false;
  try {
    const backupSales = JSON.parse(raw);
    if (!Array.isArray(backupSales) || backupSales.length === 0) return false;

    // Eliminar marcas de borrado
    localStorage.removeItem(`flory_sales_cleared_at_${today}`);
    localStorage.removeItem(`flory_sales_trash_backup_${today}`);
    localStorage.removeItem(`flory_sales_trash_timestamp_${today}`);

    // Restaurar ventas
    persistSales(backupSales, true, true, true);
    return true;
  } catch (e) {
    console.error('Error restaurando papelera:', e);
    return false;
  }
}

// Suscribirse a cambios en tiempo real
export function subscribeSales(callback) {
  listeners.add(callback);
  // Emitir estado actual de inmediato
  callback(getSales());

  return () => {
    listeners.delete(callback);
  };
}

// ============================================================================
// --- Directorio Inteligente de Clientes (Autocompletado & Teléfonos) ---
// ============================================================================

export const CUSTOMERS_KEY = 'flory_customers';
let cachedCustomers = null;
const customerListeners = new Set();

// Normalizar texto para búsquedas sin tildes ni mayúsculas
export function normalizeSearchText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Obtener lista completa de clientes (auto-poblando con ventas históricas si está vacío)
export function getCustomers() {
  if (cachedCustomers !== null) {
    return cachedCustomers;
  }
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    let list = raw ? JSON.parse(raw) : [];

    const map = new Map();

    // Cargar los existentes primero
    list.forEach(c => {
      if (c && c.name && c.name.toLowerCase() !== 'cliente mostrador') {
        const key = normalizeSearchText(c.name);
        map.set(key, {
          name: c.name.trim(),
          phone: (c.phone && c.phone !== '-') ? c.phone.trim() : '',
          vendedor: normalizeVendor(c.vendedor),
          ordersCount: Number(c.ordersCount) || 1,
          lastOrderDate: c.lastOrderDate || ''
        });
      }
    });

    // Reconstruir/complementar a partir del historial de ventas del día
    const sales = getSales();
    sales.forEach(s => {
      const cName = (s.customerName || '').trim();
      if (cName && cName.toLowerCase() !== 'cliente mostrador') {
        const key = normalizeSearchText(cName);
        const existing = map.get(key);
        const phone = (s.phone && s.phone !== '-') ? s.phone.trim() : '';
        const vend = normalizeVendor(s.vendedor);
        if (existing) {
          existing.ordersCount = (existing.ordersCount || 1) + 1;
          if (!existing.phone && phone) existing.phone = phone;
          if (vend) existing.vendedor = vend;
          if (s.date && (!existing.lastOrderDate || s.date > existing.lastOrderDate)) {
            existing.lastOrderDate = s.date;
          }
        } else {
          map.set(key, {
            name: cName,
            phone: phone,
            vendedor: vend,
            ordersCount: 1,
            lastOrderDate: s.date || getTodayKey()
          });
        }
      }
    });

    list = Array.from(map.values()).sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));
    cachedCustomers = list;
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
    return cachedCustomers;
  } catch (err) {
    console.error('Error cargando directorio de clientes:', err);
    return [];
  }
}

// Guardar o actualizar un cliente
export function saveCustomer({ name, phone, vendedor }) {
  if (!name) return null;
  const cleanName = String(name).trim();
  if (cleanName.toLowerCase() === 'cliente mostrador' || cleanName.length < 2) return null;

  const cleanPhone = (phone && phone !== '-') ? String(phone).trim() : '';
  const cleanVendor = normalizeVendor(vendedor);
  const customers = getCustomers();
  const searchKey = normalizeSearchText(cleanName);

  const index = customers.findIndex(c => normalizeSearchText(c.name) === searchKey);
  const nowKey = getTodayKey();

  if (index !== -1) {
    customers[index].name = cleanName;
    if (cleanPhone) customers[index].phone = cleanPhone;
    if (cleanVendor) customers[index].vendedor = cleanVendor;
    customers[index].ordersCount = (Number(customers[index].ordersCount) || 1) + 1;
    customers[index].lastOrderDate = nowKey;
  } else {
    customers.push({
      name: cleanName,
      phone: cleanPhone,
      vendedor: cleanVendor,
      ordersCount: 1,
      lastOrderDate: nowKey
    });
  }

  // Ordenar por clientes más recurrentes
  customers.sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));
  cachedCustomers = customers;
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));

  if (syncChannel) {
    syncChannel.postMessage({ type: 'CUSTOMERS_UPDATED', customers });
  }
  notifyCustomerListeners(customers);
  syncCustomersWithCloud(customers);

  return customers[index !== -1 ? index : customers.length - 1];
}

// Buscar clientes por coincidencia de nombre o teléfono
export function searchCustomers(query) {
  if (!query) return [];
  const qNorm = normalizeSearchText(query);
  const qDigits = String(query).replace(/\D/g, '');
  if (!qNorm && !qDigits) return [];

  const customers = getCustomers();
  const matches = customers.filter(c => {
    const nameNorm = normalizeSearchText(c.name);
    const phoneDigits = (c.phone || '').replace(/\D/g, '');

    const nameMatch = nameNorm.includes(qNorm);
    const phoneMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits);
    return nameMatch || phoneMatch;
  });

  // Priorizar coincidencias al inicio del nombre y mayor cantidad de pedidos
  matches.sort((a, b) => {
    const aNorm = normalizeSearchText(a.name);
    const bNorm = normalizeSearchText(b.name);
    const aStarts = aNorm.startsWith(qNorm) ? 1 : 0;
    const bStarts = bNorm.startsWith(qNorm) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;
    return (b.ordersCount || 0) - (a.ordersCount || 0);
  });

  return matches.slice(0, 10);
}

// Eliminar un cliente del directorio
export function deleteCustomer(name) {
  if (!name) return false;
  const cleanName = String(name).trim();
  const searchKey = normalizeSearchText(cleanName);
  const customers = getCustomers();
  const index = customers.findIndex(c => normalizeSearchText(c.name) === searchKey);
  if (index === -1) return false;

  customers.splice(index, 1);
  cachedCustomers = customers;
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));

  if (syncChannel) {
    syncChannel.postMessage({ type: 'CUSTOMERS_UPDATED', customers });
  }
  notifyCustomerListeners(customers);
  syncCustomersWithCloud(customers);

  return true;
}

// Notificar a observadores de clientes
function notifyCustomerListeners(customers) {
  customerListeners.forEach(cb => {
    try { cb(customers); } catch (e) { console.error('Error en listener de clientes:', e); }
  });
}

export function subscribeCustomers(callback) {
  customerListeners.add(callback);
  callback(getCustomers());
  return () => customerListeners.delete(callback);
}

// Enviar directorio de clientes a Firebase Firestore
async function syncCustomersWithCloud(customers) {
  if (!firebaseDb) return;
  try {
    const { doc, setDoc } = await dynamicImport('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(firebaseDb, 'directorio_clientes', 'clientes_activos'), {
      customers: customers || [],
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    console.log('☁️ Directorio de clientes sincronizado con Firebase:', (customers || []).length);
  } catch (err) {
    console.error('Error sincronizando clientes con Firebase:', err);
  }
}

// Comunicación con la API central local (si está en dev server)
async function postApiAction(payload) {
  try {
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Modo offline / estático en Vercel
  }
}

// Conectar Server-Sent Events (SSE) si estamos en servidor local
function setupRealtimeSSE() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

  try {
    const sse = new EventSource('/api/events');

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const today = getTodayKey();

        // 1. Manejar orden de borrado global
        if (data && (data.action === 'CLEAR' || data.type === 'CLEAR')) {
          const clearedAt = Number(data.clearedAt) || Date.now();
          localStorage.setItem(`flory_sales_cleared_at_${today}`, String(clearedAt));
          cachedSales = [];
          localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
          localStorage.removeItem(`flory_sales_backup_${today}`);
          notifyListeners([]);
          return;
        }

        if (data && Array.isArray(data.sales)) {
          const localClearedAt = Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0;
          if (data.sales.length === 0 && localClearedAt > 0) {
            cachedSales = [];
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            notifyListeners([]);
            return;
          }

          const currentSales = cachedSales !== null ? cachedSales : getSales();
          const merged = mergeSalesLists(currentSales, data.sales);
          saveSafetyBackup(merged);

          if (!areSalesEqual(merged, currentSales)) {
            cachedSales = merged;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            notifyListeners(merged);
          }

          // Si merged tiene más pedidos que los que mandó el servidor, notificamos al servidor para que no los pierda (solo si no hubo borrado reciente)
          if (merged.length > data.sales.length && localClearedAt === 0) {
            postApiAction({ action: 'SAVE_ALL', sales: merged });
          }
        }
      } catch (err) {
        console.error('Error parseando SSE data:', err);
      }
    };

    sse.onerror = () => {
      // Reintento automático nativo de SSE
    };
  } catch (err) {
    // SSE no disponible en entornos estáticos
  }
}

setupRealtimeSSE();

// Comparar si dos listas de ventas tienen cambios reales (usando Map por ID, no por índice estricto)
export function areSalesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const mapA = new Map();
  for (const s of a) {
    if (s && s.id) mapA.set(Number(s.id), s);
  }
  for (const sB of b) {
    if (!sB || !sB.id) return false;
    const sA = mapA.get(Number(sB.id));
    if (!sA) return false;
    if (
      normalizePayment(sA.pago) !== normalizePayment(sB.pago) ||
      normalizeVendor(sA.vendedor) !== normalizeVendor(sB.vendedor) ||
      Number(sA.total) !== Number(sB.total) ||
      String(sA.customerName || '') !== String(sB.customerName || '') ||
      String(sA.items || '') !== String(sB.items || '') ||
      Number(sA.printRequested || 0) !== Number(sB.printRequested || 0) ||
      String(sA.deliveryTime || '') !== String(sB.deliveryTime || '')
    ) {
      return false;
    }
  }
  return true;
}

// Sincronización activa con servidor local (fallback)
async function syncFromServer() {
  if (typeof window === 'undefined') return;
  // En Vercel o hosting estático en la nube, la API local /api/sales no existe
  if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('github.io')) {
    return;
  }
  try {
    const res = await fetch('/api/sales');
    if (!res.ok) return;
    const serverSales = await res.json();
    if (Array.isArray(serverSales)) {
      const today = getTodayKey();
      const localClearedAt = Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0;

      if (serverSales.length === 0 && localClearedAt > 0) {
        cachedSales = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        notifyListeners([]);
        return;
      }

      const currentSales = cachedSales !== null ? cachedSales : getSales();
      const merged = mergeSalesLists(currentSales, serverSales);
      saveSafetyBackup(merged);

      if (!areSalesEqual(merged, currentSales)) {
        cachedSales = merged;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        notifyListeners(merged);
      }

      // Si nuestro dispositivo local tiene órdenes que el servidor aún no tiene, preservarlas en el servidor
      if (merged.length > serverSales.length && localClearedAt === 0) {
        postApiAction({ action: 'SAVE_ALL', sales: merged });
      }
    }
  } catch (e) {
    // Offline / sin conexión local
  }
}

if (typeof window !== 'undefined') {
  syncFromServer();
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncFromServer();
    }
  });
  window.addEventListener('focus', syncFromServer);
}

// Escuchar sincronización de otras pestañas en la misma máquina
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'SALES_CLEARED') {
      const today = getTodayKey();
      if (event.data.clearedAt) {
        localStorage.setItem(`flory_sales_cleared_at_${today}`, String(event.data.clearedAt));
      }
      cachedSales = [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.removeItem(`flory_sales_backup_${today}`);
      notifyListeners([]);
    } else if (event.data && event.data.type === 'SALES_UPDATED') {
      cachedSales = event.data.sales || getSales();
      notifyListeners(cachedSales);
    } else if (event.data && event.data.type === 'CUSTOMERS_UPDATED') {
      cachedCustomers = event.data.customers || getCustomers();
      notifyCustomerListeners(cachedCustomers);
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      cachedSales = null;
      notifyListeners(getSales());
    } else if (event.key === CUSTOMERS_KEY) {
      cachedCustomers = null;
      notifyCustomerListeners(getCustomers());
    }
  });
}

// ============================================================================
// --- Integración Firebase Firestore Cloud (Tiempo Real Teléfono <-> PC) ---
// ============================================================================

// dynamicImport evita que Rollup/Vite rompa el build intentando resolver la URL del CDN
const dynamicImport = (url) => new Function('u', 'return import(u)')(url);

let firebaseDb = null;
let isWritingToCloud = false;
let lastCloudWriteTimestamp = 0;
let isFirebaseInitialized = false;

export async function initFirebase(config = FIREBASE_CONFIG) {
  if (typeof window === 'undefined' || isFirebaseInitialized) return;
  try {
    if (!config || !config.apiKey) return false;
    isFirebaseInitialized = true;

    // Cargar Firebase Modular SDK desde CDN oficial de Google
    const { initializeApp } = await dynamicImport('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, doc, onSnapshot, setDoc } = await dynamicImport('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const app = initializeApp(config);
    firebaseDb = getFirestore(app);

    const today = getTodayKey();
    const todayDocRef = doc(firebaseDb, 'ventas_diarias', today);

    // Escucha en tiempo real instantánea (WebSocket / HTTP push de Google)
    onSnapshot(todayDocRef, (docSnap) => {
      // Ignorar rebotes mientras nosotros mismos estamos escribiendo o pendientes locales
      if (isWritingToCloud || (Date.now() - lastCloudWriteTimestamp < 1500)) return;
      if (docSnap.metadata && docSnap.metadata.hasPendingWrites) return;

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        const rawCloudSales = Array.isArray(cloudData.sales) ? cloudData.sales : [];
        const cloudSales = rawCloudSales.map((s, idx) => sanitizeSale(s, idx));
        const cloudClearedAt = Number(cloudData.clearedAt) || 0;
        const localClearedAt = Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0;

        // 1. Si la nube indica que hubo un borrado en este día
        if (cloudClearedAt > 0 && cloudClearedAt >= localClearedAt) {
          localStorage.setItem(`flory_sales_cleared_at_${today}`, String(cloudClearedAt));

          // Filtrar órdenes que se hayan creado ANTES de la orden de borrado
          const validCloudSales = cloudSales.filter(s => {
            const sTime = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
            return sTime > cloudClearedAt;
          });

          // Si la nube quedó vacía tras el borrado, purgar la memoria local de este dispositivo y detener
          if (validCloudSales.length === 0) {
            cachedSales = [];
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            localStorage.removeItem(`flory_sales_backup_${today}`);
            if (syncChannel) {
              syncChannel.postMessage({ type: 'SALES_UPDATED', sales: [] });
            }
            notifyListeners([]);
            console.log('🧹 Historial purgado en este dispositivo por orden central de Caja.');
            return; // ¡IMPORTANTE! NO HACER MERGE NI RE-SUBIR VENTAS ANTIGUAS
          }
        }

        const currentSales = cachedSales !== null ? cachedSales : getSales();
        const effectiveClearedAt = Math.max(cloudClearedAt, localClearedAt);
        const filteredCurrentSales = effectiveClearedAt > 0
          ? currentSales.filter(s => {
              const sTime = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
              return sTime > effectiveClearedAt;
            })
          : currentSales;

        const merged = mergeSalesLists(filteredCurrentSales, cloudSales);
        saveSafetyBackup(merged);

        if (!areSalesEqual(merged, currentSales)) {
          console.log('⚡ Sincronización recibida de Firebase Cloud:', merged.length, 'ventas');
          cachedSales = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          if (syncChannel) {
            syncChannel.postMessage({ type: 'SALES_UPDATED', sales: merged });
          }
          notifyListeners(merged);
        }

        // Si el dispositivo local tenía ventas NUEVAS que no estaban en la nube, subirlas
        if (merged.length > cloudSales.length && (!effectiveClearedAt || cloudSales.length > 0)) {
          syncWithCloud(merged);
        }
      } else {
        // Si no hay documento en la nube para hoy, pero este dispositivo tiene ventas, subirlas solo si no fue purgado hoy y pertenecen a la fecha activa
        const localClearedAt = Number(localStorage.getItem(`flory_sales_cleared_at_${today}`)) || 0;
        const activeDate = typeof window !== 'undefined' ? localStorage.getItem('flory_sales_active_date') : '';
        if (localClearedAt === 0 && activeDate === today) {
          const localSales = getSales();
          if (localSales && localSales.length > 0) {
            syncWithCloud(localSales);
          }
        }
      }
    }, (error) => {
      console.warn('Advertencia en conexión con Firestore:', error);
    });

    // Escucha en tiempo real del directorio de clientes en la nube
    const customersDocRef = doc(firebaseDb, 'directorio_clientes', 'clientes_activos');
    onSnapshot(customersDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.customers)) {
          const localMap = new Map();
          const currentCustomers = getCustomers();
          currentCustomers.forEach(c => localMap.set(normalizeSearchText(c.name), c));
          data.customers.forEach(c => {
            if (c && c.name) {
              const k = normalizeSearchText(c.name);
              const exist = localMap.get(k);
              if (!exist) {
                localMap.set(k, c);
              } else {
                if (c.phone && !exist.phone) exist.phone = c.phone;
                if ((c.ordersCount || 0) > (exist.ordersCount || 0)) exist.ordersCount = c.ordersCount;
              }
            }
          });
          const merged = Array.from(localMap.values()).sort((a,b) => (b.ordersCount || 0) - (a.ordersCount || 0));
          cachedCustomers = merged;
          localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(merged));
          notifyCustomerListeners(merged);
        }
      }
    }, (err) => {
      console.warn('Advertencia en conexión de clientes con Firestore:', err);
    });

    console.log('✅ Firebase Firestore conectado y sincronizando en tiempo real con la nube.');
    return true;
  } catch (e) {
    console.warn('Firebase no pudo inicializar:', e);
    isFirebaseInitialized = false;
    return false;
  }
}

// Enviar cambios a Firebase Firestore
async function syncWithCloud(sales, clearedAt = 0) {
  if (!firebaseDb) return;
  try {
    isWritingToCloud = true;
    lastCloudWriteTimestamp = Date.now();
    const { doc, setDoc } = await dynamicImport('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const today = getTodayKey();
    const payload = {
      sales: sales || [],
      lastUpdated: new Date().toISOString()
    };
    if (clearedAt > 0) {
      payload.clearedAt = clearedAt;
    }
    await setDoc(doc(firebaseDb, 'ventas_diarias', today), payload, { merge: true });
    console.log('☁️ Ventas sincronizadas en Firebase:', (sales || []).length);
  } catch (err) {
    console.error('Error sincronizando con Firebase:', err);
  } finally {
    setTimeout(() => {
      isWritingToCloud = false;
    }, 1500);
  }
}

// Iniciar Firebase automáticamente en cualquier navegador
if (typeof window !== 'undefined') {
  initFirebase(FIREBASE_CONFIG);

  // Monitor de cambio de fecha a medianoche (reinicio automático garantizado a 0 ventas)
  setInterval(() => {
    const today = getTodayKey();
    const activeDate = localStorage.getItem('flory_sales_active_date');
    if (activeDate && activeDate !== today) {
      console.log('🌅 Cambio de día detectado a medianoche. Reiniciando ventas a cero.');
      cachedSales = null;
      const newSales = getSales();
      notifyListeners(newSales);
    }
  }, 30000);
}
