import { api } from '@/lib/api';
import BusinessDetailClient from './BusinessDetailClient';



export async function generateStaticParams() {
    try {
        // Robust search with basic fallback
        const response = await api.listings.search({ limit: 500 });
        const businesses = (response && Array.isArray(response.data)) ? response.data : [];
        
        const params = businesses
            .filter((b: any) => b && b.slug)
            .map((business: any) => ({
                slug: String(business.slug),
            }));
            
        // Include 'template' for SPA fallback and ensure at least one param exists
        return [...params, { slug: 'template' }];
    } catch (error) {
        console.error('Failed to generate static params for businesses:', error);
        // Fallback for build phase if API is unreachable
        return [{ slug: 'template' }];
    }
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <BusinessDetailClient slug={slug} />;
}
