import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CostEstimation = () => {
    const { t } = useTranslation();
    const [costData, setcostData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [farmId, setFarmId] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.id) {
            fetchFarmId(user.id);
        }
    }, []);

    const fetchFarmId = async (userId) => {
        try {
            const res = await axios.get(`http://localhost:3000/farm/user/${userId}/status`);
            if (res.data.farm) {
                setFarmId(res.data.farm.farm_id);
                fetchCostEstimation(res.data.farm.farm_id);
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchCostEstimation = async (fId) => {
        try {
            const res = await axios.get(`http://localhost:3000/cost/estimate/${fId}`);
            setcostData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!costData || !costData.hasData) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-12 text-center border border-blue-100">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">No Disease Detected Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Upload a crop image for disease analysis first. Once a disease is detected, cost estimation will be automatically calculated.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    const { disease, farm, primary, alternative, timeline, preventiveMeasures } = costData;

    const getSeverityColor = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'HIGH': return 'bg-red-500';
            case 'MEDIUM': return 'bg-yellow-500';
            case 'LOW': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold">Cost Estimation & Treatment Budget</h2>
                        <p className="text-green-100 text-sm mt-1">Estimated cost for recommended treatment based on detected disease and farm area</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Disease Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Detected Disease */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span className="text-xl">⚠️</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Detected Issue</h3>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-2xl font-bold text-gray-900 mb-1">{disease.name}</p>
                                <p className="text-sm text-gray-500">Paddy Crop</p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className="text-sm text-gray-600">Severity</span>
                                <span className={`${getSeverityColor(disease.severity)} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                                    {disease.severity}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Confidence</span>
                                <span className="text-sm font-bold text-gray-900">{disease.confidence}%</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Recommended Medicine</span>
                                <span className="text-sm font-semibold text-green-700">{primary.medicine}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Dosage</span>
                                <span className="text-sm font-semibold text-gray-900">{primary.dosage}</span>
                            </div>
                        </div>
                    </div>

                    {/* Farm Area */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-blue-900">Farm Area</h3>
                        </div>

                        <div className="text-center py-4">
                            <p className="text-5xl font-bold text-blue-900">{farm.size}</p>
                            <p className="text-blue-700 font-medium mt-2">Acres</p>
                        </div>
                    </div>
                </div>

                {/* Right Column - Cost Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Primary Medicine Cost */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-2 mb-6">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-xl">💊</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Primary Treatment - Cost Breakdown</h3>
                            <span className="ml-auto text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Auto Calculated</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-sm text-gray-600 mb-1">Medicine</p>
                                <p className="text-lg font-bold text-gray-900">{primary.medicine}</p>
                                <p className="text-xs text-gray-500 mt-1">Brand: {primary.brand}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-sm text-gray-600 mb-1">Unit Price</p>
                                <p className="text-lg font-bold text-gray-900">₹{primary.unitPrice} / {primary.unit}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t-2 border-gray-100">
                            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100 text-sm mb-1">Total Estimated Cost</p>
                                        <p className="text-3xl font-bold">₹{primary.totalMin} - ₹{primary.totalMax}</p>
                                    </div>
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                        <span className="text-3xl">💰</span>
                                    </div>
                                </div>
                                <p className="text-green-100 text-xs mt-3">
                                    <span className="inline-block w-2 h-2 bg-green-300 rounded-full mr-2"></span>
                                    {disease.severity === 'HIGH' ? 'High Severity - Immediate Action Recommended' : 'Prices are approximate and may vary by location'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-xs text-yellow-800">
                                <strong>Note:</strong> Prices are approximate and may vary based on brand, location, and availability. This estimation is for planning purposes only.
                            </p>
                        </div>
                    </div>

                    {/* Alternative Option */}
                    {alternative && (
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-purple-900">Alternative Treatment Option</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-purple-700 mb-1">Medicine</p>
                                    <p className="font-bold text-purple-900">{alternative.medicine}</p>
                                    <p className="text-xs text-purple-600 mt-1">Brand: {alternative.brand}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-purple-700 mb-1">Estimated Cost</p>
                                    <p className="text-2xl font-bold text-purple-900">₹{alternative.totalMin} - ₹{alternative.totalMax}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center space-x-4 text-sm">
                                <div className="flex items-center text-purple-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {alternative.totalMin < primary.totalMin ? 'Lower cost option' : 'Alternative formulation'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Timeline & Prevention */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Action Timeline</h3>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{timeline}</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Preventive Measures</h3>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{preventiveMeasures}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CostEstimation;
