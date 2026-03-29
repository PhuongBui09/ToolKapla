const { applyCors } = require('./_http');
const { runDueEntries } = require('./_autoRunner');

function isAuthorizedCronRequest(req) {
  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  const authHeader = String(req.headers.authorization || '').trim();

  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  if (process.env.VERCEL_ENV !== 'production') {
    return true;
  }

  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();
  return userAgent.includes('vercel-cron');
}

module.exports = async (req, res) => {
  if (applyCors(req, res, ['GET', 'POST', 'OPTIONS'])) {
    return;
  }

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized cron request' });
  }

  try {
    const result = await runDueEntries();
    return res.status(200).json(result);
  } catch (error) {
    console.error('cron-auto-refresh error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Cron auto refresh failed.',
    });
  }
};
