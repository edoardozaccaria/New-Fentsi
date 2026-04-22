export type GuestTier = {
  id: string;
  label: string;
  min: number;
  max: number | null;
};

export const guestTiers: GuestTier[] = [
  { id: "intimate", label: "Intimo (< 30)", min: 1, max: 30 },
  { id: "small", label: "Piccolo (30–60)", min: 30, max: 60 },
  { id: "medium", label: "Medio (60–150)", min: 60, max: 150 },
  { id: "large", label: "Grande (150–300)", min: 150, max: 300 },
  { id: "grand", label: "Grandioso (300+)", min: 300, max: null },
];

export function getGuestTierById(id: string): GuestTier | undefined {
  return guestTiers.find((tier) => tier.id === id);
}
