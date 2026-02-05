import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const IoTSensors = () => {
    const { t } = useTranslation();
    const [iotData, setIotData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;

            const res = await axios.get(`http://localhost:3000/farm/user/${user.id}/status`);
            setIotData(res.data.latest_iot);
            setLoading(false);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Error fetching IoT data:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Live update
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-center p-10 text-gray-500">Loading Sensors...</div>;

    const sensors = [
        {
            key: 'soil_moisture',
            label: t('soil_moisture'),
            value: iotData ? `${iotData.soil_moisture}%` : '0%',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-100',
            icon: '💧'
        },
        {
            key: 'water_level',
            label: t('water_level'),
            value: iotData ? `${iotData.water_level} cm` : '0 cm',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-100',
            icon: '🌊'
        },
        {
            key: 'temperature',
            label: t('temperature'),
            value: iotData ? `${iotData.temperature}°C` : '0°C',
            color: 'text-red-500',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-100',
            icon: '🌡️'
        },
        {
            key: 'humidity',
            label: t('humidity'),
            value: iotData ? `${iotData.humidity}%` : '0%',
            color: 'text-teal-600',
            bgColor: 'bg-teal-50',
            borderColor: 'border-teal-100',
            icon: '🌫️'
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">📡 {t('iot_sensors')}</h2>
                    <p className="text-sm text-gray-500">Real-time Environmental Monitoring</p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-400 block">Last Updated</span>
                    <span className="text-sm font-medium text-gray-600">{lastUpdated.toLocaleTimeString()}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sensors.map((sensor) => (
                    <div key={sensor.key} className={`p-6 rounded-xl border ${sensor.borderColor} ${sensor.bgColor} shadow-sm transition-transform hover:scale-[1.02]`}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-gray-600 font-semibold uppercase tracking-wider text-sm">{sensor.label}</h3>
                            <span className="text-2xl">{sensor.icon}</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className={`text-5xl font-extrabold ${sensor.color}`}>
                                {sensor.value}
                            </span>
                        </div>
                        <div className="mt-4 w-full bg-white/50 h-2 rounded-full overflow-hidden">
                            {/* Simple visual bar based on value (mock calculation for demo) */}
                            <div className={`h-full ${sensor.color.replace('text-', 'bg-')}`} style={{ width: '50%' }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
                <h3 className="font-bold text-gray-700 mb-4">Sensor Status & Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span>Soil Moisture Sensor: <span className="font-semibold text-green-600">Active</span></span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span>DHT11 Sensor: <span className="font-semibold text-green-600">Active</span></span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span>Ultrasonic Sensor: <span className="font-semibold text-green-600">Active</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IoTSensors;
