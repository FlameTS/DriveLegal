import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Route, MapPin, Printer, ShieldAlert, CheckSquare, Clock, Car, Bike } from 'lucide-react';

interface Conflict {
  type: string;
  message: string;
  severity: string;
}

interface TravelData {
  from_city: string;
  to_city: string;
  states_crossed: string[];
  documents_required: string[];
  speed_limits: Record<string, number>;
  rules_by_state: Record<string, string[]>;
  conflicts: Conflict[];
}

export const TravelPage: React.FC = () => {
  const { t } = useLanguage();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<TravelData | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCity.trim() || !toCity.trim()) return;

    setLoading(true);
    setError(null);
    setRouteData(null);

    try {
      const response = await fetch('http://localhost:8000/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_city: fromCity,
          to_city: toCity,
          vehicle_type: vehicleType
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to analyze route guidelines');
      }

      const data = await response.json();
      setRouteData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with travel server');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('travelChecker')}</h1>
        <p>{t('travelCheckerDesc')}</p>
      </div>

      {/* Inputs card */}
      <div className="card" style={{ maxWidth: '700px', margin: '0 auto 2rem', padding: '1.5rem' }}>
        <form onSubmit={handleSearch}>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{t('fromCity')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Bhopal"
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('toCity')}</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pune"
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
            <button
              type="button"
              className={`btn ${vehicleType === 'motorcycle' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setVehicleType('motorcycle')}
            >
              <Bike size={18} />
              {t('motorcycle')}
            </button>
            <button
              type="button"
              className={`btn ${vehicleType === 'car' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setVehicleType('car')}
            >
              <Car size={18} />
              {t('car')}
            </button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            <Route size={18} />
            {loading ? 'Analyzing Travel Route...' : t('checkRoute')}
          </button>
        </form>
      </div>

      {error && (
        <div className="conflict-card" style={{ maxWidth: '700px', margin: '0 auto 2rem' }}>
          <div className="conflict-header">
            <ShieldAlert size={18} />
            Route Mapping Error
          </div>
          <p>{error}</p>
        </div>
      )}

      {/* Results output */}
      {routeData && (
        <div id="print-area" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={22} className="text-primary" />
              Route: {routeData.from_city} to {routeData.to_city} ({vehicleType === 'car' ? 'Car' : 'Motorcycle'})
            </h2>
            <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Printer size={16} />
              Print Checklist
            </button>
          </div>

          {/* Conflict Highlighter */}
          {routeData.conflicts && routeData.conflicts.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} />
                {t('conflictsFound')}
              </h3>
              {routeData.conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className={`conflict-card ${conflict.severity === 'medium' ? 'warning' : ''}`}
                >
                  <div className="conflict-header">
                    <ShieldAlert size={16} />
                    {conflict.type.toUpperCase()} WARNING
                  </div>
                  <p style={{ fontSize: '0.9rem' }}>{conflict.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* States Crossed Timeline */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              States Crossed ({routeData.states_crossed.length})
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {routeData.states_crossed.map((st, idx) => (
                <React.Fragment key={st}>
                  <div
                    style={{
                      backgroundColor: 'var(--primary-glow)',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {st}
                  </div>
                  {idx < routeData.states_crossed.length - 1 && (
                    <span style={{ color: 'var(--text-muted)' }}>➔</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid-2">
            {/* Required Documents Checklist */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={18} className="text-success" />
                {t('documentsRequired')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {routeData.documents_required.map((doc) => (
                  <label key={doc} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.95rem' }}>{doc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Speed Limits */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} className="text-accent" />
                {t('stateSpeedLimits')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(routeData.speed_limits).map(([state, limit]) => (
                  <div key={state} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>{state}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{limit} km/h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Special State Guidelines */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{t('specialRulesTitle')}</h3>
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              {Object.entries(routeData.rules_by_state).map(([state, rules]) => (
                <div key={state} style={{ textAlign: 'left' }}>
                  <h4 style={{ color: 'var(--accent)', fontSize: '0.95rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                    {state} Guidelines:
                  </h4>
                  <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {rules.map((rule, idx) => (
                      <li key={idx} style={{ marginBottom: '0.4rem' }}>{rule}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
export default TravelPage;
