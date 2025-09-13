import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, all

  useEffect(() => {
    fetchAnalytics();
    fetchTasks();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/tasks/analytics');
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    }
  };

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

  const getFilteredTasks = () => {
    if (timeRange === 'all') return tasks;
    
    const now = new Date();
    let startDate;
    
    if (timeRange === 'week') {
      startDate = startOfWeek(now);
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return tasks.filter(task => {
      const taskDate = parseISO(task.createdAt);
      return isWithinInterval(taskDate, { start: startDate, end: now });
    });
  };

  const getAnalyticsData = () => {
    const filteredTasks = getFilteredTasks();
    const now = new Date();
    
    const completed = filteredTasks.filter(task => task.isCompleted).length;
    const failed = filteredTasks.filter(task => 
      !task.isCompleted && parseISO(task.endTime) < now
    ).length;
    const deleted = filteredTasks.filter(task => task.isDeleted).length;
    const active = filteredTasks.filter(task => 
      !task.isCompleted && !task.isDeleted && parseISO(task.endTime) >= now
    ).length;

    return {
      total: filteredTasks.length,
      completed,
      failed,
      deleted,
      active,
      successRate: filteredTasks.length > 0 ? Math.round((completed / filteredTasks.length) * 100) : 0
    };
  };

  const getPieChartData = () => {
    const data = getAnalyticsData();
    return [
      { name: 'Completed', value: data.completed, color: '#10b981' },
      { name: 'Failed', value: data.failed, color: '#ef4444' },
      { name: 'Active', value: data.active, color: '#3b82f6' },
      { name: 'Deleted', value: data.deleted, color: '#6b7280' }
    ].filter(item => item.value > 0);
  };

  const getWeeklyData = () => {
    const filteredTasks = getFilteredTasks();
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map(day => {
      const dayTasks = filteredTasks.filter(task => {
        const taskDate = parseISO(task.createdAt);
        return taskDate.toDateString() === day.toDateString();
      });

      return {
        day: format(day, 'EEE'),
        date: format(day, 'MMM dd'),
        completed: dayTasks.filter(task => task.isCompleted).length,
        failed: dayTasks.filter(task => 
          !task.isCompleted && parseISO(task.endTime) < now
        ).length,
        total: dayTasks.length
      };
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentAnalytics = getAnalyticsData();
  const pieData = getPieChartData();
  const weeklyData = getWeeklyData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your task completion and productivity metrics
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="form-input"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {currentAnalytics.total}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {currentAnalytics.completed}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {currentAnalytics.failed}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {currentAnalytics.successRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pie Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Task Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No data available for the selected time range
            </div>
          )}
        </div>

        {/* Weekly Bar Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Detailed Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {currentAnalytics.completed}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed Tasks</p>
          </div>
          
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {currentAnalytics.failed}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed Tasks</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {currentAnalytics.active}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Tasks</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Trash2 className="h-8 w-8 text-gray-600 dark:text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {currentAnalytics.deleted}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Deleted Tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
