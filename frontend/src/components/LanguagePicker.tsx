import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { LanguageType } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguagePicker: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const languages: { code: LanguageType; name: string }[] = [
    { code: 'English', name: 'English' },
    { code: 'Hindi', name: 'हिंदी' },
    { code: 'Marathi', name: 'मराठी' },
    { code: 'Tamil', name: 'தமிழ்' },
    { code: 'Telugu', name: 'తెలుగు' },
    { code: 'Bengali', name: 'বাংলা' }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-input)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <Globe size={16} className="text-secondary" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as LanguageType)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          fontWeight: 600,
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};
export default LanguagePicker;
