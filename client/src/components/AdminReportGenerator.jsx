import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminReportGenerator = ({ farmer, onBack, onSuccess, analysisResult }) => {
    const [loading, setLoading] = useState(true);
    const [farmData, setFarmData] = useState(null);
    const [costData, setCostData] = useState(null);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!farmer) return;
            try {
                // Fetch status (contains latest drone/analysis and recommendation)
                const statusRes = await axios.get(`http://localhost:3000/farm/user/${farmer.user_id}/status`);
                setFarmData(statusRes.data);

                // Fetch cost estimation
                if (statusRes.data.farm?.farm_id) {
                    const costRes = await axios.get(`http://localhost:3000/cost/estimate/${statusRes.data.farm.farm_id}`);
                    setCostData(costRes.data);
                }
            } catch (err) {
                console.error("Failed to fetch data for report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [farmer]);

    // Use passed result if available, otherwise fallback to DB fetch
    const drone = analysisResult || farmData?.latest_drone;
    const iot = farmData?.latest_iot;
    const recommendation = farmData?.recommendation;

    const handleSendReport = async () => {
        if (!drone || !drone.disease_type) {
            alert("Error: AI Analysis data is missing. Please wait for the analysis to load or try again.");
            return;
        }

        setSending(true);
        try {
            await axios.post('http://localhost:3000/reports/create', {
                farm_id: farmData.farm.farm_id,
                title: `Full Field Health Report - ${new Date().toLocaleDateString()}`,
                type: 'pdf',
                analysis_id: drone?.analysis_id,
                report_data: {
                    drone,
                    iot,
                    recommendation,
                    costData
                }
            });
            setSent(true);
            setTimeout(() => {
                setSent(false);
                if (onSuccess) onSuccess();
                else if (onBack) onBack();
            }, 2000);
        } catch (err) {
            console.error("Failed to send report:", err);
            alert("Failed to send report");
        } finally {
            setSending(false);
        }
    };

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const cleanPath = path.replace(/\\/g, '/');
        const filename = cleanPath.split('/').pop();
        return `http://localhost:3000/uploads/${filename}`;
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Preparing Report Data...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Generate PDF Report</h2>
                        <p className="text-sm text-gray-500 font-medium">Farmer: <span className="text-blue-600">{farmer.full_name}</span></p>
                    </div>
                </div>
                <button
                    onClick={handleSendReport}
                    disabled={sending || sent || !drone || !farmData}
                    className={`px-8 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg transition-all
                        ${sent ? 'bg-green-500 text-white shadow-green-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 hover:-translate-y-1'}
                        ${(!drone || !farmData) && !sending ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                    `}
                >
                    {sending ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating...</span>
                        </>
                    ) : sent ? (
                        <>
                            <span>✓ Sent to User</span>
                        </>
                    ) : (
                        <>
                            <span className="text-xl">📄</span>
                            <span>Convert to PDF & Send</span>
                        </>
                    )}
                </button>
            </div>

            {/* Preview Sheet */}
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden min-h-[800px]">
                {/* PDF Header Decoration */}
                <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500"></div>

                <div className="flex justify-between mb-12">
                    <div>
                        <div className="flex items-center space-x-2 text-blue-600 mb-2">
                            <span className="text-2xl font-black italic">SMART AGRI</span>
                            <span className="text-xs font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Official Insight</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 mb-2">FIELD HEALTH REPORT</h1>
                        <p className="text-gray-400 font-bold uppercase tracking-tighter">REF : SA-REP-{(new Date().getTime()).toString().slice(-6)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 font-bold uppercase text-xs">Generated Date</p>
                        <p className="text-xl font-bold text-gray-800">{new Date().toLocaleDateString()}</p>
                        <p className="text-gray-500 font-medium">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* Grid Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

                    {/* Left: Metadata & IoT */}
                    <div className="md:col-span-4 space-y-8 border-r border-gray-100 pr-10">
                        {/* Farmer Info */}
                        <div>
                            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Farmer Details</h3>
                            <div className="space-y-4">
                                <InfoRow label="Name" value={farmer.full_name} />
                                <InfoRow label="Location" value={farmer.location || 'N/A'} />
                                <InfoRow label="Crop" value={farmer.current_crop || 'Paddy'} />
                                <InfoRow label="Field Size" value={`${farmer.field_size || 0} Acres`} />
                            </div>
                        </div>

                        {/* IoT Section */}
                        <div>
                            <h3 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-4">IoT Sensor Snapshot</h3>
                            <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-500">Soil Moisture</span>
                                    <span className="text-lg font-black text-gray-800">{iot?.soil_moisture || '--'}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-500">Water Level</span>
                                    <span className="text-lg font-black text-gray-800">{iot?.water_level || '--'} cm</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-500">Field Temp</span>
                                    <span className="text-lg font-black text-gray-800">{iot?.temperature || '--'}°C</span>
                                </div>
                            </div>
                        </div>

                        {/* Cost Est */}
                        <div>
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Cost Estimation</h3>
                            <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center shadow-lg shadow-indigo-100">
                                <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Estimated Treatment Cost</p>
                                <p className="text-3xl font-black">₹{costData?.primary?.totalMin || '0'} - ₹{costData?.primary?.totalMax || '0'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Disease & Analysis */}
                    <div className="md:col-span-8 space-y-10">

                        {/* Analyzed Image */}
                        <div>
                            <h3 className="text-xs font-black text-pink-600 uppercase tracking-widest mb-4">Drone Vision Analysis</h3>
                            <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-gray-100 border-4 border-white shadow-xl">
                                {drone ? (
                                    <img
                                        src={getImageUrl(drone.annotated_image_reference || drone.image_reference)}
                                        className="w-full h-full object-cover"
                                        alt="Analyzed Crop"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                        <span className="text-5xl mb-2">🛰️</span>
                                        <p className="font-bold text-xs uppercase tracking-widest">No Recent Aerial Data</p>
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg uppercase tracking-widest">
                                    {drone?.severity || 'LOW'} Severity
                                </div>
                            </div>
                        </div>

                        {/* Disease & Treatment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Health Status</h3>
                                <div className="flex items-center space-x-3 mb-4">
                                    <span className="text-3xl">🛡️</span>
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 leading-none mb-1">{drone?.disease_type || 'Healthy / Normal'}</h2>
                                        <p className="text-xs font-bold text-gray-400 uppercase">AI CONFIDENCE : {drone?.confidence || 0}%</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-black text-green-600 uppercase tracking-widest mb-3">Urgent Action</h3>
                                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                                    <p className="text-sm font-black text-green-800 mb-1">{recommendation?.medicine_suggestion || 'Manual Monitoring'}</p>
                                    <p className="text-xs font-bold text-green-600">Dosage: {recommendation?.dosage || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Prevention / Timeline */}
                        <div className="bg-gray-50 rounded-[2rem] p-8">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Preventive Protocol</h3>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed italic">
                                "{recommendation?.preventive_measures || 'Continue regular irrigation and monitor for changes in leaf pigmentation.'}"
                            </p>
                        </div>

                    </div>
                </div>

                <div className="mt-20 pt-10 border-t border-dashed border-gray-200 text-center">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">This report is generated by Smart Agri AI Engine. All data is real-time and subject to field verification.</p>
                </div>

            </div>
        </div>
    );
};

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-xs font-bold text-gray-400 uppercase">{label}</span>
        <span className="text-sm font-black text-gray-700">{value}</span>
    </div>
);

export default AdminReportGenerator;
