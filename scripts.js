const { useState, useEffect, useMemo } = React;
const motion = window.Motion.motion;
const AnimatePresence = window.Motion.AnimatePresence;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxPMi1xDOMWjVo-WTyymaiZ8nK3rJbc3AJsP5-JlLl9nfP39ie_LqhXlo16UbY-Xq6H/exec";
const STORAGE_KEY = 'smartcart-pro-v2';

const PRODUCTOS_INICIALES = [
    { id: 1, nombre: '4 Quifaros', comprado: false, precio: 0 },
    { id: 2, nombre: '4 Mostaccioli', comprado: false, precio: 0 },
    { id: 3, nombre: '4 Salsa de Tomate Bolognesa', comprado: false, precio: 0 },
    { id: 4, nombre: '4 Cremas Nestle', comprado: false, precio: 0 },
    { id: 5, nombre: '6 bebidas 3 Lts.', comprado: false, precio: 0 },
    { id: 6, nombre: '4 Pack de Leche Vainilla', comprado: false, precio: 0 },
    { id: 7, nombre: 'Detergente Ariel', comprado: false, precio: 0 },
    { id: 8, nombre: 'Suavizante', comprado: false, precio: 0 },
    { id: 9, nombre: 'Pasta Dental', comprado: false, precio: 0 }
];

function App() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [productos, setProductos] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        return parsed.length > 0 ? parsed : PRODUCTOS_INICIALES;
    });

    const [nuevo, setNuevo] = useState({ nombre: '', precio: '' });
    const [editandoId, setEditandoId] = useState(null);

    // Función para sacar la cantidad del nombre (ej: "4 Quifaros" -> 4)
    const obtenerCantidad = (nombre) => {
        const match = nombre.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 1;
    };

    useEffect(() => {
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));
        if (navigator.onLine) cargarDesdeNube();
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
        if (isOnline && !isSyncing) {
            const timeout = setTimeout(() => enviarANube(productos), 2000);
            return () => clearTimeout(timeout);
        }
    }, [productos]);

    const cargarDesdeNube = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(WEB_APP_URL);
            const data = await res.json();
            if (data && Array.isArray(data) && data.length > 0) setProductos(data);
        } catch (e) { console.error(e); }
        setIsSyncing(false);
    };

    const enviarANube = async (datos) => {
        setIsSyncing(true);
        try {
            await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datos) });
        } catch (e) { console.error(e); }
        setIsSyncing(false);
    };

    const stats = useMemo(() => {
        const total = productos.reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const comprado = productos.filter(p => p.comprado).reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const porcentaje = productos.length ? (productos.filter(p => p.comprado).length / productos.length) * 100 : 0;
        return { total, comprado, resta: total - comprado, porcentaje, done: productos.filter(p => p.comprado).length, totalItems: productos.length };
    }, [productos]);

    const agregar = (e) => {
        e.preventDefault();
        if (!nuevo.nombre.trim()) return;
        setProductos([{ id: Date.now(), nombre: nuevo.nombre, comprado: false, precio: Number(nuevo.precio) || 0 }, ...productos]);
        setNuevo({ nombre: '', precio: '' });
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-10">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="sora-font text-3xl font-bold text-white tracking-tight">Mi Carrito <span className="text-blue-500">Pro</span></h1>
                    <p className="text-slate-500 text-sm font-medium">Mi Lista</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${isSyncing ? 'border-blue-500 text-blue-500 animate-pulse' : 'border-white/10 text-slate-500'}`}>
                    {isSyncing ? 'SINCRONIZANDO' : 'CONECTADO'}
                </div>
            </header>

            {/* CAJONES DE STATS */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-5 rounded-3xl border-b-4 border-blue-600">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total General</p>
                    <p className="text-2xl font-black text-white">${stats.total.toLocaleString('es-CL')}</p>
                </div>
                <div className="glass-card p-5 rounded-3xl border-b-4 border-emerald-500">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">En Carrito</p>
                    <p className="text-2xl font-black text-emerald-400">${stats.comprado.toLocaleString('es-CL')}</p>
                </div>
            </div>

            {/* BARRA PROGRESO */}
            <div className="glass-card p-4 rounded-2xl mb-8">
                <div className="flex justify-between text-[10px] font-bold text-white mb-2 uppercase tracking-tighter">
                    <span>Progreso: {stats.done} de {stats.totalItems}</span>
                    <span>{Math.round(stats.porcentaje)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${stats.porcentaje}%` }} className="h-full bg-blue-600" />
                </div>
            </div>

            {/* AGREGAR */}
            <form onSubmit={agregar} className="flex gap-2 mb-8 bg-white/5 p-2 rounded-2xl border border-white/10">
                <input 
                    type="text" placeholder="Ej: 4 Quifaros" className="flex-1 bg-transparent px-4 py-2 outline-none text-white text-sm"
                    value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})}
                />
                <button className="bg-blue-600 text-white w-10 h-10 rounded-xl font-bold active:scale-90 transition-transform">+</button>
            </form>

            {/* LISTA */}
            <div className="space-y-3">
                <AnimatePresence mode='popLayout'>
                    {productos.map((p) => {
                        const cant = obtenerCantidad(p.nombre);
                        const totalProducto = cant * (Number(p.precio) || 0);
                        
                        return (
                            <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className={`glass-card p-4 rounded-2xl flex items-center gap-4 ${p.comprado ? 'opacity-40 grayscale' : ''}`}
                            >
                                <button onClick={() => setProductos(productos.map(x => x.id === p.id ? {...x, comprado: !x.comprado} : x))}
                                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${p.comprado ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-white/20'}`}
                                >
                                    {p.comprado && <span className="text-white text-xs font-bold">✓</span>}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold truncate ${p.comprado ? 'line-through text-slate-500' : 'text-white text-lg'}`}>{p.nombre}</h3>
                                    
                                    <div className="flex items-center gap-2 mt-1">
                                        {editandoId === p.id ? (
                                            <input 
                                                autoFocus
                                                type="number"
                                                className="bg-blue-600/30 text-blue-400 text-xs font-bold px-2 py-1 rounded outline-none w-24 border border-blue-500"
                                                onBlur={(e) => {
                                                    setProductos(productos.map(x => x.id === p.id ? { ...x, precio: Number(e.target.value) || 0 } : x));
                                                    setEditandoId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if(e.key === 'Enter') {
                                                        setProductos(productos.map(x => x.id === p.id ? { ...x, precio: Number(e.target.value) || 0 } : x));
                                                        setEditandoId(null);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="flex gap-3">
                                                <span onClick={() => setEditandoId(p.id)} className="text-[11px] text-blue-400 font-black cursor-pointer bg-blue-400/10 px-2 py-0.5 rounded">
                                                    ${Number(p.precio).toLocaleString('es-CL')} c/u
                                                </span>
                                                <span className="text-[11px] text-orange-400 font-black bg-orange-400/10 px-2 py-0.5 rounded">
                                                    Total: ${totalProducto.toLocaleString('es-CL')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-slate-600 hover:text-red-500 p-2 transition-colors">
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
                <button 
                    onClick={() => { if(confirm('¿Resetear caché?')) { localStorage.clear(); window.location.reload(); } }}
                    className="mt-6 text-[9px] text-slate-700 hover:text-slate-500 font-bold"
                >
                    RESET SISTEMA
                </button>
            </footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
