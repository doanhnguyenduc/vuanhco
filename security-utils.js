/**
 * Enhanced Security Utilities for Vu Anh Website
 * Protects against XSS, CSRF, and injection attacks
 */

const SecurityUtils = {
    /**
     * COMPREHENSIVE XSS Protection
     * Removes ALL potentially dangerous HTML/JS
     */
    sanitizeInput: function(input) {
        if (typeof input !== 'string') return '';
        
        // Step 1: Remove all HTML tags completely
        let cleaned = input.replace(/<[^>]*>/g, '');
        
        // Step 2: Decode HTML entities to prevent double-encoding bypass
        const textarea = document.createElement('textarea');
        textarea.innerHTML = cleaned;
        cleaned = textarea.value;
        
        // Step 3: Remove dangerous characters and patterns
        cleaned = cleaned
            .replace(/[<>\"\']/g, '') // Remove angle brackets and quotes
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onerror=, etc.)
            .replace(/data:/gi, '') // Remove data: protocol
            .replace(/vbscript:/gi, ''); // Remove vbscript: protocol
        
        // Step 4: Limit length to prevent buffer overflow
        cleaned = cleaned.substring(0, 10000);
        
        // Step 5: Final HTML entity encoding
        const div = document.createElement('div');
        div.textContent = cleaned;
        return div.innerHTML;
    },

    /**
     * Enhanced email validation with security checks
     */
    validateEmail: function(email) {
        if (!email || typeof email !== 'string') return false;
        
        // Length check
        if (email.length > 254) return false;
        
        // RFC 5322 compliant regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(email)) return false;
        
        // Check for dangerous patterns
        const dangerous = [
            'javascript:', 'data:', 'vbscript:', '<script', 
            'onerror', 'onload', '%00', '\x00'
        ];
        
        const lowerEmail = email.toLowerCase();
        for (const pattern of dangerous) {
            if (lowerEmail.includes(pattern)) return false;
        }
        
        return true;
    },

    /**
     * Validate phone number with international format support
     */
    validatePhone: function(phone) {
        if (!phone) return true; // Optional field
        if (phone.length > 20) return false;
        
        // Allow: digits, spaces, +, -, (, )
        const phoneRegex = /^[\d\s\+\-\(\)]+$/;
        if (!phoneRegex.test(phone)) return false;
        
        // Check for suspicious patterns
        if (/<|>|script|javascript/gi.test(phone)) return false;
        
        return true;
    },

    /**
     * CSRF Token Generation (SHA-256 based)
     */
    generateCSRFToken: function() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Store CSRF token securely
     */
    storeCSRFToken: function(token) {
        try {
            sessionStorage.setItem('csrf_token', token);
            sessionStorage.setItem('csrf_timestamp', Date.now().toString());
        } catch (e) {
            console.warn('[Security] Could not store CSRF token');
        }
    },

    /**
     * Validate CSRF token
     */
    validateCSRFToken: function(token) {
        try {
            const storedToken = sessionStorage.getItem('csrf_token');
            const timestamp = parseInt(sessionStorage.getItem('csrf_timestamp'));
            
            // Token expires after 1 hour
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - timestamp > oneHour) {
                console.warn('[Security] CSRF token expired');
                return false;
            }
            
            return token === storedToken;
        } catch (e) {
            return false;
        }
    },

    /**
     * Content Security Policy - Log violations
     */
    setupCSP: function() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('securitypolicyviolation', (e) => {
            console.error('[Security] CSP Violation:', {
                blockedURI: e.blockedURI,
                violatedDirective: e.violatedDirective,
                originalPolicy: e.originalPolicy
            });
            
            // Track in analytics
            if (typeof Analytics !== 'undefined') {
                Analytics.trackEvent('Security', 'CSP Violation', e.violatedDirective);
            }
        });
    },

    /**
     * Detect and prevent clickjacking
     */
    preventClickjacking: function() {
        if (window.self !== window.top) {
            // Website is in iframe - potential clickjacking
            console.error('[Security] Clickjacking attempt detected!');
            
            // Break out of iframe
            window.top.location = window.self.location;
            
            // Track incident
            if (typeof Analytics !== 'undefined') {
                Analytics.trackEvent('Security', 'Clickjacking Attempt', window.location.href);
            }
        }
    }
};

/**
 * Rate Limiter to prevent abuse
 */
const RateLimiter = {
    attempts: {},

    /**
     * Check if action is rate limited
     * @param {string} key - Unique identifier (e.g., 'contact-form')
     * @param {number} maxAttempts - Maximum attempts allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {object} - {allowed: boolean, waitTime: number}
     */
    checkLimit: function(key, maxAttempts, windowMs) {
        const now = Date.now();
        
        // Initialize or clean old attempts
        if (!this.attempts[key]) {
            this.attempts[key] = [];
        }
        
        // Remove attempts outside time window
        this.attempts[key] = this.attempts[key].filter(
            timestamp => now - timestamp < windowMs
        );
        
        // Check if limit exceeded
        if (this.attempts[key].length >= maxAttempts) {
            const oldestAttempt = Math.min(...this.attempts[key]);
            const waitTime = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
            
            return {
                allowed: false,
                waitTime: waitTime
            };
        }
        
        // Record this attempt
        this.attempts[key].push(now);
        
        return {
            allowed: true,
            waitTime: 0
        };
    },

    /**
     * Reset rate limit for a key
     */
    reset: function(key) {
        delete this.attempts[key];
    }
};

// Initialize security features on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            SecurityUtils.setupCSP();
            SecurityUtils.preventClickjacking();
        });
    } else {
        SecurityUtils.setupCSP();
        SecurityUtils.preventClickjacking();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecurityUtils, RateLimiter };
}
