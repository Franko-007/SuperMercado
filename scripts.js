const { useState, useEffect, useMemo } = React;
const motion = window.Motion.motion;
const AnimatePresence = window.Motion.AnimatePresence;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyUR713RdstWO9hpfzWzlzZOQAjAXO8v7RNygyPzF3q_E-Lu0-ffH5oZODEPV3i2wAB/exec";
const STORAGE_KEY = 'smartcart-pro-v2';

const PRODUCTOS_INICIALES = [
    { id: 1, nombre: '4 Quifaros', comprado: false, precio: 0 },
    { id: 2, nombre: '4 Mostaccioli', comprado: false, precio: 0 },
    { id: 3, nombre: '4 Salsa de Tomate Bolognesa', comprado: false, precio: 0 }
];

function App() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasPendingChanges, setHasPendingChanges] = useState(false);
    const [productos, setProductos] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        return parsed.length > 0 ? parsed : PRODUCTOS_INICIALES;
    });

    const [nuevo, setNuevo] = useState({ nombre: '', precio: '' });
    const [editandoId, setEditandoId] = useState(null);
    const [editandoNombreId, setEditandoNombreId] = useState(null);

    const obtenerCantidad = (nombre) => {
        if (!nombre) return 1;
        const match = nombre.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 1;
    };

    useEffect(() => {
        cargarDesdeNube();
        const updateStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        return () => {
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
        if (isLoaded) {
            setHasPendingChanges(true); // Hay cambios locales nuevos
            if (isOnline && !isSyncing) {
                const timeout = setTimeout(() => enviarANube(productos), 2000);
                return () => clearTimeout(timeout);
            }
        }
    }, [productos, isLoaded, isOnline]);

    const cargarDesdeNube = async () => {
        if (!navigator.onLine) { setIsLoaded(true); return; }
        setIsSyncing(true);
        try {
            const res = await fetch(WEB_APP_URL);
            const data = await res.json();
            if (data && Array.isArray(data)) {
                setProductos(data.filter(p => p.nombre && p.nombre.trim() !== ""));
                setHasPendingChanges(false); // Sincronizado al cargar
            }
        } catch (e) { console.error(e); }
        finally { setIsSyncing(false); setIsLoaded(true); }
    };

    const enviarANube = async (datos) => {
        if (!navigator.onLine) return;
        setIsSyncing(true);
        try {
            const datosLimpios = datos.filter(p => p.nombre && p.nombre.trim() !== "");
            await fetch(WEB_APP_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                body: JSON.stringify(datosLimpios) 
            });
            setHasPendingChanges(false); // Ya se guardó en la nube
        } catch (e) { console.error(e); }
        finally { setIsSyncing(false); }
    };

    const stats = useMemo(() => {
        const validos = productos.filter(p => p.nombre);
        const total = validos.reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const comprado = validos.filter(p => p.comprado).reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const porcentaje = validos.length ? (validos.filter(p => p.comprado).length / validos.length) * 100 : 0;
        return { total, comprado, porcentaje, done: validos.filter(p => p.comprado).length, totalItems: validos.length };
    }, [productos]);

    const productosOrdenados = useMemo(() => {
        return [...productos]
            .filter(p => p.nombre && p.nombre.trim() !== "")
            .sort((a, b) => a.comprado - b.comprado);
    }, [productos]);

    const agregar = (e) => {
        e.preventDefault();
        if (!nuevo.nombre.trim()) return;
        setProductos([{ id: Date.now(), nombre: nuevo.nombre.trim(), comprado: false, precio: 0 }, ...productos]);
        setNuevo({ nombre: '', precio: '' });
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-10 flex flex-col min-h-screen">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="sora-font text-3xl font-bold text-white tracking-tight">Mi Carrito<span className="text-blue-500">Pro</span></h1>
                    <p className="text-slate-500 text-sm font-medium">
                        {isSyncing ? 'Sincronizando...' : hasPendingChanges ? 'Cambios pendientes' : 'Sincronizado'}
                    </p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    {isOnline && (
                        <div className={`text-[9px] font-bold uppercase tracking-tighter ${hasPendingChanges ? 'text-orange-400' : 'text-blue-400'}`}>
                            {hasPendingChanges ? '● Pendiente' : '✓✓ Guardado'}
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-5 rounded-3xl border-b-4 border-blue-600">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Estimado</p>
                    <p className="text-2xl font-black text-white">${stats.total.toLocaleString('es-CL')}</p>
                </div>
                <div className="glass-card p-5 rounded-3xl border-b-4 border-emerald-500">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">En Carrito</p>
                    <p className="text-2xl font-black text-emerald-400">${stats.comprado.toLocaleString('es-CL')}</p>
                </div>
            </div>

            <div className="glass-card p-4 rounded-2xl mb-8">
                <div className="flex justify-between text-[10px] font-bold text-white mb-2 uppercase">
                    <span>Items: {stats.done}/{stats.totalItems}</span>
                    <span>{Math.round(stats.porcentaje)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${stats.porcentaje}%` }} className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb]" />
                </div>
            </div>

            <form onSubmit={agregar} className="flex gap-2 mb-8 bg-white/5 p-2 rounded-2xl border border-white/10">
                <input 
                    type="text" placeholder="Ej: 4 Quifaros" className="flex-1 bg-transparent px-4 py-2 outline-none text-white text-sm"
                    value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})}
                />
                <button className="bg-blue-600 text-white w-10 h-10 rounded-xl font-bold">+</button>
            </form>

            <div className="space-y-3">
                <AnimatePresence mode='popLayout'>
                    {productosOrdenados.map((p) => {
                        const cant = obtenerCantidad(p.nombre);
                        const totalProducto = cant * (Number(p.precio) || 0);
                        return (
                            <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className={`glass-card p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 ${p.comprado ? 'opacity-40 grayscale-[50%]' : ''}`}
                            >
                                <button onClick={() => setProductos(productos.map(x => x.id === p.id ? {...x, comprado: !x.comprado} : x))}
                                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${p.comprado ? 'check-active' : 'border-white/20'}`}
                                >
                                    {p.comprado && <span className="text-white text-xs font-bold">✓</span>}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    {editandoNombreId === p.id ? (
                                        <input 
                                            autoFocus
                                            type="text"
                                            className="bg-white/10 text-white font-bold px-2 py-0.5 rounded outline-none w-full border border-white/20"
                                            value={p.nombre}
                                            onChange={(e) => setProductos(productos.map(x => x.id === p.id ? {...x, nombre: e.target.value} : x))}
                                            onBlur={() => setEditandoNombreId(null)}
                                            onKeyDown={(e) => e.key === 'Enter' && setEditandoNombreId(null)}
                                        />
                                    ) : (
                                        <h3 
                                            onClick={() => !p.comprado && setEditandoNombreId(p.id)}
                                            className={`font-bold truncate ${p.comprado ? 'line-through text-slate-500' : 'text-white text-lg cursor-text'}`}
                                        >
                                            {p.nombre}
                                        </h3>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mt-1">
                                        {editandoId === p.id ? (
                                            <input autoFocus type="number" className="bg-blue-600/30 text-blue-400 text-xs font-bold px-2 py-1 rounded outline-none w-24 border border-blue-500"
                                                onBlur={(e) => {
                                                    setProductos(productos.map(x => x.id === p.id ? { ...x, precio: Number(e.target.value) || 0 } : x));
                                                    setEditandoId(null);
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            />
                                        ) : (
                                            <div className="flex gap-2">
                                                <span onClick={() => !p.comprado && setEditandoId(p.id)} className="text-[11px] text-blue-400 font-black cursor-pointer bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                                                    ${Number(p.precio).toLocaleString('es-CL')} c/u
                                                </span>
                                                {cant > 1 && (
                                                    <span className="text-[11px] text-orange-400 font-black bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20">
                                                        Total: ${totalProducto.toLocaleString('es-CL')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-red-500 p-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <footer className="mt-12 mb-4 text-center border-t border-white/5 pt-8">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Todos los derechos reservados</p>
                <p className="text-blue-500 text-xs font-black mt-1">Creado por Franco</p>
            </footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
