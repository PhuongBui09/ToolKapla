const { applyCors } = require('./_http');
const { getState } = require('./_autoStorage');

module.exports = async (req, res) => {
  if (applyCors(req, res, ['GET', 'OPTIONS'])) {
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const state = await getState();
    return res.status(200).json({
      ok: true,
      mode: 'server',
      state,
    });
  } catch (error) {
    console.error('auto-state error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Không thể tải dữ liệu auto từ server.',
    });
  }
};
