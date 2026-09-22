// src/db.js - Capa de datos unificada y sincronización en tiempo real (SSE + API + Cloud)

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

const STORAGE_KEY = 'daily_sales';
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('flory_sales_sync') : null;
const listeners = new Set();
let cachedSales = null;

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

// Obtener todas las ventas del día (inmediato desde caché o localStorage)
export function getSales() {
  if (cachedSales !== null) {
    return cachedSales;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedSales = raw ? JSON.parse(raw) : [];
    return cachedSales;
  } catch (err) {
    console.error('Error parsing daily_sales:', err);
    return [];
  }
}

// Guardar array de ventas y emitir evento
export function persistSales(sales, emit = true, syncApi = true) {
  try {
    cachedSales = sales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    if (emit) {
      if (syncChannel) {
        syncChannel.postMessage({ type: 'SALES_UPDATED', sales });
      }
      notifyListeners(sales);
    }
    if (syncApi) {
      postApiAction({ action: 'SAVE_ALL', sales });
    }
    // Sincronizar con Firebase si está configurado
    syncWithCloud(sales);
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
    id: sales.length > 0 ? Math.max(...sales.map(s => s.id || 0)) + 1 : 1,
    date: saleData.date || now.toISOString().split('T')[0],
    time: saleData.time || timeStr,
    customerName: saleData.customerName || 'Cliente Mostrador',
    phone: saleData.phone || '-',
    vendedor: saleData.vendedor || '-',
    pago: saleData.pago || '-',
    total: Number(saleData.total) || 0,
    items: saleData.items || '',
    updatedAt: new Date().toISOString()
  };

  sales.push(newSale);
  cachedSales = sales;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));

  if (syncChannel) {
    syncChannel.postMessage({ type: 'SALES_UPDATED', sales });
  }
  notifyListeners(sales);

  // Enviar al servidor central
  postApiAction({ action: 'ADD_SALE', sale: newSale });
  syncWithCloud(sales);

  return newSale;
}

// Actualizar una propiedad específica de una venta (ej: pago, vendedor)
export function updateSaleProperty(saleId, property, value) {
  const sales = getSales();
  const index = sales.findIndex(s => s.id === Number(saleId));
  if (index !== -1) {
    sales[index][property] = value;
    sales[index].updatedAt = new Date().toISOString();
    cachedSales = sales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));

    if (syncChannel) {
      syncChannel.postMessage({ type: 'SALES_UPDATED', sales });
    }
    notifyListeners(sales);

    // Enviar cambio al servidor central de inmediato
    postApiAction({ action: 'UPDATE_PROP', id: Number(saleId), property, value });
    syncWithCloud(sales);

    return sales[index];
  }
  return null;
}

// Borrar historial
export function clearAllSales() {
  cachedSales = [];
  localStorage.removeItem(STORAGE_KEY);
  if (syncChannel) {
    syncChannel.postMessage({ type: 'SALES_UPDATED', sales: [] });
  }
  notifyListeners([]);
  postApiAction({ action: 'CLEAR' });
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

// Comunicación con la API central
async function postApiAction(payload) {
  try {
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('API sync offline / fallback local:', e);
  }
}

// Conectar Server-Sent Events (SSE) para recibir cambios de cualquier celular o computadora en vivo
function setupRealtimeSSE() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

  try {
    const sse = new EventSource('/api/events');

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && Array.isArray(data.sales)) {
          cachedSales = data.sales;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.sales));
          notifyListeners(data.sales);
        }
      } catch (err) {
        console.error('Error parseando SSE data:', err);
      }
    };

    sse.onerror = () => {
      // Reintento automático nativo de SSE
    };
  } catch (err) {
    console.warn('SSE no disponible:', err);
  }
}

// Iniciar conexión en tiempo real
setupRealtimeSSE();

// Sincronización activa con el servidor central (Fuente única de verdad)
async function syncFromServer() {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/sales');
    if (!res.ok) return;
    const serverSales = await res.json();
    if (Array.isArray(serverSales)) {
      const serverStr = JSON.stringify(serverSales);
      const currentStr = JSON.stringify(cachedSales !== null ? cachedSales : getSales());
      if (serverStr !== currentStr) {
        cachedSales = serverSales;
        localStorage.setItem(STORAGE_KEY, serverStr);
        notifyListeners(serverSales);
      }
    }
  } catch (e) {
    // Offline / sin conexión
  }
}

if (typeof window !== 'undefined') {
  // Sincronización inicial
  syncFromServer();

  // Al volver a la app o desbloquear el celular
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncFromServer();
    }
  });
  window.addEventListener('focus', syncFromServer);

  // Polling ligero cada 2.5 segundos para garantizar que si Safari duerme el SSE, se sincronice
  setInterval(syncFromServer, 2500);
}

// Escuchar sincronización de otras pestañas en la misma máquina
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'SALES_UPDATED') {
      cachedSales = event.data.sales || getSales();
      notifyListeners(cachedSales);
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      cachedSales = null;
      notifyListeners(getSales());
    }
  });
}

// --- Integración Firebase Cloud (Opcional para cuando se aloje en Vercel) ---
let firebaseDb = null;
let isCloudSyncing = false;

export async function initFirebase(config) {
  try {
    if (!config || !config.apiKey) return false;
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, doc, onSnapshot, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const app = initializeApp(config);
    firebaseDb = getFirestore(app);

    const today = new Date().toISOString().split('T')[0];
    const todayDocRef = doc(firebaseDb, 'ventas_diarias', today);

    onSnapshot(todayDocRef, (docSnap) => {
      if (docSnap.exists() && !isCloudSyncing) {
        const cloudSales = docSnap.data().sales || [];
        persistSales(cloudSales, true, false);
      }
    });

    console.log('Firebase Firestore conectado.');
    return true;
  } catch (e) {
    console.warn('Firebase no inicializado:', e);
    return false;
  }
}

async function syncWithCloud(sales) {
  if (!firebaseDb) return;
  try {
    isCloudSyncing = true;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const today = new Date().toISOString().split('T')[0];
    await setDoc(doc(firebaseDb, 'ventas_diarias', today), {
      sales,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error sincronizando con Firebase:', err);
  } finally {
    isCloudSyncing = false;
  }
}
