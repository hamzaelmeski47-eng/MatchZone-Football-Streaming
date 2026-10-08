import React from 'react';
import { useLocation } from 'wouter';
import { X, Star, Lock, UserPlus, LogIn } from 'lucide-react';
import { useAuth, useFavorites } from '@/lib/app-state';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthRequiredModal() {
  const { showAuthModal, setShowAuthModal } = useFavorites();
  const { signInWithGoogle } = useAuth();
  const [, setLocation] = useLocation();

  if (!showAuthModal) return null;

  const handleClose = () => {
    setShowAuthModal(false);
  };

  const handleGoToRegister = () => {
    setShowAuthModal(false);
    setLocation('/register');
  };

  const handleGoToLogin = () => {
    setShowAuthModal(false);
    setLocation('/login');
  };

  const handleGoogleLogin = () => {
    setShowAuthModal(false);
    setLocation('/login');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 7, 18, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleClose}
      dir="rtl"
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #111827 0%, #0B0F17 100%)',
          border: '1px solid #253044',
          borderRadius: 20,
          maxWidth: 440,
          width: '100%',
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(16, 185, 129, 0.1)',
          position: 'relative',
          color: '#F8FAFC',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="إغلاق"
        >
          <X size={16} />
        </button>

        {/* Glowing Badge Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 0 24px rgba(16, 185, 129, 0.2)',
          }}
        >
          <Star size={30} fill="#10B981" color="#10B981" />
        </div>

        {/* Heading */}
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            margin: '0 0 8px',
            color: '#F8FAFC',
          }}
        >
          تسجيل الدخول مطلوب
        </h3>

        <p
          style={{
            fontSize: 13.5,
            color: '#94A3B8',
            margin: '0 0 24px',
            lineHeight: 1.6,
          }}
        >
          لحفظ هذه المباراة في قائمتك المفضلة ومتابعة بثها المباشر ونتائجها أولاً بأول، يجب عليك إنشاء حساب أو تسجيل الدخول.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Sign Up button (Primary) */}
          <button
            onClick={handleGoToRegister}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: 12,
              background: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <UserPlus size={16} />
            <span>إنشاء حساب جديد (Sign Up)</span>
          </button>

          {/* Google Sign In button */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              padding: '11px 18px',
              borderRadius: 12,
              background: '#1F2937',
              color: '#F8FAFC',
              border: '1px solid #374151',
              fontWeight: 600,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <span>المتابعة باستخدام حساب Google</span>
            <GoogleIcon />
          </button>

          {/* Sign in with existing account */}
          <button
            onClick={handleGoToLogin}
            style={{
              width: '100%',
              padding: '10px 18px',
              borderRadius: 12,
              background: 'transparent',
              color: '#94A3B8',
              border: '1px solid transparent',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'color 0.2s',
              marginTop: 4,
            }}
          >
            <LogIn size={15} />
            <span>لديك حساب بالفعل؟ تسجيل الدخول</span>
          </button>
        </div>
      </div>
    </div>
  );
}
