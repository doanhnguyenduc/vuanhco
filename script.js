'use strict';

/**
 * Vu Anh Industrial Equipment Website
 * Enhanced with security features and Exchange Online email integration
 */

// ============================================
// SECURITY UTILITIES
// ============================================
const Utils = {
    /**
     * Sanitize user input to prevent XSS attacks
     * @param {string} input - User input to sanitize
     * @returns {string} - Sanitized string
     */
    sanitizeInput: function(input) {
        if (typeof input !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },
    
    /**
     * Validate email format
     * @param {string} email - Email address to validate
     * @returns {boolean} - True if valid email format
     */
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * Debounce function to limit execution rate
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} - Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Toggle mobile menu visibility
 */
function toggleMenu() {
    const navRight = document.getElementById('navRight');
    const toggleButton = document.getElementById('mobileToggle');
    
    if (navRight && toggleButton) {
        const isActive = navRight.classList.toggle('active');
        toggleButton.setAttribute('aria-expanded', isActive.toString());
    }
}

/**
 * Close mobile menu when clicking outside
 * @param {Event} event - Click event
 */
function handleClickOutside(event) {
    const navRight = document.getElementById('navRight');
    const toggleButton = document.getElementById('mobileToggle');
    
    if (navRight && toggleButton && navRight.classList.contains('active')) {
        if (!navRight.contains(event.target) && !toggleButton.contains(event.target)) {
            navRight.classList.remove('active');
            toggleButton.setAttribute('aria-expanded', 'false');
        }
    }
}

/**
 * Smooth scroll with offset for fixed header
 * @param {string} target - Target selector (e.g., '#about')
 */
function smoothScrollWithOffset(target) {
    const element = document.querySelector(target);
    if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * Handle navigation link clicks
 * @param {Event} event - Click event
 */
function handleNavLinkClick(event) {
    const href = event.currentTarget.getAttribute('href');
    
    if (href && href.startsWith('#')) {
        event.preventDefault();
        
        // Close mobile menu if open
        const navRight = document.getElementById('navRight');
        const toggleButton = document.getElementById('mobileToggle');
        if (navRight && navRight.classList.contains('active')) {
            navRight.classList.remove('active');
            if (toggleButton) {
                toggleButton.setAttribute('aria-expanded', 'false');
            }
        }
        
        // Smooth scroll to target
        smoothScrollWithOffset(href);
        
        // Update URL without scrolling
        if (history.pushState) {
            history.pushState(null, null, href);
        }
    }
}

/**
 * Update active navigation based on scroll position
 */
function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
    
    let currentSection = '';
    const scrollPosition = window.pageYOffset + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// ============================================
// PRODUCT FILTER FEATURE
// ============================================

/**
 * Filter products based on search input
 * Implements XSS protection through sanitization
 */
function filterProducts() {
    const filterInput = document.getElementById('productFilter');
    const productCards = document.querySelectorAll('.product-card');
    
    if (!filterInput) return;
    
    // Sanitize input to prevent XSS
    const searchTerm = Utils.sanitizeInput(filterInput.value.toLowerCase().trim());
    
    productCards.forEach(card => {
        const keywords = card.getAttribute('data-keywords') || '';
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.product-header p')?.textContent.toLowerCase() || '';
        
        const searchableText = `${keywords} ${title} ${description}`.toLowerCase();
        
        if (searchableText.includes(searchTerm) || searchTerm === '') {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

// ============================================
// LANGUAGE SWITCHER FEATURE
// ============================================

/**
 * Handle language switching
 * @param {Event} event - Click event
 */
function handleLanguageSwitch(event) {
    const button = event.currentTarget;
    const lang = button.getAttribute('data-lang');
    
    // Remove active from all buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    
    // Set active on clicked button
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    
    // Store language preference in sessionStorage
    try {
        sessionStorage.setItem('preferred-language', lang);
    } catch (e) {
        console.warn('SessionStorage not available');
    }
    
    // Log language change (in production, this would load translated content)
    console.log(`Language switched to: ${lang}`);
    
    // NOTE: Full implementation requires i18n library or backend API
    // For now, this is a frontend-only implementation
}

// ============================================
// CONTACT FORM WITH EXCHANGE ONLINE INTEGRATION
// ============================================

/**
 * Handle form submission with Exchange Online email
 * @param {Event} event - Submit event
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('.form-submit');
    const messageDiv = document.getElementById('formMessage');
    
    // Get and sanitize form values
    const formData = {
        name: Utils.sanitizeInput(form.name.value.trim()),
        email: Utils.sanitizeInput(form.email.value.trim()),
        phone: Utils.sanitizeInput(form.phone.value.trim()),
        product: Utils.sanitizeInput(form.product.value),
        message: Utils.sanitizeInput(form.message.value.trim())
    };
    
    // Validation
    if (!formData.name || !formData.email || !formData.message) {
        showFormMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    if (!Utils.validateEmail(formData.email)) {
        showFormMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    if (formData.message.length < 10) {
        showFormMessage('Message must be at least 10 characters long.', 'error');
        return;
    }
    
    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    form.classList.add('loading');
    
    // Send email using mailto: protocol
    // This will open the user's default email client
    sendEmail(formData, submitButton, form);
}

/**
 * Send email using Formspree (AJAX method with proper handling)
 * @param {Object} formData - Form data object
 * @param {HTMLElement} submitButton - Submit button element
 * @param {HTMLElement} form - Form element
 */
function sendEmail(formData, submitButton, form) {
    // Create FormData object for proper submission
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('phone', formData.phone);
    data.append('product', formData.product);
    data.append('message', formData.message);
    
    fetch('https://formspree.io/f/mqayvobj', {
        method: 'POST',
        body: data,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            showFormMessage('Thank you for your inquiry! We will contact you soon.', 'success');
            form.reset();
        } else {
            return response.json().then(data => {
                if (data.errors) {
                    showFormMessage('Sorry, there was an error: ' + data.errors.map(e => e.message).join(', '), 'error');
                } else {
                    showFormMessage('Sorry, there was an error. Please try again.', 'error');
                }
            });
        }
    })
    .catch(error => {
        console.error('Formspree error:', error);
        showFormMessage('Sorry, there was an error. Please try again.', 'error');
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Inquiry';
        form.classList.remove('loading');
    });
}

/**
 * Display form message
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 */
function showFormMessage(message, type) {
    const messageDiv = document.getElementById('formMessage');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `form-message ${type}`;
        messageDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================

/**
 * Handle keyboard navigation (ESC key to close menu)
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardNav(event) {
    if (event.key === 'Escape') {
        const navRight = document.getElementById('navRight');
        const toggleButton = document.getElementById('mobileToggle');
        
        if (navRight && navRight.classList.contains('active')) {
            navRight.classList.remove('active');
            if (toggleButton) {
                toggleButton.setAttribute('aria-expanded', 'false');
                toggleButton.focus();
            }
        }
    }
}

// ============================================
// LAZY LOADING IMAGES
// ============================================

/**
 * Lazy load images when they enter viewport
 */
function lazyLoadImages() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}



// ============================================
// PAGE VISIBILITY HANDLING
// ============================================

/**
 * Handle page visibility changes (tab switching)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - can pause animations if needed
        console.log('Page hidden');
    } else {
        // Page is visible - can resume animations if needed
        console.log('Page visible');
    }
});

// ============================================
// ADD CSS CLASS FOR JAVASCRIPT-ENABLED FEATURES
// ============================================

/**
 * Add class to HTML element to indicate JavaScript is enabled
 * This allows CSS to style elements differently when JS is available
 */
document.documentElement.classList.add('js-enabled');

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Global error handler for uncaught errors
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // In production, you might want to send this to an error tracking service
});

/**
 * Global handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // In production, you might want to send this to an error tracking service
});

// ============================================
// INITIALIZATION
// ============================================
// Wrap DOMContentLoaded code:

function initializeWebsite() {
    // Original DOMContentLoaded code goes here
    // (Everything except i18n, analytics, form-handler, pwa-prompt)
    
    // Mobile toggle
    const toggleButton = document.getElementById('mobileToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleMenu);
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-menu a, .cta-button');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
    });
    
    // Product filter
    const filterInput = document.getElementById('productFilter');
    if (filterInput) {
        filterInput.addEventListener('input', Utils.debounce(filterProducts, 300));
    }
    /*
    // Mobile toggle button
    const toggleButton = document.getElementById('mobileToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleMenu);
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-menu a, .cta-button');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
    });
    
    // Language switcher
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(button => {
        button.addEventListener('click', handleLanguageSwitch);
    });
    
    // Product filter with debounce (300ms delay)
    const filterInput = document.getElementById('productFilter');
    if (filterInput) {
        filterInput.addEventListener('input', Utils.debounce(filterProducts, 300));
    }
    */
    
    // Form submission
    const inquiryForm = document.getElementById('inquiryForm');
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Click outside to close menu
    document.addEventListener('click', handleClickOutside);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNav);
    
    // Update active navigation on scroll (with requestAnimationFrame for performance)
    let scrollTimer;
    window.addEventListener('scroll', () => {
        if (scrollTimer) {
            window.cancelAnimationFrame(scrollTimer);
        }
        scrollTimer = window.requestAnimationFrame(() => {
            updateActiveNav();
        });
    }, { passive: true });
    
    // Initialize lazy loading for images
    lazyLoadImages();
    
    // Set initial active nav state
    updateActiveNav();
    
    // Load saved language preference from sessionStorage
    try {
        const savedLang = sessionStorage.getItem('preferred-language');
        if (savedLang) {
            const langButton = document.querySelector(`[data-lang="${savedLang}"]`);
            if (langButton) {
                langButton.click();
            }
        }
    } catch (e) {
        console.warn('SessionStorage not available');
    }
    
    console.log('Vu Anh Website initialized successfully');
}
