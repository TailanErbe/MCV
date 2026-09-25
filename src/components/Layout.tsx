import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Users,
  Wallet,
  X,
  ClipboardList,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import { PROFILE_LABELS, PROFILES, SEDE, canAccess, homeFor, isReadOnly, type Profile } from '../lib/profiles';
import { useStore } from '../state/store';
import { TransactionEditorProvider } from './TransactionEditor';
import { ConfirmDialog, ToastRegion } from './ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}assets/logo-igreja.jpeg`;

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Módulos visíveis em cada perfil simulado.
const NAV_BY_PROFILE: Record<Profile, NavItem[]> = {
  sede: [
    { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
    { to: '/financeiro', label: 'Financeiro', icon: Wallet },
    { to: '/documentos', label: 'Documentos financeiros', icon: FileText },
    { to: '/relatorios', label: 'Relatórios', icon: ClipboardList },
  ],
  congregacao: [
    { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
    { to: '/financeiro', label: 'Financeiro', icon: Wallet },
    { to: '/documentos', label: 'Recibos', icon: FileText },
    { to: '/relatorios', label: 'Relatórios', icon: ClipboardList },
  ],
  secretaria: [
    { to: '/pessoas', label: 'Pessoas e carteirinhas', icon: Users },
    { to: '/documentos', label: 'Cartas e declarações', icon: FileText },
  ],
};

const DEMO_NOTICE = 'Demonstração • dados fictícios';

export function Layout() {
  const { data, resetDemo, storageOk, profile, unit, readOnly, setView, notify } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const congregations = data.congregations.filter((c) => c !== SEDE);
  const allowed = canAccess(location.pathname, profile, unit);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Troca feita pelo seletor: a tela anterior pode ser incompatível por um instante, sem aviso.
  const switching = useRef(false);

  // Endereço digitado fora do perfil: volta para uma tela permitida (simulação, não segurança).
  useEffect(() => {
    if (allowed) {
      switching.current = false;
      return;
    }
    if (!switching.current) notify(`Essa tela não faz parte do perfil ${PROFILE_LABELS[profile]} nesta simulação.`);
    navigate(homeFor(profile), { replace: true });
  }, [allowed, profile, navigate, notify]);

  function changeProfile(next: Profile) {
    if (next === profile) return;
    switching.current = true;
    const nextUnit = next === 'congregacao' ? congregations[0] : SEDE;
    setView(next, nextUnit);
    setMenuOpen(false);
    navigate(homeFor(next));
    notify(`Visualizando como ${PROFILE_LABELS[next]}${next === 'congregacao' ? ` · ${nextUnit}` : ''}.`);
  }

  function changeUnit(nextUnit: string) {
    if (nextUnit === unit) return;
    switching.current = true;
    setView(profile, nextUnit);
    setMenuOpen(false);
    // Mantém a seção atual (ex.: Financeiro) se ela existir para a nova unidade.
    const section = `/${location.pathname.split('/')[1] ?? ''}`;
    navigate(canAccess(section, profile, nextUnit) ? section : homeFor(profile));
    notify(`Unidade: ${nextUnit}${isReadOnly(profile, nextUnit) ? ' (somente consulta)' : ''}.`);
  }

  const unitOptions = profile === 'sede' ? data.congregations : congregations;

  return (
    <div className={`app ${menuOpen ? 'menu-open' : ''}`}>
      <header className="topbar">
        <button
          type="button"
          className="icon-button topbar-menu"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="sidebar"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <div className="topbar-name">
          <strong>{data.settings.compactName}</strong>
          <span>{DEMO_NOTICE}</span>
        </div>
      </header>

      <div className="backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <aside id="sidebar" className="sidebar" aria-label="Menu principal">
        <button
          type="button"
          className="icon-button sidebar-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="brand">
          <img
            src={LOGO_SRC}
            width={1600}
            height={834}
            alt="Igreja Evangélica Assembleia de Deus — Ministério Celebrando a Vitória"
          />
        </div>

        <div className="profile-switch" role="group" aria-labelledby="profile-switch-title">
          <p className="profile-switch-title" id="profile-switch-title">
            Simulação de perfil
          </p>
          <label htmlFor="profile-select">Visualizar como</label>
          <select id="profile-select" value={profile} onChange={(e) => changeProfile(e.target.value as Profile)}>
            {PROFILES.map((p) => (
              <option key={p} value={p}>
                {PROFILE_LABELS[p]}
              </option>
            ))}
          </select>
          <label htmlFor="unit-select">Unidade</label>
          {profile === 'secretaria' ? (
            <p className="profile-static" id="unit-select">
              Sede · cadastro geral
            </p>
          ) : (
            <select id="unit-select" value={unit} onChange={(e) => changeUnit(e.target.value)}>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {/* Nome curto para caber no menu; o nome completo aparece na linha de identificação. */}
                  {u === SEDE ? u : `${u.replace(/^Congregação /, '')}${profile === 'sede' ? ' (consulta)' : ''}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <nav className="nav">
          {NAV_BY_PROFILE[profile].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="demo-notice">{DEMO_NOTICE}</p>
          {profile !== 'congregacao' && (
            <NavLink to="/configuracoes" className="nav-link nav-link-secondary">
              <SettingsIcon size={17} aria-hidden="true" />
              Configurações da igreja
            </NavLink>
          )}
          {!storageOk && (
            <p className="storage-warning">
              Este navegador não está guardando as alterações. Ao recarregar a página, a demonstração volta ao início.
            </p>
          )}
          <button type="button" className="button button-ghost" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={16} aria-hidden="true" />
            Restaurar demonstração
          </button>
        </div>
      </aside>

      {/* A chave fecha formulários e prévias abertos ao trocar de perfil ou unidade. */}
      <TransactionEditorProvider key={`${profile}|${unit}`}>
        <main className="content" id="conteudo">
          <p className="profile-context no-print">
            <span>Simulação de perfil:</span> <strong>{PROFILE_LABELS[profile]}</strong>
            <span aria-hidden="true"> · </span>
            <span>Unidade:</span> <strong>{profile === 'secretaria' ? 'Sede (cadastro geral)' : unit}</strong>
            {readOnly && <span className="readonly-tag">Somente consulta</span>}
          </p>
          {allowed ? <Outlet /> : null}
        </main>
      </TransactionEditorProvider>

      <ConfirmDialog
        open={confirmReset}
        title="Restaurar demonstração?"
        message="As alterações de teste deste navegador serão apagadas."
        confirmLabel="Restaurar"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetDemo();
        }}
      />
      <ToastRegion />
    </div>
  );
}
