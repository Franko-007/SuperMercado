/* scripts.js */
const { useState, useEffect, useMemo } = React;
const motion = window.Motion.motion;
const AnimatePresence = window.Motion.AnimatePresence;

const Icons = {
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>,
    Cart: () => <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
    Wallet: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
};

const PRODUCTOS_INICIALES = [
    { id: 1, nombre: '4 Quifaros', precio: 0, comprado: false },
    { id: 2, nombre: '4 Mostaccioli', precio: 0, comprado: false },
    { id: 3, nombre: '4 Salsa de Tomate Bolognesa', precio: 0, comprado: false },
    { id: 4, nombre: '4 Cremas Nestle', precio: 0, comprado: false },
    { id: 5, nombre: '6 bebidas 3 Lts.', precio: 0, comprado: false },
    { id: 6, nombre: '4 Pack de Leche Vainilla', precio: 0, comprado: false },
    { id: 7, nombre: 'Detergente Ariel', precio: 0, comprado: false },
    { id: 8, nombre: 'Suavizante', precio: 0, comprado: false },
    { id: 9, nombre: 'Pasta Dental', precio: 0, comprado: false }
];

function App() {
    const [productos, setProductos] = useState(() => {
        const saved = localStorage.getItem('smart-shop-v2');
        // Si hay guardados los usa, si no, usa la lista que me diste
        return saved ? JSON.parse(saved) : PRODUCTOS_INICIALES;
    });
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');

    useEffect(() => {
        localStorage.setItem('smart-shop-v2', JSON.stringify(productos));
    }, [productos]);

    const stats = useMemo(() => {
        const totalPrevisto = productos.reduce((acc, p) => acc + (Number(p.precio) || 0), 0);
        const totalComprado = productos.filter(p => p.comprado).reduce((acc, p) => acc + (Number(p.precio) || 0), 0);
        const cantidadComprados = productos.filter(p => p.comprado).length;
        return {
            totalPrevisto,
            totalComprado,
            cantidadComprados,
            totalItems: productos.length,
            porcentaje: productos.length ? Math.round((cantidadComprados / productos.length) * 100) : 0
        };
    }, [productos]);

    const agregarProducto = (e) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        setProductos([{
            id: Date.now(),
            nombre: nombre.trim(),
            precio: precio > 0 ? parseFloat(precio) : 0,
            comprado: false
        }, ...productos]);
        setNombre('');
        setPrecio('');
    };

    const formatearMoneda = (valor) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor);
    };

    return (
        <div className="max-w-md mx-auto min-h-screen p-4 pb-32">
            <header className="py-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 text-white rounded-2xl shadow-lg">
                            <Icons.Cart />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mi Lista</h1>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gasto Estimado</p>
                        <p className="text-xl font-black text-emerald-600">{formatearMoneda(stats.totalPrevisto)}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Icons.Wallet />
                            <span className="text-sm font-semibold text-slate-600">En carro: {formatearMoneda(stats.totalComprado)}</span>
                        </div>
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                            {stats.cantidadComprados}/{stats.totalItems}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.porcentaje}%` }} />
                    </div>
                </div>
            </header>

            <form onSubmit={agregarProducto} className="bg-white p-2 rounded-2xl shadow-md border border-slate-100 flex gap-2 mb-8">
                <input 
                    type="text"
                    placeholder="Nuevo producto..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2 outline-none text-slate-700 font-medium"
                />
                <div className="flex items-center bg-slate-50 rounded-xl px-2 border border-slate-100 w-24">
                    <span className="text-slate-400 text-sm">$</span>
                    <input 
                        type="number"
                        placeholder="0"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        className="w-full bg-transparent p-1 outline-none text-sm font-bold text-emerald-700"
                    />
                </div>
                <button type="submit" className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 shadow-lg active:scale-95 transition-all">
                    <Icons.Plus />
                </button>
            </form>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {productos.map((p) => (
                        <motion.div
                            key={p.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                                p.comprado ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-100 shadow-sm'
                            }`}
                        >
                            <button 
                                onClick={() => setProductos(productos.map(item => item.id === p.id ? {...item, comprado: !item.comprado} : item))}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    p.comprado ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'
                                }`}
                            >
                                {p.comprado && <Icons.Check />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold truncate ${p.comprado ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                    {p.nombre}
                                </p>
                                {p.precio > 0 && <p className="text-xs font-bold text-emerald-500">{formatearMoneda(p.precio)}</p>}
                            </div>

                            <button 
                                onClick={() => setProductos(productos.filter(item => item.id !== p.id))}
                                className="p-2 text-slate-300 hover:text-red-400"
                            >
                                <Icons.Trash />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);