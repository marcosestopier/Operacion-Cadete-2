/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, CSSProperties, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  ChevronRight, 
  Calendar, 
  ClipboardCheck, 
  Anchor, 
  Landmark, 
  Calculator, 
  Timer, 
  BookOpen, 
  Gamepad2, 
  User, 
  LogOut, 
  Trash2, 
  Search,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trophy,
  Stethoscope,
  PlaneTakeoff,
  GraduationCap,
  Brain,
  Dumbbell,
  FileText,
  Award,
  Coffee,
  Construction,
  LibraryBig,
  MonitorPlay
} from 'lucide-react';

// --- Firebase ---
import { auth, db, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  increment,
  deleteDoc
} from 'firebase/firestore';

// --- Types ---
type View = 'home' | 'calendario' | 'herramientas' | 'simulador' | 'perfil' | 'libros' | 'imc' | 'pomodoro' | 'requisitos' | 'simulador-fisico' | 'historial' | 'checklist' | 'convocatoria' | 'simulador-demo' | 'registro' | 'motivos-exclusion' | 'compras';
type Theme = 'light' | 'dark' | 'system';

interface UserData {
  uid: string;
  name: string;
  email: string;
  state: string;
  institution: string[];
  school: string;
  gender: 'H' | 'M';
  isRegistered: boolean;
  createdAt?: any;
}

interface DemoAttempt {
  date: string;
  score: number;
}

interface HistoryEntry {
  id: string;
  date: string;
  type: 'EXAMEN' | 'FISICO';
  title: string;
  institution: string;
  score: string;
  numericScore: number;
  isPass: boolean;
  details: string;
}
type Institution = 'SEDENA' | 'SEMAR';

// --- Components ---

const Icon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: CSSProperties }) => {
  return <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>;
};

const Header = ({ title, showMenu = false }: { title: string, showMenu?: boolean }) => (
  <header className="fixed top-0 left-0 w-full z-50 flex justify-center items-center px-6 h-16 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20">
    <div className="text-xl font-black text-primary-ink tracking-tighter uppercase">
      {title}
    </div>
  </header>
);

const FloatingNav = ({ currentView, setView, isRegistered }: { currentView: View, setView: (v: View) => void, isRegistered: boolean }) => {
  const navItems = [
    { id: 'home', label: 'Inicio', icon: 'home' },
    { id: 'libros', label: 'Libros', icon: 'library_books' },
    { id: 'simulador', label: 'Simulador', icon: 'sports_esports' },
    { id: 'perfil', label: 'Perfil', icon: 'account_circle' },
  ];

  const handleNav = (id: View) => {
    if (id !== 'home' && !isRegistered) {
      setView('registro');
    } else {
      setView(id);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <div className="bg-surface-container-lowest/60 backdrop-blur-xl border border-outline-variant/20 shadow-2xl rounded-full p-2 flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = currentView === item.id || (item.id === 'home' && (currentView === 'imc' || currentView === 'pomodoro' || currentView === 'herramientas'));
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id as View)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-full transition-all duration-300 gap-1 flex-1 ${
                isActive 
                  ? 'bg-primary-ink/15 text-primary-ink' 
                  : 'text-outline hover:bg-primary-ink/5'
              }`}
            >
              <Icon name={item.icon} className={`text-xl ${isActive ? 'font-variation-fill' : 'font-variation-empty'}`} />
              <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Views ---

// --- Constants & Config ---
const APK_DOWNLOAD_URL = "https://download937.mediafire.com/m0xtmninduognIovsuosOXZ6OoPlafFlbYX6sVJvnEOcXjqoyKjD93ml1DS0Mcv0tfDfGs72paHw7EkPF23tDyCCWnfPdw7HdCXieA1K3VRBD3yjxhTXvGbzHrnE3X1_zxtwykfo2MmjmMuxoGgm00QaS3ilVJl4AjkT8O0ObOILGw/0utvhswrx547rnh/operacion-cadete.apk"; // Reemplaza esto con tu enlace externo

const HomeView = ({ setView, setInstitution, user, userData }: { setView: (v: View) => void, setInstitution: (i: Institution) => void, user: FirebaseUser | null, userData: UserData | null }) => {
  const [stats, setStats] = useState<{ total: number, state: number, institution: number, gender: number, school: number } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsDoc = await getDoc(doc(db, 'metadata', 'stats'));
        const statsData = statsDoc.exists() ? statsDoc.data() : null;
        
        if (statsData) {
          setStats({
            total: statsData.total || 0,
            state: userData ? (statsData.states?.[userData.state] || 0) : 0,
            institution: userData ? Math.max(...userData.institution.map(i => statsData.institutions?.[i] || 0)) : 0,
            gender: userData ? (statsData.genders?.[userData.gender] || 0) : 0,
            school: userData ? (statsData.schools?.[userData.school] || 0) : 0
          });
        } else {
          setStats({
            total: 0,
            state: 0,
            institution: 0,
            gender: 0,
            school: 0
          });
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
      }
    };
    fetchStats();
  }, [user, userData]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-24 pb-32 px-6 max-w-2xl mx-auto"
    >
      <section className="mb-10 bg-primary-ink p-6 border-l-4 border-primary transition-colors">
        <h2 className="text-white dark:text-primary-ink text-xl font-black tracking-tight uppercase mb-1">¡Hola, Aspirante!</h2>
        <p className="text-white/60 dark:text-primary-ink/60 text-[10px] font-bold tracking-[0.2em] uppercase">Tu camino hacia el éxito comienza aquí.</p>
      </section>

      {/* Beta App Banner */}
      <section className="mb-12">
        <a 
          href={APK_DOWNLOAD_URL} 
          target="_blank"
          rel="noopener noreferrer"
          className="relative overflow-hidden group flex items-center p-6 bg-gradient-to-br from-[#4285F4] to-[#34A853] rounded-3xl border border-white/10 shadow-lg hover:shadow-xl transition-all duration-500"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-colors" />
          <div className="flex items-center gap-5 relative z-10 w-full">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Icon name="shop" className="text-3xl text-white font-variation-fill" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-yellow-400 text-[8px] font-black uppercase text-black rounded-full tracking-widest">BETA</span>
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Próximamente en Play Store</span>
              </div>
              <h3 className="text-lg font-black text-white leading-tight uppercase tracking-tight">¡Prueba nuestra app en fase Beta!</h3>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1 group-hover:translate-x-1 transition-transform">Haz clic para descargar el APK</p>
            </div>
            <div className="hidden sm:flex w-10 h-10 bg-white/10 rounded-full items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
              <Icon name="download" className="text-white text-xl" />
            </div>
          </div>
        </a>
      </section>

      <section className="mb-12">
        <h2 className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-6">Convocatorias</h2>
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => { setInstitution('SEDENA'); setView('convocatoria'); }}
            className="aspect-square border border-outline-variant/30 flex flex-col items-center justify-center p-6 bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group"
          >
            <div className="mb-4 group-hover:scale-110 transition-transform">
              <Icon name="account_balance" className="text-4xl text-sedena" />
            </div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-sedena">SEDENA</h3>
          </div>
          <div 
            onClick={() => { setInstitution('SEMAR'); setView('convocatoria'); }}
            className="aspect-square border border-outline-variant/30 flex flex-col items-center justify-center p-6 bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group"
          >
            <div className="mb-4 group-hover:scale-110 transition-transform">
              <Icon name="anchor" className="text-4xl text-semar" />
            </div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-semar">SEMAR</h3>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-col">
          <button 
            onClick={() => setView('calendario')}
            className="flex items-center py-6 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors px-2 group text-left w-full"
          >
            <Icon name="calendar_today" className="text-primary mr-4" />
            <span className="text-sm font-medium tracking-tight text-on-surface group-hover:translate-x-1 transition-transform uppercase">Calendario de admisión</span>
          </button>
          <button 
            onClick={() => setView('requisitos')}
            className="flex items-center py-6 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors px-2 group text-left w-full"
          >
            <Icon name="assignment_turned_in" className="text-primary mr-4" />
            <span className="text-sm font-medium tracking-tight text-on-surface group-hover:translate-x-1 transition-transform uppercase">Requisitos</span>
          </button>
          <button 
            onClick={() => setView('checklist')}
            className="flex items-center py-6 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors px-2 group text-left w-full"
          >
            <Icon name="fact_check" className="text-primary mr-4" />
            <span className="text-sm font-medium tracking-tight text-on-surface group-hover:translate-x-1 transition-transform uppercase">Checklist de documentación</span>
          </button>
          <button 
            onClick={() => setView('motivos-exclusion')}
            className="flex items-center py-6 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors px-2 group text-left w-full"
          >
            <Icon name="report_problem" className="text-red-600 mr-4" />
            <span className="text-sm font-medium tracking-tight text-on-surface group-hover:translate-x-1 transition-transform uppercase">Motivos para no entrar</span>
          </button>
          <button 
            onClick={() => setView('compras')}
            className="flex items-center py-6 border-b border-outline-variant/30 hover:bg-surface-container-low transition-colors px-2 group text-left w-full"
          >
            <Icon name="shopping_bag" className="text-primary mr-4" />
            <span className="text-sm font-medium tracking-tight text-on-surface group-hover:translate-x-1 transition-transform uppercase">Compra tus artículos para el examen</span>
          </button>
        </div>
      </section>

      {stats && (
        <section className="mt-16 pt-12 border-t border-outline-variant/20">
          <div className="mb-8">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-primary-ink uppercase mb-2">Análisis de Competencia</h3>
            <p className="text-[11px] font-bold text-outline leading-relaxed uppercase">
              Según nuestra app y la cantidad de usuarios registrados, aquí tienes contra cuántos más compites:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-outline-variant/20 border border-outline-variant/20">
            <div className="bg-surface-container-lowest p-5 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-primary-ink">{stats.total}</span>
              <span className="text-[8px] font-bold text-outline uppercase tracking-widest mt-1">Total Usuarios</span>
            </div>
            <div className="bg-surface-container-lowest p-5 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-primary">{stats.state}</span>
              <span className="text-[8px] font-bold text-outline uppercase tracking-widest mt-1">En tu Estado</span>
            </div>
            <div className="bg-surface-container-lowest p-5 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-primary">{stats.institution}</span>
              <span className="text-[8px] font-bold text-outline uppercase tracking-widest mt-1">Misma Institución</span>
            </div>
            <div className="bg-surface-container-lowest p-5 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-primary">{stats.gender}</span>
              <span className="text-[8px] font-bold text-outline uppercase tracking-widest mt-1">Mismo Género</span>
            </div>
            {userData?.school && (
              <div className="bg-surface-container-lowest p-5 flex flex-col items-center justify-center text-center col-span-2 border-t border-outline-variant/20">
                <span className="text-2xl font-black text-primary">{stats.school}</span>
                <span className="text-[8px] font-bold text-outline uppercase tracking-widest mt-1">Misma Escuela ({userData.school})</span>
              </div>
            )}
          </div>
          
          {!user && (
            <p className="mt-4 text-[9px] text-outline italic text-center uppercase font-bold tracking-widest">
              * Regístrate para ver estadísticas personalizadas de tu competencia.
            </p>
          )}
        </section>
      )}
    </motion.div>
  );
};

const CalendarioView = ({ setView, institution, setInstitution }: { setView: (v: View) => void, institution: Institution, setInstitution: (i: Institution) => void }) => {
  const events = {
    SEDENA: [
      { title: 'Registro en línea', date: '15 Dic 2025 - 18 Feb 2026', status: 'concluido', icon: 'app_registration', color: '#94a3b8' },
      { title: 'Somatometría y Validación', date: '16 Dic 2025 - 05 Mar 2026', status: 'pasado', icon: 'straighten', color: '#94a3b8' },
      { title: 'Examen de capacidad física', date: '17 Dic 2025 - 06 Mar 2026', status: 'pasado', icon: 'fitness_center', color: '#94a3b8' },
      { title: 'Resultados capacidad física', date: '23 Mar - 03 Abr 2026', status: 'en curso', icon: 'military_tech', color: '#facc15' },
      { title: 'Exámenes Cultural e Inglés', date: '06 Abr - 29 Abr 2026', status: 'futuro', icon: 'school', color: '#facc15' },
      { title: 'Psicológico', date: '06 Abr - 29 Abr 2026', status: 'futuro', icon: 'psychology', color: '#facc15' },
      { title: 'Resultados Cultural y Psic.', date: '18 May - 27 May 2026', status: 'futuro', icon: 'assignment_turned_in', color: '#22c55e' },
      { title: 'Examen médico Integral', date: '30 May - 10 Jun 2026', status: 'futuro', icon: 'medical_services', color: '#22c55e' },
      { title: 'Examen aeromédico', date: '30 May - 10 Jun 2026', status: 'futuro', icon: 'flight_takeoff', color: '#22c55e' },
      { title: 'Resultados finales', date: '06 Jul - 24 Jul 2026', status: 'futuro', icon: 'emoji_events', color: '#22c55e' },
      { title: 'Entrega de documentación', date: '25 Jul - 21 Ago 2026', status: 'futuro', icon: 'description', color: '#22c55e' },
      { title: 'Ingreso a los planteles', date: '01 SEPTIEMBRE 2026', status: 'final', icon: 'workspace_premium', color: '#22c55e' },
    ],
    SEMAR: [
      { title: 'Registro en línea', date: '15 Dic 2025 - 09 Mar 2026', status: 'concluido', icon: 'check_circle', color: '#94a3b8' },
      { title: 'Examen CENEVAL (Exani II)', date: 'Sábado 18 de Abril 2026', status: 'en curso', icon: 'event_upcoming', color: '#FACC15' },
      { title: 'Resultados Fase Preliminar', date: '22 de Mayo 2026', status: 'futuro', icon: 'assignment_turned_in', color: '#22C55E' },
      { title: 'Fase Definitiva: Ingenierías', date: '14 - 20 de Junio 2026', status: 'futuro', icon: 'engineering', color: '#22C55E' },
      { title: 'Fase Definitiva: Sanidad', date: '21 - 27 de Junio 2026', status: 'futuro', icon: 'medical_services', color: '#22C55E' },
      { title: 'Fase Definitiva: Técnico Prof.', date: '28 Jun - 04 Jul 2026', status: 'futuro', icon: 'work', color: '#22C55E' },
      { title: 'Publicación de Resultados Finales', date: 'Martes 21 de Julio 2026', status: 'futuro', icon: 'emoji_events', color: '#22C55E' },
      { title: 'Incorporación de Nuevo Ingreso', date: 'Lunes 03 de Agosto 2026', status: 'final', icon: 'military_tech', color: '#22C55E' },
    ]
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-12 px-6 max-w-2xl mx-auto"
    >
      <div className="w-full text-center mb-8">
        <h2 className="text-primary-ink font-black text-4xl tracking-tighter uppercase mb-2">Calendario</h2>
        <div className="h-1 w-12 bg-primary mx-auto"></div>
      </div>

      <div className="flex w-full mb-8 border border-outline-variant/20 p-1 bg-surface-container-low">
        <button 
          onClick={() => setInstitution('SEDENA')}
          className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200 ${institution === 'SEDENA' ? 'bg-primary-ink text-surface-container-lowest' : 'text-outline hover:bg-surface-container'}`}
        >
          SEDENA
        </button>
        <button 
          onClick={() => setInstitution('SEMAR')}
          className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200 ${institution === 'SEMAR' ? 'bg-primary-ink text-surface-container-lowest' : 'text-outline hover:bg-surface-container'}`}
        >
          SEMAR
        </button>
      </div>

      <button 
        onClick={() => setView('convocatoria')}
        className="w-full mb-8 bg-primary-ink text-surface-container-lowest p-4 flex items-center justify-between group hover:bg-primary transition-colors"
      >
        <div className="flex items-center gap-4">
          <Icon name="picture_as_pdf" className="text-2xl" />
          <div className="text-left">
            <p className="text-[10px] font-bold tracking-widest uppercase opacity-60">Documento Oficial</p>
            <p className="text-xs font-black uppercase tracking-tight">Ver Convocatoria PDF</p>
          </div>
        </div>
        <Icon name="open_in_new" className="group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="flex flex-col gap-4">
        {events[institution].map((event, i) => (
          <div 
            key={i} 
            className={`bg-surface-container-lowest border-l-8 shadow-sm p-4 flex items-center gap-4 transition-opacity ${event.status === 'concluido' || event.status === 'pasado' ? 'opacity-60 grayscale' : ''}`}
            style={{ borderLeftColor: event.color }}
          >
            <Icon name={event.icon} className="text-3xl opacity-50" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-0.5">
                <h3 className="text-sm font-bold tracking-tight text-primary-ink uppercase">{event.title}</h3>
                {event.status === 'concluido' && (
                  <span className="text-[10px] font-black uppercase tracking-widest border border-outline-variant/20 px-2 py-0.5">Concluido</span>
                )}
                {event.status === 'en curso' && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-400 text-white px-2 py-0.5">En curso</span>
                )}
              </div>
              <p className="text-[10px] font-medium text-outline tracking-wide">{event.date}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const HerramientasView = ({ setView }: { setView: (v: View) => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="pt-24 pb-12 px-6 max-w-2xl mx-auto"
  >
    <div className="mb-12">
      <h2 className="text-4xl font-extrabold tracking-tighter text-primary-ink uppercase leading-none">Herramientas</h2>
      <div className="h-1 w-12 bg-primary mt-4"></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <button 
        onClick={() => setView('imc')}
        className="group flex flex-col items-center justify-center border border-outline-variant/30 p-8 transition-colors hover:bg-surface-container-low aspect-square"
      >
        <Icon name="straighten" className="text-primary text-5xl mb-4" />
        <h2 className="text-xs font-bold tracking-tight text-primary-ink text-center uppercase">Calculadora de IMC</h2>
      </button>
      <button 
        onClick={() => setView('pomodoro')}
        className="group flex flex-col items-center justify-center border border-outline-variant/30 p-8 transition-colors hover:bg-surface-container-low aspect-square"
      >
        <Icon name="timer" className="text-primary text-5xl mb-4" />
        <h2 className="text-xs font-bold tracking-tight text-primary-ink text-center uppercase">Pomodoro Timer</h2>
      </button>
    </div>
  </motion.div>
);

const IMCView = () => {
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const p = parseFloat(peso);
    const a = parseFloat(altura) / 100;
    if (p && a) {
      setResult(parseFloat((p / (a * a)).toFixed(1)));
    }
  };

  const getCategory = (imc: number) => {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Peso Saludable';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-12 px-6 max-w-xl mx-auto"
    >
      <div className="mb-12">
        <h2 className="text-4xl font-extrabold tracking-tighter text-primary-ink uppercase leading-none">Calculadora de IMC</h2>
        <div className="h-1 w-12 bg-primary mt-4"></div>
      </div>
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative">
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-outline mb-2">Peso (kg)</label>
            <div className="flex items-center border-b border-outline-variant focus-within:border-primary transition-all duration-300">
              <Icon name="monitor_weight" className="text-outline-variant pr-3 text-lg" />
              <input 
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="w-full py-3 bg-transparent border-none focus:ring-0 text-xl font-medium tracking-tight placeholder:text-surface-container-highest" 
                placeholder="00.0" 
                type="number" 
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-outline mb-2">Altura (cm)</label>
            <div className="flex items-center border-b border-outline-variant focus-within:border-primary transition-all duration-300">
              <Icon name="straighten" className="text-outline-variant pr-3 text-lg" />
              <input 
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="w-full py-3 bg-transparent border-none focus:ring-0 text-xl font-medium tracking-tight placeholder:text-surface-container-highest" 
                placeholder="000" 
                type="number" 
              />
            </div>
          </div>
        </div>
        <button 
          onClick={calculate}
          className="w-full bg-primary-ink text-white py-5 px-8 font-bold text-sm tracking-[0.1em] uppercase hover:bg-primary transition-all duration-300 shadow-sm flex justify-between items-center group"
        >
          <span>Calcular</span>
          <Icon name="arrow_forward" className="group-hover:translate-x-1 transition-transform" />
        </button>
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 pt-8">
            <div className="bg-surface-container-lowest p-8 border border-outline-variant/20 md:col-span-1">
              <p className="text-[10px] font-bold tracking-widest text-outline uppercase mb-1">IMC</p>
              <span className="text-5xl font-black tracking-tighter text-primary-ink">{result}</span>
            </div>
            <div className="bg-primary-ink p-8 md:col-span-2 flex flex-col justify-end">
              <p className="text-[10px] font-bold tracking-widest text-surface-container-lowest/60 uppercase mb-1">Categoría</p>
              <span className="text-2xl font-bold tracking-tight text-surface-container-lowest uppercase">{getCategory(result)}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PomodoroView = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-12 px-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh]"
    >
      <div className="text-center mb-12">
        <span className="text-[12px] font-bold tracking-[0.2em] text-primary mb-4 block">POMODORO</span>
        <div className="text-[120px] md:text-[180px] font-black leading-none tracking-tighter text-primary-ink select-none">
          {formatTime(timeLeft)}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button 
          onClick={() => setIsActive(!isActive)}
          className="flex-1 bg-primary-ink text-surface-container-lowest py-5 px-8 text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 border border-primary-ink"
        >
          {isActive ? 'Pausar' : 'Iniciar'}
        </button>
        <button 
          onClick={() => { setIsActive(false); setTimeLeft(25 * 60); }}
          className="flex-none bg-transparent text-outline-variant py-5 px-6 text-[10px] font-bold uppercase tracking-[0.2em] border border-outline-variant hover:border-primary-ink hover:text-primary-ink transition-all active:scale-95"
        >
          Reiniciar
        </button>
      </div>
      <div className="mt-16 w-full border-t border-outline-variant/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-8 opacity-60">
        <div className="flex items-center gap-4">
          <Icon name="timer" className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">25 MIN TRABAJO</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon name="coffee" className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">5 MIN DESCANSO</span>
        </div>
        <div className="flex items-center gap-4">
          <Icon name="military_tech" className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">RANGO: RECLUTA</span>
        </div>
      </div>
    </motion.div>
  );
};

const RegistroView = ({ user, onRegister }: { user: FirebaseUser, onRegister: (data: UserData) => void }) => {
  const [formData, setFormData] = useState<UserData>({
    uid: user.uid,
    name: user.displayName || '',
    email: user.email || '',
    state: '',
    institution: [],
    school: '',
    gender: 'H',
    isRegistered: true
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.state && formData.institution.length > 0) {
      setLoading(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const finalData = {
          ...formData,
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, finalData);
        
        // Update global stats
        const statsRef = doc(db, 'metadata', 'stats');
        const statsUpdate: any = {
          total: increment(1),
          [`states.${formData.state}`]: increment(1),
          [`genders.${formData.gender}`]: increment(1)
        };
        
        formData.institution.forEach(inst => {
          statsUpdate[`institutions.${inst}`] = increment(1);
        });
        
        if (formData.school) {
          statsUpdate[`schools.${formData.school}`] = increment(1);
        }
        
        await setDoc(statsRef, statsUpdate, { merge: true });

        onRegister(finalData);
      } catch (error: any) {
        console.error("Error saving profile:", error);
        alert(`Error al guardar el perfil: ${error.message || 'Intenta de nuevo'}`);
      } finally {
        setLoading(false);
      }
    } else {
      alert('Por favor completa todos los campos obligatorios.');
    }
  };

  const toggleInst = (inst: string) => {
    setFormData(prev => ({
      ...prev,
      institution: prev.institution.includes(inst) 
        ? prev.institution.filter(i => i !== inst)
        : [...prev.institution, inst]
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-xl mx-auto"
    >
      <div className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-primary-ink uppercase leading-none">Registro</h2>
        <p className="text-xs text-outline mt-2 font-bold uppercase tracking-widest">Únete a la academia para acceder a todo el contenido.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Nombre Completo</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-4 bg-surface-container-low border border-outline-variant/30 focus:border-primary-ink outline-none text-sm font-bold uppercase tracking-tight"
              placeholder="EJ. JUAN PÉREZ"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Correo Electrónico</label>
            <input 
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full p-4 bg-surface-container-low border border-outline-variant/30 focus:border-primary-ink outline-none text-sm font-bold uppercase tracking-tight"
              placeholder="EMAIL@EJEMPLO.COM"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Estado</label>
              <input 
                required
                type="text"
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
                className="w-full p-4 bg-surface-container-low border border-outline-variant/30 focus:border-primary-ink outline-none text-sm font-bold uppercase tracking-tight"
                placeholder="EJ. CDMX"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Género</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as 'H' | 'M'})}
                className="w-full p-4 bg-surface-container-low border border-outline-variant/30 focus:border-primary-ink outline-none text-sm font-bold uppercase tracking-tight"
              >
                <option value="H">HOMBRE</option>
                <option value="M">MUJER</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Escuela / Plantel de interés</label>
            <input 
              type="text"
              value={formData.school}
              onChange={e => setFormData({...formData, school: e.target.value})}
              className="w-full p-4 bg-surface-container-low border border-outline-variant/30 focus:border-primary-ink outline-none text-sm font-bold uppercase tracking-tight"
              placeholder="EJ. HEROICO COLEGIO MILITAR"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Institución a la que aplicas</label>
            <div className="flex gap-4">
              {['SEDENA', 'SEMAR'].map(inst => (
                <button
                  key={inst}
                  type="button"
                  onClick={() => toggleInst(inst)}
                  className={`flex-1 py-4 border text-[10px] font-black tracking-widest uppercase transition-all ${
                    formData.institution.includes(inst)
                      ? 'bg-primary-ink text-surface-container-lowest border-primary-ink'
                      : 'bg-surface-container-low text-outline border-outline-variant/30'
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-primary-ink text-surface-container-lowest font-black text-sm uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-xl shadow-primary-ink/20 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Completar Registro'}
        </button>
      </form>
    </motion.div>
  );
};

const SimuladorDemoView = ({ setView, user }: { setView: (v: View) => void, user: FirebaseUser | null }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const questions = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    question: `Pregunta de prueba #${i + 1}: ¿Cuál es un requisito fundamental para el ingreso?`,
    options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
    correct: 0
  }));

  const handleNext = () => {
    if (selectedOption === questions[currentQuestion].correct) {
      setScore(prev => prev + 1);
    }
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
    } else {
      const finalScore = Math.round(((score + (selectedOption === questions[currentQuestion].correct ? 1 : 0)) / questions.length) * 100);
      saveAttempt(finalScore);
      setShowResult(true);
    }
  };

  const saveAttempt = async (finalScore: number) => {
    if (!user) return;

    const newAttempt = { date: new Date().toISOString(), score: finalScore };
    const localAttempts = JSON.parse(localStorage.getItem('cadete_demo_attempts') || '[]');
    localStorage.setItem('cadete_demo_attempts', JSON.stringify([...localAttempts, newAttempt]));
    
    try {
      const entry = {
        uid: user.uid,
        date: new Date().toISOString(),
        type: 'EXAMEN',
        title: 'Simulador DEMO (30 Preg)',
        institution: 'GENERAL',
        score: `${finalScore}%`,
        numericScore: finalScore,
        isPass: finalScore >= 60,
        details: 'Intento de simulador demo de 30 preguntas.'
      };
      await addDoc(collection(db, 'history'), entry);
    } catch (error) {
      console.error("Error saving history to Firebase:", error);
    }
  };

  if (showResult) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-24 pb-32 px-6 max-w-xl mx-auto text-center">
        <Icon name="emoji_events" className="text-7xl text-primary mb-6" />
        <h2 className="text-4xl font-black text-primary-ink uppercase mb-2">Resultado</h2>
        <p className="text-5xl font-black text-primary mb-8">{Math.round((score / questions.length) * 100)}%</p>
        <button 
          onClick={() => setView('simulador')}
          className="w-full py-5 bg-primary-ink text-surface-container-lowest font-bold uppercase tracking-widest"
        >
          Volver al Simulador
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-24 pb-32 px-6 max-w-2xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Pregunta {currentQuestion + 1} de {questions.length}</span>
          <h2 className="text-xl font-black text-primary-ink uppercase mt-1">Examen Demo</h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Aciertos</span>
          <p className="text-lg font-black text-primary-ink">{score}</p>
        </div>
      </div>

      <div className="bg-surface-container-low p-8 border border-outline-variant/20 mb-8">
        <p className="text-lg font-bold text-primary-ink leading-tight">{questions[currentQuestion].question}</p>
      </div>

      <div className="space-y-3">
        {questions[currentQuestion].options.map((opt, i) => (
          <button
            key={i}
            onClick={() => setSelectedOption(i)}
            className={`w-full p-5 text-left text-sm font-bold uppercase tracking-tight border transition-all ${
              selectedOption === i 
                ? 'bg-primary-ink text-surface-container-lowest border-primary-ink' 
                : 'bg-surface-container-lowest text-outline border-outline-variant/20 hover:bg-surface-container-low'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        disabled={selectedOption === null}
        onClick={handleNext}
        className="mt-12 w-full py-5 bg-primary-ink text-surface-container-lowest font-black text-sm uppercase tracking-widest disabled:opacity-30"
      >
        {currentQuestion === questions.length - 1 ? 'Finalizar' : 'Siguiente Pregunta'}
      </button>
    </motion.div>
  );
};

const SimuladorView = ({ setView }: { setView: (v: View) => void }) => {
  const [showPurchase, setShowPurchase] = useState(false);
  
  const checkDemoLimit = () => {
    const attempts = JSON.parse(localStorage.getItem('cadete_demo_attempts') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const todayAttempts = attempts.filter((a: any) => a.date.startsWith(today));
    
    if (todayAttempts.length >= 2) {
      alert('Has alcanzado el límite de 2 intentos demo por día. ¡Vuelve mañana!');
    } else {
      setView('simulador-demo');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-4xl mx-auto w-full flex flex-col items-center gap-8"
    >
      <div className="w-full text-center mb-4">
        <h2 className="text-primary-ink font-black text-4xl tracking-tighter uppercase mb-2">Simulador</h2>
        <div className="h-1 w-12 bg-primary-ink mx-auto"></div>
      </div>

      {!showPurchase ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div 
              onClick={checkDemoLimit}
              className="group bg-surface-container-lowest border border-outline-variant/30 p-8 flex flex-col items-center text-center transition-all duration-300 hover:bg-surface-container-low cursor-pointer"
            >
              <div className="mb-6 text-primary-ink transition-transform group-hover:scale-110 duration-300">
                <Icon name="clinical_notes" className="text-5xl" />
              </div>
              <h3 className="text-sm font-bold text-primary-ink uppercase tracking-widest mb-3 px-2">Simulador de examen DEMO</h3>
              <p className="text-xs text-outline leading-relaxed font-light">30 preguntas. Límite: 2 intentos por día.</p>
              <div className="mt-8 pt-4 w-full border-t border-outline-variant/10">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-ink/50">Acceso Libre</span>
              </div>
            </div>
            <div 
              onClick={() => setShowPurchase(true)}
              className="group bg-primary-ink border border-primary-ink p-8 flex flex-col items-center text-center shadow-2xl shadow-primary-ink/10 transition-all duration-300 transform md:-translate-y-2 cursor-pointer"
            >
              <div className="mb-6 text-surface-container-lowest transition-transform group-hover:scale-110 duration-300">
                <Icon name="timer" className="text-5xl" />
              </div>
              <h3 className="text-sm font-bold text-surface-container-lowest uppercase tracking-widest mb-3 px-2">Simulador de examen</h3>
              <p className="text-xs text-surface-container-lowest/80 leading-relaxed font-light">Examen completo con tiempo límite y resultados detallados.</p>
              <div className="mt-8 pt-4 w-full border-t border-surface-container-lowest/10">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-container-lowest">Próximamente</span>
              </div>
            </div>
            <div 
              onClick={() => setView('simulador-fisico')}
              className="group bg-surface-container-lowest border border-outline-variant/30 p-8 flex flex-col items-center text-center transition-all duration-300 hover:bg-surface-container-low cursor-pointer"
            >
              <div className="mb-6 text-primary-ink transition-transform group-hover:scale-110 duration-300">
                <Icon name="fitness_center" className="text-5xl" />
              </div>
              <h3 className="text-sm font-bold text-primary-ink uppercase tracking-widest mb-3 px-2">Simulador de examen físico</h3>
              <p className="text-xs text-outline leading-relaxed font-light">Guía y cronómetro para las pruebas de rendimiento físico.</p>
              <div className="mt-8 pt-4 w-full border-t border-outline-variant/10">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-ink/50">Rendimiento</span>
              </div>
            </div>
          </div>
          <div className="mt-12">
            <button 
              onClick={() => setView('historial')}
              className="flex items-center gap-2 text-primary-ink font-bold text-[10px] uppercase tracking-[0.3em] hover:opacity-50 transition-opacity"
            >
              <Icon name="history" className="!text-lg" />
              Ver Historial de Pruebas
            </button>
          </div>
        </>
      ) : (
        <div className="w-full max-w-xl bg-surface-container-low border border-outline-variant/20 p-8">
          <button onClick={() => setShowPurchase(false)} className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-primary-ink">
            <Icon name="arrow_back" className="!text-sm" /> Volver
          </button>
          <div className="text-center mb-8">
            <Icon name="shopping_bag" className="text-5xl text-primary mb-4" />
            <h3 className="text-2xl font-black text-primary-ink uppercase">Simulador Completo</h3>
            <p className="text-sm font-bold text-primary mt-2">$200 MXN / 1 AÑO</p>
            <p className="text-xs text-outline mt-4 leading-relaxed">Acceso ilimitado a todos los exámenes, bancos de preguntas actualizados y seguimiento de progreso avanzado.</p>
          </div>
          
          <form action="https://formspree.io/f/mdaprnaj" method="POST" className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Tu Correo Electrónico</label>
              <input 
                type="email" 
                name="email"
                required
                placeholder="EMAIL@EJEMPLO.COM"
                className="w-full p-4 bg-surface-container-lowest border border-outline-variant/30 focus:border-primary-ink outline-none text-sm font-bold uppercase"
              />
            </div>
            <input type="hidden" name="subject" value="Interés en Simulador Completo - Operación Cadete" />
            <button type="submit" className="w-full py-5 bg-primary-ink text-surface-container-lowest font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">
              Ser el primero en saber
            </button>
          </form>
          <p className="mt-6 text-[9px] text-outline text-center uppercase font-bold tracking-widest leading-relaxed">
            Al registrarte, te avisaremos en cuanto el simulador esté disponible para su compra.
          </p>
        </div>
      )}
    </motion.div>
  );
};

const SimuladorFisicoView = ({ setView, user }: { setView: (v: View) => void, user: FirebaseUser | null }) => {
  const [institution, setInstitution] = useState<Institution>('SEDENA');
  const [gender, setGender] = useState<'H' | 'M'>('H');
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tests = {
    SEDENA: [
      { 
        id: 'salto', 
        title: 'Salto de decisión', 
        desc: 'Salto desde plataforma de 5 metros hacia fosa de clavados.', 
        req: '2 intentos. 1ro: 20 pts, 2do: 10 pts. Fallar ambos = Exclusión.', 
        tips: 'Mantén el cuerpo recto y los brazos pegados al cuerpo al caer.',
        icon: 'height',
        inputType: 'select',
        options: ['Primer intento (20 pts)', 'Segundo intento (10 pts)', 'Fallido (0 pts)']
      },
      { 
        id: 'nado', 
        title: 'Desplazamiento (Natación)', 
        desc: 'Nadar 25 metros en estilo libre sin detenerse.', 
        req: 'Completar la distancia sin tocar los bordes o el fondo.', 
        tips: 'Controla tu respiración y mantén un ritmo constante.',
        icon: 'pool',
        inputType: 'select',
        options: ['Completado', 'No completado']
      },
      { 
        id: 'lagartijas', 
        title: 'Lagartijas', 
        desc: 'Flexiones de brazos en posición de plancha.', 
        req: gender === 'H' ? 'Mínimo 11 repeticiones' : 'Mínimo 1 repetición', 
        tips: 'Mantén la espalda recta y baja hasta que el pecho casi toque el suelo.',
        icon: 'fitness_center',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 100
      },
      { 
        id: 'abdominales', 
        title: 'Abdominales', 
        desc: 'Flexiones de tronco desde posición supina.', 
        req: gender === 'H' ? 'Mínimo 17 repeticiones' : 'Mínimo 7 repeticiones', 
        tips: 'No jales tu cuello, usa la fuerza del core.',
        icon: 'exercise',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 100
      },
      { 
        id: 'sentadilla', 
        title: 'Sentadilla pliométrica', 
        desc: 'Sentadilla con salto explosivo.', 
        req: 'Mínimo 11 repeticiones', 
        tips: 'Aterriza suavemente sobre las puntas de los pies.',
        icon: 'vertical_align_top',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 100
      },
      { 
        id: 'burpees', 
        title: 'Burpees', 
        desc: 'Ejercicio de cuerpo completo (salto, sentadilla, plancha, flexión).', 
        req: gender === 'H' ? 'Mínimo 6 repeticiones' : 'Mínimo 1 repetición', 
        tips: 'Mantén la fluidez en el movimiento.',
        icon: 'directions_run',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 100
      },
      { 
        id: 'carrera', 
        title: 'Carrera de resistencia', 
        desc: 'Recorrer 1,200 metros en el menor tiempo posible.', 
        req: gender === 'H' ? 'Menos de 7:30 minutos' : 'Menos de 9:30 minutos', 
        tips: 'Dosifica tu energía, no empieces a máxima velocidad.',
        icon: 'timer',
        inputType: 'text',
        placeholder: 'MM:SS'
      },
      { 
        id: 'arabesque', 
        title: 'Arabesque', 
        desc: 'Prueba de equilibrio sobre una pierna con el tronco inclinado.', 
        req: 'Mínimo 11 segundos', 
        tips: 'Fija la mirada en un punto estático frente a ti.',
        icon: 'accessibility_new',
        inputType: 'number',
        placeholder: 'Segundos',
        min: 0,
        max: 300
      },
      { 
        id: 'flexion', 
        title: 'Flexión de tronco', 
        desc: 'Tocar una superficie por debajo de los pies sin doblar rodillas.', 
        req: 'Tocar 2 cm por debajo de los pies.', 
        tips: 'Exhala mientras bajas para ganar flexibilidad.',
        icon: 'self_improvement',
        inputType: 'number',
        placeholder: 'cm (negativo si es abajo)',
        min: -50,
        max: 50
      }
    ],
    SEMAR: [
      { 
        id: 'velocidad', 
        title: 'Velocidad', 
        desc: 'Carrera de 100 metros planos.', 
        req: 'Tiempo entre 15 y 17 segundos.', 
        tips: 'Explota en la salida y mantén la zancada amplia.',
        icon: 'bolt',
        inputType: 'text',
        placeholder: 'SS.ms'
      },
      { 
        id: 'brazos', 
        title: 'Fuerza de brazos', 
        desc: 'Repeticiones suspendido en barra horizontal.', 
        req: gender === 'H' ? 'De 3 a 5 repeticiones.' : 'No aplica para mujeres.', 
        tips: 'Evita el balanceo, usa fuerza pura de espalda y brazos.',
        icon: 'fitness_center',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 50
      },
      { 
        id: 'abdominales', 
        title: 'Abdominales', 
        desc: 'Repeticiones en tiempo establecido.', 
        req: 'De 20 a 30 repeticiones.', 
        tips: 'Mantén un ritmo constante para no agotarte pronto.',
        icon: 'exercise',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 100
      },
      { 
        id: 'lagartijas', 
        title: 'Lagartijas', 
        desc: 'Flexiones de brazos.', 
        req: 'De 20 a 30 repeticiones.', 
        tips: 'Codos pegados al cuerpo para proteger hombros.',
        icon: 'fitness_center',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 100
      },
      { 
        id: 'sentadillas', 
        title: 'Sentadillas', 
        desc: 'Flexión de piernas.', 
        req: 'De 20 a 30 repeticiones.', 
        tips: 'Talones siempre apoyados en el suelo.',
        icon: 'accessibility',
        inputType: 'number',
        placeholder: 'Repeticiones',
        min: 0,
        max: 100
      },
      { 
        id: 'natacion', 
        title: 'Natación', 
        desc: 'Recorrer distancia sin interrupción.', 
        req: 'De 35 a 50 metros.', 
        tips: 'Usa el estilo que más domines para asegurar la distancia.',
        icon: 'pool',
        inputType: 'number',
        placeholder: 'Metros',
        min: 0,
        max: 500
      },
      { 
        id: 'flotacion', 
        title: 'Flotación', 
        desc: 'Mantenerse a flote sin ayuda.', 
        req: '5 minutos (10 min para puntaje máximo).', 
        tips: 'Relaja el cuerpo y usa movimientos suaves de manos y pies.',
        icon: 'waves',
        inputType: 'number',
        placeholder: 'Minutos',
        min: 0,
        max: 60
      }
    ]
  };

  const calculateScore = (testId: string, value: string): { numeric: number, isPass: boolean, display: string } => {
    if (institution === 'SEDENA') {
      switch (testId) {
        case 'salto':
          if (value.includes('Primer')) return { numeric: 100, isPass: true, display: '100/100' };
          if (value.includes('Segundo')) return { numeric: 50, isPass: true, display: '50/100' };
          return { numeric: 0, isPass: false, display: '0/100' };
        case 'nado':
          return value === 'Completado' ? { numeric: 100, isPass: true, display: 'APTO' } : { numeric: 0, isPass: false, display: 'NO APTO' };
        case 'lagartijas':
          const l = parseInt(value);
          const lMin = gender === 'H' ? 11 : 1;
          return { numeric: l >= lMin ? 100 : 0, isPass: l >= lMin, display: `${l} reps` };
        case 'abdominales':
          const a = parseInt(value);
          const aMin = gender === 'H' ? 17 : 7;
          return { numeric: a >= aMin ? 100 : 0, isPass: a >= aMin, display: `${a} reps` };
        case 'sentadilla':
          const s = parseInt(value);
          return { numeric: s >= 11 ? 100 : 0, isPass: s >= 11, display: `${s} reps` };
        case 'burpees':
          const b = parseInt(value);
          const bMin = gender === 'H' ? 6 : 1;
          return { numeric: b >= bMin ? 100 : 0, isPass: b >= bMin, display: `${b} reps` };
        case 'carrera':
          const [m, sec] = value.split(':').map(Number);
          const totalSec = (m || 0) * 60 + (sec || 0);
          const limitSec = gender === 'H' ? 7 * 60 + 30 : 9 * 60 + 30;
          return { numeric: totalSec <= limitSec ? 100 : 0, isPass: totalSec <= limitSec, display: value };
        case 'arabesque':
          const ar = parseInt(value);
          return { numeric: ar >= 11 ? 100 : 0, isPass: ar >= 11, display: `${ar}s` };
        case 'flexion':
          const f = parseInt(value);
          return { numeric: f >= 2 ? 100 : 0, isPass: f >= 2, display: `${f}cm` };
        default: return { numeric: 0, isPass: false, display: value };
      }
    } else {
      // SEMAR
      switch (testId) {
        case 'velocidad':
          const v = parseFloat(value);
          if (v <= 15) return { numeric: 100, isPass: true, display: `${v}s` };
          if (v > 17) return { numeric: 0, isPass: false, display: `${v}s` };
          return { numeric: Math.round(100 - ((v - 15) / 2) * 100), isPass: true, display: `${v}s` };
        case 'brazos':
          const br = parseInt(value);
          if (gender === 'M') return { numeric: 100, isPass: true, display: 'N/A' };
          if (br >= 5) return { numeric: 100, isPass: true, display: `${br} reps` };
          if (br < 3) return { numeric: 0, isPass: false, display: `${br} reps` };
          return { numeric: Math.round(((br - 3) / 2) * 100), isPass: true, display: `${br} reps` };
        case 'abdominales':
        case 'lagartijas':
        case 'sentadillas':
          const reps = parseInt(value);
          if (reps >= 30) return { numeric: 100, isPass: true, display: `${reps} reps` };
          if (reps < 20) return { numeric: 0, isPass: false, display: `${reps} reps` };
          return { numeric: Math.round(((reps - 20) / 10) * 100), isPass: true, display: `${reps} reps` };
        case 'natacion':
          const n = parseInt(value);
          if (n >= 50) return { numeric: 100, isPass: true, display: `${n}m` };
          if (n < 35) return { numeric: 0, isPass: false, display: `${n}m` };
          return { numeric: Math.round(((n - 35) / 15) * 100), isPass: true, display: `${n}m` };
        case 'flotacion':
          const fl = parseInt(value);
          if (fl >= 10) return { numeric: 100, isPass: true, display: `${fl} min` };
          if (fl < 5) return { numeric: 0, isPass: false, display: `${fl} min` };
          return { numeric: Math.round(((fl - 5) / 5) * 100), isPass: true, display: `${fl} min` };
        default: return { numeric: 0, isPass: false, display: value };
      }
    }
  };

  const handleSaveResult = async (test: any) => {
    if (!inputValue || !user) return;
    setError(null);

    // Validation
    if (test.inputType === 'number') {
      const val = parseFloat(inputValue);
      if (test.min !== undefined && val < test.min) {
        setError(`El valor mínimo es ${test.min}`);
        return;
      }
      if (test.max !== undefined && val > test.max) {
        setError(`El valor máximo es ${test.max}`);
        return;
      }
    }

    if (test.id === 'carrera' && !inputValue.includes(':')) {
      setError('Formato MM:SS requerido');
      return;
    }

    const scoreData = calculateScore(test.id, inputValue);

    try {
      const entry = {
        uid: user.uid,
        date: new Date().toISOString(),
        type: 'FISICO',
        title: test.title,
        institution: institution,
        score: scoreData.display,
        numericScore: scoreData.numeric,
        isPass: scoreData.isPass,
        details: `Prueba física realizada como ${gender === 'H' ? 'Hombre' : 'Mujer'}.`
      };

      await addDoc(collection(db, 'history'), entry);
      alert(`Resultado de ${test.title} guardado con éxito. Puntaje: ${scoreData.numeric}%`);
      setActiveTest(null);
      setInputValue('');
    } catch (error) {
      console.error("Error saving physical result:", error);
      alert("Error al guardar el resultado.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-4xl mx-auto"
    >
      <div className="w-full text-center mb-12">
        <h2 className="text-primary-ink font-black text-4xl tracking-tighter uppercase mb-2">Simulador Físico</h2>
        <div className="h-1 w-12 bg-primary-ink mx-auto"></div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 flex border border-outline-variant/20 p-1 bg-surface-container-low">
          <button 
            onClick={() => setInstitution('SEDENA')}
            className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-all ${institution === 'SEDENA' ? 'bg-primary-ink text-white' : 'text-outline hover:bg-surface-container'}`}
          >
            SEDENA
          </button>
          <button 
            onClick={() => setInstitution('SEMAR')}
            className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-all ${institution === 'SEMAR' ? 'bg-primary-ink text-white' : 'text-outline hover:bg-surface-container'}`}
          >
            SEMAR
          </button>
        </div>
        <div className="flex border border-outline-variant/20 p-1 bg-surface-container-low">
          <button 
            onClick={() => setGender('H')}
            className={`px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition-all ${gender === 'H' ? 'bg-primary text-white' : 'text-outline hover:bg-surface-container'}`}
          >
            Hombre
          </button>
          <button 
            onClick={() => setGender('M')}
            className={`px-6 py-3 text-[10px] font-bold tracking-widest uppercase transition-all ${gender === 'M' ? 'bg-primary text-white' : 'text-outline hover:bg-surface-container'}`}
          >
            Mujer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests[institution].map((test) => (
          <div key={test.id} className="bg-surface-container-lowest border border-outline-variant/20 p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-surface-container-low text-primary-ink">
                <Icon name={test.icon} className="text-2xl" />
              </div>
              <div>
                <h3 className="text-sm font-black text-primary-ink uppercase tracking-tight">{test.title}</h3>
                <p className="text-xs text-outline leading-tight mt-1">{test.desc}</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-outline-variant/10">
              <div>
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-1">Requerimiento</span>
                <p className="text-xs font-bold text-primary-ink">{test.req}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-outline uppercase tracking-widest block mb-1">Consejo</span>
                <p className="text-xs italic text-outline-variant leading-relaxed">{test.tips}</p>
              </div>
            </div>

            {activeTest === test.id ? (
              <div className="mt-4 space-y-4 bg-surface-container-low p-4 border border-outline-variant/10">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Ingresa tu resultado</label>
                {test.inputType === 'select' ? (
                  <select 
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setError(null); }}
                    className="w-full p-3 bg-surface-container-lowest border border-outline-variant/30 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-primary"
                  >
                    <option value="">Selecciona...</option>
                    {test.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input 
                    type={test.inputType}
                    placeholder={test.placeholder}
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setError(null); }}
                    className="w-full p-3 bg-surface-container-lowest border border-outline-variant/30 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-primary"
                  />
                )}
                {error && (
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{error}</p>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSaveResult(test)}
                    className="flex-1 py-3 bg-primary-ink text-surface-container-lowest text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
                  >
                    Guardar
                  </button>
                  <button 
                    onClick={() => { setActiveTest(null); setInputValue(''); setError(null); }}
                    className="px-4 py-3 border border-outline-variant/30 text-[10px] font-bold uppercase tracking-widest text-outline hover:bg-surface-container-lowest"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setActiveTest(test.id)}
                className="mt-2 w-full py-3 bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-primary-ink hover:bg-primary-ink hover:text-surface-container-lowest transition-colors border border-outline-variant/10"
              >
                Iniciar Prueba
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={() => setView('historial')}
          className="flex items-center gap-2 text-primary-ink font-bold text-[10px] uppercase tracking-[0.3em] hover:opacity-50 transition-opacity"
        >
          <Icon name="analytics" className="!text-lg" />
          Ver Resultados y Marcas Personales
        </button>
      </div>
    </motion.div>
  );
};

const HistorialView = ({ user }: { user: FirebaseUser | null }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'EXAMEN' | 'FISICO'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'history'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HistoryEntry[];
      setHistory(entries);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredHistory = history.filter(e => filter === 'ALL' || e.type === filter);

  const stats = {
    total: history.length,
    avgScore: history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + (curr.numericScore || 0), 0) / history.length) : 0,
    passed: history.filter(e => e.isPass).length,
    exams: history.filter(e => e.type === 'EXAMEN').length,
    physical: history.filter(e => e.type === 'FISICO').length,
  };

  const personalBests = history.reduce((acc: Record<string, HistoryEntry>, curr) => {
    if (curr.type === 'FISICO') {
      if (!acc[curr.title] || curr.numericScore > acc[curr.title].numericScore) {
        acc[curr.title] = curr;
      }
    }
    return acc;
  }, {});

  const getGrade = (score: number) => {
    if (score >= 90) return { label: 'Sobresaliente', icon: 'military_tech', color: 'text-green-600' };
    if (score >= 80) return { label: 'Bueno', icon: 'award', color: 'text-blue-600' };
    if (score >= 70) return { label: 'Suficiente', icon: 'check_circle', color: 'text-yellow-600' };
    return { label: 'Insuficiente', icon: 'error', color: 'text-red-600' };
  };

  const grade = getGrade(stats.avgScore);

  const handleShare = async () => {
    const shareText = `¡He completado mis pruebas en Operación Cadete! 🎖️\n\n` +
      `Desempeño General: ${stats.avgScore}%\n` +
      `Estatus: ${grade.label}\n` +
      `Pruebas Aptas: ${stats.passed}/${stats.total}\n\n` +
      `¡Prepárate tú también para SEDENA/SEMAR!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mis Resultados - Operación Cadete',
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Resumen copiado al portapapeles para compartir.');
      } catch (err) {
        alert('No se pudo copiar al portapapeles.');
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-4xl mx-auto"
    >
      <div className="flex justify-between items-end mb-12">
        <div className="text-left">
          <h2 className="text-4xl font-black tracking-tighter text-primary-ink uppercase leading-none">Resultados</h2>
          <div className="h-1 w-12 bg-primary mt-4"></div>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2 text-outline font-bold text-[10px] uppercase tracking-widest opacity-50">
            <Icon name="lock" className="!text-lg" />
            Historial Protegido
          </div>
        )}
      </div>

      {history.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-primary-ink p-8 border border-primary-ink flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Desempeño Gral.</p>
                <Icon name={grade.icon} className="text-white/40 text-3xl" />
              </div>
              <div>
                <span className="text-5xl font-black text-white leading-none">{stats.avgScore}%</span>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] mt-2">{grade.label}</p>
              </div>
            </div>
            
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-6 border border-outline-variant/20">
                <p className="text-[10px] font-bold tracking-widest text-outline uppercase mb-1">Pruebas Aptas</p>
                <span className="text-3xl font-black text-primary-ink">{stats.passed}</span>
                <div className="w-full bg-surface-container-low h-1 mt-4">
                  <div className="bg-green-600 h-full" style={{ width: `${(stats.passed / stats.total) * 100}%` }}></div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 border border-outline-variant/20">
                <p className="text-[10px] font-bold tracking-widest text-outline uppercase mb-1">Total Sesiones</p>
                <span className="text-3xl font-black text-primary-ink">{stats.total}</span>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary-ink"></div>
                    <span className="text-[8px] font-bold text-outline">{stats.exams} EX</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary"></div>
                    <span className="text-[8px] font-bold text-outline">{stats.physical} FIS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Share Card */}
          <div className="w-full mb-12 bg-surface-container-low border border-outline-variant/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <Icon name="military_tech" className="text-[240px]" />
            </div>
            <div className="flex-1 text-center md:text-left relative z-10">
              <h3 className="text-xl font-black text-primary-ink uppercase tracking-tight mb-2">Comparte tu Progreso</h3>
              <p className="text-xs text-outline leading-relaxed max-w-md">
                Muestra tu dedicación y motiva a otros aspirantes compartiendo un resumen de tu desempeño actual en Operación Cadete.
              </p>
            </div>
            <button 
              onClick={handleShare}
              className="w-full md:w-auto bg-primary-ink text-white py-4 px-10 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-primary transition-all duration-300 flex items-center justify-center gap-3 relative z-10"
            >
              <Icon name="share" className="!text-lg" />
              Compartir Reporte
            </button>
          </div>

          {Object.keys(personalBests).length > 0 && (
            <section className="mb-16">
              <h3 className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-6 flex items-center gap-2">
                <Icon name="stars" className="!text-lg" />
                Marcas Personales (Físico)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(Object.values(personalBests) as HistoryEntry[]).map((pb) => (
                  <div key={pb.id} className="bg-surface-container-low border border-outline-variant/10 p-4">
                    <p className="text-[8px] font-bold text-outline uppercase tracking-widest mb-1 truncate">{pb.title}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-primary-ink">{pb.numericScore}%</span>
                      <span className="text-[10px] font-bold text-primary">{pb.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
              <h3 className="text-xs font-bold tracking-[0.2em] text-on-surface uppercase">Detalle de Actividad</h3>
              <div className="flex gap-2">
                {['ALL', 'EXAMEN', 'FISICO'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-1.5 text-[9px] font-black tracking-widest uppercase border transition-all ${
                      filter === f 
                        ? 'bg-primary-ink text-surface-container-lowest border-primary-ink' 
                        : 'bg-surface-container-lowest text-outline border-outline-variant/20 hover:bg-surface-container-low'
                    }`}
                  >
                    {f === 'ALL' ? 'Todos' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 opacity-40">
                  <p className="text-xs font-bold tracking-widest uppercase">No hay registros para este filtro</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <div key={entry.id} className="bg-surface-container-lowest border border-outline-variant/20 p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-primary/30 transition-colors">
                    <div className={`p-4 flex flex-col items-center justify-center min-w-[80px] ${entry.type === 'EXAMEN' ? 'bg-primary-ink text-surface-container-lowest' : 'bg-primary text-white'}`}>
                      <Icon name={entry.type === 'EXAMEN' ? 'assignment' : 'fitness_center'} className="text-2xl mb-1" />
                      <span className="text-[8px] font-black uppercase tracking-widest">{entry.type}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-black text-primary-ink uppercase tracking-tight">{entry.title}</h3>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-widest">{new Date(entry.date).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 px-2 py-0.5">{entry.institution}</span>
                        <p className="text-xs text-outline-variant">{entry.details}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Resultado</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-outline uppercase">{entry.score}</span>
                        <span className={`text-2xl font-black ${entry.isPass ? 'text-green-600' : 'text-red-600'}`}>{entry.numericScore}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {history.length === 0 && (
        <div className="text-center py-20 border border-dashed border-outline-variant/30 opacity-40">
          <Icon name="history" className="text-6xl mb-4" />
          <p className="text-xs font-bold tracking-widest uppercase">No hay registros aún</p>
        </div>
      )}
    </motion.div>
  );
};

const RequisitosView = () => {
  const [activeTab, setActiveTab] = useState<'SEDENA' | 'SEMAR' | 'COMPARATIVA'>('SEDENA');

  const sedenaReqs = {
    personales: [
      { label: 'Nacionalidad', value: 'Mexicano por nacimiento, sin otra nacionalidad.' },
      { label: 'Estado Civil', value: 'Soltero/a, sin hijos y no vivir en concubinato (mantenerse así durante estudios).' },
      { label: 'Edad Mínima', value: '18 años cumplidos al 1 de septiembre de 2026.' },
      { label: 'Edad Máxima', value: '22 años, 11 meses y 30 días al 31 de diciembre de 2026.' },
      { label: 'Escolaridad', value: 'Bachillerato con promedio mínimo de 7.0.' },
    ],
    fisicos: [
      { label: 'Estatura Hombres', value: '1.63 metros.' },
      { label: 'Estatura Mujeres', value: '1.56 metros.' },
      { label: 'IMC', value: 'Entre 18.0 y 25.0.' },
      { label: 'Tatuajes', value: 'Máx 10x10 cm, no ofensivos, no visibles con uniforme (manos, cuello, cara).' },
      { label: 'Perforaciones', value: 'No permitidas (excepto orejas en mujeres).' },
    ]
  };

  const semarReqs = {
    personales: [
      { label: 'Nacionalidad', value: 'Mexicano por nacimiento.' },
      { label: 'Estado Civil', value: 'Soltero/a, sin hijos y comprometerse a permanecer así hasta graduación.' },
      { label: 'Edad Mínima', value: '18 años cumplidos al 31 de diciembre de 2026.' },
      { label: 'Edad Máxima', value: '20 años, 11 meses y 30 días al 31 de diciembre de 2026.' },
      { label: 'Escolaridad', value: 'Bachillerato terminado con promedio mínimo de 7.5.' },
    ],
    fisicos: [
      { label: 'Estatura Hombres', value: '1.63 metros.' },
      { label: 'Estatura Mujeres', value: '1.58 metros.' },
      { label: 'IMC', value: 'Entre 18.5 y 24.9.' },
      { label: 'Tatuajes', value: 'Máx 10x10 cm, no visibles con uniforme de deporte (manga corta y short).' },
    ]
  };

  const differences = [
    { title: 'Promedio Escolar', sedena: '7.0 mínimo', semar: '7.5 mínimo (Más estricto)' },
    { title: 'Edad Máxima', sedena: '22 años, 11 meses', semar: '20 años, 11 meses (Menos tiempo)' },
    { title: 'Estatura Mujeres', sedena: '1.56 m mínimo', semar: '1.58 m mínimo (Más estricto)' },
    { title: 'IMC', sedena: '18.0 a 25.0', semar: '18.5 a 24.9 (Rango más cerrado)' },
    { title: 'Tatuajes', sedena: 'No visibles con uniforme diario', semar: 'No visibles con uniforme de deporte (Más estricto)' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-4xl mx-auto"
    >
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-black tracking-tighter text-primary-ink uppercase leading-none">Requisitos de Ingreso</h2>
        <div className="h-1 w-12 bg-primary mt-4 mx-auto"></div>
      </div>

      <div className="flex gap-2 mb-12">
        {['SEDENA', 'SEMAR', 'COMPARATIVA'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase border transition-all ${
              activeTab === tab 
                ? 'bg-primary-ink text-surface-container-lowest border-primary-ink' 
                : 'bg-surface-container-lowest text-outline border-outline-variant/20 hover:bg-surface-container-low'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="space-y-12">
        {activeTab === 'COMPARATIVA' ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-6 flex items-center gap-2">
              <Icon name="compare_arrows" className="!text-lg" />
              Diferencias Clave
            </h3>
            <div className="space-y-4">
              {differences.map((diff, i) => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/20 overflow-hidden">
                  <div className="bg-surface-container-low p-3 border-b border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-ink">{diff.title}</p>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-outline-variant/10">
                    <div className="p-4">
                      <p className="text-[8px] font-bold text-sedena uppercase mb-1">SEDENA</p>
                      <p className="text-xs font-medium text-on-surface">{diff.sedena}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-[8px] font-bold text-semar uppercase mb-1">SEMAR</p>
                      <p className="text-xs font-medium text-on-surface">{diff.semar}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-6 flex items-center gap-2">
                <Icon name="person" className="!text-lg" />
                Personales y Civiles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === 'SEDENA' ? sedenaReqs.personales : semarReqs.personales).map((req, i) => (
                  <div key={i} className="p-4 bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-outline uppercase tracking-widest">{req.label}</span>
                    <p className="text-sm font-medium text-primary-ink leading-tight">{req.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h3 className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-6 flex items-center gap-2">
                <Icon name="fitness_center" className="!text-lg" />
                Físicos y Médicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === 'SEDENA' ? sedenaReqs.fisicos : semarReqs.fisicos).map((req, i) => (
                  <div key={i} className="p-4 bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-outline uppercase tracking-widest">{req.label}</span>
                    <p className="text-sm font-medium text-primary-ink leading-tight">{req.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </motion.div>
  );
};

const MotivosExclusionView = ({ setView }: { setView: (v: View) => void }) => {
  const [activeTab, setActiveTab] = useState<'SEDENA' | 'SEMAR'>('SEDENA');

  interface MotivoSeccion {
    title: string;
    desc?: string;
    items: { label: string; value: string }[];
  }

  const sedenaMotivos: MotivoSeccion[] = [
    {
      title: "1. Motivos de Exclusión Médica",
      desc: "Cualquier padecimiento que impida el desempeño de las actividades militares es causa de exclusión.",
      items: [
        { label: "Afecciones Visuales", value: "Agudeza visual inferior a la establecida, daltonismo, glaucoma o cirugías oculares con complicaciones." },
        { label: "Problemas Auditivos", value: "Disminución de la audición (hipoacusia) en uno o ambos oídos." },
        { label: "Condiciones Físicas y Óseas", value: "Escoliosis, pie plano (grado severo), falta de algún miembro o dedo, o deformidades limitantes." },
        { label: "Enfermedades Crónicas", value: "Diabetes, hipertensión, enfermedades del corazón, asma, epilepsia o insuficiencia renal." },
        { label: "Salud Mental", value: "Trastornos de personalidad, ansiedad crónica, depresión o diagnósticos psiquiátricos previos." },
        { label: "Padecimientos Infecciosos", value: "Positivo en pruebas de VIH, Hepatitis (B o C) o VDRL." },
        { label: "Embarazo", value: "Motivo de exclusión por el riesgo que el esfuerzo físico representa para la madre y el producto." }
      ]
    },
    {
      title: "2. Motivos de Exclusión por Somatometría",
      items: [
        { label: "Estatura", value: "Mínimo 1.63m (hombres), 1.56m (mujeres), 1.65m (Aviación)." },
        { label: "IMC", value: "Fuera del rango 18.0 a 25.0. Sobrepeso u obesidad es baja inmediata." }
      ]
    },
    {
      title: "3. Motivos de Exclusión por Tatuajes y Perforaciones",
      items: [
        { label: "Tatuajes", value: "Más de 10x10cm, visibles con uniforme de deporte, contenido ofensivo o más del 10% de superficie corporal." },
        { label: "Perforaciones", value: "Prohibidas en hombres. Mujeres solo lobulares normales." }
      ]
    },
    {
      title: "4. Motivos de Exclusión Administrativos",
      items: [
        { label: "Documentación", value: "Documentos falsos, alterados o incompletos." },
        { label: "Antecedentes", value: "Antecedentes penales o procesos judiciales activos." },
        { label: "Consumo de Sustancias", value: "Positivo en examen toxicológico (drogas o alcoholismo)." },
        { label: "Baja Previa", value: "Baja de planteles militares por mala conducta o 'no apto'." }
      ]
    },
    {
      title: "5. Motivos de Exclusión en Pruebas",
      items: [
        { label: "Capacidad Física", value: "No superar mínimos en resistencia, natación o salto de decisión." },
        { label: "Examen Cultural", value: "No alcanzar puntaje aprobatorio o quedar fuera de cuota de plazas." },
        { label: "Examen Psicológico", value: "No mostrar el perfil de personalidad o aptitudes necesarias." }
      ]
    }
  ];

  const semarMotivos: MotivoSeccion[] = [
    {
      title: "1. Perfil Físico y Somatometría",
      items: [
        { label: "Estatura", value: "Mínimo 1.63m (hombres), 1.58m (mujeres)." },
        { label: "IMC", value: "Fuera del rango 18.5 a 24.9 (Más estricto que SEDENA)." },
        { label: "Certificado Médico", value: "Resultar 'No Apto' en agudeza visual, auditiva, dental o salud general." }
      ]
    },
    {
      title: "2. Tatuajes y Aspecto Físico",
      items: [
        { label: "Tatuajes", value: "Visibles con uniforme de deporte, más de 10x10cm o contenido ofensivo. Suma total máx 10% corporal." },
        { label: "Perforaciones", value: "Prohibidas en hombres. Mujeres solo en el lóbulo." }
      ]
    },
    {
      title: "3. Antecedentes y Conducta",
      items: [
        { label: "Deserción", value: "Haber desertado o baja por mala conducta de cualquier fuerza armada." },
        { label: "Procesos Legales", value: "Sujeto a proceso penal o condena por delitos dolosos." },
        { label: "Sustancias", value: "Positivo en examen toxicológico." }
      ]
    },
    {
      title: "4. Restricciones Administrativas",
      items: [
        { label: "Escolaridad", value: "Promedio mínimo de 7.0 en bachillerato." },
        { label: "Nacionalidad", value: "No ser mexicano por nacimiento o tener otra nacionalidad." },
        { label: "Estado Civil", value: "No ser soltero, tener hijos o estar embarazada." },
        { label: "Edad", value: "Superar el límite (generalmente 20 años, 11 meses)." }
      ]
    },
    {
      title: "5. Evaluación de Aptitud",
      items: [
        { label: "Examen Académico", value: "No alcanzar puntuación CENEVAL para fase definitiva." },
        { label: "Capacidad Física", value: "No superar supervivencia en agua o pruebas terrestres." },
        { label: "Perfil Psicológico", value: "No cumplir rasgos de personalidad y valores navales." }
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-4xl mx-auto"
    >
      <button 
        onClick={() => setView('home')}
        className="mb-8 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-outline hover:text-primary transition-colors"
      >
        <Icon name="arrow_back" className="!text-lg" />
        Volver al inicio
      </button>

      <div className="mb-12 text-center">
        <h2 className="text-4xl font-black tracking-tighter text-red-600 uppercase leading-none">Motivos de Exclusión</h2>
        <p className="text-[10px] font-bold text-outline uppercase tracking-widest mt-4">Causas por las que podrías ser declarado "No Apto"</p>
        <div className="h-1 w-12 bg-red-600 mt-4 mx-auto"></div>
      </div>

      <div className="flex gap-2 mb-12">
        {['SEDENA', 'SEMAR'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase border transition-all ${
              activeTab === tab 
                ? 'bg-red-600 text-white border-red-600' 
                : 'bg-surface-container-lowest text-outline border-outline-variant/20 hover:bg-surface-container-low'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {(activeTab === 'SEDENA' ? sedenaMotivos : semarMotivos).map((seccion, i) => (
          <section key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
            <h3 className="text-xs font-black tracking-[0.2em] text-primary-ink uppercase mb-6 flex items-center gap-2 border-b border-outline-variant/20 pb-2">
              {seccion.title}
            </h3>
            {seccion.desc && <p className="text-xs text-outline mb-4 italic">{seccion.desc}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seccion.items.map((item, j) => (
                <div key={j} className="p-4 bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1 hover:border-red-600/30 transition-colors group">
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">{item.label}</span>
                  <p className="text-sm font-medium text-primary-ink leading-tight">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex gap-4 items-start">
          <Icon name="warning" className="text-red-600" />
          <p className="text-xs font-bold text-red-900 leading-relaxed uppercase">
            Cualquier aspirante que detecte o se le detecte alguno de estos puntos durante el proceso será notificado como <span className="underline">"No Apto"</span>, lo cual termina su participación en el ciclo escolar actual.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const ComprasView = ({ setView }: { setView: (v: View) => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-2xl mx-auto"
    >
      <button 
        onClick={() => setView('home')}
        className="mb-8 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-outline hover:text-primary transition-colors"
      >
        <Icon name="arrow_back" className="!text-lg" />
        Volver al inicio
      </button>

      <section className="mb-10">
        <h2 className="text-3xl font-black tracking-tighter text-primary-ink uppercase leading-none">Artículos para el examen</h2>
        <p className="text-[10px] text-outline mt-3 font-bold uppercase tracking-widest leading-relaxed">
          Compra a buen precio el material para el examen de natación, Googles, Gorros, Traje de baños.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl overflow-hidden shadow-sm flex flex-col"
        >
          <div className="h-40 bg-sedena/10 flex items-center justify-center">
            <Icon name="account_balance" className="text-6xl text-sedena/40" />
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-lg font-black text-primary-ink uppercase tracking-tight mb-2">Artículos SEDENA</h3>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest mb-6 flex-1">
              Material recomendado para el examen de ingreso a planteles militares de la SEDENA.
            </p>
            <a 
              href="https://meli.la/1Tjmd3m" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-sedena text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-center hover:bg-sedena/90 transition-colors"
            >
              Ver en Mercado Libre
            </a>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl overflow-hidden shadow-sm flex flex-col"
        >
          <div className="h-40 bg-semar/10 flex items-center justify-center">
            <Icon name="anchor" className="text-6xl text-semar/40" />
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-lg font-black text-primary-ink uppercase tracking-tight mb-2">Artículos SEMAR</h3>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest mb-6 flex-1">
              Material recomendado para el examen de ingreso a la Heroica Escuela Naval Militar.
            </p>
            <a 
              href="https://meli.la/2MbVyrD" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-semar text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-center hover:bg-semar/90 transition-colors"
            >
              Ver en Mercado Libre
            </a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const LibrosView = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SEDENA' | 'SEMAR'>('ALL');

  interface Book {
    title: string;
    link?: string;
  }

  const sedenaBooks: Book[] = [
    { title: 'Taller de Lectura y Redacción' },
    { title: 'Álgebra', link: 'https://drive.google.com/file/d/1IIOwF6uiLStuZ7M-UOi12YIj6EwG50Pk/preview?usp=sharing' },
    { title: 'Historia Universal', link: 'https://drive.google.com/file/d/1-bRRc1g8zHw5735guq1GrwoE63PWzDa6/preview?usp=sharing' },
    { title: 'Geografía Moderna de México' },
    { title: 'Biologia', link: 'https://drive.google.com/file/d/1-QRBcZS5b5Mhj-Zyt28Qq27DuWH-XEIp/preview?usp=sharing' },
    { title: 'Quimica' },
    { title: 'Fisica General' },
    { title: 'Cálculo, una variable' },
    { title: 'Álgebra, Trigonometría y Geometría' },
    { title: 'Geometría Analítica', link: 'https://drive.google.com/file/d/11cnv-dL3ZO6R8xfv24gJCluSPkKGmlN4/preview?usp=sharing' },
    { title: 'Cálculo Teoría y Aplicaciones' },
    { title: 'Metodología de la Investigación. Serie integral por competencias.' }
  ];

  const semarBooks: Book[] = [
    { title: 'Pensamiento Matemático (EXANI II)' },
    { title: 'Redacción Indirecta (EXANI II)' },
    { title: 'Comprensión Lectora (EXANI II)' },
    { title: 'Inglés como Lengua Extranjera (EXANI II)' },
    { title: 'Módulo de Premedicina (Opcional)' },
    { title: 'Módulo de Ciencias de la Salud (Opcional)' }
  ];

  const filteredSedena = sedenaBooks.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));
  const filteredSemar = semarBooks.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

  const showSedena = (filter === 'ALL' || filter === 'SEDENA') && filteredSedena.length > 0;
  const showSemar = (filter === 'ALL' || filter === 'SEMAR') && filteredSemar.length > 0;
  const noResults = !showSedena && !showSemar;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-4xl mx-auto"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black tracking-tighter uppercase text-primary-ink">Libros</h2>
        <div className="w-12 h-1 bg-primary-ink mt-3 mx-auto"></div>
      </div>

      <div className="flex flex-col gap-4 mb-12">
        <div className="relative">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
          <input 
            type="text"
            placeholder="BUSCAR LIBROS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/20 py-4 pl-12 pr-4 text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'SEDENA', 'SEMAR'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`flex-1 py-2 text-[10px] font-black tracking-widest uppercase border transition-all ${
                filter === f 
                  ? 'bg-primary-ink text-surface-container-lowest border-primary-ink' 
                  : 'bg-surface-container-lowest text-outline border-outline-variant/20 hover:bg-surface-container-low'
              }`}
            >
              {f === 'ALL' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      {showSedena && (
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-sm font-bold tracking-[0.2em] text-sedena uppercase">SEDENA</h3>
            <div className="flex-grow h-[1px] bg-outline-variant opacity-20"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredSedena.map((book, i) => (
              <div 
                key={i} 
                onClick={() => book.link && window.open(book.link, '_blank')}
                className={`aspect-[3/4] border border-outline-variant/30 p-4 transition-all duration-300 flex flex-col justify-end cursor-pointer border-l-4 border-l-sedena bg-surface-container-lowest ${book.link ? 'hover:bg-surface-container-low hover:shadow-lg' : 'opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex-1 flex items-start justify-end">
                  {book.link && <Icon name="open_in_new" className="text-sedena/40 text-sm" />}
                </div>
                <h4 className="text-sm font-bold tracking-tight leading-tight uppercase">{book.title}</h4>
                {!book.link && <p className="text-[8px] font-bold text-outline mt-2 uppercase tracking-widest">Próximamente</p>}
              </div>
            ))}
          </div>
          <a 
            href="https://t.me/+VdK0kZqPoxJ7cmlc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-8 w-full py-4 border-2 border-dashed border-outline-variant/30 flex items-center justify-center gap-3 text-outline hover:bg-surface-container-low transition-colors group"
          >
            <Icon name="add_circle" className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Aportar Libros (Telegram)</span>
          </a>
        </section>
      )}

      {showSemar && (
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-sm font-bold tracking-[0.2em] text-semar uppercase">SEMAR</h3>
            <div className="flex-grow h-[1px] bg-outline-variant opacity-20"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredSemar.map((book, i) => (
              <div 
                key={i} 
                onClick={() => book.link && window.open(book.link, '_blank')}
                className={`aspect-[3/4] border border-outline-variant/30 p-4 transition-all duration-300 flex flex-col justify-end cursor-pointer border-l-4 border-l-semar bg-surface-container-lowest ${book.link ? 'hover:bg-surface-container-low hover:shadow-lg' : 'opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex-1 flex items-start justify-end">
                  {book.link && <Icon name="open_in_new" className="text-semar/40 text-sm" />}
                </div>
                <h4 className="text-sm font-bold tracking-tight leading-tight uppercase">{book.title}</h4>
                {!book.link && <p className="text-[8px] font-bold text-outline mt-2 uppercase tracking-widest">Próximamente</p>}
              </div>
            ))}
          </div>
          <a 
            href="https://t.me/+VdK0kZqPoxJ7cmlc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-8 w-full py-4 border-2 border-dashed border-outline-variant/30 flex items-center justify-center gap-3 text-outline hover:bg-surface-container-low transition-colors group"
          >
            <Icon name="add_circle" className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Aportar Libros (Telegram)</span>
          </a>
        </section>
      )}

      {noResults && (
        <div className="text-center py-20 opacity-40">
          <Icon name="search_off" className="text-6xl mb-4" />
          <p className="text-xs font-bold tracking-widest uppercase">No se encontraron libros</p>
        </div>
      )}
    </motion.div>
  );
};

const ChecklistView = ({ institution, setInstitution }: { institution: Institution, setInstitution: (i: Institution) => void }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('cadete_checklist') || '{}');
    setCheckedItems(saved);
  }, []);

  const toggleItem = (id: string) => {
    const newChecked = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(newChecked);
    localStorage.setItem('cadete_checklist', JSON.stringify(newChecked));
  };

  const sedenaDocs = [
    { id: 'sedena-curp', title: 'CURP', desc: 'Clave Única de Registro de Población.' },
    { id: 'sedena-cartilla', title: 'Cartilla Militar', desc: 'Obligatoria para hombres y mujeres civiles.' },
    { id: 'sedena-ine', title: 'INE', desc: 'Identificación oficial con domicilio coincidente.' },
    { id: 'sedena-matrimonio', title: 'Inexistencia de Matrimonio', desc: 'Antigüedad no mayor a 3 meses al 1 de Sept.' },
    { id: 'sedena-bachillerato', title: 'Certificado Bachillerato', desc: 'Original (prórroga hasta 31 Oct si entregó constancia).' },
    { id: 'sedena-acta', title: 'Acta de Nacimiento', desc: '3 copias certificadas (antigüedad máx 3 meses).' },
    { id: 'sedena-penales', title: 'No Antecedentes Penales', desc: 'Fecha posterior al 1 de Agosto 2026.' },
    { id: 'sedena-domicilio', title: 'Comprobante Domicilio', desc: 'Luz, agua o predial (después de 1 Junio 2026).' },
    { id: 'sedena-vacunacion', title: 'Cartilla Vacunación', desc: 'Esquema completo Hepatitis B.' },
    { id: 'sedena-analisis', title: 'Análisis Clínicos', desc: 'Antigüedad máx 7 días al 1 Sept (VIH, VDRL, etc.).' },
  ];

  const semarDocs = [
    { id: 'semar-certificado', title: 'Certificado o Constancia', desc: 'Debe incluir el promedio general obtenido.' },
    { id: 'semar-promedio', title: 'Promedio Mínimo', desc: 'Mínimo de 7.0 para nivel profesional.' },
    { id: 'semar-penales', title: 'Antecedentes Penales Fed.', desc: 'Tramitar especificando SEMAR como solicitante.' },
    { id: 'semar-vacunacion', title: 'Esquema Vacunación', desc: 'COVID-19, Tétanos, Difteria y Tosferina.' },
  ];

  const currentDocs = institution === 'SEDENA' ? sedenaDocs : semarDocs;
  const completedCount = currentDocs.filter(d => checkedItems[d.id]).length;
  const progress = Math.round((completedCount / currentDocs.length) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-24 pb-32 px-6 max-w-2xl mx-auto"
    >
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-black tracking-tighter text-primary-ink uppercase leading-none">Documentación</h2>
        <div className="h-1 w-12 bg-primary mt-4 mx-auto"></div>
      </div>

      <div className="flex w-full mb-8 border border-outline-variant/20 p-1 bg-surface-container-low">
        <button 
          onClick={() => setInstitution('SEDENA')}
          className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200 ${institution === 'SEDENA' ? 'bg-primary-ink text-surface-container-lowest' : 'text-outline hover:bg-surface-container'}`}
        >
          SEDENA
        </button>
        <button 
          onClick={() => setInstitution('SEMAR')}
          className={`flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200 ${institution === 'SEMAR' ? 'bg-primary-ink text-surface-container-lowest' : 'text-outline hover:bg-surface-container'}`}
        >
          SEMAR
        </button>
      </div>

      <div className="bg-primary-ink p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-surface-container-lowest/60 uppercase">Avance Total</p>
          <span className="text-3xl font-black text-surface-container-lowest">{progress}%</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-widest text-surface-container-lowest/60 uppercase">Documentos</p>
          <span className="text-xl font-black text-surface-container-lowest">{completedCount} / {currentDocs.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {currentDocs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => toggleItem(doc.id)}
            className={`w-full text-left p-5 border transition-all flex items-start gap-4 ${
              checkedItems[doc.id] 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-surface-container-lowest border-outline-variant/20 hover:border-primary/40'
            }`}
          >
            <div className={`mt-1 flex-shrink-0 w-6 h-6 border-2 flex items-center justify-center transition-colors ${
              checkedItems[doc.id] ? 'bg-green-600 border-green-600' : 'border-outline-variant'
            }`}>
              {checkedItems[doc.id] && <Icon name="check" className="text-white !text-sm" />}
            </div>
            <div>
              <h4 className={`text-sm font-bold uppercase tracking-tight ${checkedItems[doc.id] ? 'text-green-600' : 'text-primary-ink'}`}>
                {doc.title}
              </h4>
              <p className={`text-[10px] leading-relaxed mt-1 ${checkedItems[doc.id] ? 'text-green-600/70' : 'text-outline'}`}>
                {doc.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

const ConvocatoriaView = ({ institution, setInstitution }: { institution: Institution, setInstitution: (i: Institution) => void }) => {
  // Rutas locales para funcionamiento offline (asumiendo que los archivos están en /public)
  const pdfUrls = {
    SEDENA: 'https://www.gob.mx/cms/uploads/attachment/file/946351/CONVOCATORIA_S.E.M._2025.pdf',
    SEMAR: 'https://www.gob.mx/cms/uploads/attachment/file/890412/CONVOCATORIA_AS_2024.pdf'
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 pb-32 px-4 md:px-6 max-w-4xl mx-auto min-h-screen flex flex-col"
    >
      <div className="mb-6 flex flex-col gap-6">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tighter text-primary-ink uppercase leading-none">Convocatoria</h2>
          <div className="h-1 w-12 bg-primary mt-3"></div>
        </div>
        
        <div className="flex w-full bg-surface-container-low p-1 border border-outline-variant/20">
          <button 
            onClick={() => setInstitution('SEDENA')}
            className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase transition-all ${institution === 'SEDENA' ? 'bg-primary-ink text-surface-container-lowest' : 'text-outline hover:bg-surface-container-high'}`}
          >
            SEDENA
          </button>
          <button 
            onClick={() => setInstitution('SEMAR')}
            className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase transition-all ${institution === 'SEMAR' ? 'bg-primary-ink text-surface-container-lowest' : 'text-outline hover:bg-surface-container-high'}`}
          >
            SEMAR
          </button>
        </div>
      </div>

      <div className="flex-1 bg-surface-container-lowest border border-outline-variant/20 relative overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-3 md:p-4 bg-surface-container-low border-b border-outline-variant/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Icon name="cloud_done" className="text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Documento Oficial en Línea</span>
          </div>
          <a 
            href={pdfUrls[institution]} 
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-ink text-surface-container-lowest px-4 py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-colors"
          >
            <Icon name="open_in_new" className="!text-sm" />
            Abrir en pestaña nueva
          </a>
        </div>
        
        <div className="flex-1 w-full bg-surface-container-highest relative">
          <iframe 
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrls[institution])}&embedded=true`}
            className="absolute inset-0 w-full h-full border-none"
            title="Visor de Convocatoria"
          />
        </div>
      </div>
      
      <p className="mt-4 text-[9px] text-outline text-center uppercase font-bold tracking-widest px-4">
        Nota: Si el visor no carga, usa el botón "Abrir" para ver el documento oficial directamente.
      </p>
    </motion.div>
  );
};

const PerfilView = ({ theme, setTheme, userData, onLogout, onDeleteAccount }: { theme: Theme, setTheme: (t: Theme) => void, userData: UserData | null, onLogout: () => void, onDeleteAccount: () => void }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-14 sm:pt-24 pb-32 px-4 sm:px-6 max-w-2xl mx-auto"
    >
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <Icon name="warning" className="!text-3xl" />
              </div>
              <h3 className="text-xl font-black text-primary-ink uppercase tracking-tight mb-2">¿Eliminar cuenta?</h3>
              <p className="text-xs text-outline font-bold uppercase tracking-widest leading-relaxed mb-8">
                Esta acción es irreversible. Se borrarán todos tus datos de progreso y registro de forma permanente de nuestra base de datos.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    onDeleteAccount();
                    setShowDeleteConfirm(false);
                  }}
                  className="w-full py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-700 transition-colors"
                >
                  Confirmar Eliminación
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 bg-surface-container-low text-outline text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Section - More refined and minimalist */}
      <section className="mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-6 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl shadow-sm text-center sm:text-left">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary/10">
              <img 
                alt={userData?.name || 'Aspirante'} 
                className="w-full h-full object-cover grayscale" 
                src={`https://picsum.photos/seed/${userData?.email || 'military'}/200/200`}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black tracking-tight text-primary-ink uppercase leading-tight">{userData?.name || 'ASPIRANTE'}</h2>
            <p className="text-[10px] sm:text-xs font-bold tracking-widest text-outline uppercase mt-0.5">{userData?.email || 'SIN REGISTRO'}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full">
              <Icon name="verified" className="text-[10px] text-primary" />
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Aspirante Activo</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Section */}
        {userData && (
          <section className="space-y-4">
            <h3 className="text-[9px] font-black tracking-[0.3em] text-outline uppercase px-1">Expediente</h3>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden divide-y divide-outline-variant/5">
              {[
                { label: 'Institución', value: userData.institution.join(' & '), icon: 'account_balance' },
                { label: 'Escuela', value: userData.school || 'NO ESPECIFICADA', icon: 'school' },
                { label: 'Estado', value: userData.state, icon: 'map' },
                { label: 'Género', value: userData.gender === 'H' ? 'HOMBRE' : 'MUJER', icon: 'person' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 hover:bg-surface-container-low/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                    <Icon name={item.icon} className="!text-lg" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[7px] font-black uppercase tracking-widest text-outline/60">{item.label}</span>
                    <span className="text-[11px] font-bold text-primary-ink uppercase truncate">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Theme & Actions Section */}
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-[9px] font-black tracking-[0.3em] text-outline uppercase px-1">Personalización</h3>
            <div className="flex p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 gap-1">
              {[
                { id: 'light', icon: 'light_mode', label: 'Claro' },
                { id: 'dark', icon: 'dark_mode', label: 'Oscuro' },
                { id: 'system', icon: 'settings_brightness', label: 'Auto' }
              ].map((t) => (
                <button 
                  key={t.id}
                  onClick={() => setTheme(t.id as Theme)}
                  className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all ${theme === t.id ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-outline/60 hover:text-outline'}`}
                >
                  <Icon name={t.icon} className="!text-lg mb-1" />
                  <span className="text-[7px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[9px] font-black tracking-[0.3em] text-red-600 uppercase px-1">Seguridad</h3>
            <div className="space-y-2">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl hover:bg-red-50/50 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                  <Icon name="logout" className="!text-lg" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 flex-1 text-left">Cerrar sesión</span>
                <Icon name="chevron_right" className="text-red-300 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl hover:bg-red-50/50 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                  <Icon name="delete_forever" className="!text-lg" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 flex-1 text-left">Eliminar cuenta</span>
                <Icon name="chevron_right" className="text-red-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>('home');
  const [institution, setInstitution] = useState<Institution>('SEDENA');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cadete_theme') as Theme;
    return saved || 'system';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            setUserData(null);
            // If logged in but not registered, force registration view if not on home
            if (view !== 'home') setView('registro');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [view]);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: Theme) => {
      root.classList.remove('light', 'dark');
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(t);
      }
    };

    applyTheme(theme);
    localStorage.setItem('cadete_theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Error signing in with Google:", error);
      
      if (error.code === 'auth/unauthorized-domain') {
        alert("Error: El dominio 'operacioncadete.vercel.app' no está autorizado en Firebase. Debes agregarlo en la consola de Firebase > Authentication > Settings > Authorized domains.");
      } else {
        alert(`Error al iniciar sesión: ${error.message}`);
      }
    }
  };

  const handleRegister = (data: UserData) => {
    setUserData(data);
    setView('home');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setView('home');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // Get user data before deleting to know what to decrement
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        const statsRef = doc(db, 'metadata', 'stats');
        const statsUpdate: any = {
          total: increment(-1),
          [`states.${data.state}`]: increment(-1),
          [`genders.${data.gender}`]: increment(-1)
        };
        data.institution.forEach(inst => {
          statsUpdate[`institutions.${inst}`] = increment(-1);
        });
        if (data.school) {
          statsUpdate[`schools.${data.school}`] = increment(-1);
        }
        await updateDoc(statsRef, statsUpdate);
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      // Then delete from Auth
      await user.delete();
      setUserData(null);
      setUser(null);
      setView('home');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert("Esta operación es sensible y requiere un inicio de sesión reciente. Por favor, vuelve a iniciar sesión e intenta de nuevo.");
        await signOut(auth);
      } else {
        alert("Error al eliminar la cuenta de la base de datos.");
      }
    }
  };

  const getTitle = () => {
    switch(view) {
      case 'home': return 'Operación Cadete';
      case 'calendario': return 'Calendario';
      case 'herramientas': return 'Herramientas';
      case 'simulador': return 'Simulador';
      case 'perfil': return 'Perfil';
      case 'libros': return 'Libros';
      case 'imc': return 'Calculadora IMC';
      case 'pomodoro': return 'Pomodoro';
      case 'requisitos': return 'Requisitos';
      case 'checklist': return 'Documentación';
      case 'convocatoria': return 'Convocatoria PDF';
      case 'simulador-fisico': return 'Simulador Físico';
      case 'historial': return 'Historial';
      case 'simulador-demo': return 'Examen Demo';
      case 'registro': return 'Registro';
      case 'motivos-exclusion': return 'Motivos de Exclusión';
      case 'compras': return 'Tienda de Artículos';
      default: return 'Operación Cadete';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-6"></div>
        <h1 className="text-xl font-black text-primary-ink uppercase tracking-tighter">Operación Cadete</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      {view === 'home' && <Header title={getTitle()} />}
      
      <main className="flex flex-col">
        {view === 'home' && <HomeView setView={setView} setInstitution={setInstitution} user={user} userData={userData} />}
        {view === 'calendario' && <CalendarioView setView={setView} institution={institution} setInstitution={setInstitution} />}
        {view === 'herramientas' && <HerramientasView setView={setView} />}
        {view === 'simulador' && <SimuladorView setView={setView} />}
        {view === 'perfil' && (
          user ? (
            <PerfilView theme={theme} setTheme={setTheme} userData={userData} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />
          ) : (
            <div className="pt-32 px-6 text-center max-w-md mx-auto">
              <Icon name="account_circle" className="text-8xl text-outline-variant mb-6" />
              <h2 className="text-3xl font-black text-primary-ink uppercase mb-4">Inicia Sesión</h2>
              <p className="text-sm text-outline mb-10 uppercase font-bold tracking-widest">Para ver tu perfil y guardar tu progreso, inicia sesión con Google.</p>
              <button 
                onClick={handleGoogleLogin}
                className="w-full py-5 bg-white border border-outline-variant/30 flex items-center justify-center gap-4 hover:bg-surface-container-low transition-all shadow-lg"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-widest text-primary-ink">Continuar con Google</span>
              </button>
            </div>
          )
        )}
        {view === 'libros' && <LibrosView />}
        {view === 'imc' && <IMCView />}
        {view === 'pomodoro' && <PomodoroView />}
        {view === 'requisitos' && <RequisitosView />}
        {view === 'checklist' && <ChecklistView institution={institution} setInstitution={setInstitution} />}
        {view === 'convocatoria' && <ConvocatoriaView institution={institution} setInstitution={setInstitution} />}
        {view === 'simulador-fisico' && <SimuladorFisicoView setView={setView} user={user} />}
        {view === 'historial' && <HistorialView user={user} />}
        {view === 'simulador-demo' && <SimuladorDemoView setView={setView} user={user} />}
        {view === 'motivos-exclusion' && <MotivosExclusionView setView={setView} />}
        {view === 'compras' && <ComprasView setView={setView} />}
        {view === 'registro' && (
          user ? (
            <RegistroView user={user} onRegister={handleRegister} />
          ) : (
            <div className="pt-32 px-6 text-center max-w-md mx-auto">
              <Icon name="lock" className="text-8xl text-outline-variant mb-6" />
              <h2 className="text-3xl font-black text-primary-ink uppercase mb-4">Acceso Restringido</h2>
              <p className="text-sm text-outline mb-10 uppercase font-bold tracking-widest">Inicia sesión con Google para completar tu registro y acceder a todo el contenido.</p>
              <button 
                onClick={handleGoogleLogin}
                className="w-full py-5 bg-white border border-outline-variant/30 flex items-center justify-center gap-4 hover:bg-surface-container-low transition-all shadow-lg"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-widest text-primary-ink">Iniciar con Google</span>
              </button>
            </div>
          )
        )}
      </main>

      <FloatingNav currentView={view} setView={setView} isRegistered={!!userData} />
    </div>
  );
}
