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
    // If manual masses are set, use them. Otherwise use heuristic.
    let mtow = 0;
    const manualMassSum = (reqs.engineMass || 0) + (reqs.fuelMass || 0) + (reqs.structureMass || 0);

    if (manualMassSum > 10) { // Threshold to assume valid inputs
        mtow = manualMassSum + reqs.payload;
    } else {
        // Fallback Heuristic
        mtow = reqs.payload * 2.8;
    }

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

// --- Mass & Balance ---

export interface CGResult {
    totalMass: number;
    cgLocation: number; // Distance from datum (Wing LE or Quarter Chord)
    neutralPoint: number;
    staticMargin: number; // (NP - CG) / MAC (%MAC)
    masses: {
        engine: { mass: number; pos: number };
        fuel: { mass: number; pos: number };
        structure: { mass: number; pos: number };
        payload: { mass: number; pos: number };
    };
}

export const calculateCG = (reqs: any, geom: SizingResult): CGResult => {
    // Estimations based on MTOW (simplified)
    const massTotal = geom.mtow;

    // Ratios (approximate)
    const m_eng = massTotal * 0.25;
    const m_fuel = massTotal * 0.25;
    const m_payload = reqs.payload;
    const m_struct = massTotal - (m_eng + m_fuel + m_payload);

    // Positions (User defined)
    const p_eng = reqs.enginePos || 0;
    const p_fuel = reqs.fuelPos || 0;
    const p_struct = reqs.structurePos || 0;
    const p_payload = 0; // Payload typically at CG/Wing Center for stability

    // Moment Calculation
    const momentTotal = (m_eng * p_eng) + (m_fuel * p_fuel) + (m_struct * p_struct) + (m_payload * p_payload);
    const cg = momentTotal / massTotal;

    // Neutral Point Estimation
    // Simplified: NP is usually around 25-40% MAC. 
    // With tail effect: NP = 0.25 + (TailVolume * (TailLiftSlope/WingLiftSlope) * (1 - Downwash))
    // Let's approximate NP at 0.4 * MAC (behind LE) + offset if any.
    // Datum: We assume Datum is Wing Quarter Chord (0.25c) or LE. 
    // Let's assume Datum = Wing Leading Edge (LE).
    const mac = geom.chord;
    // Aerodynamic Center approx 25% MAC
    const ac = 0.25 * mac;

    // Neutral Point (Stick fixed) approx AC + Vh * (a_t / a_w) 
    // Vh = 0.5 typically. Ratio ~ 0.8
    const neutralPoint = ac + (geom.tailVolumeCoeff || 0.5) * 0.8 * mac;

    const staticMargin = (neutralPoint - cg) / mac;

    return {
        totalMass: massTotal,
        cgLocation: cg,
        neutralPoint: neutralPoint,
        staticMargin: staticMargin,
        masses: {
            engine: { mass: m_eng, pos: p_eng },
            fuel: { mass: m_fuel, pos: p_fuel },
            structure: { mass: m_struct, pos: p_struct },
            payload: { mass: m_payload, pos: p_payload }
        }
    };
};
