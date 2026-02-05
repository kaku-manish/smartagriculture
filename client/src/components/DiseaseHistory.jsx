import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const DiseaseHistory = ({ farmId }) => {
    const { t } = useTranslation();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!farmId) return;
            try {
                const res = await axios.get(`http://localhost:3000/drone/history/${farmId}`);
                if (res.data.history) {
                    setHistory(res.data.history);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [farmId]);

    // Helper to format image URL for frontend
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const cleanPath = path.replace(/\\/g, '/');
        const filename = cleanPath.split('/').pop();
        return `http://localhost:3000/uploads/${filename}`;
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading history...</div>;
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                <span className="text-4xl mb-4">📜</span>
                <p>No disease history found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="glass-panel p-4 flex justify-between items-center rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-white/50 mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">History of Disease</h2>
                        <p className="text-xs text-gray-500 font-medium">Log of all past crop analyses</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map((record) => (
                    <div key={record.analysis_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-48 bg-gray-100 group">
                            {/* Image Display */}
                            {record.annotated_image_reference || record.image_reference ? (
                                <img
                                    src={getImageUrl(record.annotated_image_reference || record.image_reference)}
                                    alt={record.disease_type}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                    <span className="text-2xl">No Image</span>
                                </div>
                            )}
                            <div className="absolute top-2 right-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase shadow-sm ${record.severity === 'HIGH' ? 'bg-red-500 text-white' :
                                    record.severity === 'MEDIUM' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                                    }`}>
                                    {record.severity} Severity
                                </span>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-800 text-lg">{record.disease_type.replace(/_/g, ' ')}</h3>
                                {record.confidence > 0 && (
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                        {Math.round(record.confidence * 100)}% Conf.
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-4">
                                {new Date(record.analysis_date).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>

                            <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
                                <span className="text-purple-600 font-bold hover:underline cursor-pointer">
                                    View Report &gt;
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiseaseHistory;
