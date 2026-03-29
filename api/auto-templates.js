const { applyCors } = require('./_http');
const { getEntries, upsertEntry, deleteEntry } = require('./_autoStorage');

module.exports = async (req, res) => {
  if (applyCors(req, res, ['GET', 'POST', 'DELETE', 'OPTIONS'])) {
    return;
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        entries: await getEntries(),
      });
    }

    if (req.method === 'POST') {
      const result = await upsertEntry(req.body || {});
      return res.status(200).json({
        ok: true,
        message: req.body?.id ? 'Đã cập nhật mẫu auto.' : 'Đã tạo mẫu auto mới.',
        ...result,
      });
    }

    if (req.method === 'DELETE') {
      const entryId = String(req.query?.id || '').trim();
      if (!entryId) {
        return res.status(400).json({ ok: false, error: 'Thiếu id mẫu auto cần xoá.' });
      }

      const result = await deleteEntry(entryId);
      return res.status(200).json({
        ok: true,
        message: 'Đã xoá mẫu auto.',
        ...result,
      });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('auto-templates error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Không thể xử lý mẫu auto.',
    });
  }
};
