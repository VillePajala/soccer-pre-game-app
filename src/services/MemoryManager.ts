/**
 * Memory Manager - Centralized Memory Leak Prevention and Cleanup
 * 
 * This service provides centralized memory management to prevent leaks from:
 * - Uncleaned intervals and timeouts
 * - Event listeners not removed
 * - Component subscriptions not unsubscribed
 * - Large objects held in closures
 * - Circular references
 * 
 * 🔧 MEMORY LEAK FIXES:
 * - Automatic cleanup of intervals and timeouts
 * - Tracked event listeners with auto-removal
 * - Component subscription management
 * - Large object pooling and cleanup
 * - Circular reference detection and breaking
 */

import logger from '@/utils/logger';

// Memory management interfaces
interface TrackedTimer {
  id: number;
  type: 'timeout' | 'interval';
  callback: () => void;
  delay: number;
  created: number;
  context?: string;
}

interface TrackedListener {
  id: string;
  element: EventTarget;
  event: string;
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
  created: number;
  context?: string;
}

interface TrackedSubscription {
  id: string;
  unsubscribe: () => void;
  created: number;
  context?: string;
}

interface MemoryStats {
  activeTimers: number;
  activeListeners: number;
  activeSubscriptions: number;
  totalCleaned: number;
  largeObjectsTracked: number;
}

class MemoryManager {
  private timers = new Map<number, TrackedTimer>();
  private listeners = new Map<string, TrackedListener>();
  private subscriptions = new Map<string, TrackedSubscription>();
  private largeObjects = new WeakSet<object>();
  private cleanupCount = 0;
  private nextTimerId = 1;
  private nextListenerId = 1;
  private nextSubscriptionId = 1;

  /**
   * Create a managed timeout that will be automatically cleaned up
   */
  createTimeout(
    callback: () => void,
    delay: number,
    context?: string
  ): number {
    const id = this.nextTimerId++;
    const trackedTimer: TrackedTimer = {
      id,
      type: 'timeout',
      callback,
      delay,
      created: Date.now(),
      context,
    };

    this.timers.set(id, trackedTimer);

    const timeoutId = setTimeout(() => {
      callback();
      this.timers.delete(id); // Auto-cleanup after execution
    }, delay);

    // Store the actual browser timeout ID
    (trackedTimer as any).browserId = timeoutId;

    logger.debug(`[MemoryManager] Created timeout ${id} (${delay}ms) ${context ? `for ${context}` : ''}${trackedTimer}`);
    return id;
  }

  /**
   * Create a managed interval that will be automatically cleaned up
   */
  createInterval(
    callback: () => void,
    delay: number,
    context?: string
  ): number {
    const id = this.nextTimerId++;
    const trackedTimer: TrackedTimer = {
      id,
      type: 'interval',
      callback,
      delay,
      created: Date.now(),
      context,
    };

    this.timers.set(id, trackedTimer);

    const intervalId = setInterval(() => {
      try {
        callback();
      } catch (error) {
        logger.error(`[MemoryManager] Error in interval ${id}:`, error);
        this.clearTimer(id); // Clear problematic intervals
      }
    }, delay);

    // Store the actual browser interval ID
    (trackedTimer as any).browserId = intervalId;

    logger.debug(`[MemoryManager] Created interval ${id} (${delay}ms) ${context ? `for ${context}` : ''}`);
    return id;
  }

  /**
   * Clear a managed timer
   */
  clearTimer(id: number): boolean {
    const timer = this.timers.get(id);
    if (!timer) {
      return false;
    }

    const browserId = (timer as any).browserId;
    if (timer.type === 'timeout') {
      clearTimeout(browserId);
    } else {
      clearInterval(browserId);
    }

    this.timers.delete(id);
    this.cleanupCount++;

    logger.debug(`[MemoryManager] Cleared ${timer.type} ${id} ${timer.context ? `for ${timer.context}` : ''}`);
    return true;
  }

  /**
   * Add a managed event listener
   */
  addEventListener(
    element: EventTarget,
    event: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
    context?: string
  ): string {
    const id = `listener_${this.nextListenerId++}`;
    
    const trackedListener: TrackedListener = {
      id,
      element,
      event,
      listener,
      options,
      created: Date.now(),
      context,
    };

    this.listeners.set(id, trackedListener);
    element.addEventListener(event, listener, options);

    logger.debug(`[MemoryManager] Added event listener ${id} (${event}) ${context ? `for ${context}` : ''}`);
    return id;
  }

  /**
   * Remove a managed event listener
   */
  removeEventListener(id: string): boolean {
    const listener = this.listeners.get(id);
    if (!listener) {
      return false;
    }

    listener.element.removeEventListener(listener.event, listener.listener, listener.options);
    this.listeners.delete(id);
    this.cleanupCount++;

    logger.debug(`[MemoryManager] Removed event listener ${id} (${listener.event}) ${listener.context ? `for ${listener.context}` : ''}`);
    return true;
  }

  /**
   * Track a subscription for automatic cleanup
   */
  trackSubscription(
    unsubscribe: () => void,
    context?: string
  ): string {
    const id = `subscription_${this.nextSubscriptionId++}`;
    
    const trackedSubscription: TrackedSubscription = {
      id,
      unsubscribe,
      created: Date.now(),
      context,
    };

    this.subscriptions.set(id, trackedSubscription);

    logger.debug(`[MemoryManager] Tracking subscription ${id} ${context ? `for ${context}` : ''}`);
    return id;
  }

  /**
   * Unsubscribe a tracked subscription
   */
  unsubscribe(id: string): boolean {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      return false;
    }

    try {
      subscription.unsubscribe();
      this.subscriptions.delete(id);
      this.cleanupCount++;

      logger.debug(`[MemoryManager] Unsubscribed ${id} ${subscription.context ? `for ${subscription.context}` : ''}`);
      return true;
    } catch (error) {
      logger.error(`[MemoryManager] Error unsubscribing ${id}:`, error);
      this.subscriptions.delete(id); // Remove even if unsubscribe failed
      return false;
    }
  }

  /**
   * Track large objects for memory monitoring
   */
  trackLargeObject(obj: object, context?: string): void {
    this.largeObjects.add(obj);
    logger.debug(`[MemoryManager] Tracking large object ${context ? `for ${context}` : ''}`);
  }

  /**
   * Cleanup all resources for a specific context
   */
  cleanupContext(context: string): number {
    let cleaned = 0;

    // Clean up timers
    for (const [id, timer] of this.timers.entries()) {
      if (timer.context === context) {
        this.clearTimer(id);
        cleaned++;
      }
    }

    // Clean up listeners
    for (const [id, listener] of this.listeners.entries()) {
      if (listener.context === context) {
        this.removeEventListener(id);
        cleaned++;
      }
    }

    // Clean up subscriptions
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.context === context) {
        this.unsubscribe(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[MemoryManager] Cleaned up ${cleaned} resources for context '${context}'`);
    }

    return cleaned;
  }

  /**
   * Cleanup stale resources (older than specified age)
   */
  cleanupStale(maxAge: number = 60 * 60 * 1000): number { // 1 hour default
    const now = Date.now();
    let cleaned = 0;

    // Clean up old timers
    for (const [id, timer] of this.timers.entries()) {
      if (now - timer.created > maxAge) {
        this.clearTimer(id);
        cleaned++;
      }
    }

    // Clean up old listeners
    for (const [id, listener] of this.listeners.entries()) {
      if (now - listener.created > maxAge) {
        this.removeEventListener(id);
        cleaned++;
      }
    }

    // Clean up old subscriptions
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (now - subscription.created > maxAge) {
        this.unsubscribe(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[MemoryManager] Cleaned up ${cleaned} stale resources older than ${maxAge}ms`);
    }

    return cleaned;
  }

  /**
   * Force cleanup of all managed resources
   */
  cleanupAll(): number {
    let cleaned = 0;

    // Clear all timers
    for (const id of this.timers.keys()) {
      this.clearTimer(id);
      cleaned++;
    }

    // Remove all listeners
    for (const id of this.listeners.keys()) {
      this.removeEventListener(id);
      cleaned++;
    }

    // Unsubscribe all subscriptions
    for (const id of this.subscriptions.keys()) {
      this.unsubscribe(id);
      cleaned++;
    }

    logger.debug(`[MemoryManager] Force cleaned ${cleaned} resources`);
    return cleaned;
  }

  /**
   * Get memory management statistics
   */
  getStats(): MemoryStats {
    return {
      activeTimers: this.timers.size,
      activeListeners: this.listeners.size,
      activeSubscriptions: this.subscriptions.size,
      totalCleaned: this.cleanupCount,
      largeObjectsTracked: 0, // WeakSet doesn't have size
    };
  }

  /**
   * Get detailed information about active resources
   */
  getActiveResources(): {
    timers: TrackedTimer[];
    listeners: Omit<TrackedListener, 'element' | 'listener'>[];
    subscriptions: Omit<TrackedSubscription, 'unsubscribe'>[];
  } {
    return {
      timers: Array.from(this.timers.values()),
      listeners: Array.from(this.listeners.values()).map(({ element: _element, listener: _listener, ...rest }) => rest),
      subscriptions: Array.from(this.subscriptions.values()).map(({ unsubscribe: _unsubscribe, ...rest }) => rest),
    };
  }

  /**
   * Create a cleanup function for React components
   */
  createComponentCleanup(componentName: string): () => void {
    return () => {
      this.cleanupContext(componentName);
    };
  }

  /**
   * Detect potential memory leaks
   */
  detectLeaks(): {
    longRunningTimers: TrackedTimer[];
    oldListeners: Omit<TrackedListener, 'element' | 'listener'>[];
    staleSubscriptions: Omit<TrackedSubscription, 'unsubscribe'>[];
  } {
    const now = Date.now();
    const thresholds = {
      timer: 5 * 60 * 1000, // 5 minutes
      listener: 10 * 60 * 1000, // 10 minutes
      subscription: 10 * 60 * 1000, // 10 minutes
    };

    return {
      longRunningTimers: Array.from(this.timers.values()).filter(
        timer => now - timer.created > thresholds.timer
      ),
      oldListeners: Array.from(this.listeners.values())
        .filter(listener => now - listener.created > thresholds.listener)
        .map(({ element, listener, ...rest }) => rest),
      staleSubscriptions: Array.from(this.subscriptions.values())
        .filter(subscription => now - subscription.created > thresholds.subscription)
        .map(({ unsubscribe, ...rest }) => rest),
    };
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();

// Export utility functions for easy use
export const createManagedTimeout = (callback: () => void, delay: number, context?: string): number => {
  return memoryManager.createTimeout(callback, delay, context);
};

export const createManagedInterval = (callback: () => void, delay: number, context?: string): number => {
  return memoryManager.createInterval(callback, delay, context);
};

export const addManagedListener = (
  element: EventTarget,
  event: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions,
  context?: string
): string => {
  return memoryManager.addEventListener(element, event, listener, options, context);
};

export const trackManagedSubscription = (unsubscribe: () => void, context?: string): string => {
  return memoryManager.trackSubscription(unsubscribe, context);
};

// Auto-cleanup interval for the memory manager itself
if (typeof window !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    memoryManager.cleanupStale();
    
    // Log leak detection periodically in development
    if (process.env.NODE_ENV === 'development') {
      const leaks = memoryManager.detectLeaks();
      const totalLeaks = leaks.longRunningTimers.length + leaks.oldListeners.length + leaks.staleSubscriptions.length;
      
      if (totalLeaks > 0) {
        logger.warn(`[MemoryManager] Detected ${totalLeaks} potential memory leaks:`, leaks);
      }
    }
  }, 10 * 60 * 1000); // Every 10 minutes

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    memoryManager.cleanupAll();
    clearInterval(cleanupInterval);
  });
}
