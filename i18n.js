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
