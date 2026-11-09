import { PauseCircle } from 'lucide-react';
import { useStore } from '../store';
import { blockedBy, SWITCH_LABEL } from '../ops';
import type { SwitchModule } from '../types';

/** Shown to the client when the MAGNET team has paused a module. Settings and data are untouched. */
export default function OpsBanner({ module }: { module: SwitchModule }) {
  const { state } = useStore();
  const k = blockedBy(state, module);
  if (!k) return null;
  return (
    <div className="banner banner-amber ops-banner" role="status">
      <PauseCircle size={18} aria-hidden />
      <span>
        <strong>{SWITCH_LABEL[module]} temporarily paused by the MAGNET team.</strong> We’re looking into a problem{k.scope === 'global' ? ' that affects all accounts' : ''}. Nothing new is sent until it’s resolved. Your settings and data are kept.
      </span>
    </div>
  );
}
