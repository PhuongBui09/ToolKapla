const { applyCors } = require('./_http');
const { getEntries, upsertEntry, deleteEntry } = require('./_autoStorage');
const { runEntryById } = require('./_autoRunner');

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
      const savedResult = await upsertEntry(req.body || {});
      const autoRunResult = await runEntryById(savedResult.entry.id, { triggeredBy: 'manual' });
      const autoRunOk = Boolean(autoRunResult?.ok);
      const isUpdate = Boolean(req.body?.id);

      return res.status(200).json({
        ok: true,
        message: autoRunOk
          ? isUpdate
            ? 'Đã cập nhật mẫu auto và chạy AI ngay.'
            : 'Đã tạo mẫu auto mới và chạy AI ngay.'
          : isUpdate
            ? 'Đã cập nhật mẫu auto. AI sẽ tự thử lại sau mỗi 5 phút cho tới khi thành công.'
            : 'Đã tạo mẫu auto mới. AI sẽ tự thử lại sau mỗi 5 phút cho tới khi thành công.',
        autoRunAttempted: true,
        autoRunOk,
        autoRunError: autoRunOk ? '' : autoRunResult?.message || 'Không thể chạy AI ngay lúc lưu mẫu.',
        autoRunStatus: autoRunResult?.status || null,
        entry: autoRunResult?.entry || savedResult.entry,
        runItem: autoRunResult?.runItem || null,
        meta: autoRunResult?.meta || null,
        state: autoRunResult?.state || savedResult.state,
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
