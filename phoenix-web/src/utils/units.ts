// Unit System Types and Conversion Utilities

export type UnitSystem = 'metric' | 'imperial';

export interface UnitConfig {
    distance: string;
    distanceShort: string;
    speed: string;
    speedShort: string;
    altitude: string;
    altitudeShort: string;
    mass: string;
    massShort: string;
    area: string;
    areaShort: string;
    power: string;
    powerShort: string;
    force: string;
    forceShort: string;
}

export const UNIT_CONFIGS: Record<UnitSystem, UnitConfig> = {
    metric: {
        distance: 'kilometers',
        distanceShort: 'km',
        speed: 'meters/second',
        speedShort: 'm/s',
        altitude: 'meters',
        altitudeShort: 'm',
        mass: 'kilograms',
        massShort: 'kg',
        area: 'square meters',
        areaShort: 'm²',
        power: 'horsepower',
        powerShort: 'hp',
        force: 'kilonewtons',
        forceShort: 'kN',
    },
    imperial: {
        distance: 'nautical miles',
        distanceShort: 'NM',
        speed: 'knots',
        speedShort: 'kts',
        altitude: 'feet',
        altitudeShort: 'ft',
        mass: 'pounds',
        massShort: 'lbs',
        area: 'square feet',
        areaShort: 'ft²',
        power: 'horsepower',
        powerShort: 'hp',
        force: 'pounds-force',
        forceShort: 'lbf',
    }
};

// Conversion Functions
export const convertDistance = (valueKm: number, to: UnitSystem): number => {
    return to === 'imperial' ? valueKm * 0.539957 : valueKm; // km to NM
};

export const convertSpeed = (valueMps: number, to: UnitSystem): number => {
    return to === 'imperial' ? valueMps * 1.94384 : valueMps; // m/s to kts
};

export const convertAltitude = (valueM: number, to: UnitSystem): number => {
    return to === 'imperial' ? valueM * 3.28084 : valueM; // m to ft
};

export const convertMass = (valueKg: number, to: UnitSystem): number => {
    return to === 'imperial' ? valueKg * 2.20462 : valueKg; // kg to lbs
};

export const convertArea = (valueSqM: number, to: UnitSystem): number => {
    return to === 'imperial' ? valueSqM * 10.7639 : valueSqM; // m² to ft²
};

export const convertForce = (valueKn: number, to: UnitSystem): number => {
    return to === 'imperial' ? valueKn * 224.809 : valueKn; // kN to lbf
};

// Reverse conversions (from display units back to metric for storage)
export const reverseConvertDistance = (value: number, from: UnitSystem): number => {
    return from === 'imperial' ? value / 0.539957 : value; // NM to km
};

export const reverseConvertSpeed = (value: number, from: UnitSystem): number => {
    return from === 'imperial' ? value / 1.94384 : value; // kts to m/s
};

export const reverseConvertAltitude = (value: number, from: UnitSystem): number => {
    return from === 'imperial' ? value / 3.28084 : value; // ft to m
};

export const reverseConvertMass = (value: number, from: UnitSystem): number => {
    return from === 'imperial' ? value / 2.20462 : value; // lbs to kg
};

export const reverseConvertArea = (value: number, from: UnitSystem): number => {
    return from === 'imperial' ? value / 10.7639 : value; // ft² to m²
};

// Helper function for formatting values
export const formatValue = (value: number, decimals: number = 1): string => {
    return value.toFixed(decimals);
};
