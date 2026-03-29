const { applyCors } = require('./_http');
const { deleteRunHistoryItem, getRunHistory } = require('./_autoStorage');

module.exports = async (req, res) => {
  if (applyCors(req, res, ['GET', 'DELETE', 'OPTIONS'])) {
    return;
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        runHistory: await getRunHistory(),
      });
    }

    if (req.method === 'DELETE') {
      const runId = String(req.query?.id || '').trim();
      if (!runId) {
        return res.status(400).json({ ok: false, error: 'Thiếu id lịch sử auto cần xoá.' });
      }

      const result = await deleteRunHistoryItem(runId);
      return res.status(200).json({
        ok: true,
        message: 'Đã xoá lịch sử auto.',
        ...result,
      });
    }

    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('auto-runs error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Không thể xử lý lịch sử auto.',
    });
  }
};
