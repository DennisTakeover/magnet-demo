import { Fragment, useState } from 'react';
import { Eye, Lock, Mail, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { clientLog, navigate, uid, useStore } from '../store';
import { Avatar, Badge, Field, Modal, timeAgo } from '../components/ui';
import { LISTED, namesOf } from '../billing';
import { entitledModules } from '../partners';
import type { MemberPermissions, ModuleId, TeamMember } from '../types';

const PERMS: { k: keyof MemberPermissions; label: string; needs: ModuleId }[] = [
  { k: 'sendReplies', label: 'Send replies in the Inbox', needs: 'inbox' },
  { k: 'manageFlows', label: 'Create and switch Lead Flows on or off', needs: 'flows' },
  { k: 'publish', label: 'Schedule and publish posts', needs: 'planner' },
];

export function OwnerOnly() {
  return (
    <section className="card settings-card denied" role="tabpanel">
      <Lock size={20} aria-hidden />
      <h2>Only the account owner can manage the team</h2>
      <p className="small muted">Ask the owner if you need access to another module.</p>
    </section>
  );
}

export default function TeamTab() {
  const { state, update, toast } = useStore();
  const [invite, setInvite] = useState<TeamMember | 'new' | null>(null);
  const [remove, setRemove] = useState<TeamMember | null>(null);
  const owned = entitledModules(state).filter((m) => m !== 'core');

  const preview = (m: TeamMember) => {
    update((d) => { d.viewAs = m.id; });
    navigate('/app/overview');
    toast(`Previewing MAGNET as ${m.name}`, 'info');
  };

  return (
    <section className="card settings-card" role="tabpanel" aria-labelledby="team-h">
      <div className="card-head">
        <h2 id="team-h">Team</h2>
        <button className="btn btn-primary" onClick={() => setInvite('new')}><UserPlus size={16} /> Invite a member</button>
      </div>
      <p className="small muted">Members see only the modules you choose. Billing, cancellation, connections, the Partner Program and deleting the account stay with you.</p>
      <ul className="team-list">
        <li>
          <Avatar name={state.business.owner} color="#2855F8" size={36} />
          <div className="team-text"><strong>{state.business.owner}</strong><span className="muted xsmall">Owner · all modules, billing and account</span></div>
          <Badge tone="blue">Owner</Badge>
        </li>
        {state.team.map((m) => (
          <li key={m.id}>
            <Avatar name={m.name} color="#12805C" size={36} />
            <div className="team-text">
              <strong>{m.name}</strong>
              <span className="muted xsmall">{m.email} · {m.modules.length ? namesOf(m.modules) : 'Core pages only'}</span>
              <span className="muted xsmall">{PERMS.filter((p) => m.permissions[p.k] && m.modules.includes(p.needs)).map((p) => p.label).join(' · ') || 'View only'}</span>
            </div>
            {m.status === 'invited' ? <Badge tone="amber">Invited {timeAgo(m.invitedAt)}</Badge> : <Badge tone="green">Active</Badge>}
            <div className="row gap-sm wrap">
              {m.status === 'invited' && <>
                <button className="btn btn-sm btn-ghost" onClick={() => { update((d) => clientLog(d, 'setting', `Resent invite to ${m.email}`)); toast('Invite sent again (demo, no email sent)'); }}><Mail size={14} /> Resend</button>
                <button className="btn btn-sm btn-secondary" onClick={() => { update((d) => { d.team.find((x) => x.id === m.id)!.status = 'active'; clientLog(d, 'setting', `${m.name} accepted the invite (demo)`); }); toast(`${m.name} joined the workspace`); }}>Simulate accept</button>
              </>}
              {m.status === 'active' && <button className="btn btn-sm btn-secondary" onClick={() => preview(m)}><Eye size={14} /> Preview as {m.name.split(' ')[0]}</button>}
              <button className="btn btn-sm btn-ghost" onClick={() => setInvite(m)}>Edit access</button>
              <button className="icon-btn" aria-label={`Remove ${m.name}`} onClick={() => setRemove(m)}><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
      <p className="muted xsmall"><ShieldCheck size={12} aria-hidden /> Members sign in with their own account. Nobody shares your password or Instagram login.</p>
      {invite && <MemberModal member={invite === 'new' ? null : invite} owned={owned} onClose={() => setInvite(null)} />}
      {remove && (
        <Modal title={`Remove ${remove.name}?`} onClose={() => setRemove(null)} footer={<><button className="btn btn-ghost" onClick={() => setRemove(null)}>Cancel</button><button className="btn btn-danger" onClick={() => {
          update((d) => { d.team = d.team.filter((x) => x.id !== remove.id); if (d.viewAs === remove.id) d.viewAs = null; clientLog(d, 'setting', `Removed team member ${remove.name}`); });
          setRemove(null); toast(`${remove.name} no longer has access`);
        }}>Remove access</button></>}>
          <p className="small">{remove.name} loses access right away. Replies and notes they wrote stay in your workspace.</p>
        </Modal>
      )}
    </section>
  );
}

function MemberModal({ member, owned, onClose }: { member: TeamMember | null; owned: ModuleId[]; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [mods, setMods] = useState<ModuleId[]>(member?.modules ?? ['inbox'].filter((m) => owned.includes(m as ModuleId)) as ModuleId[]);
  const [perms, setPerms] = useState<MemberPermissions>(member?.permissions ?? { sendReplies: true, manageFlows: false, publish: false });
  const [touched, setTouched] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const dup = !member && state.team.some((m) => m.email.toLowerCase() === email.trim().toLowerCase());
  const save = () => {
    setTouched(true);
    if (!name.trim() || !emailOk || dup) return;
    update((d) => {
      const cleanPerms = { ...perms };
      PERMS.forEach((p) => { if (!mods.includes(p.needs)) cleanPerms[p.k] = false; });
      if (member) {
        Object.assign(d.team.find((x) => x.id === member.id)!, { name: name.trim(), modules: mods, permissions: cleanPerms });
        clientLog(d, 'setting', `Changed access for ${name.trim()}: ${namesOf(mods) || 'core pages only'}`);
      } else {
        d.team.push({ id: uid('tm'), name: name.trim(), email: email.trim(), modules: mods, permissions: cleanPerms, status: 'invited', invitedAt: Date.now() });
        clientLog(d, 'setting', `Invited ${email.trim()} as team member`);
      }
    });
    toast(member ? 'Access updated' : `Invite sent to ${email.trim()} (demo, no email sent)`, 'success');
    onClose();
  };
  return (
    <Modal title={member ? `Access for ${member.name}` : 'Invite a team member'} onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>{member ? 'Save access' : 'Send invite'}</button></>}>
      <div className="form-grid">
        <Field label="Name" error={touched && !name.trim() ? 'Required' : undefined}><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email" error={touched && (!emailOk ? 'Enter a valid email' : dup ? 'Already invited' : undefined) || undefined}><input type="email" value={email} disabled={!!member} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
      <fieldset className="check-group">
        <legend className="field-label">Modules they can use</legend>
        <p className="muted xsmall">Overview, Leads and Help are always included.</p>
        {LISTED.filter((m) => m.id !== 'core').map((m) => (
          <label key={m.id} className="check">
            <input type="checkbox" disabled={!owned.includes(m.id)} checked={mods.includes(m.id)} onChange={(e) => setMods(e.target.checked ? [...mods, m.id] : mods.filter((x) => x !== m.id))} />
            {m.name}{!owned.includes(m.id) && <span className="muted xsmall"> · not in your plan</span>}
          </label>
        ))}
      </fieldset>
      <fieldset className="check-group">
        <legend className="field-label">What they can do</legend>
        {PERMS.map((p) => (
          <Fragment key={p.k}>
            <label className="check">
              <input type="checkbox" disabled={!mods.includes(p.needs)} checked={perms[p.k] && mods.includes(p.needs)} onChange={(e) => setPerms({ ...perms, [p.k]: e.target.checked })} />
              {p.label}
            </label>
          </Fragment>
        ))}
        <label className="check muted"><input type="checkbox" disabled checked={false} readOnly /> Billing, cancellation and deleting the account <span className="xsmall">· owner only</span></label>
      </fieldset>
    </Modal>
  );
}
