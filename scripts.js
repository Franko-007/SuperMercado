const { useState, useEffect, useRef, useMemo, useCallback } = React;
const motion = window.Motion.motion;
const AnimatePresence = window.Motion.AnimatePresence;
const Reorder = window.Motion.Reorder;
const useDragControls = window.Motion.useDragControls;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzbw0AvPwil9owUhJXhyaKDrrMfuHgM52XLPIkRUbw0jpif5c7AxDMxqcSRIrtdTuM/exec";
const STORAGE_KEY = 'smartcart-pro-v2';

// Token compartido para que tu Apps Script rechace llamadas que no vengan
// de esta app. CAMBIA este valor por uno propio (cualquier texto largo y
// random sirve) y pega el MISMO valor en tu Apps Script — ver instrucciones
// al final de scripts.js.
const APP_TOKEN = "4KjE1sf6yja7hpiboccqRVrqc10a";

// ─── MAPA DE IMÁGENES ────────────────────────────────────────────────────────
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
const parsePrecio = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isFinite(val) ? Math.max(0, val) : 0;
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
    const keys = Object.keys(IMAGE_MAP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (n.includes(key.trim())) return IMAGE_MAP[key];
    }
    return FALLBACK_IMG;
};

// ─── TARJETA DE PRODUCTO (arrastrable) ────────────────────────────────────────
function ProductoCard({
    p, editandoNombreId, setEditandoNombreId, editandoId, setEditandoId,
    actualizarNombre, actualizarPrecio, toggleComprado, eliminar
}) {
    const cant = obtenerCantidad(p.nombre);
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            as="div"
            value={p}
            dragListener={false}
            dragControls={dragControls}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.2 }}
            className={`product-card p-4 rounded-2xl flex items-center gap-3 shadow-lg transition-all ${p.comprado ? 'opacity-60' : ''}`}
        >
            <button
                onPointerDown={(e) => dragControls.start(e)}
                className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1 px-1 py-2"
                style={{ touchAction: 'none' }}
                aria-label="Arrastrar para reordenar"
            >
                <svg className="w-3.5 h-5" fill="currentColor" viewBox="0 0 12 20">
                    <circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/>
                    <circle cx="3" cy="10" r="1.6"/><circle cx="9" cy="10" r="1.6"/>
                    <circle cx="3" cy="17" r="1.6"/><circle cx="9" cy="17" r="1.6"/>
                </svg>
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); toggleComprado(p.id); }}
                className={`check-button ${p.comprado ? 'check-active' : ''}`}
                aria-label={p.comprado ? `Marcar ${p.nombre} como pendiente` : `Marcar ${p.nombre} como comprado`}
            >
                {p.comprado && <span className="text-white text-xs font-bold">✓</span>}
            </button>

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

            <button onClick={() => eliminar(p.id)} className="text-slate-300 hover:text-red-500 flex-shrink-0" aria-label={`Eliminar ${p.nombre}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </Reorder.Item>
    );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
function App() {
    const [isOnline, setIsOnline]   = useState(navigator.onLine);
    const [syncState, setSyncState] = useState('idle');
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
    const [bottomBarHeight, setBottomBarHeight] = useState(240);
    const [duplicado, setDuplicado]           = useState(false);
    const [lastEliminado, setLastEliminado]   = useState(null);
    const [installPrompt, setInstallPrompt]   = useState(null);
    const [appActualizada, setAppActualizada] = useState(false);
    const [celebracion, setCelebracion]       = useState(false);

    const lastPostTs      = useRef(0);
    const lastLocalChange = useRef(0);   // timestamp del último cambio hecho por el usuario
    const pendingSync     = useRef(null);
    const isSyncingRef    = useRef(false);
    const bottomBarRef    = useRef(null);
    const duplicadoTimer  = useRef(null);
    const undoTimer       = useRef(null);
    const ordenOriginal   = useRef([]);  // IDs en el orden en que llegaron de la nube → para restaurar al resetear

    // Botón propio de "instalar app": Chrome dispara este evento en vez de
    // mostrar su banner automático cuando se previene el comportamiento por defecto.
    useEffect(() => {
        const onBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        const onInstalled = () => setInstallPrompt(null);
        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    // Aviso de "nueva versión disponible" — ver el evento 'smartcart-update'
    // despachado al final de este archivo cuando el Service Worker se actualiza.
    useEffect(() => {
        const onUpdate = () => setAppActualizada(true);
        window.addEventListener('smartcart-update', onUpdate);
        return () => window.removeEventListener('smartcart-update', onUpdate);
    }, []);

    // Mide el alto real del panel inferior (cambia cuando aparece el botón
    // "Restablecer lista") para que el último producto nunca quede tapado.
    useEffect(() => {
        const el = bottomBarRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setBottomBarHeight(Math.ceil(entry.contentRect.height));
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

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

    const cargarDesdeNube = useCallback(async () => {
        if (!navigator.onLine) { setIsLoaded(true); return; }
        setSyncState('syncing');
        try {
            const res  = await fetch(WEB_APP_URL + '?t=' + Date.now() + '&token=' + encodeURIComponent(APP_TOKEN));
            const data = await res.json();
            if (data && Array.isArray(data) && data.length > 0) {
                // No sobreescribir si el usuario hizo algún cambio en los últimos 15 segundos.
                // Antes la guarda era de solo 5s desde el último POST, pero como el sync timer
                // espera 2s antes de postear, había una ventana en la que un GET llegaba antes
                // del POST y pisaba el cambio local. Con 15s desde cualquier cambio del usuario
                // queda suficiente margen.
                const sinCambiosRecientes = Date.now() - lastLocalChange.current > 15000;
                const sinPostReciente     = Date.now() - lastPostTs.current > 5000;
                if (sinCambiosRecientes && sinPostReciente) {
                    const seen = new Set();
                    const deduped = data
                        .map(item => ({
                            ...item,
                            id: Number(item.id) || Date.now() + Math.random(),
                            precio: parsePrecio(item.precio),
                            comprado: Boolean(item.comprado),
                            nombre: String(item.nombre || '').trim(),
                        }))
                        .filter(item => {
                            if (!item.nombre) return false;
                            const key = item.id;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });
                    setProductos(deduped);
                    // Guardar el orden en que llegaron de la nube para poder restaurarlo al resetear
                    ordenOriginal.current = deduped.map(p => p.id);
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

    // Auto-sincronizar al volver a la app: si alguien más agregó o marcó
    // productos desde otro celular mientras esta pestaña estaba en segundo
    // plano, los traemos apenas vuelves a mirarla.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') cargarDesdeNube();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [cargarDesdeNube]);

    // Además, mientras la app sigue abierta y visible, refrescamos cada
    // cierto tiempo para que la lista se mantenga al día entre celulares.
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                cargarDesdeNube();
            }
        }, 25000);
        return () => clearInterval(interval);
    }, [cargarDesdeNube]);

    const enviarANube = useCallback(async (datos) => {
        if (!navigator.onLine || !datos || datos.length === 0) return;

        if (isSyncingRef.current) {
            pendingSync.current = datos;
            return;
        }

        isSyncingRef.current = true;
        setSyncState('syncing');
        try {
            const res = await fetch(WEB_APP_URL + '?token=' + encodeURIComponent(APP_TOKEN), {
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

            if (pendingSync.current) {
                const next = pendingSync.current;
                pendingSync.current = null;
                enviarANube(next);
            }
        }
    }, []);

    const syncTimer = useRef(null);
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));

        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
            if (navigator.onLine) enviarANube(productos);
        }, 2000);

        return () => clearTimeout(syncTimer.current);
    }, [productos, isLoaded]);

    const stats = useMemo(() => {
        const total     = productos.reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const comprado  = productos.filter(p => p.comprado).reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const totalItems = productos.length;
        const listos    = productos.filter(p => p.comprado).length;
        const porcentaje = totalItems > 0 ? (listos / totalItems) * 100 : 0;
        return { total, comprado, done: listos, totalItems, porcentaje };
    }, [productos]);

    // "¡Compra completa!" — se muestra solo en el instante en que pasas de
    // "no todo comprado" a "todo comprado", no cada vez que la lista ya está completa.
    const todoCompradoAntes = useRef(false);
    useEffect(() => {
        const todoComprado = stats.totalItems > 0 && stats.done === stats.totalItems;
        if (todoComprado && !todoCompradoAntes.current) {
            setCelebracion(true);
            if (navigator.vibrate) navigator.vibrate([15, 60, 15]);
            const t = setTimeout(() => setCelebracion(false), 4000);
            todoCompradoAntes.current = todoComprado;
            return () => clearTimeout(t);
        }
        todoCompradoAntes.current = todoComprado;
    }, [stats.done, stats.totalItems]);

    // Badge en el ícono de la app instalada con la cantidad de productos
    // pendientes (solo funciona si el navegador soporta la Badging API).
    useEffect(() => {
        if (!('setAppBadge' in navigator)) return;
        const pendientesCount = productos.filter(p => !p.comprado).length;
        if (pendientesCount > 0) {
            navigator.setAppBadge(pendientesCount).catch(() => {});
        } else if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch(() => {});
        }
    }, [productos]);

    const productosOrdenados = useMemo(() =>
        [...productos].sort((a, b) => a.comprado - b.comprado),
    [productos]);

    // Listas separadas para permitir arrastrar y reordenar: solo tiene sentido
    // reordenar dentro del mismo grupo (pendientes o comprados), ya que el de
    // comprados siempre va al final.
    const pendientes = useMemo(() => productos.filter(p => !p.comprado), [productos]);
    const comprados  = useMemo(() => productos.filter(p => p.comprado), [productos]);

    const reordenarPendientes = useCallback((nuevoOrden) => {
        lastLocalChange.current = Date.now();
        setProductos(prev => [...nuevoOrden, ...prev.filter(p => p.comprado)]);
    }, []);

    const reordenarComprados = useCallback((nuevoOrden) => {
        lastLocalChange.current = Date.now();
        setProductos(prev => [...prev.filter(p => !p.comprado), ...nuevoOrden]);
    }, []);

    const agregar = (e) => {
        e.preventDefault();
        const nombre = nuevo.nombre.trim();
        if (!nombre) return;

        const yaExiste = productos.some(x => x.nombre.toLowerCase() === nombre.toLowerCase());
        if (yaExiste) {
            setDuplicado(true);
            clearTimeout(duplicadoTimer.current);
            duplicadoTimer.current = setTimeout(() => setDuplicado(false), 2500);
            return;
        }

        setNuevo({ nombre: '' });
        setDuplicado(false);
        lastLocalChange.current = Date.now();
        const nuevoId = Date.now() + Math.floor(Math.random() * 100000);
        ordenOriginal.current = [nuevoId, ...ordenOriginal.current];
        setProductos(prev => [
            { id: nuevoId, nombre, comprado: false, precio: 0 },
            ...prev
        ]);
    };

    const toggleGuard = useRef(new Set());
    const toggleComprado = useCallback((id) => {
        if (toggleGuard.current.has(id)) return;
        toggleGuard.current.add(id);
        setTimeout(() => toggleGuard.current.delete(id), 300);
        lastLocalChange.current = Date.now();
        if (navigator.vibrate) navigator.vibrate(15);
        setProductos(prev => prev.map(x => x.id === id ? { ...x, comprado: !x.comprado } : x));
    }, []);

    const actualizarPrecio = useCallback((id, precio) => {
        lastLocalChange.current = Date.now();
        setProductos(prev => prev.map(x => x.id === id ? { ...x, precio: parsePrecio(precio) } : x));
    }, []);

    const actualizarNombre = useCallback((id, nombre) => {
        lastLocalChange.current = Date.now();
        setProductos(prev => prev.map(x => x.id === id ? { ...x, nombre } : x));
    }, []);

    const eliminar = useCallback((id) => {
        lastLocalChange.current = Date.now();
        ordenOriginal.current = ordenOriginal.current.filter(x => x !== id);
        setProductos(prev => {
            const item = prev.find(x => x.id === id);
            if (item) {
                setLastEliminado({ item });
                clearTimeout(undoTimer.current);
                undoTimer.current = setTimeout(() => setLastEliminado(null), 5000);
            }
            return prev.filter(x => x.id !== id);
        });
    }, []);

    const deshacerEliminar = useCallback(() => {
        if (!lastEliminado) return;
        clearTimeout(undoTimer.current);
        setProductos(prev => [lastEliminado.item, ...prev]);
        setLastEliminado(null);
    }, [lastEliminado]);

    const instalarApp = useCallback(async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
    }, [installPrompt]);

    const compartirLista = useCallback(() => {
        if (productos.length === 0) return;
        const lineas = productosOrdenados.map(p => {
            const cant = obtenerCantidad(p.nombre);
            const totalLinea = (p.precio || 0) * cant;
            const precioTxt = p.precio ? ` - $${totalLinea.toLocaleString('es-CL')}` : '';
            return `${p.comprado ? '✅' : '☐'} ${p.nombre}${precioTxt}`;
        });
        const texto = `🛒 Mi Carrito Pro\n\n${lineas.join('\n')}\n\n💰 Total estimado: $${stats.total.toLocaleString('es-CL')}`;

        if (navigator.share) {
            navigator.share({ title: 'Mi Carrito Pro', text: texto }).catch(() => {});
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
        }
    }, [productosOrdenados, stats.total, productos.length]);

    const resetearCompra = useCallback(() => {
        if (!confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
            return;
        }
        setProductos(prev => {
            // Desmarcar todos y restaurar el orden en que llegaron de la nube.
            // Si el usuario agregó productos nuevos después (no están en ordenOriginal),
            // van al final, en el orden en que fueron agregados.
            const desmarcados = prev.map(p => ({ ...p, comprado: false }));
            const orden = ordenOriginal.current;
            if (orden.length === 0) return desmarcados;

            const enOrden  = orden
                .map(id => desmarcados.find(p => p.id === id))
                .filter(Boolean);
            const nuevos   = desmarcados.filter(p => !orden.includes(p.id));
            return [...enOrden, ...nuevos];
        });
        lastLocalChange.current = Date.now();
        setConfirmReset(false);
    }, [confirmReset]);

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-10 flex flex-col min-h-screen">
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
                <div className="flex items-center gap-3">
                    {productos.length > 0 && (
                        <button
                            onClick={compartirLista}
                            aria-label="Compartir lista"
                            className="text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>
                    )}
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

            {celebracion && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 text-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold px-4 py-3 rounded-xl"
                >
                    🎉 ¡Compra completa! Marcaste todos los productos.
                </motion.div>
            )}

            {appActualizada && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-center justify-between gap-3 bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-xl"
                >
                    <span>✓ Hay una nueva versión de la app</span>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg uppercase tracking-wide"
                    >
                        Actualizar
                    </button>
                </motion.div>
            )}

            {installPrompt && (
                <button
                    onClick={instalarApp}
                    className="mb-6 w-full flex items-center justify-center gap-2 bg-blue-600/15 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl"
                >
                    📲 Instalar Mi Carrito Pro en este celular
                </button>
            )}

            <form onSubmit={agregar} className="flex gap-2 mb-8 bg-white/5 p-3 rounded-2xl border border-white/10">
                <input
                    type="text"
                    placeholder="Ej: 4 Mostaccioli"
                    aria-label="Nombre del producto"
                    className="flex-1 bg-transparent px-4 py-2 outline-none text-white text-sm"
                    value={nuevo.nombre}
                    onChange={e => { setNuevo({ nombre: e.target.value }); if (duplicado) setDuplicado(false); }}
                />
                <button type="submit" aria-label="Agregar producto" className="bg-blue-600 text-white w-10 h-10 rounded-xl font-bold text-xl">+</button>
            </form>

            {duplicado && (
                <p className="text-red-400 text-[11px] font-bold -mt-6 mb-6 px-1">
                    ⚠️ "{nuevo.nombre.trim()}" ya está en tu lista
                </p>
            )}

            <div style={{ paddingBottom: bottomBarHeight + 24 }}>
                {pendientes.length > 0 && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
                        Pendientes ({pendientes.length})
                    </p>
                )}
                <Reorder.Group as="div" axis="y" values={pendientes} onReorder={reordenarPendientes} className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {pendientes.map((p) => (
                            <ProductoCard
                                key={p.id}
                                p={p}
                                editandoNombreId={editandoNombreId}
                                setEditandoNombreId={setEditandoNombreId}
                                editandoId={editandoId}
                                setEditandoId={setEditandoId}
                                actualizarNombre={actualizarNombre}
                                actualizarPrecio={actualizarPrecio}
                                toggleComprado={toggleComprado}
                                eliminar={eliminar}
                            />
                        ))}
                    </AnimatePresence>
                </Reorder.Group>

                {comprados.length > 0 && (
                    <>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-3 mt-7 px-1">
                            ✓ En el carro ({comprados.length})
                        </p>
                        <Reorder.Group as="div" axis="y" values={comprados} onReorder={reordenarComprados} className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {comprados.map((p) => (
                                    <ProductoCard
                                        key={p.id}
                                        p={p}
                                        editandoNombreId={editandoNombreId}
                                        setEditandoNombreId={setEditandoNombreId}
                                        editandoId={editandoId}
                                        setEditandoId={setEditandoId}
                                        actualizarNombre={actualizarNombre}
                                        actualizarPrecio={actualizarPrecio}
                                        toggleComprado={toggleComprado}
                                        eliminar={eliminar}
                                    />
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>
                    </>
                )}

                {productos.length === 0 && isLoaded && (
                    <div className="text-center py-16 text-slate-500">
                        <p className="text-5xl mb-4">🛒</p>
                        <p className="font-bold">Tu lista está vacía</p>
                        <p className="text-sm mt-1">Agrega productos arriba</p>
                    </div>
                )}

                {productos.length === 0 && !isLoaded && (
                    <div className="text-center py-16 text-slate-500">
                        <svg className="animate-spin w-8 h-8 mx-auto mb-3 text-blue-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        <p className="text-sm">Cargando tu lista...</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {lastEliminado && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed left-0 right-0 z-[60] px-4"
                        style={{ bottom: bottomBarHeight + 16 }}
                    >
                        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 bg-slate-800 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl">
                            <p className="text-sm text-slate-200 truncate">🗑️ "{lastEliminado.item.nombre}" eliminado</p>
                            <button onClick={deshacerEliminar} className="text-emerald-400 font-bold text-sm flex-shrink-0">Deshacer</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                ref={bottomBarRef}
                className="fixed bottom-0 left-0 right-0 p-4 z-50"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            >
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

// ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────
// Evita que un error inesperado deje al usuario con pantalla en blanco.
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error('SmartCart: error capturado', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', color: 'white',
                    textAlign: 'center', padding: '2rem', fontFamily: 'Inter, sans-serif'
                }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</p>
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Algo salió mal</p>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                        Intenta recargar la aplicación. Tu lista no se pierde, queda guardada en este celular.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ background: '#2563eb', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '0.75rem', fontWeight: 700, border: 'none' }}
                    >
                        Recargar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);

if ('serviceWorker' in navigator) {
    // El registro del Service Worker ahora ocurre en un <script> plano dentro
    // de index.html (no depende de Babel/React), así se activa más rápido.
    // Acá solo escuchamos cuándo cambia a una versión nueva para avisar al usuario.

    // 'controllerchange' se dispara cuando un Service Worker nuevo toma el
    // control. Solo avisamos si YA había un controlador antes (es decir, esto
    // es una actualización real) — así no mostramos "app actualizada" en la
    // primerísima instalación, donde no había nada que actualizar.
    const yaTeniaControlador = !!navigator.serviceWorker.controller;
    let refrescando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refrescando) return;
        refrescando = true;
        if (yaTeniaControlador) {
            window.dispatchEvent(new CustomEvent('smartcart-update'));
        }
    });
}

/* ──────────────────────────────────────────────────────────────────────────
   PROTECCIÓN DE TU APPS SCRIPT CON TOKEN — YA APLICADA
   ──────────────────────────────────────────────────────────────────────────
   El archivo Code.gs (entregado junto a este scripts.js) ya tiene la
   validación de APP_TOKEN agregada en doGet y doPost. Solo falta:

   1) Reemplazar el contenido de tu Apps Script por el de Code.gs
      (o pegar manualmente las líneas de validación si prefieres conservar
      tu archivo tal cual).
   2) Deploy > Manage deployments > ✏️ editar tu implementación activa >
      Versión: "Nueva versión" > Implementar — para que el cambio quede
      activo en la URL que ya usa la app (WEB_APP_URL no cambia).
   ────────────────────────────────────────────────────────────────────── */
