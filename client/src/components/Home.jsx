import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const Home = ({ user, farmData, recommendation, setActiveTab }) => {
    const { t } = useTranslation();
    const [currentTip, setCurrentTip] = useState(0);

    const checkStatus = () => {
        if (!recommendation) return { status: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100', icon: '❓' };
        if (recommendation.disease_detected && recommendation.disease_detected !== "None") {
            return { status: 'Attention Required', color: 'text-red-600', bg: 'bg-red-50', icon: '⚠️' };
        }
        return { status: 'Healthy', color: 'text-green-600', bg: 'bg-green-50', icon: '✅' };
    };

    const statusInfo = checkStatus();

    // Static Weather Data (Mock)
    const weather = { temp: 28, condition: 'Partly Cloudy', humidity: 65, wind: '12 km/h' };

    const tips = [
        "Rotate crops every season to maintain soil health.",
        "Water early in the morning to reduce evaporation.",
        "Regularly check for pests to prevent outbreaks.",
        "Test soil nutrients before applying fertilizers.",
        "Keep field boundaries clean to reduce disease vectors."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTip((prev) => (prev + 1) % tips.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header Greeting */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">
                        {t('welcome_title', { name: user?.full_name || user?.username })}
                    </h1>
                    <p className="text-blue-50 mt-1 drop-shadow-sm font-medium">Here is what's happening on your farm today.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-lg font-semibold text-gray-700">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Farm Overview Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-2 text-blue-600 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                            <h3 className="font-bold text-sm uppercase tracking-wide">Farm Overview</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Location</span>
                                <span className="font-semibold text-gray-800">{farmData?.location || 'Not Set'}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Field Size</span>
                                <span className="font-semibold text-gray-800">{farmData?.field_size || 0} Acres</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Current Crop</span>
                                <span className="font-semibold text-gray-800">{farmData?.current_crop || 'None'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Overall Health Status */}
                <div className={`rounded-2xl shadow-sm border p-6 flex flex-col justify-between ${statusInfo.bg} ${statusInfo.color === 'text-red-600' ? 'border-red-200' : 'border-green-200'}`}>
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`font-bold text-sm uppercase tracking-wide ${statusInfo.color}`}>Farm Health</h3>
                            <span className="text-2xl">{statusInfo.icon}</span>
                        </div>
                        <div className="text-center py-4">
                            <h2 className={`text-3xl font-extrabold ${statusInfo.color} mb-2`}>{statusInfo.status}</h2>
                            {statusInfo.status === 'Attention Required' && (
                                <p className="text-sm text-red-700 opacity-80">
                                    Issue detected: {recommendation?.disease_type || 'Potential Risk'}
                                </p>
                            )}
                            {statusInfo.status === 'Healthy' && (
                                <p className="text-sm text-green-700 opacity-80">No immediate threats detected.</p>
                            )}
                        </div>
                    </div>
                    {statusInfo.status === 'Attention Required' ? (
                        <button
                            onClick={() => setActiveTab('Action Plan & Treatments')}
                            className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                        >
                            View Action Plan
                        </button>
                    ) : (
                        <div className="text-center text-xs opacity-60">Last Analysis: {new Date().toLocaleDateString()}</div>
                    )}
                </div>

                {/* 3. Weather Snapshot (Mock) */}
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-md text-white p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full blur-xl -mr-4 -mt-4"></div>
                    <div className="flex items-center space-x-2 mb-4 opacity-90">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                        <h3 className="font-bold text-sm uppercase tracking-wide">Weather Today</h3>
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="text-5xl font-bold">{weather.temp}°</div>
                        <div className="text-right">
                            <div className="text-lg font-medium">{weather.condition}</div>
                            <div className="text-sm opacity-80">H: {weather.humidity}%  W: {weather.wind}</div>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20 text-xs flex justify-between">
                        <span>Likelihood of Rain: Low</span>
                        <span>Next 24h: Clear</span>
                    </div>
                </div>
            </div>

            {/* Quick Navigation grid */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setActiveTab('Dashboard')}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col items-center justify-center text-center group"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </div>
                        <span className="font-semibold text-gray-700">Full Dashboard</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('Disease Analysis')}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col items-center justify-center text-center group"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-3 group-hover:bg-purple-600 group-hover:text-white transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <span className="font-semibold text-gray-700">Scan Crop</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('IoT Sensors')}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col items-center justify-center text-center group"
                    >
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-3 group-hover:bg-orange-600 group-hover:text-white transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                        </div>
                        <span className="font-semibold text-gray-700">Check Sensors</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('Crop Advisory & Soil Guide')}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col items-center justify-center text-center group"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-3 group-hover:bg-green-600 group-hover:text-white transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <span className="font-semibold text-gray-700">Crop Advisory</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;
