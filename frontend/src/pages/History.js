import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { parseISO, format } from 'date-fns';

const History = () => {
  const [stats, setStats] = useState({ total: 0, completed: 0, deleted: 0 });
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all'); // all, completed, failed, deleted
  const [start, setStart] = useState(''); // dd-MM-yyyy
  const [end, setEnd] = useState('');   // dd-MM-yyyy

  const parseDisplayDate = (val) => {
    // expects dd-MM-yyyy, returns Date or null
    if (!val) return null;
    const m = val.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return null;
    const [_, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm}-${dd}T00:00:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [analyticsRes, tasksRes] = await Promise.all([
          axios.get('/api/tasks/analytics'),
          axios.get('/api/tasks')
        ]);
        setStats({ total: analyticsRes.data.total, completed: analyticsRes.data.completed, deleted: analyticsRes.data.deleted });
        // store all except active (move non-active to history)
        const now = new Date();
        const tasks = tasksRes.data.filter(t => {
          const endTime = parseISO(t.endTime);
          const isActive = !t.isCompleted && !t.isDeleted && endTime >= now;
          return !isActive; // only non-active
        });
        setAllTasks(tasks);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Task History</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">All-time summary of your activity</p>

      {/* Filters */}
      <div className="card p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="form-label">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="form-input">
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
        <div>
          <label className="form-label">From</label>
          <input type="text" placeholder="dd-mm-yyyy" value={start} onChange={e => setStart(e.target.value)} className="form-input" />
        </div>
        <div>
          <label className="form-label">To</label>
          <input type="text" placeholder="dd-mm-yyyy" value={end} onChange={e => setEnd(e.target.value)} className="form-input" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks (incl. deleted)</p>
          <p className="text-3xl font-semibold">{stats.total}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Completed (all-time)</p>
          <p className="text-3xl font-semibold">{stats.completed}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Deleted (all-time)</p>
          <p className="text-3xl font-semibold">{stats.deleted}</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">History</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTasks
            .filter(t => {
              const d = parseISO(t.endTime);
              const sDate = parseDisplayDate(start);
              const eDate = parseDisplayDate(end);
              if (sDate && d < sDate) return false;
              if (eDate) {
                const endOfDay = new Date(eDate);
                endOfDay.setHours(23,59,59,999);
                if (d > endOfDay) return false;
              }
              if (status === 'completed') return t.isCompleted;
              if (status === 'failed') return !t.isCompleted && d < new Date();
              if (status === 'deleted') return t.isDeleted;
              return true;
            })
            .map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold truncate pr-2">{t.title}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full 
                        ${t.isDeleted ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                           t.isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                           'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                    >
                      {t.isDeleted ? 'Deleted' : t.isCompleted ? 'Completed' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                    {t.description?.trim() ? t.description : 'No description'}
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Start: {format(parseISO(t.startTime), 'EEE, dd-MM-yyyy HH:mm')}</div>
                    <div>End: {format(parseISO(t.endTime), 'EEE, dd-MM-yyyy HH:mm')}</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        {allTasks.length === 0 && (
          <div className="text-sm text-gray-500 mt-3">No history yet.</div>
        )}
      </div>
    </div>
  );
};

export default History;

