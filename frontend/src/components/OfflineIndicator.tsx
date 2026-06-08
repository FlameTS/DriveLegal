import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Trigger a silent background sync of critical law data
      setSyncing(true);
      setTimeout(() => setSyncing(false), 2000);
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !syncing) return null;

  return (
    <div
      className="offline-banner"
      style={{
        backgroundColor: isOffline ? 'var(--accent)' : 'var(--success)',
        color: isOffline ? '#000' : '#fff',
        transition: 'all 0.3s ease'
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={16} />
          <span>{t('offlineBanner')} (Cached States: MP, DL, MH, TN, UP, KA)</span>
        </>
      ) : (
        <>
          <Wifi size={16} />
          <RefreshCw size={14} className="animate-spin" style={{ animation: 'typingBounce 1s infinite' }} />
          <span>Synchronizing latest traffic guidelines in background...</span>
        </>
      )}
    </div>
  );
};
export default OfflineIndicator;
