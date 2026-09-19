'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
export function RegisterForm() {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); try { await api('/api/register', { name: form.get('name') }); router.push('/sections'); } catch (e) { setError((e as Error).message); setBusy(false); } }
  return <form onSubmit={submit} className="register-form"><label htmlFor="name">What should I call you?</label><div className="entry-row"><input id="name" name="name" placeholder="Your name or nickname" autoComplete="nickname" minLength={2} maxLength={30} required aria-describedby="privacy register-error"/><button disabled={busy}>{busy ? 'Opening…' : 'Open the journal'} <span aria-hidden="true">↗</span></button></div><p id="register-error" role="status" className="message">{error}</p><p className="fine-print" id="privacy">Just a name, so I know who stopped by. Your visits and answer attempts are recorded, along with a salted IP hash and browser details. No account needed.</p></form>;
}
