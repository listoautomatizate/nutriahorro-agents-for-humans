'use client';

import {
  Activity,
  AlertTriangle,
  Bike,
  Camera,
  CarFront,
  Check,
  ChefHat,
  ChevronRight,
  Clock3,
  Droplets,
  Footprints,
  Gauge,
  Home,
  Leaf,
  LoaderCircle,
  MapPin,
  MessageCircleMore,
  PackageSearch,
  Plus,
  RotateCcw,
  Scale,
  ScanLine,
  Search,
  Send,
  ShoppingBasket,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  Wheat,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { demoOffers, demoPantry, demoProfile, demoRecipes, transportConfig } from '@/lib/demo-data';
import { calculateNutritionTargets } from '@/lib/nutrition';
import type { AppState, GoalType, PantryItem, Profile, Recipe, ShoppingOption, TransportMode } from '@/lib/types';

type ViewName = 'Today' | 'Goals' | 'Pantry' | 'Recipes' | 'Shopping';
type ModalName = 'add' | 'receipt' | 'recipe' | null;
type AgentAction = {
  type: 'cook_recipe';
  recipe_id: string;
  recipe_name: string;
  status: 'confirmation_required' | 'approved';
};
type ChatMessage = { role: 'agent' | 'user'; text: string; tools?: string[]; mode?: string; action?: AgentAction };

const navItems: Array<{ label: ViewName; icon: typeof Home }> = [
  { label: 'Today', icon: Home },
  { label: 'Goals', icon: Target },
  { label: 'Pantry', icon: PackageSearch },
  { label: 'Recipes', icon: ChefHat },
  { label: 'Shopping', icon: ShoppingBasket },
];

const initialState: AppState = {
  profile: demoProfile,
  pantry: demoPantry,
  recipes: demoRecipes,
  offers: demoOffers,
  cookedRecipeIds: [],
  dailyIntake: {
    date: '2026-09-08',
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    remaining: {
      calories: demoProfile.calorieMin,
      protein: demoProfile.proteinGrams,
      carbs: demoProfile.carbsGrams,
      fat: demoProfile.fatGrams,
    },
    calorieStatus: 'below',
    meals: [],
  },
  lastUploadName: null,
};

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'America/Montevideo' });
const longDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Montevideo',
});

function relativeDateInput(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 86400000);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Montevideo',
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function daysUntil(date: string) {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Montevideo',
  });
  const asUtcDay = (value: Date) => {
    const parts = Object.fromEntries(
      dateFormatter.formatToParts(value).map((part) => [part.type, part.value]),
    );
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    return Date.UTC(year, month - 1, day);
  };
  const expiryDay = asUtcDay(new Date(date));
  const today = asUtcDay(new Date());
  return Math.round((expiryDay - today) / 86400000);
}

function shoppingOptions(state: AppState, mode: TransportMode): ShoppingOption[] {
  const grouped = new Map<string, typeof state.offers>();
  state.offers.forEach((offer) => grouped.set(offer.supermarket, [...(grouped.get(offer.supermarket) || []), offer]));
  const config = transportConfig[mode];
  const basketExtras: Record<string, number> = { 'El Dorado': 482, Disco: 666, 'Ta-Ta': 592, 'Tienda Inglesa': 728 };
  const referenceCost = 1324;

  return Array.from(grouped.entries()).map(([supermarket, items]) => {
    const distanceKm = items[0]?.distanceKm || 0;
    const basketPrice = Math.round(items.reduce((sum, item) => sum + item.price, 0) + (basketExtras[supermarket] || 600));
    const travelCost = Math.round(distanceKm * 2 * config.costPerKm);
    const effectiveCost = basketPrice + travelCost;
    return {
      supermarket,
      distanceKm,
      travelMinutes: Math.max(1, Math.round((distanceKm / config.speedKmh) * 60)),
      basketPrice,
      travelCost,
      effectiveCost,
      savings: Math.max(0, referenceCost - effectiveCost),
      items,
    };
  }).sort((a, b) => a.effectiveCost - b.effectiveCost);
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

async function compactReceiptImage(file: File): Promise<File> {
  if (file.size <= 850 * 1024) return file;
  if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
    throw new Error('The receipt photo must be an image up to 8 MB.');
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  let blob = await encode(0.76);
  if (blob && blob.size > 900 * 1024) blob = await encode(0.56);
  if (!blob || blob.size > 1024 * 1024) throw new Error('I could not compress the photo. Crop it to the receipt area and try again.');
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export default function NutriahorroApp() {
  const [active, setActive] = useState<ViewName>('Today');
  const [state, setState] = useState<AppState>(initialState);
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'offline'>('loading');
  const [toast, setToast] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: 'Hi. I can help you decide what to cook, what to use first, or where your shopping costs less.' },
  ]);
  const [chatInput, setChatInput] = useState('');

  const options = useMemo(() => shoppingOptions(state, state.profile.transportMode), [state]);
  const urgentItems = useMemo(() => state.pantry.filter((item) => item.status === 'soon' || daysUntil(item.bestBefore) <= 3), [state.pantry]);

  useEffect(() => {
    fetch('/api/state')
      .then((response) => readJson<AppState>(response))
      .then((data) => { setState(data); setSyncStatus('saved'); })
      .catch(() => setSyncStatus('offline'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = (view: ViewName) => {
    setActive(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateTransport = async (mode: TransportMode) => {
    setState((current) => ({ ...current, profile: { ...current.profile, transportMode: mode } }));
    try {
      const next = await readJson<AppState>(await fetch('/api/state', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transportMode: mode }),
      }));
      setState(next);
      setSyncStatus('saved');
    } catch {
      setSyncStatus('offline');
    }
  };

  const resetDemo = async () => {
    if (!window.confirm('Reset the demo profile, pantry, and meal history?')) return;
    setBusy(true);
    try {
      const next = await readJson<AppState>(await fetch('/api/reset', { method: 'POST' }));
      setState(next);
      setToast('Demo reset.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'I could not reset the demo.');
    } finally {
      setBusy(false);
    }
  };

  const openRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModal('recipe');
  };

  const cook = async (recipe: Recipe) => {
    setBusy(true);
    try {
      const next = await readJson<AppState>(await fetch('/api/cook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipeId: recipe.id }),
      }));
      setState(next);
      setModal(null);
      setToast('Meal logged. Your nutrition progress and pantry quantities are now updated.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'I could not log the meal.');
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async (messageOverride?: string, confirmedAction?: AgentAction) => {
    const message = (messageOverride || chatInput).trim();
    if (!message || busy) return;
    setChatMessages((items) => [
      ...items.map((item) => confirmedAction && item.action?.recipe_id === confirmedAction.recipe_id
        ? { ...item, action: undefined }
        : item),
      { role: 'user', text: message },
    ]);
    setChatInput('');
    setBusy(true);
    try {
      const result = await readJson<{ answer: string; tools?: string[]; mode?: string; actions?: AgentAction[]; state?: AppState }>(await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, confirmedAction }),
      }));
      const action = result.actions?.find((item) => item.status === 'confirmation_required');
      setChatMessages((items) => [...items, { role: 'agent', text: result.answer, tools: result.tools, mode: result.mode, action }]);
      if (result.state) {
        setState(result.state);
        setToast('The agent logged the meal and updated your day and pantry.');
      }
    } catch (error) {
      setChatMessages((items) => [...items, { role: 'agent', text: error instanceof Error ? error.message : 'I could not answer.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active={active} navigate={navigate} showAgent={() => setChatOpen(true)} profile={state.profile} showProfile={() => navigate('Goals')} />

      <main className="main-area">
        <Header
          active={active}
          profileName={state.profile.name}
          syncStatus={syncStatus}
          addItem={() => setModal('add')}
          openReceipt={() => setModal('receipt')}
          resetDemo={resetDemo}
        />

        {active === 'Today' && (
          <TodayView
            state={state}
            options={options}
            urgentItems={urgentItems}
            openRecipe={openRecipe}
            navigate={navigate}
            updateTransport={updateTransport}
            openReceipt={() => setModal('receipt')}
          />
        )}
        {active === 'Goals' && <GoalsView state={state} setState={setState} notify={setToast} />}
        {active === 'Pantry' && (
          <PantryView
            state={state}
            setState={setState}
            addItem={() => setModal('add')}
            openReceipt={() => setModal('receipt')}
            notify={setToast}
          />
        )}
        {active === 'Recipes' && <RecipesView state={state} openRecipe={openRecipe} />}
        {active === 'Shopping' && <ShoppingView state={state} options={options} updateTransport={updateTransport} />}
      </main>

      <MobileNav active={active} navigate={navigate} />
      <button className="mobile-agent" onClick={() => setChatOpen(true)} title="Talk to nutrIAhorro" type="button">
        <MessageCircleMore size={23} />
      </button>
      <button className="desktop-agent" onClick={() => setChatOpen(true)} type="button">
        <MessageCircleMore size={20} /><span>Ask your agent</span>
      </button>

      {modal === 'add' && <AddItemModal close={() => setModal(null)} setState={setState} notify={setToast} />}
      {modal === 'receipt' && <ReceiptModal close={() => setModal(null)} setState={setState} notify={setToast} />}
      {modal === 'recipe' && selectedRecipe && <RecipeModal recipe={selectedRecipe} close={() => setModal(null)} cook={cook} busy={busy} />}
      {chatOpen && <ChatDrawer messages={chatMessages} input={chatInput} setInput={setChatInput} send={sendChat} close={() => setChatOpen(false)} busy={busy} />}
      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

function Sidebar({ active, navigate, showAgent, showProfile, profile }: { active: ViewName; navigate: (view: ViewName) => void; showAgent: () => void; showProfile: () => void; profile: Profile }) {
  return (
    <aside className="sidebar">
      <div className="brand" aria-label="nutrIAhorro">
        <span className="brand-mark"><Leaf size={20} strokeWidth={2.5} /></span>
        <span className="brand-name">nutr<span>IA</span>horro</span>
      </div>
      <nav className="primary-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <button className={active === item.label ? 'nav-button active' : 'nav-button'} key={item.label} onClick={() => navigate(item.label)} type="button"><Icon size={19} /><span>{item.label}</span></button>;
        })}
      </nav>
      <div className="sidebar-card">
        <Sparkles size={18} /><strong>Smart agent</strong>
        <p>Ask about your pantry, your goals, and the shopping option that truly costs less.</p>
        <button onClick={showAgent} type="button">Open agent</button>
      </div>
      <button className="profile-button" onClick={showProfile} type="button">
        <span className="avatar">{profile.name.slice(0, 1).toUpperCase()}</span><span><strong>{profile.name}</strong><small>{profile.city}</small></span><ChevronRight size={17} />
      </button>
    </aside>
  );
}

function Header({ active, profileName, syncStatus, addItem, openReceipt, resetDemo }: { active: ViewName; profileName: string; syncStatus: string; addItem: () => void; openReceipt: () => void; resetDemo: () => void }) {
  const titles: Record<ViewName, string> = {
    Today: `Hi, ${profileName}. Here is what matters today.`,
    Goals: 'Your goals shape your daily plan.',
    Pantry: 'Your pantry, organized and up to date.',
    Recipes: 'Meals built around what you already have.',
    Shopping: 'Compare the true cost before you leave.',
  };
  return (
    <header className="topbar">
      <div><p className="eyebrow">{longDate.format(new Date())}</p><h1>{titles[active]}</h1></div>
      <div className="top-actions">
        <span className={`sync-pill ${syncStatus}`}><span />{syncStatus === 'loading' ? 'Connecting' : syncStatus === 'saved' ? 'Saved' : 'Local mode'}</span>
        <button className="icon-button" title="Reset demo" onClick={resetDemo} type="button"><RotateCcw size={19} /></button>
        <button className="icon-button" title="Upload receipt" onClick={openReceipt} type="button"><ScanLine size={20} /></button>
        <button className="add-button" onClick={addItem} type="button"><Plus size={18} /><span>Add food</span></button>
      </div>
    </header>
  );
}

function TodayView({ state, options, urgentItems, openRecipe, navigate, updateTransport, openReceipt }: { state: AppState; options: ShoppingOption[]; urgentItems: PantryItem[]; openRecipe: (recipe: Recipe) => void; navigate: (view: ViewName) => void; updateTransport: (mode: TransportMode) => void; openReceipt: () => void }) {
  const topRecipes = state.recipes.slice(0, 3);
  const best = options[0];
  return (
    <>
      <section className="daily-summary" aria-label="Daily nutrition summary">
        <div className="summary-copy"><span className="status-label"><Sparkles size={15} /> Today&apos;s plan</span><h2>Eat well without wasting what you already have.</h2><p>Prioritize {urgentItems.slice(0, 3).map((item) => item.name.toLowerCase()).join(', ')}. Your pantry can cover three main meals.</p></div>
        <MacroGrid state={state} />
      </section>
      <DailyStatus state={state} />
      <section className="content-grid">
        <div className="content-column">
          <SectionHeading eyebrow="Suggested recipes" title="What you can cook" action="View all" onAction={() => navigate('Recipes')} />
          <div className="meal-list">{topRecipes.map((recipe, index) => <MealRow key={recipe.id} recipe={recipe} index={index} open={() => openRecipe(recipe)} />)}</div>
          <div className="section-heading pantry-heading"><div><p className="eyebrow">Pantry</p><h2>Use first</h2></div><button className="scan-button" onClick={openReceipt} type="button"><ScanLine size={17} /> Upload receipt</button></div>
          {urgentItems[0] ? <ExpiryRow item={urgentItems[0]} open={() => navigate('Pantry')} /> : <EmptyLine text="Nothing needs to be used soon." />}
        </div>
        <aside className="insights-column">
          <div className="section-heading compact"><div><p className="eyebrow">Smart shopping</p><h2>The option that truly costs less</h2></div></div>
          <TransportSwitch current={state.profile.transportMode} update={updateTransport} compact />
          {best && <StoreFeatured option={best} mode={state.profile.transportMode} open={() => navigate('Shopping')} />}
          {options[1] && <StoreSecondary option={options[1]} />}
          <div className="agent-note"><span><MessageCircleMore size={20} /></span><div><strong>Your agent is watching</strong><p>It will flag nearby deals that are still worthwhile after travel.</p></div></div>
        </aside>
      </section>
    </>
  );
}

function DailyStatus({ state }: { state: AppState }) {
  const { consumed, remaining, calorieStatus, meals } = state.dailyIntake;
  const remainingLabel = (value: number) => value >= 0 ? `${value} g` : `${Math.abs(value)} g over target`;
  const lastMeal = meals[0]?.recipeName;
  const status = calorieStatus === 'over'
    ? `You are ${Math.abs(remaining.calories)} kcal over your maximum.`
    : calorieStatus === 'in-range'
      ? 'You are within your calorie range.'
      : `You need ${remaining.calories} kcal to reach your range.`;
  return <div className={`daily-status ${calorieStatus}`}><span><Check size={17} /></span><div><strong>{meals.length ? `${meals.length} ${meals.length === 1 ? 'meal' : 'meals'} logged today` : 'No meals logged today yet'}</strong><small>{status}{lastMeal ? ` Latest: ${lastMeal}.` : ''}</small></div><div className="remaining-macros"><span><small>Protein</small><strong>{remainingLabel(remaining.protein)}</strong></span><span><small>Carbs</small><strong>{remainingLabel(remaining.carbs)}</strong></span><span><small>Fat</small><strong>{remainingLabel(remaining.fat)}</strong></span></div><strong className="consumed-kcal">{consumed.calories} kcal</strong></div>;
}

function MacroGrid({ state }: { state: AppState }) {
  const { consumed } = state.dailyIntake;
  const values = [
    { icon: Gauge, value: `${consumed.calories}`, target: `${state.profile.calorieMin}-${state.profile.calorieMax} kcal`, label: 'calories', kind: 'flame', progress: consumed.calories / state.profile.calorieMax },
    { icon: Utensils, value: `${consumed.protein} g`, target: `${state.profile.proteinGrams} g`, label: 'protein', kind: 'protein', progress: consumed.protein / state.profile.proteinGrams },
    { icon: Wheat, value: `${consumed.carbs} g`, target: `${state.profile.carbsGrams} g`, label: 'carbs', kind: 'carbs', progress: consumed.carbs / state.profile.carbsGrams },
    { icon: Droplets, value: `${consumed.fat} g`, target: `${state.profile.fatGrams} g`, label: 'fat', kind: 'fat', progress: consumed.fat / state.profile.fatGrams },
  ];
  return <div className="macro-grid">{values.map((item) => { const Icon = item.icon; return <div className="macro-item" key={item.label}><span className={`macro-icon ${item.kind}`}><Icon size={18} /></span><span><strong>{item.value}</strong><small>{item.label} · target {item.target}</small><span className="macro-progress"><span style={{ width: `${Math.min(100, Math.max(0, item.progress * 100))}%` }} /></span></span></div>; })}</div>;
}

function GoalsView({ state, setState, notify }: { state: AppState; setState: (state: AppState) => void; notify: (text: string) => void }) {
  const [draft, setDraft] = useState<Profile>(state.profile);
  const [saving, setSaving] = useState(false);
  const targets = useMemo(() => calculateNutritionTargets(draft), [draft]);
  const goalChoices: Array<{ value: GoalType; label: string; detail: string }> = [
    { value: 'lose_fat', label: 'Lose fat', detail: 'Moderate deficit' },
    { value: 'maintain', label: 'Maintain weight', detail: 'Stable weight' },
    { value: 'gain_muscle', label: 'Build muscle', detail: 'Moderate surplus' },
    { value: 'improve_fitness', label: 'Improve fitness', detail: 'Overall performance' },
  ];
  const update = <Key extends keyof Profile>(key: Key, value: Profile[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await readJson<AppState>(await fetch('/api/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      }));
      setDraft(next.profile);
      setState(next);
      notify('Goals saved. Your daily plan is now updated.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Your goals could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-view goals-view">
      <form className="goals-layout" onSubmit={submit}>
        <div className="goals-form">
          <section className="goal-section">
            <div className="goal-section-title"><span><Target size={19} /></span><div><p className="eyebrow">Your goal</p><h2>What do you want to achieve?</h2></div></div>
            <div className="goal-choice-grid">{goalChoices.map((choice) => <button aria-pressed={draft.goalType === choice.value} className={draft.goalType === choice.value ? 'goal-choice selected' : 'goal-choice'} key={choice.value} onClick={() => update('goalType', choice.value)} type="button"><span>{draft.goalType === choice.value ? <Check size={16} /> : <Target size={16} />}</span><strong>{choice.label}</strong><small>{choice.detail}</small></button>)}</div>
          </section>

          <section className="goal-section">
            <div className="goal-section-title"><span><Scale size={19} /></span><div><p className="eyebrow">Starting point</p><h2>Your current details</h2></div></div>
            <div className="goal-fields">
              <label>Name<input required value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
              <label>City<input required value={draft.city} onChange={(event) => update('city', event.target.value)} /></label>
              <label>Age<input required min="18" max="100" type="number" value={draft.age} onChange={(event) => update('age', Number(event.target.value))} /></label>
              <label>Metabolic reference<select value={draft.metabolicReference} onChange={(event) => update('metabolicReference', event.target.value as Profile['metabolicReference'])}><option value="neutral">Neutral estimate</option><option value="female">Female</option><option value="male">Male</option></select></label>
              <label>Height<input required min="120" max="230" type="number" value={draft.heightCm} onChange={(event) => update('heightCm', Number(event.target.value))} /><span>cm</span></label>
              <label>Current weight<input required min="35" max="300" step="0.1" type="number" value={draft.currentWeightKg} onChange={(event) => update('currentWeightKg', Number(event.target.value))} /><span>kg</span></label>
              <label className="goal-weight">Goal weight<input required min="35" max="300" step="0.1" type="number" value={draft.goalWeightKg} onChange={(event) => update('goalWeightKg', Number(event.target.value))} /><span>kg</span></label>
            </div>
          </section>

          <section className="goal-section">
            <div className="goal-section-title"><span><Activity size={19} /></span><div><p className="eyebrow">Movement</p><h2>What does a normal week look like?</h2></div></div>
            <div className="goal-fields">
              <label className="wide-field">Daily activity<select value={draft.activityLevel} onChange={(event) => update('activityLevel', event.target.value as Profile['activityLevel'])}><option value="sedentary">Mostly seated</option><option value="light">I move a little during the day</option><option value="moderate">Fairly active day</option><option value="high">Very active work or routine</option></select></label>
              <label>Exercise days per week<input required min="0" max="7" type="number" value={draft.exerciseDaysPerWeek} onChange={(event) => update('exerciseDaysPerWeek', Number(event.target.value))} /></label>
              <label>Minutes per session<input required min="0" max="300" step="5" type="number" value={draft.exerciseMinutes} onChange={(event) => update('exerciseMinutes', Number(event.target.value))} /><span>min</span></label>
              <label>Cooking time<select value={draft.mealPrepMinutes} onChange={(event) => update('mealPrepMinutes', Number(event.target.value))}><option value="15">Up to 15 minutes</option><option value="30">Up to 30 minutes</option><option value="45">Up to 45 minutes</option><option value="60">One hour or more</option></select></label>
            </div>
          </section>

          <section className="goal-section">
            <div className="goal-section-title"><span><Utensils size={19} /></span><div><p className="eyebrow">Preferences</p><h2>What your agent must respect</h2></div></div>
            <div className="goal-fields">
              <label>Dietary preference<select value={draft.dietaryPreference} onChange={(event) => update('dietaryPreference', event.target.value)}><option>No preference</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-free</option><option>Low-lactose</option></select></label>
              <label>Allergies or intolerances<input value={draft.allergies} onChange={(event) => update('allergies', event.target.value)} placeholder="e.g. peanuts, lactose" /></label>
              <label className="wide-field">Foods you dislike<input value={draft.dislikes} onChange={(event) => update('dislikes', event.target.value)} placeholder="e.g. broccoli" /></label>
            </div>
          </section>
        </div>

        <aside className="goal-result">
          <span className="result-icon"><Target size={23} /></span>
          <p className="eyebrow">Daily estimate</p>
          <h2>{targets.calorieMin.toLocaleString('en-US')}-{targets.calorieMax.toLocaleString('en-US')} kcal</h2>
          <p className="result-copy">Calculated from your details, activity, exercise, and goal.</p>
          <div className="result-macros"><div><strong>{targets.proteinGrams} g</strong><small>Protein</small></div><div><strong>{targets.carbsGrams} g</strong><small>Carbs</small></div><div><strong>{targets.fatGrams} g</strong><small>Fat</small></div></div>
          <div className="goal-progress"><span><small>Current</small><strong>{draft.currentWeightKg} kg</strong></span><div><span style={{ width: `${Math.min(100, Math.max(8, 100 - Math.abs(draft.currentWeightKg - draft.goalWeightKg) * 8))}%` }} /></div><span><small>Goal</small><strong>{draft.goalWeightKg} kg</strong></span></div>
          <div className="safety-box"><AlertTriangle size={18} /><p>This is a general wellness estimate. Pregnancy, medical conditions, severe allergies, or clinical goals require professional evaluation.</p></div>
          <button className="primary-button save-goals" disabled={saving} type="submit">{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Save and update my plan</button>
        </aside>
      </form>
    </section>
  );
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction} type="button">{action}<ChevronRight size={16} /></button>}</div>;
}

function MealRow({ recipe, index, open }: { recipe: Recipe; index: number; open: () => void }) {
  const visual = index % 3 === 0 ? 'tomato' : index % 3 === 1 ? 'sun' : 'leaf';
  return <button className="meal-card" onClick={open} type="button"><span className={`meal-visual ${visual}`} aria-hidden="true">{index % 3 === 0 ? <Utensils size={27} /> : index % 3 === 1 ? <ChefHat size={27} /> : <Leaf size={27} />}</span><span className="meal-copy"><span className="meal-tag">{recipe.priority}</span><strong>{recipe.name}</strong><small><Clock3 size={14} /> {recipe.prepMinutes} min <span /> {recipe.calories} kcal <span /> P {recipe.protein} g <span /> C {recipe.carbs} g <span /> F {recipe.fat} g</small></span><ChevronRight size={19} /></button>;
}

function ExpiryRow({ item, open }: { item: PantryItem; open: () => void }) {
  const days = daysUntil(item.bestBefore);
  return <button className="expiry-strip" onClick={open} type="button"><span className="expiry-icon"><AlertTriangle size={21} /></span><div><strong>{item.name}</strong><p>{days <= 0 ? 'Check its condition today.' : `Best used within the next ${days} days.`}</p></div><span className="stock-pill">{item.quantity} {item.unit}</span><ChevronRight size={18} /></button>;
}

function PantryView({ state, setState, addItem, openReceipt, notify }: { state: AppState; setState: (state: AppState) => void; addItem: () => void; openReceipt: () => void; notify: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(state.pantry.map((item) => item.category)))];
  const filtered = state.pantry.filter((item) => (category === 'All' || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase()));

  const remove = async (item: PantryItem) => {
    try {
      const next = await readJson<AppState>(await fetch(`/api/pantry?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' }));
      setState(next); notify(`${item.name} was removed.`);
    } catch (error) { notify(error instanceof Error ? error.message : 'The item could not be removed.'); }
  };

  return (
    <section className="page-view">
      <div className="view-toolbar">
        <div className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search food" /></div>
        <div className="toolbar-actions"><button className="secondary-button" onClick={openReceipt} type="button"><ScanLine size={17} /> Upload receipt</button><button className="primary-button" onClick={addItem} type="button"><Plus size={17} /> Add</button></div>
      </div>
      <div className="filter-tabs">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div>
      <div className="inventory-band"><div><span>{state.pantry.length}</span><small>foods tracked</small></div><div><span>{state.pantry.filter((item) => item.status === 'soon').length}</span><small>to use soon</small></div><div><span>{state.pantry.filter((item) => item.status === 'low').length}</span><small>low in stock</small></div><p><Leaf size={17} /> First in, first out, always within each food&apos;s safe storage conditions.</p></div>
      <div className="pantry-table" role="table">
        <div className="pantry-table-head" role="row"><span>Food</span><span>Quantity</span><span>Purchased</span><span>Priority</span><span /></div>
        {filtered.map((item) => <div className="pantry-table-row" role="row" key={item.id}><span className="pantry-name"><span className={`food-dot ${item.status}`} /><span><strong>{item.name}</strong><small>{item.category} · {item.source}</small></span></span><span>{item.quantity} {item.unit}</span><span>{shortDate.format(new Date(item.purchasedAt))}</span><span><StatusBadge item={item} /></span><span><button className="row-icon-button" title={`Remove ${item.name}`} onClick={() => remove(item)} type="button"><Trash2 size={17} /></button></span></div>)}
        {!filtered.length && <EmptyLine text="No foods match that filter." />}
      </div>
    </section>
  );
}

function StatusBadge({ item }: { item: PantryItem }) {
  const days = daysUntil(item.bestBefore);
  const kind = item.status === 'low' ? 'low' : days <= 3 ? 'soon' : 'ok';
  const label = kind === 'low' ? 'Low stock' : kind === 'soon' ? `Use in ${Math.max(days, 0)} days` : 'All good';
  return <span className={`status-badge ${kind}`}>{label}</span>;
}

function RecipesView({ state, openRecipe }: { state: AppState; openRecipe: (recipe: Recipe) => void }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Under 20 min', 'High protein', 'Budget-friendly'];
  const recipes = state.recipes.filter((recipe) => filter === 'All' || (filter === 'Under 20 min' && recipe.prepMinutes <= 20) || (filter === 'High protein' && recipe.protein >= 40) || (filter === 'Budget-friendly' && recipe.priority === 'Budget-friendly'));
  return <section className="page-view"><div className="recipe-filter-row">{filters.map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item} type="button">{item}</button>)}</div><div className="recipe-grid">{recipes.map((recipe, index) => <button className="recipe-card" key={recipe.id} onClick={() => openRecipe(recipe)} type="button"><div className={`recipe-art tone-${index % 4}`}><span><ChefHat size={30} /></span><small>{recipe.prepMinutes} min</small></div><div className="recipe-card-copy"><span className="meal-tag">{recipe.priority}</span><h2>{recipe.name}</h2><p>{recipe.description}</p><div className="recipe-macro-line"><span><strong>{recipe.calories}</strong> kcal</span><span><strong>{recipe.protein} g</strong> P</span><span><strong>{recipe.carbs} g</strong> C</span><span><strong>{recipe.fat} g</strong> F</span><ChevronRight size={18} /></div></div></button>)}</div><p className="nutrition-disclaimer">General wellness information only. It does not replace guidance from a health professional.</p></section>;
}

function ShoppingView({ state, options, updateTransport }: { state: AppState; options: ShoppingOption[]; updateTransport: (mode: TransportMode) => void }) {
  const best = options[0];
  return <section className="page-view shopping-view"><div className="shopping-top"><div><p className="eyebrow">From Maldonado</p><h2>Estimated weekly shop</h2><p>I compare demo prices and include the round-trip travel cost.</p></div><TransportSwitch current={state.profile.transportMode} update={updateTransport} /></div>{best && <div className="best-option-band"><span className="store-logo eldorado">{best.supermarket === 'El Dorado' ? 'ED' : best.supermarket[0]}</span><div><small>Best effective cost</small><h2>{best.supermarket}</h2><p><MapPin size={14} /> {best.distanceKm.toLocaleString('en-US')} km · {best.travelMinutes} min</p></div><div><small>Basket</small><strong>{money.format(best.basketPrice)}</strong></div><div><small>Travel</small><strong>{money.format(best.travelCost)}</strong></div><div className="effective-price"><small>Effective total</small><strong>{money.format(best.effectiveCost)}</strong><span>Save {money.format(best.savings)}</span></div></div>}
      <div className="comparison-list"><div className="comparison-head"><span>Supermarket</span><span>Basket</span><span>Travel</span><span>Effective total</span></div>{options.map((option, index) => <div className={`comparison-row ${index === 0 ? 'winner' : ''}`} key={option.supermarket}><span><span className={`mini-store store-${index}`}>{option.supermarket === 'El Dorado' ? 'ED' : option.supermarket[0]}</span><span><strong>{option.supermarket}</strong><small>{option.distanceKm.toLocaleString('en-US')} km · {option.travelMinutes} min</small></span></span><span>{money.format(option.basketPrice)}</span><span>{option.travelCost ? money.format(option.travelCost) : 'Free'}</span><span><strong>{money.format(option.effectiveCost)}</strong>{index === 0 && <small>Best option</small>}</span></div>)}</div>
      <div className="offer-section"><SectionHeading eyebrow="Detected deals" title="Products on your list" /><div className="offer-grid">{best?.items.map((offer) => <div className="offer-item" key={offer.id}><span className="offer-icon"><ShoppingBasket size={19} /></span><div><strong>{offer.product}</strong><small>{offer.supermarket} · through {shortDate.format(new Date(offer.validUntil))}</small></div><span><del>{money.format(offer.regularPrice)}</del><strong>{money.format(offer.price)}</strong></span></div>)}</div></div>
      <p className="data-disclaimer"><AlertTriangle size={15} /> Demo prices are fictional. A production version would use current catalogs or an authorized data source.</p>
    </section>;
}

function TransportSwitch({ current, update, compact = false }: { current: TransportMode; update: (mode: TransportMode) => void; compact?: boolean }) {
  const items: Array<{ key: TransportMode; label: string; icon: typeof Footprints }> = [
    { key: 'walking', label: 'Walking', icon: Footprints }, { key: 'bicycle', label: 'Bicycle', icon: Bike }, { key: 'car', label: 'Car', icon: CarFront }, { key: 'motorcycle', label: 'Motorcycle', icon: Gauge },
  ];
  return <div className={`transport-switch ${compact ? 'compact-switch' : 'wide-switch'}`} aria-label="Transportation mode">{items.map((item) => { const Icon = item.icon; return <button className={current === item.key ? 'selected' : ''} key={item.key} onClick={() => update(item.key)} title={item.label} type="button"><Icon size={17} /><span>{item.label}</span></button>; })}</div>;
}

function StoreFeatured({ option, mode, open }: { option: ShoppingOption; mode: TransportMode; open: () => void }) {
  return <div className="store-card featured"><div className="store-topline"><span className="store-logo eldorado">ED</span><span><strong>{option.supermarket}</strong><small><MapPin size={13} /> {option.distanceKm.toLocaleString('en-US')} km · {option.travelMinutes} min</small></span><span className="best-badge">Best option</span></div><div className="price-row"><span><small>Estimated basket</small><strong>{money.format(option.basketPrice)}</strong></span><span><small>Savings</small><strong className="saving">{money.format(option.savings)}</strong></span></div><p className="store-note">Travel cost by {transportConfig[mode].label.toLowerCase()}: {option.travelCost ? money.format(option.travelCost) : 'free'}.</p><button onClick={open} type="button">View list and deals <ChevronRight size={16} /></button></div>;
}

function StoreSecondary({ option }: { option: ShoppingOption }) {
  return <div className="store-card secondary"><div className="store-topline"><span className="store-logo disco">{option.supermarket[0]}</span><span><strong>{option.supermarket}</strong><small><MapPin size={13} /> {option.distanceKm.toLocaleString('en-US')} km · {option.travelMinutes} min</small></span><strong className="secondary-price">{money.format(option.effectiveCost)}</strong></div></div>;
}

function AddItemModal({ close, setState, notify }: { close: () => void; setState: (state: AppState) => void; notify: (text: string) => void }) {
  const [saving, setSaving] = useState(false);
  const defaultBestBefore = relativeDateInput(7);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    const bestBefore = new Date(String(form.get('bestBefore')) + 'T12:00:00').toISOString();
    try {
      const next = await readJson<AppState>(await fetch('/api/pantry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), category: form.get('category'), quantity: Number(form.get('quantity')), unit: form.get('unit'), source: form.get('source'), bestBefore }) }));
      setState(next); close(); notify('Food added to your pantry.');
    } catch (error) { notify(error instanceof Error ? error.message : 'The item could not be saved.'); } finally { setSaving(false); }
  };
  return <ModalShell title="Add food" close={close}><form className="form-grid" onSubmit={submit}><label className="full">Name<input name="name" required placeholder="e.g. Greek yogurt" /></label><label>Category<select name="category" defaultValue="Protein"><option>Protein</option><option>Carbohydrate</option><option>Vegetable</option><option>Fruit</option><option>Fat</option><option>Other</option></select></label><label>Supermarket<input name="source" defaultValue="Ta-Ta" /></label><label>Quantity<input name="quantity" type="number" min="0.1" step="0.1" required defaultValue="1" /></label><label>Unit<select name="unit"><option>units</option><option>g</option><option>kg</option><option>ml</option><option>l</option></select></label><label className="full">Best before<input name="bestBefore" required type="date" defaultValue={defaultBestBefore} /></label><div className="modal-actions full"><button className="secondary-button" onClick={close} type="button">Cancel</button><button className="primary-button" disabled={saving} type="submit">{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Add</button></div></form></ModalShell>;
}

function ReceiptModal({ close, setState, notify }: { close: () => void; setState: (state: AppState) => void; notify: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedItems, setParsedItems] = useState<PantryItem[]>([]);
  const [mode, setMode] = useState<string | null>(null);
  const upload = async () => {
    if (!file) return; setUploading(true);
    try {
      const preparedFile = await compactReceiptImage(file);
      const form = new FormData(); form.append('receipt', preparedFile);
      const result = await readJson<{ parsedItems: PantryItem[]; mode: string; message: string }>(await fetch('/api/receipt', { method: 'POST', body: form }));
      setParsedItems(result.parsedItems); setMode(result.mode); notify(result.message);
    } catch (error) { notify(error instanceof Error ? error.message : 'I could not process the receipt.'); } finally { setUploading(false); }
  };
  const updateParsed = (index: number, patch: Partial<PantryItem>) => setParsedItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const confirm = async () => {
    setUploading(true);
    try {
      const result = await readJson<{ state: AppState; message: string }>(await fetch('/api/receipt', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: parsedItems }),
      }));
      setState(result.state); close(); notify(result.message);
    } catch (error) { notify(error instanceof Error ? error.message : 'I could not save the foods.'); } finally { setUploading(false); }
  };
  return <ModalShell title="Upload receipt" close={close} wide><div className="receipt-panel"><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { setFile(event.target.files?.[0] || null); setParsedItems([]); }} /><button className={`drop-zone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} type="button">{file ? <><Check size={27} /><strong>{file.name}</strong><span>{parsedItems.length ? 'Receipt analyzed' : 'Ready to process'}</span></> : <><Camera size={28} /><strong>Choose a receipt photo</strong><span>JPG, PNG, or WEBP · 8 MB maximum</span></>}</button>{!parsedItems.length && <div className="demo-receipt"><span><Sparkles size={17} /></span><p><strong>AI reading with human review</strong>The agent proposes the products, and you confirm the quantities before the pantry changes.</p></div>}{parsedItems.length > 0 && <div className="receipt-review"><div><strong>Review before saving</strong><small>{mode === 'aws-agent' ? 'Read by the AWS agent' : 'MVP demo data'}</small></div>{parsedItems.map((item, index) => <div className="receipt-review-row" key={item.id}><input aria-label={`Product name ${index + 1}`} value={item.name} onChange={(event) => updateParsed(index, { name: event.target.value })} /><input aria-label={`Quantity of ${item.name}`} min="0" step="0.1" type="number" value={item.quantity} onChange={(event) => updateParsed(index, { quantity: Number(event.target.value) })} /><select aria-label={`Unit for ${item.name}`} value={item.unit} onChange={(event) => updateParsed(index, { unit: event.target.value })}><option>units</option><option>g</option><option>kg</option><option>ml</option><option>l</option></select></div>)}</div>}<div className="modal-actions"><button className="secondary-button" onClick={close} type="button">Cancel</button>{parsedItems.length ? <button className="primary-button" disabled={uploading} onClick={confirm} type="button">{uploading ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Confirm and save</button> : <button className="primary-button" disabled={!file || uploading} onClick={upload} type="button">{uploading ? <LoaderCircle className="spin" size={17} /> : <ScanLine size={17} />} Process receipt</button>}</div></div></ModalShell>;
}

function RecipeModal({ recipe, close, cook, busy }: { recipe: Recipe; close: () => void; cook: (recipe: Recipe) => void; busy: boolean }) {
  return <ModalShell title={recipe.name} close={close} wide><div className="recipe-detail"><div className="recipe-detail-summary"><span className="meal-tag">{recipe.priority}</span><p>{recipe.description}</p><div><span><Clock3 size={17} /><strong>{recipe.prepMinutes}</strong><small>minutes</small></span><span><Gauge size={17} /><strong>{recipe.calories}</strong><small>kcal</small></span><span><Utensils size={17} /><strong>{recipe.protein} g</strong><small>protein</small></span><span><Wheat size={17} /><strong>{recipe.carbs} g</strong><small>carbs</small></span><span><Droplets size={17} /><strong>{recipe.fat} g</strong><small>fat</small></span></div></div><div className="recipe-columns"><div><h3>From your pantry</h3><ul className="ingredient-list">{recipe.ingredients.map((item) => <li key={item.label}><Check size={15} /><span>{item.label}</span><strong>{item.quantity} {item.unit}</strong></li>)}</ul></div><div><h3>Preparation</h3><ol className="step-list">{recipe.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></div></div><div className="modal-actions"><button className="secondary-button" onClick={close} type="button">Back</button><button className="primary-button" disabled={busy} onClick={() => cook(recipe)} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Mark as cooked</button></div></div></ModalShell>;
}

function ChatDrawer({ messages, input, setInput, send, close, busy }: { messages: ChatMessage[]; input: string; setInput: (value: string) => void; send: (value?: string, confirmedAction?: AgentAction) => void; close: () => void; busy: boolean }) {
  const quick = ['How am I doing on my macros?', 'What should I use first?', 'I need something quick'];
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, busy]);

  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><aside className="chat-drawer"><header><div><span><Leaf size={19} /></span><div><strong>nutrIAhorro agent</strong><small>Active with memory of your pantry</small></div></div><button className="row-icon-button" onClick={close} title="Close" type="button"><X size={20} /></button></header><div className="chat-body">{messages.map((item, index) => <div className={`chat-message ${item.role}`} key={`${item.role}-${index}`}><span>{item.text}</span>{item.role === 'agent' && item.tools?.length ? <small className="tool-trace"><Sparkles size={11} /> {item.mode?.startsWith('strands-') ? 'Strands Agents' : 'Local fallback'} · Tools: {item.tools.join(', ')}</small> : null}{item.role === 'agent' && item.action ? <button className="chat-action-button" disabled={busy} onClick={() => send(`I confirm that I cooked ${item.action?.recipe_name}. Log it now with recipe_id ${item.action?.recipe_id} and confirmed=true.`, item.action)} type="button"><Check size={15} /> Confirm meal</button> : null}</div>)}{busy && <div className="chat-message agent typing"><span /><span /><span /></div>}<div ref={endRef} /></div><div className="quick-prompts">{quick.map((item) => <button key={item} onClick={() => send(item)} type="button">{item}</button>)}</div><form className="chat-form" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your agent" /><button disabled={!input.trim() || busy} title="Send" type="submit"><Send size={18} /></button></form></aside></div>;
}

function ModalShell({ title, close, children, wide = false }: { title: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="row-icon-button" onClick={close} title="Close" type="button"><X size={20} /></button></header>{children}</section></div>;
}

function MobileNav({ active, navigate }: { active: ViewName; navigate: (view: ViewName) => void }) {
  return <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => { const Icon = item.icon; return <button className={active === item.label ? 'active' : ''} key={item.label} onClick={() => navigate(item.label)} type="button"><Icon size={20} /><span>{item.label}</span></button>; })}</nav>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className="empty-line"><PackageSearch size={20} /><span>{text}</span></div>;
}
