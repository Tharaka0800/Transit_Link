import User from '../models/User.js';
import Notification from '../models/Notification.js';

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

const atToday = (hours, minutes = 0) => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

/**
 * Full seed covering Login / Profile / Notifications / Help & Support flows.
 * Clears existing TransitLink demo collections when `reset` is true.
 */
const seedDemoData = async ({ reset = false } = {}) => {
  if (reset) {
    await Notification.deleteMany({});
    await User.deleteMany({});
  }

  let primary = await User.findOne({ email: 'tharukee01@gmail.com' });
  let secondary = await User.findOne({ email: 'passenger.demo@transitlink.lk' });
  let admin = await User.findOne({ email: 'admin@transitlink.lk' });

  if (!primary) {
    primary = await User.create({
      fullName: 'Tharukee Amasha',
      email: 'tharukee01@gmail.com',
      phone: '+94 71 123 4567',
      password: 'password123',
      role: 'passenger',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    });
  }

  if (!secondary) {
    secondary = await User.create({
      fullName: 'Kasun Perera',
      email: 'passenger.demo@transitlink.lk',
      phone: '+94 77 555 1212',
      password: 'password123',
      role: 'passenger',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    });
  }

  if (!admin) {
    admin = await User.create({
      fullName: 'TransitLink Admin',
      email: 'admin@transitlink.lk',
      phone: '+94 11 200 3000',
      password: 'admin123',
      role: 'admin',
      avatar: '',
    });
  }

  const primaryCount = await Notification.countDocuments({ userId: primary._id });
  if (primaryCount === 0 || reset) {
    if (reset) {
      await Notification.deleteMany({ userId: primary._id });
    }

    await Notification.insertMany([
      // Matches Notifications prototype — unread delay (Find Alternative Route)
      {
        userId: primary._id,
        title: 'Delay Alert: Route 138',
        message:
          'Due to a sudden breakdown near Maharagama, expect delays of up to 20 minutes on Route 138.',
        type: 'delay',
        isRead: false,
        timestamp: atToday(10, 24),
      },
      // Service update — unread
      {
        userId: primary._id,
        title: 'Bus Arriving Soon',
        message:
          'Route 100 (Colombo Fort) is currently 3 stops away. Get ready to board!',
        type: 'service',
        isRead: false,
        timestamp: atToday(8, 43),
      },
      // Ticket — read (Tickets filter)
      {
        userId: primary._id,
        title: 'Ticket Purchased Successfully',
        message:
          "Your ticket for Colombo Fort to Kandy has been issued. View it in 'My Tickets'.",
        type: 'ticket',
        isRead: true,
        timestamp: hoursAgo(24),
      },
      // Info — unread (contributes to Profile badge = 3)
      {
        userId: primary._id,
        title: 'Holiday Schedule Update',
        message:
          "Public transport services will operate under Sunday timetables for tomorrow's holiday.",
        type: 'info',
        isRead: false,
        timestamp: hoursAgo(26),
      },
      // Extra coverage: another delay (dismiss / filter testing)
      {
        userId: primary._id,
        title: 'Delay Alert: Route 177',
        message:
          'Heavy traffic near Nugegoda Junction. Route 177 delayed by approximately 12 minutes.',
        type: 'delay',
        isRead: true,
        timestamp: hoursAgo(5),
      },
      // Extra coverage: ticket refund / status
      {
        userId: primary._id,
        title: 'Ticket Refund Processed',
        message:
          'Your refund for TXN10492813 (Colombo Fort → Kandy) has been credited to your wallet.',
        type: 'ticket',
        isRead: true,
        timestamp: hoursAgo(48),
      },
      // Extra coverage: service restored
      {
        userId: primary._id,
        title: 'Service Restored: Route 138',
        message:
          'Route 138 is back on schedule after the earlier breakdown. Normal operations resumed.',
        type: 'service',
        isRead: true,
        timestamp: hoursAgo(3),
      },
      // Extra coverage: general / support follow-up (Help & Support Report Issue flow)
      {
        userId: primary._id,
        title: 'Support Ticket Received',
        message:
          'We received your issue report. A TransitLink agent will respond within 24 hours.',
        type: 'general',
        isRead: true,
        timestamp: hoursAgo(12),
      },
      // Extra coverage: payment / fare
      {
        userId: primary._id,
        title: 'Fare Reminder',
        message:
          'Standard bus fare Colombo Fort → Kandy is LKR 320. Tap Fare Information under Routes to calculate.',
        type: 'info',
        isRead: true,
        timestamp: hoursAgo(72),
      },
    ]);
  }

  const secondaryCount = await Notification.countDocuments({
    userId: secondary._id,
  });
  if (secondaryCount === 0 || reset) {
    if (reset) {
      await Notification.deleteMany({ userId: secondary._id });
    }

    await Notification.insertMany([
      {
        userId: secondary._id,
        title: 'Welcome to TransitLink',
        message:
          'Track buses and trains, buy digital tickets, and manage your profile in one place.',
        type: 'info',
        isRead: false,
        timestamp: hoursAgo(1),
      },
      {
        userId: secondary._id,
        title: 'Bus Arriving Soon',
        message: 'Route 138 (Maharagama) is 2 stops away.',
        type: 'service',
        isRead: false,
        timestamp: hoursAgo(2),
      },
    ]);
  }

  const unread = await Notification.countDocuments({
    userId: primary._id,
    isRead: false,
  });

  console.log('--- TransitLink seed complete ---');
  console.log('Primary : tharukee01@gmail.com / password123');
  console.log('Secondary: passenger.demo@transitlink.lk / password123');
  console.log('Admin   : admin@transitlink.lk / admin123');
  console.log(`Primary unread notifications (Profile badge): ${unread}`);

  return { primary, secondary, admin };
};

export default seedDemoData;
