class TypingBattleApp {
    constructor() {
        this.initialized = false;
        this.loadingStartTime = Date.now();
        
        Logger.info('Typing Battle App starting...');
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize core systems
            await this.initializeCoreServices();
            
            // Load game assets
            await this.loadAssets();
            
            // Setup application event listeners
            this.setupEventListeners();
            
            // Initialize game engine
            this.initializeGameEngine();
            
            // Hide loading screen and show login
            this.hideLoadingScreen();
            
            this.initialized = true;
            
            const loadTime = Date.now() - this.loadingStartTime;
            Logger.info(`Application initialized in ${loadTime}ms`);
            
            EventBus.emit('app:initialized');
            
        } catch (error) {
            Logger.error('Failed to initialize application', error);
            this.showError('Failed to initialize game. Please refresh the page.');
        }
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('active');
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('active');
        }
        
        // Show login screen
        StateManager.setState('ui.currentScreen', 'login');
    }

    /**
     * Initialize core services
     */
    async initializeCoreServices() {
        Logger.info('Initializing core services...');
        
        // Services are already initialized via their constructors
        // This method can be used for additional async initialization
        
        // Set initial configuration
        Logger.setLevel(Config.get('debug.logLevel'));
        
        // Initialize audio context (requires user interaction)
        if (Config.get('audio.enabled')) {
            // Audio will be initialized on first user interaction
        }
        
        Logger.info('Core services initialized');
    }

    /**
     * Load game assets
     */
    async loadAssets() {
        Logger.info('Loading game assets...');
        
        // Simulate asset loading time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Assets would be loaded here in a real implementation
        // For now, we'll use the generated assets from AudioManager
        
        Logger.info('Game assets loaded');
    }

    /**
     * Setup application event listeners
     */
    setupEventListeners() {
        // Application lifecycle events
        EventBus.on('app:error', this.handleAppError.bind(this));
        EventBus.on('app:restart', this.restart.bind(this));
        
        // Game state events
        EventBus.on('game:start', this.handleGameStart.bind(this));
        EventBus.on('game:end', this.handleGameEnd.bind(this));
        
        // Network events
        EventBus.on('network:connected', this.handleNetworkConnected.bind(this));
        EventBus.on('network:disconnected', this.handleNetworkDisconnected.bind(this));
        
        // Error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        Logger.info('Event listeners setup complete');
    }

    /**
     * Initialize game engine
     */
    initializeGameEngine() {
        Logger.info('Initializing game engine...');
        
        // Game engine is already initialized via its constructor
        // Additional setup can be done here
        
        Logger.info('Game engine initialized');
    }

    /**
     * Handle application error
     * @param {Object} errorData - Error data
     */
    handleAppError(errorData) {
        Logger.error('Application error', errorData);
        this.showError(errorData.message || 'An unexpected error occurred');
    }

    /**
     * Handle game start
     */
    handleGameStart() {
        Logger.info('Game started');
        StateManager.setState('game.startTime', Date.now());
    }

    /**
     * Handle game end
     */
    handleGameEnd() {
        Logger.info('Game ended');
        StateManager.setState('game.endTime', Date.now());
    }

    /**
     * Handle network connected
     */
    handleNetworkConnected() {
        Logger.info('Network connected');
        StateManager.addNotification({
            type: 'success',
            message: 'Connected to server',
            duration: 3000
        });
    }

    /**
     * Handle network disconnected
     */
    handleNetworkDisconnected() {
        Logger.warn('Network disconnected');
        StateManager.addNotification({
            type: 'warning',
            message: 'Disconnected from server',
            duration: 5000
        });
    }

    /**
     * Handle global JavaScript errors
     * @param {ErrorEvent} event - Error event
     */
    handleGlobalError(event) {
        Logger.error('Global error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        EventBus.emit('app:error', {
            type: 'javascript',
            message: event.message,
            source: event.filename
        });
    }

    /**
     * Handle unhandled promise rejections
     * @param {PromiseRejectionEvent} event - Promise rejection event
     */
    handleUnhandledRejection(event) {
        Logger.error('Unhandled promise rejection', event.reason);
        
        EventBus.emit('app:error', {
            type: 'promise',
            message: event.reason?.message || 'Unhandled promise rejection',
            reason: event.reason
        });
    }

/**
 * Show error message to user
 * @param {string} message - Error message
 */
