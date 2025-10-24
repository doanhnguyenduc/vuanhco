/**
 * Enhanced Form Handler with Security & Offline Support
 * Includes: Input validation, sanitization, rate limiting, offline queue
 */

const FormHandler = {
    pendingSubmissions: [],
    
    /**
     * Initialize form handler
     */
    init: function() {
        this.loadPendingSubmissions();
        this.setupOnlineListener();
        console.log('[FormHandler] Initialized');
    },
    
    /**
     * Handle form submission with full security
     * @param {Event} event - Form submit event
     */
    handleSubmit: async function(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitButton = form.querySelector('.form-submit');
        const messageDiv = document.getElementById('formMessage');
        
        // Step 1: Rate limiting check
        const rateLimitCheck = RateLimiter.checkLimit('contact-form', 3, 300000); // 3 attempts per 5min
        if (!rateLimitCheck.allowed) {
            this.showMessage(
                i18n.t('contact.form.errorRate', { time: rateLimitCheck.waitTime }),
                'error'
            );
            return;
        }
        
        // Step 2: Extract and sanitize form data
        const formData = this.extractFormData(form);
        
        // Step 3: Validate all fields
        const validation = this.validateFormData(formData);
        if (!validation.valid) {
            this.showMessage(validation.message, 'error');
            this.highlightInvalidFields(form, validation.fields);
            return;
        }
        
        // Step 4: Generate CSRF token
        const csrfToken = SecurityUtils.generateCSRFToken();
        SecurityUtils.storeCSRFToken(csrfToken);
        
        // Step 5: Prepare submission
        const submission = {
            ...formData,
            timestamp: Date.now(),
            csrfToken: csrfToken,
            sessionId: Analytics.sessionId || 'unknown',
            language: i18n.currentLang
        };
        
        // Step 6: Disable form during submission
        this.setFormState(form, submitButton, true);
        
        // Step 7: Attempt to send
        try {
            const success = await this.sendSubmission(submission);
            
            if (success) {
                this.showMessage(i18n.t('contact.form.success'), 'success');
                form.reset();
                Analytics.trackEvent('Form', 'Success', 'Contact Form');
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            console.error('[FormHandler] Submission error:', error);
            
            // Check if offline
            if (!navigator.onLine) {
                this.queueOfflineSubmission(submission);
                this.showMessage(
                    'You are offline. Your message has been saved and will be sent when you reconnect.',
                    'warning'
                );
                form.reset();
                Analytics.trackEvent('Form', 'Queued Offline', 'Contact Form');
            } else {
                this.showMessage(i18n.t('contact.form.error'), 'error');
                Analytics.trackEvent('Form', 'Error', 'Contact Form');
            }
        } finally {
            this.setFormState(form, submitButton, false);
        }
    },
    
    /**
     * Extract and sanitize form data
     */
    extractFormData: function(form) {
        return {
            name: SecurityUtils.sanitizeInput(form.name.value.trim()),
            email: SecurityUtils.sanitizeInput(form.email.value.trim()),
            phone: SecurityUtils.sanitizeInput(form.phone.value.trim()),
            product: SecurityUtils.sanitizeInput(form.product.value),
            message: SecurityUtils.sanitizeInput(form.message.value.trim())
        };
    // Also update validation to use SecurityUtils
    if (!SecurityUtils.validateEmail(data.email)) {
    return { valid: false, message: i18n.t('contact.form.errorEmail'), fields: ['email'] };
    }

    if (data.phone && !SecurityUtils.validatePhone(data.phone)) {
    return { valid: false, message: 'Phone number contains invalid characters', fields: ['phone'] };
    }
    },
    
    /**
     * Comprehensive form validation
     */
    validateFormData: function(data) {
        const invalidFields = [];
        
        // Name validation
        if (!data.name || data.name.length < 2) {
            invalidFields.push('name');
        }
        if (data.name.length > 100) {
            return { valid: false, message: 'Name is too long (max 100 characters)', fields: ['name'] };
        }
        
        // Email validation
        if (!data.email) {
            invalidFields.push('email');
        } else if (!Utils.validateEmail(data.email)) {
            return { valid: false, message: i18n.t('contact.form.errorEmail'), fields: ['email'] };
        }
        if (data.email.length > 254) {
            return { valid: false, message: 'Email is too long', fields: ['email'] };
        }
        
        // Phone validation (optional but must be valid if provided)
        if (data.phone && data.phone.length > 0) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(data.phone)) {
                return { valid: false, message: 'Phone number contains invalid characters', fields: ['phone'] };
            }
            if (data.phone.length > 20) {
                return { valid: false, message: 'Phone number is too long', fields: ['phone'] };
            }
        }
        
        // Message validation
        if (!data.message || data.message.length < 10) {
            return { valid: false, message: i18n.t('contact.form.errorMessage'), fields: ['message'] };
        }
        if (data.message.length > 5000) {
            return { valid: false, message: 'Message is too long (max 5000 characters)', fields: ['message'] };
        }
        
        // Check for spam patterns
        const spamPatterns = [
            /(?:https?:\/\/){3,}/gi, // Multiple URLs
            /(?:viagra|cialis|casino|lottery)/gi, // Spam keywords
            /(.)\1{20,}/gi // Repeated characters
        ];
        
        for (const pattern of spamPatterns) {
            if (pattern.test(data.message) || pattern.test(data.name)) {
                return { valid: false, message: 'Message appears to be spam', fields: [] };
            }
        }
        
        // Check if all required fields are present
        if (invalidFields.length > 0) {
            return { valid: false, message: i18n.t('contact.form.errorFields'), fields: invalidFields };
        }
        
        return { valid: true, message: '', fields: [] };
    },
    
    /**
     * Highlight invalid form fields
     */
    highlightInvalidFields: function(form, fields) {
        // Remove previous highlights
        form.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });
        
        // Add highlights to invalid fields
        fields.forEach(fieldName => {
            const input = form.querySelector(`[name="${fieldName}"]`);
            if (input) {
                input.closest('.form-group').classList.add('error');
                input.setAttribute('aria-invalid', 'true');
            }
        });
    },
    
    /**
     * Send form submission to Formspree
     */
    sendSubmission: async function(data) {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('email', data.email);
        formData.append('phone', data.phone);
        formData.append('product', data.product);
        formData.append('message', data.message);
        formData.append('_language', data.language);
        formData.append('_timestamp', new Date(data.timestamp).toISOString());
        
        const response = await fetch('https://formspree.io/f/mqayvobj', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.message || 'Submission failed');
        }
        
        return true;
    },
    
    /**
     * Queue submission for sending when online
     */
    queueOfflineSubmission: function(submission) {
        this.pendingSubmissions.push(submission);
        this.savePendingSubmissions();
        
        // Show notification badge
        this.updateOfflineBadge();
    },
    
    /**
     * Save pending submissions to localStorage
     */
    savePendingSubmissions: function() {
        try {
            localStorage.setItem('vuanh_pending_submissions', JSON.stringify(this.pendingSubmissions));
        } catch (e) {
            console.error('[FormHandler] Could not save pending submissions');
        }
    },
    
    /**
     * Load pending submissions from localStorage
     */
    loadPendingSubmissions: function() {
        try {
            const saved = localStorage.getItem('vuanh_pending_submissions');
            if (saved) {
                this.pendingSubmissions = JSON.parse(saved);
                if (this.pendingSubmissions.length > 0) {
                    this.updateOfflineBadge();
                }
            }
        } catch (e) {
            console.error('[FormHandler] Could not load pending submissions');
            this.pendingSubmissions = [];
        }
    },
    
    /**
     * Setup online event listener to send pending submissions
     */
    setupOnlineListener: function() {
        window.addEventListener('online', async () => {
            console.log('[FormHandler] Connection restored, sending pending submissions...');
            await this.sendPendingSubmissions();
        });
    },
    
    /**
     * Send all pending submissions
     */
    sendPendingSubmissions: async function() {
        if (this.pendingSubmissions.length === 0) return;
        
        const results = [];
        
        for (const submission of this.pendingSubmissions) {
            try {
                const success = await this.sendSubmission(submission);
                results.push({ submission, success });
                
                // Small delay between submissions to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('[FormHandler] Failed to send pending submission:', error);
                results.push({ submission, success: false });
            }
        }
        
        // Remove successful submissions
        this.pendingSubmissions = results
            .filter(r => !r.success)
            .map(r => r.submission);
        
        this.savePendingSubmissions();
        this.updateOfflineBadge();
        
        // Show notification
        const successCount = results.filter(r => r.success).length;
        if (successCount > 0) {
            this.showMessage(
                `${successCount} pending message(s) sent successfully!`,
                'success'
            );
        }
    },
    
    /**
     * Update offline submission badge
     */
    updateOfflineBadge: function() {
        let badge = document.querySelector('.offline-badge');
        
        if (this.pendingSubmissions.length > 0) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'offline-badge';
                badge.setAttribute('role', 'status');
                badge.setAttribute('aria-live', 'polite');
                document.body.appendChild(badge);
            }
            badge.textContent = `${this.pendingSubmissions.length} pending message(s)`;
            badge.style.display = 'block';
        } else if (badge) {
            badge.style.display = 'none';
        }
    },
    
    /**
     * Set form loading state
     */
    setFormState: function(form, button, loading) {
        if (loading) {
            button.disabled = true;
            button.textContent = i18n.t('contact.form.submitting');
            form.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = i18n.t('contact.form.submit');
            form.classList.remove('loading');
        }
    },
    
    /**
     * Show form message
     */
    showMessage: function(message, type) {
        const messageDiv = document.getElementById('formMessage');
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `form-message ${type}`;
        messageDiv.style.display = 'block';
        messageDiv.setAttribute('role', 'alert');
        
        // Auto-hide after 7 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 7000);
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FormHandler.init());
} else {
    FormHandler.init();
}
