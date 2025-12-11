

const PropertyDetailPage = ({ property, index, theme }: { property: any, index: number, theme?: { primary: string, secondary: string } }) => {
    const primaryColor = theme?.primary || '#1e293b';
    const secondaryColor = theme?.secondary || '#4f46e5';

    const hSurface = property.coveredSurface + (property.uncoveredSurface * (property.homogenizationFactor || 0.5));
    const pricePerM2 = hSurface > 0 ? Math.round(property.price / hSurface) : 0;

    return (
        <div className="print-page h-[1123px] w-[794px] bg-white p-12 flex flex-col">
            <div className="flex justify-between items-end mb-8 border-b-2 pb-4" style={{ borderColor: primaryColor }}>
                <h2 className="text-2xl font-bold text-slate-900">Comparable #{index + 1}</h2>
                <div className="text-sm font-bold" style={{ color: secondaryColor }}>TTasaciones</div>
            </div>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{property.address}</h1>
                    <span className="text-slate-500 text-lg">Propiedad Comparable</span>
                </div>
                <div className="text-right">
                    <span className="block text-3xl font-bold" style={{ color: primaryColor }}>
                        U$S {property.price.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="h-64 bg-slate-100 mb-8 flex items-center justify-center rounded-lg border border-slate-200">
                <span className="text-slate-400">Sin imagen disponible</span>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-1" style={{ borderColor: secondaryColor }}>Características</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                            <span className="text-slate-600">Sup. Cubierta</span>
                            <span className="font-bold text-slate-800">{property.coveredSurface} m²</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                            <span className="text-slate-600">Sup. Descubierta</span>
                            <span className="font-bold text-slate-800">{property.uncoveredSurface} m²</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                            <span className="text-slate-600">Tipo Superficie</span>
                            <span className="font-bold text-slate-800">{property.surfaceType}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                            <span className="text-slate-600">Sup. Homogenizada</span>
                            <span className="font-bold text-slate-800">{hSurface} m²</span>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-1" style={{ borderColor: secondaryColor }}>Análisis</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                            <span className="text-slate-600">Días en Mercado</span>
                            <span className="font-bold text-slate-800">{property.daysOnMarket}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                            <span className="text-slate-600">$/m² Homogenizado</span>
                            <span className="font-bold text-slate-800">U$S {pricePerM2.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                            <span className="text-slate-600">Factor Homog.</span>
                            <span className="font-bold text-slate-800">{property.homogenizationFactor}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                <span>Reporte generado el {new Date().toLocaleDateString()}</span>
                <span>Página {index + 4}</span>
            </div>
        </div>
    );
};

export default PropertyDetailPage;
