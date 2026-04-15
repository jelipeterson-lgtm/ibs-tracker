import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Plus, ClipboardList, BarChart3, FileText } from 'lucide-react';
import { getLastLogTime, isPinSet, syncOnLoad } from './storage';
import PinLock from './PinLock';
import Home from './pages/Home';
import Log from './pages/Log';
import History from './pages/History';
import Summary from './pages/Summary';
import Report from './pages/Report';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function NudgeBanner({ onDismiss }) {
  const navigate = useNavigate();
  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, zIndex: 50,
      background: 'var(--yellow-bg)', borderBottom: '1px solid var(--yellow-dim)',
      borderLeft: '3px solid var(--yellow)', padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
    }}>
      <span style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flex: 1 }}>
        No log in 18+ hours. Constipated or forgot?
      </span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => navigate('/log')} style={{
          background: 'none', border: 'none', color: 'var(--yellow)',
          fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)'
        }}>Log Now</button>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)'
        }}>Dismiss</button>
      </div>
    </div>
  );
}

function BottomNav() {
  const tabs = [
    { to: '/', icon: HomeIcon, label: 'Home' },
    { to: '/log', icon: Plus, label: 'Log' },
    { to: '/history', icon: ClipboardList, label: 'History' },
    { to: '/summary', icon: BarChart3, label: 'Summary' },
    { to: '/report', icon: FileText, label: 'Report' },
  ];
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, background: '#0a1520',
      borderTop: '1px solid var(--border)',
      height: 'calc(64px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      display: 'flex', zIndex: 50
    }}>
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 2, textDecoration: 'none',
          color: isActive ? 'var(--blue-light)' : 'var(--text-muted)',
          borderTop: isActive ? '2px solid var(--blue)' : '2px solid transparent',
          fontSize: 11, fontFamily: 'var(--font-body)'
        })}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function FloatingLogButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate('/log')} style={{
      position: 'fixed',
      bottom: 'calc(80px + env(safe-area-inset-bottom) + 8px)',
      right: 20, width: 52, height: 52, borderRadius: '50%',
      background: 'var(--blue)', color: 'white',
      boxShadow: '0 4px 20px rgba(45,125,210,0.4)',
      zIndex: 40, border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Plus size={24} />
    </button>
  );
}

export default function App() {
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [locked, setLocked] = useState(true);
  const lastActivity = useRef(Date.now());
  const location = useLocation();

  // Sync on mount, then check PIN
  useEffect(() => {
    syncOnLoad().then(() => {
      // After sync, PIN may have been pulled from cloud
      if (!isPinSet()) {
        setLocked(true); // will show PIN setup
      }
    }).catch(() => {});
  }, []);

  // Inactivity timer
  const resetActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    if (locked) return;

    const events = ['touchstart', 'mousedown', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > INACTIVITY_TIMEOUT) {
        if (isPinSet()) {
          setLocked(true);
        }
      }
    }, 30000); // check every 30s

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity));
      clearInterval(interval);
    };
  }, [locked, resetActivity]);

  // Nudge banner
  useEffect(() => {
    setNudgeDismissed(false);
  }, [location.pathname]);

  useEffect(() => {
    const lastLog = getLastLogTime();
    if (!lastLog) {
      setShowNudge(false);
      return;
    }
    const lastTime = new Date(lastLog);
    const now = new Date();
    const hoursSince = (now - lastTime) / (1000 * 60 * 60);
    const hour = now.getHours();
    const todayStr = now.toLocaleDateString();
    const lastStr = lastTime.toLocaleDateString();
    const noEntryToday = todayStr !== lastStr;

    if (hoursSince > 18 || (hour >= 20 && noEntryToday)) {
      setShowNudge(true);
    } else {
      setShowNudge(false);
    }
  }, [location.pathname]);

  const handleUnlock = useCallback(() => {
    setLocked(false);
    lastActivity.current = Date.now();
  }, []);

  if (locked) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  const nudgeVisible = showNudge && !nudgeDismissed;

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      {nudgeVisible && <NudgeBanner onDismiss={() => setNudgeDismissed(true)} />}
      <main style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        paddingTop: nudgeVisible ? 64 : 0
      }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/log" element={<Log />} />
          <Route path="/history" element={<History />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </main>
      <BottomNav />
      <FloatingLogButton />
    </div>
  );
}
