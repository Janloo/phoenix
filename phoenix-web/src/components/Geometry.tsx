import React from 'react';
import type { Requirements } from './RequirementForm';
import { calculateGeometry } from '../utils/sizing';
import type { UnitSystem } from '../utils/units';
import { convertLength, UNIT_CONFIGS } from '../utils/units';

interface Props {
    reqs: Requirements;
    onChange: (reqs: Requirements) => void;
    unitSystem: UnitSystem;
}

export const Geometry: React.FC<Props> = ({ reqs, onChange, unitSystem }) => {
    const config = UNIT_CONFIGS[unitSystem];

    // Calculate wing geometry
    const { wingArea, span } = calculateGeometry(reqs);
    const wingMAC = wingArea / span; // Mean Aerodynamic Chord
    const wingRootChord = (2 * wingMAC) / (1 + reqs.wingTaperRatio);
    const wingTipChord = wingRootChord * reqs.wingTaperRatio;

    // Calculate tail geometry
    const tailSpan = Math.sqrt(reqs.tailArea * 6); // Assuming aspect ratio ~ 4
    const tailMAC = reqs.tailArea / tailSpan;
    const tailRootChord = (2 * tailMAC) / (1 + reqs.tailTaperRatio);
    const tailTipChord = tailRootChord * reqs.tailTaperRatio;

    // Slider component
    const Slider = ({ label, value, onChange, min, max, step, unit }: any) => (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
                <span className="text-sm font-bold text-white">{value.toFixed(step >= 1 ? 0 : 2)} {unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );

    // Planform visualization (horizontal orientation, nose pointing up)
    const PlanformSVG = ({ rootChord, tipChord, span, sweep, title }: any) => {
        const scale = 30; // pixels per meter
        const width = 700; // Wider for horizontal layout
        const height = 250;

        // Scale chords and span to fit
        const displaySpan = span * scale;
        const displayRoot = rootChord * scale;
        const displayTip = tipChord * scale;

        // Sweep angle: offset ONLY at the leading edge
        // Leading edge sweeps back (positive Y direction)
        const sweepOffsetLE = Math.tan(sweep * Math.PI / 180) * (displaySpan / 2);

        // Center in canvas
        const centerX = width / 2;
        const centerY = height / 2;

        // Wing points - View from above, nose pointing up (negative Y)
        // Span runs left-right (X axis)
        // Forward/aft runs up-down (Y axis, negative Y = nose/forward)
        const points = [
            // Root leading edge (left side, nose/forward - negative Y)
            [centerX - displaySpan / 2, centerY - displayRoot / 2],
            // Root trailing edge (left side, tail/aft - positive Y)
            [centerX - displaySpan / 2, centerY + displayRoot / 2],
            // Tip trailing edge (right side, tail/aft - NO sweep, stays aligned)
            [centerX + displaySpan / 2, centerY + displayTip / 2],
            // Tip leading edge (right side, nose/forward - SWEPT BACK)
            [centerX + displaySpan / 2, centerY - displayTip / 2 + sweepOffsetLE]
        ];

        return (
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300 capitalize">{title} Planform View (Nose ↑)</h4>
                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <svg width={width} height={height} className="opacity-90">
                        {/* Grid */}
                        <defs>
                            <pattern id={`grid-${title}`} width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#grid-${title})`} />

                        {/* Planform */}
                        <polygon
                            points={points.map(p => p.join(',')).join(' ')}
                            fill="#3b82f6"
                            fillOpacity="0.3"
                            stroke="#60a5fa"
                            strokeWidth="2"
                        />

                        {/* Centerline (horizontal, along span) */}
                        <line
                            x1={0}
                            y1={centerY}
                            x2={width}
                            y2={centerY}
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                        />

                        {/* Root chord marker (left edge) - Green */}
                        <line
                            x1={points[0][0]}
                            y1={points[0][1]}
                            x2={points[1][0]}
                            y2={points[1][1]}
                            stroke="#10b981"
                            strokeWidth="3"
                        />

                        {/* Tip chord marker (right edge) - Amber */}
                        <line
                            x1={points[3][0]}
                            y1={points[3][1]}
                            x2={points[2][0]}
                            y2={points[2][1]}
                            stroke="#f59e0b"
                            strokeWidth="3"
                        />

                        {/* Leading edge line (shows sweep angle) */}
                        <line
                            x1={points[0][0]}
                            y1={points[0][1]}
                            x2={points[3][0]}
                            y2={points[3][1]}
                            stroke="#60a5fa"
                            strokeWidth="2"
                            strokeDasharray="3 3"
                            opacity="0.7"
                        />

                        {/* Trailing edge line (should be straight across) */}
                        <line
                            x1={points[1][0]}
                            y1={points[1][1]}
                            x2={points[2][0]}
                            y2={points[2][1]}
                            stroke="#60a5fa"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                            opacity="0.5"
                        />

                        {/* Nose direction indicator */}
                        <g opacity="0.6">
                            <path
                                d={`M ${centerX - 20} ${20} L ${centerX} ${5} L ${centerX + 20} ${20}`}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <text x={centerX} y={35} fontSize="10" fill="#94a3b8" textAnchor="middle">NOSE</text>
                        </g>
                    </svg>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="prose prose-invert">
                <h2 className="text-3xl font-extrabold text-white">Planform Geometry</h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Define wing and tailplane planform parameters. Chord dimensions are calculated based on area and span from the sizing tool.
                </p>
            </div>

            <div className="space-y-8">
                {/* WING SECTION */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
                    <h3 className="text-xl font-semibold text-blue-400 mb-6">Wing Planform</h3>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: User Controls */}
                        <div className="space-y-4">
                            <Slider
                                label="Taper Ratio (λ)"
                                value={reqs.wingTaperRatio}
                                onChange={(val: number) => onChange({ ...reqs, wingTaperRatio: val })}
                                min={0.3}
                                max={1.0}
                                step={0.05}
                                unit=""
                            />

                            <Slider
                                label="Sweep Angle (Λ)"
                                value={reqs.wingSweep}
                                onChange={(val: number) => onChange({ ...reqs, wingSweep: val })}
                                min={0}
                                max={30}
                                step={1}
                                unit="°"
                            />

                            {/* Calculated Values */}
                            <div className="grid grid-cols-1 gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 uppercase">Root Chord</p>
                                    <p className="text-sm font-bold text-green-400">{convertLength(wingRootChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 uppercase">Tip Chord</p>
                                    <p className="text-sm font-bold text-amber-400">{convertLength(wingTipChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 uppercase">Avg Chord</p>
                                    <p className="text-sm font-bold text-blue-400">{convertLength(wingMAC, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Visual (spans 2 columns) */}
                        <div className="lg:col-span-2">
                            <PlanformSVG
                                rootChord={wingRootChord}
                                tipChord={wingTipChord}
                                span={span}
                                sweep={reqs.wingSweep}
                                title="wing"
                            />
                        </div>
                    </div>
                </div>

                {/* TAILPLANE SECTION */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
                    <h3 className="text-xl font-semibold text-blue-400 mb-6">Tailplane Planform</h3>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: User Controls */}
                        <div className="space-y-4">
                            <Slider
                                label="Taper Ratio (λ)"
                                value={reqs.tailTaperRatio}
                                onChange={(val: number) => onChange({ ...reqs, tailTaperRatio: val })}
                                min={0.3}
                                max={1.0}
                                step={0.05}
                                unit=""
                            />

                            <Slider
                                label="Sweep Angle (Λ)"
                                value={reqs.tailSweep}
                                onChange={(val: number) => onChange({ ...reqs, tailSweep: val })}
                                min={0}
                                max={30}
                                step={1}
                                unit="°"
                            />

                            {/* Calculated Values */}
                            <div className="grid grid-cols-1 gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 uppercase">Root Chord</p>
                                    <p className="text-sm font-bold text-green-400">{convertLength(tailRootChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 uppercase">Tip Chord</p>
                                    <p className="text-sm font-bold text-amber-400">{convertLength(tailTipChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 uppercase">Avg Chord</p>
                                    <p className="text-sm font-bold text-blue-400">{convertLength(tailMAC, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Visual (spans 2 columns) */}
                        <div className="lg:col-span-2">
                            <PlanformSVG
                                rootChord={tailRootChord}
                                tipChord={tailTipChord}
                                span={tailSpan}
                                sweep={reqs.tailSweep}
                                title="tail"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-200">
                        <p className="font-semibold mb-1">Note:</p>
                        <p>Chord dimensions are automatically calculated based on wing/tail area and span from the Sizing Tool. Sweep angle is applied to the leading edge. The trailing edge remains straight across for visualization clarity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
