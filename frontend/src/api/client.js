const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function createDesign(formData) {
  const response = await fetch(`${BASE_URL}/design/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!response.ok) {
    throw new Error(`Design request failed: ${response.status}`);
  }
  return response.json();
}

export async function getProducts(category) {
  const url = new URL(`${BASE_URL}/products/`);
  if (category) url.searchParams.set("category", category);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetching products failed: ${response.status}`);
  }
  return response.json();
}

export async function getSimilarProducts(skuCode) {
  const response = await fetch(`${BASE_URL}/products/${skuCode}/similar`);
  if (!response.ok) {
    throw new Error(`Fetching similar products failed: ${response.status}`);
  }
  return response.json();
}
