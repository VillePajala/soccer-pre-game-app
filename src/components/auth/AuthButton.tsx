'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { HiOutlineUser, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { AuthModal } from './AuthModal';
import { useTranslation } from 'react-i18next';

interface AuthButtonProps {
  className?: string;
  iconSize?: string;
}

export function AuthButton({ className = '', iconSize = 'w-5 h-5' }: AuthButtonProps) {
  const { user, signOut, loading } = useAuth();
  const { t } = useTranslation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleAuthClick = () => {
    if (user) {
      setShowUserMenu(!showUserMenu);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  if (loading) {
    return (
      <button className={className} disabled>
        <HiOutlineUser className={`${iconSize} animate-pulse`} />
      </button>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={handleAuthClick}
          className={className}
          title={user ? t('auth.userMenu') : t('auth.signIn')}
        >
          <HiOutlineUser className={iconSize} />
        </button>

        {/* User menu dropdown */}
        {user && showUserMenu && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 rounded-md shadow-lg py-1 z-50">
            <div className="px-4 py-2 text-sm text-slate-300 border-b border-slate-700">
              {user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 flex items-center gap-2"
            >
              <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
              {t('auth.signOut')}
            </button>
          </div>
        )}
      </div>

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
}