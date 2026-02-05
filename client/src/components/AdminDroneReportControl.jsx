import { useState, useEffect } from 'react';
import axios from 'axios';
import ImageUpload from './ImageUpload';
import AdminReportGenerator from './AdminReportGenerator';

const AdminDroneReportControl = () => {
    const [farmers, setFarmers] = useState([]);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [step, setStep] = useState(1); // 1: Select Farmer, 2: Upload/Analyze, 3: Review/Send
    const [latestAnalysis, setLatestAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFarmers();
    }, []);

    const fetchFarmers = async () => {
        try {
            const res = await axios.get('http://localhost:3000/admin/farmers');
            setFarmers(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch farmers:", err);
            setLoading(false);
        }
    };

    const handleFarmerSelect = (farmer) => {
        setSelectedFarmer(farmer);
        setStep(2);
    };

    const handleAnalysisComplete = (result) => {
        console.log("Analysis complete for admin report:", result);
        setLatestAnalysis(result);
        setStep(3);
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Farmer Directory...</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumbs / Steps */}
            <div className="flex items-center space-x-4 mb-8">
                <StepBadge number={1} label="Select Farmer" active={step === 1} completed={step > 1} />
                <div className="w-10 h-px bg-gray-200"></div>
                <StepBadge number={2} label="Drone Upload" active={step === 2} completed={step > 2} />
                <div className="w-10 h-px bg-gray-200"></div>
                <StepBadge number={3} label="Review & Dispatch" active={step === 3} completed={step > 3} />
            </div>

            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {farmers.map(farmer => (
                        <div
                            key={farmer.user_id}
                            onClick={() => handleFarmerSelect(farmer)}
                            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group group-hover:-translate-y-1"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    {farmer.full_name.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-gray-800 truncate">{farmer.full_name}</h3>
                                    <p className="text-xs text-gray-400 truncate">@{farmer.username}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Field Size</p>
                                    <p className="text-sm font-bold text-gray-700">{farmer.field_size || 0} Ac</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                                    <p className="text-sm font-bold text-emerald-500">Active</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {step === 2 && (
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl mb-6">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">Field Analysis Terminal</h2>
                                <p className="text-sm text-gray-500 font-medium">Processing request for <span className="text-blue-600">{selectedFarmer.full_name}</span></p>
                            </div>
                            <button onClick={() => setStep(1)} className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Change Farmer</button>
                        </div>

                        <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100/50 mb-8 flex items-center space-x-4">
                            <span className="text-3xl">🛸</span>
                            <p className="text-sm font-medium text-blue-800 leading-relaxed">
                                Upload the high-resolution images collected by the drone mission. Our AI will automatically identify disease patches and calculate severity metrics.
                            </p>
                        </div>

                        <ImageUpload
                            farmId={selectedFarmer.farm_id}
                            onAnalysisComplete={handleAnalysisComplete}
                            isAdminMode={true}
                        />
                    </div>
                </div>
            )}

            {step === 3 && (
                <AdminReportGenerator
                    farmer={selectedFarmer}
                    analysisResult={latestAnalysis}
                    onBack={() => setStep(2)}
                    onSuccess={() => setStep(1)}
                />
            )}
        </div>
    );
};

const StepBadge = ({ number, label, active, completed }) => (
    <div className={`flex items-center space-x-2 ${active ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
            ${completed ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-200 text-gray-500'}
        `}>
            {completed ? '✓' : number}
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest ${active ? 'text-blue-600' : 'text-gray-500'}`}>{label}</span>
    </div>
);

export default AdminDroneReportControl;
