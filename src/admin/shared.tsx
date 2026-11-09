import { useState } from 'react';
import { Field, Modal } from '../components/ui';
import type { AdminClient, State } from '../types';

/** The demo client's admin view is derived from the live client workspace. */
export function clientView(s: State, c: AdminClient): AdminClient {
  if (!c.isDemoClient) return c;
  return {
    ...c,
    campaign: s.campaign,
    connection: s.connection,
    aiMode: s.aiMode,
    name: s.business.name,
    owner: s.business.owner,
    dailyLimit: s.interactions.dailyLimit,
    subscription: s.billing.status === 'payment_issue' ? 'Past due' : 'Active',
    audienceSummary: `${s.audience.topics.join(', ')} · ${s.audience.languages.join(', ')} · ${s.audience.regions.join(', ')}`,
    flows: s.flows.map((f) => ({ id: f.id, name: f.name, status: f.status })),
  };
}

export function allClients(s: State): AdminClient[] {
  return s.clients.map((c) => clientView(s, c));
}

export function ReasonModal({ title, description, confirmLabel, onConfirm, onClose }: { title: string; description?: string; confirmLabel: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const submit = () => {
    setTouched(true);
    if (reason.trim().length < 5) return;
    onConfirm(reason.trim());
    onClose();
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>{confirmLabel}</button>
        </>
      }
    >
      {description && <p className="small">{description}</p>}
      <Field label="Reason (logged in Activity and visible to the team)" error={touched && reason.trim().length < 5 ? 'Please add a short reason' : undefined}>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}
