import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import FarmersDashboard from './FarmersDashboard';
import AdminDashboard from './AdminDashboard';
import ImageUpload from './ImageUpload';
import KnowledgeBase from './KnowledgeBase';
import ActionPlan from './ActionPlan';
import IoTSensors from './IoTSensors';
import CostEstimation from './CostEstimation';
import LanguageSelector from './LanguageSelector';
import Result from './Result';
import EditProfileModal from './EditProfileModal';
import Home from './Home';
import AgriChatbot from './AgriChatbot';
import AdminSettings from './AdminSettings';
import DiseaseHistory from './DiseaseHistory';
import Reports from './Reports';
import AdminReportGenerator from './AdminReportGenerator';
import AdminDroneReportControl from './AdminDroneReportControl';
import AdminDroneAnalysis from './AdminDroneAnalysis';
import MedicineMarketplace from './MedicineMarketplace';
import AdminOrders from './AdminOrders';
import drone_bg from '../assets/drone_bg.png';

const Dashboard = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('Home');
    const [user, setUser] = useState(null);
    const [farmId, setFarmId] = useState(null);
    const [farmData, setFarmData] = useState(null);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    const [selectedFarmerForReport, setSelectedFarmerForReport] = useState(null);

    // Sidebar State
    const [expandedMenus, setExpandedMenus] = useState({});

    // Shared State for Analysis Results
    const [recommendation, setRecommendation] = useState(null);
    const [iotData, setIotData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setUser(storedUser);
            // Initial Fetch
            fetchFarmData(storedUser.id);
        }
    }, []);

    const fetchFarmData = async (userId) => {
        try {
            const id = userId || user?.id;
            if (!id) return;

            const res = await axios.get(`http://localhost:3000/farm/user/${id}/status`);
            if (res.data.farm) {
                setFarmId(res.data.farm.farm_id);
                setFarmData(res.data.farm);
            }
            if (res.data.recommendation) {
                setRecommendation(res.data.recommendation);
            }
            if (res.data.latest_iot) {
                setIotData(res.data.latest_iot);
            }
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Error fetching farm data:", err);
        }
    };

    const handleAnalysisComplete = () => {
        fetchFarmData();
        setActiveTab('Action Plan & Treatments');
    };

    const resetAnalysis = () => {
        setRecommendation(null);
        setActiveTab('Dashboard');
    };

    const toggleMenu = (menuName) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuName]: !prev[menuName]
        }));
    };

    const role = user?.role || 'farmer';

    const menuItems = role === 'admin' ? [
        { name: 'Home', icon: 'home' },
        { name: 'Dashboard', icon: 'grid' },
        { name: 'User Controls', icon: 'users' },
        {
            name: 'IoT Sensors',
            icon: 'rss',
            subItems: [
                { name: 'Sensor Overview', targetTab: 'IoT Sensors' },
                { name: 'Soil Moisture', targetTab: 'IoT Sensors' },
                { name: 'Water Level', targetTab: 'IoT Sensors' }
            ]
        },
        {
            name: 'Action Plans',
            icon: 'clipboard',
            subItems: [
                { name: 'Treatments', targetTab: 'Action Plan & Treatments' },
                { name: 'Cost Estimation', targetTab: 'Cost Estimation' }
            ]
        },
        {
            name: 'Disease Analysis',
            icon: 'microscope',
            subItems: [
                { name: 'Manual Check', targetTab: 'Manual Disease Check' },
                { name: 'Live Camera', targetTab: 'Start Live Camera' },
                { name: 'Drone Analysis', targetTab: 'Drone Analysis' }
            ]
        },
        { name: 'Admin Drone Reports', icon: 'zap', targetTab: 'Admin Drone Reports' },
        { name: 'Medicine Catalog', icon: 'settings' },
        { name: 'Orders Management', icon: 'clipboard', targetTab: 'Orders' },
        { name: 'Crop Advisory', icon: 'book', targetTab: 'Crop Advisory & Soil Guide' }
    ] : [
        { name: 'Home', icon: 'home' },
        {
            name: 'Dashboard',
            icon: 'grid',
            subItems: [
                { name: 'Monitoring', targetTab: 'Dashboard' },
                { name: 'Reports', targetTab: 'Reports' },
                { name: 'Crop Advisory & Guide', targetTab: 'Crop Advisory & Soil Guide' }
            ]
        },
        {
            name: 'IoT Sensors',
            icon: 'rss',
            subItems: [
                { name: 'Soil Moisture', targetTab: 'IoT Sensors' },
                { name: 'Water Level', targetTab: 'IoT Sensors' },
                { name: 'Temperature', targetTab: 'IoT Sensors' },
                { name: 'Humidity', targetTab: 'IoT Sensors' }
            ]
        },
        {
            name: 'Action Plans',
            icon: 'clipboard',
            subItems: [
                { name: 'Treatments', targetTab: 'Action Plan & Treatments' },
                { name: 'Cost Estimation', targetTab: 'Cost Estimation' },
                { name: 'History of Disease', targetTab: 'Disease History' }
            ]
        },
        {
            name: 'Disease Analysis',
            icon: 'microscope',
            subItems: [
                { name: 'Manual Check', targetTab: 'Manual Disease Check' },
                { name: 'Live Camera Check', targetTab: 'Start Live Camera' }
            ]
        },
        { name: 'Purchase', icon: 'dollar' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Home':
                return <Home user={user} farmData={farmData} recommendation={recommendation} setActiveTab={setActiveTab} />;
            case 'Dashboard':
                return <FarmersDashboard />;
            case 'User Controls':
                return role === 'admin' ? <AdminDashboard onGenerateReport={(farmer) => {
                    setSelectedFarmerForReport(farmer);
                    setActiveTab('Report Generator');
                }} /> : <div className="text-red-500">Access Denied</div>;
            case 'Report Generator':
                return <AdminReportGenerator farmer={selectedFarmerForReport} onBack={() => setActiveTab('User Controls')} />;
            case 'Disease Analysis':
            case 'Manual Disease Check':
                return <div className="max-w-4xl mx-auto"><ImageUpload farmId={farmId} onAnalysisComplete={handleAnalysisComplete} allowCamera={false} /></div>;
            case 'Start Live Camera':
                return <div className="max-w-4xl mx-auto"><ImageUpload farmId={farmId} onAnalysisComplete={handleAnalysisComplete} defaultMode="camera" /></div>;
            case 'Action Plan & Treatments':
                return <div className="max-w-4xl mx-auto h-full"><ActionPlan recommendation={recommendation} setActiveTab={setActiveTab} resetAnalysis={resetAnalysis} /></div>;
            case 'Crop Advisory & Soil Guide':
                return <KnowledgeBase />;
            case 'IoT Sensors':
                return <IoTSensors />;
            case 'Cost Estimation':
                return <CostEstimation />;
            case 'Disease History':
                return <DiseaseHistory farmId={farmId} />;
            case 'Reports':
                return <Reports farmId={farmId} />;
            case 'Result':
                return <Result />;
            case 'Medicine Catalog':
                return <AdminSettings />;
            case 'Drone Analysis':
                return <AdminDroneAnalysis />;
            case 'Admin Drone Reports':
                return <AdminDroneReportControl />;
            case 'Orders':
                return <AdminOrders />;
            case 'Purchase':
                return <MedicineMarketplace farmId={farmId} user={user} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                        <div className="text-6xl mb-4">🚧</div>
                        <h2 className="text-2xl font-bold">Coming Soon</h2>
                        <p>{activeTab} Module is under development</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#f0f2f5] relative overflow-hidden font-sans">
            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                user={user}
                farmData={farmData}
                onUpdate={() => {
                    setUser(JSON.parse(localStorage.getItem('user')));
                    fetchFarmData();
                }}
            />

            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img src={drone_bg} className="w-full h-full object-cover" alt="Background" />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            {/* Sidebar (Left) - Conditional Styling based on Role */}
            <aside className={`w-72 h-full z-20 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300 shadow-2xl
                ${role === 'admin'
                    ? 'bg-emerald-900/90' // Dark Green for Admin
                    : 'bg-gradient-to-b from-emerald-500/90 to-teal-600/90' // Soft Green Gradient for User
                }`}>

                {/* Branding */}
                <div className="p-6 flex items-center space-x-3 text-white border-b border-white/10 bg-black/5">
                    <div className="bg-white/20 p-2 rounded-lg shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-lg font-bold tracking-wide block leading-none">Smart Agri</span>
                        <span className="text-xs text-white/80 font-medium">{role === 'admin' ? 'Admin Console' : 'User Panel'}</span>
                    </div>
                </div>

                {/* Role Badge (Admin only, or simplified for User) */}
                {role === 'admin' && (
                    <div className="px-6 py-4">
                        <div className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-center border bg-orange-500/20 text-orange-100 border-orange-500/30">
                            Administrator
                        </div>
                    </div>
                )}

                {/* Menu Items (Scrollable & Nested) */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-1 py-3 scrollbar-hide">
                    {menuItems.map((item) => (
                        <div key={item.name}>
                            {/* Parent Item */}
                            <button
                                onClick={() => {
                                    if (item.subItems) {
                                        toggleMenu(item.name);
                                    } else {
                                        setActiveTab(item.targetTab || item.name);
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium mb-1
                                    ${activeTab === (item.targetTab || item.name) && !item.subItems
                                        ? 'bg-white/20 text-white shadow-lg'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <Icon name={item.icon} className={`w-5 h-5 ${activeTab === (item.targetTab || item.name) ? 'text-white' : 'text-white/70 group-hover:text-white'}`} />
                                    <span>{item.name}</span>
                                </div>
                                {item.subItems && (
                                    <span className={`transform transition-transform duration-200 ${expandedMenus[item.name] ? 'rotate-180' : ''}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </span>
                                )}
                            </button>

                            {/* Sub Items */}
                            {item.subItems && (
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedMenus[item.name] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="pl-4 space-y-1 border-l-2 border-white/20 ml-4 mb-2">
                                        {item.subItems.map((sub) => (
                                            <button
                                                key={sub.name}
                                                onClick={() => setActiveTab(sub.targetTab)}
                                                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm transition-all duration-200
                                                    ${activeTab === sub.targetTab
                                                        ? 'bg-white/20 text-white font-bold'
                                                        : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                                                <span>{sub.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer User Profile with Weather Widget (User Only) */}
                <div className="p-4 border-t border-white/10 bg-black/10">
                    {/* Weather Widget Mockup for Users */}
                    {role !== 'admin' && (
                        <div className="flex items-center space-x-3 mb-4 bg-white/10 p-3 rounded-xl border border-white/5">
                            <div className="text-2xl">⛅</div>
                            <div>
                                <p className="text-sm font-bold text-white">25°C</p>
                                <p className="text-[10px] text-white/70">Mostly Clear</p>
                            </div>
                        </div>
                    )}

                    <div className="mb-2 px-1">
                        <button
                            onClick={() => setIsEditProfileOpen(true)}
                            className="w-full text-xs text-blue-100 hover:text-white flex items-center space-x-2 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Edit Profile</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center font-bold text-lg shadow-lg shrink-0">
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
                                <p className="text-xs text-white/60 truncate">@{user?.username}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('user');
                                window.location.href = '/login';
                            }}
                            className="text-red-200 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors shrink-0"
                            title="Logout"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content (Right) */}
            <main className="flex-1 z-10 flex flex-col h-full overflow-hidden">

                {/* Top Bar */}
                <header className="h-20 backdrop-blur-md bg-white/80 border-b border-white/50 flex justify-between items-center px-8 shadow-sm">
                    {/* Title */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{activeTab}</h2>
                        <p className="text-sm text-gray-500">Overview & Management</p>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center space-x-6">
                        <div className="bg-white rounded-full shadow-sm border border-gray-100 px-1">
                            <LanguageSelector />
                        </div>
                        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition">
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    <div className="max-w-7xl mx-auto pb-20">
                        {renderContent()}
                    </div>
                </div>

            </main>

            {/* Chatbot - Only for Farmers */}
            {role === 'farmer' && (
                <AgriChatbot
                    farmData={farmData}
                    recommendation={recommendation}
                    iotData={iotData}
                />
            )}
        </div>
    );
};

// Simple Icon Component
const Icon = ({ name, className }) => {
    // Map names to SVG paths
    const icons = {
        home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
        grid: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
        users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
        rss: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />,
        microscope: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
        clipboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
        upload: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
        camera: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />,
        book: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
        settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
        dollar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    };

    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icons[name] || icons.home}
        </svg>
    )
}

export default Dashboard;
