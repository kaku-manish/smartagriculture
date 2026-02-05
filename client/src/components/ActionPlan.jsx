import React from 'react';
import { useTranslation } from 'react-i18next';

const ActionPlan = ({ recommendation, setActiveTab, resetAnalysis }) => {
    const { t } = useTranslation();

    if (!recommendation || !recommendation.disease_detected || recommendation.disease_detected === 'None') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <div className="bg-green-100 p-6 rounded-full mb-6 animate-pulse">
                    <span className="text-6xl">🌿</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('no_analysis_data', 'No Analysis Data Available')}</h2>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                    {t('perform_analysis_prompt', 'Please go to Disease Analysis to upload an image or start the live camera to get actionable insights.')}
                </p>
                <div className="space-x-4">
                    <button
                        onClick={() => setActiveTab('Disease Analysis')}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all font-semibold"
                    >
                        Start Analysis
                    </button>
                    <button
                        onClick={() => setActiveTab('Dashboard')}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-semibold"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Helper to format image URL
    const getImageUrl = (path) => {
        if (!path) return null;
        // If it's already a full URL, return it
        if (path.startsWith('http')) return path;
        // Fix backslashes for URL
        const cleanPath = path.replace(/\\/g, '/');
        // If it starts with 'server/uploads', strip 'server' part
        // Assuming server is serving 'uploads' static folder at root
        // Actually, typically standard setup: app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
        // So we just need the filename usually, or path relative to upload dir.
        // If full path is saved: "c:/.../server/uploads/file.jpg"
        // We need to extract just "uploads/file.jpg" or "file.jpg" depending on static serving.
        // Let's assume standard behavior: we need "http://localhost:3000/uploads/<filename>"

        const filename = cleanPath.split('/').pop();
        return `http://localhost:3000/uploads/${filename}`;
    };

    const imageUrl = getImageUrl(recommendation.annotated_image_reference || recommendation.image_reference);
    const confidencePercent = recommendation.confidence ? Math.round(recommendation.confidence * 100) : 0;
    const diseaseName = recommendation.disease_detected.replace(/_/g, ' ');

    return (
        <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="glass-panel p-4 flex justify-between items-center rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-white/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Action & Planning</h2>
                </div>
                <button
                    onClick={resetAnalysis}
                    className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors flex items-center space-x-1"
                >
                    <span>Finish & Clear</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Analyzed Image */}
                <div className="lg:col-span-4 flex flex-col">
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-3 shadow-lg border border-white h-full flex flex-col">
                        <div className="relative w-full h-64 lg:h-full rounded-2xl overflow-hidden bg-gray-100 group">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="Analyzed Crop"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-300 bg-gray-50/50">
                                    {/* Empty State - No Icon */}
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                <span className="text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md bg-white/20 px-2 py-1 rounded-md">
                                    Analyzed Image
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="lg:col-span-8 flex flex-col space-y-6">

                    {/* Identified Disease Card */}
                    <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl p-6 shadow-md border border-white/60">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Identified Disease</h3>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-2xl shadow-sm">
                                    🔥
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-gray-800 leading-none mb-1">{diseaseName || 'Unknown'}</h1>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-bold text-gray-500">Severity:</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${recommendation.severity === 'High' ? 'bg-red-100 text-red-600' :
                                            recommendation.severity === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {recommendation.severity || 'Moderate'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Confidence Badge */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4 min-w-[200px]">
                                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">AI Confidence</p>
                                    <p className="text-2xl font-black text-gray-800">{confidencePercent}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Treatment Protocol */}
                    <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-md border border-white/60">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Treatment Protocol</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-gray-200">

                            {/* Primary Medicine */}
                            <div className="pr-0 md:pr-6 pb-4 md:pb-0">
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                                        🧪
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-800">{recommendation.medicine_suggestion || 'Consult Expert'}</h4>
                                        <p className="text-sm text-gray-500 mt-1">Recommended</p>
                                        <div className="mt-3 bg-gray-50 rounded-lg p-2 px-3 inline-block">
                                            <span className="text-xs text-gray-400 font-bold uppercase mr-2">Dosage:</span>
                                            <span className="text-sm font-bold text-gray-700">{recommendation.dosage || 'See Label'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alternative */}
                            <div className="pl-0 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                                <div className="flex items-center space-x-3 mb-2">
                                    <span className="text-red-400">⚡</span>
                                    <span className="text-sm font-semibold text-gray-800">Alternative Option</span>
                                </div>
                                <div className="ml-0">
                                    <p className="text-lg font-medium text-gray-600">
                                        {recommendation.medicine_secondary || 'Propiconazole (Generic)'}
                                    </p>
                                    <div className="flex items-center text-xs text-gray-400 mt-1">
                                        <span>OR</span>
                                        <span className="mx-1 w-8 h-px bg-gray-200"></span>
                                        <span>Consult Shop</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Timeline & Prevention Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Timeline */}
                        <div className="bg-white/80 rounded-3xl p-6 shadow-sm border border-white relative overflow-hidden">
                            <h3 className="flex items-center text-gray-700 font-bold mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Action Timeline
                            </h3>
                            <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 leading-relaxed font-medium">
                                <ul className="list-decimal list-inside space-y-2">
                                    {recommendation.timeline ?
                                        recommendation.timeline.split('. ').map((step, idx) => (
                                            step && <li key={idx}>{step.trim()}</li>
                                        )) :
                                        <>
                                            <li>Mix {recommendation.dosage} in 1L of water</li>
                                            <li>Spray early morning or late afternoon</li>
                                            <li>Repeat every 10-15 days if needed</li>
                                        </>
                                    }
                                </ul>
                            </div>
                        </div>

                        {/* Prevention */}
                        <div className="bg-white/80 rounded-3xl p-6 shadow-sm border border-white">
                            <h3 className="flex items-center text-gray-700 font-bold mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Preventive Measures
                            </h3>
                            <div className="bg-blue-50/50 rounded-2xl p-4 text-sm text-gray-600 font-medium">
                                <ul className="list-disc list-inside space-y-2">
                                    {recommendation.preventive_measures ?
                                        recommendation.preventive_measures.split('.').map((step, idx) => (
                                            step && step.length > 2 && <li key={idx}>{step.trim()}</li>
                                        )) :
                                        <li>Maintain clean field boundaries</li>
                                    }
                                </ul>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};

export default ActionPlan;
