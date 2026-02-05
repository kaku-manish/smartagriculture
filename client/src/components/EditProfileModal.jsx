import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const EditProfileModal = ({ isOpen, onClose, user, farmData, onUpdate }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        location: '',
        field_size: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Location autocomplete states
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const locationTimeoutRef = useRef(null);

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                full_name: user.full_name || '',
                phone: user.phone || '',
                location: farmData?.location || '',
                field_size: farmData?.field_size || ''
            });
        }
    }, [isOpen, user, farmData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Trigger location search when typing in location field
        if (name === 'location') {
            handleLocationSearch(value);
        }
    };

    const handleLocationSearch = (query) => {
        // Clear previous timeout
        if (locationTimeoutRef.current) {
            clearTimeout(locationTimeoutRef.current);
        }

        if (query.length < 3) {
            setLocationSuggestions([]);
            setShowLocationDropdown(false);
            return;
        }

        setLocationLoading(true);

        // Debounce the API call
        locationTimeoutRef.current = setTimeout(async () => {
            try {
                const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: {
                        q: query,
                        format: 'json',
                        addressdetails: 1,
                        limit: 5,
                        countrycodes: 'in'
                    },
                    headers: {
                        'User-Agent': 'SmartAgriDashboard/1.0'
                    }
                });

                const suggestions = response.data.map(item => ({
                    display_name: item.display_name,
                    lat: item.lat,
                    lon: item.lon,
                    address: item.address
                }));

                setLocationSuggestions(suggestions);
                setShowLocationDropdown(suggestions.length > 0);
                setLocationLoading(false);
            } catch (err) {
                console.error('Location search error:', err);
                setLocationLoading(false);
            }
        }, 500);
    };

    const handleLocationSelect = (suggestion) => {
        setFormData({ ...formData, location: suggestion.display_name });
        setShowLocationDropdown(false);
        setLocationSuggestions([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await axios.put('http://localhost:3000/auth/update-profile', {
                userId: user.id,
                ...formData
            });
            // Update local storage user data
            const updatedUser = { ...user, full_name: formData.full_name, phone: formData.phone };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            onUpdate(); // Refresh dashboard data
            onClose();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.message || "Failed to update profile. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-xl font-bold text-gray-800 mb-6">Edit Profile</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm text-center border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('full_name')}</label>
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('location')}</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. Guntur, India"
                            autoComplete="off"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {locationLoading && (
                            <div className="absolute right-3 top-9">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {/* Autocomplete Dropdown */}
                        {showLocationDropdown && locationSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {locationSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleLocationSelect(suggestion)}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                                    >
                                        <div className="flex items-start space-x-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-gray-800">{suggestion.display_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Field Size (Acres)</label>
                        <input
                            type="number"
                            name="field_size"
                            step="0.1"
                            value={formData.field_size}
                            onChange={handleChange}
                            placeholder="e.g. 5.0"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition transform active:scale-95 mt-2"
                    >
                        {loading ? 'Updating...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
