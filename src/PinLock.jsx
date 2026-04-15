import { useState, useEffect, useRef } from 'react';
import { isPinSet, verifyPin, setPin, getPinHash, getWebAuthnCredential, setWebAuthnCredential } from './storage';
import { getUserId, getUsername, createAccount, signIn } from './supabase';

function PinDots({ length, filled }) {
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '20px 0' }}>
      {Array.from({ length }, (_, i) => (
        <div key={i} style={{
          width: 16, height: 16, borderRadius: '50%',
          background: i < filled ? 'var(--blue-light)' : 'transparent',
          border: `2px solid ${i < filled ? 'var(--blue-light)' : 'var(--border)'}`,
          transition: 'background 0.15s',
        }} />
      ))}
    </div>
  );
}

function Keypad({ onDigit, onDelete }) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, maxWidth: 260, margin: '0 auto' }}>
      {digits.map((d, i) => {
        if (d === '') return <div key={i} />;
        if (d === 'del') {
          return (
            <button key={i} onClick={onDelete} style={{
              height: 56, borderRadius: 12, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-secondary)',
              fontSize: 14, fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}>DEL</button>
          );
        }
        return (
          <button key={i} onClick={() => onDigit(d)} style={{
            height: 56, borderRadius: 12, background: 'var(--bg-card)',
            border: '1px solid var(--border)', color: 'var(--text-primary)',
            fontSize: 24, fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}>{d}</button>
        );
      })}
    </div>
  );
}

async function hashPinRaw(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode('ibs-va-tracker-salt:' + pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PinLock({ onUnlock }) {
  // Modes: 'choose' (new vs existing), 'name' (enter name), 'setup' (set PIN), 'confirm' (confirm PIN), 'unlock' (returning user)
  const [mode, setMode] = useState('loading');
  const [name, setName] = useState('');
  const [pin, setLocalPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [error, setError] = useState('');
  const [isNewAccount, setIsNewAccount] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const attemptedBiometric = useRef(false);

  useEffect(() => {
    if (getUserId() && isPinSet()) {
      setMode('unlock');
      checkBiometric();
    } else {
      setMode('choose');
    }
  }, []);

  async function checkBiometric() {
    try {
      if (window.PublicKeyCredential && getWebAuthnCredential()) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
        if (available && !attemptedBiometric.current) {
          attemptedBiometric.current = true;
          tryBiometricUnlock();
        }
      }
    } catch {}
  }

  async function tryBiometricUnlock() {
    try {
      const cred = getWebAuthnCredential();
      if (!cred) return;
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)), type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
        }
      });
      if (assertion) onUnlock();
    } catch {}
  }

  async function registerBiometric() {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'IBS VA Tracker', id: window.location.hostname },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: 'veteran',
            displayName: 'Veteran',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000,
        }
      });
      if (credential) {
        const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        setWebAuthnCredential({ id: credId });
      }
    } catch {}
  }

  const handleNameSubmit = () => {
    const n = name.trim();
    if (!n) { setError('Enter your name'); return; }
    setError('');
    setMode('setup');
  };

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setLocalPin(next);
    setError('');

    if (next.length === 4) {
      if (mode === 'setup') {
        setSetupPin(next);
        setLocalPin('');
        setMode('confirm');
      } else if (mode === 'confirm') {
        if (next === setupPin) {
          handleAccountCreate(next);
        } else {
          setError('PINs do not match');
          setLocalPin('');
          setSetupPin('');
          setMode('setup');
        }
      } else if (mode === 'unlock') {
        handleUnlock(next);
      }
    }
  };

  const handleDelete = () => {
    setLocalPin(prev => prev.slice(0, -1));
    setError('');
  };

  async function handleAccountCreate(pinValue) {
    try {
      const h = await hashPinRaw(pinValue);
      if (isNewAccount) {
        await createAccount(name.trim(), h);
      } else {
        const data = await signIn(name.trim(), h);
        // Pull cloud entries into local storage
        const { syncFromCloud } = await import('./storage');
        if (data.entries) {
          localStorage.setItem('ibs_log_entries', JSON.stringify(data.entries));
        }
        if (data.pin_hash) {
          localStorage.setItem('ibs_pin_hash', data.pin_hash);
        }
      }
      // Set PIN locally
      await setPin(pinValue);
      // Offer biometric
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (available) await registerBiometric();
        }
      } catch {}
      onUnlock();
    } catch (e) {
      setError(e.message);
      setLocalPin('');
      setSetupPin('');
      setMode('setup');
    }
  }

  async function handleUnlock(enteredPin) {
    const valid = await verifyPin(enteredPin);
    if (valid) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setLocalPin('');
    }
  }

  if (mode === 'loading') return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
        IBS VA TRACKER
      </div>

      {/* Choose: New or Existing */}
      {mode === 'choose' && (
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', textAlign: 'center', marginBottom: 20 }}>
            Welcome
          </div>
          <button onClick={() => { setIsNewAccount(true); setMode('name'); }} style={{
            width: '100%', height: 52, borderRadius: 10, background: 'var(--blue)',
            color: 'white', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
            border: 'none', cursor: 'pointer', marginBottom: 10,
          }}>New Account</button>
          <button onClick={() => { setIsNewAccount(false); setMode('name'); }} style={{
            width: '100%', height: 52, borderRadius: 10, background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--blue-light)',
            fontSize: 15, fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}>Sign In</button>
        </div>
      )}

      {/* Enter name */}
      {mode === 'name' && (
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>
            {isNewAccount ? 'Create Account' : 'Sign In'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>
            {isNewAccount ? 'Pick a name for your account' : 'Enter your account name'}
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
            style={{
              width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '14px 16px', fontSize: 18, color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)', outline: 'none', textAlign: 'center', marginBottom: 12,
            }}
          />
          {error && <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>{error}</div>}
          <button onClick={handleNameSubmit} style={{
            width: '100%', height: 48, borderRadius: 10, background: 'var(--blue)',
            color: 'white', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
            border: 'none', cursor: 'pointer',
          }}>Next</button>
          <button onClick={() => { setMode('choose'); setError(''); }} style={{
            width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 13, cursor: 'pointer', marginTop: 12, fontFamily: 'var(--font-body)',
          }}>Back</button>
        </div>
      )}

      {/* Set / Confirm / Enter PIN */}
      {(mode === 'setup' || mode === 'confirm' || mode === 'unlock') && (
        <div>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>
            {mode === 'setup' ? (isNewAccount ? 'Set Your PIN' : 'Enter Your PIN') :
             mode === 'confirm' ? 'Confirm PIN' : 'Enter PIN'}
          </div>
          {mode === 'unlock' && getUsername() && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              {getUsername()}
            </div>
          )}

          <PinDots length={4} filled={pin.length} />

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
              {error}
            </div>
          )}

          <Keypad onDigit={handleDigit} onDelete={handleDelete} />

          {mode === 'unlock' && biometricAvailable && (
            <button onClick={tryBiometricUnlock} style={{
              display: 'block', margin: '20px auto 0', background: 'none', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 20px', color: 'var(--blue-light)',
              fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
            }}>
              Use Face ID / Touch ID
            </button>
          )}
        </div>
      )}
    </div>
  );
}
