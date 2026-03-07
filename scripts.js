const { useState, useEffect, useRef, useMemo, useCallback } = React;
const motion = window.Motion.motion;
const AnimatePresence = window.Motion.AnimatePresence;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyExAMrQchkOQy1mnUmttw2ZkOYbhaHis9frZ9OG1Cw_eXuQfwhPFoK3-xv1cokgxPS/exec";
const STORAGE_KEY = 'smartcart-pro-v2';

// ─── MAPA DE IMÁGENES ────────────────────────────────────────────────────────
// IMPORTANT: Keys are checked via String.includes(), sorted longest-first.
// More specific / longer keys will always match before shorter generic ones.
const IMAGE_MAP = {
    'quifaro':      'https://i.postimg.cc/NFdtj6bC/1085998.png',
    'bebida':       'https://i.postimg.cc/6qbsX95Z/Bebida.png',
    'cerveza':      'https://i.postimg.cc/NFChcgfT/cerveza.jpg',
    'crema':        'https://i.postimg.cc/9XLHTBtQ/Crema.jpg',
    'detergente':   'https://i.postimg.cc/MH3kSWKg/Detergente.jpg',
    'mostaccioli':  'https://i.postimg.cc/zDxYWkSj/mostaccioli.jpg',
    'leche':        'https://i.postimg.cc/0jXgs82L/pack-leche.jpg',
    'pasta dental': 'https://i.postimg.cc/7PKr7NMX/pasta-diente.jpg',
    'queso':        'https://i.postimg.cc/wxwYJkcJ/receta-queso-gouda.jpg',
    'salsa':        'https://i.postimg.cc/fW8QXvjC/Salsa.jpg',
    'suavizante':   'https://i.postimg.cc/VL5QFbDn/suavizante.jpg',
    // ── Imágenes reales ──
    'gel de afeitar': 'https://i.postimg.cc/g2d4ZCxX/Gel-Afeitar.jpg',
    'carne':        'https://i.postimg.cc/RZ9GHkWM/Carne-Molida.jpg',
    'aceite':       'https://i.postimg.cc/yY0vW188/Aceite-miraflores.png',
    'confort':      'https://i.postimg.cc/8zDw627r/Confort.jpg',
    'mayonesa':     'https://i.postimg.cc/SxqVMBnn/Mayonesa.jpg',
    'margarina':    'https://i.postimg.cc/L8Rv1cJg/Qualy.jpg',
    'sal':          'https://i.postimg.cc/RZ9GHkWw/Sal.png',
    // ── Genéricas ──
    'prestobarba':  'https://img.icons8.com/emoji/96/razor.png',
    'gel':          'https://i.postimg.cc/g2d4ZCxX/Gel-Afeitar.jpg',
    'afeitar':      'https://i.postimg.cc/g2d4ZCxX/Gel-Afeitar.jpg',
    'desodorante':  'https://i.postimg.cc/sfHRKJYC/909888-7791293043791.jpg',
};

const FALLBACK_IMG = 'https://i.postimg.cc/6pbD2Q42/icons8-carrito-de-compras-emoji-48.png';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// Parser robusto para precios: maneja formato chileno "6.000" → 6000
const parsePrecio = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isFinite(val) ? Math.max(0, val) : 0;
    // Si es string con punto de miles chileno: "6.000" → "6000"
    const str = String(val).trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str);
    return isFinite(num) ? Math.max(0, num) : 0;
};
const obtenerCantidad = (nombre) => {
    if (!nombre) return 1;
    const match = nombre.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 1;
};

const getProductImage = (nombre) => {
    const n = (nombre || '').toLowerCase();
    // Sort keys by length descending so specific multi-word keys match before short generic ones
    const keys = Object.keys(IMAGE_MAP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (n.includes(key.trim())) return IMAGE_MAP[key];
    }
    return FALLBACK_IMG;
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
function App() {
    const [isOnline, setIsOnline]   = useState(navigator.onLine);
    const [syncState, setSyncState] = useState('idle'); // 'idle' | 'syncing' | 'error'
    const [isLoaded, setIsLoaded]   = useState(false);
    const [productos, setProductos] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [nuevo, setNuevo]                   = useState({ nombre: '' });
    const [editandoId, setEditandoId]         = useState(null);
    const [editandoNombreId, setEditandoNombreId] = useState(null);
    const [confirmReset, setConfirmReset]     = useState(false);

    // ── Ref para evitar que cargarDesdeNube() sobreescriba cambios locales ──
    // Guarda el timestamp del último POST exitoso.
    const lastPostTs    = useRef(0);
    // Cola de sincronización: si llega un cambio mientras sincroniza, lo guarda.
    const pendingSync   = useRef(null);
    const isSyncingRef  = useRef(false);

    // ── Online / Offline ─────────────────────────────────────────────────────
    useEffect(() => {
        const on  = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online',  on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online',  on);
            window.removeEventListener('offline', off);
        };
    }, []);

    // ── Carga inicial desde la nube ──────────────────────────────────────────
    const cargarDesdeNube = useCallback(async () => {
        if (!navigator.onLine) { setIsLoaded(true); return; }
        setSyncState('syncing');
        try {
            const res  = await fetch(WEB_APP_URL + '?t=' + Date.now()); // evita caché
            const data = await res.json();
            if (data && Array.isArray(data) && data.length > 0) {
                // ✅ FIX DUPLICADOS: No sobreescribir si hubo un POST propio reciente
                // (la nube puede tardar en actualizarse y traer datos desactualizados)
                if (Date.now() - lastPostTs.current > 5000) {
                    // Normalizar y deduplicar por id (siempre como número)
                    const seen = new Set();
                    const deduped = data
                        .map(item => ({
                            ...item,
                            // Asegurar que id sea siempre número para que React no mezcle keys
                            id: Number(item.id) || Date.now() + Math.random(),
                            precio: parsePrecio(item.precio),
                            comprado: Boolean(item.comprado),
                            nombre: String(item.nombre || '').trim(),
                        }))
                        .filter(item => {
                            if (!item.nombre) return false; // descartar items sin nombre
                            const key = item.id;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });
                    setProductos(deduped);
                }
            }
        } catch (e) {
            console.error('cargarDesdeNube:', e);
            setSyncState('error');
        } finally {
            setSyncState('idle');
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => { cargarDesdeNube(); }, []);

    // ── Enviar a la nube (con cola para no perder cambios) ───────────────────
    const enviarANube = useCallback(async (datos) => {
        if (!navigator.onLine || !datos || datos.length === 0) return;

        // Si ya está sincronizando, guarda los datos más nuevos en la cola
        if (isSyncingRef.current) {
            pendingSync.current = datos;
            return;
        }

        isSyncingRef.current = true;
        setSyncState('syncing');
        try {
            // CORRECCIÓN CLAVE: sin mode:'no-cors' para poder leer la respuesta
            const res = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(datos),
            });
            if (res.ok) {
                lastPostTs.current = Date.now();
            }
        } catch (e) {
            console.error('enviarANube:', e);
            setSyncState('error');
        } finally {
            isSyncingRef.current = false;
            setSyncState('idle');

            // Si quedó algo pendiente, lo enviamos ahora
            if (pendingSync.current) {
                const next = pendingSync.current;
                pendingSync.current = null;
                enviarANube(next);
            }
        }
    }, []);

    // ── Guardar en localStorage + debounce de sincronización (2s) ───────────
    const syncTimer = useRef(null);
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));

        // Cancela el timer anterior para hacer debounce
        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
            if (navigator.onLine) enviarANube(productos);
        }, 2000);

        return () => clearTimeout(syncTimer.current);
    }, [productos, isLoaded]);

    // ── Estadísticas ─────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total     = productos.reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const comprado  = productos.filter(p => p.comprado).reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const totalItems = productos.length;
        const listos    = productos.filter(p => p.comprado).length;
        const porcentaje = totalItems > 0 ? (listos / totalItems) * 100 : 0;
        return { total, comprado, done: listos, totalItems, porcentaje };
    }, [productos]);

    const productosOrdenados = useMemo(() =>
        [...productos].sort((a, b) => a.comprado - b.comprado),
    [productos]);

    // ── Acciones ─────────────────────────────────────────────────────────────
    const agregar = (e) => {
        e.preventDefault();
        const nombre = nuevo.nombre.trim();
        if (!nombre) return;
        setNuevo({ nombre: '' }); // limpiar ANTES para evitar doble submit en tap rápido
        setProductos(prev => {
            // ✅ FIX DUPLICADOS: No agregar si ya existe un producto con mismo nombre
            const yaExiste = prev.some(x => x.nombre.toLowerCase() === nombre.toLowerCase());
            if (yaExiste) return prev;
            return [
                { id: Date.now() + Math.floor(Math.random() * 100000), nombre, comprado: false, precio: 0 },
                ...prev
            ];
        });
    };

    // Guard para evitar doble disparo del toggle (puede pasar con animaciones de layout)
    const toggleGuard = useRef(new Set());
    const toggleComprado = useCallback((id) => {
        if (toggleGuard.current.has(id)) return;
        toggleGuard.current.add(id);
        setTimeout(() => toggleGuard.current.delete(id), 300);
        setProductos(prev => prev.map(x => x.id === id ? { ...x, comprado: !x.comprado } : x));
    }, []);

    const actualizarPrecio = useCallback((id, precio) => {
        setProductos(prev => prev.map(x => x.id === id ? { ...x, precio: parsePrecio(precio) } : x));
    }, []);

    const actualizarNombre = useCallback((id, nombre) => {
        setProductos(prev => prev.map(x => x.id === id ? { ...x, nombre } : x));
    }, []);

    const eliminar = useCallback((id) => {
        setProductos(prev => prev.filter(x => x.id !== id));
    }, []);

    const resetearCompra = useCallback(() => {
        if (!confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
            return;
        }
        setProductos(prev => prev.map(p => ({ ...p, comprado: false })));
        setConfirmReset(false);
    }, [confirmReset]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto p-4 md:p-10 flex flex-col min-h-screen">
            {/* HEADER */}
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="sora-font text-3xl font-bold text-white tracking-tight">
                        Mi Carrito<span className="text-blue-500">Pro</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isOnline ? 'EN LINEA' : 'DESCONECTADO'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {syncState === 'syncing' && (
                        <svg className="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                    )}
                    <p className={`text-[10px] font-bold ${syncState === 'error' ? 'text-red-400' : 'text-slate-600'}`}>
                        {syncState === 'syncing' ? 'SINCRONIZANDO...' : syncState === 'error' ? 'ERROR SYNC' : 'NUBE ACTIVA'}
                    </p>
                </div>
            </header>

            {/* FORMULARIO */}
            <form onSubmit={agregar} className="flex gap-2 mb-8 bg-white/5 p-3 rounded-2xl border border-white/10">
                <input
                    type="text"
                    placeholder="Ej: 4 Mostaccioli"
                    className="flex-1 bg-transparent px-4 py-2 outline-none text-white text-sm"
                    value={nuevo.nombre}
                    onChange={e => setNuevo({ nombre: e.target.value })}
                />
                <button type="submit" className="bg-blue-600 text-white w-10 h-10 rounded-xl font-bold text-xl">+</button>
            </form>

            {/* LISTA */}
            <div className="space-y-3 pb-48">
                <AnimatePresence mode="popLayout">
                    {productosOrdenados.map((p) => {
                        const cant = obtenerCantidad(p.nombre);
                        return (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                                transition={{ duration: 0.2 }}
                                className={`product-card p-4 rounded-2xl flex items-center gap-4 shadow-lg transition-all ${p.comprado ? 'opacity-60' : ''}`}
                            >
                                {/* CHECK */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleComprado(p.id); }}
                                    className={`check-button ${p.comprado ? 'check-active' : ''}`}
                                >
                                    {p.comprado && <span className="text-white text-xs font-bold">✓</span>}
                                </button>

                                {/* IMAGEN + INFO */}
                                <div className="flex-1 min-w-0 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center p-1 border border-slate-100 overflow-hidden flex-shrink-0">
                                        <img
                                            src={getProductImage(p.nombre)}
                                            className="product-img-render"
                                            alt={p.nombre}
                                            onError={e => { e.target.src = FALLBACK_IMG; }}
                                        />
                                    </div>

                                    <div className="flex-1 truncate">
                                        {/* NOMBRE EDITABLE */}
                                        {editandoNombreId === p.id ? (
                                            <input
                                                autoFocus
                                                className="bg-slate-100 text-slate-900 font-bold w-full outline-none rounded px-1 border border-blue-500"
                                                value={p.nombre}
                                                onChange={e => actualizarNombre(p.id, e.target.value)}
                                                onBlur={() => setEditandoNombreId(null)}
                                                onKeyDown={e => e.key === 'Enter' && setEditandoNombreId(null)}
                                            />
                                        ) : (
                                            <h3
                                                onClick={() => setEditandoNombreId(p.id)}
                                                className={`font-bold truncate text-slate-900 text-lg cursor-text ${p.comprado ? 'line-through text-slate-400' : ''}`}
                                            >
                                                {p.nombre}
                                            </h3>
                                        )}

                                        {/* PRECIO EDITABLE */}
                                        <div className="mt-1">
                                            {editandoId === p.id ? (
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    defaultValue={p.precio || ''}
                                                    className="bg-blue-50 text-blue-600 font-bold w-24 outline-none border border-blue-500 rounded px-1"
                                                    onBlur={e => { actualizarPrecio(p.id, e.target.value); setEditandoId(null); }}
                                                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                                />
                                            ) : (
                                                <div className="flex gap-2 flex-wrap">
                                                    <span
                                                        onClick={() => setEditandoId(p.id)}
                                                        className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 cursor-pointer"
                                                    >
                                                        ${(p.precio || 0).toLocaleString('es-CL')} c/u
                                                    </span>
                                                    {cant > 1 && (
                                                        <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                            Total: ${((p.precio || 0) * cant).toLocaleString('es-CL')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ELIMINAR */}
                                <button onClick={() => eliminar(p.id)} className="text-slate-300 hover:text-red-500 flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {productos.length === 0 && isLoaded && (
                    <div className="text-center py-16 text-slate-500">
                        <p className="text-5xl mb-4">🛒</p>
                        <p className="font-bold">Tu lista está vacía</p>
                        <p className="text-sm mt-1">Agrega productos arriba</p>
                    </div>
                )}
            </div>

            {/* BARRA INFERIOR */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
                <div className="max-w-2xl mx-auto bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-2xl">
                    <div className="flex justify-around items-center mb-4">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Estimado</p>
                            <p className="text-2xl font-black text-white">${stats.total.toLocaleString('es-CL')}</p>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-emerald-500 uppercase">En Carrito ({stats.done})</p>
                            <p className="text-2xl font-black text-emerald-400">${stats.comprado.toLocaleString('es-CL')}</p>
                        </div>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.porcentaje}%` }}
                            className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                        />
                    </div>
                    <p className="text-center text-[9px] text-slate-500 font-bold mt-2 tracking-widest uppercase">
                        {stats.done} de {stats.totalItems} productos completados
                    </p>
                    {stats.done > 0 && (
                        <motion.button
                            onClick={resetearCompra}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`w-full mt-3 py-2.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 ${
                                confirmReset
                                    ? 'bg-red-500 text-white shadow-[0_0_14px_rgba(239,68,68,0.5)]'
                                    : 'bg-white/8 text-slate-300 border border-white/10 hover:bg-white/12'
                            }`}
                        >
                            {confirmReset ? '⚠️ Confirmar restablecimiento' : '🔄 Restablecer lista'}
                        </motion.button>
                    )}
                    <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-center text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                            ✦ Creado por Franco ✦
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SmartCart: Modo Offline Activo', reg))
            .catch(err => console.log('Error al activar modo offline', err));
    });
}
