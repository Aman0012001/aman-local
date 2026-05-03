import React from 'react';
import { api } from '@/lib/api';
import CategoryDetailClient from './CategoryDetailClient';



export async function generateStaticParams() {
    try {
        const categories = await api.categories.getAll();
        const params = (Array.isArray(categories) ? categories : [])
            .filter((c: any) => c && c.slug)
            .map((category: any) => ({
                categorySlug: String(category.slug),
            }));
        // Include 'template' for SPA fallback and ensure at least one param exists
        return [...params, { categorySlug: 'template' }];
    } catch (error) {
        console.error('Failed to generate static params for categories:', error);
        return [{ categorySlug: 'template' }];
    }
}

export default async function CategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
    const { categorySlug } = await params;
    return <CategoryDetailClient categorySlug={categorySlug} />;
}
