import { useState, useEffect, useRef } from 'react';
import { isPinSet, verifyPin, setPin, getWebAuthnCredential, setWebAuthnCredential } from './storage';

function PinDots({ filled }) {
  return (
    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', margin: '32px 0' }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: 20, height: 20, borderRadius: '50%',
          background: i < filled ? 'var(--blue-light)' : 'transparent',
          border: `2px solid ${i < filled ? 'var(--blue-light)' : 'var(--border)'}`,
          transition: 'background 0.1s',
        }} />
      ))}
    </div>
  );
}

function Keypad({ onDigit, onDelete }) {
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']];
  const sub = { '1': '', '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ', '0': '' };
  return (
    <div style={{ width: '100%', maxWidth: 300, margin: '0 auto' }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
          {row.map((d, ci) => {
            if (d === '') return <div key={ci} style={{ width: 78, height: 78 }} />;
            if (d === 'del') {
              return (
                <button key={ci} onClick={onDelete} style={{
                  width: 78, height: 78, borderRadius: '50%', background: 'transparent',
                  border: 'none', color: 'var(--text-secondary)',
                  fontSize: 15, fontFamily: 'var(--font-body)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>Delete</button>
              );
            }
            return (
              <button key={ci} onClick={() => onDigit(d)} style={{
                width: 78, height: 78, borderRadius: '50%',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 32, fontFamily: 'var(--font-body)', fontWeight: 300, lineHeight: 1 }}>{d}</span>
                {sub[d] && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', marginTop: 2 }}>{sub[d]}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function PinLock({ onUnlock }) {
  const [mode, setMode] = useState('loading'); // loading, setup, confirm, unlock
  const [pin, setLocalPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const attemptedBiometric = useRef(false);

  useEffect(() => {
    if (isPinSet()) {
      setMode('unlock');
      checkBiometric();
    } else {
      setMode('setup');
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
      if (!window.PublicKeyCredential) return;
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) return;
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
          finishSetup(next);
        } else {
          setError('PINs didn\'t match. Try again.');
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

  async function finishSetup(pinValue) {
    await setPin(pinValue);
    await registerBiometric();
    onUnlock();
  }

  async function handleUnlock(enteredPin) {
    const valid = await verifyPin(enteredPin);
    if (valid) {
      onUnlock();
    } else {
      setError('Wrong PIN');
      setLocalPin('');
    }
  }

  if (mode === 'loading') return null;

  const title = mode === 'setup' ? 'Set Your PIN' : mode === 'confirm' ? 'Confirm PIN' : 'Enter PIN';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: '24px 32px',
    }}>
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
        IBS VA TRACKER
      </div>
      <div style={{ fontSize: 20, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
        {title}
      </div>

      <PinDots filled={pin.length} />

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Keypad onDigit={handleDigit} onDelete={handleDelete} />

      {mode === 'unlock' && biometricAvailable && (
        <button onClick={tryBiometricUnlock} style={{
          display: 'block', margin: '24px auto 0', background: 'none', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 28px', color: 'var(--blue-light)',
          fontSize: 15, fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}>
          Use Face ID / Touch ID
        </button>
      )}
    </div>
  );
}
