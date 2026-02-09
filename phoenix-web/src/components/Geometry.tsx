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

    // Planform visualization
    const PlanformSVG = ({ rootChord, tipChord, span, sweep, title }: any) => {
        const scale = 40; // pixels per meter
        const width = 300;
        const height = 200;

        // Scale chords and span to fit
        const displaySpan = span * scale;
        const displayRoot = rootChord * scale;
        const displayTip = tipChord * scale;
        const displaySweep = Math.tan(sweep * Math.PI / 180) * (displaySpan / 2);

        // Center in canvas
        const centerX = width / 2;
        const centerY = height / 2;

        // Wing points (trapezoid)
        const points = [
            [centerX - displayRoot / 2, centerY - displaySpan / 2],
            [centerX + displayRoot / 2, centerY - displaySpan / 2],
            [centerX + displayTip / 2 + displaySweep, centerY + displaySpan / 2],
            [centerX - displayTip / 2 + displaySweep, centerY + displaySpan / 2]
        ];

        return (
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">{title}</h4>
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

                        {/* Centerline */}
                        <line
                            x1={centerX}
                            y1={0}
                            x2={centerX}
                            y2={height}
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                        />

                        {/* Root chord marker */}
                        <line
                            x1={points[0][0]}
                            y1={points[0][1]}
                            x2={points[1][0]}
                            y2={points[1][1]}
                            stroke="#10b981"
                            strokeWidth="2"
                        />

                        {/* Tip chord marker */}
                        <line
                            x1={points[3][0]}
                            y1={points[3][1]}
                            x2={points[2][0]}
                            y2={points[2][1]}
                            stroke="#f59e0b"
                            strokeWidth="2"
                        />
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* WING SECTION */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700 space-y-6">
                    <h3 className="text-xl font-semibold text-blue-400">Wing Planform</h3>

                    {/* User Controls */}
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
                    </div>

                    {/* Calculated Values */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase mb-1">Root Chord</p>
                            <p className="text-lg font-bold text-green-400">{convertLength(wingRootChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase mb-1">Tip Chord</p>
                            <p className="text-lg font-bold text-amber-400">{convertLength(wingTipChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase mb-1">Avg Chord</p>
                            <p className="text-lg font-bold text-blue-400">{convertLength(wingMAC, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                        </div>
                    </div>

                    {/* Visual */}
                    <PlanformSVG
                        rootChord={wingRootChord}
                        tipChord={wingTipChord}
                        span={span}
                        sweep={reqs.wingSweep}
                        title="wing"
                    />
                </div>

                {/* TAILPLANE SECTION */}
                <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700 space-y-6">
                    <h3 className="text-xl font-semibold text-blue-400">Tailplane Planform</h3>

                    {/* User Controls */}
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
                    </div>

                    {/* Calculated Values */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase mb-1">Root Chord</p>
                            <p className="text-lg font-bold text-green-400">{convertLength(tailRootChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase mb-1">Tip Chord</p>
                            <p className="text-lg font-bold text-amber-400">{convertLength(tailTipChord, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase mb-1">Avg Chord</p>
                            <p className="text-lg font-bold text-blue-400">{convertLength(tailMAC, unitSystem).toFixed(2)} <span className="text-xs text-slate-500">{config.lengthShort}</span></p>
                        </div>
                    </div>

                    {/* Visual */}
                    <PlanformSVG
                        rootChord={tailRootChord}
                        tipChord={tailTipChord}
                        span={tailSpan}
                        sweep={reqs.tailSweep}
                        title="tail"
                    />
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
                        <p>Chord dimensions are automatically calculated based on wing/tail area and span from the Sizing Tool. Adjust the taper ratio and sweep angle to refine the planform shape.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
