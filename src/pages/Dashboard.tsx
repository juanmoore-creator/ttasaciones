import { useState } from 'react';
import {
  Upload, Home, Trash2, Plus, AlertCircle, FileSpreadsheet, Save, FolderOpen, X, FileText, LogOut, Calculator
} from 'lucide-react';
import { cn } from '../components/ui/Card'; // Importing helper if needed or just use clsx/tailwind directly
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import PDFGenerator from '../components/PDFGenerator';
import ReportView from '../components/ReportView';
import { useAuth } from '../context/AuthContext';
import { useValuation } from '../hooks/useValuation';
import { formatCurrency, formatNumber } from '../utils/format';
import { SURFACE_TYPES, DEFAULT_FACTORS } from '../constants';
import type { SurfaceType } from '../types/index';

function Dashboard() {
  const { logout } = useAuth();

  const {
    target, updateTarget,
    comparables, addComparable, updateComparable, deleteComparable, processedComparables,
    savedValuations, handleNewValuation, handleSaveValuation, handleDeleteValuation, handleLoadValuation,
    sheetUrl, setSheetUrl, handleImportFromSheet,
    brokerName, setBrokerName,
    matricula, setMatricula,
    pdfTheme, setPdfTheme,
    stats, valuation, targetHomogenizedSurface
  } = useValuation();

  // Modal state - this is UI state so we can keep it here or if strict logic moved to hook.
  // The hook has savedValuations data, but the "is modal open" is UI.
  // I will use a local state for the modal since the hook didn't export it (I saw I didn't add it to hook return).
  // Wait, I didn't add `savedValuationsModalOpen` to hook. I only added the logic.
  // I will add it here.
  const [savedValuationsModalOpen, setSavedValuationsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-md">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              TTasaciones
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Import Group */}
            <div className="hidden md:flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all shadow-sm">
              <div className="pl-2 pr-1 text-slate-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Pegar link de Google Sheets..."
                className="bg-transparent border-none focus:ring-0 text-xs w-48 text-slate-700 placeholder:text-slate-400 py-1.5"
              />
              <button
                onClick={handleImportFromSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-all active:scale-95 shadow-sm"
              >
                <Upload className="w-3 h-3" /> Importar
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1"></div>

            <button onClick={handleNewValuation} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nueva</span>
            </button>
            <button onClick={() => setSavedValuationsModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">Mis Tasaciones</span>
            </button>
            <button onClick={handleSaveValuation} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors">
              <Save className="w-4 h-4" /> <span className="hidden sm:inline">Guardar</span>
            </button>

            <PDFGenerator
              target={target}
              comparables={processedComparables}
              valuation={valuation}
              stats={stats}
              brokerName={brokerName}
              matricula={matricula}
              theme={pdfTheme}
            />

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Saved Valuations Modal */}
      {savedValuationsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                Mis Tasaciones
              </h3>
              <button onClick={() => setSavedValuationsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {savedValuations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
                  <div className="bg-slate-50 p-4 rounded-full">
                    <FolderOpen className="w-8 h-8 opacity-50" />
                  </div>
                  <p>No tienes tasaciones guardadas aún.</p>
                </div>
              ) : (
                savedValuations.map(val => (
                  <div key={val.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
                    <div>
                      <div className="font-medium text-slate-800">{val.name}</div>
                      <div className="text-xs text-slate-500">{new Date(val.date).toLocaleString()} • {val.comparables.length} comparables</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { handleLoadValuation(val); setSavedValuationsModalOpen(false); }}
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

          {/* Left: Target Property & Report Config */}
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

            {/* Config & Professional Info */}
            <Card className="bg-white border-slate-200">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 mb-2">
                  <AlertCircle className="w-4 h-4 text-indigo-500" />
                  <h2 className="font-semibold text-xs uppercase tracking-wider">Datos del Profesional</h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-medium">Agente Inmobiliario</label>
                    <input
                      type="text"
                      value={brokerName}
                      onChange={e => setBrokerName(e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 mt-1 text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-medium">Matrícula</label>
                    <input
                      type="text"
                      value={matricula}
                      onChange={e => setMatricula(e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-lg px-3 py-2 mt-1 text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="Ej: CUCICBA 1234"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 mb-2">
                  <h2 className="font-semibold text-xs uppercase tracking-wider">Personalización del Reporte</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-medium">Color Principal</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={pdfTheme.primary}
                        onChange={e => setPdfTheme({ ...pdfTheme, primary: e.target.value })}
                        className="h-8 w-8 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
                      />
                      <span className="text-xs text-slate-600 font-mono">{pdfTheme.primary}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-medium">Color Secundario</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={pdfTheme.secondary}
                        onChange={e => setPdfTheme({ ...pdfTheme, secondary: e.target.value })}
                        className="h-8 w-8 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
                      />
                      <span className="text-xs text-slate-600 font-mono">{pdfTheme.secondary}</span>
                    </div>
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
                          ${formatNumber(comp.hPrice || 0)}
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
          </div >
        </div >

        <div className="mt-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Vista Previa del Reporte
          </h3>
          <div className="bg-slate-200/50 rounded-xl p-8 overflow-auto flex justify-center border border-slate-200 shadow-inner">
            <div className="scale-[0.6] origin-top shadow-2xl">
              <ReportView
                data={{
                  target: target,
                  brokerName: brokerName || 'Usuario TTasaciones',
                  matricula: matricula || '',
                  clientName: 'Cliente Final',
                  ...valuation
                }}
                properties={processedComparables}
                valuation={valuation}
                stats={stats}
                theme={pdfTheme}
              />
            </div>
          </div>
        </div>

      </main>

    </div >
  );
}
export default Dashboard;
