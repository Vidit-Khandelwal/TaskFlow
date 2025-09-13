import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, XCircle, Trash2, Edit3, Calendar } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('active'); // default to active only
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    fetchTasks();
  }, []);

  // Re-render exactly at task start times to flip Upcoming → Active without polling
  useEffect(() => {
    const timers = [];
    const now = Date.now();
    tasks.forEach(task => {
      const startMs = Date.parse(task.startTime);
      if (!isNaN(startMs) && startMs > now) {
        const delay = startMs - now + 100; // slight buffer
        const id = setTimeout(() => setNowTick(Date.now()), delay);
        timers.push(id);
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/tasks');
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const response = await axios.post('/api/tasks', taskData);
      if (response.data && response.data.id) {
        setTasks(prev => [response.data, ...prev]);
        toast.success('Task created successfully!');
      } else {
        // Recurring create returns { message, count }
        await fetchTasks();
        const count = response.data?.count;
        toast.success(count ? `Scheduled ${count} tasks` : 'Recurring tasks scheduled');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId, taskData) => {
    try {
      const response = await axios.put(`/api/tasks/${taskId}`, taskData);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? response.data : task
      ));
      toast.success('Task updated successfully!');
      setShowModal(false);
      setEditingTask(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, isDeleted: true } : task
      ));
      toast.success('Task deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleToggleComplete = async (taskId, isCompleted) => {
    try {
      const response = await axios.put(`/api/tasks/${taskId}`, { isCompleted });
      setTasks(prev => prev.map(task => 
        task.id === taskId ? response.data : task
      ));
      toast.success(isCompleted ? 'Task marked as completed!' : 'Task marked as incomplete!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const getTaskStatus = (task) => {
    const now = new Date();
    const endTime = parseISO(task.endTime);
    
    if (task.isDeleted) return 'deleted';
    if (task.isCompleted) return 'completed';
    if (isAfter(now, endTime)) return 'failed';
    return 'active';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'deleted':
        return <Trash2 className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      case 'deleted':
        return 'status-deleted';
      default:
        return 'status-active';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const status = getTaskStatus(task);
    switch (filter) {
      case 'active':
        return status === 'active';
      case 'completed':
        return status === 'completed';
      case 'failed':
        return status === 'failed';
      case 'deleted':
        return status === 'deleted';
      default:
        return true;
    }
  });

  const canEditOrDelete = (task) => {
    const status = getTaskStatus(task);
    // Only allow edits/deletes on active tasks
    return status === 'active';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Task Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your tasks and track your progress
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Info: Dashboard shows Active tasks only; other statuses live in History */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing active tasks. Completed, failed, and deleted tasks are available in History.
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => {
          const status = getTaskStatus(task);
          const canEdit = canEditOrDelete(task);
          const isUpcoming = isBefore(new Date(), parseISO(task.startTime));
          
          return (
            <div key={task.id} className="card p-6 fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {status === 'active' ? (
                    isUpcoming ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        <Calendar className="h-4 w-4 mr-1" /> Upcoming
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium status-active">
                        <Clock className="h-4 w-4 mr-1" /> Active
                      </span>
                    )
                  ) : (
                    <>
                      {getStatusIcon(status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex space-x-2">
                  {status === 'active' ? (
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setShowModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  ) : (
                    // Completed/failed/deleted: show disabled pencil without hover or click
                    <span className="p-1 text-gray-400 cursor-not-allowed" title="Editing disabled">
                      <Edit3 className="h-4 w-4" />
                    </span>
                  )}
                  {status === 'active' && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {task.title}
              </h3>
              {task.priority && (
                <div className="mb-2 text-xs inline-block px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                  Priority: {task.priority}
                </div>
              )}
              
              {task.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {task.description}
                </p>
              )}

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Start: {format(parseISO(task.startTime), 'EEE, dd-MM-yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>End: {format(parseISO(task.endTime), 'EEE, dd-MM-yyyy HH:mm')}</span>
                </div>
              </div>

              <div className="mt-4">
                {status === 'active' ? (
                  <button
                    onClick={() => handleToggleComplete(task.id, true)}
                    className="w-full btn-success"
                  >
                    Mark as Complete
                  </button>
                ) : (
                  <button
                    className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium py-2 px-4 rounded-lg cursor-not-allowed opacity-60"
                    disabled
                    title="Completion change disabled"
                  >
                    Mark as Complete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No tasks found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? 'Get started by creating a new task.'
              : `No ${filter} tasks found.`
            }
          </p>
          {filter === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Task
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSubmit={editingTask ? 
            (data) => handleUpdateTask(editingTask.id, data) : 
            handleCreateTask
          }
        />
      )}
    </div>
  );
};

export default Dashboard;
