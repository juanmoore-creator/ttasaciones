export type SurfaceType = 'Jardín' | 'Patio' | 'Terraza' | 'Balcón' | 'Ninguno';

export interface TargetProperty {
    address: string;
    coveredSurface: number;
    uncoveredSurface: number;
    surfaceType: SurfaceType;
    homogenizationFactor: number;
}

export interface Comparable {
    id: string;
    address: string;
    price: number;
    coveredSurface: number;
    uncoveredSurface: number;
    surfaceType: SurfaceType;
    homogenizationFactor: number;
    daysOnMarket: number;
    hSurface?: number;
    hPrice?: number;
}

export interface SavedValuation {
    id: string;
    name: string;
    date: number;
    target: TargetProperty;
    comparables: Comparable[];
}
