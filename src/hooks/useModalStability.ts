import { useRef, useEffect, useCallback } from 'react';

interface UseModalStabilityOptions {
  isOpen: boolean;
  primaryInputRef: React.RefObject<HTMLInputElement | null>;
  delayMs?: number;
  preventRepeatedFocus?: boolean;
}

/**
 * Hook to provide stable focus management for modals with multiple inputs
 * Prevents jumping, flickering, and unwanted focus changes
 */
export const useModalStability = ({
  isOpen,
  primaryInputRef,
  delayMs = 150,
  preventRepeatedFocus = true,
}: UseModalStabilityOptions) => {
  const hasFocusedOnce = useRef(false);
  const isInitializing = useRef(false);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset refs when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasFocusedOnce.current = false;
      isInitializing.current = false;
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // Safe focus function with stability guards
  const safeFocus = useCallback(() => {
    if (!isOpen || !primaryInputRef.current) return;
    
    // Prevent repeated focus if option is enabled
    if (preventRepeatedFocus && hasFocusedOnce.current) return;
    
    // Clear any existing timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = setTimeout(() => {
      if (primaryInputRef.current && !document.activeElement?.closest('input, textarea, select')) {
        try {
          primaryInputRef.current.focus();
          hasFocusedOnce.current = true;
        } catch (error) {
          // Silently handle focus errors
          console.debug('Focus attempt failed:', error);
        }
      }
      focusTimeoutRef.current = null;
    }, delayMs);
  }, [isOpen, primaryInputRef, delayMs, preventRepeatedFocus]);

  // Initialize focus when modal opens
  useEffect(() => {
    if (isOpen && !isInitializing.current) {
      isInitializing.current = true;
      safeFocus();
    }
  }, [isOpen, safeFocus]);

  // Prevent focus stealing during typing
  const handleInputFocus = useCallback(() => {
    // Mark that we have an active input to prevent other focus attempts
    hasFocusedOnce.current = true;
    
    // Clear any pending focus timeouts
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, []);

  // Helper to create stable input props
  const getStableInputProps = useCallback(() => ({
    onFocus: handleInputFocus,
    // Prevent aggressive focus changes during interaction
    onMouseDown: (e: React.MouseEvent) => {
      // Allow natural focus behavior
      e.preventDefault = () => {}; // Override any preventDefault calls
    },
  }), [handleInputFocus]);

  return {
    safeFocus,
    getStableInputProps,
    isStable: hasFocusedOnce.current,
  };
};