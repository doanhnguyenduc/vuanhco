'use strict';

/**
 * Mobile menu toggle functionality
 */
function toggleMenu() {
    const menu = document.getElementById('navMenu');
    const toggleButton = document.getElementById('mobileToggle');
    
    if (menu && toggleButton) {
        const isActive = menu.classList.toggle('active');
        toggleButton.setAttribute('aria-expanded', isActive.toString());
    }
}

/**
 * Close mobile menu when clicking outside
 */
function handleClickOutside(event) {
    const menu = document.getElementById('navMenu');
    const toggleButton = document.getElementById('mobileToggle');
    
    if (menu && toggleButton && menu.classList.contains('active')) {
        if (!menu.contains(event.target) && !toggleButton.contains(event.target)) {
            menu.classList.remove('active');
            toggleButton.setAttribute('aria-expanded', 'false');
        }
    }
}

/**
 * Smooth scroll with offset for fixed header
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
 */
function handleNavLinkClick(event) {
    const href = event.currentTarget.getAttribute('href');
    
    if (href && href.startsWith('#')) {
        event.preventDefault();
        
        // Close mobile menu if open
        const menu = document.getElementById('navMenu');
        const toggleButton = document.getElementById('mobileToggle');
        if (menu && menu.classList.contains('active')) {
            menu.classList.remove('active');
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
 * Add active class to current section in navigation
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

/**
 * Add keyboard navigation support
 */
function handleKeyboardNav(event) {
    // Close menu on Escape key
    if (event.key === 'Escape') {
        const menu = document.getElementById('navMenu');
        const toggleButton = document.getElementById('mobileToggle');
        
        if (menu && menu.classList.contains('active')) {
            menu.classList.remove('active');
            if (toggleButton) {
                toggleButton.setAttribute('aria-expanded', 'false');
                toggleButton.focus();
            }
        }
    }
}

/**
 * Initialize all functionality when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Click outside to close menu
    document.addEventListener('click', handleClickOutside);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNav);
    
    // Update active navigation on scroll
    let scrollTimer;
    window.addEventListener('scroll', () => {
        if (scrollTimer) {
            window.cancelAnimationFrame(scrollTimer);
        }
        scrollTimer = window.requestAnimationFrame(() => {
            updateActiveNav();
        });
    }, { passive: true });
    
    // Initialize lazy loading
    lazyLoadImages();
    
    // Set initial active nav state
    updateActiveNav();
});

/**
 * Handle page visibility change (tab switching)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - can pause animations if needed
    } else {
        // Page is visible - can resume animations if needed
    }
});

/**
 * Add CSS class for JavaScript-enabled features
 */
document.documentElement.classList.add('js-enabled');
