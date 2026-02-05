import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const KnowledgeBase = () => {
    const { t } = useTranslation();
    const [selectedSoil, setSelectedSoil] = useState('');
    const [showResults, setShowResults] = useState(false);

    const soilOptions = [
        {
            id: 'fertile',
            label: 'fertile_soil',
            data: {
                characteristics: 'fertile_char',
                water: 'fertile_water',
                weather: 'fertile_weather',
                varieties: 'fertile_var',
                diseases: 'fertile_dis'
            }
        },
        {
            id: 'non-fertile',
            label: 'non_fertile_soil',
            data: {
                characteristics: 'non_fertile_char',
                water: 'non_fertile_water',
                weather: 'non_fertile_weather',
                varieties: 'non_fertile_var',
                diseases: 'non_fertile_dis'
            }
        }
    ];

    const handleSearch = () => {
        if (selectedSoil) setShowResults(true);
    };

    const handleReset = () => {
        setSelectedSoil('');
        setShowResults(false);
    };

    const result = soilOptions.find(s => s.id === selectedSoil);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                <span className="mr-2">🌱</span> {t('kb_title')}
            </h3>

            {/* Filter Bar - Matches User Request Style */}
            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-gray-50 p-4 rounded-lg border border-gray-100 mb-8">
                <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('soil_type')}</label>
                    <select
                        value={selectedSoil}
                        onChange={(e) => setSelectedSoil(e.target.value)}
                        className="w-full border border-blue-300 rounded-md p-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                    >
                        <option value="">{t('select_soil_type')}</option>
                        {soilOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{t(opt.label)}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2 mt-2 md:mt-0">
                    <button
                        onClick={handleSearch}
                        className="bg-[#C88A66] hover:bg-[#b07856] text-white font-medium py-2.5 px-6 rounded-md shadow-sm transition-colors"
                    >
                        {t('search')}
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-6 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        {t('reset')}
                    </button>
                </div>
            </div>

            {/* Results Section - Matches User Table Image */}
            {showResults && result && (
                <div className="space-y-8 animate-fadeIn">

                    {/* Soil Data */}
                    <Section title={t('soil_data')}>
                        <Table headers={[t('soil_type'), t('characteristics')]}
                            rows={[[t(result.label), t(result.data.characteristics)]]} />
                    </Section>

                    {/* Water Data */}
                    <Section title={t('water_data')}>
                        <Table headers={[t('soil_type'), t('water_req')]}
                            rows={[[t(result.label), t(result.data.water)]]} />
                    </Section>

                    {/* Weather Data */}
                    <Section title={t('weather_data')}>
                        <Table headers={[t('soil_type'), t('suitable_weather')]}
                            rows={[[t(result.label), t(result.data.weather)]]} />
                    </Section>

                    {/* Varieties */}
                    <Section title={t('varieties')}>
                        <Table headers={[t('soil_type'), t('varieties')]}
                            rows={[[t(result.label), t(result.data.varieties)]]} />
                    </Section>

                    {/* Diseases */}
                    <Section title={t('common_diseases')}>
                        <Table headers={[t('soil_type'), t('common_diseases')]}
                            rows={[[t(result.label), t(result.data.diseases)]]} />
                    </Section>

                </div>
            )}
        </div>
    );
};

const Section = ({ title, children }) => (
    <div>
        <h4 className="text-xl font-bold text-gray-800 mb-3">{title}</h4>
        {children}
    </div>
);

const Table = ({ headers, rows }) => (
    <div className="border border-gray-300 rounded overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-200 border-b border-gray-300">
                    {headers.map((h, i) => (
                        <th key={i} className={`py-2 px-4 font-bold text-gray-800 ${i === 0 ? 'w-1/3 border-r border-gray-300' : ''}`}>
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="bg-white">
                        {row.map((cell, j) => (
                            <td key={j} className={`py-3 px-4 text-gray-700 ${j === 0 ? 'border-r border-gray-300' : ''} border-b border-gray-200 last:border-b-0`}>
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default KnowledgeBase;
