require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DB_FILE = path.resolve(process.env.DB_FILE || path.join(__dirname, 'demokit.db'));
const DB_DIR = path.dirname(DB_FILE);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_FILE);

function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes });
  }));
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}
function exec(sql) {
  return new Promise((resolve, reject) => db.exec(sql, err => err ? reject(err) : resolve()));
}

async function initDb() {
  await exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user','manager')),
      region TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS kits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      serial TEXT NOT NULL,
      model TEXT NOT NULL,
      category TEXT NOT NULL,
      home_region TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      assigned_user TEXT,
      assigned_from TEXT,
      assigned_until TEXT,
      purchase_cost REAL NOT NULL DEFAULT 0,
      accessories_cost REAL NOT NULL DEFAULT 0,
      other_cost REAL NOT NULL DEFAULT 0,
      transport_cost REAL NOT NULL DEFAULT 0,
      maintenance_cost REAL NOT NULL DEFAULT 0,
      purchase_date TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      kit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      from_date TEXT NOT NULL,
      until_date TEXT NOT NULL,
      customer TEXT,
      purpose TEXT,
      region TEXT,
      budget REAL NOT NULL DEFAULT 0,
      remarks TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      approved_at TEXT,
      approved_by TEXT,
      FOREIGN KEY(kit_id) REFERENCES kits(id) ON DELETE RESTRICT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      kit_id TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(kit_id) REFERENCES kits(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      user TEXT NOT NULL,
      kit_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL
    );
  `);

  const count = await get('SELECT COUNT(*) AS n FROM users');
  if (!count.n) {
    const seedUsers = [
      ['admin','System Administrator','admin@demokit.local','admin123','admin','Chennai'],
      ['user1','Demo User','user1@demokit.local','user123','user','Chennai'],
      ['user2','Sales User','user2@demokit.local','user123','user','Bangalore'],
      ['manager1','Regional Manager','manager@demokit.local','manager123','manager','Hyderabad']
    ];
    for (const [id,name,email,password,role,region] of seedUsers) {
      await run('INSERT INTO users (id,name,email,password_hash,role,region) VALUES (?,?,?,?,?,?)',
        [id,name,email,await bcrypt.hash(password, 12),role,region]);
    }
  }

  const kitCount = await get('SELECT COUNT(*) AS n FROM kits');
  if (!kitCount.n) {
    const categories = ['Laptop','Mobile','Tablet','IoT'];
    const regions = ['Chennai','Bangalore','Hyderabad','Coimbatore'];
    for (let i = 1; i <= 20; i++) {
      const number = String(i).padStart(2,'0');
      const category = categories[(i-1) % categories.length];
      const region = regions[(i-1) % regions.length];
      await run(`INSERT INTO kits
        (id,name,serial,model,category,home_region,status,purchase_cost,accessories_cost,other_cost,transport_cost,maintenance_cost,purchase_date,notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          `DK-${number}`, `Demo Kit ${number}`, `SN-DK-2026${number}`,
          `${category} Demo Model ${number}`, category, region, 'AVAILABLE',
          50000 + i * 2500, 3000 + i * 200, i * 500, 0, 0, '2026-01-10',
          'Demo kit available for regional customer demonstrations.'
      ]);
    }
  }
}

function userPublic(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role, region: row.region, status: row.status, lastLogin: row.last_login };
}
function kitPublic(row) {
  return {
    id: row.id, name: row.name, serial: row.serial, model: row.model, category: row.category,
    homeRegion: row.home_region, status: row.status, assignedUser: row.assigned_user,
    assignedFrom: row.assigned_from, assignedUntil: row.assigned_until,
    purchaseCost: row.purchase_cost, accessoriesCost: row.accessories_cost, otherCost: row.other_cost,
    transportCost: row.transport_cost, maintenanceCost: row.maintenance_cost,
    purchaseDate: row.purchase_date, notes: row.notes
  };
}
function bookingPublic(row) {
  return {
    id: row.id, kitId: row.kit_id, userId: row.user_id, userName: row.user_name, userEmail: row.user_email,
    from: row.from_date, until: row.until_date, customer: row.customer, purpose: row.purpose,
    region: row.region, budget: row.budget, remarks: row.remarks, status: row.status,
    createdAt: row.created_at, approvedAt: row.approved_at, approvedBy: row.approved_by
  };
}
function logPublic(row) {
  return { id: row.id, date: row.date, time: row.time, user: row.user, kitId: row.kit_id, action: row.action, details: row.details };
}

async function getState() {
  const [u,k,b,l,p] = await Promise.all([
    all('SELECT * FROM users ORDER BY created_at DESC'),
    all('SELECT * FROM kits ORDER BY id'),
    all('SELECT * FROM bookings ORDER BY created_at DESC'),
    all('SELECT * FROM activity_logs ORDER BY date DESC, time DESC LIMIT 500'),
    all('SELECT * FROM purchases ORDER BY created_at DESC')
  ]);
  return {
    users: u.map(userPublic), kits: k.map(kitPublic), bookings: b.map(bookingPublic),
    logs: l.map(logPublic), purchases: p.map(x => ({ id:x.id, kitId:x.kit_id, ...JSON.parse(x.data_json) }))
  };
}

function requireAuth(req,res,next) {
  if (!req.session.userId) return res.status(401).json({ error:'Authentication required.' });
  next();
}
function requireAdmin(req,res,next) {
  if (!req.session.userId || req.session.role !== 'admin') return res.status(403).json({ error:'Admin access required.' });
  next();
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit:'2mb' }));
app.use(express.urlencoded({ extended:false }));
app.use(session({
  name: 'demokit.sid',
  secret: process.env.SESSION_SECRET || 'CHANGE_ME_IN_PRODUCTION',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: DB_DIR }),
  cookie: { httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000*60*60*8 }
}));

const loginLimiter = rateLimit({ windowMs: 15*60*1000, limit: 20, standardHeaders:true, legacyHeaders:false });

app.post('/api/login', loginLimiter, async (req,res) => {
  try {
    const { username, password, role } = req.body || {};
    const user = await get('SELECT * FROM users WHERE lower(id)=lower(?)', [String(username || '').trim()]);
    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
      return res.status(401).json({ error:'Invalid User ID or password.' });
    }
    if (role === 'admin' && user.role !== 'admin') return res.status(403).json({ error:'This account does not have Admin access.' });
    if (role === 'user' && user.role === 'admin') return res.status(403).json({ error:'Please select the Admin login.' });
    const lastLogin = new Date().toISOString();
    await run('UPDATE users SET last_login=? WHERE id=?',[lastLogin,user.id]);
    req.session.userId = user.id;
    req.session.role = user.role;
    await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
    await createLog(user, 'LOGIN', '-', `User ${user.name} logged into the system.`);
    res.json({ user: userPublic({ ...user, last_login:lastLogin }) });
  } catch (e) { res.status(500).json({ error:'Login failed.' }); }
});

app.post('/api/logout', requireAuth, async (req,res) => {
  const user = await get('SELECT * FROM users WHERE id=?',[req.session.userId]);
  if (user) await createLog(user,'LOGOUT','-',`${user.name} logged out.`);
  req.session.destroy(() => res.json({ ok:true }));
});

app.get('/api/me', requireAuth, async (req,res) => {
  const user = await get('SELECT * FROM users WHERE id=?',[req.session.userId]);
  if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error:'Session expired.' });
  res.json({ user:userPublic(user) });
});

app.get('/api/state', requireAuth, async (req,res) => res.json(await getState()));

async function createLog(user, action, kitId, details) {
  const now = new Date();
  const id = 'LOG-' + Date.now().toString().slice(-8) + Math.floor(Math.random()*100);
  await run('INSERT INTO activity_logs (id,date,time,user,kit_id,action,details) VALUES (?,?,?,?,?,?,?)', [
    id, now.toISOString().slice(0,10), now.toLocaleTimeString('en-IN'), user?.name || 'System', kitId || '-', action, details
  ]);
}

app.post('/api/logs', requireAuth, async (req,res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id=?',[req.session.userId]);
    const { action, kitId, details } = req.body || {};
    await createLog(user, String(action||'SYSTEM').slice(0,80), kitId || '-', String(details||'').slice(0,1000));
    res.status(201).json({ ok:true });
  } catch(e) { res.status(500).json({ error:'Could not create activity log.' }); }
});

app.delete('/api/logs', requireAdmin, async (req,res) => {
  await run('DELETE FROM activity_logs');
  res.json({ ok:true });
});

function kitParams(k) {
  return [k.id,k.name,k.serial,k.model,k.category,k.homeRegion,k.status || 'AVAILABLE',k.assignedUser || null,k.assignedFrom || null,k.assignedUntil || null,
    Number(k.purchaseCost||0),Number(k.accessoriesCost||0),Number(k.otherCost||0),Number(k.transportCost||0),Number(k.maintenanceCost||0),k.purchaseDate||null,k.notes||null];
}
function bookingParams(b) {
  return [b.id,b.kitId,b.userId,b.userName,b.userEmail,b.from,b.until,b.customer||'',b.purpose||'',b.region||'',Number(b.budget||0),b.remarks||'',b.status||'PENDING',b.createdAt||new Date().toISOString(),b.approvedAt||null,b.approvedBy||null];
}

app.put('/api/state', requireAuth, async (req,res) => {
  const incoming = req.body || {};
  const actor = await get('SELECT * FROM users WHERE id=?',[req.session.userId]);
  try {
    if (req.session.role === 'admin') {
      if (Array.isArray(incoming.kits)) {
        const incomingKitIds = incoming.kits.map(k => k.id).filter(Boolean);
        if (incomingKitIds.length) {
          const placeholders = incomingKitIds.map(() => '?').join(',');
          await run(`DELETE FROM kits WHERE id NOT IN (${placeholders}) AND id NOT IN (SELECT DISTINCT kit_id FROM bookings WHERE status IN ('PENDING','APPROVED'))`, incomingKitIds);
        }
        for (const k of incoming.kits) {
          await run(`INSERT INTO kits (id,name,serial,model,category,home_region,status,assigned_user,assigned_from,assigned_until,purchase_cost,accessories_cost,other_cost,transport_cost,maintenance_cost,purchase_date,notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name,serial=excluded.serial,model=excluded.model,category=excluded.category,home_region=excluded.home_region,status=excluded.status,assigned_user=excluded.assigned_user,assigned_from=excluded.assigned_from,assigned_until=excluded.assigned_until,purchase_cost=excluded.purchase_cost,accessories_cost=excluded.accessories_cost,other_cost=excluded.other_cost,transport_cost=excluded.transport_cost,maintenance_cost=excluded.maintenance_cost,purchase_date=excluded.purchase_date,notes=excluded.notes`, kitParams(k));
        }
      }
      if (Array.isArray(incoming.users)) {
        for (const u of incoming.users) {
          const existing = await get('SELECT * FROM users WHERE id=?',[u.id]);
          if (existing) {
            if (u.password) await run('UPDATE users SET name=?,email=?,password_hash=?,role=?,region=?,status=? WHERE id=?',[u.name,u.email,await bcrypt.hash(u.password,12),u.role,u.region,u.status,u.id]);
            else await run('UPDATE users SET name=?,email=?,role=?,region=?,status=? WHERE id=?',[u.name,u.email,u.role,u.region,u.status,u.id]);
          } else if (u.password) {
            await run('INSERT INTO users (id,name,email,password_hash,role,region,status,last_login) VALUES (?,?,?,?,?,?,?,?)',[u.id,u.name,u.email,await bcrypt.hash(u.password,12),u.role,u.region,u.status||'ACTIVE',u.lastLogin||null]);
          }
        }
      }
      if (Array.isArray(incoming.bookings)) {
        for (const b of incoming.bookings) {
          const owner = await get('SELECT id FROM users WHERE id=?',[b.userId]);
          const kit = await get('SELECT id FROM kits WHERE id=?',[b.kitId]);
          if (!owner || !kit) continue;
          await run(`INSERT INTO bookings (id,kit_id,user_id,user_name,user_email,from_date,until_date,customer,purpose,region,budget,remarks,status,created_at,approved_at,approved_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET kit_id=excluded.kit_id,user_id=excluded.user_id,user_name=excluded.user_name,user_email=excluded.user_email,from_date=excluded.from_date,until_date=excluded.until_date,customer=excluded.customer,purpose=excluded.purpose,region=excluded.region,budget=excluded.budget,remarks=excluded.remarks,status=excluded.status,created_at=excluded.created_at,approved_at=excluded.approved_at,approved_by=excluded.approved_by`, bookingParams(b));
        }
      }
      if (Array.isArray(incoming.purchases)) {
        for (const p of incoming.purchases) {
          await run('INSERT OR REPLACE INTO purchases (id,kit_id,data_json,created_at) VALUES (?,?,?,?)',[p.id || ('PUR-'+Date.now()),p.kitId||null,JSON.stringify(p),new Date().toISOString()]);
        }
      }
    } else {
      if (Array.isArray(incoming.bookings)) {
        const owned = await all('SELECT * FROM bookings WHERE user_id=?',[actor.id]);
        const ownedIds = new Set(owned.map(x=>x.id));
        for (const b of incoming.bookings.filter(x=>x.userId===actor.id)) {
          const existing = await get('SELECT * FROM bookings WHERE id=? AND user_id=?',[b.id,actor.id]);
          if (!existing) {
            if (b.status !== 'PENDING') continue;
            const kit = await get('SELECT id FROM kits WHERE id=?',[b.kitId]);
            if (!kit) continue;
            await run(`INSERT INTO bookings (id,kit_id,user_id,user_name,user_email,from_date,until_date,customer,purpose,region,budget,remarks,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [b.id,b.kitId,actor.id,actor.name,actor.email,b.from,b.until,b.customer||'',b.purpose||'',b.region||'',Number(b.budget||0),b.remarks||'','PENDING',b.createdAt||new Date().toISOString()]);
          } else if (ownedIds.has(b.id) && existing.status !== 'CANCELLED' && b.status === 'CANCELLED') {
            await run('UPDATE bookings SET status=? WHERE id=? AND user_id=?',['CANCELLED',b.id,actor.id]);
          }
        }
      }
    }
    res.json({ ok:true, state:await getState() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:'Could not save application data.' });
  }
});


const resetCodes = new Map();
function makeOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

app.post('/api/password/request', loginLimiter, async (req,res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = await get('SELECT * FROM users WHERE lower(email)=?', [email]);
  // Do not reveal whether an email exists in production.
  if (!user) return res.json({ ok:true, message:'If the account exists, a reset code has been sent.' });

  const otp = makeOtp();
  resetCodes.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 });

  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (smtpConfigured) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'DemoKit password reset code',
        text: `Your DemoKit password reset code is ${otp}. It expires in 10 minutes.`
      });
    } catch (e) {
      console.error('Password reset email failed:', e);
      return res.status(503).json({ error:'Password reset email could not be sent.' });
    }
  } else if (process.env.NODE_ENV !== 'production') {
    // Development convenience only. Never exposed when NODE_ENV=production.
    return res.json({ ok:true, devOtp:otp, message:'Development reset code generated.' });
  } else {
    return res.status(503).json({ error:'Password reset email is not configured on this server.' });
  }

  res.json({ ok:true, message:'If the account exists, a reset code has been sent.' });
});

app.post('/api/password/reset', loginLimiter, async (req,res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const otp = String(req.body?.otp || '').trim();
  const password = String(req.body?.password || '');
  if (password.length < 6) return res.status(400).json({ error:'Password must contain at least 6 characters.' });
  const saved = resetCodes.get(email);
  if (!saved || saved.expires < Date.now() || saved.otp !== otp) return res.status(400).json({ error:'Invalid or expired reset code.' });
  const user = await get('SELECT * FROM users WHERE lower(email)=?', [email]);
  if (!user) return res.status(400).json({ error:'Invalid or expired reset code.' });
  await run('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(password,12), user.id]);
  resetCodes.delete(email);
  await createLog(user,'PASSWORD_RESET','-',`${user.id} reset their password.`);
  res.json({ ok:true });
});

app.use(express.static(path.join(__dirname,'public'), { extensions:['html'] }));
app.get(/.*/, (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));

initDb().then(() => {
  app.listen(PORT, () => console.log(`DemoKit server running on http://localhost:${PORT}`));
}).catch(err => { console.error(err); process.exit(1); });
