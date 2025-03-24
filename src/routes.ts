/**
 * Application route definitions
 * Centralizes all route paths used throughout the application
 */

export const routes = {
    // Authentication
    login: '/login',
    
    // Main routes
    home: '/',
    dashboard: '/dashboard',
    dashboardSettings: '/dashboard/settings',
    
    // Customer management
    customers: '/customers',
    customerDetail: (id?: string) => id ? `/customers/${id}` : '/customers/:id',
    
    // Tasks and offers
    tasks: '/tasks',
    offers: '/offers',
    calls: '/calls',
    
    // Admin routes
    admin: {
        recovery: '/admin/recovery',
        backup: '/admin/backup',
        serviceTypes: '/admin/service-types'
    },
    
    // System routes
    tempobook: '/tempobook',

    // Helper function to get route by name with parameters
    getPath: (key: keyof typeof routes, params?: Record<string, string>) => {
        const route = routes[key];
        if (typeof route === 'function') {
            return route();
        }
        if (typeof route === 'string') {
            if (!params) return route;
            return Object.entries(params).reduce(
                (path, [param, value]) => path.replace(`:${param}`, value),
                route
            );
        }
        return '/';
    }
} 