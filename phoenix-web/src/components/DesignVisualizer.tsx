import React from 'react';
import type { Requirements } from './RequirementForm';
import { calculateGeometry } from '../utils/sizing';
import type { UnitSystem } from '../utils/units';
import { convertArea, convertForce, convertMass, convertLength, UNIT_CONFIGS } from '../utils/units';

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
    // --- Geometry Calculations ---
    // Wing
    const wingMAC = chord; // approx
    const wingRoot = (2 * wingMAC) / (1 + (reqs.wingTaperRatio || 1));
    const wingTip = wingRoot * (reqs.wingTaperRatio || 1);
    const wingSweepRad = (reqs.wingSweep || 0) * Math.PI / 180;

    // Tail
    const tailAR = 4;
    const tailSpan = Math.sqrt(reqs.tailArea * tailAR);
    const tailChord = reqs.tailArea / tailSpan;
    const tailDist = reqs.tailDist;

    const tailRoot = (2 * tailChord) / (1 + (reqs.tailTaperRatio || 0.7)); // Default if missing
    const tailTip = tailRoot * (reqs.tailTaperRatio || 0.7);
    const tailSweepRad = (reqs.tailSweep || 0) * Math.PI / 180;

    // Fuselage
    const noseLength = wingRoot * 0.8;
    const fuseWidth = wingRoot * 0.6; // Heuristic

    // --- Visualization Scaling (Dynamic) ---
    // Calculate bounding box in geometric meters (Origins at Wing LE/AC)
    const elementsY = [
        -noseLength, // Nose (Most Fwd / Up)
        tailDist + tailRoot, // Tail Trailing Edge (Most Aft / Down)
        (Math.tan(wingSweepRad) * (span / 2)) + wingTip, // Swept wing tip TE
    ];

    const elementsX = [
        -span / 2, // Left Wing Tip
        span / 2,  // Right Wing Tip
        -tailSpan / 2, // Left Tail Tip
        tailSpan / 2   // Right Tail Tip
    ];

    // Find extremes
    const minY = Math.min(...elementsY);
    const maxY = Math.max(...elementsY);
    const minX = Math.min(...elementsX);
    const maxX = Math.max(...elementsX);

    // Bounding Box sizes (add 10% padding)
    const totalLengthY = (maxY - minY) * 1.2;
    const totalWidthX = (maxX - minX) * 1.2;

    const safeLengthY = totalLengthY > 0 ? totalLengthY : 10;
    const safeWidthX = totalWidthX > 0 ? totalWidthX : 10;

    // Canvas dimensions
    const canvasWidth = 800;
    const canvasHeight = 400;

    // Determine limiting axis for pxPerMeter
    const scaleX = canvasWidth / safeWidthX;
    const scaleY = canvasHeight / safeLengthY;
    const pxPerMeter = Math.min(scaleX, scaleY);

    // Center translation so bounding boxes fit perfectly
    // Find geometric center, map to canvas center
    const geoCenterY = (minY + maxY) / 2;
    const geoCenterX = (minX + maxX) / 2; // Should be 0 for a symmetric aircraft

    // We want geoCenter * pxPerMeter to map to canvasWidth/2, canvasHeight/2
    const canvasRefX = (canvasWidth / 2) - (geoCenterX * pxPerMeter);
    const canvasRefY = (canvasHeight / 2) - (geoCenterY * pxPerMeter);

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
                    <p className="text-xl font-bold text-white">{convertLength(span, unitSystem).toFixed(1)} <span className="text-sm font-normal text-slate-500">{config.lengthShort}</span></p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center ring-1 ring-blue-500/50">
                    <p className="text-xs text-blue-400 uppercase tracking-widest">{powerInfo.label}</p>
                    <p className="text-xl font-bold text-white">{powerInfo.value.toFixed(1)} <span className="text-sm font-normal text-slate-500">{powerInfo.unit}</span></p>
                </div>
            </div>

            <div className="flex flex-col items-center p-4 bg-slate-800 rounded-lg border border-slate-700 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-300">Aircraft Visualization</h3>
                <div className="relative w-full max-w-2xl aspect-video bg-slate-900 rounded-md border border-slate-700 overflow-hidden">
                    <svg
                        width={canvasWidth}
                        height={canvasHeight}
                        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                        className="absolute top-0 left-0 w-full h-full"
                    >
                        <defs>
                            <pattern id="viz-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#viz-grid)" />
                        <g transform={`translate(${canvasRefX}, ${canvasRefY})`}>
                            {/* Fuselage */}
                            {/* Centered logic: Nose is at -noseLength, Tail end at +tailDist + tail... */}
                            <path
                                d={`
                                            M 0 ${-noseLength * pxPerMeter}
                                            Q ${fuseWidth / 2 * pxPerMeter} ${-noseLength * 0.5 * pxPerMeter} ${fuseWidth / 2 * pxPerMeter} 0
                                            L ${fuseWidth / 3 * pxPerMeter} ${(tailDist) * pxPerMeter}
                                            L ${-fuseWidth / 3 * pxPerMeter} ${(tailDist) * pxPerMeter}
                                            L ${-fuseWidth / 2 * pxPerMeter} 0
                                            Q ${-fuseWidth / 2 * pxPerMeter} ${-noseLength * 0.5 * pxPerMeter} 0 ${-noseLength * pxPerMeter}
                                        `}
                                fill="#334155"
                                stroke="#94a3b8"
                                strokeWidth="1"
                            />
                            <ellipse
                                cx="0"
                                cy={0} // Centered at wing
                                rx={fuseWidth / 2 * pxPerMeter}
                                ry={noseLength * 0.8 * pxPerMeter} // Just a main body mock
                                fill="#334155"
                                opacity="0.5"
                            />


                            {/* Wing (Polygon) */}
                            {/* Points: p1(TipL), p2(RootL), p3(RootR), p4(TipR) */}
                            {/* Left Tip computed: x = -span/2, y_le = sweepOffset */}
                            {(() => {
                                const wScale = pxPerMeter;
                                // Left Side (x < 0)

                                // Wait, standard sweep is usually LE.
                                // Let's assume Quarter Chord Sweep is what matters, but for drawing let's stick to LE sweep if simple.
                                // Actually simplest is: Root LE is at -wingRoot/4 (AC assumed at 0.25c)
                                const yLeRoot = -(wingRoot * 0.25) * wScale;

                                // Tip LE is shifted back by tan(sweep)*span/2
                                const yLeTip = yLeRoot + (Math.tan(wingSweepRad) * (span / 2) * wScale);

                                // Points
                                const pRootLE = [0, yLeRoot];
                                const pRootTE = [0, yLeRoot + wingRoot * wScale];
                                const pTipL_LE = [-span / 2 * wScale, yLeTip];
                                const pTipL_TE = [-span / 2 * wScale, yLeTip + wingTip * wScale];
                                const pTipR_LE = [span / 2 * wScale, yLeTip];
                                const pTipR_TE = [span / 2 * wScale, yLeTip + wingTip * wScale];

                                const polyPoints = [
                                    pTipL_LE, pTipL_TE, pRootTE, pTipR_TE, pTipR_LE, pRootLE
                                ].map(p => p.join(',')).join(' ');

                                return (
                                    <polygon
                                        points={polyPoints}
                                        fill="#3b82f6"
                                        fillOpacity="0.8"
                                        stroke="#60a5fa"
                                    />
                                );
                            })()}

                            {/* Horizontal Stabilizer */}
                            {(() => {
                                const tScale = pxPerMeter;
                                // Tail AC usually at tailDist.
                                // Let's approximate Tail LE
                                const tRoot = tailRoot;
                                const tTip = tailTip;
                                const tSpan = tailSpan;
                                // Local coordinates relative to tailDist
                                const yBase = tailDist * tScale;
                                const yLeRoot = yBase - (tRoot * 0.25 * tScale);
                                const yLeTip = yLeRoot + (Math.tan(tailSweepRad) * (tSpan / 2) * tScale);

                                const pRootLE = [0, yLeRoot];
                                const pRootTE = [0, yLeRoot + tRoot * tScale];
                                const pTipL_LE = [-tSpan / 2 * tScale, yLeTip];
                                const pTipL_TE = [-tSpan / 2 * tScale, yLeTip + tTip * tScale];
                                const pTipR_LE = [tSpan / 2 * tScale, yLeTip];
                                const pTipR_TE = [tSpan / 2 * tScale, yLeTip + tTip * tScale];

                                const tailPoints = [
                                    pTipL_LE, pTipL_TE, pRootTE, pTipR_TE, pTipR_LE, pRootLE
                                ].map(p => p.join(',')).join(' ');

                                return (
                                    <g>
                                        <polygon
                                            points={tailPoints}
                                            fill="#475569"
                                            stroke="#94a3b8"
                                        />
                                        <text x="0" y={yBase + (tRoot * tScale) + 15} textAnchor="middle" fontSize="10" fill="#64748b">
                                            Tail ({reqs.tailAirfoil})
                                        </text>
                                    </g>
                                );
                            })()}

                            {/* Nose Cone Marker (Green) */}
                            <circle cx="0" cy={-(span * pxPerMeter * 0.4)} r="3" fill="#10b981" opacity="0.5" />

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
                                        d={`M -${span * pxPerMeter * 0.25} -${span * pxPerMeter * 0.45} Q 0 -${span * pxPerMeter * 0.55} ${span * pxPerMeter * 0.25} -${span * pxPerMeter * 0.45}`}
                                        stroke="#cbd5e1"
                                        strokeWidth="2"
                                        fill="none"
                                        strokeDasharray="4 2"
                                        opacity="0.6"
                                    />
                                    <circle cx="0" cy={-(span * pxPerMeter * 0.45)} r="3" fill="#cbd5e1" />
                                </g>
                            ) : (
                                // Jet Nacelles
                                <g>
                                    {/* Simple Nacelles */}
                                </g>
                            )}
                        </g>
                    </svg>

                </div>
                <p className="text-center text-xs text-slate-500 italic mt-2">
                    *Approximation based on statistical heuristics ($C_L=0.5$, $AR=8$)
                </p>
            </div>
        </div>
    );
};
