import React from 'react';
import { type Requirements } from './RequirementForm';
import { calculateGeometry, calculateCG } from '../utils/sizing';
import { type UnitSystem, convertLength, convertMass } from '../utils/units';

interface Props {
    reqs: Requirements;
    onChange: (reqs: Requirements) => void;
    unitSystem: UnitSystem;
}

export const MassDistribution: React.FC<Props> = ({ reqs, onChange, unitSystem }) => {
    // 1. Calculate Geometry & CG
    const geom = calculateGeometry(reqs);
    const cgResult = calculateCG(reqs, geom);

    // 2. Visual Scales
    const pxPerMeter = 40; // Scale for visualization
    const width = 800;
    const height = 400;
    const centerY = height / 2;
    const centerX = width / 3; // Wing LE at this X

    // Helper to converting geometric X to SVG X
    // Geometric X: 0 = Wing LE. +X = Aft (Right), -X = Fwd (Left).
    const toSvgX = (geoX: number) => centerX + (geoX * pxPerMeter);

    const formatMass = (val: number) => convertMass(val, unitSystem).toFixed(0);
    const formatLen = (val: number) => convertLength(val, unitSystem).toFixed(2);

    const updatePos = (key: keyof Requirements, val: number) => {
        onChange({ ...reqs, [key]: val });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Controls */}
            <div className="space-y-6">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4">Mass Configuration</h3>

                    {/* Engine Position */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Engine Position ({formatMass(cgResult.masses.engine.mass)} {unitSystem === 'metric' ? 'kg' : 'lbs'})
                        </label>
                        <input
                            type="range"
                            min="-2" max="5" step="0.1"
                            value={reqs.enginePos || 0}
                            onChange={(e) => updatePos('enginePos', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Fwd (-2m)</span>
                            <span className="text-white font-mono">{formatLen(reqs.enginePos || 0)} {unitSystem === 'metric' ? 'm' : 'ft'}</span>
                            <span>Aft (+5m)</span>
                        </div>
                    </div>

                    {/* Fuel Position */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Fuel Tank ({formatMass(cgResult.masses.fuel.mass)} {unitSystem === 'metric' ? 'kg' : 'lbs'})
                        </label>
                        <input
                            type="range"
                            min="-2" max="5" step="0.1"
                            value={reqs.fuelPos || 0}
                            onChange={(e) => updatePos('fuelPos', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Fwd</span>
                            <span className="text-white font-mono">{formatLen(reqs.fuelPos || 0)}</span>
                            <span>Aft</span>
                        </div>
                    </div>

                    {/* Structure Position */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Structure/Fuselage ({formatMass(cgResult.masses.structure.mass)} {unitSystem === 'metric' ? 'kg' : 'lbs'})
                        </label>
                        <input
                            type="range"
                            min="-1" max="6" step="0.1"
                            value={reqs.structurePos || 0}
                            onChange={(e) => updatePos('structurePos', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Fwd</span>
                            <span className="text-white font-mono">{formatLen(reqs.structurePos || 0)}</span>
                            <span>Aft</span>
                        </div>
                    </div>

                    {/* Payload (Fixed) */}
                    <div className="p-3 bg-slate-900/50 rounded text-sm text-slate-400">
                        Payload ({formatMass(cgResult.masses.payload.mass)}) is fixed at CG (0 m).
                    </div>
                </div>

                {/* Analysis */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4">Stability Analysis</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-400">CG Location</span>
                            <span className="font-mono text-white">{formatLen(cgResult.cgLocation)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Neutral Point</span>
                            <span className="font-mono text-white">{formatLen(cgResult.neutralPoint)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-2">
                            <span className="text-slate-400">Static Margin</span>
                            <span className={`font-mono font-bold ${cgResult.staticMargin > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {(cgResult.staticMargin * 100).toFixed(1)}% MAC
                            </span>
                        </div>
                        {cgResult.staticMargin <= 0 && (
                            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-sm mt-2">
                                ⚠ Unstable! CG is behind the Neutral Point. Move masses forward.
                            </div>
                        )}
                        {cgResult.staticMargin > 0.05 && cgResult.staticMargin < 0.20 && (
                            <div className="p-3 bg-green-900/20 border border-green-500/50 rounded text-green-200 text-sm mt-2">
                                ✓ Stable configuration.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Visualizer (Side View) */}
            <div className="lg:col-span-2 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 relative">
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="w-full h-full">

                    {/* Grid */}
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Reference Line (Datum) */}
                    <line x1={centerX} y1={0} x2={centerX} y2={height} stroke="#475569" strokeDasharray="4 4" />
                    <text x={centerX + 5} y={20} fill="#64748b" fontSize="10">Datum (Wing LE)</text>


                    {/* MAC Visualization */}
                    <rect
                        x={centerX}
                        y={centerY - 10}
                        width={geom.chord * pxPerMeter}
                        height={20}
                        fill="#3b82f6"
                        opacity="0.2"
                    />
                    <text x={centerX + (geom.chord * pxPerMeter) / 2} y={centerY - 15} textAnchor="middle" fill="#60a5fa" fontSize="10">MAC</text>


                    {/* Aircraft Profile (Simplified Side View) */}
                    <g opacity="0.5">
                        {/* Fuselage */}
                        <path d={`
                            M ${toSvgX(-geom.span / 5)} ${centerY} 
                            Q ${toSvgX(0)} ${centerY - 30} ${toSvgX(reqs.tailDist)} ${centerY}
                            Q ${toSvgX(0)} ${centerY + 30} ${toSvgX(-geom.span / 5)} ${centerY}
                        `} fill="none" stroke="#94a3b8" strokeWidth="2" />

                        {/* Wing (Airfoil approx) */}
                        <path d={`
                            M ${toSvgX(0)} ${centerY} 
                            Q ${toSvgX(geom.chord * 0.4)} ${centerY - 20} ${toSvgX(geom.chord)} ${centerY}
                        `} fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" />

                        {/* Tail */}
                        <line
                            x1={toSvgX(reqs.tailDist)} y1={centerY}
                            x2={toSvgX(reqs.tailDist + (geom.chord * 0.6))} y2={centerY}
                            stroke="#94a3b8" strokeWidth="4"
                        />
                    </g>

                    {/* Mass Markers */}
                    {/* Engine */}
                    <g transform={`translate(${toSvgX(reqs.enginePos || 0)}, ${centerY})`}>
                        <circle r="8" fill="#f59e0b" />
                        <text y="-12" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">ENG</text>
                    </g>

                    {/* Fuel */}
                    <g transform={`translate(${toSvgX(reqs.fuelPos || 0)}, ${centerY})`}>
                        <circle r="6" fill="#ec4899" />
                        <text y="-12" textAnchor="middle" fill="#ec4899" fontSize="10" fontWeight="bold">FUEL</text>
                    </g>

                    {/* Structure */}
                    <g transform={`translate(${toSvgX(reqs.structurePos || 0)}, ${centerY})`}>
                        <circle r="10" fill="#64748b" />
                        <text y="-15" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">STR</text>
                    </g>

                    {/* Payload */}
                    <g transform={`translate(${toSvgX(0)}, ${centerY})`}>
                        <circle r="6" fill="#10b981" />
                        <text y="20" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">PAY</text>
                    </g>

                    {/* CG Marker */}
                    <g transform={`translate(${toSvgX(cgResult.cgLocation)}, ${centerY + 40})`}>
                        <circle r="8" fill="none" stroke="#eab308" strokeWidth="2" />
                        <path d="M 0 -8 L 0 8 M -8 0 L 8 0" stroke="#eab308" strokeWidth="2" />
                        <circle r="3" fill="#eab308" />
                        <line x1="0" y1="-40" x2="0" y2="-10" stroke="#eab308" strokeDasharray="2 2" />
                        <text y="20" textAnchor="middle" fill="#eab308" fontWeight="bold">CG</text>
                    </g>

                    {/* Neutral Point Marker */}
                    <g transform={`translate(${toSvgX(cgResult.neutralPoint)}, ${centerY + 40})`}>
                        <path d="M 0 0 L 6 10 L -6 10 Z" fill="#ef4444" />
                        <line x1="0" y1="-40" x2="0" y2="0" stroke="#ef4444" strokeDasharray="2 2" />
                        <text y="20" textAnchor="middle" fill="#ef4444" fontWeight="bold">NP</text>
                    </g>

                </svg>
            </div>
        </div>
    );
};
