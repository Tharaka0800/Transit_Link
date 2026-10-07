import Notification from '../models/Notification.js';

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { userId: req.user._id };

    if (type && type !== 'all') {
      filter.type = type;
    }

    const notifications = await Notification.find(filter).sort({
      timestamp: -1,
    });

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private
const createNotification = async (req, res, next) => {
  try {
    const { title, message, type, userId } = req.body;

    if (!title || !message) {
      res.status(400);
      throw new Error('Please provide title and message');
    }

    const notification = await Notification.create({
      userId: userId || req.user._id,
      title,
      message,
      type: type || 'general',
      isRead: false,
      timestamp: new Date(),
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete / dismiss a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }

    await notification.deleteOne();

    res.json({ message: 'Notification dismissed', id: req.params.id });
  } catch (error) {
    next(error);
  }
};

export {
  getNotifications,
  createNotification,
  markAsRead,
  deleteNotification,
};
