const { applyCors } = require('./_http');
const { runDueEntries } = require('./_autoRunner');

module.exports = async (req, res) => {
  if (applyCors(req, res, ['GET', 'POST', 'OPTIONS'])) {
    return;
  }

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await runDueEntries();
    return res.status(200).json(result);
  } catch (error) {
    console.error('auto-run-due error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Không thể chạy auto refresh.',
    });
  }
};