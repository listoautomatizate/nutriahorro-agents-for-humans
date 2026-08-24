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

type ViewName = 'Hoy' | 'Objetivos' | 'Despensa' | 'Recetas' | 'Compra';
type ModalName = 'add' | 'receipt' | 'recipe' | null;

const navItems: Array<{ label: ViewName; icon: typeof Home }> = [
  { label: 'Hoy', icon: Home },
  { label: 'Objetivos', icon: Target },
  { label: 'Despensa', icon: PackageSearch },
  { label: 'Recetas', icon: ChefHat },
  { label: 'Compra', icon: ShoppingBasket },
];

const initialState: AppState = {
  profile: demoProfile,
  pantry: demoPantry,
  recipes: demoRecipes,
  offers: demoOffers,
  cookedRecipeIds: [],
  lastUploadName: null,
};

const money = new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
const defaultBestBefore = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
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
  if (!response.ok) throw new Error(data.error || 'Ocurrio un error.');
  return data;
}

export default function NutriahorroApp() {
  const [active, setActive] = useState<ViewName>('Hoy');
  const [state, setState] = useState<AppState>(initialState);
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'offline'>('loading');
  const [toast, setToast] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'agent' | 'user'; text: string }>>([
    { role: 'agent', text: 'Hola, Lia. Puedo ayudarte a elegir que cocinar, que usar primero o donde conviene comprar.' },
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
      setToast('Comida registrada. Actualice las cantidades de tu despensa.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'No pude registrar la comida.');
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async (messageOverride?: string) => {
    const message = (messageOverride || chatInput).trim();
    if (!message || busy) return;
    setChatMessages((items) => [...items, { role: 'user', text: message }]);
    setChatInput('');
    setBusy(true);
    try {
      const result = await readJson<{ answer: string }>(await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      }));
      setChatMessages((items) => [...items, { role: 'agent', text: result.answer }]);
    } catch (error) {
      setChatMessages((items) => [...items, { role: 'agent', text: error instanceof Error ? error.message : 'No pude responder.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar active={active} navigate={navigate} showAgent={() => setChatOpen(true)} profile={state.profile} showProfile={() => navigate('Objetivos')} />

      <main className="main-area">
        <Header
          active={active}
          profileName={state.profile.name}
          syncStatus={syncStatus}
          addItem={() => setModal('add')}
          openReceipt={() => setModal('receipt')}
        />

        {active === 'Hoy' && (
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
        {active === 'Objetivos' && <GoalsView state={state} setState={setState} notify={setToast} />}
        {active === 'Despensa' && (
          <PantryView
            state={state}
            setState={setState}
            addItem={() => setModal('add')}
            openReceipt={() => setModal('receipt')}
            notify={setToast}
          />
        )}
        {active === 'Recetas' && <RecipesView state={state} openRecipe={openRecipe} />}
        {active === 'Compra' && <ShoppingView state={state} options={options} updateTransport={updateTransport} />}
      </main>

      <MobileNav active={active} navigate={navigate} />
      <button className="mobile-agent" onClick={() => setChatOpen(true)} title="Hablar con nutrIAhorro" type="button">
        <MessageCircleMore size={23} />
      </button>
      <button className="desktop-agent" onClick={() => setChatOpen(true)} type="button">
        <MessageCircleMore size={20} /><span>Preguntale a tu agente</span>
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
      <nav className="primary-nav" aria-label="Navegacion principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <button className={active === item.label ? 'nav-button active' : 'nav-button'} key={item.label} onClick={() => navigate(item.label)} type="button"><Icon size={19} /><span>{item.label}</span></button>;
        })}
      </nav>
      <div className="sidebar-card">
        <Sparkles size={18} /><strong>Agente inteligente</strong>
        <p>Consulta tu despensa, tus objetivos y la compra que mas conviene.</p>
        <button onClick={showAgent} type="button">Abrir agente</button>
      </div>
      <button className="profile-button" onClick={showProfile} type="button">
        <span className="avatar">{profile.name.slice(0, 1).toUpperCase()}</span><span><strong>{profile.name}</strong><small>{profile.city}</small></span><ChevronRight size={17} />
      </button>
    </aside>
  );
}

function Header({ active, profileName, syncStatus, addItem, openReceipt }: { active: ViewName; profileName: string; syncStatus: string; addItem: () => void; openReceipt: () => void }) {
  const titles: Record<ViewName, string> = {
    Hoy: `Hola, ${profileName}. Esto es lo importante hoy.`,
    Objetivos: 'Tus objetivos definen el plan diario.',
    Despensa: 'Tu despensa, ordenada y al dia.',
    Recetas: 'Comidas pensadas con lo que ya tenes.',
    Compra: 'Compara el costo real antes de salir.',
  };
  return (
    <header className="topbar">
      <div><p className="eyebrow">{longDate.format(new Date())}</p><h1>{titles[active]}</h1></div>
      <div className="top-actions">
        <span className={`sync-pill ${syncStatus}`}><span />{syncStatus === 'loading' ? 'Conectando' : syncStatus === 'saved' ? 'Guardado' : 'Modo local'}</span>
        <button className="icon-button" title="Cargar ticket" onClick={openReceipt} type="button"><ScanLine size={20} /></button>
        <button className="add-button" onClick={addItem} type="button"><Plus size={18} /><span>Agregar alimento</span></button>
      </div>
    </header>
  );
}

function TodayView({ state, options, urgentItems, openRecipe, navigate, updateTransport, openReceipt }: { state: AppState; options: ShoppingOption[]; urgentItems: PantryItem[]; openRecipe: (recipe: Recipe) => void; navigate: (view: ViewName) => void; updateTransport: (mode: TransportMode) => void; openReceipt: () => void }) {
  const topRecipes = state.recipes.slice(0, 3);
  const best = options[0];
  return (
    <>
      <section className="daily-summary" aria-label="Resumen nutricional diario">
        <div className="summary-copy"><span className="status-label"><Sparkles size={15} /> Plan de hoy</span><h2>Comer bien sin desperdiciar lo que ya tenes.</h2><p>Priorice {urgentItems.slice(0, 3).map((item) => item.name.toLowerCase()).join(', ')}. Con tu despensa podes resolver las tres comidas principales.</p></div>
        <MacroGrid state={state} />
      </section>
      <section className="content-grid">
        <div className="content-column">
          <SectionHeading eyebrow="Recetas sugeridas" title="Que podes cocinar" action="Ver todas" onAction={() => navigate('Recetas')} />
          <div className="meal-list">{topRecipes.map((recipe, index) => <MealRow key={recipe.id} recipe={recipe} index={index} open={() => openRecipe(recipe)} />)}</div>
          <div className="section-heading pantry-heading"><div><p className="eyebrow">Despensa</p><h2>Usa primero</h2></div><button className="scan-button" onClick={openReceipt} type="button"><ScanLine size={17} /> Cargar ticket</button></div>
          {urgentItems[0] ? <ExpiryRow item={urgentItems[0]} open={() => navigate('Despensa')} /> : <EmptyLine text="No hay alimentos proximos a vencer." />}
        </div>
        <aside className="insights-column">
          <div className="section-heading compact"><div><p className="eyebrow">Compra inteligente</p><h2>La opcion que conviene</h2></div></div>
          <TransportSwitch current={state.profile.transportMode} update={updateTransport} compact />
          {best && <StoreFeatured option={best} mode={state.profile.transportMode} open={() => navigate('Compra')} />}
          {options[1] && <StoreSecondary option={options[1]} />}
          <div className="agent-note"><span><MessageCircleMore size={20} /></span><div><strong>Tu agente esta atento</strong><p>Te avisara cuando una oferta cercana compense el traslado.</p></div></div>
        </aside>
      </section>
    </>
  );
}

function MacroGrid({ state }: { state: AppState }) {
  const values = [
    { icon: Gauge, value: state.profile.calorieMin.toLocaleString('es-UY'), label: 'kcal objetivo', kind: 'flame' },
    { icon: Utensils, value: `${state.profile.proteinGrams} g`, label: 'proteina', kind: 'protein' },
    { icon: Wheat, value: `${state.profile.carbsGrams} g`, label: 'carbohidratos', kind: 'carbs' },
    { icon: Droplets, value: `${state.profile.fatGrams} g`, label: 'grasas', kind: 'fat' },
  ];
  return <div className="macro-grid">{values.map((item) => { const Icon = item.icon; return <div className="macro-item" key={item.label}><span className={`macro-icon ${item.kind}`}><Icon size={18} /></span><span><strong>{item.value}</strong><small>{item.label}</small></span></div>; })}</div>;
}

function GoalsView({ state, setState, notify }: { state: AppState; setState: (state: AppState) => void; notify: (text: string) => void }) {
  const [draft, setDraft] = useState<Profile>(state.profile);
  const [saving, setSaving] = useState(false);
  const targets = useMemo(() => calculateNutritionTargets(draft), [draft]);
  const goalChoices: Array<{ value: GoalType; label: string; detail: string }> = [
    { value: 'lose_fat', label: 'Perder grasa', detail: 'Deficit moderado' },
    { value: 'maintain', label: 'Mantenerme', detail: 'Peso estable' },
    { value: 'gain_muscle', label: 'Ganar masa', detail: 'Superavit moderado' },
    { value: 'improve_fitness', label: 'Estar en forma', detail: 'Rendimiento general' },
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
      notify('Objetivos guardados. Tu plan diario ya fue actualizado.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudieron guardar tus objetivos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-view goals-view">
      <form className="goals-layout" onSubmit={submit}>
        <div className="goals-form">
          <section className="goal-section">
            <div className="goal-section-title"><span><Target size={19} /></span><div><p className="eyebrow">Tu meta</p><h2>Que queres conseguir</h2></div></div>
            <div className="goal-choice-grid">{goalChoices.map((choice) => <button aria-pressed={draft.goalType === choice.value} className={draft.goalType === choice.value ? 'goal-choice selected' : 'goal-choice'} key={choice.value} onClick={() => update('goalType', choice.value)} type="button"><span>{draft.goalType === choice.value ? <Check size={16} /> : <Target size={16} />}</span><strong>{choice.label}</strong><small>{choice.detail}</small></button>)}</div>
          </section>

          <section className="goal-section">
            <div className="goal-section-title"><span><Scale size={19} /></span><div><p className="eyebrow">Punto de partida</p><h2>Tus datos actuales</h2></div></div>
            <div className="goal-fields">
              <label>Nombre<input required value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
              <label>Ciudad<input required value={draft.city} onChange={(event) => update('city', event.target.value)} /></label>
              <label>Edad<input required min="18" max="100" type="number" value={draft.age} onChange={(event) => update('age', Number(event.target.value))} /></label>
              <label>Referencia metabolica<select value={draft.metabolicReference} onChange={(event) => update('metabolicReference', event.target.value as Profile['metabolicReference'])}><option value="neutral">Estimacion neutral</option><option value="female">Femenina</option><option value="male">Masculina</option></select></label>
              <label>Altura<input required min="120" max="230" type="number" value={draft.heightCm} onChange={(event) => update('heightCm', Number(event.target.value))} /><span>cm</span></label>
              <label>Peso actual<input required min="35" max="300" step="0.1" type="number" value={draft.currentWeightKg} onChange={(event) => update('currentWeightKg', Number(event.target.value))} /><span>kg</span></label>
              <label className="goal-weight">Peso objetivo<input required min="35" max="300" step="0.1" type="number" value={draft.goalWeightKg} onChange={(event) => update('goalWeightKg', Number(event.target.value))} /><span>kg</span></label>
            </div>
          </section>

          <section className="goal-section">
            <div className="goal-section-title"><span><Activity size={19} /></span><div><p className="eyebrow">Movimiento</p><h2>Como es una semana normal</h2></div></div>
            <div className="goal-fields">
              <label className="wide-field">Movimiento cotidiano<select value={draft.activityLevel} onChange={(event) => update('activityLevel', event.target.value as Profile['activityLevel'])}><option value="sedentary">Mayormente sentada/o</option><option value="light">Me muevo un poco durante el dia</option><option value="moderate">Dia bastante activo</option><option value="high">Trabajo o rutina muy activa</option></select></label>
              <label>Dias de ejercicio por semana<input required min="0" max="7" type="number" value={draft.exerciseDaysPerWeek} onChange={(event) => update('exerciseDaysPerWeek', Number(event.target.value))} /></label>
              <label>Minutos por sesion<input required min="0" max="300" step="5" type="number" value={draft.exerciseMinutes} onChange={(event) => update('exerciseMinutes', Number(event.target.value))} /><span>min</span></label>
              <label>Tiempo para cocinar<select value={draft.mealPrepMinutes} onChange={(event) => update('mealPrepMinutes', Number(event.target.value))}><option value="15">Hasta 15 minutos</option><option value="30">Hasta 30 minutos</option><option value="45">Hasta 45 minutos</option><option value="60">Una hora o mas</option></select></label>
            </div>
          </section>

          <section className="goal-section">
            <div className="goal-section-title"><span><Utensils size={19} /></span><div><p className="eyebrow">Preferencias</p><h2>Lo que debe respetar tu agente</h2></div></div>
            <div className="goal-fields">
              <label>Tipo de alimentacion<select value={draft.dietaryPreference} onChange={(event) => update('dietaryPreference', event.target.value)}><option>Sin preferencia</option><option>Vegetariana</option><option>Vegana</option><option>Sin gluten</option><option>Baja en lactosa</option></select></label>
              <label>Alergias o intolerancias<input value={draft.allergies} onChange={(event) => update('allergies', event.target.value)} placeholder="Ej. mani, lactosa" /></label>
              <label className="wide-field">Alimentos que no te gustan<input value={draft.dislikes} onChange={(event) => update('dislikes', event.target.value)} placeholder="Ej. brocoli" /></label>
            </div>
          </section>
        </div>

        <aside className="goal-result">
          <span className="result-icon"><Target size={23} /></span>
          <p className="eyebrow">Estimacion diaria</p>
          <h2>{targets.calorieMin.toLocaleString('es-UY')}-{targets.calorieMax.toLocaleString('es-UY')} kcal</h2>
          <p className="result-copy">Calculado con tus datos, movimiento, ejercicio y objetivo.</p>
          <div className="result-macros"><div><strong>{targets.proteinGrams} g</strong><small>Proteina</small></div><div><strong>{targets.carbsGrams} g</strong><small>Carbohidratos</small></div><div><strong>{targets.fatGrams} g</strong><small>Grasas</small></div></div>
          <div className="goal-progress"><span><small>Actual</small><strong>{draft.currentWeightKg} kg</strong></span><div><span style={{ width: `${Math.min(100, Math.max(8, 100 - Math.abs(draft.currentWeightKg - draft.goalWeightKg) * 8))}%` }} /></div><span><small>Objetivo</small><strong>{draft.goalWeightKg} kg</strong></span></div>
          <div className="safety-box"><AlertTriangle size={18} /><p>Es una estimacion general para bienestar. Embarazo, enfermedades, alergias graves o metas clinicas requieren evaluacion profesional.</p></div>
          <button className="primary-button save-goals" disabled={saving} type="submit">{saving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Guardar y actualizar mi plan</button>
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
  return <button className="meal-card" onClick={open} type="button"><span className={`meal-visual ${visual}`} aria-hidden="true">{index % 3 === 0 ? <Utensils size={27} /> : index % 3 === 1 ? <ChefHat size={27} /> : <Leaf size={27} />}</span><span className="meal-copy"><span className="meal-tag">{recipe.priority}</span><strong>{recipe.name}</strong><small><Clock3 size={14} /> {recipe.prepMinutes} min <span /> {recipe.calories} kcal <span /> {recipe.protein} g proteina</small></span><ChevronRight size={19} /></button>;
}

function ExpiryRow({ item, open }: { item: PantryItem; open: () => void }) {
  const days = daysUntil(item.bestBefore);
  return <button className="expiry-strip" onClick={open} type="button"><span className="expiry-icon"><AlertTriangle size={21} /></span><div><strong>{item.name}</strong><p>{days <= 0 ? 'Revisa su estado hoy.' : `Conviene usarlo en los proximos ${days} dias.`}</p></div><span className="stock-pill">{item.quantity} {item.unit}</span><ChevronRight size={18} /></button>;
}

function PantryView({ state, setState, addItem, openReceipt, notify }: { state: AppState; setState: (state: AppState) => void; addItem: () => void; openReceipt: () => void; notify: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const categories = ['Todos', ...Array.from(new Set(state.pantry.map((item) => item.category)))];
  const filtered = state.pantry.filter((item) => (category === 'Todos' || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase()));

  const remove = async (item: PantryItem) => {
    try {
      const next = await readJson<AppState>(await fetch(`/api/pantry?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' }));
      setState(next); notify(`${item.name} fue eliminado.`);
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo eliminar.'); }
  };

  return (
    <section className="page-view">
      <div className="view-toolbar">
        <div className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar alimento" /></div>
        <div className="toolbar-actions"><button className="secondary-button" onClick={openReceipt} type="button"><ScanLine size={17} /> Cargar ticket</button><button className="primary-button" onClick={addItem} type="button"><Plus size={17} /> Agregar</button></div>
      </div>
      <div className="filter-tabs">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div>
      <div className="inventory-band"><div><span>{state.pantry.length}</span><small>alimentos registrados</small></div><div><span>{state.pantry.filter((item) => item.status === 'soon').length}</span><small>para usar pronto</small></div><div><span>{state.pantry.filter((item) => item.status === 'low').length}</span><small>con poco stock</small></div><p><Leaf size={17} /> Primero en entrar, primero en salir, siempre dentro de la zona segura de cada alimento.</p></div>
      <div className="pantry-table" role="table">
        <div className="pantry-table-head" role="row"><span>Alimento</span><span>Cantidad</span><span>Compra</span><span>Prioridad</span><span /></div>
        {filtered.map((item) => <div className="pantry-table-row" role="row" key={item.id}><span className="pantry-name"><span className={`food-dot ${item.status}`} /><span><strong>{item.name}</strong><small>{item.category} · {item.source}</small></span></span><span>{item.quantity} {item.unit}</span><span>{shortDate.format(new Date(item.purchasedAt))}</span><span><StatusBadge item={item} /></span><span><button className="row-icon-button" title={`Eliminar ${item.name}`} onClick={() => remove(item)} type="button"><Trash2 size={17} /></button></span></div>)}
        {!filtered.length && <EmptyLine text="No encontre alimentos con ese filtro." />}
      </div>
    </section>
  );
}

function StatusBadge({ item }: { item: PantryItem }) {
  const days = daysUntil(item.bestBefore);
  const kind = item.status === 'low' ? 'low' : days <= 3 ? 'soon' : 'ok';
  const label = kind === 'low' ? 'Poco stock' : kind === 'soon' ? `Usar en ${Math.max(days, 0)} dias` : 'En orden';
  return <span className={`status-badge ${kind}`}>{label}</span>;
}

function RecipesView({ state, openRecipe }: { state: AppState; openRecipe: (recipe: Recipe) => void }) {
  const [filter, setFilter] = useState('Todas');
  const filters = ['Todas', 'Menos de 20 min', 'Alta proteina', 'Economica'];
  const recipes = state.recipes.filter((recipe) => filter === 'Todas' || (filter === 'Menos de 20 min' && recipe.prepMinutes <= 20) || (filter === 'Alta proteina' && recipe.protein >= 40) || (filter === 'Economica' && recipe.priority === 'Economica'));
  return <section className="page-view"><div className="recipe-filter-row">{filters.map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item} type="button">{item}</button>)}</div><div className="recipe-grid">{recipes.map((recipe, index) => <button className="recipe-card" key={recipe.id} onClick={() => openRecipe(recipe)} type="button"><div className={`recipe-art tone-${index % 4}`}><span><ChefHat size={30} /></span><small>{recipe.prepMinutes} min</small></div><div className="recipe-card-copy"><span className="meal-tag">{recipe.priority}</span><h2>{recipe.name}</h2><p>{recipe.description}</p><div><span><strong>{recipe.calories}</strong> kcal</span><span><strong>{recipe.protein} g</strong> proteina</span><ChevronRight size={18} /></div></div></button>)}</div><p className="nutrition-disclaimer">Informacion general para bienestar. No reemplaza el consejo de un profesional de la salud.</p></section>;
}

function ShoppingView({ state, options, updateTransport }: { state: AppState; options: ShoppingOption[]; updateTransport: (mode: TransportMode) => void }) {
  const best = options[0];
  return <section className="page-view shopping-view"><div className="shopping-top"><div><p className="eyebrow">Desde Maldonado</p><h2>Compra semanal estimada</h2><p>Comparo precios de prueba y sumo el costo del viaje de ida y vuelta.</p></div><TransportSwitch current={state.profile.transportMode} update={updateTransport} /></div>{best && <div className="best-option-band"><span className="store-logo eldorado">{best.supermarket === 'El Dorado' ? 'ED' : best.supermarket[0]}</span><div><small>Mejor costo efectivo</small><h2>{best.supermarket}</h2><p><MapPin size={14} /> {best.distanceKm.toLocaleString('es-UY')} km · {best.travelMinutes} min</p></div><div><small>Canasta</small><strong>{money.format(best.basketPrice)}</strong></div><div><small>Traslado</small><strong>{money.format(best.travelCost)}</strong></div><div className="effective-price"><small>Total efectivo</small><strong>{money.format(best.effectiveCost)}</strong><span>Ahorras {money.format(best.savings)}</span></div></div>}
      <div className="comparison-list"><div className="comparison-head"><span>Supermercado</span><span>Canasta</span><span>Traslado</span><span>Total efectivo</span></div>{options.map((option, index) => <div className={`comparison-row ${index === 0 ? 'winner' : ''}`} key={option.supermarket}><span><span className={`mini-store store-${index}`}>{option.supermarket === 'El Dorado' ? 'ED' : option.supermarket[0]}</span><span><strong>{option.supermarket}</strong><small>{option.distanceKm.toLocaleString('es-UY')} km · {option.travelMinutes} min</small></span></span><span>{money.format(option.basketPrice)}</span><span>{option.travelCost ? money.format(option.travelCost) : 'Sin costo'}</span><span><strong>{money.format(option.effectiveCost)}</strong>{index === 0 && <small>Mejor opcion</small>}</span></div>)}</div>
      <div className="offer-section"><SectionHeading eyebrow="Ofertas detectadas" title="Productos de tu lista" /><div className="offer-grid">{best?.items.map((offer) => <div className="offer-item" key={offer.id}><span className="offer-icon"><ShoppingBasket size={19} /></span><div><strong>{offer.product}</strong><small>{offer.supermarket} · hasta {shortDate.format(new Date(offer.validUntil))}</small></div><span><del>{money.format(offer.regularPrice)}</del><strong>{money.format(offer.price)}</strong></span></div>)}</div></div>
      <p className="data-disclaimer"><AlertTriangle size={15} /> Precios ficticios para demostrar la comparacion. Antes de publicar se reemplazan por catalogos vigentes o una fuente autorizada.</p>
    </section>;
}

function TransportSwitch({ current, update, compact = false }: { current: TransportMode; update: (mode: TransportMode) => void; compact?: boolean }) {
  const items: Array<{ key: TransportMode; label: string; icon: typeof Footprints }> = [
    { key: 'walking', label: 'Caminando', icon: Footprints }, { key: 'bicycle', label: 'Bicicleta', icon: Bike }, { key: 'car', label: 'Auto', icon: CarFront }, { key: 'motorcycle', label: 'Moto', icon: Gauge },
  ];
  return <div className={`transport-switch ${compact ? 'compact-switch' : 'wide-switch'}`} aria-label="Medio de transporte">{items.map((item) => { const Icon = item.icon; return <button className={current === item.key ? 'selected' : ''} key={item.key} onClick={() => update(item.key)} title={item.label} type="button"><Icon size={17} /><span>{item.label}</span></button>; })}</div>;
}

function StoreFeatured({ option, mode, open }: { option: ShoppingOption; mode: TransportMode; open: () => void }) {
  return <div className="store-card featured"><div className="store-topline"><span className="store-logo eldorado">ED</span><span><strong>{option.supermarket}</strong><small><MapPin size={13} /> {option.distanceKm.toLocaleString('es-UY')} km · {option.travelMinutes} min</small></span><span className="best-badge">Mejor opcion</span></div><div className="price-row"><span><small>Canasta estimada</small><strong>{money.format(option.basketPrice)}</strong></span><span><small>Ahorro</small><strong className="saving">{money.format(option.savings)}</strong></span></div><p className="store-note">Costo de traslado en {transportConfig[mode].label.toLowerCase()}: {option.travelCost ? money.format(option.travelCost) : 'sin costo'}.</p><button onClick={open} type="button">Ver lista y ofertas <ChevronRight size={16} /></button></div>;
}

function StoreSecondary({ option }: { option: ShoppingOption }) {
  return <div className="store-card secondary"><div className="store-topline"><span className="store-logo disco">{option.supermarket[0]}</span><span><strong>{option.supermarket}</strong><small><MapPin size={13} /> {option.distanceKm.toLocaleString('es-UY')} km · {option.travelMinutes} min</small></span><strong className="secondary-price">{money.format(option.effectiveCost)}</strong></div></div>;
}

function AddItemModal({ close, setState, notify }: { close: () => void; setState: (state: AppState) => void; notify: (text: string) => void }) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    const bestBefore = new Date(String(form.get('bestBefore')) + 'T12:00:00').toISOString();
    try {
      const next = await readJson<AppState>(await fetch('/api/pantry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), category: form.get('category'), quantity: Number(form.get('quantity')), unit: form.get('unit'), source: form.get('source'), bestBefore }) }));
      setState(next); close(); notify('Alimento agregado a tu despensa.');
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo guardar.'); } finally { setSaving(false); }
  };
  return <ModalShell title="Agregar alimento" close={close}><form className="form-grid" onSubmit={submit}><label className="full">Nombre<input name="name" required placeholder="Ej. Yogur natural" /></label><label>Categoria<select name="category" defaultValue="Proteina"><option>Proteina</option><option>Carbohidrato</option><option>Verdura</option><option>Fruta</option><option>Grasa</option><option>Otro</option></select></label><label>Supermercado<input name="source" defaultValue="Ta-Ta" /></label><label>Cantidad<input name="quantity" type="number" min="0.1" step="0.1" required defaultValue="1" /></label><label>Unidad<select name="unit"><option>unidades</option><option>g</option><option>kg</option><option>ml</option><option>l</option></select></label><label className="full">Consumir preferentemente antes de<input name="bestBefore" required type="date" defaultValue={defaultBestBefore} /></label><div className="modal-actions full"><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Agregar</button></div></form></ModalShell>;
}

function ReceiptModal({ close, setState, notify }: { close: () => void; setState: (state: AppState) => void; notify: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async () => {
    if (!file) return; setUploading(true);
    const form = new FormData(); form.append('receipt', file);
    try {
      const result = await readJson<{ state: AppState; message: string }>(await fetch('/api/receipt', { method: 'POST', body: form }));
      setState(result.state); close(); notify(result.message);
    } catch (error) { notify(error instanceof Error ? error.message : 'No pude procesar el ticket.'); } finally { setUploading(false); }
  };
  return <ModalShell title="Cargar ticket" close={close}><div className="receipt-panel"><input ref={inputRef} hidden type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button className={`drop-zone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} type="button">{file ? <><Check size={27} /><strong>{file.name}</strong><span>Listo para procesar</span></> : <><Camera size={28} /><strong>Elegir foto del ticket</strong><span>JPG, PNG o PDF · maximo 8 MB</span></>}</button><div className="demo-receipt"><span><Sparkles size={17} /></span><p><strong>Compra de prueba preparada</strong>Pollo, arroz, 12 huevos, 3 paltas, 1 kg de tomate y aceite de oliva de Ta-Ta.</p></div><div className="modal-actions"><button className="secondary-button" onClick={close} type="button">Cancelar</button><button className="primary-button" disabled={!file || uploading} onClick={upload} type="button">{uploading ? <LoaderCircle className="spin" size={17} /> : <ScanLine size={17} />} Procesar ticket</button></div></div></ModalShell>;
}

function RecipeModal({ recipe, close, cook, busy }: { recipe: Recipe; close: () => void; cook: (recipe: Recipe) => void; busy: boolean }) {
  return <ModalShell title={recipe.name} close={close} wide><div className="recipe-detail"><div className="recipe-detail-summary"><span className="meal-tag">{recipe.priority}</span><p>{recipe.description}</p><div><span><Clock3 size={17} /><strong>{recipe.prepMinutes}</strong><small>minutos</small></span><span><Gauge size={17} /><strong>{recipe.calories}</strong><small>kcal</small></span><span><Utensils size={17} /><strong>{recipe.protein} g</strong><small>proteina</small></span></div></div><div className="recipe-columns"><div><h3>De tu despensa</h3><ul className="ingredient-list">{recipe.ingredients.map((item) => <li key={item.label}><Check size={15} /><span>{item.label}</span><strong>{item.quantity} {item.unit}</strong></li>)}</ul></div><div><h3>Preparacion</h3><ol className="step-list">{recipe.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></div></div><div className="modal-actions"><button className="secondary-button" onClick={close} type="button">Volver</button><button className="primary-button" disabled={busy} onClick={() => cook(recipe)} type="button">{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Marcar como cocinada</button></div></div></ModalShell>;
}

function ChatDrawer({ messages, input, setInput, send, close, busy }: { messages: Array<{ role: 'agent' | 'user'; text: string }>; input: string; setInput: (value: string) => void; send: (value?: string) => void; close: () => void; busy: boolean }) {
  const quick = ['¿Que uso primero?', '¿Donde conviene comprar?', 'Necesito algo rapido'];
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><aside className="chat-drawer"><header><div><span><Leaf size={19} /></span><div><strong>Agente nutrIAhorro</strong><small>Activo con memoria de tu despensa</small></div></div><button className="row-icon-button" onClick={close} title="Cerrar" type="button"><X size={20} /></button></header><div className="chat-body">{messages.map((item, index) => <div className={`chat-message ${item.role}`} key={`${item.role}-${index}`}>{item.text}</div>)}{busy && <div className="chat-message agent typing"><span /><span /><span /></div>}</div><div className="quick-prompts">{quick.map((item) => <button key={item} onClick={() => send(item)} type="button">{item}</button>)}</div><form className="chat-form" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Preguntale algo" /><button disabled={!input.trim() || busy} title="Enviar" type="submit"><Send size={18} /></button></form></aside></div>;
}

function ModalShell({ title, close, children, wide = false }: { title: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="row-icon-button" onClick={close} title="Cerrar" type="button"><X size={20} /></button></header>{children}</section></div>;
}

function MobileNav({ active, navigate }: { active: ViewName; navigate: (view: ViewName) => void }) {
  return <nav className="mobile-nav" aria-label="Navegacion movil">{navItems.map((item) => { const Icon = item.icon; return <button className={active === item.label ? 'active' : ''} key={item.label} onClick={() => navigate(item.label)} type="button"><Icon size={20} /><span>{item.label}</span></button>; })}</nav>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className="empty-line"><PackageSearch size={20} /><span>{text}</span></div>;
}
