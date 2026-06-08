import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { StateSelector } from '../components/StateSelector';
import { saveOfflineStateRules, getOfflineStateRules } from '../db/indexedDB';
import { ShieldAlert, FileText } from 'lucide-react';


interface Rule {
  id: number;
  section: string;
  title: string;
  category: string;
  vehicle_type: string;
  rule_type: string;
  description: string;
  state_code: string;
}

export const StatesPage: React.FC = () => {
  const { t } = useLanguage();
  const [stateCode, setStateCode] = useState('IN');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:8000/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state_code: stateCode, vehicle_type: vehicleType })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch state laws from API');
        }

        const data = await response.json();
        setRules(data.rules);
        
        // Cache rules in IndexedDB for offline access
        await saveOfflineStateRules(`${stateCode}_${vehicleType}`, data.rules);
      } catch (err) {
        console.warn('API error, falling back to IndexedDB:', err);
        // Load from IndexedDB
        const cachedRules = await getOfflineStateRules(`${stateCode}_${vehicleType}`);
        if (cachedRules) {
          setRules(cachedRules);
        } else {
          setError('Could not connect to the server, and no offline data has been cached for this state yet.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [stateCode, vehicleType]);

  return (
    <div>
      <div className="page-header">
        <h1>{t('stateRules')}</h1>
        <p>{t('stateRulesDesc')}</p>
      </div>

      <StateSelector
        selectedState={stateCode}
        onChangeState={setStateCode}
        selectedVehicle={vehicleType}
        onChangeVehicle={setVehicleType}
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          Loading state regulations...
        </div>
      )}

      {error && (
        <div className="conflict-card" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
          <div className="conflict-header">
            <ShieldAlert size={18} />
            Offline Mode Limitations
          </div>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid-2">
          {rules.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No custom guidelines found for the selection. Standard national regulations apply.
            </div>
          ) : (
            rules.map((rule) => {
              const isOverride = rule.rule_type === 'modify' || rule.rule_type === 'add';
              return (
                <div
                  key={rule.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: isOverride ? '4px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: isOverride ? 'rgba(245, 158, 11, 0.02)' : 'var(--bg-card)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                          backgroundColor: 'var(--border)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        {rule.section}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: isOverride ? 'var(--accent)' : 'var(--success)',
                          backgroundColor: isOverride ? 'var(--accent-glow)' : 'var(--success-glow)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        {isOverride ? 'State Override' : 'National Rule'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', textAlign: 'left' }}>
                      {rule.title}
                    </h3>
                    
                    <p style={{ textAlign: 'left', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      {rule.description}
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: '1.5rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <FileText size={14} />
                    Category: {rule.category.toUpperCase()} | Vehicle: {rule.vehicle_type.toUpperCase()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
export default StatesPage;
