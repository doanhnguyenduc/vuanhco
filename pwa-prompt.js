/**
 * PWA Installation Prompt Handler
 * Manages progressive web app installation experience
 */

const PWAPrompt = {
    deferredPrompt: null,
    promptShown: false,
    
    /**
     * Initialize PWA prompt
     */
    init: function() {
        // Register service worker
        this.registerServiceWorker();
        
        // Listen for install prompt event
        this.setupInstallPrompt();
        
        // Check if already installed
        this.checkIfInstalled();
        
        // Setup iOS prompt (iOS doesn't support beforeinstallprompt)
        this.setupiOSPrompt();
        
        console.log('[PWA] Initialized');
    },
    
    /**
     * Register service worker
     */
    registerServiceWorker: async function() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                
                console.log('[PWA] Service Worker registered:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('[PWA] Update found!');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }
    },
    
    /**
     * Setup install prompt event listener
     */
    setupInstallPrompt: function() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            
            console.log('[PWA] Install prompt available');
            
            // Show custom install prompt after delay
            setTimeout(() => {
                this.showInstallPrompt();
            }, 30000); // Show after 30 seconds
        });
        
        // Track successful installation
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            Analytics.trackEvent('PWA', 'Installed', 'Success');
            this.deferredPrompt = null;
            this.hideInstallPrompt();
        });
    },
    
    /**
     * Check if app is already installed
     */
    checkIfInstalled: function() {
        // Check if running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('[PWA] Running as installed app');
            Analytics.trackEvent('PWA', 'Running', 'Standalone Mode');
            return true;
        }
        return false;
    },
    
    /**
     * Show custom install prompt
     */
    showInstallPrompt: function() {
        // Don't show if already prompted or installed
        if (this.promptShown || this.checkIfInstalled()) {
            return;
        }
        
        // Check if user previously dismissed
        try {
            const dismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (dismissed) {
                const dismissedTime = parseInt(dismissed);
                const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
                
                // Don't show again for 7 days
                if (daysSinceDismissed < 7) {
                    return;
                }
            }
        } catch (e) {
            // localStorage not available
        }
        
        this.promptShown = true;
        
        // Create prompt element
        const promptHTML = `
            <div class="pwa-install-prompt" id="pwaPrompt">
                <div class="pwa-prompt-content">
                    <div class="pwa-prompt-text">
                        <h3>📱 Install Vu Anh App</h3>
                        <p>Get quick access to products and send inquiries offline!</p>
                    </div>
                    <div class="pwa-prompt-actions">
                        <button class="pwa-install-btn" id="pwaInstallBtn">Install</button>
                        <button class="pwa-dismiss-btn" id="pwaDismissBtn">Not Now</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHTML);
        
        // Show with animation
        setTimeout(() => {
            document.getElementById('pwaPrompt').classList.add('show');
        }, 100);
        
        // Setup event listeners
        document.getElementById('pwaInstallBtn').addEventListener('click', () => {
            this.triggerInstall();
        });
        
        document.getElementById('pwaDismissBtn').addEventListener('click', () => {
            this.dismissPrompt();
        });
        
        Analytics.trackEvent('PWA', 'Prompt Shown', 'Custom Prompt');
    },
    
    /**
     * Trigger PWA installation
     */
    triggerInstall: async function() {
        if (!this.deferredPrompt) {
            console.warn('[PWA] No install prompt available');
            return;
        }
        
        // Show the native install prompt
        this.deferredPrompt.prompt();
        
        // Wait for the user to respond
        const { outcome } = await this.deferredPrompt.userChoice;
        
        console.log(`[PWA] User choice: ${outcome}`);
        Analytics.trackEvent('PWA', 'Install Attempt', outcome);
        
        if (outcome === 'accepted') {
            console.log('[PWA] User accepted installation');
        } else {
            console.log('[PWA] User dismissed installation');
        }
        
        // Clear the deferred prompt
        this.deferredPrompt = null;
        
        // Hide the custom prompt
        this.hideInstallPrompt();
    },
    
    /**
     * Dismiss install prompt
     */
    dismissPrompt: function() {
        this.hideInstallPrompt();
        
        // Save dismissal time
        try {
            localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
        } catch (e) {
            console.warn('[PWA] Could not save dismissal state');
        }
        
        Analytics.trackEvent('PWA', 'Prompt Dismissed', 'User Action');
    },
    
    /**
     * Hide install prompt with animation
     */
    hideInstallPrompt: function() {
        const prompt = document.getElementById('pwaPrompt');
        if (prompt) {
            prompt.classList.remove('show');
            setTimeout(() => {
                prompt.remove();
            }, 300);
        }
    },
    
    /**
     * Setup iOS-specific install prompt
     * iOS doesn't support beforeinstallprompt, so we show manual instructions
     */
    setupiOSPrompt: function() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isInStandaloneMode = ('standalone' in window.navigator) && window.navigator.standalone;
        
        if (isIOS && !isInStandaloneMode) {
            // Show iOS-specific prompt after delay
            setTimeout(() => {
                this.showiOSPrompt();
            }, 45000); // Show after 45 seconds
        }
    },
    
    /**
     * Show iOS-specific install instructions
     */
    showiOSPrompt: function() {
        // Check if already dismissed
        try {
            const dismissed = localStorage.getItem('ios_prompt_dismissed');
            if (dismissed) {
                const dismissedTime = parseInt(dismissed);
                const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
                
                if (daysSinceDismissed < 14) {
                    return;
                }
            }
        } catch (e) {
            // localStorage not available
        }
        
        const promptHTML = `
            <div class="pwa-install-prompt" id="iosPrompt">
                <div class="pwa-prompt-content">
                    <div class="pwa-prompt-text">
                        <h3>📱 Install on iOS</h3>
                        <p>Tap the Share button <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: middle;"><path d="M8 0L4 4h2.5v5h3V4H12L8 0z"/><path d="M14 13v-8h-2v8H4V5H2v8a2 2 0 002 2h8a2 2 0 002-2z"/></svg> and "Add to Home Screen"</p>
                    </div>
                    <div class="pwa-prompt-actions">
                        <button class="pwa-dismiss-btn" id="iosDismissBtn">Got it</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHTML);
        
        setTimeout(() => {
            document.getElementById('iosPrompt').classList.add('show');
        }, 100);
        
        document.getElementById('iosDismissBtn').addEventListener('click', () => {
            const prompt = document.getElementById('iosPrompt');
            prompt.classList.remove('show');
            setTimeout(() => prompt.remove(), 300);
            
            try {
                localStorage.setItem('ios_prompt_dismissed', Date.now().toString());
            } catch (e) {
                // Ignore
            }
            
            Analytics.trackEvent('PWA', 'iOS Prompt Dismissed', 'User Action');
        });
        
        Analytics.trackEvent('PWA', 'iOS Prompt Shown', 'Custom Instructions');
    },
    
    /**
     * Show update notification when new version is available
     */
    showUpdateNotification: function() {
        const updateHTML = `
            <div class="pwa-install-prompt show" id="updatePrompt">
                <div class="pwa-prompt-content">
                    <div class="pwa-prompt-text">
                        <h3>🎉 Update Available</h3>
                        <p>A new version of Vu Anh app is ready to install.</p>
                    </div>
                    <div class="pwa-prompt-actions">
                        <button class="pwa-install-btn" id="updateInstallBtn">Update Now</button>
                        <button class="pwa-dismiss-btn" id="updateDismissBtn">Later</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', updateHTML);
        
        document.getElementById('updateInstallBtn').addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('updateDismissBtn').addEventListener('click', () => {
            const prompt = document.getElementById('updatePrompt');
            prompt.classList.remove('show');
            setTimeout(() => prompt.remove(), 300);
        });
        
        Analytics.trackEvent('PWA', 'Update Available', 'Notification Shown');
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWAPrompt.init());
} else {
    PWAPrompt.init();
}
