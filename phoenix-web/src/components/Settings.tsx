import React from 'react';

export const Settings: React.FC = () => {
    return (
        <div className="p-8 bg-slate-800 rounded-xl shadow-lg border border-slate-700 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">Settings</h2>
            <p className="text-slate-400">
                Application preferences and unit configuration will appear here.
            </p>
        </div>
    );
};
