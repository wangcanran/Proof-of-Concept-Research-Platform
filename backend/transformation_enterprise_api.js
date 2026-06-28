/**
 * 转化成果 & 企业服务成果 API（0627 schema）
 * 由 research_api.js 注入依赖后挂载路由
 */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const formidable = require('formidable');

const TRANSFORM_METHOD_LABELS = {
  tech_license: '技术许可',
  tech_transfer: '技术转让',
  equity_investment: '作价投资',
  startup_company: '创办企业',
};

const ENTERPRISE_TYPE_LABELS = {
  tech_cooperation: '技术合作',
  qualification_certification: '资质认定',
};

const CONTRACT_METHODS = ['tech_license', 'tech_transfer', 'equity_investment'];
const ELIGIBLE_STATUSES = ['approved', 'incubating'];
const PM_AUTO_REVIEW_COMMENT = '项目经理填报，无需审批';

function buildAchievementSubmissionMeta(user, requestedStatus) {
  const uid = user.userId || user.id;
  if (user.role === 'project_manager') {
    return {
      submission_type: 'project_manager',
      status: 'verified',
      verified_by: uid,
      verified_date: new Date().toISOString().slice(0, 10),
      verification_comment: PM_AUTO_REVIEW_COMMENT,
      notifyReview: false,
    };
  }
  const status = requestedStatus || 'submitted';
  return {
    submission_type: 'applicant',
    status,
    verified_by: null,
    verified_date: null,
    verification_comment: null,
    notifyReview: status === 'submitted',
  };
}

function buildAchievementListVisibility(user, tableAlias, projectAlias = 'p') {
  const uid = user.userId || user.id;
  if (user.role === 'applicant') {
    return {
      clause: ` AND ${tableAlias}.created_by = ? AND ${tableAlias}.submission_type = 'applicant'`,
      params: [uid],
    };
  }
  if (user.role === 'project_manager') {
    return {
      clause: ` AND ((${tableAlias}.created_by = ? AND ${tableAlias}.submission_type = 'project_manager') OR (${tableAlias}.submission_type = 'applicant' AND ${projectAlias}.manager_id = ?))`,
      params: [uid, uid],
    };
  }
  return { clause: '', params: [] };
}

const APPLICANT_SUBMISSION_ONLY = "submission_type = 'applicant'";

function createHandlers(deps) {
  const {
    pool,
    verifyToken,
    sendResponse,
    parseRequestBody,
    checkPermission,
    userIsApplicantOrTeamMember,
    resolveUploadDiskPath,
    generateUUID,
  } = deps;

  const TRANSFORMATION_UPLOADS_DIR = path.join(__dirname, 'uploads', 'transformation-achievements');
  const ENTERPRISE_UPLOADS_DIR = path.join(__dirname, 'uploads', 'enterprise-service-achievements');

  async function getProjectLeaderName(projectId) {
    const [rows] = await pool.query(
      `SELECT u.name FROM \`Project\` p JOIN \`User\` u ON p.applicant_id = u.id WHERE p.id = ?`,
      [projectId],
    );
    return rows[0]?.name || '';
  }

  async function loadTransformationFilesMap(ids) {
    if (!ids.length) return {};
    const [rows] = await pool.query(
      `SELECT * FROM \`TransformationAchievementFile\` WHERE achievement_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order, created_at`,
      ids,
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.achievement_id]) map[r.achievement_id] = [];
      map[r.achievement_id].push(r);
    }
    return map;
  }

  async function loadEnterpriseFilesMap(ids) {
    if (!ids.length) return {};
    const [rows] = await pool.query(
      `SELECT * FROM \`EnterpriseServiceAchievementFile\` WHERE achievement_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order, created_at`,
      ids,
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.achievement_id]) map[r.achievement_id] = [];
      map[r.achievement_id].push(r);
    }
    return map;
  }

  async function loadEnterpriseProjectsMap(ids) {
    if (!ids.length) return {};
    const [rows] = await pool.query(
      `SELECT esp.*, p.title AS project_title, p.project_code
       FROM \`EnterpriseServiceProject\` esp
       JOIN \`Project\` p ON esp.project_id = p.id
       WHERE esp.achievement_id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.achievement_id]) map[r.achievement_id] = [];
      map[r.achievement_id].push(r);
    }
    return map;
  }

  async function loadEnterpriseSamplesMap(ids) {
    if (!ids.length) return {};
    const [rows] = await pool.query(
      `SELECT * FROM \`EnterpriseServiceSampleProduct\` WHERE achievement_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order, created_at`,
      ids,
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.achievement_id]) map[r.achievement_id] = [];
      map[r.achievement_id].push(r);
    }
    return map;
  }

  function formatTransformationRow(row, files = []) {
    const method = row.transform_method;
    const title =
      method === 'startup_company'
        ? row.company_name || '创办企业'
        : row.recipient_company || TRANSFORM_METHOD_LABELS[method] || '转化成果';
    return {
      ...row,
      title,
      transform_method_label: TRANSFORM_METHOD_LABELS[method] || method,
      project: row.project_title
        ? { id: row.project_id, title: row.project_title, project_code: row.project_code }
        : null,
      creator_info: row.created_by_name
        ? { name: row.created_by_name, email: row.created_by_email, phone: row.created_by_phone }
        : null,
      files,
      file_count: files.length,
    };
  }

  function formatEnterpriseRow(row, files = [], projects = [], samples = []) {
    const type = row.achievement_type;
    const title =
      type === 'tech_cooperation'
        ? row.contract_name || row.service_enterprise || '技术合作'
        : row.qualification_type || row.qualified_enterprise || '资质认定';
    return {
      ...row,
      title,
      achievement_type_label: ENTERPRISE_TYPE_LABELS[type] || type,
      projects,
      samples,
      sample_products: samples.filter((s) => s.type === 'sample'),
      new_products: samples.filter((s) => s.type === 'new_product'),
      service_provider_name: row.service_provider_name || null,
      creator_info: row.created_by_name
        ? { name: row.created_by_name, email: row.created_by_email, phone: row.created_by_phone }
        : null,
      files,
      file_count: files.length,
    };
  }

  async function userMayAccessTransformation(pool, row, user) {
    const uid = user.userId || user.id;
    if (String(row.created_by) === String(uid)) return true;
    if (user.role === 'admin') return true;
    if (row.project_id) {
      const [p] = await pool.query('SELECT manager_id, applicant_id FROM `Project` WHERE id = ?', [row.project_id]);
      if (!p.length) return false;
      if (user.role === 'project_manager' && String(p[0].manager_id) === String(uid)) {
        return row.submission_type === 'applicant' || String(row.created_by) === String(uid);
      }
      return userIsApplicantOrTeamMember(pool, row.project_id, uid);
    }
    return false;
  }

  async function assertMayReviewTransformation(pool, id, user) {
    if (!user) return { ok: false, status: 401, error: '认证失败' };
    if (user.role === 'admin') return { ok: true };
    if (user.role !== 'project_manager') return { ok: false, status: 403, error: '没有权限' };
    const uid = user.userId || user.id;
    const [rows] = await pool.query(
      `SELECT ta.id FROM \`TransformationAchievement\` ta
       JOIN \`Project\` p ON ta.project_id = p.id WHERE ta.id = ? AND p.manager_id = ?`,
      [id, uid],
    );
    if (!rows.length) return { ok: false, status: 403, error: '只能审核本人负责项目的转化成果' };
    return { ok: true };
  }

  async function assertMayReviewEnterprise(pool, id, user) {
    if (!user) return { ok: false, status: 401, error: '认证失败' };
    if (user.role === 'admin') return { ok: true };
    if (user.role !== 'project_manager') return { ok: false, status: 403, error: '没有权限' };
    const uid = user.userId || user.id;
    const [ach] = await pool.query('SELECT achievement_type FROM `EnterpriseServiceAchievement` WHERE id = ?', [id]);
    if (!ach.length) return { ok: false, status: 404, error: '记录不存在' };
    if (ach[0].achievement_type === 'qualification_certification') return { ok: true };
    const [rows] = await pool.query(
      `SELECT esa.id FROM \`EnterpriseServiceAchievement\` esa
       INNER JOIN \`EnterpriseServiceProject\` esp ON esa.id = esp.achievement_id
       INNER JOIN \`Project\` p ON esp.project_id = p.id
       WHERE esa.id = ? AND p.manager_id = ? LIMIT 1`,
      [id, uid],
    );
    if (!rows.length) return { ok: false, status: 403, error: '只能审核涉及本人负责项目的企业服务成果' };
    return { ok: true };
  }

  async function saveEnterpriseRelations(achievementId, body) {
    await pool.query('DELETE FROM `EnterpriseServiceProject` WHERE achievement_id = ?', [achievementId]);
    await pool.query('DELETE FROM `EnterpriseServiceSampleProduct` WHERE achievement_id = ?', [achievementId]);

    if (body.achievement_type === 'tech_cooperation' && Array.isArray(body.projects)) {
      for (const pr of body.projects) {
        if (!pr.project_id) continue;
        const leader = pr.project_leader || (await getProjectLeaderName(pr.project_id));
        await pool.query(
          `INSERT INTO \`EnterpriseServiceProject\` (id, achievement_id, project_id, project_leader) VALUES (?, ?, ?, ?)`,
          [randomUUID(), achievementId, pr.project_id, leader],
        );
      }
    }

    const samples = body.sample_products || body.samples || [];
    const products = body.new_products || [];
    let sort = 0;
    for (const s of samples) {
      if (!s.name) continue;
      await pool.query(
        `INSERT INTO \`EnterpriseServiceSampleProduct\` (id, achievement_id, type, name, completion_date, sort_order) VALUES (?, ?, 'sample', ?, ?, ?)`,
        [randomUUID(), achievementId, s.name, s.completion_date || null, sort++],
      );
    }
    for (const p of products) {
      if (!p.name) continue;
      await pool.query(
        `INSERT INTO \`EnterpriseServiceSampleProduct\` (id, achievement_id, type, name, completion_date, output_value_amount, sort_order) VALUES (?, ?, 'new_product', ?, ?, ?, ?)`,
        [randomUUID(), achievementId, p.name, p.completion_date || null, p.output_value_amount ?? null, sort++],
      );
    }
  }

  async function fetchTransformationDetail(id) {
    const [rows] = await pool.query(
      `SELECT ta.*, p.title AS project_title, p.project_code,
              u.name AS created_by_name, u.email AS created_by_email, u.phone AS created_by_phone,
              uv.name AS verified_by_name
       FROM \`TransformationAchievement\` ta
       LEFT JOIN \`Project\` p ON ta.project_id = p.id
       LEFT JOIN \`User\` u ON ta.created_by = u.id
       LEFT JOIN \`User\` uv ON ta.verified_by = uv.id
       WHERE ta.id = ?`,
      [id],
    );
    if (!rows.length) return null;
    const filesMap = await loadTransformationFilesMap([id]);
    return formatTransformationRow(rows[0], filesMap[id] || []);
  }

  async function fetchEnterpriseDetail(id) {
    const [rows] = await pool.query(
      `SELECT esa.*, u.name AS created_by_name, u.email AS created_by_email, u.phone AS created_by_phone,
              uv.name AS verified_by_name, sp.name AS service_provider_name
       FROM \`EnterpriseServiceAchievement\` esa
       LEFT JOIN \`User\` u ON esa.created_by = u.id
       LEFT JOIN \`User\` uv ON esa.verified_by = uv.id
       LEFT JOIN \`ServiceProvider\` sp ON esa.service_provider_id = sp.id
       WHERE esa.id = ?`,
      [id],
    );
    if (!rows.length) return null;
    const filesMap = await loadEnterpriseFilesMap([id]);
    const projMap = await loadEnterpriseProjectsMap([id]);
    const sampleMap = await loadEnterpriseSamplesMap([id]);
    return formatEnterpriseRow(rows[0], filesMap[id] || [], projMap[id] || [], sampleMap[id] || []);
  }

  /** @returns {Promise<boolean>} handled */
  async function handleRequest(req, res, pathname, parsedUrl) {
    // ========== 转化成果 ==========
    if (pathname === '/api/transformation-achievements/eligible-projects' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const uid = user.userId || user.id;
        let sql = `SELECT p.id, p.project_code, p.title, p.status, p.approval_date, u.name AS project_leader,
          (SELECT COUNT(*) FROM \`TransformationAchievement\` ta WHERE ta.project_id = p.id AND ta.created_by = ?) AS achievement_count
          FROM \`Project\` p JOIN \`User\` u ON p.applicant_id = u.id WHERE p.status IN ('approved','incubating')`;
        const params = [uid];
        if (user.role === 'applicant') {
          sql += ` AND (p.applicant_id = ? OR p.id IN (SELECT project_id FROM \`ProjectMember\` WHERE user_id = ?))`;
          params.push(uid, uid);
        } else if (user.role === 'project_manager') {
          sql += ' AND p.manager_id = ?';
          params.push(uid);
        }
        sql += ' ORDER BY p.updated_at DESC';
        const [projects] = await pool.query(sql, params);
        sendResponse(res, 200, { success: true, data: projects });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '获取项目列表失败' });
      }
      return true;
    }

    if (pathname === '/api/transformation-achievements' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const q = parsedUrl.query || {};
        const uid = user.userId || user.id;
        let sql = `SELECT ta.*, p.title AS project_title, p.project_code, u.name AS created_by_name
          FROM \`TransformationAchievement\` ta
          LEFT JOIN \`Project\` p ON ta.project_id = p.id
          LEFT JOIN \`User\` u ON ta.created_by = u.id WHERE 1=1`;
        const params = [];
        const vis = buildAchievementListVisibility(user, 'ta', 'p');
        sql += vis.clause;
        params.push(...vis.params);
        if (q.status) {
          sql += ' AND ta.status = ?';
          params.push(q.status);
        }
        if (q.search) {
          sql += ' AND (ta.company_name LIKE ? OR ta.recipient_company LIKE ? OR p.title LIKE ?)';
          const kw = `%${q.search}%`;
          params.push(kw, kw, kw);
        }
        sql += ' ORDER BY ta.created_at DESC LIMIT 100';
        const [rows] = await pool.query(sql, params);
        const filesMap = await loadTransformationFilesMap(rows.map((r) => r.id));
        sendResponse(res, 200, {
          success: true,
          data: rows.map((r) => formatTransformationRow(r, filesMap[r.id] || [])),
        });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '获取列表失败' });
      }
      return true;
    }

    if (pathname === '/api/transformation-achievements' && req.method === 'POST') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const body = await parseRequestBody(req);
        if (!body.project_id || !body.transform_method) {
          return sendResponse(res, 400, { success: false, error: '请选择项目并填写转化方式' }), true;
        }
        const leader = body.project_leader || (await getProjectLeaderName(body.project_id));
        const id = randomUUID();
        const method = body.transform_method;
        const isStartup = method === 'startup_company';
        const uid = user.userId || user.id;
        if (user.role === 'project_manager') {
          const [mp] = await pool.query('SELECT manager_id FROM `Project` WHERE id = ?', [body.project_id]);
          if (!mp.length || String(mp[0].manager_id) !== String(uid)) {
            return sendResponse(res, 403, { success: false, error: '只能为本人负责的项目登记转化成果' }), true;
          }
        }
        const subMeta = buildAchievementSubmissionMeta(user, body.status);
        await pool.query(
          `INSERT INTO \`TransformationAchievement\` (
            id, project_id, project_leader, transform_method, platform_service_content,
            transform_date, recipient_company, recipient_province, recipient_city, recipient_district, contract_amount,
            company_name, company_credit_code, establishment_date, registered_address, company_introduction,
            invested_amount, paid_in_amount, status, submission_type, verified_by, verified_date, verification_comment,
            created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            body.project_id,
            leader,
            method,
            body.platform_service_content || null,
            isStartup ? null : body.transform_date || null,
            isStartup ? null : body.recipient_company || null,
            isStartup ? null : body.recipient_province || null,
            isStartup ? null : body.recipient_city || null,
            isStartup ? null : body.recipient_district || null,
            isStartup ? null : body.contract_amount ?? null,
            isStartup ? body.company_name || null : null,
            isStartup ? body.company_credit_code || null : null,
            isStartup ? body.establishment_date || null : null,
            isStartup ? body.registered_address || null : null,
            isStartup ? body.company_introduction || null : null,
            isStartup ? body.invested_amount ?? null : null,
            isStartup ? body.paid_in_amount ?? null : null,
            subMeta.status,
            subMeta.submission_type,
            subMeta.verified_by,
            subMeta.verified_date,
            subMeta.verification_comment,
            uid,
          ],
        );
        if (subMeta.notifyReview && body.project_id) {
          const [pn] = await pool.query('SELECT manager_id, title FROM `Project` WHERE id = ?', [body.project_id]);
          if (pn[0]?.manager_id) {
            await pool.query(
              `INSERT INTO \`Notification\` (id, user_id, type, title, content, related_id, related_type, created_at)
               VALUES (?, ?, 'review', ?, ?, ?, 'TransformationAchievement', NOW())`,
              [generateUUID(), pn[0].manager_id, '转化成果待审核', `项目「${pn[0].title}」有新的转化成果登记，请审核。`, id],
            );
          }
        }
        const data = await fetchTransformationDetail(id);
        sendResponse(res, 201, { success: true, data });
      } catch (e) {
        console.error(e);
        sendResponse(res, 500, { success: false, error: '创建失败', message: e.message });
      }
      return true;
    }

    const taDetailMatch = pathname.match(/^\/api\/transformation-achievements\/([^/]+)$/);
    if (taDetailMatch && taDetailMatch[1] !== 'eligible-projects' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      const data = await fetchTransformationDetail(taDetailMatch[1]);
      if (!data) return sendResponse(res, 404, { success: false, error: '不存在' }), true;
      const [raw] = await pool.query('SELECT * FROM `TransformationAchievement` WHERE id = ?', [taDetailMatch[1]]);
      if (!(await userMayAccessTransformation(pool, raw[0], user))) {
        return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
      }
      sendResponse(res, 200, { success: true, data });
      return true;
    }

    if (pathname === '/api/transformation-achievements/upload' && req.method === 'POST') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      if (!fs.existsSync(TRANSFORMATION_UPLOADS_DIR)) fs.mkdirSync(TRANSFORMATION_UPLOADS_DIR, { recursive: true });
      const form = formidable({ uploadDir: TRANSFORMATION_UPLOADS_DIR, keepExtensions: true, maxFileSize: 50 * 1024 * 1024 });
      form.parse(req, async (err, fields, files) => {
        if (err) return sendResponse(res, 500, { success: false, error: '上传失败' });
        try {
          const achievementId = fields.achievement_id?.[0] || fields.achievement_id;
          const file = files.file?.[0] || files.file;
          if (!achievementId || !file) return sendResponse(res, 400, { success: false, error: '参数不完整' });
          const fileId = randomUUID();
          const relPath = path.relative(path.join(__dirname, 'uploads'), file.filepath).replace(/\\/g, '/');
          await pool.query(
            `INSERT INTO \`TransformationAchievementFile\` (id, achievement_id, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [fileId, achievementId, file.originalFilename || file.newFilename, relPath, file.size, file.mimetype || 'application/octet-stream', user.userId || user.id],
          );
          sendResponse(res, 200, { success: true, data: { id: fileId, file_name: file.originalFilename } });
        } catch (e) {
          sendResponse(res, 500, { success: false, error: '保存文件失败' });
        }
      });
      return true;
    }

    if (pathname.startsWith('/api/transformation-achievements/files/') && req.method === 'GET') {
      const user = await verifyToken(parsedUrl.query.token || req.headers.authorization);
      if (!user) return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
      try {
        const fileId = pathname.replace('/api/transformation-achievements/files/', '');
        const [files] = await pool.query(
          `SELECT f.*, ta.project_id, ta.created_by FROM \`TransformationAchievementFile\` f
           JOIN \`TransformationAchievement\` ta ON f.achievement_id = ta.id WHERE f.id = ?`,
          [fileId],
        );
        if (!files.length) return sendResponse(res, 404, { success: false, error: '文件不存在' }), true;
        if (!(await userMayAccessTransformation(pool, files[0], user))) {
          return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
        }
        const diskPath = resolveUploadDiskPath(files[0].file_path, TRANSFORMATION_UPLOADS_DIR);
        if (!diskPath || !fs.existsSync(diskPath)) return sendResponse(res, 404, { success: false, error: '文件已丢失' }), true;
        res.setHeader('Content-Type', files[0].mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(files[0].file_name)}`);
        fs.createReadStream(diskPath).pipe(res);
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '下载失败' });
      }
      return true;
    }

    if (pathname === '/api/assistant/transformation-achievements/list' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user || !checkPermission(user.role, ['project_manager', 'admin'])) {
        return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
      }
      try {
        const q = parsedUrl.query || {};
        const uid = user.userId || user.id;
        let where = user.role === 'project_manager' ? `p.manager_id = ? AND ta.${APPLICANT_SUBMISSION_ONLY}` : APPLICANT_SUBMISSION_ONLY;
        const params = user.role === 'project_manager' ? [uid] : [];
        if (q.status && q.status !== 'all') {
          where += ' AND ta.status = ?';
          params.push(q.status);
        }
        if (q.search) {
          where += ' AND (ta.company_name LIKE ? OR ta.recipient_company LIKE ? OR p.title LIKE ?)';
          const kw = `%${q.search}%`;
          params.push(kw, kw, kw);
        }
        const [rows] = await pool.query(
          `SELECT ta.*, p.title AS project_title, p.project_code, u.name AS created_by_name
           FROM \`TransformationAchievement\` ta
           JOIN \`Project\` p ON ta.project_id = p.id
           LEFT JOIN \`User\` u ON ta.created_by = u.id
           WHERE ${where} ORDER BY ta.created_at DESC LIMIT 200`,
          params,
        );
        const filesMap = await loadTransformationFilesMap(rows.map((r) => r.id));
        sendResponse(res, 200, {
          success: true,
          data: { list: rows.map((r) => formatTransformationRow(r, filesMap[r.id] || [])) },
        });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '获取列表失败' });
      }
      return true;
    }

    const taReviewMatch = pathname.match(/^\/api\/assistant\/transformation-achievements\/([^/]+)\/review$/);
    if (taReviewMatch && req.method === 'POST') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const perm = await assertMayReviewTransformation(pool, taReviewMatch[1], user);
        if (!perm.ok) return sendResponse(res, perm.status, { success: false, error: perm.error }), true;
        const body = await parseRequestBody(req);
        const rec = body.recommendation;
        if (!['verify', 'reject'].includes(rec) || !body.comment?.trim()) {
          return sendResponse(res, 400, { success: false, error: '请填写审核结果和意见' }), true;
        }
        const newStatus = rec === 'verify' ? 'verified' : 'rejected';
        await pool.query(
          `UPDATE \`TransformationAchievement\` SET status = ?, verified_by = ?, verified_date = CURDATE(), verification_comment = ? WHERE id = ? AND status = 'submitted'`,
          [newStatus, user.userId || user.id, body.comment.trim(), taReviewMatch[1]],
        );
        sendResponse(res, 200, { success: true, message: '审核完成' });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '审核失败' });
      }
      return true;
    }

    // ========== 企业服务成果 ==========
    if (pathname === '/api/enterprise-service-achievements/eligible-projects' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const uid = user.userId || user.id;
        let sql = `SELECT p.id, p.project_code, p.title, p.status, p.approval_date, u.name AS project_leader
          FROM \`Project\` p JOIN \`User\` u ON p.applicant_id = u.id WHERE p.status IN ('approved','incubating')`;
        const params = [];
        if (user.role === 'applicant') {
          sql += ` AND (p.applicant_id = ? OR p.id IN (SELECT project_id FROM \`ProjectMember\` WHERE user_id = ?))`;
          params.push(uid, uid);
        } else if (user.role === 'project_manager') {
          sql += ' AND p.manager_id = ?';
          params.push(uid);
        }
        sql += ' ORDER BY p.updated_at DESC';
        const [projects] = await pool.query(sql, params);
        sendResponse(res, 200, { success: true, data: projects });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '获取项目列表失败' });
      }
      return true;
    }

    if (pathname === '/api/enterprise-service-achievements/service-providers' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const [rows] = await pool.query(
          'SELECT id, name, category FROM `ServiceProvider` ORDER BY name',
        );
        sendResponse(res, 200, {
          success: true,
          data: rows,
        });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '获取服务机构失败' });
      }
      return true;
    }

    if (pathname === '/api/enterprise-service-achievements' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const q = parsedUrl.query || {};
        const uid = user.userId || user.id;
        let sql = `SELECT DISTINCT esa.*, u.name AS created_by_name, sp.name AS service_provider_name
          FROM \`EnterpriseServiceAchievement\` esa
          LEFT JOIN \`User\` u ON esa.created_by = u.id
          LEFT JOIN \`ServiceProvider\` sp ON esa.service_provider_id = sp.id
          LEFT JOIN \`EnterpriseServiceProject\` esp ON esa.id = esp.achievement_id
          LEFT JOIN \`Project\` p ON esp.project_id = p.id
          WHERE 1=1`;
        const params = [];
        const vis = buildAchievementListVisibility(user, 'esa', 'p');
        sql += vis.clause;
        params.push(...vis.params);
        if (q.search) {
          sql += ' AND (esa.service_enterprise LIKE ? OR esa.qualified_enterprise LIKE ? OR p.title LIKE ?)';
          const kw = `%${q.search}%`;
          params.push(kw, kw, kw);
        }
        sql += ' ORDER BY esa.created_at DESC LIMIT 100';
        const [rows] = await pool.query(sql, params);
        const ids = rows.map((r) => r.id);
        const filesMap = await loadEnterpriseFilesMap(ids);
        const projMap = await loadEnterpriseProjectsMap(ids);
        sendResponse(res, 200, {
          success: true,
          data: rows.map((r) => formatEnterpriseRow(r, filesMap[r.id] || [], projMap[r.id] || [], [])),
        });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '获取列表失败' });
      }
      return true;
    }

    if (pathname === '/api/enterprise-service-achievements' && req.method === 'POST') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const body = await parseRequestBody(req);
        if (!body.achievement_type) {
          return sendResponse(res, 400, { success: false, error: '请选择成果类型' }), true;
        }
        const id = randomUUID();
        const type = body.achievement_type;
        const uid = user.userId || user.id;
        if (user.role === 'applicant' && type === 'qualification_certification') {
          return sendResponse(res, 400, { success: false, error: '申请人仅可登记技术合作类企业服务成果' }), true;
        }
        if (user.role === 'project_manager' && type === 'tech_cooperation' && Array.isArray(body.projects)) {
          for (const pr of body.projects) {
            if (!pr.project_id) continue;
            const [mp] = await pool.query('SELECT manager_id FROM `Project` WHERE id = ?', [pr.project_id]);
            if (!mp.length || String(mp[0].manager_id) !== String(uid)) {
              return sendResponse(res, 403, { success: false, error: '只能关联本人负责的项目' }), true;
            }
          }
        }
        const spId = body.service_provider_id || null;
        const subMeta = buildAchievementSubmissionMeta(user, body.status);
        await pool.query(
          `INSERT INTO \`EnterpriseServiceAchievement\` (
            id, achievement_type, created_by, status, submission_type, verified_by, verified_date, verification_comment,
            service_enterprise, start_date, completion_date, contract_name, contract_amount, contract_content,
            is_sample_production, is_new_product,
            qualified_enterprise, qualification_type, qualification_date, service_provider_id, service_content_brief,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            type,
            uid,
            subMeta.status,
            subMeta.submission_type,
            subMeta.verified_by,
            subMeta.verified_date,
            subMeta.verification_comment,
            type === 'tech_cooperation' ? body.service_enterprise || null : null,
            type === 'tech_cooperation' ? body.start_date || null : null,
            type === 'tech_cooperation' ? body.completion_date || null : null,
            type === 'tech_cooperation' ? body.contract_name || null : null,
            type === 'tech_cooperation' ? body.contract_amount ?? null : null,
            type === 'tech_cooperation' ? body.contract_content || null : null,
            type === 'tech_cooperation' ? !!body.is_sample_production : false,
            type === 'tech_cooperation' ? !!body.is_new_product : false,
            type === 'qualification_certification' ? body.qualified_enterprise || null : null,
            type === 'qualification_certification' ? body.qualification_type || null : null,
            type === 'qualification_certification' ? body.qualification_date || null : null,
            type === 'qualification_certification' ? spId : null,
            type === 'qualification_certification' ? body.service_content_brief || null : null,
          ],
        );
        await saveEnterpriseRelations(id, body);
        if (subMeta.notifyReview) {
          if (type === 'tech_cooperation' && Array.isArray(body.projects)) {
            for (const pr of body.projects) {
              if (!pr.project_id) continue;
              const [pn] = await pool.query('SELECT manager_id, title FROM `Project` WHERE id = ?', [pr.project_id]);
              if (pn[0]?.manager_id) {
                await pool.query(
                  `INSERT INTO \`Notification\` (id, user_id, type, title, content, related_id, related_type, created_at)
                   VALUES (?, ?, 'review', ?, ?, ?, 'EnterpriseServiceAchievement', NOW())`,
                  [generateUUID(), pn[0].manager_id, '企业服务成果待审核', `项目「${pn[0].title}」有新的企业服务成果登记，请审核。`, id],
                );
              }
            }
          } else if (type === 'qualification_certification') {
            const [managers] = await pool.query(`SELECT id FROM \`User\` WHERE role = 'project_manager'`);
            const entName = body.qualified_enterprise || '企业';
            for (const m of managers) {
              await pool.query(
                `INSERT INTO \`Notification\` (id, user_id, type, title, content, related_id, related_type, created_at)
                 VALUES (?, ?, 'review', ?, ?, ?, 'EnterpriseServiceAchievement', NOW())`,
                [generateUUID(), m.id, '企业服务成果待审核', `「${entName}」有新的资质认定成果登记，请审核。`, id],
              );
            }
          }
        }
        const data = await fetchEnterpriseDetail(id);
        sendResponse(res, 201, { success: true, data });
      } catch (e) {
        console.error(e);
        sendResponse(res, 500, { success: false, error: '创建失败', message: e.message });
      }
      return true;
    }

    const esaDetailMatch = pathname.match(/^\/api\/enterprise-service-achievements\/([^/]+)$/);
    if (
      esaDetailMatch &&
      !['eligible-projects', 'service-providers'].includes(esaDetailMatch[1]) &&
      req.method === 'GET'
    ) {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      const data = await fetchEnterpriseDetail(esaDetailMatch[1]);
      if (!data) return sendResponse(res, 404, { success: false, error: '不存在' }), true;
      const uid = user.userId || user.id;
      if (user.role === 'admin') {
        // ok
      } else if (String(data.created_by) === String(uid)) {
        // ok
      } else if (user.role === 'project_manager') {
        if (data.submission_type === 'project_manager') {
          return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
        }
        if (data.achievement_type === 'qualification_certification') {
          // 资质认定所有项目经理可查看待审记录
        } else {
          const [managed] = await pool.query(
            `SELECT 1 FROM \`EnterpriseServiceProject\` esp
             JOIN \`Project\` p ON esp.project_id = p.id
             WHERE esp.achievement_id = ? AND p.manager_id = ? LIMIT 1`,
            [esaDetailMatch[1], uid],
          );
          if (!managed.length) return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
        }
      } else {
        return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
      }
      sendResponse(res, 200, { success: true, data });
      return true;
    }

    if (pathname === '/api/enterprise-service-achievements/upload' && req.method === 'POST') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      if (!fs.existsSync(ENTERPRISE_UPLOADS_DIR)) fs.mkdirSync(ENTERPRISE_UPLOADS_DIR, { recursive: true });
      const form = formidable({ uploadDir: ENTERPRISE_UPLOADS_DIR, keepExtensions: true, maxFileSize: 50 * 1024 * 1024 });
      form.parse(req, async (err, fields, files) => {
        if (err) return sendResponse(res, 500, { success: false, error: '上传失败' });
        try {
          const achievementId = fields.achievement_id?.[0] || fields.achievement_id;
          const file = files.file?.[0] || files.file;
          if (!achievementId || !file) return sendResponse(res, 400, { success: false, error: '参数不完整' });
          const fileId = randomUUID();
          const relPath = path.relative(path.join(__dirname, 'uploads'), file.filepath).replace(/\\/g, '/');
          await pool.query(
            `INSERT INTO \`EnterpriseServiceAchievementFile\` (id, achievement_id, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [fileId, achievementId, file.originalFilename || file.newFilename, relPath, file.size, file.mimetype || 'application/octet-stream', user.userId || user.id],
          );
          sendResponse(res, 200, { success: true, data: { id: fileId, file_name: file.originalFilename } });
        } catch (e) {
          sendResponse(res, 500, { success: false, error: '保存文件失败' });
        }
      });
      return true;
    }

    if (pathname.startsWith('/api/enterprise-service-achievements/files/') && req.method === 'GET') {
      const user = await verifyToken(parsedUrl.query.token || req.headers.authorization);
      if (!user) return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
      try {
        const fileId = pathname.replace('/api/enterprise-service-achievements/files/', '');
        const [files] = await pool.query('SELECT * FROM `EnterpriseServiceAchievementFile` WHERE id = ?', [fileId]);
        if (!files.length) return sendResponse(res, 404, { success: false, error: '文件不存在' }), true;
        const diskPath = resolveUploadDiskPath(files[0].file_path, ENTERPRISE_UPLOADS_DIR);
        if (!diskPath || !fs.existsSync(diskPath)) return sendResponse(res, 404, { success: false, error: '文件已丢失' }), true;
        res.setHeader('Content-Type', files[0].mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(files[0].file_name)}`);
        fs.createReadStream(diskPath).pipe(res);
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '下载失败' });
      }
      return true;
    }

    if (pathname === '/api/assistant/enterprise-service-achievements/list' && req.method === 'GET') {
      const user = await verifyToken(req.headers.authorization);
      if (!user || !checkPermission(user.role, ['project_manager', 'admin'])) {
        return sendResponse(res, 403, { success: false, error: '没有权限' }), true;
      }
      try {
        const q = parsedUrl.query || {};
        const uid = user.userId || user.id;
        let sql = `SELECT DISTINCT esa.*, u.name AS created_by_name, sp.name AS service_provider_name
          FROM \`EnterpriseServiceAchievement\` esa
          LEFT JOIN \`User\` u ON esa.created_by = u.id
          LEFT JOIN \`ServiceProvider\` sp ON esa.service_provider_id = sp.id
          LEFT JOIN \`EnterpriseServiceProject\` esp ON esa.id = esp.achievement_id
          LEFT JOIN \`Project\` p ON esp.project_id = p.id
          WHERE 1=1`;
        const params = [];
        sql += ` AND esa.submission_type = 'applicant'`;
        if (user.role === 'project_manager') {
          sql += ` AND (esa.achievement_type = 'qualification_certification' OR p.manager_id = ?)`;
          params.push(uid);
        }
        if (q.status && q.status !== 'all') {
          sql += ' AND esa.status = ?';
          params.push(q.status);
        }
        if (q.search) {
          sql += ' AND (esa.service_enterprise LIKE ? OR esa.qualified_enterprise LIKE ? OR p.title LIKE ?)';
          const kw = `%${q.search}%`;
          params.push(kw, kw, kw);
        }
        sql += ' ORDER BY esa.created_at DESC LIMIT 200';
        const [rows] = await pool.query(sql, params);
        const ids = rows.map((r) => r.id);
        const filesMap = await loadEnterpriseFilesMap(ids);
        const projMap = await loadEnterpriseProjectsMap(ids);
        sendResponse(res, 200, {
          success: true,
          data: {
            list: rows.map((r) => formatEnterpriseRow(r, filesMap[r.id] || [], projMap[r.id] || [], [])),
          },
        });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '获取列表失败' });
      }
      return true;
    }

    const esaReviewMatch = pathname.match(/^\/api\/assistant\/enterprise-service-achievements\/([^/]+)\/review$/);
    if (esaReviewMatch && req.method === 'POST') {
      const user = await verifyToken(req.headers.authorization);
      if (!user) return sendResponse(res, 401, { success: false, error: '认证失败' }), true;
      try {
        const perm = await assertMayReviewEnterprise(pool, esaReviewMatch[1], user);
        if (!perm.ok) return sendResponse(res, perm.status, { success: false, error: perm.error }), true;
        const body = await parseRequestBody(req);
        const rec = body.recommendation;
        if (!['verify', 'reject'].includes(rec) || !body.comment?.trim()) {
          return sendResponse(res, 400, { success: false, error: '请填写审核结果和意见' }), true;
        }
        const newStatus = rec === 'verify' ? 'verified' : 'rejected';
        await pool.query(
          `UPDATE \`EnterpriseServiceAchievement\` SET status = ?, verified_by = ?, verified_date = CURDATE(), verification_comment = ? WHERE id = ? AND status = 'submitted'`,
          [newStatus, user.userId || user.id, body.comment.trim(), esaReviewMatch[1]],
        );
        sendResponse(res, 200, { success: true, message: '审核完成' });
      } catch (e) {
        sendResponse(res, 500, { success: false, error: '审核失败' });
      }
      return true;
    }

    return false;
  }

  return { handleRequest, TRANSFORM_METHOD_LABELS, ENTERPRISE_TYPE_LABELS };
}

module.exports = { createHandlers };
