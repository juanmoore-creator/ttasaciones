

const CoverPage = ({ data, theme }: { data: any, theme?: { primary: string, secondary: string } }) => {
    const primaryColor = theme?.primary || '#1e293b'; // slate-900
    const secondaryColor = theme?.secondary || '#4f46e5'; // indigo-600

    return (
        <div className="print-page cover-page h-[1123px] w-[794px] bg-white relative flex overflow-hidden">
            <div className="w-1/3 h-full" style={{ backgroundColor: primaryColor }}></div>
            <div className="flex-1 p-12 flex flex-col justify-center">
                <div className="mb-20">
                    <div className="text-4xl font-bold text-slate-900 tracking-tight">
                        TTasaciones <span style={{ color: secondaryColor }}>Pro</span>
                    </div>
                </div>

                <div className="text-6xl font-bold leading-tight mb-8" style={{ color: primaryColor }}>
                    REPORTE DE<br />TASACIÓN
                </div>

                <div className="space-y-12">
                    <div>
                        <span className="block text-sm text-slate-500 uppercase tracking-widest mb-2">Propiedad</span>
                        <span className="text-3xl font-semibold text-slate-800">{data.target?.address || 'Dirección de la Propiedad'}</span>
                    </div>

                    <div>
                        <span className="block text-sm text-slate-500 uppercase tracking-widest mb-2">Preparado para</span>
                        <span className="text-xl text-slate-700">{data.clientName || 'Cliente'}</span>
                    </div>

                    <div className="pt-12 border-t border-slate-200 flex justify-between items-end">
                        <div>
                            <span className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Corredor Inmobiliario</span>
                            <div className="text-lg font-bold" style={{ color: primaryColor }}>{data.brokerName || 'Agente Inmobiliario'}</div>
                            <div className="text-sm text-slate-500">{data.matricula ? `Matrícula ${data.matricula}` : 'Matrícula #'}</div>
                        </div>
                        <div className="text-sm text-slate-400">
                            {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoverPage;
