import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSelector = () => {
    const { i18n } = useTranslation();

    // Ensure language is set correctly on mount or change
    const currentLanguage = i18n.language;

    const changeLanguage = (e) => {
        i18n.changeLanguage(e.target.value);
    };

    return (
        <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/20 transition-all duration-300">
            <Globe className="w-4 h-4 text-emerald-400" />
            <select
                onChange={changeLanguage}
                value={currentLanguage}
                className="bg-transparent text-sm text-gray-100 font-medium focus:outline-none cursor-pointer appearance-none pr-4"
                style={{
                    backgroundImage: 'none' // Remove default arrow in some browsers to keep it clean, or we can keep it.
                }}
            >
                <option value="en" className="bg-gray-800 text-gray-100">English</option>
                <option value="te" className="bg-gray-800 text-gray-100">Telugu (తెలుగు)</option>
                <option value="en-IN" className="bg-gray-800 text-gray-100">English (India)</option>
            </select>
        </div>
    );
};

export default LanguageSelector;
