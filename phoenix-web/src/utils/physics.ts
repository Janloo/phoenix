// --- Physics Constants ---
export const GRAVITY = 9.81;
export const SEA_LEVEL_DENSITY = 1.225; // kg/m³ at MSL

/**
 * ISA (International Standard Atmosphere) air density as a function of altitude.
 * Uses the troposphere formula up to 11 000 m, then the stratosphere above.
 */
export function airDensity(altitudeM: number): number {
    const h = Math.max(0, altitudeM);
    if (h <= 11000) {
        // Troposphere: temperature lapse rate 6.5 K/km
        const T = 288.15 - 0.0065 * h;
        return SEA_LEVEL_DENSITY * Math.pow(T / 288.15, 4.256);
    } else {
        // Stratosphere: isothermal at 216.65 K
        const rhoAt11k = SEA_LEVEL_DENSITY * Math.pow(216.65 / 288.15, 4.256);
        return rhoAt11k * Math.exp(-GRAVITY * (h - 11000) / (287.05 * 216.65));
    }
}

/**
 * Engine + propeller efficiency factor (0–1) as a function of altitude and airspeed.
 *
 * - Altitude effect: piston/turboprop power scales roughly with air density ratio.
 *   (Turbofan would be different, but we use a generic model here.)
 * - Speed (propulsive efficiency): a propeller has peak efficiency at a design
 *   advance ratio. We model this as a bell-curve centred on ~80 m/s (~155 kt)
 *   for a generic GA/turboprop aircraft. At 0 speed efficiency is low (~30%),
 *   peaks near design speed, then falls off at very high speeds.
 */
export function engineEfficiency(altitudeM: number, speedMs: number): number {
    const rho = airDensity(altitudeM);
    const altitudeFactor = rho / SEA_LEVEL_DENSITY; // 1.0 at MSL → 0 at extreme alt

    // Propulsive efficiency: bell-curve with peak at ~80 m/s
    const designSpeed = 80; // m/s – tune to aircraft type
    const bandwidth = 70;   // m/s – width of efficiency bell
    const rawEta = Math.exp(-Math.pow((speedMs - designSpeed) / bandwidth, 2));
    // Floor at 0.30 so there's always some thrust at low speed (static thrust)
    const propEfficiency = 0.30 + 0.70 * rawEta;

    return Math.max(0, altitudeFactor * propEfficiency);
}

/**
 * ISA speed of sound as a function of altitude.
 * a = sqrt(gamma * R * T) = 20.05 * sqrt(T)
 */
export function speedOfSound(altitudeM: number): number {
    const h = Math.max(0, altitudeM);
    const T = h <= 11000
        ? 288.15 - 0.0065 * h   // troposphere
        : 216.65;                // stratosphere (isothermal)
    return 20.05 * Math.sqrt(T);
}

/**
 * Mach-number drag divergence multiplier.
 * Below M 0.80  → 1.0 (no compressibility penalty).
 * Above  M 0.80  → rises steeply modelling wave drag.
 * This creates a hard physical speed ceiling for any subsonic aircraft.
 */
export function machDragFactor(mach: number): number {
    if (mach < 0.80) return 1.0;
    // Cubic rise in drag beyond drag-divergence Mach (~0.80)
    const dM = mach - 0.80;
    return 1.0 + 20 * dM * dM * dM + 5 * dM;
}
