import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Activity, CalendarDays, Check, ChevronDown, ChevronUp, Footprints, 
  LayoutDashboard, Plus, Target, Timer, Trophy, TrendingUp, 
  Settings2, ArrowDownToLine, ArrowUpFromLine, ImagePlus, 
  Trash2, X, Sparkles, ListChecks, HeartPulse, Pencil, Trash, Zap, CheckCircle2
} from 'lucide-react';
import './styles.css';

const KEY = 'stride-running-coach-v1', 
      KM = { '5K': 5, '10K': 10, 'Half Marathon': 21.0975, 'Marathon': 42.195 },
      today = () => new Date().toISOString().slice(0, 10),
      uid = () => Math.random().toString(36).slice(2, 10),
      fmt = (d, o = { day: 'numeric', month: 'short' }) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-SG', o) : '—',
      
      pace = n => {
        if (!Number.isFinite(n) || n <= 0) return '—';
        let t = Math.round(n);
        return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
      },
      
      parseTime = s => {
        let p = String(s || '').split(':').map(Number);
        if (p.some(Number.isNaN)) return NaN;
        if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
        if (p.length === 2) return p[0] * 60 + p[1];
        return NaN;
      },

      formatDuration = secs => {
        if (!Number.isFinite(secs) || secs <= 0) return '—';
        let h = Math.floor(secs / 3600),
            m = Math.floor((secs % 3600) / 60),
            s = Math.round(secs % 60);
        if (h > 0) {
          return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${m}:${String(s).padStart(2, '0')}`;
      },

      getWorkoutBadgeStyle = type => {
        let lower = String(type || '').toLowerCase();
        if (lower.includes('race')) {
          return { bg: 'rgba(204, 255, 0, 0.2)', border: '#ccff00', color: '#ccff00' };
        }
        if (lower.includes('long')) {
          return { bg: 'rgba(147, 51, 234, 0.25)', border: '#a855f7', color: '#c084fc' };
        }
        if (lower.includes('tempo') || lower.includes('steady') || lower.includes('interval')) {
          return { bg: 'rgba(217, 119, 6, 0.25)', border: '#f59e0b', color: '#fbbf24' };
        }
        if (lower.includes('recovery')) {
          return { bg: 'rgba(16, 185, 129, 0.25)', border: '#10b981', color: '#34d399' };
        }
        return { bg: 'rgba(2, 132, 199, 0.25)', border: '#0284c7', color: '#38bdf8' };
      },
      
      fresh = () => ({ plans: [], runs: [], activePlanId: null });

function load() {
  try {
    return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return fresh();
  }
}

function predictRaceTimes(runs) {
  if (!runs || runs.length === 0) return null;
  let validRuns = runs.filter(r => Number(r.distance) >= 3 && parseTime(r.duration) > 0);
  if (validRuns.length === 0) return null;

  let bestRun = validRuns.reduce((best, cur) => {
    let curSecs = parseTime(cur.duration);
    let curPaceSec = curSecs / Number(cur.distance);
    let bestSecs = parseTime(best.duration);
    let bestPaceSec = bestSecs / Number(best.distance);
    return curPaceSec < bestPaceSec ? cur : best;
  }, validRuns[0]);

  let d1 = Number(bestRun.distance);
  let t1 = parseTime(bestRun.duration);

  const targets = { '5K': 5.0, '10K': 10.0, '21.1K': 21.0975, '42.2K': 42.195 };
  let results = {};

  for (let [label, d2] of Object.entries(targets)) {
    let predictedSecs = t1 * Math.pow(d2 / d1, 1.06);
    results[label] = {
      time: formatDuration(predictedSecs),
      pace: pace(predictedSecs / d2)
    };
  }

  return { results, baseline: bestRun };
}

// SCIENTIFIC RUNNING PLAN GENERATOR WITH DYNAMIC MIDWEEK VARIATION
function makePlan(p) {
  let km = KM[p.distance],
      race = new Date(p.raceDate + 'T12:00:00'),
      now = new Date(today() + 'T12:00:00'),
      weeks = Math.max(4, Math.min(24, Math.ceil((race - now) / 604800000))),
      days = Number(p.daysPerWeek),
      slots = days === 3 ? [2, 4, 0] : days === 4 ? [2, 4, 6, 0] : days === 5 ? [1, 3, 5, 6, 0] : [1, 2, 4, 5, 0, 6],
      gp = parseTime(p.goalTime) / km,
      schedule = [];

  let peakLong = km >= 40 ? 34.0 : km >= 20 ? 20.0 : km >= 9 ? 13.0 : 6.0;
  let startWeeklyKm = Math.max(15, Number(p.weeklyKm) || 25);
  let startLong = Math.min(peakLong * 0.45, Math.max(8.0, startWeeklyKm * 0.35));
  let buildWeeks = Math.max(1, weeks - 3);

  for (let w = 0; w < weeks; w++) {
    let left = weeks - w;
    let deload = (w + 1) % 4 === 0;
    let long = startLong;
    let weekKm = startWeeklyKm;

    if (left === 1) {
      long = km >= 40 ? 8.0 : 5.0;
      weekKm = startWeeklyKm * 0.45;
    } else if (left === 2) {
      long = km >= 40 ? 18.0 : 10.0;
      weekKm = startWeeklyKm * 0.65;
    } else if (left === 3) {
      long = km >= 40 ? 26.0 : 14.0;
      weekKm = startWeeklyKm * 0.80;
    } else {
      let progress = w / Math.max(1, buildWeeks - 1);
      long = startLong + (peakLong - startLong) * Math.min(1.0, progress);
      if (deload) long *= 0.78;
      weekKm = Math.max(startWeeklyKm, long / 0.38);
    }

    long = Math.round(long * 2) / 2;
    let midweekTotal = Math.max(10.0, weekKm - long);

    slots.forEach((day, i) => {
      let date = new Date(now);
      date.setDate(now.getDate() + w * 7 + ((day - now.getDay() + 7) % 7));
      let ds = date.toISOString().slice(0, 10);
      
      if (ds >= today() && ds < p.raceDate) {
        let isLongRun = i === slots.length - 1;
        let d = long;
        let type = 'Long easy run';

        if (!isLongRun) {
          if (i === 0) {
            // Recovery Run (shortest midweek run)
            d = Math.round(Math.max(4.0, Math.min(8.0, midweekTotal * 0.24)) * 2) / 2;
            type = 'Recovery run';
          } else if (i === 1) {
            // Focused Tempo Workout (capped quality distance)
            d = Math.round(Math.max(5.0, Math.min(12.0, midweekTotal * 0.28)) * 2) / 2;
            type = 'Steady / tempo';
          } else {
            // Base-building Midweek Easy Run
            let usedMidweek = (Math.round(Math.max(4.0, Math.min(8.0, midweekTotal * 0.24)) * 2) / 2) + 
                              (Math.round(Math.max(5.0, Math.min(12.0, midweekTotal * 0.28)) * 2) / 2);
            d = Math.round(Math.max(5.0, midweekTotal - usedMidweek) * 2) / 2;
            type = 'Easy run';
          }
        }

        if (left === 1 && !isLongRun) type = 'Easy shakeout';

        schedule.push({
          id: uid(),
          date: ds,
          week: w + 1,
          km: d,
          type,
          pace: pace(gp * (type.includes('tempo') ? 0.96 : type.includes('Recovery') ? 1.18 : 1.12)),
          done: false
        });
      }
    });
  }

  schedule.push({ id: uid(), date: p.raceDate, week: weeks, km, type: 'RACE DAY', pace: pace(gp), done: false, race: true });
  return { ...p, schedule, weeks, goalPace: gp };
}

function App() {
  const [state, S] = useState(load),
        [tab, T] = useState('Overview'),
        [modal, M] = useState(''),
        [editing, E] = useState(null),
        [notice, N] = useState(''),
        [busy, B] = useState(false),
        [expandedWeeks, setExpandedWeeks] = useState({ 1: true }),
        [form, F] = useState({ name: '', distance: 'Marathon', goalTime: '4:30:00', raceDate: '', weeklyKm: '30', daysPerWeek: '4' }),
        [run, R] = useState({ date: today(), distance: '', duration: '', pace: '', notes: '' });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (notice) {
      let t = setTimeout(() => N(''), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);

  let plan = state.plans.find(p => p.id === state.activePlanId) || state.plans[0],
      runs = [...state.runs].sort((a, b) => b.date.localeCompare(a.date)),
      total = state.runs.reduce((s, r) => s + Number(r.distance), 0),
      
      currentMonthStr = today().slice(0, 7),
      month = state.runs.filter(r => r.date.startsWith(currentMonthStr)).reduce((s, r) => s + Number(r.distance), 0),
      
      week = state.runs.filter(r => {
        let d = new Date(r.date + 'T12:00:00'),
            n = new Date(),
            start = new Date(n);
        start.setDate(n.getDate() - ((n.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        return d >= start && d <= n;
      }).reduce((s, r) => s + Number(r.distance), 0),
      
      done = plan?.schedule?.filter(s => s.done).length || 0,
      upcoming = plan?.schedule?.filter(s => !s.done && s.date >= today()).slice(0, 4) || [],
      predictions = useMemo(() => predictRaceTimes(state.runs), [state.runs]);

  const weeksGrouped = useMemo(() => {
    if (!plan?.schedule) return {};
    return plan.schedule.reduce((acc, item) => {
      let w = item.week || 1;
      if (!acc[w]) acc[w] = [];
      acc[w].push(item);
      return acc;
    }, {});
  }, [plan]);

  function toggleWeekExpand(wNum) {
    setExpandedWeeks(prev => ({ ...prev, [wNum]: !prev[wNum] }));
  }

  function openNewPlan() {
    F({ name: '', distance: 'Marathon', goalTime: '4:30:00', raceDate: '', weeklyKm: '30', daysPerWeek: '4' });
    M('plan');
  }

  function openEditPlan() {
    if (!plan) return;
    F({
      name: plan.name || '',
      distance: plan.distance || 'Marathon',
      goalTime: plan.goalTime || '4:30:00',
      raceDate: plan.raceDate || '',
      weeklyKm: String(plan.weeklyKm || '30'),
      daysPerWeek: String(plan.daysPerWeek || '4')
    });
    M('editPlan');
  }

  function savePlan(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.raceDate || form.raceDate < today()) {
      N('Enter a plan name and future race date.');
      return;
    }

    if (modal === 'editPlan' && plan) {
      let updated = makePlan({ ...plan, ...form });
      S(s => ({
        ...s,
        plans: s.plans.map(p => p.id === plan.id ? updated : p)
      }));
      N('Plan updated successfully.');
    } else {
      let p = makePlan({ ...form, id: uid() });
      S(s => ({ ...s, plans: [p, ...s.plans], activePlanId: p.id }));
      T('Plan');
      N('Your suggested plan is ready.');
    }
    M('');
  }

  function deletePlan(idToDelete) {
    let targetId = idToDelete || plan?.id;
    if (!targetId) return;
    let targetPlan = state.plans.find(p => p.id === targetId);

    if (confirm(`Are you sure you want to delete "${targetPlan?.name || 'this plan'}"?`)) {
      S(s => {
        let remaining = s.plans.filter(p => p.id !== targetId);
        return {
          ...s,
          plans: remaining,
          activePlanId: remaining.length ? remaining[0].id : null
        };
      });
      N('Plan deleted.');
    }
  }

  function toggle(id) {
    S(s => ({
      ...s,
      plans: s.plans.map(p => p.id !== plan.id ? p : {
        ...p,
        schedule: p.schedule.map(x => x.id === id ? { ...x, done: !x.done } : x)
      })
    }));
  }

  function openRun(r) {
    E(r?.id || null);
    R(r ? { date: r.date, distance: String(r.distance), duration: r.duration || '', pace: r.pace || '', notes: r.notes || '' } : { date: today(), distance: '', duration: '', pace: '', notes: '' });
    M('run');
  }

  function saveRun(e) {
    e.preventDefault();
    let d = Number(run.distance),
        secs = parseTime(run.duration);
    if (!d || d <= 0) {
      N('Enter a valid distance.');
      return;
    }
    let obj = {
      id: editing || uid(),
      date: run.date,
      distance: d,
      duration: run.duration,
      pace: run.pace || (Number.isFinite(secs) ? pace(secs / d) : ''),
      notes: run.notes
    };
    S(s => ({ ...s, runs: editing ? s.runs.map(r => r.id === editing ? obj : r) : [obj, ...s.runs] }));
    M('');
    N('Run saved.');
  }

  async function ocr(file) {
    if (!file) return;
    B(true);
    try {
      let { createWorker } = await import('tesseract.js'),
          w = await createWorker('eng'),
          res = await w.recognize(file);
      await w.terminate();
      let text = res.data.text || '',
          dm = text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:km|kilometers?|kilometres?)\b/i),
          tm = text.match(/\b(\d{1,2}:\d{2}:\d{2}|\d{1,3}:\d{2})\b/),
          pm = text.match(/(\d{1,2}:\d{2})\s*(?:\/\s*km|per\s*km)/i);
      R(v => ({
        ...v,
        distance: v.distance || (dm ? dm[1] : ''),
        duration: v.duration || (tm ? tm[1] : ''),
        pace: v.pace || (pm ? pm[1] : '')
      }));
      N('Screenshot scanned. Check the fields before saving.');
    } catch {
      N('Could not scan image; enter the run manually.');
    } finally {
      B(false);
    }
  }

  function backup() {
    let a = document.createElement('a'),
        u = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.href = u;
    a.download = 'stride-backup-' + today() + '.json';
    a.click();
    URL.revokeObjectURL(u);
    N('Backup exported.');
  }

  function importFile(file) {
    if (!file) return;
    let r = new FileReader();
    r.onload = () => {
      try {
        let d = JSON.parse(r.result);
        if (!Array.isArray(d.plans) || !Array.isArray(d.runs)) throw 0;
        if (confirm('Replace this device’s Stride data with this backup?')) {
          S({ ...fresh(), ...d });
          N('Backup imported.');
        }
      } catch {
        N('That file is not a valid Stride backup.');
      }
    };
    r.readAsText(file);
  }

  const nav = [['Overview', LayoutDashboard], ['Training plan', CalendarDays], ['Run log', Footprints], ['Progress', TrendingUp], ['Data & settings', Settings2]];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><b><Activity size={22}/></b>stride<span>.</span></div>
        <small className="side-label">WORKSPACE</small>
        {nav.map(([n, I]) => (
          <button className={'nav ' + (tab === (n === 'Training plan' ? 'Plan' : n) ? 'active' : '')} onClick={() => T(n === 'Training plan' ? 'Plan' : n)} key={n}>
            <I size={18}/>{n}
          </button>
        ))}
        <div className="side-bottom">
          <div className="tip"><Sparkles size={18}/><b>Small steps. Big miles.</b><p>Consistency beats perfection. One run at a time.</p></div>
          <small>● Saved on this device</small>
        </div>
      </aside>
      <main>
        <header className="top">
          <div className="mobilebrand"><b><Activity size={18}/></b>stride<span>.</span></div>
          <div className="crumb">Workspace <i>/</i> <strong>{tab}</strong></div>
          <div className="topright">
            {plan && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="selector">
                  <Target size={15}/>
                  <select value={plan.id} onChange={e => S(s => ({ ...s, activePlanId: e.target.value }))}>
                    {state.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronDown size={13}/>
                </div>
                <button className="btn secondary icononly" title="Edit Plan" onClick={openEditPlan} style={{ padding: '6px 8px' }}>
                  <Pencil size={15}/>
                </button>
                <button className="btn secondary icononly" title="Delete Plan" onClick={() => deletePlan()} style={{ padding: '6px 8px', color: '#ef4444' }}>
                  <Trash size={15}/>
                </button>
              </div>
            )}
            <button className="avatar" onClick={() => T('Data & settings')}>S</button>
          </div>
        </header>
        <div className="page">
          <div className="heading">
            <div>
              <small className="eyebrow">{tab === 'Overview' ? 'YOUR RUNNING SPACE' : tab === 'Plan' ? 'ONE SESSION AT A TIME' : tab === 'Run log' ? 'EVERY RUN COUNTS' : tab === 'Progress' ? 'ZOOM OUT, SEE THE WORK' : 'YOUR DATA, YOUR CALL'}</small>
              <h1>{tab === 'Overview' ? 'Good miles start here' : tab === 'Plan' ? 'Your training plan' : tab === 'Run log' ? 'Your run log' : tab === 'Progress' ? 'Progress, over time' : 'Data & settings'}<span>.</span></h1>
              <p>{tab === 'Overview' ? 'A clear plan, a little consistency, and you’re on your way.' : tab === 'Plan' ? 'A flexible schedule built around your goal race.' : tab === 'Run log' ? 'Capture the miles, remember the effort, see your consistency.' : tab === 'Progress' ? 'A simple view of the consistency you’re building.' : 'Your plans and run log are saved locally in this browser.'}</p>
            </div>
            {['Overview', 'Plan', 'Run log'].includes(tab) && (
              <button className="btn primary" onClick={() => tab === 'Run log' ? openRun() : openNewPlan()}>
                <Plus size={16}/>{tab === 'Run log' ? 'Log a run' : 'New goal'}
              </button>
            )}
            {tab === 'Progress' && <button className="btn secondary" onClick={backup}><ArrowDownToLine size={15}/> Export data</button>}
          </div>

          {tab === 'Overview' && (!plan ? (
            <div className="empty">
              <div className="emptyicon"><Footprints size={38}/></div>
              <small className="eyebrow">YOUR NEXT CHAPTER</small>
              <h2>Every finish line starts somewhere.</h2>
              <p>Create a running goal and Stride will map out a simple training schedule for you.</p>
              <button className="btn primary" onClick={openNewPlan}><Plus size={16}/> Create your first plan</button>
              <small className="subtle">No subscriptions. No account. Just your running journey.</small>
            </div>
          ) : (
            <>
              <div className="hero">
                <div className="herocopy">
                  <small>♜ &nbsp; CURRENT GOAL</small>
                  <h2>{plan.name}</h2>
                  <div className="meta">
                    <span><Target size={14}/>{plan.distance}</span>
                    <span><CalendarDays size={14}/>{fmt(plan.raceDate, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <label>TARGET FINISH TIME</label>
                  <strong className="time">{plan.goalTime}</strong>
                  <div className="progress">
                    <div><span style={{ width: (plan.schedule.length ? done / plan.schedule.length * 100 : 0) + '%' }}/></div>
                    <small>{done} of {plan.schedule.length} sessions complete <b>{Math.round(plan.schedule.length ? done / plan.schedule.length * 100 : 0)}%</b></small>
                  </div>
                </div>
                <div className="art">
                  <div className="orbit"></div>
                  <div className="foot"><Footprints size={50}/></div>
                  <div className="badge"><small>GOAL PACE</small><b>{pace(plan.goalPace)}<em>/km</em></b></div>
                  <i>✳</i>
                </div>
              </div>

              {/* AI RACE PREDICTOR CARD */}
              <section className="panel" style={{ marginBottom: '24px' }}>
                <div className="panelhead">
                  <div>
                    <small className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14}/> AI RACE PREDICTOR</small>
                    <h3>Estimated Race Finishing Times</h3>
                  </div>
                  {predictions?.baseline && <small className="pill">Based on {predictions.baseline.distance}km run ({fmt(predictions.baseline.date)})</small>}
                </div>
                {predictions ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '12px' }}>
                    {Object.entries(predictions.results).map(([dist, data]) => (
                      <div key={dist} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                        <small style={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dist}</small>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '6px 0', color: '#ccff00' }}>{data.time}</div>
                        <small style={{ color: '#71717a' }}>Avg pace: {data.pace}/km</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ padding: '12px 0' }}>Log at least one run of 3km+ with duration to generate your predicted times.</p>
                )}
              </section>

              <div className="stats">
                <Stat I={Footprints} label="Total distance" value={total.toFixed(1) + ' km'} note="All logged runs"/>
                <Stat I={CalendarDays} label="This month" value={month.toFixed(1) + ' km'} note="Current month"/>
                <Stat I={Activity} label="This week" value={week.toFixed(1) + ' km'} note="Since Monday"/>
                <Stat I={Target} label="Goal pace" value={pace(plan.goalPace)} suffix="/km" note="Target average pace"/>
              </div>
              <div className="twocol">
                <section className="panel">
                  <div className="panelhead">
                    <div><small className="eyebrow">KEEP THE RHYTHM</small><h3>Coming up</h3></div>
                    <button className="link" onClick={() => T('Plan')}>Full plan ↗</button>
                  </div>
                  {upcoming.length ? upcoming.map(s => <Session key={s.id} s={s} toggle={() => toggle(s.id)}/>) : <p className="muted">No upcoming sessions.</p>}
                </section>
                <section className="panel">
                  <div className="panelhead">
                    <div><small className="eyebrow">THE WORK ADDS UP</small><h3>Recent runs</h3></div>
                    <button className="link" onClick={() => T('Run log')}>View all ↗</button>
                  </div>
                  {runs.slice(0, 3).length ? runs.slice(0, 3).map(r => (
                    <div className="recent" key={r.id}>
                      <div className="roundicon"><Footprints size={17}/></div>
                      <div><b>{r.distance} km run</b><small>{fmt(r.date)}{r.pace ? ' · ' + r.pace + '/km' : ''}</small></div>
                      <strong>{r.duration || 'Logged'}</strong>
                    </div>
                  )) : <p className="muted">Your first run is waiting to be logged.</p>}
                  <button className="btn secondary full" onClick={() => openRun()}><Plus size={15}/> Log a run</button>
                </section>
              </div>
            </>
          ))}

          {tab === 'Plan' && (!plan ? (
            <Empty title="No plan just yet" text="Set a race date and target time to build your first training schedule." action="Create a plan" click={openNewPlan}/>
          ) : (
            <>
              <div className="plansummary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <small className="eyebrow">YOUR RACE</small>
                  <h2>{plan.name}</h2>
                  <p>{plan.distance} · {fmt(plan.raceDate, { day: 'numeric', month: 'long', year: 'numeric' })} · Goal {plan.goalTime}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div><small>Target pace</small><b>{pace(plan.goalPace)} <em>/km</em></b></div>
                  <button className="btn secondary" onClick={openEditPlan} style={{ gap: '6px' }}><Pencil size={15}/> Edit</button>
                  <button className="btn secondary" onClick={() => deletePlan()} style={{ gap: '6px', color: '#ef4444' }}><Trash size={15}/> Delete</button>
                </div>
              </div>

              {/* WEEKLY CARD CONTAINER WITH MULTI-COLOR ACCENTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(weeksGrouped).map(([weekNum, sessions]) => {
                  let isExpanded = expandedWeeks[weekNum] ?? (Number(weekNum) === 1);
                  let weekDoneCount = sessions.filter(s => s.done).length;
                  let isWeekComplete = weekDoneCount === sessions.length && sessions.length > 0;
                  
                  let targetWeekKm = sessions.reduce((sum, s) => sum + s.km, 0);
                  let completedWeekKm = sessions.filter(s => s.done).reduce((sum, s) => sum + s.km, 0);

                  return (
                    <div 
                      key={weekNum} 
                      style={{ 
                        background: '#121614', 
                        border: isWeekComplete ? '2px solid #ccff00' : isExpanded ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '16px', 
                        padding: '20px',
                        boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* CARD HEADER */}
                      <div 
                        onClick={() => toggleWeekExpand(weekNum)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#f4f4f5' }}>Week {weekNum}</h3>
                            {isWeekComplete ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ccff00', color: '#090a09', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <CheckCircle2 size={13}/> COMPLETE
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                IN PROGRESS
                              </span>
                            )}
                          </div>

                          {/* WORKOUTS & DISTANCE SUMMARY BARS */}
                          <div style={{ display: 'flex', gap: '24px', marginTop: '10px', color: '#a1a1aa', fontSize: '0.85rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Footprints size={15} style={{ color: '#38bdf8' }}/> 
                              WORKOUTS: <strong style={{ color: '#f4f4f5' }}>{weekDoneCount}/{sessions.length}</strong>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Activity size={15} style={{ color: '#ccff00' }}/> 
                              DISTANCE: <strong style={{ color: '#f4f4f5' }}>{completedWeekKm.toFixed(1)} / {targetWeekKm.toFixed(1)}KM</strong>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button className="btn secondary icononly" style={{ borderRadius: '50%', padding: '8px' }}>
                            {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                          </button>
                        </div>
                      </div>

                      {/* DAILY WORKOUT LIST (WHEN EXPANDED) */}
                      {isExpanded && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {sessions.map(s => {
                            let badgeStyle = getWorkoutBadgeStyle(s.type);

                            return (
                              <div 
                                key={s.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justify: 'space-between',
                                  background: s.done ? 'rgba(204,255,0,0.05)' : 'rgba(255,255,255,0.02)',
                                  padding: '12px 16px',
                                  borderRadius: '10px',
                                  border: s.done ? '1px solid rgba(204,255,0,0.3)' : '1px solid rgba(255,255,255,0.05)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '120px' }}>
                                  <span style={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.85rem', width: '36px' }}>
                                    {fmt(s.date, { weekday: 'short' })}
                                  </span>
                                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f4f4f5' }}>
                                    {fmt(s.date, { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>

                                <div style={{ flex: 1, padding: '0 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{
                                    background: badgeStyle.bg,
                                    border: `1px solid ${badgeStyle.border}`,
                                    color: badgeStyle.color,
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    letterSpacing: '0.02em'
                                  }}>
                                    {s.type}
                                  </span>
                                  <small style={{ color: '#71717a', fontSize: '0.78rem' }}>
                                    {s.race ? 'Race event day' : `Target Pace: ${s.pace}/km`}
                                  </small>
                                </div>

                                <div style={{ paddingRight: '20px', textAlign: 'right' }}>
                                  <b style={{ fontSize: '1rem', color: badgeStyle.color }}>{s.km} km</b>
                                </div>

                                <button 
                                  className={'check ' + (s.done ? 'checked' : '')} 
                                  onClick={() => toggle(s.id)}
                                >
                                  {s.done ? <Check size={15}/> : ''}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ))}

          {tab === 'Run log' && (
            <>
              <div className="runstats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div><small>Total runs</small><b>{state.runs.length}</b></div>
                <div><small>Lifetime distance</small><b>{total.toFixed(1)} <em>km</em></b></div>
                <div><small>Monthly distance</small><b>{month.toFixed(1)} <em>km</em></b></div>
                <div><small>Weekly distance</small><b>{week.toFixed(1)} <em>km</em></b></div>
              </div>
              <section className="panel logpanel">
                <div className="panelhead"><div><small className="eyebrow">YOUR HISTORY</small><h3>All runs</h3></div><small className="pill">{runs.length} logged</small></div>
                {runs.length ? (
                  <div className="tablewrap">
                    <table>
                      <thead><tr><th>DATE</th><th>ACTIVITY</th><th>DISTANCE</th><th>TIME</th><th>AVG. PACE</th><th></th></tr></thead>
                      <tbody>
                        {runs.map(r => (
                          <tr key={r.id}>
                            <td>{fmt(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td><b>🏃 Run</b>{r.notes && <small className="notes">{r.notes}</small>}</td>
                            <td>{Number(r.distance).toFixed(2)} km</td>
                            <td>{r.duration || '—'}</td>
                            <td>{r.pace ? r.pace + '/km' : '—'}</td>
                            <td>
                              <div className="actions">
                                <button onClick={() => openRun(r)}>Edit</button>
                                <button onClick={() => { if (confirm('Delete this run?')) S(s => ({ ...s, runs: s.runs.filter(x => x.id !== r.id) })); }}><Trash2 size={14}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="Your log starts with one run" text="Add a run manually or scan a screenshot from Strava or another running app." action="Log your first run" click={() => openRun()}/>
                )}
              </section>
            </>
          )}

          {tab === 'Progress' && (
            <>
              <div className="stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <Stat I={Footprints} label="Lifetime distance" value={total.toFixed(1) + ' km'} note={state.runs.length + ' runs logged'}/>
                <Stat I={CalendarDays} label="Monthly distance" value={month.toFixed(1) + ' km'} note="Current month"/>
                <Stat I={Activity} label="Weekly distance" value={week.toFixed(1) + ' km'} note="Current week"/>
                <Stat I={Timer} label="Runs logged" value={String(state.runs.length)} note="Every effort counts"/>
                <Stat I={Trophy} label="Plan sessions" value={String(done)} note={plan ? 'of ' + plan.schedule.length + ' planned' : 'Create a goal plan'}/>
              </div>
              <section className="panel chart">
                <div className="panelhead"><div><small className="eyebrow">LAST 7 DAYS</small><h3>Weekly running</h3></div><b className="lime">{week.toFixed(1)} km</b></div>
                <div className="bars">
                  {Array.from({ length: 7 }, (_, i) => {
                    let d = new Date();
                    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i);
                    let ds = d.toISOString().slice(0, 10),
                        v = state.runs.filter(r => r.date === ds).reduce((a, r) => a + Number(r.distance), 0),
                        max = Math.max(1, ...state.runs.map(r => Number(r.distance)));
                    return (
                      <div className="barcol" key={ds}>
                        <small>{v || ''}</small>
                        <div><span style={{ height: v ? Math.max(8, v / max * 100) + '%' : '2px' }}/></div>
                        <label>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}</label>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="panel insight">
                <HeartPulse size={21}/>
                <div>
                  <b>Keep the long game in mind</b>
                  <p>Progress isn’t only pace. Logging easy days, taking recovery seriously, and showing up consistently are all part of getting stronger.</p>
                </div>
              </section>
            </>
          )}

          {tab === 'Data & settings' && (
            <>
              <div className="settings">
                <section className="panel setting"><ArrowDownToLine/><h3>Export a backup</h3><p>Save your plans and run history as a JSON file. Keep a copy somewhere safe.</p><button className="btn secondary" onClick={backup}>Export backup</button></section>
                <section className="panel setting"><ArrowUpFromLine/><h3>Import a backup</h3><p>Restore a previously exported backup. This replaces data on this device.</p><label className="btn secondary filebtn">Import backup<input type="file" accept=".json,application/json" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }}/></label></section>
                <section className="panel setting"><Settings2/><h3>Storage & privacy</h3><p>Your running data is not sent to a Stride server. Screenshot OCR runs in your browser but downloads language data on first use.</p><small>● Local browser storage</small></section>
              </div>
              <section className="panel important">
                <b>Important about iPhone and Mac</b>
                <p>Data on your Mac does not automatically sync to your iPhone. Export a backup on one device and import it on the other.</p>
                <p>GitHub Pages makes the app website public, but your personal runs stay in local browser storage and are not committed to the repository.</p>
              </section>
            </>
          )}
        </div>
        <footer><span>STRIDE © {new Date().getFullYear()}</span><span>Made for the miles ahead <b>✳</b></span></footer>
      </main>

      {modal && (
        <div className="backdrop" onMouseDown={e => e.target === e.currentTarget && M('')}>
          <div className="modal">
            <div className="modalhead">
              <div>
                <h2>{modal === 'plan' ? 'Create a running goal' : modal === 'editPlan' ? 'Edit running goal' : editing ? 'Edit your run' : 'Log a run'}</h2>
                <p>{modal === 'plan' ? 'Tell us what you’re working towards.' : modal === 'editPlan' ? 'Update your goals or race details.' : 'A quick note today helps you see the bigger picture.'}</p>
              </div>
              <button className="close" onClick={() => M('')}><X/></button>
            </div>
            {['plan', 'editPlan'].includes(modal) ? (
              <form onSubmit={savePlan} className="form">
                <label>Plan / race name<input required placeholder="e.g. Singapore Marathon 2027" value={form.name} onChange={e => F({ ...form, name: e.target.value })}/></label>
                <div className="formrow">
                  <label>Race distance<select value={form.distance} onChange={e => F({ ...form, distance: e.target.value })}>{Object.keys(KM).map(k => <option key={k}>{k}</option>)}</select></label>
                  <label>Race date<input type="date" min={today()} required value={form.raceDate} onChange={e => F({ ...form, raceDate: e.target.value })}/></label>
                </div>
                <label>Target finish time <small>H:MM:SS, or MM:SS for shorter races</small><input required value={form.goalTime} onChange={e => F({ ...form, goalTime: e.target.value })} placeholder="4:30:00"/></label>
                <div className="formrow">
                  <label>Current weekly distance (km)<input type="number" min="0" max="200" required value={form.weeklyKm} onChange={e => F({ ...form, weeklyKm: e.target.value })}/></label>
                  <label>Runs per week<select value={form.daysPerWeek} onChange={e => F({ ...form, daysPerWeek: e.target.value })}>{[3, 4, 5, 6].map(n => <option key={n}>{n}</option>)}</select></label>
                </div>
                <div className="formhint"><Sparkles size={16}/>This is a suggested starting point, not a substitute for a qualified coach or medical advice.</div>
                <div className="modalactions">
                  <button type="button" className="btn secondary" onClick={() => M('')}>Cancel</button>
                  <button className="btn primary"><Sparkles size={16}/> {modal === 'editPlan' ? 'Update Plan' : 'Build my plan'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={saveRun} className="form">
                <label className="upload">
                  <ImagePlus/>
                  <div><b>{busy ? 'Scanning screenshot…' : 'Scan a running screenshot'}</b><small>Choose a Strava or running-app screenshot to prefill details.</small></div>
                  <input type="file" accept="image/*" disabled={busy} onChange={e => ocr(e.target.files?.[0])}/>
                  <span>{busy ? 'Working…' : 'Choose image'}</span>
                </label>
                <div className="formrow">
                  <label>Date<input type="date" required value={run.date} onChange={e => R({ ...run, date: e.target.value })}/></label>
                  <label>Distance (km)<input type="number" min="0.01" step="0.01" required placeholder="10.00" value={run.distance} onChange={e => R({ ...run, distance: e.target.value })}/></label>
                </div>
                <div className="formrow">
                  <label>Duration <small>H:MM:SS or MM:SS</small><input placeholder="55:30" value={run.duration} onChange={e => R({ ...run, duration: e.target.value })}/></label>
                  <label>Average pace <small>Optional, e.g. 5:33</small><input placeholder="min/km" value={run.pace} onChange={e => R({ ...run, pace: e.target.value })}/></label>
                </div>
                <label>Notes<textarea rows="3" placeholder="Easy effort, humid weather…" value={run.notes} onChange={e => R({ ...run, notes: e.target.value })}/></label>
                <div className="modalactions"><button type="button" className="btn secondary" onClick={() => M('')}>Cancel</button><button className="btn primary"><Check size={16}/>{editing ? 'Save changes' : 'Save run'}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
      {notice && <div className="toast"><Check size={16}/>{notice}</div>}
    </div>
  );
}

function Stat({ I, label, value, note, suffix }) {
  return (
    <div className="stat">
      <div className="statlabel">{label}<span><I size={16}/></span></div>
      <b>{value}<em>{suffix || ''}</em></b>
      <small>{note}</small>
    </div>
  );
}

function Session({ s, toggle }) {
  return (
    <div className="session">
      <div className="sessiondate"><small>{fmt(s.date, { weekday: 'short' })}</small><b>{fmt(s.date)}</b></div>
      <div className="sessioninfo"><b>{s.type}</b><small>{s.km} km · {s.pace}/km</small></div>
      <button className={'check ' + (s.done ? 'checked' : '')} onClick={toggle}>{s.done ? <Check size={15}/> : ''}</button>
    </div>
  );
}

function Empty({ title, text, action, click }) {
  return (
    <div className="empty small">
      <div className="emptyicon"><ListChecks size={32}/></div>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="btn primary" onClick={click}><Plus size={16}/>{action}</button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
