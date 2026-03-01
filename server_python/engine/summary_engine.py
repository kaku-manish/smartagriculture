level_map_te = {
    'CRITICAL': 'అత్యంత ప్రమాదకరం',
    'HIGH': 'ప్రమాదకరం',
    'MEDIUM': 'మధ్యస్థం',
    'LOW': 'తక్కువ'
}

disease_map_te = {
    'Blast': 'అగ్గి తెగులు',
    'Blight': 'ఎండు తెగులు',
    'Tungro': 'టుంగ్రో తెగులు',
    'Brown Spot': 'గోధుమ రంగు మచ్చ తెగులు'
}

class SummaryEngine:
    def _en_short(self, disease: str, level: str) -> str:
        return f"🌾 PaddyPulse Alert: {level} risk of {disease} detected. Immediate action recommended."

    def _en_long(self, data: dict) -> str:
        reasons = ", ".join(data.get('reasons', []))
        return (f"🌾 *PaddyPulse Health Advisory* 🌾\n\n"
                f"📍 *Field Status:* {data.get('risk_level')} Risk ({data.get('risk_score')}/100)\n"
                f"🦠 *Disease:* {data.get('disease')}\n"
                f"🗺️ *Affected Zones:* {data.get('zones_count')} zones showing pressure\n\n"
                f"✅ *Action Plan:* Spray {data.get('treatment')} ({data.get('dosage')})\n"
                f"⏰ *Spraying Window:* {data.get('spray_window')}\n\n"
                f"💡 *Why:* {reasons}\n\n"
                f"⚠️ Avoid spraying if rain is expected in 2 hours.")

    def _te_short(self, disease: str, level: str) -> str:
        return f"🌾 వరి హెచ్చరిక: మీ పొలంలో {disease} ఆశించే అవకాశం {level} గా ఉంది. వెంటనే తగిన చర్యలు తీసుకోగలరు."

    def _te_long(self, data: dict) -> str:
        reasons = ", ".join(data.get('reasons_te', []))
        return (f"🌾 *వరి ఆరోగ్య సలహా* 🌾\n\n"
                f"📍 *పొలం స్థితి:* {data.get('risk_level_te')} ప్రమాదం ({data.get('risk_score')}/100)\n"
                f"🦠 *తెగులు:* {data.get('disease_te')}\n"
                f"🗺️ *ప్రభావిత ప్రాంతాలు:* {data.get('zones_count')} జోన్లు\n\n"
                f"✅ *చేయవలసిన పని:* {data.get('treatment')} ({data.get('dosage')}) పిచికారీ చేయండి\n"
                f"⏰ *మంచి సమయం:* {data.get('spray_window')}\n\n"
                f"💡 *కారణాలు:* {reasons}\n\n"
                f"⚠️ రాబోయే 2 గంటల్లో వర్షం కురిసే అవకాశం ఉంటే పిచికారీ చేయకండి.")

    def generate(self, data: dict) -> dict:
        risk_level = data.get('risk_level', 'LOW')
        disease = data.get('disease', 'Unknown')
        
        en_short = self._en_short(disease, risk_level)
        en_long = self._en_long(data)

        # Prepare te data
        te_data = data.copy()
        te_data['risk_level_te'] = level_map_te.get(risk_level, risk_level)
        te_data['disease_te'] = disease_map_te.get(disease, disease)
        te_data['reasons_te'] = data.get('reasons_te') or data.get('reasons', [])

        te_short = self._te_short(te_data['disease_te'], te_data['risk_level_te'])
        te_long = self._te_long(te_data)

        return {
            "english_text_short": en_short,
            "english_text_long": en_long,
            "telugu_text_short": te_short,
            "telugu_text_long": te_long
        }

summary_engine = SummaryEngine()
