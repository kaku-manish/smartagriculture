import API_URL from '@/api/config';
import { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    User,
    Mail,
    Phone,
    Lock,
    MapPin,
    Ruler,
    ChevronRight,
    ArrowLeft,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import bgImage from '../assets/paddy_login_bg.png';
import LanguageSelector from '../components/LanguageSelector';

const Signup = () => {
    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        gender: 'Male',
        field_size: '',
        location: '',
        role: 'farmer'
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Location autocomplete states
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const locationTimeoutRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Trigger location search when typing in location field
        if (name === 'location') {
            handleLocationSearch(value);
        }
    };

    // ... existing location logic ...
    const handleLocationSearch = (query) => {
        if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
        if (query.length < 3) {
            setLocationSuggestions([]);
            setShowLocationDropdown(false);
            return;
        }
        setLocationLoading(true);
        locationTimeoutRef.current = setTimeout(async () => {
            try {
                const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: { q: query, format: 'json', addressdetails: 1, limit: 5, countrycodes: 'in' },
                    headers: { 'User-Agent': 'SmartAgriDashboard/1.0' }
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

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            await axios.post(`${API_URL}/auth/register`, formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex overflow-hidden font-sans bg-emerald-950 relative">

            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src={bgImage}
                    alt="Paddy Field"
                    className="w-full h-full object-cover opacity-40 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900/90 to-emerald-950/95"></div>
            </div>

            <div className="container mx-auto px-4 py-8 relative z-10 flex flex-col items-center justify-center min-h-screen">

                {/* Header / Nav */}
                <div className="absolute top-0 w-full flex justify-between items-center py-6 px-4 lg:px-0 max-w-6xl">
                    <Link to="/login" className="flex items-center text-emerald-200 hover:text-emerald-100 transition-colors group">
                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 mr-3 border border-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Back to Login</span>
                    </Link>
                    <LanguageSelector />
                </div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-5xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row mt-20 mb-10"
                >

                    {/* Left Side: Context/Visuals */}
                    <div className="hidden md:flex w-2/5 bg-gradient-to-b from-emerald-800/50 to-emerald-900/50 p-10 flex-col justify-between relative overflow-hidden border-r border-white/10">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

                        <div>
                            <h2 className="text-3xl font-bold text-white mb-4">Join Paddy Guard</h2>
                            <p className="text-emerald-100/80 leading-relaxed">
                                Create your farmer profile to access AI-driven crop insights, drone survey reports, and actionable treatment plans.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center space-x-4 text-emerald-50">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className="font-medium">Real-time Disease Detection</span>
                            </div>
                            <div className="flex items-center space-x-4 text-emerald-50">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className="font-medium">Cost Estimation Tools</span>
                            </div>
                            <div className="flex items-center space-x-4 text-emerald-50">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className="font-medium">Expert Advisory Support</span>
                            </div>
                        </div>

                        <div className="text-xs text-emerald-200/50">
                            © 2026 Paddy Guard Intelligence
                        </div>
                    </div>

                    {/* Right Side: Form */}
                    <div className="w-full md:w-3/5 p-8 md:p-12 relative overflow-y-auto max-h-[85vh] scrollbar-thin scrollbar-thumb-emerald-700 scrollbar-track-transparent">

                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">Register Field Account</h3>
                            <p className="text-emerald-200/70 text-sm">Enter your personal and farm details below.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center">
                                <span className="mr-2">⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Name & Username */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400/50 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            name="full_name"
                                            type="text"
                                            placeholder="e.g. John Doe"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Username</label>
                                    <input
                                        name="username"
                                        type="text"
                                        placeholder="Choose a username"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-4 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400/50 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            name="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Phone</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400/50 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            name="phone"
                                            type="text"
                                            placeholder="+91 9876543210"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Passwords */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400/50 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Confirm Password</label>
                                    <input
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-4 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-1 relative">
                                <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Farm Location</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400/50 group-focus-within:text-emerald-400 transition-colors" />
                                    <input
                                        name="location"
                                        type="text"
                                        placeholder="Search location (e.g. Guntur, AP)"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                        value={formData.location}
                                        onChange={handleChange}
                                        autoComplete="off"
                                    />
                                    {locationLoading && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Suggestions Dropdown */}
                                {showLocationDropdown && locationSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-emerald-500/30 rounded-xl shadow-xl max-h-60 overflow-y-auto backdrop-blur-md">
                                        {locationSuggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleLocationSelect(suggestion)}
                                                className="px-4 py-3 hover:bg-emerald-500/20 cursor-pointer transition-colors border-b border-emerald-500/10 last:border-0 flex items-start space-x-2"
                                            >
                                                <MapPin className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-white">{suggestion.display_name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Field Size & Gender */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Field Size (Acres)</label>
                                    <div className="relative group">
                                        <Ruler className="absolute left-3.5 top-3.5 w-5 h-5 text-emerald-400/50 group-focus-within:text-emerald-400 transition-colors" />
                                        <input
                                            name="field_size"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="e.g. 5.5"
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/20 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all text-sm"
                                            value={formData.field_size}
                                            onChange={handleChange}
                                            required={formData.role === 'farmer'}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider ml-1">Gender</label>
                                    <div className="flex items-center space-x-4 bg-black/20 border border-white/10 rounded-xl px-4 py-3 h-[46px]">
                                        <label className="flex items-center cursor-pointer group">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.gender === 'Male' ? 'border-emerald-400' : 'border-white/30'}`}>
                                                {formData.gender === 'Male' && <div className="w-2 h-2 rounded-full bg-emerald-400"></div>}
                                            </div>
                                            <input type="radio" name="gender" value="Male" checked={formData.gender === 'Male'} onChange={handleChange} className="hidden" />
                                            <span className={`ml-2 text-sm ${formData.gender === 'Male' ? 'text-emerald-400' : 'text-white/50'}`}>Male</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer group">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.gender === 'Female' ? 'border-emerald-400' : 'border-white/30'}`}>
                                                {formData.gender === 'Female' && <div className="w-2 h-2 rounded-full bg-emerald-400"></div>}
                                            </div>
                                            <input type="radio" name="gender" value="Female" checked={formData.gender === 'Female'} onChange={handleChange} className="hidden" />
                                            <span className={`ml-2 text-sm ${formData.gender === 'Female' ? 'text-emerald-400' : 'text-white/50'}`}>Female</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transform transition active:scale-95 flex justify-center items-center"
                            >
                                {loading ? 'Creating Account...' : 'Complete Registration'}
                                {!loading && <ChevronRight className="w-5 h-5 ml-2" />}
                            </button>

                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Signup;
