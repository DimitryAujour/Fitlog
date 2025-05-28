// src/app/api/food/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Construct the Open Food Facts API URL
    const openFoodFactsURL = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
    )}&search_simple=1&action=process&json=1&page_size=20`; // Added page_size for manageable results

    try {
        const response = await fetch(openFoodFactsURL, {
            method: 'GET',
            headers: {
                // As per Open Food Facts API guidelines
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

        const data = await response.json();

        // The 'products' array contains the search results
        // You might want to transform this data further to only send what your client needs
        // For now, let's return the products array directly or a subset of useful fields
        const relevantProducts = data.products?.map((product: any) => ({
            id: product.code || product._id, // Barcode or ID
            name: product.product_name || 'N/A',
            brands: product.brands || '',
            imageUrl: product.image_front_small_url || product.image_url || '',
            nutriments: {
                // Values are typically per 100g
                calories_100g: product.nutriments?.['energy-kcal_100g'] || product.nutriments?.energy_100g / 4.184 || null, // Convert kJ to kcal if necessary
                protein_100g: product.nutriments?.proteins_100g || null,
                carbs_100g: product.nutriments?.carbohydrates_100g || null,
                fat_100g: product.nutriments?.fat_100g || null,
                fiber_100g: product.nutriments?.fiber_100g || null,
                sugars_100g: product.nutriments?.sugars_100g || null,
            },
            serving_size: product.serving_size || '',
            nutriments_per_serving: product.nutriments?.energy_serving ? { // Check if serving data exists
                calories: product.nutriments['energy-kcal_serving'] || product.nutriments.energy_serving / 4.184 || null,
                protein: product.nutriments.proteins_serving || null,
                carbs: product.nutriments.carbohydrates_serving || null,
                fat: product.nutriments.fat_serving || null,
            } : null,
        }));

        return NextResponse.json({ products: relevantProducts || [] });

    } catch (error: any) {
        console.error('Error fetching or processing food data:', error);
        return NextResponse.json(
            { error: 'Internal server error while fetching food data', details: error.message },
            { status: 500 }
        );
    }
}