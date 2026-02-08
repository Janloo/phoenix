import React, { useState } from 'react';

interface Requirements {
    range: number;
    payload: number;
    speed: number;
    airfoil: string;
}

export const RequirementForm: React.FC = () => {
    const [reqs, setReqs] = useState<Requirements>({
        range: 1000,
        payload: 400,
        speed: 60,
        airfoil: 'NACA2412',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setReqs(prev => ({
            ...prev,
            [name]: name === 'airfoil' ? value : (parseFloat(value) || 0)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitted Requirements:", reqs);
        alert(`Design Requirements Set:\nRange: ${reqs.range} km\nPayload: ${reqs.payload} kg\nSpeed: ${reqs.speed} m/s\nAirfoil: ${reqs.airfoil}`);
    };

    return (
        <div className="p-8 max-w-md mx-auto bg-slate-800 rounded-xl shadow-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">Design Requirements</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Range (km)</label>
                    <input
                        type="number"
                        name="range"
                        value={reqs.range}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Payload (kg)</label>
                    <input
                        type="number"
                        name="payload"
                        value={reqs.payload}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cruise Speed (m/s)</label>
                    <input
                        type="number"
                        name="speed"
                        value={reqs.speed}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="mt-2 text-xs text-slate-400 flex space-x-4">
                        <span>≈ {(reqs.speed * 3.6).toFixed(1)} km/h</span>
                        <span>≈ {(reqs.speed * 1.94384).toFixed(1)} kts</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Airfoil Selection</label>
                    <select
                        name="airfoil"
                        value={reqs.airfoil}
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
