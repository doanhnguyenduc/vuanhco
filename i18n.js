/**
 * i18n Manager for Vu Anh Website
 * Handles multilingual content loading and switching
 */

const i18n = {
    currentLang: 'en',
    translations: {},
    defaultLang: 'en',
    supportedLangs: ['en', 'vi', 'cn'],
    
    /**
     * Initialize i18n system
     */
    init: async function() {
        // Detect user language preference
        this.currentLang = this.detectLanguage();
        
        // Load translation file
        await this.loadTranslations(this.currentLang);
        
        // Apply translations to page
        this.applyTranslations();
        
        // Update language buttons
        this.updateLanguageButtons();
        
        console.log(`i18n initialized with language: ${this.currentLang}`);
    },
    
    /**
     * Detect user's preferred language
     * Priority: 1. URL param 2. localStorage 3. Browser language 4. Default
     */
    detectLanguage: function() {
        // 1. Check URL parameter (?lang=vi)
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && this.supportedLangs.includes(urlLang)) {
            return urlLang;
        }
        
        // 2. Check localStorage
        try {
            const savedLang = localStorage.getItem('preferred-language');
            if (savedLang && this.supportedLangs.includes(savedLang)) {
                return savedLang;
            }
        } catch (e) {
            console.warn('localStorage not available');
        }
        
        // 3. Check browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('vi')) return 'vi';
        if (browserLang.startsWith('zh')) return 'cn';
        
        // 4. Default language
        return this.defaultLang;
    },
    
    /**
     * Load translation JSON file
     */
    loadTranslations: async function(lang) {
        try {
            const response = await fetch(`i18n/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang}.json`);
            }
            this.translations = await response.json();
            return true;
        } catch (error) {
            console.error('Error loading translations:', error);
            
            // Fallback to default language
            if (lang !== this.defaultLang) {
                console.warn(`Falling back to ${this.defaultLang}`);
                return await this.loadTranslations(this.defaultLang);
            }
            return false;
        }
    },
    
    /**
     * Get translation by key path (e.g., 'nav.home')
     */
    t: function(keyPath, params = {}) {
        const keys = keyPath.split('.');
        let value = this.translations;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                console.warn(`Translation key not found: ${keyPath}`);
                return keyPath;
            }
        }
        
        // Replace parameters like {time}
        if (typeof value === 'string') {
            return value.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }
        
        return value;
    },
    
    /**
     * Apply translations to HTML elements with data-i18n attribute
     */
    applyTranslations: function() {
        // Update meta tags
        document.title = this.t('meta.title');
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', this.t('meta.description'));
        
        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', this.t('meta.title'));
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', this.t('meta.description'));
        
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.placeholder !== undefined) {
                    element.placeholder = translation;
                } else {
                    element.value = translation;
                }
            } else {
                element.textContent = translation;
            }
        });
        
        // Update elements with data-i18n-html (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            element.innerHTML = this.t(key);
        });
        
        // Update aria-label attributes
        document.querySelectorAll('[data-i18n-aria]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            element.setAttribute('aria-label', this.t(key));
        });
        
        // Update document language attribute
        document.documentElement.lang = this.getLangCode();
    },
    
    /**
     * Get proper language code for html lang attribute
     */
    getLangCode: function() {
        const langCodes = {
            'en': 'en',
            'vi': 'vi',
            'cn': 'zh-CN'
        };
        return langCodes[this.currentLang] || 'en';
    },
    
    /**
     * Switch to a different language
     */
    switchLanguage: async function(lang) {
        if (!this.supportedLangs.includes(lang)) {
            console.error(`Unsupported language: ${lang}`);
            return false;
        }
        
        if (lang === this.currentLang) {
            return true; // Already in this language
        }
        
        // Load new translations
        const success = await this.loadTranslations(lang);
        if (!success) return false;
        
        // Update current language
        this.currentLang = lang;
        
        // Save preference
        try {
            localStorage.setItem('preferred-language', lang);
        } catch (e) {
            console.warn('Could not save language preference');
        }
        
        // Apply new translations
        this.applyTranslations();
        
        // Update language buttons
        this.updateLanguageButtons();
        
        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.pushState({}, '', url);
        
        return true;
    },
    
    /**
     * Update language button states
     */
    updateLanguageButtons: function() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            const btnLang = btn.getAttribute('data-lang');
            if (btnLang === this.currentLang) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        });
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
}
