// src/app/api/food/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Define interfaces for the Open Food Facts product data for better type safety
interface OpenFoodFactsNutriments {
    ['energy-kcal_100g']?: number;
    energy_100g?: number; // Often in kJ
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    energy_serving?: number; // Often in kJ
    ['energy-kcal_serving']?: number;
    proteins_serving?: number;
    carbohydrates_serving?: number;
    fat_serving?: number;
}

interface OpenFoodFactsProduct {
    code?: string;
    _id?: string;
    product_name?: string;
    brands?: string;
    image_front_small_url?: string;
    image_url?: string;
    nutriments?: OpenFoodFactsNutriments;
    serving_size?: string;
}

interface ApiResponse {
    products?: OpenFoodFactsProduct[];
    // Add other fields from the API response if needed
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const openFoodFactsURL = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
    )}&search_simple=1&action=process&json=1&page_size=20`;

    try {
        const response = await fetch(openFoodFactsURL, {
            method: 'GET',
            headers: {
                'User-Agent': 'FitLogApp/1.0 - YourContactInfo (e.g., website or github)',
            },
        });

        if (!response.ok) {
            console.error('Open Food Facts API error:', response.status, response.statusText);
            return NextResponse.json(
                { error: `Failed to fetch data from Open Food Facts: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data: ApiResponse = await response.json();

        // Error 1: Unexpected any for 'product'
        const relevantProducts = data.products?.map((product: OpenFoodFactsProduct) => ({
            id: product.code || product._id || '', // Ensure id is always a string
            name: product.product_name || 'N/A',
            brands: product.brands || '',
            imageUrl: product.image_front_small_url || product.image_url || '',
            nutriments: {
                calories_100g: product.nutriments?.['energy-kcal_100g'] || (product.nutriments?.energy_100g ? product.nutriments.energy_100g / 4.184 : null),
                protein_100g: product.nutriments?.proteins_100g || null,
                carbs_100g: product.nutriments?.carbohydrates_100g || null,
                fat_100g: product.nutriments?.fat_100g || null,
                fiber_100g: product.nutriments?.fiber_100g || null,
                sugars_100g: product.nutriments?.sugars_100g || null,
            },
            serving_size: product.serving_size || '',
            nutriments_per_serving: product.nutriments?.energy_serving || product.nutriments?.['energy-kcal_serving'] ? {
                calories: product.nutriments?.['energy-kcal_serving'] || (product.nutriments?.energy_serving ? product.nutriments.energy_serving / 4.184 : null),
                protein: product.nutriments?.proteins_serving || null,
                carbs: product.nutriments?.carbohydrates_serving || null,
                fat: product.nutriments?.fat_serving || null,
            } : null,
        }));

        return NextResponse.json({ products: relevantProducts || [] });

        // Error 2: Unexpected any for 'error'
    } catch (error) { // Changed from catch(error: any)
        console.error('Error fetching or processing food data:', error);
        let errorMessage = 'Internal server error while fetching food data';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { error: 'Internal server error while fetching food data', details: errorMessage },
            { status: 500 }
        );
    }
}