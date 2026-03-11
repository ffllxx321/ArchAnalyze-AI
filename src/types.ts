export interface Brand {
  id: number;
  name: string;
  category: string;
  sub_category: string;
  material_type: string; // Keep for backward compatibility if needed
  model: string;
  price: number;
  unit: string;
  supplier: string;
  rating: number;
  reviews: number;
}

export interface Material {
  id: number;
  name: string;
  type: string;
  characteristics: string;
  base_price_min: number;
  base_price_max: number;
  install_price_min: number;
  install_price_max: number;
}

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  materialName: string;
  materialType: string;
}

export interface AnalysisResult {
  imageUrl: string;
  hotspots: Hotspot[];
  materials: Material[];
}

export interface BudgetEntry {
  id: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Showroom {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  distance: string;
}
