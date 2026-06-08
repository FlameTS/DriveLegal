import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { saveOfflineViolations, getOfflineViolations } from '../db/indexedDB';
import { AlertCircle, CheckCircle2 } from 'lucide-react';


interface Violation {
  code: string;
  name: string;
  category: string;
  fine_first_national: number;
  fine_repeat_national: number;
}

interface SelectedViolation {
  code: string;
  is_repeat: boolean;
}

interface FineOverride {
  violation_code: string;
  fine_first_override: number | null;
  fine_repeat_override: number | null;
}

export const ChallanPage: React.FC = () => {
  const { t } = useLanguage();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [stateCode, setStateCode] = useState('IN');
  const [selectedViolations, setSelectedViolations] = useState<SelectedViolation[]>([]);
  const [overrides, setOverrides] = useState<FineOverride[]>([]);
  const [loading, setLoading] = useState(false);

  // States list matching seed
  const states = [
    { code: 'IN', name: 'National (Motor Vehicles Act)' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'DL', name: 'Delhi NCR' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'KA', name: 'Karnataka' }
  ];

  useEffect(() => {
    const fetchViolations = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/violations');
        if (!response.ok) throw new Error('API failed');
        const data = await response.json();
        setViolations(data);
        await saveOfflineViolations(data);
      } catch (err) {
        console.warn('Using offline violations cache:', err);
        const cached = await getOfflineViolations();
        setViolations(cached);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, []);

  // Fetch state overrides when state changes
  useEffect(() => {
    const fetchOverrides = async () => {
      if (stateCode === 'IN') {
        setOverrides([]);
        return;
      }
      try {
        // We will compute/retrieve overrides by simulating calculations or loading
        const response = await fetch(`http://localhost:8000/api/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state_code: stateCode,
            violations: violations.map(v => ({ code: v.code, is_repeat: false }))
          })
        });
        if (response.ok) {
          const data = await response.json();
          // Map to fine overrides format
          const mapped: FineOverride[] = data.items.map((item: any) => ({
            violation_code: item.code,
            fine_first_override: item.is_override ? item.fine_amount : null,
            fine_repeat_override: null // We'll calculate repeats below or fetch them
          }));
          
          // Fetch repeat overrides
          const repeatResponse = await fetch(`http://localhost:8000/api/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state_code: stateCode,
              violations: violations.map(v => ({ code: v.code, is_repeat: true }))
            })
          });
          if (repeatResponse.ok) {
            const repeatData = await repeatResponse.json();
            repeatData.items.forEach((item: any, idx: number) => {
              if (item.is_override) {
                mapped[idx].fine_repeat_override = item.fine_amount;
              }
            });
          }
          setOverrides(mapped);
        }
      } catch (err) {
        console.warn('Could not fetch state fine overrides. Falling back to national rules in offline calculator.', err);
        setOverrides([]);
      }
    };

    if (violations.length > 0) {
      fetchOverrides();
    }
  }, [stateCode, violations]);

  const toggleViolation = (code: string) => {
    setSelectedViolations(prev => {
      const exists = prev.find(v => v.code === code);
      if (exists) {
        return prev.filter(v => v.code !== code);
      } else {
        return [...prev, { code, is_repeat: false }];
      }
    });
  };

  const toggleRepeat = (code: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting/deselecting row
    setSelectedViolations(prev =>
      prev.map(v => (v.code === code ? { ...v, is_repeat: !v.is_repeat } : v))
    );
  };

  // Compute live breakdown locally
  const getFineAmount = (code: string, isRepeat: boolean) => {
    const violation = violations.find(v => v.code === code);
    if (!violation) return 0;

    const override = overrides.find(o => o.violation_code === code);
    if (isRepeat) {
      return (override && override.fine_repeat_override !== null)
        ? override.fine_repeat_override
        : violation.fine_repeat_national;
    } else {
      return (override && override.fine_first_override !== null)
        ? override.fine_first_override
        : violation.fine_first_national;
    }
  };

  const getSourceNotes = (code: string, isRepeat: boolean) => {
    const override = overrides.find(o => o.violation_code === code);
    if (isRepeat) {
      return (override && override.fine_repeat_override !== null)
        ? `State Override (${stateCode})`
        : 'National Rule';
    } else {
      return (override && override.fine_first_override !== null)
        ? `State Override (${stateCode})`
        : 'National Rule';
    }
  };

  const selectedCodes = selectedViolations.map(v => v.code);
  const totalFine = selectedViolations.reduce((sum, item) => sum + getFineAmount(item.code, item.is_repeat), 0);

  // Group violations by category
  const categories = {
    documents: 'Required Documents & Licenses',
    safety: 'Safety Equipment & Riding Rules',
    behavior: 'Driving Conduct & Offenses',
    vehicle_condition: 'Vehicle Maintenance & Pollution'
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('challanCalc')}</h1>
        <p>{t('challanCalcDesc')}</p>
      </div>

      <div className="grid-2" style={{ gap: '2rem' }}>
        
        {/* Left Side: Violation Checklists */}
        <div>
          {/* State selector */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('selectState')}</label>
              <select
                className="form-select"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
              >
                {states.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading fine rules...
            </div>
          )}

          {Object.entries(categories).map(([catKey, catName]) => {
            const catViolations = violations.filter(v => v.category === catKey);
            if (catViolations.length === 0) return null;

            return (
              <div key={catKey} className="category-section">
                <h3 className="category-title">{catName}</h3>
                {catViolations.map((v) => {
                  const isSelected = selectedCodes.includes(v.code);
                  const selectedItem = selectedViolations.find(sv => sv.code === v.code);
                  const isRepeat = selectedItem?.is_repeat || false;
                  const currentFine = getFineAmount(v.code, isRepeat);

                  return (
                    <div
                      key={v.code}
                      onClick={() => toggleViolation(v.code)}
                      className={`checklist-item ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="checklist-checkbox">
                        {isSelected && <CheckCircle2 size={16} style={{ color: '#fff', fill: 'var(--primary)' }} />}
                      </div>

                      <div className="item-details">
                        <div className="item-name">{v.name}</div>
                        <div className="item-fine-details">
                          First: ₹{getFineAmount(v.code, false)} | Repeat: ₹{getFineAmount(v.code, true)}
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button
                            type="button"
                            onClick={(e) => toggleRepeat(v.code, e)}
                            className={`btn ${isRepeat ? 'btn-accent' : 'btn-secondary'}`}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                          >
                            {isRepeat ? 'Repeat Offense' : 'First Offense'}
                          </button>
                          <span style={{ fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                            ₹{currentFine}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right Side: Live Receipt Outline */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '100px', padding: '1.5rem' }}>
            <div className="challan-receipt">
              <div className="receipt-title">{t('receiptTitle')}</div>
              
              <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {selectedViolations.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem 0' }}>
                      No violations selected.<br />Check boxes on the left to compute fine.
                    </div>
                  ) : (
                    selectedViolations.map((item) => {
                      const v = violations.find(x => x.code === item.code);
                      if (!v) return null;
                      return (
                        <div key={item.code} className="receipt-item">
                          <div style={{ textAlign: 'left', maxWidth: '70%', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            * {v.name.split('(')[0]}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              ({item.is_repeat ? 'Repeat' : 'First'} - {getSourceNotes(item.code, item.is_repeat)})
                            </span>
                          </div>
                          <div>₹{getFineAmount(item.code, item.is_repeat)}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="receipt-total">
                  <span>TOTAL FINE</span>
                  <span>₹{totalFine}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertCircle size={14} className="text-secondary" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p>
                Calculations based on 2019 MV Act Amendments and state gazette overrides. Police officers are authorized to confiscate documents or licenses depending on state enforcement rules.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default ChallanPage;
