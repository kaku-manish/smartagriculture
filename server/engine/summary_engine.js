/**
 * Farmer Summary Generator Engine
 * Produces multilingual summaries for WhatsApp and detailed advisory.
 */

const translations = {
    en: {
        short_template: (disease, level) => `🌾 PaddyPulse Alert: ${level} risk of ${disease} detected. Immediate action recommended.`,
        long_template: (data) => `🌾 *PaddyPulse Health Advisory* 🌾\n\n` +
            `📍 *Field Status:* ${data.risk_level} Risk (${data.risk_score}/100)\n` +
            `🦠 *Disease:* ${data.disease}\n` +
            `🗺️ *Affected Zones:* ${data.zones_count} zones showing pressure\n\n` +
            `✅ *Action Plan:* Spray ${data.treatment} (${data.dosage})\n` +
            `⏰ *Spraying Window:* ${data.spray_window}\n\n` +
            `💡 *Why:* ${data.reasons.join(', ')}\n\n` +
            `⚠️ Avoid spraying if rain is expected in 2 hours.`
    },
    te: {
        short_template: (disease, level) => `🌾 వరి హెచ్చరిక: మీ పొలంలో ${disease} ఆశించే అవకాశం ${level} గా ఉంది. వెంటనే తగిన చర్యలు తీసుకోగలరు.`,
        long_template: (data) => `🌾 *వరి ఆరోగ్య సలహా* 🌾\n\n` +
            `📍 *పొలం స్థితి:* ${data.risk_level} ప్రమాదం (${data.risk_score}/100)\n` +
            `🦠 *తెగులు:* ${data.disease}\n` +
            `🗺️ *ప్రభావిత ప్రాంతాలు:* ${data.zones_count} జోన్లు\n\n` +
            `✅ *చేయవలసిన పని:* ${data.treatment} (${data.dosage}) పిచికారీ చేయండి\n` +
            `⏰ *మంచి సమయం:* ${data.spray_window}\n\n` +
            `💡 *కారణాలు:* ${data.reasons_te.join(', ')}\n\n` +
            `⚠️ రాబోయే 2 గంటల్లో వర్షం కురిసే అవకాశం ఉంటే పిచికారీ చేయకండి.`
    }
};

const levelMapTe = {
    'CRITICAL': 'అత్యంత ప్రమాదకరం',
    'HIGH': 'ప్రమాదకరం',
    'MEDIUM': 'మధ్యస్థం',
    'LOW': 'తక్కువ'
};

const diseaseMapTe = {
    'Blast': 'అగ్గి తెగులు',
    'Blight': 'ఎండు తెగులు',
    'Tungro': 'టుంగ్రో తెగులు',
    'Brown Spot': 'గోధుమ రంగు మచ్చ తెగులు'
};

class SummaryEngine {
    generate(data) {
        const enShort = translations.en.short_template(data.disease, data.risk_level);
        const enLong = translations.en.long_template(data);

        // Prepare te data
        const teData = {
            ...data,
            risk_level: levelMapTe[data.risk_level] || data.risk_level,
            disease: diseaseMapTe[data.disease] || data.disease,
            reasons_te: data.reasons_te || data.reasons // fallback if no specific te reasons
        };

        const teShort = translations.te.short_template(teData.disease, teData.risk_level);
        const teLong = translations.te.long_template(teData);

        return {
            english_text_short: enShort,
            english_text_long: enLong,
            telugu_text_short: teShort,
            telugu_text_long: teLong
        };
    }
}

module.exports = new SummaryEngine();
