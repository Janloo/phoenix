import React from 'react';

interface Requirements {
    range: number;
    altitude: number;
    payload: number;
    speed: number;
    airfoil: string;
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
            [name]: name === 'airfoil' ? value : (parseFloat(value) || 0)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitted Requirements:", data);
        alert(`Requirements:\nRange: ${data.range} km\nAltitude: ${data.altitude} m\nPayload: ${data.payload} kg\nSpeed: ${data.speed} m/s`);
    };

    return (
        <div className="p-8 max-w-md mx-auto bg-slate-800 rounded-xl shadow-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">Design Requirements</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Max Flight Range (km)</label>
                    <input
                        type="number"
                        name="range"
                        value={data.range}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cruise Altitude (m)</label>
                    <input
                        type="number"
                        name="altitude"
                        value={data.altitude}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="mt-2 text-xs text-slate-400">
                        <span>≈ {(data.altitude * 3.28084).toFixed(0)} ft</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Payload (kg)</label>
                    <input
                        type="number"
                        name="payload"
                        value={data.payload}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cruise Speed (m/s)</label>
                    <input
                        type="number"
                        name="speed"
                        value={data.speed}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="mt-2 text-xs text-slate-400 flex space-x-4">
                        <span>≈ {(data.speed * 3.6).toFixed(1)} km/h</span>
                        <span>≈ {(data.speed * 1.94384).toFixed(1)} kts</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Airfoil Selection</label>
                    <select
                        name="airfoil"
                        value={data.airfoil}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="NACA2412">NACA 2412 (Cessna 172)</option>
                        <option value="NACA0012">NACA 0012 (Symmetric)</option>
                        <option value="CLARKY">Clark Y (General Purpose)</option>
                        <option value="E387">Eppler 387 (Soaring)</option>
                    </select>
                </div>

                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-md shadow-md transition duration-200"
                >
                    Initialize Design
                </button>
            </form>
        </div>
    );
};
export type { Requirements };
