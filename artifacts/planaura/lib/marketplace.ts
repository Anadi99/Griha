export interface Architect {
  id: string;
  name: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviews: number;
  location: string;
  hourlyRate: number;
  avatar: string;
  verified: boolean;
}

export interface Contractor {
  id: string;
  name: string;
  specialization: string[];
  completedProjects: number;
  rating: number;
  reviews: number;
  location: string;
  averageProjectCost: number;
  verified: boolean;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  description: string;
  pricePerUnit: number;
  unit: string;
  supplier: string;
  rating: number;
  inStock: boolean;
}

export const MOCK_ARCHITECTS: Architect[] = [
  { id: "a1", name: "Priya Sharma", specialization: ["Residential", "Vastu"], experience: 12, rating: 4.9, reviews: 148, location: "Mumbai", hourlyRate: 2500, avatar: "PS", verified: true },
  { id: "a2", name: "Rahul Mehta", specialization: ["Modern", "Sustainable"], experience: 8, rating: 4.7, reviews: 92, location: "Delhi", hourlyRate: 2000, avatar: "RM", verified: true },
  { id: "a3", name: "Kavitha Nair", specialization: ["Vastu", "Traditional"], experience: 15, rating: 4.8, reviews: 203, location: "Bangalore", hourlyRate: 3000, avatar: "KN", verified: true },
  { id: "a4", name: "Arun Patel", specialization: ["Commercial", "Residential"], experience: 6, rating: 4.5, reviews: 67, location: "Hyderabad", hourlyRate: 1800, avatar: "AP", verified: false },
  { id: "a5", name: "Meera Iyer", specialization: ["Interior", "Space Planning"], experience: 10, rating: 4.8, reviews: 119, location: "Chennai", hourlyRate: 2200, avatar: "MI", verified: true },
];

export const MOCK_CONTRACTORS: Contractor[] = [
  { id: "c1", name: "BuildRight Constructions", specialization: ["Residential", "Renovation"], completedProjects: 234, rating: 4.8, reviews: 178, location: "Mumbai", averageProjectCost: 2500000, verified: true },
  { id: "c2", name: "SkyBuilders Pvt Ltd", specialization: ["High-Rise", "Commercial"], completedProjects: 89, rating: 4.6, reviews: 94, location: "Delhi", averageProjectCost: 8000000, verified: true },
  { id: "c3", name: "HomeCraft Builders", specialization: ["Eco-Friendly", "Bungalows"], completedProjects: 156, rating: 4.9, reviews: 143, location: "Pune", averageProjectCost: 3500000, verified: true },
  { id: "c4", name: "Apex Infra", specialization: ["Turnkey", "Interior"], completedProjects: 67, rating: 4.4, reviews: 58, location: "Bangalore", averageProjectCost: 1800000, verified: false },
];

export const MOCK_MATERIALS: Material[] = [
  { id: "m1", name: "AAC Blocks", category: "Structural", description: "Lightweight, thermal insulating autoclaved aerated concrete blocks", pricePerUnit: 45, unit: "piece", supplier: "UltraTech Building Products", rating: 4.7, inStock: true },
  { id: "m2", name: "Vitrified Floor Tiles", category: "Flooring", description: "High-gloss, stain-resistant vitrified tiles 600x600mm", pricePerUnit: 85, unit: "sqft", supplier: "Kajaria Ceramics", rating: 4.8, inStock: true },
  { id: "m3", name: "CPVC Plumbing Pipes", category: "Plumbing", description: "Chlorinated PVC pipes, corrosion resistant, ISI certified", pricePerUnit: 320, unit: "meter", supplier: "Astral Pipes", rating: 4.6, inStock: true },
  { id: "m4", name: "ISI Steel (Fe500)", category: "Structural", description: "TMT reinforcement bars, high tensile strength", pricePerUnit: 68, unit: "kg", supplier: "TATA Steel", rating: 4.9, inStock: true },
  { id: "m5", name: "OPC Cement 53 Grade", category: "Structural", description: "Ordinary Portland Cement, 53 grade, 50kg bag", pricePerUnit: 380, unit: "bag", supplier: "Ambuja Cements", rating: 4.8, inStock: false },
  { id: "m6", name: "Teak Wood Doors", category: "Joinery", description: "Premium Myanmar teak wood doors, 7ft x 3ft", pricePerUnit: 22000, unit: "piece", supplier: "Sri Ram Wood Works", rating: 4.7, inStock: true },
];

export function getTopRatedArchitects(n: number = 5): Architect[] {
  return [...MOCK_ARCHITECTS].sort((a, b) => b.rating - a.rating).slice(0, n);
}

export function getTopRatedContractors(n: number = 5): Contractor[] {
  return [...MOCK_CONTRACTORS].sort((a, b) => b.rating - a.rating).slice(0, n);
}
