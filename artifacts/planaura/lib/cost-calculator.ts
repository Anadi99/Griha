import { Plan } from "@/lib/store";

export interface CostBreakdown {
  structure: number;
  interiors: number;
  electrical: number;
  plumbing: number;
  total: number;
}

export interface CostEstimate {
  tier: "basic" | "standard" | "premium";
  ratePerSqft: number;
  totalArea: number;
  totalCost: number;
  breakdown: CostBreakdown;
}

const COST_RATES: Record<"basic" | "standard" | "premium", number> = {
  basic: 1500,
  standard: 2500,
  premium: 4500,
};

const COST_BREAKDOWN = {
  structure: 0.5,
  interiors: 0.2,
  electrical: 0.15,
  plumbing: 0.15,
};

export function calculateCostEstimate(
  plan: Plan,
  tier: "basic" | "standard" | "premium" = "standard"
): CostEstimate {
  const totalArea = plan.totalArea || 0;
  const ratePerSqft = COST_RATES[tier];
  const totalCost = totalArea * ratePerSqft;

  const breakdown: CostBreakdown = {
    structure: Math.round(totalCost * COST_BREAKDOWN.structure),
    interiors: Math.round(totalCost * COST_BREAKDOWN.interiors),
    electrical: Math.round(totalCost * COST_BREAKDOWN.electrical),
    plumbing: Math.round(totalCost * COST_BREAKDOWN.plumbing),
    total: Math.round(totalCost),
  };

  return {
    tier,
    ratePerSqft,
    totalArea,
    totalCost: Math.round(totalCost),
    breakdown,
  };
}

export function formatCost(cost: number): string {
  if (cost >= 10000000) return `₹${(cost / 10000000).toFixed(2)} Cr`;
  if (cost >= 100000) return `₹${(cost / 100000).toFixed(2)} L`;
  return `₹${cost.toLocaleString("en-IN")}`;
}

export function getCostTierLabel(tier: "basic" | "standard" | "premium"): string {
  const labels = { basic: "Economy", standard: "Standard", premium: "Premium" };
  return labels[tier];
}

export function getCostTierDescription(tier: "basic" | "standard" | "premium"): string {
  const desc = {
    basic: "Simple construction, basic finishes",
    standard: "Good quality materials & finishes",
    premium: "Luxury materials & premium finishes",
  };
  return desc[tier];
}
