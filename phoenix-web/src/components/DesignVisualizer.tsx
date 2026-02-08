import React from 'react';
import type { Requirements } from './RequirementForm';

interface Props {
    reqs: Requirements;
}

export const DesignVisualizer: React.FC<Props> = ({ reqs }) => {
    // 1. Heuristic Sizing (Very simplified for demo)
    // MTOW approx linear to payload + range fuel
    // C172: Payload ~400kg, MTOW ~1100kg -> factor ~2.75
    const mtow = reqs.payload * 2.8 + (reqs.range * 0.1);

    // Wing Area: Lift = Weight -> S = W / (0.5 * rho * V^2 * CL)
    // Assume Cruise Condition: CL ~0.5
    const liftCoeff = 0.5;

    // Simple ISA Atmosphere Model: rho = 1.225 * (1 - 2.256e-5 * h)^4.256
    const h = reqs.altitude || 0;
    const tempRatio = 1 - 2.25577e-5 * h;
    const airDensity = 1.225 * Math.pow(Math.max(0, tempRatio), 4.25588);

    const velocity = reqs.speed || 30; // avoid div/0
    const wingArea = (mtow * 9.81) / (0.5 * airDensity * Math.pow(velocity, 2) * liftCoeff);

    // Geometry: Aspect Ratio = 8 (Typical GA)
    // S = b^2 / AR -> b = sqrt(S * AR)
    const aspectRatio = 8;
    const span = Math.sqrt(wingArea * aspectRatio);
    const chord = wingArea / span;

    // --- Visualization Scaling ---
    // Canvas 300x200
    const pxPerMeter = 15; // Zoom Level
    const canvasRefX = 150;
    const canvasRefY = 100;

    return (
        <div className="space-y-6">
            {/* Real-time Metrics */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Est. MTOW</p>
                    <p className="text-xl font-bold text-white">{mtow.toFixed(0)} <span className="text-sm font-normal text-slate-500">kg</span></p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Wing Area</p>
                    <p className="text-xl font-bold text-white">{wingArea.toFixed(1)} <span className="text-sm font-normal text-slate-500">m²</span></p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Wingspan</p>
                    <p className="text-xl font-bold text-white">{span.toFixed(1)} <span className="text-sm font-normal text-slate-500">m</span></p>
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
                        <ellipse
                            cx="0"
                            cy="0"
                            rx={span * pxPerMeter * 0.1} // Fuselage width proportional to span
                            ry={span * pxPerMeter * 0.7} // Fuselage length
                            fill="#334155"
                            stroke="#94a3b8"
                        />

                        {/* Wing (Rectangular for simple visualization) */}
                        <rect
                            x={-(span * pxPerMeter) / 2}
                            y={-(chord * pxPerMeter) / 2 - (span * pxPerMeter * 0.2)} // Offset wing forward
                            width={span * pxPerMeter}
                            height={chord * pxPerMeter}
                            fill="#3b82f6"
                            fillOpacity="0.8"
                            stroke="#60a5fa"
                            rx="4"
                        />

                        {/* Horizontal Stabilizer */}
                        <rect
                            x={-(span * 0.4 * pxPerMeter) / 2}
                            y={(span * 0.5 * pxPerMeter)}
                            width={span * 0.4 * pxPerMeter}
                            height={chord * 0.8 * pxPerMeter}
                            fill="#334155"
                            stroke="#94a3b8"
                            rx="2"
                        />
                    </g>
                </svg>

            </div>
            <p className="text-center text-xs text-slate-500 italic">
                *Approximation based on statistical heuristics ($C_L=0.5$, $AR=8$)
            </p>
        </div>
    );
};
