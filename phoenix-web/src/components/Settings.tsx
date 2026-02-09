import React from 'react';
import type { UnitSystem } from '../utils/units';
import { UNIT_CONFIGS } from '../utils/units';

interface Props {
    unitSystem: UnitSystem;
    onUnitSystemChange: (system: UnitSystem) => void;
}

export const Settings: React.FC<Props> = ({ unitSystem, onUnitSystemChange }) => {
    const config = UNIT_CONFIGS[unitSystem];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="prose prose-invert">
                <h2 className="text-3xl font-extrabold text-white">Application Settings</h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Configure your preferences and unit system
                </p>
            </div>

            {/* Unit System Selection */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
                <h3 className="text-xl font-semibold text-blue-400 mb-4">Unit System</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Metric Option */}
                    <button
                        onClick={() => onUnitSystemChange('metric')}
                        className={`p-6 rounded-lg border-2 transition-all ${unitSystem === 'metric'
                                ? 'border-blue-500 bg-blue-500/20'
                                : 'border-slate-600 bg-slate-700/50 hover:border-blue-400'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-white">Metric (SI)</h4>
                            {unitSystem === 'metric' && (
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="text-sm text-slate-300 space-y-1 text-left">
                            <p>• Distance: kilometers (km)</p>
                            <p>• Speed: meters/second (m/s)</p>
                            <p>• Altitude: meters (m)</p>
                            <p>• Mass: kilograms (kg)</p>
                        </div>
                    </button>

                    {/* Imperial Option */}
                    <button
                        onClick={() => onUnitSystemChange('imperial')}
                        className={`p-6 rounded-lg border-2 transition-all ${unitSystem === 'imperial'
                                ? 'border-blue-500 bg-blue-500/20'
                                : 'border-slate-600 bg-slate-700/50 hover:border-blue-400'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-white">Imperial (Aviation)</h4>
                            {unitSystem === 'imperial' && (
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="text-sm text-slate-300 space-y-1 text-left">
                            <p>• Distance: nautical miles (NM)</p>
                            <p>• Speed: knots (kts)</p>
                            <p>• Altitude: feet (ft)</p>
                            <p>• Mass: pounds (lbs)</p>
                        </div>
                    </button>
                </div>

                {/* Current Configuration Display */}
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h5 className="text-sm font-semibold text-slate-400 uppercase mb-3">Active Configuration</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                            <p className="text-slate-500">Distance</p>
                            <p className="text-white font-medium">{config.distanceShort}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Speed</p>
                            <p className="text-white font-medium">{config.speedShort}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Altitude</p>
                            <p className="text-white font-medium">{config.altitudeShort}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Mass</p>
                            <p className="text-white font-medium">{config.massShort}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Area</p>
                            <p className="text-white font-medium">{config.areaShort}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Power</p>
                            <p className="text-white font-medium">{config.powerShort}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Force</p>
                            <p className="text-white font-medium">{config.forceShort}</p>
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
                        <p>Changing the unit system will update all values throughout the application. Your design parameters will remain the same, only the display units will change.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
