import os
import time
import logging
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

logger = logging.getLogger("agro-backend")

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
REPORTS_DIR = UPLOADS_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# ── Source-type label mapping ─────────────────────────────────────────────────
# Maps the sourceType field value → human-readable view label used in the PDF.
SOURCE_TYPE_LABELS = {
    "manual": "Manual View",
    "live":   "Live Camera View",
    "drone":  "Drone View",
}
DEFAULT_SOURCE_TYPE = "manual"


def get_analyzed_view_label(language: str, source_type: str) -> str:
    """Return the correct 'AI Vision: Analyzed X View' string for the PDF."""
    # Validate and normalise source_type; fall back to 'manual' if unrecognised.
    normalised = source_type.strip().lower() if source_type else DEFAULT_SOURCE_TYPE
    view_label = SOURCE_TYPE_LABELS.get(normalised, SOURCE_TYPE_LABELS[DEFAULT_SOURCE_TYPE])

    if language == "te":
        # Telugu: keep the existing pattern but swap the view label
        return f"AI దృష్టి: {view_label}"
    return f"AI Vision: Analyzed {view_label}"


translations = {
    "en": {
        "title": "Paddy Health & Disease Report",
        "date": "Date",
        "field": "Field",
        "risk_score": "Risk Score",
        "dominant_disease": "Dominant Disease",
        "severity": "Severity",
        "status": "Status",
        "where_problem": "Where is the problem? (Infection Map)",
        "what_to_do": "What to do now? (Recommendations)",
        "action": "Action",
        "treatment": "Treatment",
        "dosage": "Dosage",
        "spray_window": "Best Spray Time",
        "why_suggestion": "Why this suggestion?",
        "safety_note": "Safety Note",
        "cost_breakdown": "Financial: Cost Estimation Breakdown",
        "medicine": "Recommended Medicine",
        "total_cost": "Total Application Cost (Est.)",
        "levels": {
            "CRITICAL": "CRITICAL",
            "HIGH": "HIGH",
            "MEDIUM": "MEDIUM",
            "LOW": "LOW"
        }
    },
    "te": {
        "title": "వరి ఆరోగ్యం మరియు తెగులు నివేదిక",
        "date": "తేదీ",
        "field": "పొలం",
        "risk_score": "ప్రమాద స్థాయి",
        "dominant_disease": "ప్రధాన తెగులు",
        "severity": "తీవ్రత",
        "status": "స్థితి",
        "where_problem": "సమస్య ఎక్కడ ఉంది? (మ్యాప్)",
        "what_to_do": "ఇప్పుడు ఏమి చేయాలి? (సూచనలు)",
        "action": "చేయవలసిన పని",
        "treatment": "చికిత్స",
        "dosage": "మోతాదు",
        "spray_window": "పిచికారీ చేయడానికి ఉత్తమ సమయం",
        "why_suggestion": "ఈ సూచన ఎందుకు?",
        "safety_note": "భద్రతా గమనిక",
        "cost_breakdown": "ఖర్చు అంచనా వివరాలు",
        "medicine": "సిఫార్సు చేయబడిన మందు",
        "total_cost": "మొత్తం ఖర్చు (అంచనా)",
        "levels": {
            "CRITICAL": "అత్యంత ప్రమాదకరం",
            "HIGH": "ప్రమాదకరం",
            "MEDIUM": "మధ్యస్థం",
            "LOW": "తక్కువ"
        }
    }
}

class ReportEngine:
    def resolve_image_path(self, raw_path: str) -> str | None:
        """Resolve an image path stored in the DB.
        Handles absolute Windows paths, relative paths, and just filenames.
        Searches both old 'server/uploads' and new 'server_python/uploads' dirs."""
        if not raw_path:
            return None
        
        # Normalize to forward slashes and extract just the filename
        normalized = raw_path.replace('\\', '/')
        filename = normalized.split('/')[-1]
        
        # Candidate paths to check (in priority order)
        candidates = [
            raw_path,                                          # 1. Direct absolute path
            str(UPLOADS_DIR / filename),                       # 2. server/uploads/<filename>
        ]
        
        for candidate in candidates:
            if os.path.exists(candidate):
                logger.info(f"✅ Resolved image: {candidate}")
                return candidate
        
        logger.warning(f"⚠️ Image not found in any location: {filename}")
        return None

    async def generate_pdf(self, data: dict, language: str = 'en', source_type: str = DEFAULT_SOURCE_TYPE) -> dict:
        t = translations.get(language, translations['en'])
        report_id = f"report_{int(time.time() * 1000)}"
        file_path = REPORTS_DIR / f"{report_id}.pdf"
        
        c = canvas.Canvas(str(file_path), pagesize=A4)
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(A4[0] / 2.0, 800, t["title"])
        
        c.setFont("Helvetica", 12)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        date_str = time.strftime("%m/%d/%Y")
        field_name = data.get("field_name", "My Farm")
        c.drawCentredString(A4[0] / 2.0, 770, f"{t['date']}: {date_str} | {t['field']}: {field_name}")
        
        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.line(50, 750, A4[0] - 50, 750)
        
        # Risk Section
        risk_level = data.get("risk_level", "LOW")
        score = data.get("risk_score", 0)
        
        c.setFont("Helvetica-Bold", 18)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.drawString(50, 710, f"{t['risk_score']}: ")
        
        colors = {
            "CRITICAL": (0.84, 0.19, 0.19),
            "HIGH": (0.88, 0.44, 0.33),
            "MEDIUM": (0.99, 0.8, 0.43),
            "LOW": (0, 0.72, 0.58)
        }
        r, g, b = colors.get(risk_level, colors["LOW"])
        c.setFillColorRGB(r, g, b)
        c.drawString(160, 710, f"{score}/100 ({t['levels'].get(risk_level, risk_level)})")
        
        c.setFont("Helvetica", 14)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.drawString(50, 680, f"{t['dominant_disease']}: {data.get('dominant_disease', 'None Detected')}")
        
        # Analyzed Image View — label depends on sourceType
        analyzed_view_label = get_analyzed_view_label(language, source_type)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 640, analyzed_view_label)
        y_cursor = 610
        
        # Try annotated image first, then fallback to original image_reference
        raw_annotated = data.get('annotated_image')
        raw_original = data.get('image_reference')
        
        image_path = self.resolve_image_path(raw_annotated) or self.resolve_image_path(raw_original)
        
        if image_path:
            try:
                c.drawImage(image_path, 50, y_cursor - 200, width=500, height=200, preserveAspectRatio=True)
                y_cursor -= 210
                logger.info(f"✅ Drew image in PDF: {image_path}")
            except Exception as e:
                logger.warning(f"Failed to draw image to PDF: {e}")
                c.setFont("Helvetica", 11)
                c.setFillColorRGB(0.6, 0.6, 0.6)
                c.drawString(60, y_cursor - 20, "[Image could not be rendered in PDF]")
                y_cursor -= 30
        else:
            c.setFont("Helvetica", 11)
            c.setFillColorRGB(0.6, 0.6, 0.6)
            c.drawString(60, y_cursor - 20, "[No analyzed image available]")
            y_cursor -= 30

        # Recommendations
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y_cursor - 30, t['what_to_do'])
        
        rec = data.get('recommendation', {})
        c.setFont("Helvetica", 12)
        c.drawString(60, y_cursor - 60, f"• {t['action']}: {rec.get('action', 'Monitoring')}")
        
        treatment = rec.get('treatment', {}).get('product_name', 'Tricyclazole 75% WP') if isinstance(rec, dict) and rec.get('treatment') else 'Tricyclazole 75% WP'
        dosage = rec.get('treatment', {}).get('dosage_per_acre', '120g in 200L water') if isinstance(rec, dict) and rec.get('treatment') else '120g in 200L water'
        
        try:
            sw_list = rec.get('best_spray_window', [])
            spray_window = sw_list[0].get('time', '06:00 AM - 09:00 AM') if sw_list else '06:00 AM - 09:00 AM'
        except:
            spray_window = '06:00 AM - 09:00 AM'
            
        c.drawString(60, y_cursor - 80, f"• {t['treatment']}: {treatment}")
        c.drawString(60, y_cursor - 100, f"• {t['dosage']}: {dosage}")
        c.drawString(60, y_cursor - 120, f"• {t['spray_window']}: {spray_window}")
        
        c.save()
        return {"reportId": report_id, "filePath": str(file_path)}

    async def generate_whatsapp_cards(self, data: dict, language: str = 'en') -> dict:
        t = translations.get(language, translations['en'])
        card_id = f"card_{int(time.time() * 1000)}"
        portrait_id = f"portrait_{int(time.time() * 1000)}"
        square_path = REPORTS_DIR / f"{card_id}.png"
        portrait_path = REPORTS_DIR / f"{portrait_id}.png"
        
        score = data.get("risk_score", 0)
        risk_color = (214, 48, 49) if score > 70 else ((225, 112, 85) if score > 40 else (0, 184, 148))
        disease_name = data.get("dominant_disease", "N/A")
        field_name = data.get("field_name", "My Farm")
        
        # Resolve the analyzed farm image (annotated -> original fallback)
        crop_image_path = (
            self.resolve_image_path(data.get('annotated_image')) or
            self.resolve_image_path(data.get('image_reference'))
        )
        
        try:
            try:
                font_title = ImageFont.truetype("arialbd.ttf", 52)
                font_score = ImageFont.truetype("arialbd.ttf", 130)
                font_text  = ImageFont.truetype("arial.ttf", 36)
                font_small = ImageFont.truetype("arial.ttf", 28)
            except IOError:
                font_title = ImageFont.load_default()
                font_score = ImageFont.load_default()
                font_text  = ImageFont.load_default()
                font_small = ImageFont.load_default()

            # ── Square card (1080x1080) ──
            img = Image.new("RGB", (1080, 1080), (245, 246, 250))
            draw = ImageDraw.Draw(img)

            draw.rectangle([0, 0, 1080, 220], fill=risk_color)
            draw.text((540, 115), t["title"].encode("latin1", "ignore").decode("latin1"),
                      font=font_title, fill="white", anchor="mm")
            draw.text((540, 178), field_name.encode("latin1", "ignore").decode("latin1"),
                      font=font_small, fill="white", anchor="mm")

            # Place crop image on right half if available
            if crop_image_path:
                try:
                    ci = Image.open(crop_image_path).convert("RGB")
                    ci.thumbnail((530, 490))
                    img_x = 1080 - ci.width - 10
                    img_y = 235
                    img.paste(ci, (img_x, img_y))
                    draw.text((img_x + ci.width // 2, img_y + ci.height + 14),
                              "AI Analyzed View", font=font_small, fill=(120, 120, 120), anchor="mm")
                except Exception as e:
                    logger.warning(f"Card image embed failed: {e}")

            # Left: Score + disease
            draw.text((35, 300),  str(round(score)), font=font_score, fill=risk_color, anchor="la")
            draw.text((35, 455),  t["risk_score"].encode("latin1","ignore").decode("latin1"),
                      font=font_text, fill=(80, 80, 80), anchor="la")
            draw.text((35, 510),  f"Disease: {disease_name.encode('latin1','ignore').decode('latin1')}",
                      font=font_text, fill=(60, 60, 60), anchor="la")

            draw.rectangle([0, 1020, 1080, 1080], fill=(225, 225, 225))
            draw.text((540, 1050), "Generated by PaddyPulse AI",
                      font=font_small, fill=(150, 150, 150), anchor="mm")

            img.save(square_path)

            # ── Portrait card (1080x1920) ──
            img_p = Image.new("RGB", (1080, 1920), (241, 242, 246))
            draw_p = ImageDraw.Draw(img_p)
            draw_p.rectangle([0, 0, 1080, 400], fill=risk_color)
            draw_p.text((540, 200), t["title"].encode("latin1","ignore").decode("latin1"),
                        font=font_title, fill="white", anchor="mm")
            draw_p.text((540, 315), field_name.encode("latin1","ignore").decode("latin1"),
                        font=font_small, fill="white", anchor="mm")

            draw_p.ellipse([290, 470, 790, 970], fill="white")
            draw_p.text((540, 720), str(round(score)), font=font_score, fill=risk_color, anchor="mm")
            draw_p.text((540, 875), t["risk_score"].encode("latin1","ignore").decode("latin1"),
                        font=font_text, fill=(80, 80, 80), anchor="mm")

            if crop_image_path:
                try:
                    ci_p = Image.open(crop_image_path).convert("RGB")
                    ci_p.thumbnail((960, 500))
                    px = (1080 - ci_p.width) // 2
                    img_p.paste(ci_p, (px, 1030))
                    draw_p.text((540, 1030 + ci_p.height + 22),
                                "AI Analyzed View", font=font_small, fill=(120, 120, 120), anchor="mm")
                except Exception:
                    pass

            draw_p.text((540, 1885), "Generated by PaddyPulse AI",
                        font=font_small, fill=(180, 180, 180), anchor="mm")
            img_p.save(portrait_path)

        except Exception as e:
            logger.error(f"Image Card Error: {e}")
            
        return {"cardId": card_id, "portraitId": portrait_id, "squarePath": str(square_path), "portraitPath": str(portrait_path)}

report_engine = ReportEngine()
