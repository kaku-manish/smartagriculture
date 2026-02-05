import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const FarmersDashboard = () => {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [costData, setCostData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;

            const res = await axios.get(`http://localhost:3000/farm/user/${user.id}/status`);
            setData(res.data);

            if (res.data.farm?.farm_id) {
                const costRes = await axios.get(`http://localhost:3000/cost/estimate/${res.data.farm.farm_id}`);
                setCostData(costRes.data);
            }

            setLoading(false);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const cleanPath = path.replace(/\\/g, '/');
        const filename = cleanPath.split('/').pop();
        return `http://localhost:3000/uploads/${filename}`;
    };

    const latest_iot = data?.latest_iot || null;
    const latest_drone = data?.latest_drone || null;
    const recommendation = data?.recommendation || null;
    const farm = data?.farm || { field_size: 1 };

    return (
        <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. IoT Sensors */}
                <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-6 shadow-xl shadow-blue-500/5 relative overflow-hidden border border-white/50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-bl-full -mr-8 -mt-8 opacity-50 blur-xl"></div>
                    <h3 className="text-lg font-bold text-gray-700 flex items-center mb-6">
                        <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mr-3 text-sm">📡</span>
                        {t('iot_sensors')}
                    </h3>
                    <div className="space-y-4">
                        <SensorRow label={t('soil_moisture')} value={latest_iot ? `${latest_iot.soil_moisture}%` : '0%'} icon="💧" color="text-orange-500" />
                        <SensorRow label={t('water_level')} value={latest_iot ? `${latest_iot.water_level} cm` : '0 cm'} icon="🌊" color="text-blue-500" />
                        <SensorRow label={t('temperature')} value={latest_iot ? `${latest_iot.temperature}°C` : '0°C'} icon="🌡️" color="text-red-500" />
                        <SensorRow label={t('humidity')} value={latest_iot ? `${latest_iot.humidity}%` : '0%'} icon="💨" color="text-teal-500" />
                    </div>
                </div>

                {/* 2. Disease Analysis */}
                <div className="bg-gradient-to-br from-pink-50 to-white rounded-[2rem] p-6 shadow-xl shadow-pink-500/5 border border-white/50 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-pink-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                    <h3 className="text-lg font-bold text-gray-700 flex items-center mb-6 relative z-10">
                        <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3 text-sm">🔬</span>
                        Disease Analysis
                    </h3>

                    {latest_drone ? (
                        <div className="relative z-10 flex flex-col flex-1">
                            <div className="flex gap-4 mb-4 flex-col lg:flex-row">
                                {/* Dashboard Image Preview */}
                                <div className="w-full lg:w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-white shrink-0">
                                    <img
                                        src={getImageUrl(latest_drone.annotated_image_reference || latest_drone.image_reference)}
                                        className="w-full h-full object-cover"
                                        alt="Analyzed Crop"
                                    />
                                </div>

                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">IDENTIFIED DISEASE</p>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="text-xl text-red-500">🛡️</span>
                                        <h2 className="text-xl font-black text-gray-800 break-words">
                                            {latest_drone.disease_type ? t(latest_drone.disease_type.toLowerCase().replace(/ /g, '_')) : latest_drone.disease_type}
                                        </h2>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${getSeverityColor(latest_drone.severity)}`}>
                                        {latest_drone.severity || 'HIGH'} Severity
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white/60 p-4 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm mt-auto">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-gray-600">AI Confidence {latest_drone.confidence}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: `${latest_drone.confidence || 0}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 opacity-40">
                            <div className="text-4xl mb-2">🔍</div>
                            <p className="text-xs font-bold uppercase">{t('no_analysis_data', 'No Analysis Data')}</p>
                        </div>
                    )}
                </div>

                {/* 3. Action Plan & Treatment */}
                <div className="bg-gradient-to-br from-green-50 to-white rounded-[2rem] p-6 shadow-xl shadow-green-500/5 border border-white/50 relative overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-700 flex items-center mb-6">
                        <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 text-sm">💊</span>
                        Action Plan & Treatment
                    </h3>

                    {recommendation ? (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Crop Advice</p>
                                    <p className="font-bold text-gray-800">
                                        {recommendation.crop_suggestion.includes('Recommended:') ?
                                            recommendation.crop_suggestion.split(':')[1] :
                                            (recommendation.crop_suggestion.split(':')[1] || 'Paddy')}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-green-100/50 p-4 rounded-xl border border-green-200/50 flex items-start space-x-3">
                                <div className="bg-green-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm shrink-0">+</div>
                                <div>
                                    <p className="font-black text-gray-800 text-lg leading-tight">{recommendation.medicine_suggestion}</p>
                                    <p className="text-xs font-medium text-gray-600 mt-1">Dosage: {recommendation.dosage}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-40">
                            <p className="text-xs font-bold uppercase">No Active Plan</p>
                        </div>
                    )}
                </div>

                {/* 4. Cost Estimation */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] p-6 shadow-xl shadow-blue-500/5 border border-white/50 relative overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-700 flex items-center mb-6">
                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">🧾</span>
                        Cost Estimation
                    </h3>

                    {costData && costData.hasData ? (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Estimated Cost:</p>
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30 flex justify-between items-center">
                                <span className="text-3xl font-black tracking-tight">₹{costData.primary.totalMin} - ₹{costData.primary.totalMax}</span>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button className="bg-white/50 hover:bg-white text-blue-700 text-xs font-bold py-2 px-4 rounded-lg transition-colors border border-blue-200">
                                    Estimate Treatment Cost
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-40">
                            <p className="text-xs font-bold uppercase">Data Unavailable</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

const SensorRow = ({ label, value, icon, color }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100/50 last:border-0">
        <div className="flex items-center space-x-3">
            <span className="text-lg opacity-80">{icon}</span>
            <span className="text-gray-600 font-medium text-sm">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
);

const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
        case 'high': return 'bg-red-500';
        case 'medium': return 'bg-orange-500';
        default: return 'bg-green-500';
    }
}

export default FarmersDashboard;
