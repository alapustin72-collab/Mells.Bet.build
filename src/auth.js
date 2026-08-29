// ---------------------------------------------------------------------------
// SPWorlds Mini App auth. There is no registration or login screen — the
// app only ever runs embedded inside spworlds.ru, which hands the frontend
// the player's signed identity (accountId, username = their spworlds/MC
// nickname, minecraftUUID, hash) via postMessage (see the `spwmini`
// package used in public/index.html). The frontend POSTs that object here
// on every load; we verify the signature server-side with checkUser() and
// either find the matching account or create one on the spot — the player
// is playing under their real spworlds account the instant the app opens.
// ---------------------------------------------------------------------------

import express from 'express';
import { checkUser } from 'spwmini/middleware';
import { db } from './db.js';

const router = express.Router();

router.post('/spwmini', async (req, res) => {
  const { accountId, username, minecraftUUID, hash } = req.body || {};
  if (!accountId || !username || !hash) {
    return res.status(400).json({ error: 'Missing SPWorlds identity data' });
  }

  const token = process.env.SPWORLDS_MINIAPP_TOKEN;
  if (!token) {
    console.error('SPWORLDS_MINIAPP_TOKEN not set in .env — cannot verify mini app identity');
    return res.status(500).json({ error: 'Server not configured' });
  }

  let valid;
  try {
    valid = checkUser({ accountId, username, minecraftUUID, hash }, token);
  } catch (err) {
    console.error('checkUser threw:', err);
    return res.status(400).json({ error: 'Invalid SPWorlds signature' });
  }
  if (!valid) {
    return res.status(403).json({ error: 'Invalid SPWorlds signature' });
  }

  try {
    let user = await db.getUserBySpwminiAccountId(accountId);
    if (!user) {
      user = await db.createUserFromSpwmini({ accountId, mcNick: username, minecraftUUID });

      // Bootstrap admin role from env, one time, on first login only.
      const bootstrapIds = (process.env.BOOTSTRAP_ADMIN_SPWMINI_IDS || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      if (bootstrapIds.includes(String(accountId))) {
        await db.setUserRole(user.id, 'admin');
      }
    } else if (user.mcNick !== username) {
      // Player renamed on spworlds since their last visit — keep it synced.
      try {
        await db.updateUserNick(user.id, username);
        user = await db.getUser(user.id);
      } catch (err) {
        console.warn(`Could not sync nickname for ${user.id} to "${username}":`, err.message);
      }
    }

    req.session.userId = user.id;
    const { id, mcNick, balance, role, code } = user;
    res.json({ user: { id, nick: mcNick, balance, role, code } });
  } catch (err) {
    console.error('spwmini login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// Middleware: attaches req.user if logged in.
export async function attachUser(req, res, next) {
  try {
    if (req.session && req.session.userId) {
      req.user = await db.getUser(req.session.userId);
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Middleware: requires login.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// Middleware: requires admin role (checked against the DB, never the nickname).
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

export default router;
