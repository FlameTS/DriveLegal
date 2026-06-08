import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, ShieldAlert, Bike, Car } from 'lucide-react';

interface StateSelectorProps {
  selectedState: string;
  onChangeState: (stateCode: string) => void;
  selectedVehicle: string;
  onChangeVehicle: (vehicleType: string) => void;
}

export const StateSelector: React.FC<StateSelectorProps> = ({
  selectedState,
  onChangeState,
  selectedVehicle,
  onChangeVehicle
}) => {
  const { t } = useLanguage();

  const states = [
    { code: 'IN', name: 'National Rules (India)' },
    { code: 'MP', name: 'Madhya Pradesh (MP)' },
    { code: 'DL', name: 'Delhi NCR' },
    { code: 'MH', name: 'Maharashtra (MH)' },
    { code: 'TN', name: 'Tamil Nadu (TN)' },
    { code: 'UP', name: 'Uttar Pradesh (UP)' },
    { code: 'KA', name: 'Karnataka (KA)' }
  ];

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        
        {/* State Dropdown */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={16} className="text-secondary" />
            {t('selectState')}
          </label>
          <select
            className="form-select"
            value={selectedState}
            onChange={(e) => onChangeState(e.target.value)}
          >
            {states.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Type selector */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldAlert size={16} className="text-secondary" />
            {t('selectVehicle')}
          </label>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              className={`btn ${selectedVehicle === 'motorcycle' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onChangeVehicle('motorcycle')}
              style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.9rem' }}
            >
              <Bike size={18} />
              {t('motorcycle')}
            </button>
            <button
              type="button"
              className={`btn ${selectedVehicle === 'car' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onChangeVehicle('car')}
              style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.9rem' }}
            >
              <Car size={18} />
              {t('car')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default StateSelector;
