import { Business, Category, City, SearchResponse, Review, ReviewReply } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://local-business-listing-directory-production.up.railway.app/api/v1';
const API_ROOT = API_BASE_URL.split('/api')[0];

console.log('[api.ts] Unified API_BASE_URL:', API_BASE_URL);

export const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('data:')) return path; // Base64 preview
    if (path.startsWith('http')) return path; // Cloudinary or full URL

    // For relative paths, prepend API_ROOT (e.g., http://127.0.0.1:3001)
    // Trim leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_ROOT}/${cleanPath}`;
};

interface FetcherOptions extends RequestInit {
    silent?: boolean;
    timeout?: number;
}

async function fetcher<T>(endpoint: string, options?: FetcherOptions): Promise<T> {
    const headers = new Headers(options?.headers);

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    console.log(`[api.ts] Fetching: ${API_BASE_URL}${endpoint}`);

    const controller = new AbortController();
    const timeout = options?.timeout || 60000;
    const timeoutId = setTimeout(() => controller.abort(), timeout); // Use custom or 60s default

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/'}${cleanEndpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));

            // Only redirect on 401 for protected (non-auth) endpoints.
            // Auth endpoints (/auth/login, /auth/google, /auth/register) must
            // throw so the login UI can display the real error message.
            const isAuthEndpoint = endpoint.startsWith('/auth/');

            if (response.status === 401 && !isAuthEndpoint) {
                // Handle invalid/expired token globally
                if (typeof window !== 'undefined') {
                    console.error('[api.ts] Unauthorized! Clearing token...');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login?error=expired';
                }
            } else {
                // Only log stack traces for 500 errors to avoid console noise for expected validation constraints (400, 404)
                if (response.status >= 500) {
                    console.error(`[api.ts] API Error on ${endpoint}:`, response.status, response.statusText, JSON.stringify(error, null, 2));
                }
            }

            if (options?.silent && response.status === 404) {
                console.warn(`[api.ts] Silent 404 on ${endpoint}`);
                return [] as any;
            }
            throw new Error(error.message || 'API request failed');
        }

        // Check if the response has content before parsing as JSON
        const text = await response.text();
        return text ? JSON.parse(text) : (undefined as any);
    } catch (error: any) {
        clearTimeout(timeoutId);

        // Comprehensive Network Error Logging (Chrome: "Failed to fetch", Firefox: "NetworkError when attempting to fetch resource")
        const isNetworkError = (error instanceof TypeError && (
            error.message.includes('fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('Network Request Failed')
        ));

        if (isNetworkError) {
            console.error('[api.ts] Network Error Details:', {
                message: error.message,
                name: error.name,
                url: `${API_BASE_URL}${endpoint}`,
                stack: error.stack,
                apiUrlSet: API_BASE_URL,
            });
            // Try to log the keys of the error object just in case
            console.error('[api.ts] Network Error Object Keys:', Object.getOwnPropertyNames(error));

            throw new Error(`Connection Failed: Unable to reach the backend at ${API_BASE_URL}. Ensure the server is running and CORS is allowed. Error: ${error.message}`);
        }

        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection.');
        }
        if (options?.silent) {
            console.warn(`[api.ts] Silent error on ${endpoint}`, error.message);
            return [] as any;
        }
        throw error;
    }
}

export const api = {
    get: <T>(endpoint: string, options?: FetcherOptions) => fetcher<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body?: any, options?: FetcherOptions) => fetcher<T>(endpoint, { 
        ...options, 
        method: 'POST', 
        body: body ? JSON.stringify(body) : undefined 
    }),
    patch: <T>(endpoint: string, body?: any, options?: FetcherOptions) => fetcher<T>(endpoint, { 
        ...options, 
        method: 'PATCH', 
        body: body ? JSON.stringify(body) : undefined 
    }),
    delete: <T>(endpoint: string, options?: FetcherOptions) => fetcher<T>(endpoint, { ...options, method: 'DELETE' }),
    
    categories: {
        getAll: () => fetcher<Category[]>('/categories'),
        getPopular: (limit = 8) => fetcher<Category[]>(`/categories/popular?limit=${limit}`),
        getTree: () => fetcher<Category[]>('/categories/tree'),
        getBySlug: (slug: string) => fetcher<Category>(`/categories/slug/${slug}`),
        // Admin endpoints
        adminGetAll: (page = 1, limit = 10, search = '') => {
            const query = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                search
            }).toString();
            return fetcher<{ data: Category[], total: number }>(`/categories/admin?${query}`);
        },
        adminCreate: (data: any) => fetcher<Category>('/categories/admin', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        adminUpdate: (id: string, data: any) => fetcher<Category>(`/categories/admin/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        adminUpdateStatus: (id: string, status: string) => fetcher<Category>(`/categories/admin/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
        adminDelete: (id: string) => fetcher<void>(`/categories/admin/${id}`, {
            method: 'DELETE',
        }),
        syncGoogle: (name: string) => fetcher<Category>('/categories/sync-google', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),
        bulkImportGoogle: () => fetcher(`/categories/admin/bulk-import-google`, {
            method: 'POST',
            timeout: 300000, // 5 minute timeout for bulk import
        }),
        suggest: (title: string, description?: string) => {
            const query = new URLSearchParams({ title, description: description || '' }).toString();
            return fetcher<Category[]>(`/categories/suggest?${query}`);
        },
    },
    listings: {
        create: (listingData: any) => fetcher<Business>('/businesses', {
            method: 'POST',
            body: JSON.stringify(listingData),
        }),
        search: (params: Record<string, string | number | boolean | undefined | null>) => {
            const sanitizedParams: Record<string, string> = {};

            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '' && value !== false) {
                    sanitizedParams[key] = String(value);
                }
            });

            const query = new URLSearchParams(sanitizedParams).toString();
            return fetcher<SearchResponse>(`/businesses/search?${query}`);
        },
        getBySlug: (slug: string) => fetcher<Business>(`/businesses/slug/${slug}`),
        getFeatured: (page = 1, limit = 12) => fetcher<SearchResponse>(`/businesses/search?featuredOnly=true&page=${page}&limit=${limit}`),
        uploadImage: async (file: File) => {
            const result = await api.cloudinary.uploadToCloudinary(file, 'listings');
            return { url: result.secure_url };
        },
        getMyListings: (params: any = {}) => {
            const query = new URLSearchParams(params).toString();
            return fetcher<{ data: Business[], meta: any }>(`/businesses/vendor/my-listings?${query}`);
        },
        update: (id: string, listingData: any) => fetcher<Business>(`/businesses/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(listingData),
        }),
        getAmenities: () => fetcher<any[]>('/businesses/amenities/all'),
        createAmenity: (data: { name: string, icon?: string }) => fetcher<any>('/businesses/amenities', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
    cities: {
        getPopular: () => fetcher<City[]>('/cities/popular'),
        getAll: () => fetcher<City[]>('/cities'),
        getSupportedCountries: () => fetcher<{ country: string; cityCount: number }[]>('/cities/supported-countries'),
        // Admin endpoints
        adminCreate: (data: any) => fetcher<City>('/cities/admin', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        adminUpdate: (id: string, data: any) => fetcher<City>(`/cities/admin/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        adminList: (page = 1, limit = 10, search = '') => {
            const query = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                search
            }).toString();
            return fetcher<{ data: City[], total: number }>(`/cities/admin?${query}`);
        },
        adminDelete: (id: string) => fetcher<void>(`/cities/admin/${id}`, {
            method: 'DELETE',
        }),
        bulkImport: (country = 'Pakistan') => fetcher<{ count: number, total: number }>('/cities/admin/bulk-import', {
            method: 'POST',
            body: JSON.stringify({ country }),
            timeout: 60000,
        }),
    },
    reviews: {
        findAll: (params: any = {}) => {
            const query = new URLSearchParams(params).toString();
            return fetcher<{ data: Review[], meta: any }>(`/reviews?${query}`);
        },
        getByBusiness: (idOrSlug: string) => fetcher<{ data: Review[], meta: any }>(`/reviews/business/${idOrSlug}`),
        getByVendor: (vendorId: string) => fetcher<{ data: Review[], meta: any }>(`/reviews?vendorId=${vendorId}`),
        getVendorAll: (page = 1, limit = 20) => fetcher<{ data: Review[], meta: any }>(`/reviews/vendor/all?page=${page}&limit=${limit}`),
        getPopular: (limit = 3) => fetcher<{ data: Review[], meta: any }>(`/reviews?rating=5&limit=${limit}`),
        create: (reviewData: any) => fetcher<Review>('/reviews', {
            method: 'POST',
            body: JSON.stringify(reviewData),
        }),
        createReply: (reviewId: string, content: string) => fetcher<ReviewReply>(`/reviews/${reviewId}/replies`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        }),
        respond: (reviewId: string, response: string) => fetcher<Review>(`/reviews/${reviewId}/response`, {
            method: 'POST',
            body: JSON.stringify({ response }),
        }),
        // Admin endpoints
        adminGetAll: (params: any = {}) => {
            const query = new URLSearchParams(params).toString();
            return fetcher<{ data: Review[], meta: any }>(`/reviews/admin/all?${query}`);
        },
        adminModerate: (id: string, data: { isApproved?: boolean; isSuspicious?: boolean }) => fetcher<Review>(`/reviews/admin/${id}/moderate`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    },
    cloudinary: {
        getSignature: () => fetcher<{ timestamp: number, signature: string, apiKey: string, cloudName: string }>('/cloudinary/sign', {
            method: 'POST',
        }),
        uploadToCloudinary: async (file: File, folder: string) => {
            // 1. Get signature from backend
            const { timestamp, signature, apiKey, cloudName } = await api.cloudinary.getSignature();

            console.log('[api.ts] UPLOAD DEBUG: Sending EXACTLY these params to Cloudinary:', {
                cloudName,
                api_key: apiKey,
                timestamp,
                signature,
                file: file.name
            });

            // 2. Upload directly to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);

            // STRICT RULE: Do NOT append folder, upload_preset, or any other params.

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Cloudinary upload failed' }));
                throw new Error(error.message || 'Direct upload to Cloudinary failed');
            }

            return response.json(); // Returns { secure_url, ... }
        }
    },
    users: {
        getProfile: () => fetcher<any>('/users/profile'),
        updateProfile: (profileData: any) => fetcher<any>('/users/profile', {
            method: 'PATCH',
            body: JSON.stringify(profileData),
        }),
        uploadAvatar: async (file: File) => {
            // 1. Upload to Cloudinary directly from client
            const result = await api.cloudinary.uploadToCloudinary(file, 'avatars');

            // 2. Update backend with the new URL
            return fetcher<any>('/users/profile/avatar', {
                method: 'PATCH',
                body: JSON.stringify({ avatarUrl: result.secure_url }),
            });
        },
        changePassword: (passwordData: any) => fetcher<void>('/users/password', {
            method: 'PATCH',
            body: JSON.stringify(passwordData),
        }),
        getFavorites: () => fetcher<{ data: Business[] }>('/users/favorites'),
        addFavorite: (businessId: string) => fetcher<void>(`/users/favorites/${businessId}`, {
            method: 'POST',
        }),
        removeFavorite: (businessId: string) => fetcher<void>(`/users/favorites/${businessId}`, {
            method: 'DELETE',
        }),
        getNotifications: (params: any = {}) => {
            const query = new URLSearchParams(params).toString();
            return fetcher<{ data: any[], meta: any }>(`/users/notifications?${query}`);
        },
        markNotificationRead: (id: string) => fetcher<void>(`/users/notifications/${id}/read`, {
            method: 'PATCH',
        }),
    },
    vendors: {
        getStats: () => fetcher<any>('/vendors/dashboard-stats'),
        getProfile: () => fetcher<any>('/vendors/profile'),
        updateProfile: (profileData: any) => fetcher<any>('/vendors/profile', {
            method: 'PATCH',
            body: JSON.stringify(profileData),
        }),
        becomeVendor: (data: { businessName: string, businessPhone: string }) => fetcher<any>('/vendors/become-vendor', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getByCity: (city: string) => fetcher<any>(`/vendors/by-city?city=${encodeURIComponent(city)}`),
        getPublicProfile: (id: string) => fetcher<any>(`/vendors/${id}/public`),
    },
    leads: {
        getForVendor: (params: any = {}) => {
            const query = new URLSearchParams(params).toString();
            return fetcher<any>(`/leads/vendor?${query}`);
        },
        getStats: (period: string = '7d') => fetcher<any>(`/leads/vendor/stats?period=${period}`),
        updateStatus: (id: string, status: string) => fetcher<any>(`/leads/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
        createLead: (data: {
            businessId: string;
            name: string;
            email: string;
            phone?: string;
            message: string;
            type?: 'call' | 'whatsapp' | 'chat';
            source?: string;
        }) => fetcher<any>('/leads', {
            method: 'POST',
            body: JSON.stringify({ ...data, type: data.type || 'chat' }),
        }),
        getMyEnquiries: (params: any = {}) => {
            const query = new URLSearchParams(params).toString();
            return fetcher<any>(`/leads/my-enquiries?${query}`);
        },
    },
    auth: {
        login: (credentials: any) => fetcher<any>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
        register: (userData: any) => fetcher<any>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
        googleLogin: (data: { credential: string; role?: string; referralCode?: string }) => fetcher<any>('/auth/google', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        logout: () => fetcher<void>('/auth/logout', { method: 'POST', silent: true }),
        ping: () => fetcher<{ online: boolean }>('/auth/ping', { method: 'POST', silent: true }),
    },
    admin: {
        getStats: () => fetcher<any>('/admin/stats'),
        getUsers: (page = 1, limit = 10) => fetcher<any>(`/admin/users?page=${page}&limit=${limit}`),
        updateUserRole: (id: string, role: string) => fetcher<any>(`/admin/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        }),
        toggleUserStatus: (id: string, isActive: boolean) => fetcher<any>(`/admin/users/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive }),
        }),
        deleteUser: (id: string) => fetcher<any>(`/admin/users/${id}`, {
            method: 'DELETE',
        }),
        getBusinesses: (page = 1, limit = 20, status?: string, search?: string) => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(status && { status }),
                ...(search && { search }),
            });
            return fetcher<any>(`/admin/businesses?${params}`);
        },
        moderateBusiness: (id: string, status: string, reason?: string) => fetcher<any>(`/admin/business/${id}/moderate`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason }),
        }),
        deleteBusiness: (id: string) => fetcher<any>(`/admin/businesses/${id}`, {
            method: 'DELETE',
        }),
        toggleFeatured: (id: string, isFeatured: boolean) => fetcher<any>(`/admin/business/${id}/featured`, {
            method: 'PATCH',
            body: JSON.stringify({ isFeatured }),
        }),
        toggleVerifiedListing: (id: string, isVerified: boolean) => fetcher<any>(`/admin/business/${id}/verify-listing`, {
            method: 'PATCH',
            body: JSON.stringify({ isVerified }),
        }),
        updateSearchKeywords: (id: string, keywords: string[]) => fetcher<any>(`/admin/business/${id}/search-keywords`, {
            method: 'PATCH',
            body: JSON.stringify({ keywords }),
        }),
        getVendors: (page = 1, limit = 20, isVerified?: boolean, search?: string) => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(isVerified !== undefined && { isVerified: isVerified.toString() }),
                ...(search && { search }),
            });
            return fetcher<any>(`/admin/vendors?${params}`);
        },
        verifyVendor: (id: string, status: boolean) => fetcher<any>(`/admin/vendor/${id}/verify?status=${status}`, {
            method: 'POST',
        }),
        getSettings: () => fetcher<Record<string, string>>('/admin/settings'),
        updateSettings: (settings: Record<string, string>) => fetcher<Record<string, string>>('/admin/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings),
        }),
        getHeatmapData: (startDate?: string, endDate?: string) => {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            return fetcher<any[]>(`/admin/heatmap-data?${params.toString()}`);
        },
        plans: {
            getAll: () => fetcher<any[]>('/subscriptions/plans/admin'),
            getById: (id: string) => fetcher<any>(`/subscriptions/plans/${id}`),
            create: (data: any) => fetcher<any>('/subscriptions/plans', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
            update: (id: string, data: any) => fetcher<any>(`/subscriptions/plans/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),
            delete: (id: string) => fetcher<any>(`/subscriptions/plans/${id}`, {
                method: 'DELETE',
            }),
        },
        pricingPlans: {
            getAll: () => fetcher<any[]>('/subscriptions/pricing/plans/admin'),
            create: (data: any) => fetcher<any>('/subscriptions/pricing/plans', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
            update: (id: string, data: any) => fetcher<any>(`/subscriptions/pricing/plans/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),
            delete: (id: string) => fetcher<any>(`/subscriptions/pricing/plans/${id}`, {
                method: 'DELETE',
            }),
        },
        globalSearch: (q: string) => fetcher<{ 
            businesses: any[], 
            users: any[], 
            categories: any[], 
            cities: any[] 
        }>(`/admin/search/global?q=${encodeURIComponent(q)}`),
        affiliate: {
            getReferrals: () => fetcher<any[]>('/affiliate/admin/referrals'),
            activateReferral: (id: string) => fetcher<any>(`/affiliate/admin/activate-referral/${id}`, { method: 'POST' }),
            getStats: () => fetcher<any>('/affiliate/admin/stats'),
            getPayouts: () => fetcher<any[]>('/affiliate/admin/payouts'),
            updatePayout: (id: string, status: string, notes?: string) => fetcher<any>(`/affiliate/admin/payouts/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status, notes }),
            }),
            updateSettings: (settings: any) => fetcher<any>('/affiliate/admin/settings', {
                method: 'PATCH',
                body: JSON.stringify(settings),
            }),
        },
    },

    notifications: {
        getAll: () => fetcher('/notifications'),
        markRead: (id: string) => fetcher(`/notifications/${id}/read`, { method: 'PATCH' }),
        markAllRead: () => fetcher('/notifications/read-all', { method: 'PATCH' }),
        delete: (id: string) => fetcher(`/notifications/${id}`, { method: 'DELETE' }),
    },
    affiliate: {
        join: (dto: any) => fetcher('/affiliate/join', { method: 'POST', body: JSON.stringify(dto) }),
        getStats: () => fetcher<any>('/affiliate/stats'),
        getReferrals: () => fetcher<any[]>('/affiliate/referrals'),
        trackClick: (code: string) => fetcher(`/affiliate/track-click?code=${code}`, { method: 'POST', silent: true }),
        applyReferral: (code: string) => fetcher<{ success: boolean; message: string }>('/affiliate/apply-referral', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),

        requestPayout: (data: { amount: number; method: string; details: string }) => fetcher('/affiliate/payouts', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getPayouts: () => fetcher<any[]>('/affiliate/payouts'),
        getSettings: () => fetcher<any>('/affiliate/settings'),
    },
    subscriptions: {
        getPlans: () => fetcher<any[]>('/subscriptions/plans'),
        getPricingPlans: (type?: string) => fetcher<any[]>(`/subscriptions/pricing/plans${type ? `?type=${type}` : ''}`),
        getActive: () => fetcher<any>('/subscriptions/active'),
        getActivePromotions: () => fetcher<any>('/subscriptions/active-promotions'),
        getMyInvoices: () => fetcher<any[]>('/subscriptions/my-invoices'),
        getInvoice: (id: string) => fetcher<any>(`/subscriptions/invoice/${id}`),
        mockCheckout: (planId: string) => fetcher<any>(`/subscriptions/mock-success/${planId}`, { method: 'POST' }),
        createCheckout: (planId: string) => api.post<{ sessionId: string; checkoutUrl: string }>('/subscriptions/checkout', { planId }),
        verify: (sessionId: string) => api.post<{ success: boolean; alreadyProcessed: boolean }>('/subscriptions/verify', { sessionId }),
        changePlan: (planId: string) => api.post<any>('/subscriptions/change', { planId }),

        // Admin
        adminGetAll: (page = 1, limit = 20) => fetcher<any>(`/subscriptions/admin/all?page=${page}&limit=${limit}`),
        adminGetTransactions: (page = 1, limit = 20) => fetcher<any>(`/subscriptions/admin/transactions?page=${page}&limit=${limit}`),
        adminAssign: (data: { vendorId: string; planId: string; durationDays?: number }) =>
            fetcher<any>('/subscriptions/admin/assign', { method: 'POST', body: JSON.stringify(data) }),
        adminCancel: (subId: string) => fetcher<any>(`/subscriptions/admin/${subId}/cancel`, { method: 'PATCH' }),
        adminTriggerExpiryCheck: () => fetcher<any>('/subscriptions/admin/trigger-expiry-check', { method: 'POST' }),
    },
    enquiries: {
        reply: (leadId: string, message: string) => fetcher<any>(`/leads/${leadId}/reply`, {
            method: 'PATCH',
            body: JSON.stringify({ message }),
        }),
    },
    offers: {
        getById: (id: string) => fetcher<any>(`/offers/public/${id}`),
        create: (data: any) => fetcher<any>('/offers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getMy: (page = 1, limit = 10) =>
            fetcher<{ data: any[]; meta: any }>(`/offers/vendor?page=${page}&limit=${limit}`),
        update: (id: string, data: any) => fetcher<any>(`/offers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        remove: (id: string) => fetcher<any>(`/offers/${id}`, {
            method: 'DELETE',
        }),
        // Admin
        adminGetAll: (page = 1, limit = 20) => fetcher<{ data: any[]; meta: any }>(`/offers/admin/all?page=${page}&limit=${limit}`),
        adminToggleFeatured: (id: string, isFeatured: boolean) => fetcher(`/offers/admin/${id}/feature`, {
            method: 'PATCH',
            body: JSON.stringify({ isFeatured }),
        }),
        getByBusiness: (businessId: string) =>
            fetcher<any[]>(`/offers/business/${businessId}/offers`),
        search: (params: Record<string, string | number | boolean | undefined | null>) => {
            const sanitizedParams: Record<string, string> = {};
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '' && value !== false) {
                    sanitizedParams[key] = String(value);
                }
            });
            const query = new URLSearchParams(sanitizedParams).toString();
            return fetcher<{ data: any[]; meta: any }>(`/offers/public/search?${query}`);
        },
    },
    comments: {
        create: (data: any) => fetcher<any>('/comments', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getPublic: (page = 1, limit = 10) =>
            fetcher<{ data: any[]; meta: any }>(`/comments/public?page=${page}&limit=${limit}`),
        getByBusiness: (businessId: string, page = 1, limit = 10) =>
            fetcher<{ data: any[]; meta: any }>(`/business/${businessId}/comments?page=${page}&limit=${limit}`),
        getVendorComments: (page = 1, limit = 10) =>
            fetcher<{ data: any[]; meta: any }>(`/vendor/comments?page=${page}&limit=${limit}`),
        reply: (commentId: string, data: any) =>
            fetcher<any>(`/vendor/comments/${commentId}/reply`, {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        updateReply: (replyId: string, data: any) =>
            fetcher<any>(`/vendor/comments/reply/${replyId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),
        deleteReply: (replyId: string) =>
            fetcher<void>(`/vendor/comments/reply/${replyId}`, {
                method: 'DELETE',
            }),
    },
    demand: {
        getInsights: (city?: string) => fetcher<any[]>(`/demand/insights${city ? `?city=${city}` : ''}`, { silent: true }),
        getAISummary: (city?: string) => fetcher<{ summary: string }>(`/demand/summary-ai${city ? `?city=${city}` : ''}`, { silent: true }),
        getNearby: (lat?: number, lng?: number) => fetcher<any[]>(`/demand/nearby${lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : ''}`, { silent: true }),
        getHeatmap: (keyword?: string) => fetcher<any[]>(`/demand/heatmap${keyword ? `?keyword=${keyword}` : ''}`, { silent: true }),
        logSearch: (data: any) => fetcher('/demand/log', { method: 'POST', body: JSON.stringify(data), silent: true }),
    },
    follows: {
        follow: (businessId: string) =>
            fetcher<{ followersCount: number }>(`/follows/${businessId}`, { method: 'POST' }),
        unfollow: (businessId: string) =>
            fetcher<{ followersCount: number }>(`/follows/${businessId}`, { method: 'DELETE' }),
        check: (businessId: string) =>
            fetcher<{ isFollowing: boolean; followersCount: number }>(`/follows/${businessId}/check`, { silent: true }),
        count: (businessId: string) =>
            fetcher<{ followersCount: number }>(`/follows/${businessId}/count`, { silent: true }),
        myFollows: (page = 1, limit = 20) =>
            fetcher<{ data: Business[]; meta: any }>(`/follows/my?page=${page}&limit=${limit}`),
    },
    broadcasts: {
        create: (data: any) => fetcher<any>('/broadcasts', { method: 'POST', body: JSON.stringify(data) }),
        getMyLeads: () => fetcher<any[]>('/broadcasts/my-leads'),
        getVendorInbox: () => fetcher<any[]>('/broadcasts/vendor/inbox'),
        getStats: () => fetcher<{ newCount: number }>('/broadcasts/vendor/stats'),
        respond: (id: string, data: any) => fetcher<any>(`/broadcasts/${id}/respond`, { method: 'POST', body: JSON.stringify(data) }),
        getResponses: (id: string) => fetcher<any[]>(`/broadcasts/${id}/responses`),
    },
    promotions: {
        getPricingRules: () => fetcher<any[]>('/promotions/pricing-rules'),
        calculatePrice: (data: { placements: string[], startTime: string, endTime: string, pricingId?: string }, type: string = 'offer') => 
            api.post<{ totalPrice: number; durationHours: number; breakup: any[]; isMinimumApplied?: boolean }>(`/promotions/calculate?type=${type}`, data),
        book: (data: { offerEventId: string; placements: string[]; startTime: string; endTime: string }) => 
            api.post<{ sessionId: string; checkoutUrl: string }>('/promotions/book', data),
        verifySession: (sessionId: string) => fetcher<any>(`/promotions/verify-session?session_id=${sessionId}`),
    },
};

