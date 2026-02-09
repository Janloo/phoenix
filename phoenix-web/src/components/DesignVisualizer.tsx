import React from 'react';
import type { Requirements } from './RequirementForm';
import { calculateGeometry } from '../utils/sizing';
import type { UnitSystem } from '../utils/units';
import { convertArea, convertForce, convertMass, UNIT_CONFIGS } from '../utils/units';

interface Props {
    reqs: Requirements;
    unitSystem: UnitSystem;
}

export const DesignVisualizer: React.FC<Props> = ({ reqs, unitSystem }) => {
    const config = UNIT_CONFIGS[unitSystem];
    // Use centralized sizing logic
    const { mtow, wingArea, span, chord } = calculateGeometry(reqs);

    // Power / Thrust Estimation
    // Assume L/D ~ 12-14 for GA Cruise
    const liftDragRatio = 14;
    const dragN = (mtow * 9.81) / liftDragRatio;

    let powerInfo = { value: 0, unit: '', label: '' };

    if (reqs.engineType === 'jet') {
        const thrustKN = dragN / 1000;
        // Jet needs slightly more static thrust than cruise drag (approx 1.2-1.5x)
        const thrustValue = convertForce(thrustKN * 1.5, unitSystem);
        powerInfo = {
            value: thrustValue,
            unit: config.forceShort,
            label: 'Min Static Thrust'
        };
    } else {
        // Piston Prop
        // Power = Drag * V / prop_efficiency
        const velocity = reqs.speed || 30;
        const propEff = 0.8;
        const powerWatts = (dragN * velocity) / propEff;
        const powerHP = powerWatts / 745.7;
        powerInfo = {
            value: powerHP,
            unit: 'hp',
            label: 'Min Engine Power'
        };
    }

    // --- Visualization Scaling ---
    // Canvas 300x200
    const pxPerMeter = 15; // Zoom Level
    const canvasRefX = 150;
    const canvasRefY = 100;

    return (
        <div className="space-y-6">
            {/* Real-time Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">MTOW</p>
                    <p className="text-xl font-bold text-white">{convertMass(mtow, unitSystem).toFixed(1)} <span className="text-sm font-normal text-slate-500">{config.massShort}</span></p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Wing Area</p>
                    <p className="text-xl font-bold text-white">{convertArea(wingArea, unitSystem).toFixed(1)} <span className="text-sm font-normal text-slate-500">{config.areaShort}</span></p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Wingspan</p>
                    <p className="text-xl font-bold text-white">{span.toFixed(1)} <span className="text-sm font-normal text-slate-500">m</span></p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center ring-1 ring-blue-500/50">
                    <p className="text-xs text-blue-400 uppercase tracking-widest">{powerInfo.label}</p>
                    <p className="text-xl font-bold text-white">{powerInfo.value.toFixed(1)} <span className="text-sm font-normal text-slate-500">{powerInfo.unit}</span></p>
                </div>
            </div>

            {/* Visual Representation (SVG) */}
            <div className="relative bg-slate-900 rounded-lg border border-slate-700 overflow-hidden h-64 flex items-center justify-center">
                <div className="absolute top-2 left-2 text-xs text-slate-500">Top View</div>

                <svg width="100%" height="100%" viewBox="0 0 300 200" className="opacity-90">
                    {/* Grid Lines */}
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    <g transform={`translate(${canvasRefX}, ${canvasRefY})`}>
                        {/* Fuselage */}
                        {/* Centered at 0,0 for now, but visually shifted to look balanced */}
                        <ellipse
                            cx="0"
                            cy={span * pxPerMeter * 0.15} // Shift fuselage back slightly so nose is ahead of wing
                            rx={span * pxPerMeter * 0.1} // Width
                            ry={span * pxPerMeter * 0.7} // Length
                            fill="#334155"
                            stroke="#94a3b8"
                        />
                        {/* Nose Cone Marker (Green) */}
                        <circle cx="0" cy={-(span * pxPerMeter * 0.7) + (span * pxPerMeter * 0.15)} r="3" fill="#10b981" opacity="0.5" />

                        {/* Wing */}
                        {/* Positioned so Quarter-Chord (Aerodynamic Center) is at (0,0) (The CG location) */}
                        {/* Top Left Y = -0.25 * Chord */}
                        <rect
                            x={-(span * pxPerMeter) / 2}
                            y={-(chord * pxPerMeter) * 0.25}
                            width={span * pxPerMeter}
                            height={chord * pxPerMeter}
                            fill="#3b82f6"
                            fillOpacity="0.8"
                            stroke="#60a5fa"
                            rx="4"
                        />

                        {/* Horizontal Stabilizer (User Configured) */}
                        {/* Drawn at distance tailDist from Wing AC (approx CG) */}
                        {/* Scale: 1 unit = 1 meter */}
                        {(() => {
                            // Tail Geometry
                            // S = b_t * c_t. AR_t ~ 4
                            // b_t = sqrt(S * 4)
                            const tailAR = 4;
                            const tailSpan = Math.sqrt(reqs.tailArea * tailAR);
                            const tailChord = reqs.tailArea / tailSpan;

                            // Position
                            // Origin (0,0) is Wing AC / CG location
                            // So tail leading edge starts around tailDist
                            // Let's center the tail chord at tailDist for simplicity
                            const tailY = (reqs.tailDist * pxPerMeter) - (tailChord * pxPerMeter * 0.25);

                            return (
                                <g>
                                    <rect
                                        x={-(tailSpan * pxPerMeter) / 2}
                                        y={tailY}
                                        width={tailSpan * pxPerMeter}
                                        height={tailChord * pxPerMeter}
                                        fill="#475569"
                                        stroke="#94a3b8"
                                        rx="2"
                                    />
                                    {/* Tail Fuse Connection (Boom) */}
                                    <path
                                        d={`M -${span * pxPerMeter * 0.05} ${chord * pxPerMeter * 0.75} L -${tailSpan * pxPerMeter * 0.08} ${tailY} L ${tailSpan * pxPerMeter * 0.08} ${tailY} L ${span * pxPerMeter * 0.05} ${chord * pxPerMeter * 0.75}`}
                                        fill="#334155"
                                        opacity="0.5"
                                    />
                                    <text x="0" y={tailY + (tailChord * pxPerMeter) + 15} textAnchor="middle" fontSize="10" fill="#64748b">
                                        Tail ({reqs.tailAirfoil})
                                    </text>
                                </g>
                            );
                        })()}

                        {/* CG Symbol */}
                        <g transform="translate(0, 0)">
                            {/* Center of Gravity (at Origin/Wing AC) */}
                            <circle cx="0" cy="0" r="6" fill="None" stroke="#eab308" strokeWidth="2" />
                            <path d="M 0 -6 L 0 6 M -6 0 L 6 0" stroke="#eab308" strokeWidth="2" />
                            <circle cx="2" cy="2" r="2" fill="#eab308" stroke="none" />
                            <circle cx="-2" cy="-2" r="2" fill="#eab308" stroke="none" />
                            <text x="10" y="4" fontSize="10" fill="#eab308" fontWeight="bold">CG</text>
                        </g>

                        {/* Engine Visualization */}
                        {reqs.engineType === 'piston' ? (
                            // Propeller Arc
                            <g>
                                <path
                                    d={`M -${span * pxPerMeter * 0.25} -${span * pxPerMeter * 0.55} Q 0 -${span * pxPerMeter * 0.65} ${span * pxPerMeter * 0.25} -${span * pxPerMeter * 0.55}`}
                                    stroke="#cbd5e1"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeDasharray="4 2"
                                    opacity="0.6"
                                />
                                <circle cx="0" cy={-(span * pxPerMeter * 0.55)} r="3" fill="#cbd5e1" />
                            </g>
                        ) : (
                            // Jet Nacelles (Under Wing)
                            <g>
                                <rect
                                    x={-(span * pxPerMeter * 0.15)}
                                    y={-(chord * pxPerMeter) * 0.25 + (chord * pxPerMeter * 0.5)}
                                    width={span * pxPerMeter * 0.08}
                                    height={span * pxPerMeter * 0.15}
                                    rx="5"
                                    fill="#475569"
                                    stroke="#94a3b8"
                                />
                                <rect
                                    x={(span * pxPerMeter * 0.15) - (span * pxPerMeter * 0.08)}
                                    y={-(chord * pxPerMeter) * 0.25 + (chord * pxPerMeter * 0.5)}
                                    width={span * pxPerMeter * 0.08}
                                    height={span * pxPerMeter * 0.15}
                                    rx="5"
                                    fill="#475569"
                                    stroke="#94a3b8"
                                />
                            </g>
                        )};
                    </g>
                </svg>

            </div>
            <p className="text-center text-xs text-slate-500 italic">
                *Approximation based on statistical heuristics ($C_L=0.5$, $AR=8$)
            </p>
        </div>
    );
};
