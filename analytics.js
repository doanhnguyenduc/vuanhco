/**
 * Privacy-First Analytics Module
 * Tracks essential metrics without cookies or PII
 * Data stored locally and optionally sent to server
 */

const Analytics = {
    sessionId: null,
    metrics: {
        pageViews: [],
        interactions: [],
        performance: {},
        errors: []
    },
    
    /**
     * Initialize analytics
     */
    init: function() {
        this.sessionId = this.generateSessionId();
        this.trackPageView();
        this.trackPerformance();
        this.setupEventListeners();
        this.trackErrors();
        
        console.log('[Analytics] Initialized');
    },
    
    /**
     * Generate anonymous session ID
     */
    generateSessionId: function() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * Track page view
     */
    trackPageView: function() {
        const data = {
            timestamp: Date.now(),
            url: window.location.pathname,
            referrer: document.referrer || 'direct',
            screenResolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language || navigator.userLanguage,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        this.metrics.pageViews.push(data);
        this.saveToStorage();
    },
    
    /**
     * Track user interactions
     */
    trackEvent: function(category, action, label = '', value = 0) {
        const data = {
            timestamp: Date.now(),
            category,
            action,
            label,
            value
        };
        
        this.metrics.interactions.push(data);
        this.saveToStorage();
        
        console.log('[Analytics] Event:', data);
    },
    
    /**
     * Track web vitals and performance metrics
     */
    trackPerformance: function() {
        // Wait for page load
        if (document.readyState === 'complete') {
            this.collectPerformanceMetrics();
        } else {
            window.addEventListener('load', () => this.collectPerformanceMetrics());
        }
        
        // Track Core Web Vitals using PerformanceObserver
        this.trackWebVitals();
    },
    
    /**
     * Collect performance metrics
     */
    collectPerformanceMetrics: function() {
        if (!window.performance || !performance.timing) return;
        
        const timing = performance.timing;
        const metrics = {
            timestamp: Date.now(),
            // Page Load Times
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            pageLoad: timing.loadEventEnd - timing.navigationStart,
            domInteractive: timing.domInteractive - timing.navigationStart,
            
            // Network Timing
            dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
            tcpConnection: timing.connectEnd - timing.connectStart,
            serverResponse: timing.responseEnd - timing.requestStart,
            
            // Resource Timing
            resourceCount: performance.getEntriesByType('resource').length,
            
            // Memory (if available)
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize
            } : null
        };
        
        this.metrics.performance = metrics;
        this.saveToStorage();
        
        console.log('[Analytics] Performance:', metrics);
    },
    
    /**
     * Track Core Web Vitals (LCP, FID, CLS)
     */
    trackWebVitals: function() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    
                    this.trackEvent('Web Vitals', 'LCP', '', Math.round(lastEntry.renderTime || lastEntry.loadTime));
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                
                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.trackEvent('Web Vitals', 'FID', '', Math.round(entry.processingStart - entry.startTime));
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
                
                // Cumulative Layout Shift (CLS)
                let clsScore = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsScore += entry.value;
                        }
                    }
                    this.trackEvent('Web Vitals', 'CLS', '', Math.round(clsScore * 1000));
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
                console.warn('[Analytics] PerformanceObserver not fully supported');
            }
        }
    },
    
    /**
     * Setup event listeners for interactions
     */
    setupEventListeners: function() {
        // Track navigation clicks
        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                const text = link.textContent.trim().substring(0, 50);
                this.trackEvent('Navigation', 'Click', `${text} -> ${href}`);
            });
        });
        
        // Track form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                const formId = form.id || 'unknown';
                this.trackEvent('Form', 'Submit', formId);
            });
        });
        
        // Track CTA button clicks
        document.querySelectorAll('.cta-button').forEach(button => {
            button.addEventListener('click', () => {
                this.trackEvent('CTA', 'Click', button.textContent.trim());
            });
        });
        
        // Track product filter usage
        const filterInput = document.getElementById('productFilter');
        if (filterInput) {
            let filterTimer;
            filterInput.addEventListener('input', () => {
                clearTimeout(filterTimer);
                filterTimer = setTimeout(() => {
                    this.trackEvent('Product Filter', 'Search', filterInput.value.substring(0, 30));
                }, 1000);
            });
        }
        
        // Track language switches
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                this.trackEvent('Language', 'Switch', lang);
            });
        });
        
        // Track scroll depth
        this.trackScrollDepth();
    },
    
    /**
     * Track scroll depth
     */
    trackScrollDepth: function() {
        const milestones = [25, 50, 75, 100];
        const tracked = new Set();
        
        const checkScroll = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !tracked.has(milestone)) {
                    tracked.add(milestone);
                    this.trackEvent('Scroll Depth', 'Reached', `${milestone}%`, milestone);
                }
            });
        };
        
        window.addEventListener('scroll', Utils.debounce(checkScroll, 500), { passive: true });
    },
    
    /**
     * Track JavaScript errors
     */
    trackErrors: function() {
        window.addEventListener('error', (event) => {
            const error = {
                timestamp: Date.now(),
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno
            };
            
            this.metrics.errors.push(error);
            this.saveToStorage();
            
            console.error('[Analytics] Error tracked:', error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            const error = {
                timestamp: Date.now(),
                message: 'Unhandled Promise Rejection',
                reason: event.reason?.toString() || 'Unknown'
            };
            
            this.metrics.errors.push(error);
            this.saveToStorage();
        });
    },
    
    /**
     * Save metrics to localStorage
     */
    saveToStorage: function() {
        try {
            const data = {
                sessionId: this.sessionId,
                metrics: this.metrics,
                lastUpdated: Date.now()
            };
            
            localStorage.setItem('vuanh_analytics', JSON.stringify(data));
        } catch (e) {
            console.warn('[Analytics] Could not save to storage');
        }
    },
    
    /**
     * Get analytics summary
     */
    getSummary: function() {
        return {
            sessionId: this.sessionId,
            pageViews: this.metrics.pageViews.length,
            interactions: this.metrics.interactions.length,
            errors: this.metrics.errors.length,
            performance: this.metrics.performance
        };
    },
    
    /**
     * Export metrics (for debugging or sending to server)
     */
    exportData: function() {
        return JSON.stringify({
            sessionId: this.sessionId,
            metrics: this.metrics,
            exportedAt: Date.now()
        }, null, 2);
    },
    
    /**
     * Clear all analytics data
     */
    clearData: function() {
        this.metrics = {
            pageViews: [],
            interactions: [],
            performance: {},
            errors: []
        };
        
        try {
            localStorage.removeItem('vuanh_analytics');
        } catch (e) {
            console.warn('[Analytics] Could not clear storage');
        }
        
        console.log('[Analytics] Data cleared');
    }
};

// Auto-initialize analytics
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Analytics.init());
} else {
    Analytics.init();
}

// Expose to window for debugging
window.VuAnhAnalytics = Analytics;
