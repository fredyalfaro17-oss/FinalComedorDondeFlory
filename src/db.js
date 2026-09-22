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
export function persistSales(sales, emit = true, syncApi = true, syncCloud = true) {
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
    if (syncCloud) {
      syncWithCloud(sales);
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
    sales[index][property] = value;
    sales[index].updatedAt = new Date().toISOString();
    cachedSales = sales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));

    if (syncChannel) {
      syncChannel.postMessage({ type: 'SALES_UPDATED', sales });
    }
    notifyListeners(sales);

    // Enviar cambio a Firebase y servidor central de inmediato
    syncWithCloud(sales);
    postApiAction({ action: 'UPDATE_PROP', id: Number(saleId), property, value });

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
  syncWithCloud([]);
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
    // SSE no disponible en entornos estáticos
  }
}

setupRealtimeSSE();

// Sincronización activa con servidor local (fallback)
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

// ============================================================================
// --- Integración Firebase Firestore Cloud (Tiempo Real Teléfono <-> PC) ---
// ============================================================================

// dynamicImport evita que Rollup/Vite rompa el build intentando resolver la URL del CDN
const dynamicImport = (url) => new Function('u', 'return import(u)')(url);

let firebaseDb = null;
let isWritingToCloud = false;
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
      // Ignorar rebotes mientras nosotros mismos estamos escribiendo
      if (isWritingToCloud) return;

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        const cloudSales = Array.isArray(cloudData.sales) ? cloudData.sales : [];
        const currentSales = cachedSales !== null ? cachedSales : getSales();

        if (JSON.stringify(cloudSales) !== JSON.stringify(currentSales)) {
          console.log('⚡ Sincronización recibida de Firebase Cloud:', cloudSales.length, 'ventas');
          cachedSales = cloudSales;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudSales));
          if (syncChannel) {
            syncChannel.postMessage({ type: 'SALES_UPDATED', sales: cloudSales });
          }
          notifyListeners(cloudSales);
        }
      } else {
        // Si no hay documento en la nube para hoy, pero este dispositivo tiene ventas, subirlas
        const localSales = getSales();
        if (localSales && localSales.length > 0) {
          syncWithCloud(localSales);
        }
      }
    }, (error) => {
      console.warn('Advertencia en conexión con Firestore:', error);
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
async function syncWithCloud(sales) {
  if (!firebaseDb) return;
  try {
    isWritingToCloud = true;
    const { doc, setDoc } = await dynamicImport('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const today = getTodayKey();
    await setDoc(doc(firebaseDb, 'ventas_diarias', today), {
      sales: sales || [],
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    console.log('☁️ Ventas sincronizadas en Firebase:', (sales || []).length);
  } catch (err) {
    console.error('Error sincronizando con Firebase:', err);
  } finally {
    setTimeout(() => {
      isWritingToCloud = false;
    }, 400);
  }
}

// Iniciar Firebase automáticamente en cualquier navegador
if (typeof window !== 'undefined') {
  initFirebase(FIREBASE_CONFIG);
}
