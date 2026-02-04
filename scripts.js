const { useState, useEffect, useMemo } = React;
const motion = window.Motion.motion;
const AnimatePresence = window.Motion.AnimatePresence;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyUR713RdstWO9hpfzWzlzZOQAjAXO8v7RNygyPzF3q_E-Lu0-ffH5oZODEPV3i2wAB/exec";
const STORAGE_KEY = 'smartcart-pro-v2';

const IMAGE_MAP = {
    'quifaro': 'https://i.postimg.cc/NFdtj6bC/1085998.png',
    'bebida': 'https://i.postimg.cc/6qbsX95Z/Bebida.png',
    'cerveza': 'https://i.postimg.cc/NFChcgfT/cerveza.jpg',
    'crema': 'https://i.postimg.cc/9XLHTBtQ/Crema.jpg',
    'detergente': 'https://i.postimg.cc/MH3kSWKg/Detergente.jpg',
    'mostaccioli': 'https://i.postimg.cc/zDxYWkSj/mostaccioli.jpg',
    'leche': 'https://i.postimg.cc/0jXgs82L/pack-leche.jpg',
    'pasta': 'https://i.postimg.cc/7PKr7NMX/pasta-diente.jpg',
    'queso': 'https://i.postimg.cc/wxwYJkcJ/receta-queso-gouda.jpg',
    'salsa': 'https://i.postimg.cc/fW8QXvjC/Salsa.jpg',
    'suavizante': 'https://i.postimg.cc/VL5QFbDn/suavizante.jpg'
};

function App() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [productos, setProductos] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [nuevo, setNuevo] = useState({ nombre: '' });
    const [editandoId, setEditandoId] = useState(null);
    const [editandoNombreId, setEditandoNombreId] = useState(null);

    const obtenerCantidad = (nombre) => {
        if (!nombre) return 1;
        const match = nombre.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 1;
    };

    const getProductImage = (nombre) => {
        const n = nombre.toLowerCase();
        for (let key in IMAGE_MAP) {
            if (n.includes(key)) return IMAGE_MAP[key];
        }
        return 'https://i.postimg.cc/6pbD2Q42/icons8-carrito-de-compras-emoji-48.png'; 
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
        if (isLoaded && isOnline && !isSyncing) {
            const timeout = setTimeout(() => enviarANube(productos), 2000);
            return () => clearTimeout(timeout);
        }
    }, [productos]);

    const cargarDesdeNube = async () => {
        if (!navigator.onLine) { setIsLoaded(true); return; }
        setIsSyncing(true);
        try {
            const res = await fetch(WEB_APP_URL);
            const data = await res.json();
            if (data && Array.isArray(data)) setProductos(data);
        } catch (e) { console.error(e); }
        finally { setIsSyncing(false); setIsLoaded(true); }
    };

    const enviarANube = async (datos) => {
        if (!navigator.onLine) return;
        setIsSyncing(true);
        try {
            await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datos) });
        } catch (e) { console.error(e); }
        finally { setIsSyncing(false); }
    };

    const stats = useMemo(() => {
        const total = productos.reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const comprado = productos.filter(p => p.comprado).reduce((acc, p) => acc + (Number(p.precio) * obtenerCantidad(p.nombre)), 0);
        const totalItems = productos.length;
        const listos = productos.filter(p => p.comprado).length;
        const porcentaje = totalItems > 0 ? (listos / totalItems) * 100 : 0;
        return { total, comprado, done: listos, totalItems, porcentaje };
    }, [productos]);

    const productosOrdenados = useMemo(() => {
        return [...productos].sort((a, b) => a.comprado - b.comprado);
    }, [productos]);

    const agregar = (e) => {
        e.preventDefault();
        if (!nuevo.nombre.trim()) return;
        setProductos([{ id: Date.now(), nombre: nuevo.nombre.trim(), comprado: false, precio: 0 }, ...productos]);
        setNuevo({ nombre: '' });
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-10 flex flex-col min-h-screen">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="sora-font text-3xl font-bold text-white tracking-tight">Mi Carrito<span className="text-blue-500">Pro</span></h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isOnline ? 'EN LINEA' : 'DESCONECTADO'}
                        </p>
                    </div>
                </div>
                <p className="text-slate-600 text-[10px] font-bold">{isSyncing ? 'SINCRONIZANDO...' : 'NUBE ACTIVA'}</p>
            </header>

            <form onSubmit={agregar} className="flex gap-2 mb-8 bg-white/5 p-3 rounded-2xl border border-white/10">
                <input type="text" placeholder="Ej: 4 Mostaccioli" className="flex-1 bg-transparent px-4 py-2 outline-none text-white text-sm"
                    value={nuevo.nombre} onChange={e => setNuevo({nombre: e.target.value})} />
                <button className="bg-blue-600 text-white w-10 h-10 rounded-xl font-bold text-xl">+</button>
            </form>

            <div className="space-y-3 pb-48">
                <AnimatePresence mode='popLayout'>
                    {productosOrdenados.map((p) => {
                        const cant = obtenerCantidad(p.nombre);
                        return (
                            <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className={`product-card p-4 rounded-2xl flex items-center gap-4 shadow-lg transition-all ${p.comprado ? 'opacity-60' : ''}`}>
                                
                                <button 
                                    onClick={() => setProductos(productos.map(x => x.id === p.id ? {...x, comprado: !x.comprado} : x))}
                                    className={`check-button ${p.comprado ? 'check-active' : ''}`}
                                >
                                    {p.comprado && <span className="text-white text-xs font-bold">✓</span>}
                                </button>
                                
                                <div className="flex-1 min-w-0 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center p-1 border border-slate-100 overflow-hidden">
                                        <img src={getProductImage(p.nombre)} className="product-img-render" />
                                    </div>

                                    <div className="flex-1 truncate">
                                        {editandoNombreId === p.id ? (
                                            <input autoFocus className="bg-slate-100 text-slate-900 font-bold w-full outline-none rounded px-1 border border-blue-500" 
                                                value={p.nombre} 
                                                onChange={e => setProductos(productos.map(x => x.id === p.id ? {...x, nombre: e.target.value} : x))}
                                                onBlur={() => setEditandoNombreId(null)}
                                                onKeyDown={e => e.key === 'Enter' && setEditandoNombreId(null)} />
                                        ) : (
                                            <h3 onClick={() => setEditandoNombreId(p.id)} 
                                                className={`font-bold truncate text-slate-900 text-lg cursor-text ${p.comprado ? 'line-through text-slate-400' : ''}`}>
                                                {p.nombre}
                                            </h3>
                                        )}
                                        
                                        <div className="mt-1">
                                            {editandoId === p.id ? (
                                                <input autoFocus type="number" className="bg-blue-50 text-blue-600 font-bold w-24 outline-none border border-blue-500 rounded px-1"
                                                    onBlur={e => { setProductos(productos.map(x => x.id === p.id ? {...x, precio: Number(e.target.value)} : x)); setEditandoId(null); }}
                                                    onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                                            ) : (
                                                <div className="flex gap-2">
                                                    <span onClick={() => setEditandoId(p.id)} className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 cursor-pointer">
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

                                <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-slate-300 hover:text-red-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

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
                    {/* BARRA DE PROGRESO */}
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
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
// Registro del Service Worker para funcionamiento Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SmartCart: Modo Offline Activo', reg))
      .catch(err => console.log('Error al activar modo offline', err));
  });
}
