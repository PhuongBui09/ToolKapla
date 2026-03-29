const { applyCors } = require('./_http');
const { runEntryById } = require('./_autoRunner');

module.exports = async (req, res) => {
  if (applyCors(req, res, ['POST', 'OPTIONS'])) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const entryId = String(req.body?.id || '').trim();
  if (!entryId) {
    return res.status(400).json({ ok: false, error: 'Thiếu id mẫu auto cần chạy.' });
  }

  try {
    const result = await runEntryById(entryId, { triggeredBy: 'manual' });

    if (!result.ok) {
      return res.status(result.status || 500).json({
        ok: false,
        error: result.message || 'Không thể chạy mẫu auto.',
        state: result.state || null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Đã chạy AI và lưu vào lịch sử auto.',
      ...result,
    });
  } catch (error) {
    console.error('auto-run-now error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Không thể chạy mẫu auto.',
    });
  }
};
