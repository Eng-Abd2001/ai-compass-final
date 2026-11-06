export type Sex = "male" | "female";
export type Goal = "lose" | "keep" | "gain";
export const ACTIVITY = [1.2, 1.375, 1.55, 1.725, 1.9] as const;
export type Plan = { bmr: number; tdee: number; target: number; protein: number; fat: number; carbs: number; bmi: number; water: number; floored: boolean };

/** Mifflin-St Jeor, standard activity multipliers. An estimate, not medical advice. */
export function plan(i: { sex: Sex; age: number; kg: number; cm: number; activity: number; goal: Goal }): Plan {
  const bmr = 10 * i.kg + 6.25 * i.cm - 5 * i.age + (i.sex === "male" ? 5 : -161);
  const tdee = bmr * i.activity;
  const raw = tdee * (i.goal === "lose" ? 0.8 : i.goal === "gain" ? 1.1 : 1);
  const floor = i.sex === "male" ? 1500 : 1200;
  const target = Math.max(raw, floor), floored = raw < floor;
  const protein = i.kg * (i.goal === "lose" ? 2 : i.goal === "gain" ? 1.8 : 1.6);
  let fat = Math.max(i.kg * 0.8, (target * 0.25) / 9);
  let carbs = (target - protein * 4 - fat * 9) / 4;
  if (carbs < 0) { fat = Math.max(i.kg * 0.6, (target - protein * 4) / 9); carbs = Math.max(0, (target - protein * 4 - fat * 9) / 4); }
  const m = i.cm / 100;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(target), protein: Math.round(protein), fat: Math.round(fat), carbs: Math.round(carbs), bmi: +(i.kg / (m * m)).toFixed(1), water: Math.round(i.kg * 35), floored };
}
export const lbToKg = (lb: number): number => lb * 0.45359237;
export const inToCm = (inch: number): number => inch * 2.54;
