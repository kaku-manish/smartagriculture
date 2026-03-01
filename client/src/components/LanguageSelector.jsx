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
        <div className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-white transition-all duration-300">
            <Globe className="w-4 h-4 text-emerald-600" />
            <select
                onChange={changeLanguage}
                value={currentLanguage}
                className="bg-transparent text-sm text-gray-800 font-bold focus:outline-none cursor-pointer appearance-none pr-4"
                style={{
                    backgroundImage: 'none'
                }}
            >
                <option value="en" className="bg-white text-gray-800 font-medium">English</option>
                <option value="te" className="bg-white text-gray-800 font-medium">Telugu (తెలుగు)</option>
            </select>
        </div>
    );
};

export default LanguageSelector;
