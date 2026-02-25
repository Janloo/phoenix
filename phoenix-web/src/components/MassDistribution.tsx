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

    // 2. Dynamic Scaler (Bounding Box)
    const elementsX = [
        0, // Wing LE (Datum)
        geom.chord, // Wing TE
        reqs.tailDist, // Tail location
        reqs.tailDist + (geom.chord * 0.6), // Tail TE
        reqs.enginePos || 0,
        reqs.fuelPos || 0,
        reqs.structurePos || 0,
        cgResult.cgLocation,
        cgResult.neutralPoint,
        -geom.span / 5 // Nose roughly
    ];

    const minX = Math.min(...elementsX); // Fwd most point (usually negative, e.g. Nose or Engine)
    const maxX = Math.max(...elementsX); // Aft most point (usually Tail TE)

    // Add 10% padding to the bounding box
    const totalLength = (maxX - minX) * 1.2;
    // Guard against 0 logic if something goes wrong
    const safeLength = totalLength > 0 ? totalLength : 10;

    const width = 800;
    const height = 400;

    // Dynamic pxPerMeter based on available canvas width
    const pxPerMeter = width / safeLength;

    const centerY = height / 2;
    // Set CenterX so that minX structurally maps to 10% of width (padding)
    const centerX = -minX * pxPerMeter + (width * 0.1);

    // Helper to converting geometric X to SVG X
    // Geometric X: 0 = Wing LE. +X = Aft (Right), -X = Fwd (Left).
    const toSvgX = (geoX: number) => centerX + (geoX * pxPerMeter);

    const formatMass = (val: number) => convertMass(val, unitSystem).toFixed(0);
    const formatLen = (val: number) => convertLength(val, unitSystem).toFixed(2);

    const updateReq = (key: keyof Requirements, val: number) => {
        onChange({ ...reqs, [key]: val });
    };

    const massUnit = unitSystem === 'metric' ? 'kg' : 'lbs';
    const lenUnit = unitSystem === 'metric' ? 'm' : 'ft';

    // Helper Component for Mass Controls
    const MassControl = ({ label, massKey, posKey, color, massVal, posVal }: any) => {
        const currentMass = reqs[massKey as keyof Requirements] as number;
        const isAuto = !currentMass || currentMass <= 0;
        const displayMass = isAuto ? massVal : currentMass;

        return (
            <div className="mb-6 bg-slate-700/30 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                        {label}
                    </label>
                    <div className="text-xs text-slate-500 font-mono">
                        {isAuto ? '(Auto)' : '(Manual)'}
                    </div>
                </div>

                {/* Mass Input */}
                <div className="flex items-center gap-4 mb-3">
                    <label className="text-xs text-slate-400 w-16">Mass ({massUnit})</label>
                    <input
                        type="number"
                        min="0"
                        step="any"
                        value={convertMass(displayMass, unitSystem).toFixed(0)}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const metricVal = unitSystem === 'metric' ? val : val / 2.20462;
                            updateReq(massKey, metricVal);
                        }}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-right text-white text-sm"
                    />
                </div>

                {/* Position Slider */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Position ({lenUnit})</span>
                        <span className="font-mono text-white">{formatLen(posVal)}</span>
                    </div>
                    <input
                        type="range"
                        min="-5" max="10" step="0.1"
                        value={posVal || 0}
                        onChange={(e) => updateReq(posKey, parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600">
                        <span>Fwd</span>
                        <span>Aft</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Controls */}
            <div className="space-y-6">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 overflow-y-auto max-h-[80vh]">
                    <h3 className="text-xl font-bold text-white mb-4">Mass Configuration</h3>

                    <MassControl
                        label="Engine"
                        massKey="engineMass" posKey="enginePos"
                        color="#f59e0b"
                        massVal={cgResult.masses.engine.mass}
                        posVal={reqs.enginePos || 0}
                    />

                    <MassControl
                        label="Fuel Tank"
                        massKey="fuelMass" posKey="fuelPos"
                        color="#ec4899"
                        massVal={cgResult.masses.fuel.mass}
                        posVal={reqs.fuelPos || 0}
                    />

                    <MassControl
                        label="Structure"
                        massKey="structureMass" posKey="structurePos"
                        color="#64748b"
                        massVal={cgResult.masses.structure.mass}
                        posVal={reqs.structurePos || 0}
                    />

                    {/* Payload (Fixed Mass, Fixed Pos) */}
                    <div className="p-4 bg-slate-900/50 rounded border border-slate-700/50 flex justify-between items-center text-sm text-slate-400">
                        <span>Payload (Fixed at CG)</span>
                        <span className="font-mono text-white">{formatMass(cgResult.masses.payload.mass)} {massUnit}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-slate-300">Total Mass (MTOW)</span>
                        <span className="font-mono text-xl text-blue-400">{formatMass(cgResult.totalMass)} {massUnit}</span>
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
