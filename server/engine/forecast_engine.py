import math
import datetime

class ForecastEngine:
    def forecast(self, data: list, forecast_steps: int = 7, options: dict = None):
        if options is None: options = {}
        if len(data) < 2:
            return self.generate_fallback(data, forecast_steps)

        alpha = options.get("alpha", 0.4)
        beta = options.get("beta", 0.2)

        level = data[0]
        trend = data[1] - data[0]

        history = []
        for i, val in enumerate(data):
            last_level = level
            level = alpha * val + (1 - alpha) * (level + trend)
            trend = beta * (level - last_level) + (1 - beta) * trend
            history.append({
                "index": i,
                "actual": val,
                "predicted": max(0, min(100, round(level + trend)))
            })

        predictions = []
        last_actual_date = datetime.datetime.now()

        for i in range(1, forecast_steps + 1):
            yhat = round(level + (i * trend))
            bound = 5 + (i * 2)

            forecast_date = last_actual_date + datetime.timedelta(days=i)
            predictions.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "yhat": max(0, min(100, yhat)),
                "yhat_lower": max(0, min(100, yhat - bound)),
                "yhat_upper": max(0, min(100, yhat + bound))
            })

        high_risk_threshold = 75
        cross_event = next((p for p in predictions if p["yhat"] >= high_risk_threshold), None)

        if trend > 0:
            summary = f"Severely increasing trend detected ({round(trend)} pts/day)."
        else:
            summary = "Conditions appear stable with no immediate outbreak predicted."

        return {
            "history": history,
            "predictions": predictions,
            "highRiskDate": cross_event["date"] if cross_event else None,
            "summary": summary
        }

    def generate_fallback(self, data, steps):
        last_val = data[-1] if data else 0
        predictions = []
        now = datetime.datetime.now()
        for i in range(1, steps + 1):
            d = now + datetime.timedelta(days=i)
            predictions.append({
                "date": d.strftime("%Y-%m-%d"),
                "yhat": last_val,
                "yhat_lower": max(0, last_val - 5),
                "yhat_upper": min(100, last_val + 5)
            })
        return {
            "history": [],
            "predictions": predictions,
            "highRiskDate": None,
            "summary": "Insufficient data for trend analysis. Showing steady-state forecast."
        }

forecast_engine = ForecastEngine()
