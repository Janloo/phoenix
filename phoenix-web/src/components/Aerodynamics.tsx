import React from 'react';
import type { Requirements } from './RequirementForm';
import { getAirfoilPolar } from '../data/airfoilPolars';
import { calculateGeometry } from '../utils/sizing';

interface Props {
    reqs: Requirements;
}

export const Aerodynamics: React.FC<Props> = ({ reqs }) => {
    // Get polar data for selected airfoil
    const polar = getAirfoilPolar(reqs.airfoil);

    // Calculate aircraft geometry
    const { mtow, wingArea } = calculateGeometry(reqs);

    // Find CLmax and corresponding data
    const clMax = Math.max(...polar.data.map(p => p.cl));
    const stallPoint = polar.data.find(p => p.cl === clMax);
    const alphaStall = stallPoint?.alpha || 14;

    // Calculate stall speed
    // Vstall = sqrt((2 * W) / (rho * S * CLmax))
    const h = reqs.altitude || 0;
    const tempRatio = 1 - 2.25577e-5 * h;
    const rho = 1.225 * Math.pow(Math.max(0, tempRatio), 4.25588);
    const weight = mtow * 9.81;
    const vstall = Math.sqrt((2 * weight) / (rho * wingArea * clMax));

    // Find best L/D
    const ldRatios = polar.data.map(p => ({ alpha: p.alpha, ld: p.cl / p.cd, cl: p.cl, cd: p.cd }));
    const bestLD = ldRatios.reduce((max, curr) => curr.ld > max.ld ? curr : max, ldRatios[0]);

    // SVG Chart dimensions
    const chartWidth = 500;
    const chartHeight = 300;
    const padding = 50;

    // Cl vs Alpha Chart
    const alphaMin = Math.min(...polar.data.map(p => p.alpha));
    const alphaMax = Math.max(...polar.data.map(p => p.alpha));
    const clMin = Math.min(...polar.data.map(p => p.cl));
    const clMaxChart = Math.max(...polar.data.map(p => p.cl));

    const scaleX = (alpha: number) => {
        return padding + ((alpha - alphaMin) / (alphaMax - alphaMin)) * (chartWidth - 2 * padding);
    };

    const scaleY = (cl: number) => {
        return chartHeight - padding - ((cl - clMin) / (clMaxChart - clMin)) * (chartHeight - 2 * padding);
    };

    const pathData = polar.data.map((p, i) => {
        const x = scaleX(p.alpha);
        const y = scaleY(p.cl);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Drag Polar (Cd vs Cl)
    const cdMin = Math.min(...polar.data.map(p => p.cd));
    const cdMax = Math.max(...polar.data.map(p => p.cd));

    const scaleXDrag = (cd: number) => {
        return padding + ((cd - cdMin) / (cdMax - cdMin)) * (chartWidth - 2 * padding);
    };

    const scaleYDrag = (cl: number) => {
        return chartHeight - padding - ((cl - clMin) / (clMaxChart - clMin)) * (chartHeight - 2 * padding);
    };

    const dragPolarPath = polar.data.map((p, i) => {
        const x = scaleXDrag(p.cd);
        const y = scaleYDrag(p.cl);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
        <div className="space-y-8">
            <div className="prose prose-invert">
                <h2 className="text-3xl font-extrabold text-white">Aerodynamic Analysis</h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Polar curves and performance metrics for {polar.name}
                </p>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Stall Speed</p>
                    <p className="text-xl font-bold text-red-400">{vstall.toFixed(1)} <span className="text-sm font-normal text-slate-500">m/s</span></p>
                    <p className="text-xs text-slate-500 mt-1">{(vstall * 1.94384).toFixed(0)} kts</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Max C<sub>L</sub></p>
                    <p className="text-xl font-bold text-blue-400">{clMax.toFixed(2)} <span className="text-sm font-normal text-slate-500">@ {alphaStall}°</span></p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Best L/D</p>
                    <p className="text-xl font-bold text-green-400">{bestLD.ld.toFixed(1)} <span className="text-sm font-normal text-slate-500">@ {bestLD.alpha}°</span></p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cl vs Alpha Chart */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-blue-400 mb-4">Lift Curve</h3>
                    <svg width={chartWidth} height={chartHeight} className="bg-slate-900 rounded">
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                            const y = chartHeight - padding - frac * (chartHeight - 2 * padding);
                            return (
                                <line key={`hgrid-${frac}`} x1={padding} y1={y} x2={chartWidth - padding} y2={y}
                                    stroke="#1e293b" strokeWidth="1" />
                            );
                        })}

                        {/* Axes */}
                        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding}
                            stroke="#64748b" strokeWidth="2" />
                        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding}
                            stroke="#64748b" strokeWidth="2" />

                        {/* Data line */}
                        <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2.5" />

                        {/* Data points */}
                        {polar.data.map((p, i) => (
                            <circle key={i} cx={scaleX(p.alpha)} cy={scaleY(p.cl)} r="3" fill="#60a5fa" />
                        ))}

                        {/* Stall marker */}
                        {stallPoint && (
                            <circle cx={scaleX(stallPoint.alpha)} cy={scaleY(stallPoint.cl)} r="6"
                                fill="none" stroke="#ef4444" strokeWidth="2" />
                        )}

                        {/* Labels */}
                        <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="#94a3b8">
                            α (degrees)
                        </text>
                        <text x={15} y={chartHeight / 2} textAnchor="middle" fontSize="12" fill="#94a3b8"
                            transform={`rotate(-90, 15, ${chartHeight / 2})`}>
                            C<tspan fontSize="9" baselineShift="sub">L</tspan>
                        </text>
                    </svg>
                </div>

                {/* Drag Polar Chart */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-green-400 mb-4">Drag Polar</h3>
                    <svg width={chartWidth} height={chartHeight} className="bg-slate-900 rounded">
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                            const y = chartHeight - padding - frac * (chartHeight - 2 * padding);
                            return (
                                <line key={`hgrid-${frac}`} x1={padding} y1={y} x2={chartWidth - padding} y2={y}
                                    stroke="#1e293b" strokeWidth="1" />
                            );
                        })}

                        {/* Axes */}
                        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding}
                            stroke="#64748b" strokeWidth="2" />
                        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding}
                            stroke="#64748b" strokeWidth="2" />

                        {/* Data line */}
                        <path d={dragPolarPath} fill="none" stroke="#10b981" strokeWidth="2.5" />

                        {/* Data points */}
                        {polar.data.map((p, i) => (
                            <circle key={i} cx={scaleXDrag(p.cd)} cy={scaleYDrag(p.cl)} r="3" fill="#34d399" />
                        ))}

                        {/* Best L/D marker */}
                        {bestLD && polar.data.find(p => p.alpha === bestLD.alpha) && (
                            <circle
                                cx={scaleXDrag(bestLD.cd)}
                                cy={scaleYDrag(bestLD.cl)}
                                r="6"
                                fill="none"
                                stroke="#fbbf24"
                                strokeWidth="2"
                            />
                        )}

                        {/* Labels */}
                        <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="#94a3b8">
                            C<tspan fontSize="9" baselineShift="sub">D</tspan>
                        </text>
                        <text x={15} y={chartHeight / 2} textAnchor="middle" fontSize="12" fill="#94a3b8"
                            transform={`rotate(-90, 15, ${chartHeight / 2})`}>
                            C<tspan fontSize="9" baselineShift="sub">L</tspan>
                        </text>
                    </svg>
                </div>
            </div>

            <p className="text-center text-xs text-slate-500 italic">
                *Polar data based on Re ≈ {(polar.re / 1e6).toFixed(1)}M. Actual performance may vary with Reynolds number and surface condition.
            </p>
        </div>
    );
};
