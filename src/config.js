// API Configuration for different environments
const config = {
    // Development (Web browser)
    development: {
        API_BASE_URL: 'http://localhost:3001'
    },
    
    // Mobile app (use your computer's IP address)
    mobile: {
        API_BASE_URL: 'http://10.22.175.185:3001'
    }
};

// Detect if running in mobile app (Capacitor)
const isMobile = window.Capacitor !== undefined;

// Export the appropriate configuration
export const API_BASE_URL = isMobile ? config.mobile.API_BASE_URL : config.development.API_BASE_URL;

console.log(`🌐 API Base URL: ${API_BASE_URL} (${isMobile ? 'Mobile' : 'Web'} mode)`);