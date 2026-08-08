import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type { AreaColor } from "./area-colors";
export { AREA_COLOR_MAP } from "./area-colors";
import type { AreaColor } from "./area-colors";

export interface LifeArea {
  id: string;
  name: string;
  color: AreaColor;
  description?: string;
}

export type Frequency = "daily" | "weekdays" | "3x" | "5x" | "weekly";

export interface Habit {
  id: string;
  areaId: string;
  name: string;
  frequency: Frequency;
  notes?: string;
  createdAt: string;
}

export interface CheckIn {
  date: string;
  habitId: string;
}

export type AgeRange = "18-24" | "25-34" | "35-44" | "45-54" | "55+";
export type EducationLevel =
  | "high_school"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate"
  | "other";
export type LivingSituation = "apartment" | "house" | "dormitory" | "other";
export type EnergyPattern = "morning" | "afternoon" | "evening";
export type StressBaseline = "low" | "medium" | "high";
export type WorkloadIntensity = "low" | "medium" | "high";
export type MotivationDriver =
  | "achievement"
  | "health"
  | "family"
  | "financial_freedom"
  | "other";


export interface Profile {
  name: string;
  email: string;
  ageRange?: AgeRange;
  profession?: string;
  industry?: string;
  educationLevel?: EducationLevel;
  livingSituation?: LivingSituation;
  lifestyleTypes?: string[];
  stressSources?: string[];
  dailyFreeTime?: number;
  energyPattern?: EnergyPattern;
  stressBaseline?: StressBaseline;
  workloadIntensity?: WorkloadIntensity;
  motivationDriver?: MotivationDriver;
  failureResponse?: string;
  topValues?: string[];
  identityStatements?: string[];
  badHabits?: string[];
  goals: string[];
  stressLevel?: number;
  sleepHours?: number;
  onboarded: boolean;
}

interface AppState {
  hydrated: boolean;
  areas: LifeArea[];
  habits: Habit[];
  checkins: CheckIn[];
  addArea: (a: Omit<LifeArea, "id">) => string;
  updateArea: (id: string, a: Partial<LifeArea>) => void;
  removeArea: (id: string) => void;
  addHabit: (h: Omit<Habit, "id" | "createdAt">) => string;
  updateHabit: (id: string, h: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  toggleCheckin: (habitId: string, date: string) => void;
  isChecked: (habitId: string, date: string) => boolean;
  reset: () => void;
}

const KEY = "habitgarden:v1";

const seedData = (): Pick<AppState, "areas" | "habits" | "checkins"> => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const areas: LifeArea[] = [
    {
      id: "a-health",
      name: "Health",
      color: "health",
      description: "Body & energy",
    },
    {
      id: "a-career",
      name: "Career",
      color: "career",
      description: "Deep work & growth",
    },
    {
      id: "a-spirit",
      name: "Mind",
      color: "spirit",
      description: "Stillness & reflection",
    },
    {
      id: "a-social",
      name: "Social",
      color: "social",
      description: "People who matter",
    },
  ];
  const habits: Habit[] = [
    {
      id: "h1",
      areaId: "a-health",
      name: "Morning sunlight (15 min)",
      frequency: "daily",
      createdAt: today.toISOString(),
    },
    {
      id: "h2",
      areaId: "a-health",
      name: "Strength training",
      frequency: "3x",
      createdAt: today.toISOString(),
    },
    {
      id: "h3",
      areaId: "a-career",
      name: "2 deep work blocks",
      frequency: "weekdays",
      createdAt: today.toISOString(),
    },
    {
      id: "h4",
      areaId: "a-career",
      name: "Inbox zero by 4pm",
      frequency: "weekdays",
      createdAt: today.toISOString(),
    },
    {
      id: "h5",
      areaId: "a-spirit",
      name: "Meditate 10 min",
      frequency: "daily",
      createdAt: today.toISOString(),
    },
    {
      id: "h6",
      areaId: "a-spirit",
      name: "Evening journal",
      frequency: "daily",
      createdAt: today.toISOString(),
    },
    {
      id: "h7",
      areaId: "a-social",
      name: "Reach out to a friend",
      frequency: "3x",
      createdAt: today.toISOString(),
    },
  ];
  const checkins: CheckIn[] = [];
  for (let i = 13; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = fmt(d);
    habits.forEach((h) => {
      if (Math.random() > 0.32) checkins.push({ date, habitId: h.id });
    });
  }
  const todayStr = fmt(today);
  ["h1", "h3", "h5"].forEach((id) =>
    checkins.push({ date: todayStr, habitId: id }),
  );

  return { areas, habits, checkins };
};

const Ctx = createContext<AppState | null>(null);

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const data = load();
    if (data) {
      setAreas(data.areas ?? []);
      setHabits(data.habits ?? []);
      setCheckins(data.checkins ?? []);
    } else {
      const s = seedData();
      setAreas(s.areas);
      setHabits(s.habits);
      setCheckins(s.checkins);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ areas, habits, checkins }));
  }, [areas, habits, checkins, hydrated]);

  const value: AppState = {
    hydrated,
    areas,
    habits,
    checkins,
    addArea: (a) => {
      const id = `area-${Date.now()}`;
      setAreas((cur) => [...cur, { ...a, id }]);
      return id;
    },
    updateArea: (id, a) =>
      setAreas((cur) => cur.map((x) => (x.id === id ? { ...x, ...a } : x))),
    removeArea: (id) => {
      setAreas((cur) => cur.filter((x) => x.id !== id));
      setHabits((cur) => cur.filter((h) => h.areaId !== id));
    },
    addHabit: (h) => {
      const id = `habit-${Date.now()}`;
      setHabits((cur) => [
        ...cur,
        { ...h, id, createdAt: new Date().toISOString() },
      ]);
      return id;
    },
    updateHabit: (id, h) =>
      setHabits((cur) => cur.map((x) => (x.id === id ? { ...x, ...h } : x))),
    removeHabit: (id) => {
      setHabits((cur) => cur.filter((x) => x.id !== id));
      setCheckins((cur) => cur.filter((c) => c.habitId !== id));
    },
    toggleCheckin: (habitId, date) => {
      setCheckins((cur) => {
        const exists = cur.some(
          (c) => c.habitId === habitId && c.date === date,
        );
        if (exists)
          return cur.filter(
            (c) => !(c.habitId === habitId && c.date === date),
          );
        return [...cur, { habitId, date }];
      });
    },
    isChecked: (habitId, date) =>
      checkins.some((c) => c.habitId === habitId && c.date === date),
    reset: () => {
      localStorage.removeItem(KEY);
      const s = seedData();
      setAreas(s.areas);
      setHabits(s.habits);
      setCheckins(s.checkins);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppStateProvider");
  return v;
}

export const todayStr = () => new Date().toISOString().slice(0, 10);