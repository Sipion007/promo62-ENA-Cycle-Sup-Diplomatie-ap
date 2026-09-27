import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = 'promo62-secret-key-change-in-production';

// Upload config
const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// Database setup
const db = new sqlite3.Database('./promo62.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Database connected');
});

// Initialize database
function initDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      admin_level TEXT DEFAULT 'none',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // User profiles
    db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      photo_url TEXT,
      bio TEXT,
      phone TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      size INTEGER,
      category TEXT,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )`);

    // Document categories
    db.run(`CREATE TABLE IF NOT EXISTS document_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )`);

    // Authorized student emails
    db.run(`CREATE TABLE IF NOT EXISTS authorized_emails (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Photos (galerie officielle)
    db.run(`CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      title TEXT,
      photo_url TEXT NOT NULL,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )`);

    // Schedule table
    db.run(`CREATE TABLE IF NOT EXISTS schedule (
      id TEXT PRIMARY KEY,
      course_name TEXT NOT NULL,
      instructor TEXT,
      day_of_week TEXT,
      start_time TEXT,
      end_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Grades table
    db.run(`CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      assessment_name TEXT NOT NULL,
      score REAL,
      max_score REAL DEFAULT 20,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id)
    )`);

    // Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATETIME NOT NULL,
      location TEXT,
      event_type TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Forum posts table
    db.run(`CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Forum comments
    db.run(`CREATE TABLE IF NOT EXISTS forum_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES forum_posts(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Reactions (likes)
    db.run(`CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT DEFAULT 'like',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY(post_id) REFERENCES forum_posts(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Direct messages
    db.run(`CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(recipient_id) REFERENCES users(id)
    )`);

    // Notifications
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      related_id TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Activity log
    db.run(`CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create admin users
    const adminPassword = bcrypt.hashSync('admin123', 10);

    // Regular Admin
    db.run(
      `INSERT OR IGNORE INTO users (id, email, password, name, role, admin_level) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), 'makouindiabate@gmail.com', adminPassword, 'Administrateur', 'admin', 'admin']
    );

    // Super Admin (hidden from other users)
    db.run(
      `INSERT OR IGNORE INTO users (id, email, password, name, role, admin_level) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), 'abouhaidara725@gmail.com', adminPassword, 'Super Administrateur', 'admin', 'superadmin'],
      () => {
        // Create default categories
        const categories = ['Cours', 'Syllabus', 'Documents officiels', 'Ressources'];
        categories.forEach(cat => {
          db.run(
            `INSERT OR IGNORE INTO document_categories (id, name) VALUES (?, ?)`,
            [uuid(), cat]
          );
        });
      }
    );

    console.log('Database initialized with all tables');
  });
}

initDatabase();

// Auth middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Log activity
function logActivity(userId, action, details = '') {
  db.run(
    'INSERT INTO activity_log (id, user_id, action, details) VALUES (?, ?, ?, ?)',
    [uuid(), userId, action, details]
  );
}

// Create notification
function createNotification(userId, type, content, relatedId = null) {
  db.run(
    'INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)',
    [uuid(), userId, type, content, relatedId]
  );
}

// ============= AUTH ROUTES =============
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'User not found' });

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;

  // Vérifier si l'email est autorisé
  db.get('SELECT * FROM authorized_emails WHERE email = ?', [email], (err, authorized) => {
    if (!authorized) {
      return res.status(403).json({ error: 'Email non autorisé. Contacte l\'administrateur.' });
    }

    const id = uuid();
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
      'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [id, email, hashedPassword, name, 'student'],
      function(err) {
        if (err) return res.status(400).json({ error: 'Email already exists' });

        // Create user profile
        db.run('INSERT INTO user_profiles (user_id) VALUES (?)', [id]);

        const token = jwt.sign({ id, email, role: 'student' }, JWT_SECRET, { expiresIn: '7d' });
        logActivity(id, 'REGISTERED', 'New student registered');
        res.json({ token, user: { id, name, email, role: 'student' } });
      }
    );
  });
});

// ============= USER PROFILE ROUTES =============
app.get('/api/profile/:userId', verifyToken, (req, res) => {
  db.get(`
    SELECT u.id, u.name, u.email, u.role, up.photo_url, up.bio, up.phone
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = ?
  `, [req.params.userId], (err, profile) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(profile || {});
  });
});

app.put('/api/profile/update', verifyToken, (req, res) => {
  const { bio, phone, photo_url } = req.body;

  db.run(
    'UPDATE user_profiles SET bio = ?, phone = ?, photo_url = ? WHERE user_id = ?',
    [bio, phone, photo_url, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'PROFILE_UPDATED', 'Updated profile information');
      res.json({ success: true });
    }
  );
});

// ============= DOCUMENTS ROUTES =============
app.get('/api/documents', verifyToken, (req, res) => {
  db.all(`
    SELECT d.*, dc.name as category_name
    FROM documents d
    LEFT JOIN document_categories dc ON d.category = dc.id
    ORDER BY d.created_at DESC
  `, [], (err, docs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(docs);
  });
});

app.post('/api/documents', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { title, filename, size, category } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO documents (id, title, filename, size, category, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
    [id, title, filename, size, category, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'DOCUMENT_ADDED', title);
      res.json({ id, title, filename, size, category });
    }
  );
});

app.delete('/api/documents/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  db.run('DELETE FROM documents WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    logActivity(req.user.id, 'DOCUMENT_DELETED', req.params.id);
    res.json({ success: true });
  });
});

// ============= PHOTOS (GALERIE) ROUTES =============
app.get('/api/photos', verifyToken, (req, res) => {
  db.all(`
    SELECT p.*, u.name
    FROM photos p
    JOIN users u ON p.uploaded_by = u.id
    ORDER BY p.created_at DESC
  `, [], (err, photos) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(photos);
  });
});

app.post('/api/photos', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { title, photo_url } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO photos (id, title, photo_url, uploaded_by) VALUES (?, ?, ?, ?)',
    [id, title, photo_url, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'PHOTO_ADDED', title);
      res.json({ id, title, photo_url });
    }
  );
});

// ============= SCHEDULE ROUTES =============
app.get('/api/schedule', verifyToken, (req, res) => {
  db.all('SELECT * FROM schedule ORDER BY day_of_week', [], (err, schedule) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(schedule);
  });
});

app.post('/api/schedule', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { course_name, instructor, day_of_week, start_time, end_time } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO schedule (id, course_name, instructor, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
    [id, course_name, instructor, day_of_week, start_time, end_time],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'COURSE_ADDED', course_name);
      res.json({ id, course_name, instructor, day_of_week, start_time, end_time });
    }
  );
});

// ============= GRADES ROUTES =============
app.get('/api/grades', verifyToken, (req, res) => {
  const query = req.user.role === 'admin'
    ? `SELECT g.*, u.name FROM grades g JOIN users u ON g.student_id = u.id ORDER BY g.created_at DESC`
    : `SELECT g.*, u.name FROM grades g JOIN users u ON g.student_id = u.id WHERE g.student_id = ? ORDER BY g.created_at DESC`;

  const params = req.user.role === 'admin' ? [] : [req.user.id];

  db.all(query, params, (err, grades) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(grades);
  });
});

app.post('/api/grades', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { student_id, assessment_name, score, max_score } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO grades (id, student_id, assessment_name, score, max_score) VALUES (?, ?, ?, ?, ?)',
    [id, student_id, assessment_name, score, max_score],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'GRADE_ADDED', assessment_name);
      createNotification(student_id, 'GRADE', `Nouvelle note: ${assessment_name}`, id);
      res.json({ id, student_id, assessment_name, score, max_score });
    }
  );
});

// ============= EVENTS ROUTES =============
app.get('/api/events', verifyToken, (req, res) => {
  db.all('SELECT * FROM events WHERE event_date >= datetime("now") ORDER BY event_date', [], (err, events) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(events);
  });
});

app.post('/api/events', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { title, description, event_date, location, event_type, tags } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO events (id, title, description, event_date, location, event_type, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, title, description, event_date, location, event_type, JSON.stringify(tags)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'EVENT_CREATED', title);
      res.json({ id, title, description, event_date, location, event_type });
    }
  );
});

// ============= FORUM ROUTES =============
app.get('/api/forum', verifyToken, (req, res) => {
  db.all(`
    SELECT fp.id, fp.content, fp.created_at, fp.updated_at, u.name, u.id as user_id,
           (SELECT COUNT(*) FROM reactions WHERE post_id = fp.id) as likes_count,
           (SELECT COUNT(*) FROM forum_comments WHERE post_id = fp.id) as comments_count
    FROM forum_posts fp
    JOIN users u ON fp.user_id = u.id
    ORDER BY fp.created_at DESC
  `, [], (err, posts) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(posts);
  });
});

app.post('/api/forum', verifyToken, (req, res) => {
  const { content } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO forum_posts (id, user_id, content) VALUES (?, ?, ?)',
    [id, req.user.id, content],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'POST_CREATED', content.substring(0, 50));
      res.json({ id, user_id: req.user.id, content });
    }
  );
});

app.put('/api/forum/:id', verifyToken, (req, res) => {
  const { content } = req.body;

  db.run(
    'UPDATE forum_posts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [content, req.params.id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(403).json({ error: 'Unauthorized' });
      logActivity(req.user.id, 'POST_EDITED', req.params.id);
      res.json({ success: true });
    }
  );
});

app.delete('/api/forum/:id', verifyToken, (req, res) => {
  db.get('SELECT user_id FROM forum_posts WHERE id = ?', [req.params.id], (err, post) => {
    if (!post || (post.user_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.run('DELETE FROM forum_posts WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'POST_DELETED', req.params.id);
      res.json({ success: true });
    });
  });
});

// ============= COMMENTS ROUTES =============
app.get('/api/forum/:postId/comments', verifyToken, (req, res) => {
  db.all(`
    SELECT fc.*, u.name
    FROM forum_comments fc
    JOIN users u ON fc.user_id = u.id
    WHERE fc.post_id = ?
    ORDER BY fc.created_at ASC
  `, [req.params.postId], (err, comments) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(comments);
  });
});

app.post('/api/forum/:postId/comments', verifyToken, (req, res) => {
  const { content } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO forum_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)',
    [id, req.params.postId, req.user.id, content],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      logActivity(req.user.id, 'COMMENT_ADDED', content.substring(0, 50));
      res.json({ id, post_id: req.params.postId, user_id: req.user.id, content });
    }
  );
});

// ============= REACTIONS (LIKES) ROUTES =============
app.post('/api/forum/:postId/react', verifyToken, (req, res) => {
  const { reaction_type } = req.body;
  const id = uuid();

  db.run(
    'INSERT OR REPLACE INTO reactions (id, post_id, user_id, reaction_type) VALUES (?, ?, ?, ?)',
    [id, req.params.postId, req.user.id, reaction_type || 'like'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/forum/:postId/react', verifyToken, (req, res) => {
  db.run(
    'DELETE FROM reactions WHERE post_id = ? AND user_id = ?',
    [req.params.postId, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ============= DIRECT MESSAGES ROUTES =============
app.get('/api/messages/:userId', verifyToken, (req, res) => {
  const otherId = req.params.userId;

  db.all(`
    SELECT * FROM direct_messages
    WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC
  `, [req.user.id, otherId, otherId, req.user.id], (err, messages) => {
    if (err) return res.status(500).json({ error: err.message });

    // Mark as read
    db.run('UPDATE direct_messages SET is_read = 1 WHERE recipient_id = ? AND sender_id = ?', [req.user.id, otherId]);

    res.json(messages);
  });
});

app.post('/api/messages/:userId', verifyToken, (req, res) => {
  const { content } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO direct_messages (id, sender_id, recipient_id, content) VALUES (?, ?, ?, ?)',
    [id, req.user.id, req.params.userId, content],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      createNotification(req.params.userId, 'MESSAGE', `Nouveau message`, id);
      logActivity(req.user.id, 'MESSAGE_SENT', req.params.userId);
      res.json({ id, sender_id: req.user.id, recipient_id: req.params.userId, content });
    }
  );
});

app.get('/api/conversations', verifyToken, (req, res) => {
  db.all(`
    SELECT DISTINCT
      CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as user_id,
      (SELECT name FROM users WHERE id = CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END) as user_name,
      (SELECT content FROM direct_messages WHERE
        (sender_id = ? AND recipient_id = CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END) OR
        (sender_id = CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AND recipient_id = ?)
        ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM direct_messages WHERE
        (sender_id = ? AND recipient_id = CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END) OR
        (sender_id = CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AND recipient_id = ?)
        ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM direct_messages
    WHERE sender_id = ? OR recipient_id = ?
    ORDER BY last_message_time DESC
  `, Array(24).fill(req.user.id), (err, conversations) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(conversations);
  });
});

// ============= NOTIFICATIONS ROUTES =============
app.get('/api/notifications', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id],
    (err, notifications) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(notifications);
    }
  );
});

app.put('/api/notifications/:id/read', verifyToken, (req, res) => {
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============= SEARCH ROUTES =============
app.get('/api/search', verifyToken, (req, res) => {
  const query = req.query.q || '';

  Promise.all([
    new Promise(resolve => {
      db.all(
        'SELECT id, title, filename, created_at FROM documents WHERE title LIKE ? LIMIT 10',
        [`%${query}%`],
        (err, docs) => resolve(docs || [])
      );
    }),
    new Promise(resolve => {
      db.all(
        'SELECT id, content, created_at FROM forum_posts WHERE content LIKE ? LIMIT 10',
        [`%${query}%`],
        (err, posts) => resolve(posts || [])
      );
    }),
    new Promise(resolve => {
      db.all(
        'SELECT id, title, event_date FROM events WHERE title LIKE ? LIMIT 10',
        [`%${query}%`],
        (err, events) => resolve(events || [])
      );
    })
  ]).then(([documents, posts, events]) => {
    res.json({ documents, posts, events });
  });
});

// ============= CATEGORIES ROUTES =============
app.get('/api/categories', verifyToken, (req, res) => {
  db.all('SELECT * FROM document_categories', [], (err, categories) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(categories);
  });
});

// ============= ADMIN STATISTICS =============
app.get('/api/admin/stats', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  Promise.all([
    new Promise(resolve => db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => resolve(row?.count || 0))),
    new Promise(resolve => db.get('SELECT COUNT(*) as count FROM forum_posts', [], (err, row) => resolve(row?.count || 0))),
    new Promise(resolve => db.get('SELECT COUNT(*) as count FROM documents', [], (err, row) => resolve(row?.count || 0))),
    new Promise(resolve => db.get('SELECT COUNT(*) as count FROM events', [], (err, row) => resolve(row?.count || 0)))
  ]).then(([users, posts, docs, events]) => {
    res.json({ users, posts, documents: docs, events });
  });
});

// ============= ACTIVITY LOG =============
app.get('/api/admin/activity', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  db.all(`
    SELECT al.*, u.name
    FROM activity_log al
    JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT 100
  `, [], (err, activities) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(activities);
  });
});

// ============= AUTHORIZED EMAILS ROUTES =============
app.get('/api/authorized-emails', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  db.all('SELECT * FROM authorized_emails ORDER BY created_at DESC', [], (err, emails) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(emails);
  });
});

app.post('/api/authorized-emails', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { email } = req.body;
  const id = uuid();

  db.run(
    'INSERT INTO authorized_emails (id, email) VALUES (?, ?)',
    [id, email],
    (err) => {
      if (err) return res.status(500).json({ error: 'Email already exists or invalid' });
      logActivity(req.user.id, 'EMAIL_ADDED', email);
      res.json({ id, email });
    }
  );
});

app.delete('/api/authorized-emails/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  db.run('DELETE FROM authorized_emails WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    logActivity(req.user.id, 'EMAIL_REMOVED', req.params.id);
    res.json({ success: true });
  });
});

// ============= USERS ROUTES =============
app.get('/api/users', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  db.all('SELECT id, name, email, role FROM users', [], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📱 Open in browser: http://localhost:${PORT}`);
  console.log(`\n🔐 Admin account:`);
  console.log(`   Email: admin@promo62.ena`);
  console.log(`   Password: admin123\n`);
});
