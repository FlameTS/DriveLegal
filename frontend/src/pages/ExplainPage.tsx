import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, AlertTriangle, Scale } from 'lucide-react';

export const ExplainPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [lawText, setLawText] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState('');
  const [simplified, setSimplified] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-configured examples from Motor Vehicles Act for easy testing
  const examples = [
    {
      section: 'Section 129',
      title: 'Wearing of Protective Headgear',
      text: 'Every person driving or riding on a motorcycle of any class or description, shall, while in a public place, wear protective headgear conforming to the standards of Bureau of Indian Standards: Provided that the provisions of this section shall not apply to a person who is a Sikh, if he is, while driving or riding on the motorcycle, in a public place, wearing a turban.'
    },
    {
      section: 'Section 185',
      title: 'Drunken Driving Clause',
      text: 'Whoever, while driving, or attempting to drive, a motor vehicle, has, in his blood, alcohol exceeding 30 mg. per 100 ml. of blood detected in a test by a breath analyser, or is under the influence of a drug to such an extent as to be incapable of exercising proper control over the vehicle, shall be punishable for the first offence with imprisonment for a term which may extend to six months, or with fine of ten thousand rupees, or with both.'
    }
  ];

  const loadExample = (ex: typeof examples[0]) => {
    setSection(ex.section);
    setLawText(ex.text);
  };

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lawText.trim()) return;

    setLoading(true);
    setError(null);
    setSimplified('');

    try {
      const response = await fetch('http://localhost:8000/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          law_text: lawText,
          section: section,
          language: language
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reach legal simplification server');
      }

      const data = await response.json();
      setOriginal(data.original_text);
      setSimplified(data.simplified_text);
      setDisclaimer(data.disclaimer);
    } catch (err: any) {
      console.error(err);
      setError('Failed to simplify law. Ensure the backend FastAPI server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('lawExplainer')}</h1>
        <p>{t('lawExplainerDesc')}</p>
      </div>

      {/* Examples section */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <span style={{ alignSelf: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Try Examples:
        </span>
        {examples.map((ex) => (
          <button
            key={ex.section}
            type="button"
            className="btn btn-secondary"
            onClick={() => loadExample(ex)}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            {ex.section} ({ex.title})
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto 2.5rem', padding: '1.5rem' }}>
        <form onSubmit={handleExplain}>
          <div className="form-group">
            <label className="form-label">Section Reference (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Section 129"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('originalText')}</label>
            <textarea
              className="form-input"
              rows={6}
              value={lawText}
              onChange={(e) => setLawText(e.target.value)}
              placeholder={t('enterLawText')}
              required
              style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !lawText.trim()}>
            <Sparkles size={18} />
            {loading ? 'Simplifying Complex Legalese...' : t('explainBtn')}
          </button>
        </form>
      </div>

      {error && (
        <div className="conflict-card" style={{ maxWidth: '800px', margin: '0 auto 2rem' }}>
          <div className="conflict-header">
            <AlertTriangle size={18} />
            Explainer Error
          </div>
          <p>{error}</p>
        </div>
      )}

      {/* Side-by-side translation panels */}
      {simplified && (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="side-by-side">
            {/* Original Text panel */}
            <div className="original-panel">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scale size={18} className="text-secondary" />
                Original Statute {section && `(${section})`}
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textAlign: 'left', lineHeight: '1.7' }}>
                {original}
              </p>
            </div>

            {/* Simplified Text panel */}
            <div className="simplified-panel">
              <div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '20px',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px'
                }}
              >
                Plain Language Explainer
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--primary)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                <Sparkles size={18} />
                {t('simplifiedText')}
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', textAlign: 'left', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {simplified}
              </p>
            </div>
          </div>

          {/* Core legal disclaimer at bottom */}
          <div className="disclaimer-banner" style={{ maxWidth: '1200px', margin: '2rem auto 0' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.2rem' }}>{t('disclaimerTitle')}</h4>
              <p style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>{disclaimer || t('disclaimerText')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExplainPage;
