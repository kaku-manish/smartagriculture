module.exports = {
    // Weights for Overall Risk Calculation (Must sum to 1.0)
    weights: {
        disease_pressure: 0.5, // DSS
        weather_risk: 0.25,    // WRI
        soil_stress: 0.15,     // SSI
        history_trend: 0.1     // HTF
    },

    // Disease severity thresholds (0-100 scale)
    thresholds: {
        low: 30,
        medium: 60,
        high: 80,
        critical: 90
    },

    // Crop Stage Vulnerability Multipliers
    crop_stage_multipliers: {
        seedling: 1.2,
        tillering: 1.0,
        panicle: 1.5,
        flowering: 1.8,
        maturity: 0.8
    },

    // Treatment Rules
    rules: {
        blast: {
            organic: "Neem Oil 5ml/L",
            chemical: "Tricyclazole 75 WP",
            chemical_dosage: 120, // g/acre (example)
            severe_chemical: "Isoprothiolane 40 EC",
            severe_dosage: 300, // ml/acre
            dosage_base: 200 // Liters of solution per acre (water volume)
        },
        hispa: {
            organic: "Beauveria bassiana",
            chemical: "Chlorpyriphos 20 EC",
            chemical_dosage: 500, // ml/acre
            severe_chemical: "Profenophos 50 EC",
            severe_dosage: 400, // ml/acre
            dosage_base: 150
        },
        stem_borer: {
            organic: "Pheromone Traps",
            chemical: "Cartap Hydrochloride 50 SP",
            chemical_dosage: 400, // g/acre
            severe_chemical: "Fipronil 5 SC",
            severe_dosage: 400, // ml/acre
            dosage_base: 180
        },
        brown_spot: {
            organic: "Pseudomonas fluorescens",
            chemical: "Mancozeb 75 WP",
            chemical_dosage: 600, // g/acre
            severe_chemical: "Carbendazim 50 WP",
            severe_dosage: 200, // g/acre
            dosage_base: 200
        },
        bacterial_blight: {
            organic: "Fresh Cow Dung Slurry",
            chemical: "Streptocycline",
            chemical_dosage: 6, // g/acre
            severe_chemical: "Copper Oxychloride",
            severe_dosage: 500, // g/acre
            dosage_base: 200
        }
    },

    // Application Constraints
    constraints: {
        max_wind_speed_kph: 15, // Do not spray above this
        min_rain_free_hours: 6, // Need dry window after spray
        max_temp_c: 32,         // Avoid high evaporation/burn
        min_temp_c: 10,
        min_humidity_percent: 40 // Too dry = evaporation
    }
};
