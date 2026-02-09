export interface SizingResult {
    mtow: number;
    wingArea: number;
    span: number;
    chord: number;
    liftCoeff: number;
    tailVolumeCoeff: number;
}

export const getDesignLiftCoefficient = (airfoil: string): number => {
    switch (airfoil) {
        case 'E387': return 0.7; // High lift soaring
        case 'CLARKY': return 0.6; // General purpose
        case 'NACA2412': return 0.5; // Standard GA
        case 'NACA0012': return 0.3; // Symmetric (flown at AoA)
        case 'NACA0009': return 0.3;
        default: return 0.5;
    }
};

export const calculateGeometry = (reqs: any): SizingResult => {
    // 1. MTOW Estimation
    const mtow = reqs.payload * 2.8 + (reqs.range * 0.1);

    // 2. Wing Area Calculation
    const Cl = getDesignLiftCoefficient(reqs.airfoil) || 0.4; // Fallback if 0
    const velocity = Math.max(reqs.speed, 20); // Min speed

    // Atmosphere
    const h = reqs.altitude || 0;
    const tempRatio = 1 - 2.25577e-5 * h;
    const rho = 1.225 * Math.pow(Math.max(0, tempRatio), 4.25588);

    const wingArea = (mtow * 9.81) / (0.5 * rho * Math.pow(velocity, 2) * Cl);

    // 3. Aspect Ratio & Span
    const AR = 8;
    const span = Math.sqrt(wingArea * AR);
    const chord = wingArea / span;

    return {
        mtow,
        wingArea,
        span,
        chord,
        liftCoeff: Cl,
        tailVolumeCoeff: 0.5 // Standard GA
    };
};

export const calculateTailArea = (wingArea: number, mac: number, tailDist: number, Vh: number = 0.5): number => {
    if (tailDist <= 0) return 0;
    // Vh = (Sh * Lh) / (Sw * c) -> Sh = (Vh * Sw * c) / Lh
    return (Vh * wingArea * mac) / tailDist;
};

export const calculateTailDist = (wingArea: number, mac: number, tailArea: number, Vh: number = 0.5): number => {
    if (tailArea <= 0) return 0;
    // Lh = (Vh * Sw * c) / Sh
    return (Vh * wingArea * mac) / tailArea;
};
