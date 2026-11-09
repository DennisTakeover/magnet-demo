import { Lock } from 'lucide-react';
import { useStore } from '../store';
import { money } from '../i18n/locale';
import { MODULES, missingDependencies, moduleName, quote } from '../billing';
import { PageHeader, formatDate } from '../components/ui';
import type { ModuleId } from '../types';

/** Route segment → module that unlocks it */
export const GATED: Record<string, ModuleId> = { grow: 'grow', flows: 'flows', comments: 'comments', planner: 'planner' };

/** Contextual upgrade (MKT-02): price and limits visible, saved data kept, declining never blocks other features. */
export default function LockedModule({ module }: { module: ModuleId }) {
  const { state } = useStore();
  const m = MODULES.find((x) => x.id === module)!;
  const deps = missingDependencies([...state.billing.modules, module]);
  const q = quote(state, [...state.billing.modules, module, ...deps.map((d) => d.needs)]);
  const ended = state.billing.status === 'ended';

  return (
    <>
      <PageHeader title={m.name} subtitle={m.desc} />
      <section className="card locked-card">
        <span className="locked-icon"><Lock size={24} aria-hidden /></span>
        <h2>{ended ? 'Your subscription has ended' : `${m.name} isn’t in your plan`}</h2>
        <p className="muted">
          {ended
            ? 'Reactivate to use this module again. Everything you saved here is kept.'
            : `Add it for ${money(m.priceUsd)} per month${deps.length ? ` (needs ${deps.map((d) => moduleName(d.needs)).join(', ')})` : ''}. Anything you saved here before is kept.`}
        </p>
        {!ended && state.billing.status === 'active' && (
          <p className="small">Charged today for the rest of this period: <strong>{money(q.chargeNowUsd)}</strong>. Next charge {formatDate(state.billing.periodEnd)}: {money(q.nextUsd)}/month.</p>
        )}
        <div className="row gap-sm center">
          <a className="btn btn-primary" href="#/app/billing">{ended ? 'Go to billing' : `Add ${m.name} in Billing`}</a>
          <a className="btn btn-ghost" href="#/app/overview">Not now</a>
        </div>
      </section>
    </>
  );
}
