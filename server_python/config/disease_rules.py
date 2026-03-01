weights = {
    "disease_pressure": 0.5,
    "weather_risk": 0.25,
    "soil_stress": 0.15,
    "history_trend": 0.1
}

thresholds = {
    "low": 30,
    "medium": 60,
    "high": 80,
    "critical": 90
}

crop_stage_multipliers = {
    "seedling": 1.2,
    "tillering": 1.0,
    "panicle": 1.5,
    "flowering": 1.8,
    "maturity": 0.8
}

rules = {
    "blast": {
        "organic": "Neem Oil 5ml/L",
        "chemical": "Tricyclazole 75 WP",
        "chemical_dosage": 120,
        "severe_chemical": "Isoprothiolane 40 EC",
        "severe_dosage": 300,
        "dosage_base": 200
    },
    "hispa": {
        "organic": "Beauveria bassiana",
        "chemical": "Chlorpyriphos 20 EC",
        "chemical_dosage": 500,
        "severe_chemical": "Profenophos 50 EC",
        "severe_dosage": 400,
        "dosage_base": 150
    },
    "stem_borer": {
        "organic": "Pheromone Traps",
        "chemical": "Cartap Hydrochloride 50 SP",
        "chemical_dosage": 400,
        "severe_chemical": "Fipronil 5 SC",
        "severe_dosage": 400,
        "dosage_base": 180
    },
    "brown_spot": {
        "organic": "Pseudomonas fluorescens",
        "chemical": "Mancozeb 75 WP",
        "chemical_dosage": 600,
        "severe_chemical": "Carbendazim 50 WP",
        "severe_dosage": 200,
        "dosage_base": 200
    },
    "bacterial_blight": {
        "organic": "Fresh Cow Dung Slurry",
        "chemical": "Streptocycline",
        "chemical_dosage": 6,
        "severe_chemical": "Copper Oxychloride",
        "severe_dosage": 500,
        "dosage_base": 200
    }
}

constraints = {
    "max_wind_speed_kph": 15,
    "min_rain_free_hours": 6,
    "max_temp_c": 32,
    "min_temp_c": 10,
    "min_humidity_percent": 40
}
