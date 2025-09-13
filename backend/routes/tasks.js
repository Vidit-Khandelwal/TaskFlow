import express from 'express';
import { body, validationResult } from 'express-validator';
import { TaskModel } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userTasks = await TaskModel.find({ userId: req.session.user.id }).sort({ createdAt: -1 }).lean();
    res.json(userTasks.map(t => ({ ...t, id: t._id })));
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task
router.post('/', requireAuth, [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low','medium','high','none']),
  body('recurrence').optional().custom((val) => {
    if (!val) return true;
    if (typeof val !== 'object') throw new Error('Invalid recurrence');
    const allowed = ['none','daily','weekly','custom'];
    if (!allowed.includes(val.type)) throw new Error('Invalid recurrence type');
    if (val.type === 'custom') {
      if (!Array.isArray(val.dates)) throw new Error('recurrence.dates must be an array for custom');
      for (const d of val.dates) {
        if (isNaN(Date.parse(d))) throw new Error('Invalid date in recurrence.dates');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, startTime, endTime, priority, recurrence } = req.body;

    // Validate that end time is after start time
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Enforce start window: default +/-7 days; for recurrence allow up to +30 days forward
    const now = new Date();
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowEndDefault = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const windowEndRecurring = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const s = new Date(startTime);
    const e = new Date(endTime);
    const isRecurring = recurrence && recurrence.type && recurrence.type !== 'none';
    const allowedEnd = isRecurring ? windowEndRecurring : windowEndDefault;
    if (s < windowStart || s > allowedEnd) {
      return res.status(400).json({ message: 'Start time must be within 7 days before or after today' });
    }

    // If recurring, generate multiple tasks up to next 30 days
    if (isRecurring) {
      const tasksToCreate = [];
      const baseStart = new Date(startTime);
      const baseEnd = new Date(endTime);
      const cutoff = windowEndRecurring; // 30 days from now

      const addOccurrence = (occurrenceDate) => {
        const start = new Date(occurrenceDate);
        start.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
        const end = new Date(occurrenceDate);
        end.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);
        if (end <= start) return; // skip invalid
        if (start < now) return; // don't create past occurrences
        if (start > cutoff) return; // limit to 30 days window
        tasksToCreate.push({
          userId: req.session.user.id,
          title,
          description,
          startTime: start,
          endTime: end,
          ...(priority && { priority })
        });
      };

      if (recurrence.type === 'daily') {
        let cursor = new Date(baseStart);
        while (cursor <= cutoff) {
          addOccurrence(cursor);
          cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
        }
      } else if (recurrence.type === 'weekly') {
        let cursor = new Date(baseStart);
        while (cursor <= cutoff) {
          addOccurrence(cursor);
          cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      } else if (recurrence.type === 'custom') {
        for (const d of (recurrence.dates || [])) {
          const day = new Date(d);
          addOccurrence(day);
        }
      }

      if (tasksToCreate.length === 0) {
        return res.status(400).json({ message: 'No valid occurrences to schedule within next 30 days' });
      }

      const created = await TaskModel.insertMany(tasksToCreate);
      return res.status(201).json({ message: 'Recurring tasks created', count: created.length });
    }

    // Single task
    const newTask = await TaskModel.create({
      userId: req.session.user.id,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      ...(priority && { priority })
    });

    res.status(201).json({ ...newTask.toObject(), id: newTask._id });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', requireAuth, [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('description').optional().trim(),
  body('isCompleted').optional().isBoolean(),
  body('priority').optional().isIn(['low','medium','high','none'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const taskId = req.params.id;
    const { title, description, startTime, endTime, isCompleted, priority } = req.body;

    // Check if task exists and belongs to user
    const existingTask = await TaskModel.findOne({ _id: taskId, userId: req.session.user.id });
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Disallow any updates to a completed task
    if (existingTask.isCompleted) {
      if (isCompleted === false) {
        return res.status(400).json({ message: 'Cannot unmark a completed task' });
      }
      return res.status(400).json({ message: 'Cannot update a completed task' });
    }

    // If client requests to mark complete for a task that starts in the future, block it
    if ((isCompleted === true || isCompleted === 'true') && new Date(existingTask.startTime) > new Date()) {
      return res.status(400).json({ message: 'Cannot complete a task that has not started yet' });
    }

    // If the request only toggles completion to true, allow without time validations
    const onlyToggleComplete =
      (isCompleted === true || isCompleted === 'true') &&
      title === undefined && description === undefined && startTime === undefined && endTime === undefined && priority === undefined;
    if (onlyToggleComplete) {
      existingTask.isCompleted = true;
      existingTask.updatedAt = new Date();
      await existingTask.save();
      return res.json({ ...existingTask.toObject(), id: existingTask._id });
    }

    // Check if task has expired
    const now = new Date();
    // If expired, prevent un-completing (for safety, though completed tasks already blocked above)
    if (now > new Date(existingTask.endTime) && isCompleted === false) {
      return res.status(400).json({ message: 'Cannot uncomplete an expired task' });
    }

    // Validate time constraints if updating times
    if (startTime && endTime) {
      if (new Date(endTime) <= new Date(startTime)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
    }

    // Enforce start within +/- 7 days if provided; end only needs to be after start
    const nowWindow = new Date();
    const wStart = new Date(nowWindow.getTime() - 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(nowWindow.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (startTime) {
      const s2 = new Date(startTime);
      if (s2 < wStart || s2 > wEnd) {
        return res.status(400).json({ message: 'Start time must be within 7 days before or after today' });
      }
    }
    // End time must be now or later when updating
    if (endTime) {
      const e2 = new Date(endTime);
      if (e2 < nowWindow) {
        return res.status(400).json({ message: 'End time must be now or later' });
      }
    }

    const updateData = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (priority !== undefined) updateData.priority = priority;

    const updatedTask = await TaskModel.findOneAndUpdate(
      { _id: taskId, userId: req.session.user.id },
      { $set: updateData },
      { new: true }
    );
    res.json({ ...updatedTask.toObject(), id: updatedTask._id });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const existingTask = await TaskModel.findOne({ _id: taskId, userId: req.session.user.id });
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task has expired
    const now = new Date();
    if (now > new Date(existingTask.endTime)) {
      return res.status(400).json({ message: 'Cannot delete an expired task' });
    }

    await TaskModel.updateOne({ _id: taskId, userId: req.session.user.id }, { $set: { isDeleted: true, updatedAt: new Date() } });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const allTasks = await TaskModel.find({ userId: req.session.user.id }).lean();

    // Calculate analytics
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.isCompleted).length;
    const failedTasks = allTasks.filter(task => 
      !task.isCompleted && new Date(task.endTime) < now
    ).length;
    const deletedTasks = allTasks.filter(task => task.isDeleted).length;
    const activeTasks = allTasks.filter(task => 
      !task.isCompleted && !task.isDeleted && new Date(task.endTime) >= now
    ).length;

    const analytics = {
      total: totalTasks,
      completed: completedTasks,
      failed: failedTasks,
      deleted: deletedTasks,
      active: activeTasks,
      successRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
