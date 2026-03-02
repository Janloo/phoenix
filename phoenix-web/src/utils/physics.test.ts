import { describe, it, expect } from 'vitest';
import {
    airDensity,
    engineEfficiency,
    speedOfSound,
    machDragFactor,
    SEA_LEVEL_DENSITY
} from './physics';

describe('Flight Model Physics', () => {

    describe('airDensity', () => {
        it('calculates density correctly at sea level', () => {
            const density = airDensity(0);
            expect(density).toBeCloseTo(SEA_LEVEL_DENSITY, 3);
        });

        it('calculates density correctly in the troposphere (e.g., 5000m)', () => {
            const density = airDensity(5000);
            expect(density).toBeLessThan(SEA_LEVEL_DENSITY);
            expect(density).toBeGreaterThan(0.5); // Density drops but is still > 0.5 kg/m3
            // At 5000m standard density is approx 0.736 kg/m3
            expect(density).toBeCloseTo(0.736, 1);
        });

        it('calculates density correctly in the stratosphere (e.g., 15000m)', () => {
            const density = airDensity(15000);
            // Must be less than density at tropopause (11000m approx 0.36 kg/m3)
            expect(density).toBeLessThan(0.37);
            expect(density).toBeGreaterThan(0.1); // approx 0.19 at 15km
            expect(density).toBeCloseTo(0.1948, 2);
        });

        it('handles extreme altitudes without breaking (e.g., 50000m)', () => {
            const density = airDensity(50000);
            expect(density).toBeGreaterThan(0);
            expect(density).toBeLessThan(0.01); // Almost vacuum
        });

        it('handles negative altitudes by clamping to 0', () => {
            const density = airDensity(-1000);
            expect(density).toBeCloseTo(SEA_LEVEL_DENSITY, 3);
        });
    });

    describe('speedOfSound', () => {
        it('calculates speed of sound at sea level', () => {
            const sos = speedOfSound(0);
            // sqrt(1.4 * 287 * 288.15) ≈ 340.3 m/s
            expect(sos).toBeCloseTo(340.3, 1);
        });

        it('decreases with altitude in the troposphere', () => {
            const sos1 = speedOfSound(0);
            const sos2 = speedOfSound(10000);
            expect(sos2).toBeLessThan(sos1);
            expect(sos2).toBeCloseTo(299.5, 1);
        });

        it('remains constant in the lower stratosphere (11000m to 20000m)', () => {
            const sos1 = speedOfSound(11000);
            const sos2 = speedOfSound(15000);
            // Isothermal stratosphere model in code
            expect(sos1).toBeCloseTo(sos2, 5);
            expect(sos1).toBeCloseTo(295.1, 1);
        });
    });

    describe('machDragFactor', () => {
        it('has no penalty below critical Mach 0.8', () => {
            expect(machDragFactor(0.5)).toBe(1.0);
            expect(machDragFactor(0.79)).toBe(1.0);
        });

        it('starts rising at Mach 0.8', () => {
            expect(machDragFactor(0.81)).toBeGreaterThan(1.0);
        });

        it('applies severe penalty above Mach 1.0 (wave drag limit)', () => {
            const m085 = machDragFactor(0.85);
            const m10 = machDragFactor(1.0); // dM = 0.2
            // dM=0.2 => 1 + 20*(0.008) + 5*(0.2) = 1 + 0.16 + 1.0 = 2.16
            expect(m10).toBeCloseTo(2.16, 2);
            expect(m10).toBeGreaterThan(m085);
        });
    });

    describe('engineEfficiency', () => {
        it('scales down with altitude due to air density', () => {
            const effSL = engineEfficiency(0, 80);
            const eff10k = engineEfficiency(10000, 80);
            expect(eff10k).toBeLessThan(effSL);
        });

        it('has peak propulsive efficiency near design speed (80 m/s)', () => {
            const effStatic = engineEfficiency(0, 0);       // Low speed
            const effDesign = engineEfficiency(0, 80);      // Optimal speed
            const effFast = engineEfficiency(0, 200);       // Over speed

            expect(effDesign).toBeGreaterThan(effStatic);
            expect(effDesign).toBeGreaterThan(effFast);

            // Floor check at static thrust (0 m/s)
            expect(effStatic).toBeGreaterThan(0.25);
        });

        it('does not return negative efficiency at extreme altitudes', () => {
            const eff = engineEfficiency(40000, 80);
            expect(eff).toBeGreaterThan(0);
            expect(eff).toBeLessThan(0.05); // Essentially no thrust due to rho~0
        });
    });

});
