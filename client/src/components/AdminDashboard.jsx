import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const AdminDashboard = ({ onGenerateReport }) => {
    const { t } = useTranslation();
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            setError("Failed to load farmers list");
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading User List...</div>;

    return (
        <div className="space-y-6">

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">{t('farmer_list')}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{t('total_farmers', { count: farmers.length })}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">{t('farmer_name')}</th>
                                <th className="px-6 py-3">{t('contact')}</th>
                                <th className="px-6 py-3">{t('location')}</th>
                                <th className="px-6 py-3">Field Size</th>
                                <th className="px-6 py-3">{t('crop_info')}</th>
                                <th className="px-6 py-3">{t('joined')}</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {farmers.length > 0 ? (
                                farmers.map((farmer) => (
                                    <tr key={farmer.user_id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold mr-3">
                                                    {farmer.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div>{farmer.full_name}</div>
                                                    <div className="text-gray-400 text-xs text-normal">@{farmer.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                <div>📧 {farmer.email}</div>
                                                <div className="mt-1">📞 {farmer.phone}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {farmer.location ? (
                                                <span>{farmer.location}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">{t('not_set')}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-700">{farmer.field_size || 0} Acres</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {farmer.soil_type ? (
                                                <div>
                                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                                        {farmer.soil_type}
                                                    </span>
                                                    <div className="mt-1 text-xs">{farmer.current_crop || 'N/A'}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">{t('no_farm_data')}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(farmer.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => onGenerateReport(farmer)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-2 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest flex items-center mx-auto"
                                            >
                                                <span className="mr-2">📄</span>
                                                Generate Report
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        {t('no_farmers_registered')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
