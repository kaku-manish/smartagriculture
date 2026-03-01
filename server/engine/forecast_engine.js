/**
 * Forecast Engine using Double Exponential Smoothing (Holt's Linear Trend)
 * Predicts the next N steps of disease severity.
 */

class ForecastEngine {
    /**
     * @param {Array} data - Array of severity scores (numbers)
     * @param {number} forecastSteps - How many steps to predict
     * @param {Object} options - { alpha: 0.3, beta: 0.1 }
     */
    forecast(data, forecastSteps = 7, options = {}) {
        if (data.length < 2) return this.generateFallback(data, forecastSteps);

        const alpha = options.alpha || 0.4; // Level smoothing
        const beta = options.beta || 0.2;   // Trend smoothing

        // Initial values
        let level = data[0];
        let trend = data[1] - data[0];

        const history = data.map((val, i) => {
            const lastLevel = level;
            level = alpha * val + (1 - alpha) * (level + trend);
            trend = beta * (level - lastLevel) + (1 - beta) * trend;
            return {
                index: i,
                actual: val,
                predicted: Math.max(0, Math.min(100, Math.round(level + trend)))
            };
        });

        const predictions = [];
        const lastActualDate = new Date();

        for (let i = 1; i <= forecastSteps; i++) {
            const yhat = Math.round(level + (i * trend));
            const bound = 5 + (i * 2); // Increasing uncertainty bound

            const forecastDate = new Date();
            forecastDate.setDate(lastActualDate.getDate() + i);

            predictions.push({
                date: forecastDate.toISOString().split('T')[0],
                yhat: Math.max(0, Math.min(100, yhat)),
                yhat_lower: Math.max(0, Math.min(100, yhat - bound)),
                yhat_upper: Math.max(0, Math.min(100, yhat + bound))
            });
        }

        // Determine Cross-Date for HIGH RISK (75)
        const highRiskThreshold = 75;
        const crossEvent = predictions.find(p => p.yhat >= highRiskThreshold);

        return {
            history,
            predictions,
            highRiskDate: crossEvent ? crossEvent.date : null,
            summary: trend > 0
                ? `Severely increasing trend detected (${Math.round(trend)} pts/day).`
                : "Conditions appear stable with no immediate outbreak predicted."
        };
    }

    generateFallback(data, steps) {
        const lastVal = data[data.length - 1] || 0;
        const predictions = [];
        for (let i = 1; i <= steps; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            predictions.push({
                date: d.toISOString().split('T')[0],
                yhat: lastVal,
                yhat_lower: Math.max(0, lastVal - 5),
                yhat_upper: Math.min(100, lastVal + 5)
            });
        }
        return { history: [], predictions, highRiskDate: null, summary: "Insufficient data for trend analysis. Showing steady-state forecast." };
    }
}

module.exports = new ForecastEngine();
