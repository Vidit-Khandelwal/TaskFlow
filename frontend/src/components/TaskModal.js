import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Plus, X as XIcon } from 'lucide-react';
import { format, addHours } from 'date-fns';

const TaskModal = ({ task, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: ''
  });
  const [errors, setErrors] = useState({});
  const [startHM, setStartHM] = useState({ h: '00', m: '00' });
  const [endHM, setEndHM] = useState({ h: '00', m: '00' });
  const [priority, setPriority] = useState('medium');
  const [recurrenceType, setRecurrenceType] = useState('none'); // none, daily, weekly, custom
  const [customDate, setCustomDate] = useState('');
  const [customDates, setCustomDates] = useState([]);
  const [displayStartDate, setDisplayStartDate] = useState(''); // dd-MM-yyyy
  const [displayEndDate, setDisplayEndDate] = useState(''); // dd-MM-yyyy

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        startTime: task.startTime ? format(new Date(task.startTime), "yyyy-MM-dd'T'HH:mm") : '',
        endTime: task.endTime ? format(new Date(task.endTime), "yyyy-MM-dd'T'HH:mm") : ''
      });
      if (task.startTime) {
        const ds = new Date(task.startTime);
        setStartHM({ h: String(ds.getHours()).padStart(2,'0'), m: String(ds.getMinutes()).padStart(2,'0') });
        setDisplayStartDate(format(ds, 'dd-MM-yyyy'));
      }
      if (task.endTime) {
        const de = new Date(task.endTime);
        setEndHM({ h: String(de.getHours()).padStart(2,'0'), m: String(de.getMinutes()).padStart(2,'0') });
        setDisplayEndDate(format(de, 'dd-MM-yyyy'));
      }
    } else {
      // Set default times for new tasks
      const now = new Date();
      const defaultStart = format(now, "yyyy-MM-dd'T'HH:mm");
      const defaultEnd = format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm");
      
      setFormData({
        title: '',
        description: '',
        startTime: defaultStart,
        endTime: defaultEnd
      });
      setStartHM({ h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0') });
      const n1 = addHours(now, 1);
      setEndHM({ h: String(n1.getHours()).padStart(2,'0'), m: String(n1.getMinutes()).padStart(2,'0') });
      setDisplayStartDate(format(now, 'dd-MM-yyyy'));
      setDisplayEndDate(format(n1, 'dd-MM-yyyy'));
    }
  }, [task]);

  // Removed unused minDateTime

  const maxDateTimeStart = (() => {
    const d = new Date();
    // Allow up to +30 days if recurring, else +7 days
    d.setDate(d.getDate() + (recurrenceType !== 'none' ? 30 : 7));
    return format(d, "yyyy-MM-dd'T'HH:mm");
  })();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);
      
      if (endDate <= startDate) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const payload = { ...formData, priority };
    if (recurrenceType === 'daily' || recurrenceType === 'weekly') {
      payload.recurrence = { type: recurrenceType };
    } else if (recurrenceType === 'custom' && customDates.length > 0) {
      payload.recurrence = { type: 'custom', dates: customDates };
    }

    onSubmit(payload);
  };

  const handleStartTimeChange = (e) => {
    const startTime = e.target.value;
    setFormData(prev => ({
      ...prev,
      startTime
    }));

    // Auto-adjust end time if it's before or equal to start time
    if (formData.endTime && new Date(formData.endTime) <= new Date(startTime)) {
      const newEndTime = new Date(startTime);
      newEndTime.setHours(newEndTime.getHours() + 1);
      setFormData(prev => ({
        ...prev,
        endTime: format(newEndTime, "yyyy-MM-dd'T'HH:mm")
      }));
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const combine = (dateStr, hm) => {
    if (!dateStr) return '';
    return `${dateStr}T${hm.h}:${hm.m}`;
  };

  const toIsoDatePart = (ddmmyyyy) => {
    // expects dd-MM-yyyy, returns yyyy-MM-dd or '' if invalid calendar date
    const m = ddmmyyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return '';
    const [, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm}-${dd}T00:00:00Z`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // Ensure no rollover: components must match exactly
    const valid = (
      d.getUTCFullYear() === Number(yyyy) &&
      String(d.getUTCMonth() + 1).padStart(2, '0') === mm &&
      String(d.getUTCDate()).padStart(2, '0') === dd
    );
    return valid ? `${yyyy}-${mm}-${dd}` : '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="form-label">
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`form-input ${errors.title ? 'border-red-500' : ''}`}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label className="form-label">Priority</label>
            <select value={priority} onChange={(e)=>setPriority(e.target.value)} className="form-input">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="form-input"
              placeholder="Enter task description (optional)"
            />
          </div>

          <div>
            <label className="form-label">Recurrence</label>
            <select
              className="form-input"
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
            >
              <option value="none">None</option>
              <option value="daily">Daily (next 30 days)</option>
              <option value="weekly">Weekly (next 30 days)</option>
              <option value="custom">Custom dates (next 30 days)</option>
            </select>
            {recurrenceType === 'custom' && (
              <div className="mt-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="form-label">Add date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={customDate}
                      min={new Date().toISOString().split('T')[0]}
                      max={maxDateTimeStart.split('T')[0]}
                      onChange={(e)=>setCustomDate(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary inline-flex items-center gap-1"
                    onClick={() => {
                      if (!customDate) return;
                      if (!customDates.includes(customDate)) {
                        setCustomDates([...customDates, customDate]);
                      }
                      setCustomDate('');
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
                {customDates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {customDates.sort().map((d) => (
                      <span key={d} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                        {d}
                        <button type="button" onClick={() => setCustomDates(customDates.filter(cd => cd !== d))} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          <XIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="startTimeDate" className="form-label">
              <Calendar className="inline h-4 w-4 mr-1" />
              Start Date & Time *
            </label>
            <div className="grid grid-cols-4 gap-3">
              <input
                type="text"
                id="startTimeDate"
                placeholder="dd-mm-yyyy"
                value={displayStartDate}
                onChange={(e) => {
                  const ddmmyyyy = e.target.value;
                  setDisplayStartDate(ddmmyyyy);
                  const isoDate = toIsoDatePart(ddmmyyyy);
                  if (!isoDate) return;
                  const next = combine(isoDate, startHM);
                  handleStartTimeChange({ target: { value: next }});
                }}
                className={`form-input col-span-2 ${errors.startTime ? 'border-red-500' : ''}`}
              />
              <div className="col-span-1">
                <select
                  className="form-input"
                  value={startHM.h}
                  onChange={(e) => {
                    const hm = { ...startHM, h: e.target.value };
                    setStartHM(hm);
                    const isoDate = toIsoDatePart(displayStartDate);
                    if (!isoDate) return;
                    const next = combine(isoDate, hm);
                    handleStartTimeChange({ target: { value: next }});
                  }}
                >
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <select
                  className="form-input"
                  value={startHM.m}
                  onChange={(e) => {
                    const hm = { ...startHM, m: e.target.value };
                    setStartHM(hm);
                    const isoDate = toIsoDatePart(displayStartDate);
                    if (!isoDate) return;
                    const next = combine(isoDate, hm);
                    handleStartTimeChange({ target: { value: next }});
                  }}
                >
                  {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startTime}</p>
            )}
          </div>

          <div>
            <label htmlFor="endTimeDate" className="form-label">
              <Clock className="inline h-4 w-4 mr-1" />
              End Date & Time *
            </label>
            <div className="grid grid-cols-4 gap-3">
              <input
                type="text"
                id="endTimeDate"
                placeholder="dd-mm-yyyy"
                value={displayEndDate}
                onChange={(e) => {
                  const ddmmyyyy = e.target.value;
                  setDisplayEndDate(ddmmyyyy);
                  const isoDate = toIsoDatePart(ddmmyyyy);
                  if (!isoDate) return;
                  const next = combine(isoDate, endHM);
                  handleChange({ target: { name: 'endTime', value: next }});
                }}
                className={`form-input col-span-2 ${errors.endTime ? 'border-red-500' : ''}`}
              />
              <div className="col-span-1">
                <select
                  className="form-input"
                  value={endHM.h}
                  onChange={(e) => {
                    const hm = { ...endHM, h: e.target.value };
                    setEndHM(hm);
                    const isoDate = toIsoDatePart(displayEndDate || displayStartDate);
                    if (!isoDate) return;
                    const next = combine(isoDate, hm);
                    handleChange({ target: { name: 'endTime', value: next }});
                  }}
                >
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <select
                  className="form-input"
                  value={endHM.m}
                  onChange={(e) => {
                    const hm = { ...endHM, m: e.target.value };
                    setEndHM(hm);
                    const isoDate = toIsoDatePart(displayEndDate || displayStartDate);
                    if (!isoDate) return;
                    const next = combine(isoDate, hm);
                    handleChange({ target: { name: 'endTime', value: next }});
                  }}
                >
                  {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endTime}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
