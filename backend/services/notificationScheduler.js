import cron from 'node-cron';
import { TaskModel } from '../db/schema.js';
import { sendTaskReminderEmail } from './emailService.js';

// Track sent notifications to avoid duplicates
const sentNotifications = new Set();

// Function to check for tasks ending in 5 minutes
const checkTaskReminders = async () => {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    // Find tasks that end between now and 5 minutes from now
    const tasksToRemind = await TaskModel.find({
      endTime: {
        $gte: now,
        $lte: fiveMinutesFromNow
      },
      isCompleted: false,
      isDeleted: false
    }).populate('userId', 'email name emailVerified');
    
    console.log(`Found ${tasksToRemind.length} tasks ending in 5 minutes`);
    
    for (const task of tasksToRemind) {
      const notificationKey = `${task._id}-${task.endTime.getTime()}`;
      
      // Check if we already sent a notification for this task
      if (sentNotifications.has(notificationKey)) {
        continue;
      }
      
      // Only for verified emails
      if (!task.userId.emailVerified) {
        continue;
      }

      // Send email notification
      const result = await sendTaskReminderEmail(
        task.userId.email,
        task.userId.name,
        task.title,
        task.endTime
      );
      
      if (result.success) {
        console.log(`📧 EMAIL REMINDER SENT: "${task.title}" to ${task.userId.email}`);
        sentNotifications.add(notificationKey);
      } else {
        console.log(`📧 CONSOLE REMINDER: "${task.title}" for ${task.userId.name} (${task.userId.email}) - Task ends in 5 minutes!`);
        sentNotifications.add(notificationKey);
      }
    }
    
    // Clean up old notification keys (older than 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    for (const key of sentNotifications) {
      const taskId = key.split('-')[0];
      const timestamp = parseInt(key.split('-')[1]);
      if (timestamp < oneHourAgo.getTime()) {
        sentNotifications.delete(key);
      }
    }
    
  } catch (error) {
    console.error('Error checking task reminders:', error);
  }
};

// Start the cron job to check every minute
export const startNotificationScheduler = () => {
  console.log('Starting notification scheduler...');
  
  // Check email configuration first
  import('./emailService.js').then(({ testEmailConfiguration }) => {
    testEmailConfiguration().then(isValid => {
      if (!isValid) {
        console.warn('Email configuration is invalid. Notifications will not be sent.');
        return;
      }
      
      // Run every minute
      cron.schedule('* * * * *', () => {
        console.log('Checking for task reminders...');
        checkTaskReminders();
      });
      
      console.log('Notification scheduler started successfully');
    });
  });
};

// Stop the scheduler (useful for testing)
export const stopNotificationScheduler = () => {
  cron.getTasks().forEach(task => task.stop());
  console.log('Notification scheduler stopped');
};
