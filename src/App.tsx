import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import {
  Calculator, Upload, Download, Home, Trash2, Plus, AlertCircle, FileSpreadsheet, Save, FolderOpen, X
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirestore, doc, onSnapshot, setDoc, collection, addDoc,
  updateDoc, deleteDoc, query, orderBy, getDocs
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

interface SavedValuation {
  id: string;
  name: string;
  date: number; // Timestamp
  target: TargetProperty;
  comparables: Comparable[];
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
  // const [loading, setLoading] = useState(true); // Removed blocking loading
  // const [loading, setLoading] = useState(true); // Removed blocking loading
  // const [loading, setLoading] = useState(true); // Removed blocking loading
  const addLog = (msg: string) => console.log(`${new Date().toLocaleTimeString()}: ${msg}`);

  // if (loading) { ... } // Removed blocking UI

  // State
  const [target, setTarget] = useState<TargetProperty>({
    address: '',
    coveredSurface: 0,
    uncoveredSurface: 0,
    surfaceType: 'Balcón',
    homogenizationFactor: 0.10
  });

  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [savedValuations, setSavedValuations] = useState<SavedValuation[]>([]);
  const [savedValuationsModalOpen, setSavedValuationsModalOpen] = useState(false);
  // const [importModalOpen, setImportModalOpen] = useState(false);
  // const [csvText, setCsvText] = useState('');

  // --- Effects ---

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Auth error:", error);
          alert(`Authentication failed: ${error.message}`);
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!db) return;

    const targetRef = doc(db, `artifacts/tasadorpro/users/${user.uid}/data/valuation_active`);
    const comparablesRef = collection(db, `artifacts/tasadorpro/users/${user.uid}/comparables`);

    // Sync Target
    const unsubTarget = onSnapshot(targetRef, (doc) => {
      if (doc.exists()) {
        setTarget(doc.data() as TargetProperty);
      }
    }, (error) => {
      console.error("Error syncing target:", error);
    });

    // Sync Comparables
    const q = query(comparablesRef, orderBy('daysOnMarket', 'asc')); // Default sort
    const unsubComparables = onSnapshot(q, (snapshot) => {
      const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comparable));
      setComparables(comps);
    }, (error) => {
      console.error("Error syncing comparables:", error);
      alert(`Error connecting to database: ${error.message}`);
    });

    // Sync Saved Valuations
    const savedRef = collection(db, `artifacts/tasadorpro/users/${user.uid}/saved_valuations`);
    const qSaved = query(savedRef, orderBy('date', 'desc'));
    const unsubSaved = onSnapshot(qSaved, (snapshot) => {
      const saved = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavedValuation));
      setSavedValuations(saved);
    });

    return () => {
      unsubTarget();
      unsubComparables();
      unsubSaved();
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
  // --- Google Sheets Integration ---

  const [sheetUrl, setSheetUrl] = useState('');

  const getSheetCsvUrl = (url: string) => {
    try {
      // Handle standard edit URLs
      // https://docs.google.com/spreadsheets/d/DOC_ID/edit...
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        // Use Google Visualization API endpoint for better CORS support
        return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleImportFromSheet = async () => {
    if (!sheetUrl) {
      alert("Por favor ingresa el link de tu Google Sheet (debe ser público).");
      return;
    }

    const csvUrl = getSheetCsvUrl(sheetUrl);
    if (!csvUrl) {
      alert("Link inválido. Asegúrate de copiar el link completo de tu Google Sheet.");
      return;
    }

    try {
      addLog("Fetching data from Google Sheet...");
      // Add timestamp to prevent caching
      const urlWithCacheBuster = `${csvUrl}&t=${Date.now()}`;
      const response = await fetch(urlWithCacheBuster);
      if (!response.ok) throw new Error("Failed to fetch sheet");
      const text = await response.text();

      // Debug log
      console.log("CSV Text Preview:", text.substring(0, 200));

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: async (results) => {
          try {
            const rows = results.data as any[];
            if (rows.length > 0) {
              console.log("First row raw:", rows[0]);
              console.log("Headers found:", Object.keys(rows[0]));
            }
            const newComps: Omit<Comparable, 'id'>[] = [];

            for (const row of rows) {
              const address = row['Dirección'] || row['Address'] || 'Sin dirección';
              const price = parseFloat((row['Precio'] || row['Price'] || '0').toString().replace(/[$.]/g, '').replace(',', '.')) || 0;
              const covered = parseFloat((row['Sup. Cubierta'] || row['Covered Surface'] || '0').toString()) || 0;
              const uncovered = parseFloat((row['Sup. Descubierta'] || row['Uncovered Surface'] || '0').toString()) || 0;

              const typeRaw = (row['Tipo Sup'] || row['Surface Type'] || '').trim();
              const type = SURFACE_TYPES.includes(typeRaw as any) ? (typeRaw as SurfaceType) : 'Ninguno';

              const factorRaw = parseFloat((row['Factor'] || '0').toString().replace(',', '.'));
              const factor = !isNaN(factorRaw) ? factorRaw : DEFAULT_FACTORS[type];

              const days = parseInt((row['Días'] || row['Days'] || '0').toString()) || 0;

              if (address === 'Sin dirección' && price === 0) continue;

              newComps.push({
                address,
                price,
                coveredSurface: covered,
                uncoveredSurface: uncovered,
                surfaceType: type,
                homogenizationFactor: factor,
                daysOnMarket: days
              });
            }

            // Replace existing or append? User said "traer los datos", usually implies sync/replace or append.
            // Given "unify", let's replace for a clean sync state, or ask? 
            // For now, let's append but maybe clear if empty? 
            // Actually, let's just append to be safe, user can delete.

            if (user && db) {
              // Batch add would be better but keeping it simple
              await Promise.all(newComps.map(c => addDoc(collection(db, `artifacts/tasadorpro/users/${user.uid}/comparables`), c)));
            } else {
              setComparables(prev => [...prev, ...newComps.map(c => ({ ...c, id: Math.random().toString() }))]);
            }

            addLog(`Successfully imported ${newComps.length} rows from Sheet`);
          } catch (err: any) {
            console.error("Parse Logic Error:", err);
            alert(`Error processing data: ${err.message}`);
          }
        },
        error: (err: any) => {
          console.error("CSV Parse Error:", err);
          alert("Error parsing Sheet data.");
        }
      });

    } catch (error: any) {
      console.error("Sheet Import Error:", error);
      alert("Error importando desde Sheet. Asegúrate que esté configurada como 'Cualquiera con el enlace puede ver'.");
    }
  };

  const handleExportToClipboard = () => {
    try {
      const data = comparables.map(c => ({
        'ID': c.id,
        'Dirección': c.address,
        'Precio': c.price,
        'Sup. Cubierta': c.coveredSurface,
        'Sup. Descubierta': c.uncoveredSurface,
        'Tipo Sup': c.surfaceType,
        'Factor': c.homogenizationFactor,
        'Días': c.daysOnMarket
      }));

      const csv = Papa.unparse(data, {
        quotes: false, // TSV usually doesn't need quotes for Excel/Sheets paste unless special chars
        delimiter: "\t", // Tab delimiter for copy-paste compatibility
      });

      navigator.clipboard.writeText(csv).then(() => {
        alert("Datos copiados al portapapeles! \n\nVe a tu Google Sheet y presiona Ctrl+V para pegar.");
        addLog("Data copied to clipboard");
      }).catch(err => {
        throw err;
      });

    } catch (error: any) {
      console.error("Export Error:", error);
      alert("Error copiando datos.");
    }
  };



  // --- Saved Valuations Handlers ---

  const handleNewValuation = async () => {
    if (comparables.length > 0 || target.address) {
      if (!confirm("¿Estás seguro de crear una nueva tasación? Se perderán los datos actuales no guardados.")) return;
    }

    const emptyTarget: TargetProperty = {
      address: '',
      coveredSurface: 0,
      uncoveredSurface: 0,
      surfaceType: 'Balcón',
      homogenizationFactor: 0.10
    };

    setTarget(emptyTarget);
    setComparables([]);

    if (user && db) {
      // Clear active data in Firestore
      await setDoc(doc(db, `artifacts/tasadorpro/users/${user.uid}/data/valuation_active`), emptyTarget);

      // Delete all active comparables
      const compsRef = collection(db, `artifacts/tasadorpro/users/${user.uid}/comparables`);
      const q = query(compsRef);
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }

    addLog("Started new valuation");
  };

  const handleSaveValuation = async () => {
    if (!user || !db) {
      alert("Debes estar conectado para guardar.");
      return;
    }

    if (savedValuations.length >= 30) {
      alert("Has alcanzado el límite de 30 tasaciones guardadas. Elimina alguna para continuar.");
      return;
    }

    if (!target.address) {
      alert("Ingresa una dirección para la propiedad objetivo antes de guardar.");
      return;
    }

    try {
      const newValuation: Omit<SavedValuation, 'id'> = {
        name: `${target.address} - ${new Date().toLocaleDateString()}`,
        date: Date.now(),
        target: target,
        comparables: comparables
      };

      await addDoc(collection(db, `artifacts/tasadorpro/users/${user.uid}/saved_valuations`), newValuation);
      addLog("Valuation saved successfully");
      alert("Tasación guardada correctamente.");
    } catch (error: any) {
      console.error("Save Error:", error);
      alert("Error al guardar tasación.");
    }
  };

  const handleDeleteValuation = async (id: string) => {
    if (!user || !db) return;
    if (!confirm("¿Estás seguro de eliminar esta tasación?")) return;

    try {
      await deleteDoc(doc(db, `artifacts/tasadorpro/users/${user.uid}/saved_valuations`, id));
      addLog("Valuation deleted");
    } catch (error: any) {
      console.error("Delete Error:", error);
      alert("Error al eliminar.");
    }
  };

  const handleLoadValuation = async (valuation: SavedValuation) => {
    if (!confirm("Cargar esta tasación reemplazará los datos actuales. ¿Continuar?")) return;

    try {
      // Update local state
      setTarget(valuation.target);
      setComparables(valuation.comparables);

      // Update Firestore Active Data (optional but good for persistence)
      if (user && db) {
        await setDoc(doc(db, `artifacts/tasadorpro/users/${user.uid}/data/valuation_active`), valuation.target, { merge: true });

        // Replace comparables collection? That's expensive (delete all, add all). 
        // For simplicity, let's just update local state and maybe warn user that "Active" DB might be out of sync if they refresh?
        // Actually, the requirement is just to load it. 
        // Ideally we should sync it. Let's try to sync by deleting current active comps and adding new ones.
        // But that might be too many writes. 
        // Let's just update local state for now and let the user "Save" again if they want to persist this state as "Active".
        // Wait, if I update local state, the `onSnapshot` might override it if I don't update DB.
        // Yes, `onSnapshot` will fire and reset state if I don't update DB.
        // So I MUST update DB.

        // Strategy: 
        // 1. Update Target (easy)
        // 2. Delete all current comparables in DB
        // 3. Add all new comparables to DB

        const compsRef = collection(db, `artifacts/tasadorpro/users/${user.uid}/comparables`);
        const q = query(compsRef);
        const snapshot = await getDocs(q); // Need getDocs import
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        const addPromises = valuation.comparables.map(c => addDoc(compsRef, c));
        await Promise.all(addPromises);
      }

      setSavedValuationsModalOpen(false);
      addLog("Valuation loaded");
    } catch (error: any) {
      console.error("Load Error:", error);
      alert("Error al cargar tasación.");
    }
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
              TTasaciones
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Pegar link de Google Sheet..."
                className="bg-transparent border-none focus:ring-0 text-sm w-48 text-slate-600 placeholder:text-slate-400"
              />
            </div>
            <button onClick={handleNewValuation} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Nueva
            </button>
            <button onClick={() => setSavedValuationsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <FolderOpen className="w-4 h-4" /> Mis Tasaciones
            </button>
            <button onClick={handleSaveValuation} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
              <Save className="w-4 h-4" /> Guardar
            </button>
            <button onClick={handleImportFromSheet} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={handleExportToClipboard} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
        </div>
      </header>

      {/* Saved Valuations Modal */}
      {savedValuationsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Mis Tasaciones Guardadas</h3>
              <button onClick={() => setSavedValuationsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {savedValuations.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No tienes tasaciones guardadas.</div>
              ) : (
                savedValuations.map(val => (
                  <div key={val.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
                    <div>
                      <div className="font-medium text-slate-800">{val.name}</div>
                      <div className="text-xs text-slate-500">{new Date(val.date).toLocaleString()} • {val.comparables.length} comparables</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadValuation(val)}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => handleDeleteValuation(val.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-right text-xs text-slate-400">
              {savedValuations.length} / 30 guardadas
            </div>
          </div>
        </div>
      )}

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
                      <th className="px-4 py-3 font-medium text-center">Sup. Cub</th>
                      <th className="px-4 py-3 font-medium text-center">Sup. Desc</th>
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
                          <input
                            type="number"
                            value={comp.coveredSurface}
                            onChange={e => updateComparable(comp.id, { coveredSurface: parseFloat(e.target.value) || 0 })}
                            className="bg-transparent border-none p-0 w-16 text-center focus:ring-0 text-slate-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={comp.uncoveredSurface}
                            onChange={e => updateComparable(comp.id, { uncoveredSurface: parseFloat(e.target.value) || 0 })}
                            className="bg-transparent border-none p-0 w-16 text-center focus:ring-0 text-slate-600"
                          />
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
                  <LineChart data={[...processedComparables].sort((a, b) => a.hPrice - b.hPrice)}>
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

    </div>
  );
}
export default App;
