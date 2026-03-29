const { applyCors } = require('./_http');
const { mergeLegacyState } = require('./_autoStorage');

module.exports = async (req, res) => {
  if (applyCors(req, res, ['POST', 'OPTIONS'])) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await mergeLegacyState(req.body || {});
    return res.status(200).json({
      ok: true,
      message: 'Đã migrate dữ liệu auto cũ lên backend.',
      ...result,
    });
  } catch (error) {
    console.error('auto-migrate error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Không thể migrate dữ liệu auto cũ.',
    });
  }
};
