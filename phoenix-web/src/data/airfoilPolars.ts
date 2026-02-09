// Mock Airfoil Polar Data
// In a real implementation, this would come from XFoil analysis or a database

export interface PolarPoint {
    alpha: number;  // Angle of attack (degrees)
    cl: number;     // Lift coefficient
    cd: number;     // Drag coefficient
    cm: number;     // Moment coefficient
}

export interface AirfoilPolar {
    name: string;
    re: number;     // Reynolds number
    data: PolarPoint[];
}

// NACA 2412 polar data (typical values for Re ~ 3M)
export const NACA2412_POLAR: AirfoilPolar = {
    name: 'NACA 2412',
    re: 3000000,
    data: [
        { alpha: -4, cl: 0.0, cd: 0.0080, cm: -0.040 },
        { alpha: -2, cl: 0.2, cd: 0.0075, cm: -0.050 },
        { alpha: 0, cl: 0.4, cd: 0.0070, cm: -0.055 },
        { alpha: 2, cl: 0.6, cd: 0.0068, cm: -0.058 },
        { alpha: 4, cl: 0.8, cd: 0.0070, cm: -0.060 },
        { alpha: 6, cl: 1.0, cd: 0.0075, cm: -0.062 },
        { alpha: 8, cl: 1.2, cd: 0.0085, cm: -0.065 },
        { alpha: 10, cl: 1.35, cd: 0.0105, cm: -0.068 },
        { alpha: 12, cl: 1.48, cd: 0.0135, cm: -0.072 },
        { alpha: 14, cl: 1.58, cd: 0.0180, cm: -0.078 },
        { alpha: 16, cl: 1.52, cd: 0.0280, cm: -0.090 }, // Post-stall
        { alpha: 18, cl: 1.40, cd: 0.0450, cm: -0.105 },
    ]
};

export const NACA0012_POLAR: AirfoilPolar = {
    name: 'NACA 0012',
    re: 3000000,
    data: [
        { alpha: -4, cl: -0.4, cd: 0.0080, cm: 0.000 },
        { alpha: -2, cl: -0.2, cd: 0.0075, cm: 0.000 },
        { alpha: 0, cl: 0.0, cd: 0.0070, cm: 0.000 },
        { alpha: 2, cl: 0.2, cd: 0.0068, cm: 0.000 },
        { alpha: 4, cl: 0.4, cd: 0.0070, cm: 0.000 },
        { alpha: 6, cl: 0.6, cd: 0.0075, cm: 0.000 },
        { alpha: 8, cl: 0.8, cd: 0.0085, cm: 0.000 },
        { alpha: 10, cl: 1.0, cd: 0.0105, cm: 0.000 },
        { alpha: 12, cl: 1.15, cd: 0.0140, cm: 0.000 },
        { alpha: 14, cl: 1.25, cd: 0.0195, cm: 0.000 },
        { alpha: 16, cl: 1.15, cd: 0.0320, cm: 0.000 },
    ]
};

export const CLARKY_POLAR: AirfoilPolar = {
    name: 'Clark Y',
    re: 3000000,
    data: [
        { alpha: -4, cl: 0.1, cd: 0.0085, cm: -0.035 },
        { alpha: -2, cl: 0.3, cd: 0.0078, cm: -0.045 },
        { alpha: 0, cl: 0.5, cd: 0.0072, cm: -0.050 },
        { alpha: 2, cl: 0.7, cd: 0.0070, cm: -0.053 },
        { alpha: 4, cl: 0.9, cd: 0.0072, cm: -0.055 },
        { alpha: 6, cl: 1.1, cd: 0.0078, cm: -0.058 },
        { alpha: 8, cl: 1.3, cd: 0.0090, cm: -0.062 },
        { alpha: 10, cl: 1.45, cd: 0.0115, cm: -0.067 },
        { alpha: 12, cl: 1.58, cd: 0.0150, cm: -0.075 },
        { alpha: 14, cl: 1.65, cd: 0.0200, cm: -0.085 },
        { alpha: 16, cl: 1.60, cd: 0.0300, cm: -0.100 },
        { alpha: 18, cl: 1.45, cd: 0.0480, cm: -0.120 },
    ]
};

export const E387_POLAR: AirfoilPolar = {
    name: 'Eppler 387',
    re: 3000000,
    data: [
        { alpha: -4, cl: 0.2, cd: 0.0075, cm: -0.060 },
        { alpha: -2, cl: 0.45, cd: 0.0068, cm: -0.070 },
        { alpha: 0, cl: 0.7, cd: 0.0063, cm: -0.075 },
        { alpha: 2, cl: 0.95, cd: 0.0062, cm: -0.078 },
        { alpha: 4, cl: 1.2, cd: 0.0065, cm: -0.080 },
        { alpha: 6, cl: 1.42, cd: 0.0072, cm: -0.083 },
        { alpha: 8, cl: 1.62, cd: 0.0085, cm: -0.088 },
        { alpha: 10, cl: 1.78, cd: 0.0108, cm: -0.095 },
        { alpha: 12, cl: 1.88, cd: 0.0145, cm: -0.105 },
        { alpha: 14, cl: 1.92, cd: 0.0200, cm: -0.120 },
        { alpha: 16, cl: 1.80, cd: 0.0320, cm: -0.140 },
    ]
};

export const AIRFOIL_POLARS: Record<string, AirfoilPolar> = {
    'NACA2412': NACA2412_POLAR,
    'NACA0012': NACA0012_POLAR,
    'CLARKY': CLARKY_POLAR,
    'E387': E387_POLAR,
};

export const getAirfoilPolar = (airfoil: string): AirfoilPolar => {
    return AIRFOIL_POLARS[airfoil] || NACA2412_POLAR;
};
