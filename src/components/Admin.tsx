"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "./api";
type Stats = {
  summary: {
    visitors: number;
    unlocks: number;
    failures: number;
    reads: number;
  };
  visitors: {
    id: string;
    name: string;
    firstSeen: string;
    lastSeen: string;
    unlocked: string[];
  }[];
  failures: { name: string; title: string; time: string }[];
};
export function Admin() {
  const [stats, setStats] = useState<Stats>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      setStats(await api<Stats>("/api/admin/stats"));
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    try {
      await api("/api/admin/login", { token: new FormData(form).get("token") });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/api/admin/logout", {});
      setStats(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const date = (value: string) => new Date(value).toLocaleString();
  return (
    <div className="admin">
      <span className="eyebrow">THE KEEPER’S DESK</span>
      <h1>Quiet company.</h1>
      <p>The people who have spent time with these pages.</p>
      <p role="status" className="message">
        {loading ? "Opening the desk…" : error}
      </p>
      {stats ? (
        <>
          <div className="admin-actions">
            <button className="text-button" onClick={load}>
              Refresh
            </button>
            <button className="text-button" onClick={logout}>
              Close the desk
            </button>
          </div>
          <div className="summary-grid">
            {Object.entries(stats.summary).map(([label, value]) => (
              <div className="paper" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <section className="admin-panel paper">
            <h2>Visitors</h2>
            <p className="fine-print">
              Latest 200 visitors. Names are self-reported, not verified
              identities.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>First seen</th>
                    <th>Last seen</th>
                    <th>Opened chapters</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.visitors.map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{date(person.firstSeen)}</td>
                      <td>{date(person.lastSeen)}</td>
                      <td>{person.unlocked.join(", ") || "None yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!stats.visitors.length && <p>No visitors yet.</p>}
          </section>
          <section className="admin-panel paper">
            <h2>Unanswered questions</h2>
            <p className="fine-print">
              Latest 100 unsuccessful attempts. Submitted answers are never
              recorded.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Chapter</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.failures.map((attempt, i) => (
                    <tr key={i}>
                      <td>{attempt.name}</td>
                      <td>{attempt.title}</td>
                      <td>{date(attempt.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!stats.failures.length && <p>No failed attempts.</p>}
          </section>
        </>
      ) : (
        !loading && (
          <form onSubmit={login} className="admin-login paper">
            <label htmlFor="token">Your private key</label>
            <input
              id="token"
              type="password"
              name="token"
              autoComplete="current-password"
              required
              maxLength={512}
            />
            <button disabled={busy}>
              {busy ? "Opening…" : "Open the desk"} ↗
            </button>
          </form>
        )
      )}
    </div>
  );
}
