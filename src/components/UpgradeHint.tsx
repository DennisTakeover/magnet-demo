import { Fragment, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { clientLog, useStore } from '../store';
import { money } from '../i18n/locale';
import { MODULES, missingDependencies, namesOf } from '../billing';
import { entitledModules } from '../partners';
import { Modal } from './ui';
import type { ModuleId } from '../types';

interface Props {
  module: ModuleId;
  context: string;
  title: string;
  body: string;
  /** Rows of labelled example data shown in the preview */
  example: { label: string; value: string }[];
  limits?: string;
  /** Integration caveat shown up front when the capability is limited */
  caveat?: string;
}

/**
 * Contextual upgrade (MKT-02). Appears only where the missing module would help, shows price and limits,
 * uses clearly labelled example data and can be dismissed. Dismissing never blocks anything you already have.
 */
export default function UpgradeHint({ module, context, title, body, example, limits, caveat }: Props) {
  const { state, update } = useStore();
  const [preview, setPreview] = useState(false);
  const key = `${module}:${context}`;
  if (entitledModules(state).includes(module) || state.dismissedHints.includes(key) || state.billing.status !== 'active') return null;
  const m = MODULES.find((x) => x.id === module)!;
  const deps = missingDependencies([...state.billing.modules, module]).map((d) => d.needs);
  const price = m.priceUsd + deps.reduce((t, d) => t + MODULES.find((x) => x.id === d)!.priceUsd, 0);
  const dismiss = () => update((d) => {
    if (!d.dismissedHints.includes(key)) d.dismissedHints.push(key);
    clientLog(d, 'setting', `Dismissed upgrade hint for ${m.name}`);
  });
  return (
    <aside className="upgrade-hint" aria-label={`Suggestion: ${m.name}`}>
      <span className="upgrade-icon" aria-hidden><Sparkles size={18} /></span>
      <div className="upgrade-text">
        <strong>{title}</strong>
        <p className="small">{body}</p>
        <p className="xsmall muted">{m.name} · {money(price)}/month{deps.length ? ` (includes ${namesOf(deps)})` : ''}{limits ? ` · ${limits}` : ''}</p>
        {caveat && <p className="xsmall caveat">{caveat}</p>}
      </div>
      <div className="upgrade-actions">
        <button className="btn btn-sm btn-ghost" onClick={() => setPreview(true)}>See an example</button>
        <a className="btn btn-sm btn-primary" href={`#/app/${module}`}>Add {m.name}</a>
      </div>
      <button className="icon-btn upgrade-close" aria-label={`Not now: ${m.name}`} onClick={dismiss}><X size={16} /></button>
      {preview && (
        <Modal title={`${m.name}: example`} onClose={() => setPreview(false)} footer={<><button className="btn btn-ghost" onClick={() => setPreview(false)}>Close</button><a className="btn btn-primary" href={`#/app/${module}`} onClick={() => setPreview(false)}>Add for {money(price)}/month</a></>}>
          <p className="example-label">Example data · not your account</p>
          <dl className="kv compact">{example.map((r) => <Fragment key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></Fragment>)}</dl>
          {caveat && <p className="small caveat">{caveat}</p>}
          <p className="muted xsmall">You see the exact price and what changes before anything is charged.</p>
        </Modal>
      )}
    </aside>
  );
}
