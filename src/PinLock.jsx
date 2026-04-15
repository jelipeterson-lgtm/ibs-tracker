import { useState, useEffect, useRef } from 'react';
import { isPinSet, setPin, verifyPin, changePin, getWebAuthnCredential, setWebAuthnCredential } from './storage';

function PinDots({ length, filled }) {
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '24px 0' }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, maxWidth: 280, margin: '0 auto' }}>
      {digits.map((d, i) => {
        if (d === '') return <div key={i} />;
        if (d === 'del') {
          return (
            <button key={i} onClick={onDelete} style={{
              height: 60, borderRadius: 12, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-secondary)',
              fontSize: 14, fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}>DEL</button>
          );
        }
        return (
          <button key={i} onClick={() => onDigit(d)} style={{
            height: 60, borderRadius: 12, background: 'var(--bg-card)',
            border: '1px solid var(--border)', color: 'var(--text-primary)',
            fontSize: 24, fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}>{d}</button>
        );
      })}
    </div>
  );
}

export default function PinLock({ onUnlock }) {
  const [mode, setMode] = useState('loading'); // loading, setup, confirm, unlock, change
  const [pin, setPin_] = useState('');
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
    } catch {
      // Biometric not available
    }
  }

  async function tryBiometricUnlock() {
    try {
      const cred = getWebAuthnCredential();
      if (!cred) return;

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)),
            type: 'public-key',
          }],
          userVerification: 'required',
          timeout: 60000,
        }
      });
      if (assertion) {
        onUnlock();
      }
    } catch {
      // User cancelled or biometric failed — fall back to PIN
    }
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
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        }
      });
      if (credential) {
        const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        setWebAuthnCredential({ id: credId });
        return true;
      }
    } catch {
      // Biometric registration failed
    }
    return false;
  }

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin_(next);
    setError('');

    if (next.length === 4) {
      if (mode === 'setup') {
        setSetupPin(next);
        setPin_('');
        setMode('confirm');
      } else if (mode === 'confirm') {
        if (next === setupPin) {
          handleSetupComplete(next);
        } else {
          setError('PINs do not match. Try again.');
          setPin_('');
          setMode('setup');
          setSetupPin('');
        }
      } else if (mode === 'unlock') {
        handleUnlock(next);
      } else if (mode === 'change') {
        handleUnlock(next);
      }
    }
  };

  const handleDelete = () => {
    setPin_(prev => prev.slice(0, -1));
    setError('');
  };

  async function handleSetupComplete(newPin) {
    await setPin(newPin);
    // Offer biometric if available
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          const registered = await registerBiometric();
          if (registered) {
            setBiometricAvailable(true);
          }
        }
      }
    } catch {
      // Skip biometric
    }
    onUnlock();
  }

  async function handleUnlock(enteredPin) {
    const valid = await verifyPin(enteredPin);
    if (valid) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin_('');
    }
  }

  if (mode === 'loading') return null;

  const titles = {
    setup: 'SET YOUR PIN',
    confirm: 'CONFIRM YOUR PIN',
    unlock: 'ENTER PIN',
    change: 'ENTER CURRENT PIN',
  };

  const subtitles = {
    setup: 'Choose a 4-digit PIN to protect your data',
    confirm: 'Enter the same PIN again to confirm',
    unlock: 'Enter your PIN to continue',
    change: 'Enter your current PIN first',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>
        IBS VA TRACKER
      </div>
      <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)', marginBottom: 4 }}>
        {titles[mode]}
      </div>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-muted)', marginBottom: 8 }}>
        {subtitles[mode]}
      </div>

      <PinDots length={4} filled={pin.length} />

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <Keypad onDigit={handleDigit} onDelete={handleDelete} />

      {mode === 'unlock' && biometricAvailable && (
        <button onClick={tryBiometricUnlock} style={{
          marginTop: 20, background: 'none', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 20px', color: 'var(--blue-light)',
          fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}>
          Use Face ID / Touch ID
        </button>
      )}
    </div>
  );
}
