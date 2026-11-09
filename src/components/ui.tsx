import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Sparkles, X } from 'lucide-react';
import DemoControls from './DemoControls';
import LocalePicker from './LocalePicker';
import { t } from '../i18n/locale';
import type { PersonaId } from '../types';
import type { CampaignStatus, ExecutionStatus, FlowStatus, LeadStatus, ClosedReason, PostStatus } from '../types';

export const LEAD_STATUSES: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'New conversation' },
  { id: 'interested', label: 'Interested' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'booked', label: 'Appointment booked' },
  { id: 'closed', label: 'Closed' },
];
export const leadLabel = (s: LeadStatus) => LEAD_STATUSES.find((x) => x.id === s)!.label;

/** Refresh lead-stage labels in the active language; stage 4 depends on the business type. */
export function applyStage4Label(persona: PersonaId) {
  LEAD_STATUSES[0].label = t('lead.new');
  LEAD_STATUSES[1].label = t('lead.interested');
  LEAD_STATUSES[2].label = t('lead.qualified');
  LEAD_STATUSES[3].label = t(`stage4.${persona}`);
  LEAD_STATUSES[4].label = t('lead.closed');
}
export const CLOSED_REASONS: { id: ClosedReason; label: string }[] = [
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'not_a_fit', label: 'Not a fit' },
];

export const FLOW_STATUS_LABEL: Record<FlowStatus, string> = {
  draft: 'Draft',
  waiting_for_post: 'Waiting for post',
  active: 'Active',
  paused: 'Paused',
  needs_attention: 'Needs attention',
};

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'accent' | 'violet';

export function Badge({ tone = 'neutral', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" aria-hidden />}
      {children}
    </span>
  );
}

export function FlowStatusBadge({ status }: { status: FlowStatus }) {
  const tone: Record<FlowStatus, Tone> = { draft: 'neutral', waiting_for_post: 'blue', active: 'green', paused: 'amber', needs_attention: 'red' };
  return <Badge tone={tone[status]} dot>{FLOW_STATUS_LABEL[status]}</Badge>;
}

export function CampaignBadge({ status }: { status: CampaignStatus }) {
  const map: Record<CampaignStatus, [Tone, string]> = { draft: ['neutral', 'Not started'], active: ['green', 'Active'], paused: ['amber', 'Paused'] };
  return <Badge tone={map[status][0]} dot>{map[status][1]}</Badge>;
}

export function ExecBadge({ status }: { status: ExecutionStatus }) {
  const tone: Record<ExecutionStatus, Tone> = { Triggered: 'blue', 'Waiting for interaction': 'blue', Sent: 'green', Suppressed: 'neutral', Failed: 'red', Blocked: 'amber' };
  return <Badge tone={tone[status]}>{status}</Badge>;
}

export function LeadBadge({ status, reason }: { status: LeadStatus; reason?: ClosedReason }) {
  const tone: Record<LeadStatus, Tone> = { new: 'neutral', interested: 'blue', qualified: 'violet', booked: 'green', closed: 'neutral' };
  const r = reason ? ` · ${CLOSED_REASONS.find((x) => x.id === reason)?.label}` : '';
  return <Badge tone={tone[status]}>{leadLabel(status)}{r}</Badge>;
}

export function PostBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, [Tone, string]> = { draft: ['neutral', 'Draft'], scheduled: ['blue', 'Scheduled'], published: ['green', 'Published'], failed: ['red', 'Failed'] };
  return <Badge tone={map[status][0]}>{map[status][1]}</Badge>;
}

export function AiTag({ children = 'AI' }: { children?: ReactNode }) {
  return (
    <span className="ai-tag">
      <Sparkles size={12} aria-hidden />
      {children}
    </span>
  );
}

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  // First and last name, so "Lotte de Vries" becomes "LV"
  const parts = name.split(' ').filter(Boolean);
  const initials = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.[0] ?? '').toUpperCase();
  return (
    <span className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials}
    </span>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, textarea, select, button:not(.modal-close)');
    (first ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, error }: { label: string; hint?: string; children: ReactNode; error?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {description && <span className="field-hint">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-title">
        {eyebrow}
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      <div className="page-actions">
        {actions}
        <span className="page-demo">
          <LocalePicker />
          <DemoControls />
        </span>
      </div>
    </header>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipInput({ values, onChange, placeholder, label }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; label: string }) {
  return (
    <div className="chip-input">
      <div className="chips">
        {values.map((v) => (
          <span key={v} className="chip">
            {v}
            <button aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label={label}
        placeholder={placeholder}
        onKeyDown={(e) => {
          const t = e.currentTarget;
          if (e.key === 'Enter' && t.value.trim()) {
            e.preventDefault();
            if (!values.includes(t.value.trim())) onChange([...values, t.value.trim()]);
            t.value = '';
          }
        }}
      />
    </div>
  );
}

export function Skeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading">
      <div className="sk sk-title" />
      <div className="sk-row">
        <div className="sk sk-card" />
        <div className="sk sk-card" />
        <div className="sk sk-card" />
      </div>
      <div className="sk sk-block" />
    </div>
  );
}

export function timeAgo(t: number): string {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export function dateTime(t: number): string {
  return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
