import { YieldPredictionChart } from '../../components/Dashboard/FarmerDashboard';
import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { cn } from '../../utils/cn';
import { useState } from 'react';

const MOCK_YIELD_PREDICTIONS = [
  { year: '2020', predicted: 6.2, actual: 6.0, confidence: 85 },
  { year: '2021', predicted: 6.8, actual: 7.1, confidence: 88 },
  { year: '2022', predicted: 7.3, actual: 7.0, confidence: 90 },
  { year: '2023', predicted: 7.8, actual: 8.0, confidence: 92 },
  { year: '2024', predicted: 8.2, actual: 8.1, confidence: 91 },
  { year: '2025', predicted: 8.7, confidence: 89, lowerBound: 8.0, upperBound: 9.4 },
  { year: '2026', predicted: 9.1, confidence: 87, lowerBound: 8.3, upperBound: 9.9 },
];

const FIELD_OPTIONS = [
  { value: 'field-1', label: 'North Field - Wheat' },
  { value: 'field-2', label: 'South Field - Corn' },
  { value: 'field-3', label: 'East Field - Soybean' },
  { value: 'field-4', label: 'West Field - Barley' },
];

export function YieldPredictionPage() {
  const [selectedField, setSelectedField] = useState('field-1');
  const [forecastYears, setForecastYears] = useState(5);
  const [runningModel, setRunningModel] = useState(false);

  const handleRunModel = async () => {
    setRunningModel(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRunningModel(false);
  };

  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">Yield Forecast</h1>
          <p className="text-body text-fg-muted mt-1">AI-powered yield predictions based on historical data and current conditions</p>
        </div>
        <Button variant="primary" onClick={handleRunModel} loading={runningModel} leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>} >
          Run Prediction
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card variant="glass" padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-body font-semibold text-fg-primary">Yield Prediction Chart</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-body-xs text-fg-muted">Forecast Years:</label>
                  <select
                    value={forecastYears.toString()}
                    onChange={(e) => setForecastYears(parseInt(e.target.value))}
                    className={cn(
                      'bg-input-bg border-input-border text-input-fg rounded-input',
                      'input-padding pr-8 appearance-none',
                      'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg',
                      'w-32'
                    )}
                  >
                    <option value="3">3 Years</option>
                    <option value="5">5 Years</option>
                    <option value="7">7 Years</option>
                    <option value="10">10 Years</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-body-xs text-fg-muted">Field:</label>
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className={cn(
                      'bg-input-bg border-input-border text-input-fg rounded-input',
                      'input-padding pr-8 appearance-none',
                      'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg',
                      'w-48'
                    )}
                  >
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <YieldPredictionChart
              data={MOCK_YIELD_PREDICTIONS}
              height={400}
              showConfidenceInterval
            />
          </Card>

          <Card variant="glass" padding="md">
            <h3 className="text-body font-semibold text-fg-primary mb-4">Model Details & Factors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-bg-tertiary/50 rounded-xl">
                <h4 className="text-body-sm font-medium text-fg-secondary mb-2">Key Influencing Factors</h4>
                <ul className="space-y-2 text-body-xs text-fg-muted">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Soil moisture trends (30%)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Temperature patterns (25%)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-500" /> Historical yields (20%)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Satellite NDVI (15%)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500" /> Weather forecast (10%)</li>
                </ul>
              </div>
              <div className="p-4 bg-bg-tertiary/50 rounded-xl">
                <h4 className="text-body-sm font-medium text-fg-secondary mb-2">Model Performance</h4>
                <div className="space-y-2 text-body-xs">
                  <div className="flex justify-between"><span className="text-fg-muted">MAE</span><span className="text-fg-primary font-semibold">0.32 t/ha</span></div>
                  <div className="flex justify-between"><span className="text-fg-muted">RMSE</span><span className="text-fg-primary font-semibold">0.41 t/ha</span></div>
                  <div className="flex justify-between"><span className="text-fg-muted">R² Score</span><span className="text-fg-primary font-semibold">0.94</span></div>
                  <div className="flex justify-between"><span className="text-fg-muted">MAPE</span><span className="text-fg-primary font-semibold">4.2%</span></div>
                </div>
              </div>
              <div className="p-4 bg-bg-tertiary/50 rounded-xl">
                <h4 className="text-body-sm font-medium text-fg-secondary mb-2">Recommendations</h4>
                <ul className="space-y-2 text-body-xs text-fg-muted">
                  <li className="flex items-start gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" /> Increase irrigation in weeks 3-5</li>
                  <li className="flex items-start gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" /> Apply nitrogen fertilizer at V6 stage</li>
                  <li className="flex items-start gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5" /> Monitor for pest pressure in June</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="glass" padding="md">
            <h3 className="text-body font-semibold text-fg-primary mb-4">Current Season Forecast</h3>
            <div className="space-y-4">
              {[
                { label: 'Expected Yield', value: '8.7 t/ha', trend: '+8.2%' },
                { label: 'Confidence Interval', value: '8.0 - 9.4 t/ha', trend: '95% CI' },
                { label: 'Harvest Window', value: 'Jul 15 - Aug 5', trend: '21 days' },
                { label: 'Quality Score', value: '92/100', trend: '+3 pts' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-bg-tertiary/50 flex items-center justify-between">
                  <div>
                    <p className="text-body-xs text-fg-muted">{item.label}</p>
                    <p className="text-body font-semibold text-fg-primary">{item.value}</p>
                  </div>
                  <span className={cn('text-body-xs font-medium px-2 py-0.5 rounded-full', item.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyan-500/10 text-cyan-500')}>
                    {item.trend}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" padding="md">
            <h3 className="text-body font-semibold text-fg-primary mb-4">Risk Assessment</h3>
            <div className="space-y-3">
              {[
                { risk: 'Drought Stress', probability: 'Low', impact: 'High', color: 'emerald' },
                { risk: 'Pest Infestation', probability: 'Medium', impact: 'Medium', color: 'amber' },
                { risk: 'Disease Outbreak', probability: 'Low', impact: 'High', color: 'emerald' },
                { risk: 'Market Price Drop', probability: 'Medium', impact: 'Low', color: 'amber' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-bg-tertiary/50 flex items-center justify-between">
                  <span className="text-body-sm font-medium text-fg-secondary">{item.risk}</span>
                  <div className="flex items-center gap-3 text-body-xs">
                    <span className={cn('font-medium px-2 py-0.5 rounded-full', `bg-${item.color}-500/10 text-${item.color}-500`)}>
                      {item.probability}
                    </span>
                    <span className="text-fg-muted">Impact: {item.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

YieldPredictionPage.displayName = 'YieldPredictionPage';