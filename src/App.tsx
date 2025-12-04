import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import {
  Calculator, Upload, Download, Home, Trash2, Plus, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirestore, doc, onSnapshot, setDoc, collection, addDoc,
  updateDoc, deleteDoc, query, orderBy
} from 'firebase/firestore';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import Papa from 'papaparse';

// --- Firebase Configuration ---
// REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCxlL7R7wke6VKnU-GysFi4dl76_0hApZ4",
  authDomain: "ttasaciones-5ce4d.firebaseapp.com",
  projectId: "ttasaciones-5ce4d",
  storageBucket: "ttasaciones-5ce4d.firebasestorage.app",
  messagingSenderId: "779321924202",
  appId: "1:779321924202:web:809fcfd276dfc2b3c98813",
  measurementId: "G-P1TSNB7NNZ"
};

// Initialize Firebase (Conditional to avoid errors if config is missing)
let db: any;
let auth: any;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase init failed (likely missing config):", e);
}

// --- Types ---

type SurfaceType = 'Jardín' | 'Patio' | 'Terraza' | 'Balcón' | 'Ninguno';

interface TargetProperty {
  address: string;
  coveredSurface: number;
  uncoveredSurface: number;
  surfaceType: SurfaceType;
  homogenizationFactor: number;
}

interface Comparable {
  id: string;
  address: string;
  price: number;
  coveredSurface: number;
  uncoveredSurface: number;
  surfaceType: SurfaceType;
  homogenizationFactor: number;
  daysOnMarket: number;
}

// --- Constants & Helpers ---

const SURFACE_TYPES: SurfaceType[] = ['Jardín', 'Patio', 'Terraza', 'Balcón', 'Ninguno'];

const DEFAULT_FACTORS: Record<SurfaceType, number> = {
  'Jardín': 0.25,
  'Patio': 0.20,
  'Terraza': 0.15,
  'Balcón': 0.10,
  'Ninguno': 0
};

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

const calculateHomogenizedSurface = (covered: number, uncovered: number, factor: number) => {
  return covered + (uncovered * factor);
};

const calculateHomogenizedPrice = (price: number, hSurface: number) => {
  if (hSurface === 0) return 0;
  return price / hSurface;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value);
};

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden", className)}>
    {children}
  </div>
);

const StatCard = ({ label, value, subtext, color = "blue" }: { label: string, value: string, subtext?: string, color?: "blue" | "green" | "amber" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100"
  };

  return (
    <div className={cn("p-6 rounded-xl border", colors[color])}>
      <div className="text-sm font-medium opacity-80 mb-1">{label}</div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {subtext && <div className="text-xs mt-2 opacity-70">{subtext}</div>}
    </div>
  );
};

// --- Main App Component ---

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // State
  const [target, setTarget] = useState<TargetProperty>({
    address: '',
    coveredSurface: 0,
    uncoveredSurface: 0,
    surfaceType: 'Balcón',
    homogenizationFactor: 0.10
  });

  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // --- Effects ---

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const targetRef = doc(db, `artifacts/tasadorpro/users/${user.uid}/data/valuation_active`);
    const comparablesRef = collection(db, `artifacts/tasadorpro/users/${user.uid}/comparables`);

    // Sync Target
    const unsubTarget = onSnapshot(targetRef, (doc) => {
      if (doc.exists()) {
        setTarget(doc.data() as TargetProperty);
      }
    });

    // Sync Comparables
    const q = query(comparablesRef, orderBy('daysOnMarket', 'asc')); // Default sort
    const unsubComparables = onSnapshot(q, (snapshot) => {
      const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comparable));
      setComparables(comps);
      setLoading(false);
    });

    return () => {
      unsubTarget();
      unsubComparables();
    };
  }, [user]);

  // --- Handlers ---

  const updateTarget = async (updates: Partial<TargetProperty>) => {
    const newTarget = { ...target, ...updates };
    setTarget(newTarget); // Optimistic
    if (user && db) {
      await setDoc(doc(db, `artifacts/tasadorpro/users/${user.uid}/data/valuation_active`), newTarget, { merge: true });
    }
  };

  const addComparable = async () => {
    const newComp: Omit<Comparable, 'id'> = {
      address: 'Nueva Propiedad',
      price: 100000,
      coveredSurface: 50,
      uncoveredSurface: 0,
      surfaceType: 'Ninguno',
      homogenizationFactor: 0,
      daysOnMarket: 0
    };
    if (user && db) {
      await addDoc(collection(db, `artifacts/tasadorpro/users/${user.uid}/comparables`), newComp);
    } else {
      // Local mode fallback
      setComparables([...comparables, { ...newComp, id: Math.random().toString() }]);
    }
  };

  const updateComparable = async (id: string, updates: Partial<Comparable>) => {
    if (user && db) {
      await updateDoc(doc(db, `artifacts/tasadorpro/users/${user.uid}/comparables`, id), updates);
    } else {
      setComparables(comparables.map(c => c.id === id ? { ...c, ...updates } : c));
    }
  };

  const deleteComparable = async (id: string) => {
    if (user && db) {
      await deleteDoc(doc(db, `artifacts/tasadorpro/users/${user.uid}/comparables`, id));
    } else {
      setComparables(comparables.filter(c => c.id !== id));
    }
  };

  const handleImportCSV = () => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as string[][];
        // Expected: [Ignorar, Dirección, Precio, SupCub, SupDesc, Tipo, Factor, Días]
        // Index:    0        1          2       3       4        5     6       7

        const newComps: Omit<Comparable, 'id'>[] = [];

        for (const row of rows) {
          if (row.length < 8) continue; // Skip invalid

          const typeRaw = row[5]?.trim();
          const type = SURFACE_TYPES.includes(typeRaw as any) ? (typeRaw as SurfaceType) : 'Ninguno';
          const factorRaw = parseFloat(row[6]);
          const factor = !isNaN(factorRaw) ? factorRaw : DEFAULT_FACTORS[type];

          newComps.push({
            address: row[1] || 'Sin dirección',
            price: parseFloat(row[2]) || 0,
            coveredSurface: parseFloat(row[3]) || 0,
            uncoveredSurface: parseFloat(row[4]) || 0,
            surfaceType: type,
            homogenizationFactor: factor,
            daysOnMarket: parseInt(row[7]) || 0
          });
        }

        // Batch add (or sequential if batch not supported easily in this context without batch obj)
        if (user && db) {
          for (const c of newComps) {
            await addDoc(collection(db, `artifacts/tasadorpro/users/${user.uid}/comparables`), c);
          }
        } else {
          setComparables([...comparables, ...newComps.map(c => ({ ...c, id: Math.random().toString() }))]);
        }
        setImportModalOpen(false);
        setCsvText('');
      }
    });
  };

  const handleExportCSV = () => {
    const data = comparables.map(c => [
      '', // Ignorar
      c.address,
      c.price,
      c.coveredSurface,
      c.uncoveredSurface,
      c.surfaceType,
      c.homogenizationFactor,
      c.daysOnMarket
    ]);
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tasador_pro_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Calculations ---

  const targetHomogenizedSurface = calculateHomogenizedSurface(target.coveredSurface, target.uncoveredSurface, target.homogenizationFactor);

  const processedComparables = useMemo(() => {
    return comparables.map(c => {
      const hSurface = calculateHomogenizedSurface(c.coveredSurface, c.uncoveredSurface, c.homogenizationFactor);
      const hPrice = calculateHomogenizedPrice(c.price, hSurface);
      return { ...c, hSurface, hPrice };
    }).filter(c => c.hPrice > 0); // Filter invalid
  }, [comparables]);

  const stats = useMemo(() => {
    if (processedComparables.length === 0) return { avg: 0, min: 0, max: 0, terciles: [0, 0, 0] };

    const prices = processedComparables.map(c => c.hPrice).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const min = prices[0];
    const max = prices[prices.length - 1];

    // Terciles
    const t1 = prices[Math.floor(prices.length / 3)];
    const t2 = prices[Math.floor(2 * prices.length / 3)];

    return { avg, min, max, terciles: [t1, avg, t2] }; // Simplified terciles for suggestion
  }, [processedComparables]);

  const valuation = useMemo(() => {
    if (!targetHomogenizedSurface) return { low: 0, market: 0, high: 0 };
    return {
      low: stats.terciles[0] * targetHomogenizedSurface,
      market: stats.avg * targetHomogenizedSurface,
      high: stats.terciles[2] * targetHomogenizedSurface // Using upper tercile or max? "Alto" (Tercil superior) usually means the boundary or the avg of that bucket. I'll use the boundary t2 for "High" start, or maybe max. Let's use the calculated stats.
      // "Venta Rápida" (Tercil inferior), "Mercado" (Promedio), "Alto" (Tercil superior).
      // Let's map: 
      // Venta Rápida = Average of bottom third? Or just the bottom third boundary?
      // Usually:
      // Venta Rápida = Min to T1. Suggestion: T1 or Avg(Bottom).
      // Mercado = Avg.
      // Alto = T2 to Max. Suggestion: T2 or Avg(Top).
      // I'll use the values derived from the stats object directly.
    };
  }, [stats, targetHomogenizedSurface]);

  // Regression Data
  const regressionData = useMemo(() => {
    // Simple linear regression: Price/m2 vs Days
    // x = Price/m2, y = Days. Wait, usually Price depends on Days? Or Days depends on Price?
    // "Gráfico de Liquidez (Scatter): Eje X (Precio/m²), Eje Y (Días). Muestra correlación entre precio y demora."
    // So X = Price, Y = Days.
    return processedComparables.map(c => ({ x: c.hPrice, y: c.daysOnMarket, z: 1 }));
  }, [processedComparables]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              TasadorPro
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Pegar link de Google Sheet..."
                className="bg-transparent border-none focus:ring-0 text-sm w-64 text-slate-600 placeholder:text-slate-400"
              />
            </div>
            <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Top Section: Target & Comparables */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Target Property */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-slate-900 text-white border-slate-800">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <Home className="w-5 h-5" />
                  <h2 className="font-semibold uppercase tracking-wider text-xs">Propiedad Objetivo</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-medium">Dirección</label>
                    <input
                      type="text"
                      value={target.address}
                      onChange={e => updateTarget({ address: e.target.value })}
                      className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 mt-1 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ej: Av. Libertador 2000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-medium">Sup. Cubierta</label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          value={target.coveredSurface}
                          onChange={e => updateTarget({ coveredSurface: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-800 border-slate-700 rounded-lg pl-3 pr-8 py-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="absolute right-3 top-2 text-slate-500 text-sm">m²</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-medium">Sup. Desc.</label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          value={target.uncoveredSurface}
                          onChange={e => updateTarget({ uncoveredSurface: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-800 border-slate-700 rounded-lg pl-3 pr-8 py-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="absolute right-3 top-2 text-slate-500 text-sm">m²</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-medium">Tipo Sup.</label>
                      <select
                        value={target.surfaceType}
                        onChange={e => {
                          const type = e.target.value as SurfaceType;
                          updateTarget({ surfaceType: type, homogenizationFactor: DEFAULT_FACTORS[type] });
                        }}
                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 mt-1 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {SURFACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase font-medium">Factor</label>
                      <input
                        type="number"
                        step="0.05"
                        value={target.homogenizationFactor}
                        onChange={e => updateTarget({ homogenizationFactor: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-3 py-2 mt-1 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <div className="text-slate-400 text-sm mb-1">Superficie Homogenizada</div>
                  <div className="text-4xl font-bold text-indigo-400">
                    {formatNumber(targetHomogenizedSurface)} <span className="text-xl text-slate-500">m²</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Valuation Report Cards (Preview) */}
            <div className="grid grid-cols-1 gap-4">
              <StatCard
                label="Venta Rápida"
                value={formatCurrency(valuation.low)}
                subtext={`$${formatNumber(stats.terciles[0])}/m²`}
                color="green"
              />
              <StatCard
                label="Precio de Mercado"
                value={formatCurrency(valuation.market)}
                subtext={`$${formatNumber(stats.avg)}/m²`}
                color="blue"
              />
              <StatCard
                label="Precio Alto"
                value={formatCurrency(valuation.high)}
                subtext={`$${formatNumber(stats.terciles[2])}/m²`}
                color="amber"
              />
            </div>
          </div>

          {/* Right: Comparables Management */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="h-full flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">Comparables ({comparables.length})</h3>
                <button onClick={addComparable} className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors">
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Dirección</th>
                      <th className="px-4 py-3 font-medium text-right">Precio</th>
                      <th className="px-4 py-3 font-medium text-center">Sup.</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium w-24">Factor</th>
                      <th className="px-4 py-3 font-medium text-right">$/m² H</th>
                      <th className="px-4 py-3 font-medium text-center">Días</th>
                      <th className="px-4 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedComparables.map((comp) => (
                      <tr key={comp.id} className={cn(
                        "hover:bg-slate-50 transition-colors group",
                        comp.daysOnMarket < 30 ? "bg-emerald-50/30" : "",
                        comp.daysOnMarket > 120 ? "bg-rose-50/30" : ""
                      )}>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={comp.address}
                            onChange={e => updateComparable(comp.id, { address: e.target.value })}
                            className="bg-transparent border-none p-0 w-full focus:ring-0 font-medium text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={comp.price}
                            onChange={e => updateComparable(comp.id, { price: parseFloat(e.target.value) || 0 })}
                            className="bg-transparent border-none p-0 w-24 text-right focus:ring-0 text-slate-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col text-xs">
                            <span>C: {comp.coveredSurface}</span>
                            <span className="text-slate-400">D: {comp.uncoveredSurface}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={comp.surfaceType}
                            onChange={e => {
                              const type = e.target.value as SurfaceType;
                              updateComparable(comp.id, { surfaceType: type, homogenizationFactor: DEFAULT_FACTORS[type] });
                            }}
                            className="bg-transparent border-none p-0 w-full focus:ring-0 text-slate-600 text-xs"
                          >
                            {SURFACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.05"
                            value={comp.homogenizationFactor}
                            onChange={e => updateComparable(comp.id, { homogenizationFactor: parseFloat(e.target.value) || 0 })}
                            className="bg-white border border-slate-200 rounded px-1 py-0.5 w-16 text-center text-xs focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">
                          ${formatNumber(comp.hPrice)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={comp.daysOnMarket}
                            onChange={e => updateComparable(comp.id, { daysOnMarket: parseInt(e.target.value) || 0 })}
                            className="bg-transparent border-none p-0 w-12 text-center focus:ring-0 text-slate-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteComparable(comp.id)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-6">Liquidez (Precio vs Días)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" dataKey="x" name="Precio/m²" unit="$" stroke="#94a3b8" fontSize={12} />
                  <YAxis type="number" dataKey="y" name="Días" unit="d" stroke="#94a3b8" fontSize={12} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Comparables" data={regressionData} fill="#6366f1" />
                  {/* Target Line if we had a predicted price, but here we show the market */}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-6">Distribución de Precios</h3>
            <div className="h-80 w-full flex items-center justify-center text-slate-400">
              {/* Placeholder for Regression or Distribution - Using a simple LineChart for trend if enough data */}
              {processedComparables.length > 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedComparables.sort((a, b) => a.hPrice - b.hPrice)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="address" hide />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="hPrice" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    <ReferenceLine y={stats.avg} stroke="#10b981" strokeDasharray="3 3" label="Promedio" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 opacity-50" />
                  <span>Se necesitan más datos para visualizar tendencias</span>
                </div>
              )}
            </div>
          </Card>
        </div>

      </main>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Importar CSV</h3>
            <p className="text-sm text-slate-500">
              Pega el contenido de tu CSV aquí. El orden esperado de columnas es: <br />
              <code className="bg-slate-100 px-1 rounded">Ignorar, Dirección, Precio, SupCub, SupDesc, Tipo, Factor, Días</code>
            </p>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="w-full h-64 bg-slate-50 border-slate-200 rounded-lg p-4 font-mono text-xs focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Pegar datos aquí..."
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setImportModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleImportCSV} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors">Procesar Importación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
