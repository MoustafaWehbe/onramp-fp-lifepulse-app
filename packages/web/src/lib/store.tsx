import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AreaColor =
  | "health"
  | "career"
  | "spirit"
  | "social"
  | "learning"
  | "creative";

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

export interface Profile {
  name: string;
  email: string;
  age?: number;
  jobTitle?: string;
  goals: string[];
  stressLevel?: number;
  sleepHours?: number;
  onboarded: boolean;
}

interface AppState {
  hydrated: boolean;
  profile: Profile;
  areas: LifeArea[];
  habits: Habit[];
  checkins: CheckIn[];
  setProfile: (p: Partial<Profile>) => void;
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

const defaultProfile: Profile = {
  name: "",
  email: "",
  goals: [],
  onboarded: false,
};

const seedData = (): Pick<
  AppState,
  "profile" | "areas" | "habits" | "checkins"
> => {
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

  return {
    profile: {
      ...defaultProfile,
      name: "Elena Rivers",
      email: "elena@example.com",
      age: 31,
      jobTitle: "Senior Designer",
      goals: ["Focus", "Health", "Learning"],
      stressLevel: 6,
      sleepHours: 6.5,
      onboarded: true,
    },
    areas,
    habits,
    checkins,
  };
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
  const [profile, setProfileState] = useState<Profile>(defaultProfile);
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const data = load();
    if (data) {
      setProfileState(data.profile ?? defaultProfile);
      setAreas(data.areas ?? []);
      setHabits(data.habits ?? []);
      setCheckins(data.checkins ?? []);
    } else {
      const s = seedData();
      setProfileState(s.profile);
      setAreas(s.areas);
      setHabits(s.habits);
      setCheckins(s.checkins);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      KEY,
      JSON.stringify({ profile, areas, habits, checkins }),
    );
  }, [profile, areas, habits, checkins, hydrated]);

  const value: AppState = {
    hydrated,
    profile,
    areas,
    habits,
    checkins,
    setProfile: (p) => setProfileState((cur) => ({ ...cur, ...p })),
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
      setProfileState(s.profile);
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

export const AREA_COLOR_MAP: Record<
  AreaColor,
  { bg: string; bgSoft: string; text: string; ring: string; raw: string }
> = {
  health: {
    bg: "bg-area-health",
    bgSoft: "bg-area-health/10",
    text: "text-area-health",
    ring: "ring-area-health/30",
    raw: "var(--area-health)",
  },
  career: {
    bg: "bg-area-career",
    bgSoft: "bg-area-career/10",
    text: "text-area-career",
    ring: "ring-area-career/30",
    raw: "var(--area-career)",
  },
  spirit: {
    bg: "bg-area-spirit",
    bgSoft: "bg-area-spirit/10",
    text: "text-area-spirit",
    ring: "ring-area-spirit/30",
    raw: "var(--area-spirit)",
  },
  social: {
    bg: "bg-area-social",
    bgSoft: "bg-area-social/10",
    text: "text-area-social",
    ring: "ring-area-social/30",
    raw: "var(--area-social)",
  },
  learning: {
    bg: "bg-area-learning",
    bgSoft: "bg-area-learning/10",
    text: "text-area-learning",
    ring: "ring-area-learning/30",
    raw: "var(--area-learning)",
  },
  creative: {
    bg: "bg-area-creative",
    bgSoft: "bg-area-creative/10",
    text: "text-area-creative",
    ring: "ring-area-creative/30",
    raw: "var(--area-creative)",
  },
};

export const todayStr = () => new Date().toISOString().slice(0, 10);
