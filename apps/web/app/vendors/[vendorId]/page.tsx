import { api, getImageUrl } from '../../../lib/api';
import VendorProfileClient from './VendorProfileClient';

export async function generateStaticParams() {
    try {
        // Fetch a few listings to get some vendor IDs for static generation
        const response = await api.listings.search({ limit: 50 });
        const listings = response.data || [];
        
        const vendorIds = Array.from(new Set(
            listings
                .filter((l: any) => l && l.vendorId)
                .map((l: any) => String(l.vendorId))
        ));
            
        const params = vendorIds.map((id) => ({
            vendorId: id,
        }));
            
        return params.length > 0 ? params : [{ vendorId: 'test-vendor' }];
    } catch (error) {
        console.error('Failed to generate static params for vendors:', error);
        return [{ vendorId: 'test-vendor' }];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ vendorId: string }> }) {
    const { vendorId } = await params;
    try {
        const vendor = await api.vendors.getPublicProfile(vendorId);
        return {
            title: `${vendor.businessName} | Verified Expert | Local Services`,
            description: vendor.bio || `View professional profile, services, and reviews for ${vendor.businessName}. Trusted local expert.`,
            openGraph: {
                title: vendor.businessName,
                description: vendor.bio,
                images: vendor.avatarUrl ? [getImageUrl(vendor.avatarUrl)] : [],
            }
        };
    } catch (e) {
        return {
            title: 'Vendor Profile | Local Services',
        };
    }
}

export default async function VendorProfilePage({ params }: { params: Promise<{ vendorId: string }> }) {
    const { vendorId } = await params;
    return <VendorProfileClient vendorId={vendorId} />;
}
