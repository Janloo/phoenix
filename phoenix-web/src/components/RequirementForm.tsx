import React from 'react';

interface Requirements {
    range: number;
    altitude: number;
    payload: number;
    speed: number;
    airfoil: string;
    engineType: 'piston' | 'jet';
    tailArea: number;   // m^2
    tailDist: number;   // m (Arm from CG)
    tailAirfoil: string;
}

interface Props {
    data: Requirements;
    onChange: (data: Requirements) => void;
}

export const RequirementForm: React.FC<Props> = ({ data, onChange }) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onChange({
            ...data,
            [name]: (name === 'airfoil' || name === 'engineType' || name === 'tailAirfoil') ? value : (parseFloat(value) || 0)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitted Requirements:", data);
        alert(`Design Configuration Saved!`);
    };

    const SectionHeader = ({ title }: { title: string }) => (
        <div className="pb-2 mb-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-blue-400">{title}</h3>
        </div>
    );

    // Custom Number Input with Button Spinners
    const InputField = ({ label, name, value, type = "number", unit, subtext, step = 1, min = 0 }: any) => {

        const handleIncrement = (delta: number) => {
            const currentVal = parseFloat(value) || 0;
            const newVal = Math.max(min, currentVal + delta);
            // Create a synthetic event to reuse existing handler
            const syntheticEvent = {
                target: {
                    name,
                    value: Number.isInteger(step) ? newVal.toString() : newVal.toFixed(2)
                }
            } as any;
            handleChange(syntheticEvent);
        };

        return (
            <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</label>
                <div className="relative flex items-center">
                    {/* Decrement Button */}
                    {type === "number" && (
                        <button
                            type="button"
                            onClick={() => handleIncrement(-step)}
                            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-l-md px-3 py-2 text-slate-300 hover:text-white transition-colors"
                        >
                            -
                        </button>
                    )}

                    <input
                        type={type}
                        name={name}
                        value={value}
                        step={step}
                        min={min}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-700/50 border-y border-slate-600 text-white focus:outline-none focus:ring-0 text-center ${type !== 'number' ? 'rounded-md border-x' : ''}`}
                        style={{ MozAppearance: 'textfield' }} // Hide Firefox spinner
                    />

                    {/* Increment Button */}
                    {type === "number" && (
                        <button
                            type="button"
                            onClick={() => handleIncrement(step)}
                            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-r-md px-3 py-2 text-slate-300 hover:text-white transition-colors"
                        >
                            +
                        </button>
                    )}

                    {unit && <span className="absolute right-12 top-2 text-slate-500 text-sm pointer-events-none">{unit}</span>}
                </div>
                {/* CSS to hide Chrome/Safari/Edge spinners */}
                <style>{`
                    input[type=number]::-webkit-inner-spin-button, 
                    input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                    }
                `}</style>
                {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
            </div>
        );
    };

    const SelectField = ({ label, name, value, options }: any) => (
        <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</label>
            <select
                name={name}
                value={value}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="p-6 max-w-xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white text-center tracking-tight">Configuration Parameters</h2>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* 1. Mission Profile */}
                <section>
                    <SectionHeader title="Mission Profile" />
                    <div className="grid grid-cols-2 gap-6">
                        <InputField
                            label="Max Range (km)"
                            name="range"
                            value={data.range}
                            unit="km"
                            step={50}
                        />
                        <InputField
                            label="Cruise Altitude (m)"
                            name="altitude"
                            value={data.altitude}
                            unit="m"
                            step={100}
                            subtext={`≈ ${(data.altitude * 3.28084).toFixed(0)} ft`}
                        />
                        <InputField
                            label="Payload Mass (kg)"
                            name="payload"
                            value={data.payload}
                            unit="kg"
                            step={10}
                        />
                        <InputField
                            label="Cruise Speed (m/s)"
                            name="speed"
                            value={data.speed}
                            unit="m/s"
                            step={1}
                            subtext={`${(data.speed * 1.94384).toFixed(0)} kts`}
                        />
                    </div>
                </section>

                {/* 2. Propulsion */}
                <section>
                    <SectionHeader title="Propulsion System" />
                    <div className="grid grid-cols-1 gap-6">
                        <SelectField
                            label="Engine Type"
                            name="engineType"
                            value={data.engineType}
                            options={[
                                { value: 'piston', label: 'Reciprocating Piston (Propeller)' },
                                { value: 'jet', label: 'Turbojet Engine' }
                            ]}
                        />
                    </div>
                </section>

                {/* 3. Aerodynamics (Wing & Tail) */}
                <section>
                    <SectionHeader title="Aerodynamics Configuration" />

                    <div className="space-y-4">
                        <SelectField
                            label="Main Wing Airfoil"
                            name="airfoil"
                            value={data.airfoil}
                            options={[
                                { value: 'NACA2412', label: 'NACA 2412 (Cessna 172)' },
                                { value: 'NACA0012', label: 'NACA 0012 (Symmetric)' },
                                { value: 'CLARKY', label: 'Clark Y (General Purpose)' },
                                { value: 'E387', label: 'Eppler 387 (Soaring)' }
                            ]}
                        />

                        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Tailplane Settings</label>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField
                                    label="Distance from CG"
                                    name="tailDist"
                                    value={data.tailDist}
                                    unit="m"
                                    step={0.1}
                                />
                                <InputField
                                    label="Tail Area"
                                    name="tailArea"
                                    value={data.tailArea}
                                    unit="m²"
                                    step={0.1}
                                />
                                <div className="col-span-2">
                                    <SelectField
                                        label="Tail Airfoil"
                                        name="tailAirfoil"
                                        value={data.tailAirfoil}
                                        options={[
                                            { value: 'NACA0012', label: 'NACA 0012 (Symmetric)' },
                                            { value: 'NACA0009', label: 'NACA 0009 (Thin Symmetric)' },
                                            { value: 'FLAT', label: 'Flat Plate' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <button
                    type="submit"
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition duration-200 transform hover:-translate-y-0.5"
                >
                    Apply Configuration
                </button>
            </form>
        </div>
    );
};
export type { Requirements };
