import app from './index.js';
import mongoose from 'mongoose';
import { createHash, timingSafeEqual } from 'node:crypto';

// ---------- الدخول والحماية ----------

function matches(a, b) {
  const hash = value =>
    createHash('sha256').update(String(value)).digest();

  return timingSafeEqual(hash(a), hash(b));
}

function adminOnly(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return res.status(503).send('Admin login is not configured.');
  }

  const authorization = req.headers.authorization || '';
  let suppliedUser = '';
  let suppliedPassword = '';

  if (authorization.startsWith('Basic ')) {
    const decoded = Buffer.from(
      authorization.slice(6),
      'base64'
    ).toString('utf8');

    const separator = decoded.indexOf(':');

    if (separator !== -1) {
      suppliedUser = decoded.slice(0, separator);
      suppliedPassword = decoded.slice(separator + 1);
    }
  }

  const validUser = matches(suppliedUser, username);
  const validPassword = matches(suppliedPassword, password);

  if (!validUser || !validPassword) {
    res.set('WWW-Authenticate', 'Basic realm="Reset Admin"');
    return res.status(401).send('Login required.');
  }

  next();
}

function requireSameOrigin(req, res, next) {
  try {
    const origin = new URL(req.headers.origin || '');

    if (
      origin.protocol !== 'https:' ||
      origin.host !== req.headers.host ||
      req.get('X-Admin-Action') !== 'delete-orders'
    ) {
      throw new Error();
    }

    next();
  } catch {
    res.status(403).json({
      success: false,
      error: 'عملية غير مسموح بها.'
    });
  }
}

function workflowOrigin(req, res, next) {
  try {
    const origin = new URL(req.headers.origin || '');

    if (
      origin.protocol !== 'https:' ||
      origin.host !== req.headers.host ||
      req.get('X-Admin-Action') !== 'update-workflow'
    ) {
      throw new Error();
    }

    next();
  } catch {
    res.status(403).json({
      success: false,
      error: 'عملية غير مسموح بها.'
    });
  }
}

// ---------- قاعدة البيانات ----------

let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(
      process.env.MONGODB_URI,
      { serverSelectionTimeoutMS: 10000 }
    ).catch(error => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
}

// ---------- الحالات ----------

const COURIER_ID = 'primary';
const PAGE_SIZE = 50;

const VIEW_FILTERS = {
  new: {
    $or: [
      { workflowStatus: 'new' },
      { workflowStatus: { $exists: false } },
      { workflowStatus: null }
    ]
  },
  with_courier: {
    workflowStatus: 'repair',
    courierStage: { $ne: 'in_center' }
  },
  repair: {
    workflowStatus: 'repair',
    courierStage: 'in_center'
  },
  ready: {
    workflowStatus: 'delivery',
    courierStage: { $ne: 'to_customer' }
  },
  delivery: {
    workflowStatus: 'delivery',
    courierStage: 'to_customer'
  },
  completed: {
    workflowStatus: 'completed'
  },
  failed: {
    workflowStatus: 'failed'
  }
};

const STATUSES = Object.keys(VIEW_FILTERS);

function statusOf(order) {
  return order.workflowStatus || 'new';
}

function nextWorkflow(order, action, reason) {
  const status = statusOf(order);

  if (
    action === 'postpone' &&
    !['failed', 'completed'].includes(status)
  ) {
    return {
      workflowStatus: 'failed',
      failureReason: reason || 'تم تأجيل الطلب بواسطة الإدارة',
      failedStage: status === 'delivery' ? 'delivery' : 'pickup',
      postponedStatus: status,
      postponedCourierStage: order.courierStage || '',
      postponedAssignedCourier: order.assignedCourier || ''
    };
  }

  if (
    action === 'assign' &&
    status === 'new' &&
    !order.assignedCourier
  ) {
    return {
      workflowStatus: 'new',
      assignedCourier: COURIER_ID,
      failureReason: '',
      failedStage: ''
    };
  }

  if (
    action === 'dispatch' &&
    status === 'repair' &&
    order.courierStage === 'in_center'
  ) {
    return {
      workflowStatus: 'delivery',
      courierStage: 'awaiting_center',
      assignedCourier: COURIER_ID,
      failureReason: '',
      failedStage: ''
    };
  }

  if (
    action === 'retry' &&
    status === 'failed' &&
    ['pickup', 'delivery'].includes(order.failedStage)
  ) {
    return {
      workflowStatus:
        order.postponedStatus ||
        (order.failedStage === 'pickup' ? 'new' : 'delivery'),
      courierStage: order.postponedStatus
        ? (order.postponedCourierStage || '')
        : (order.courierStage || ''),
      assignedCourier: order.postponedStatus
        ? (order.postponedAssignedCourier || '')
        : COURIER_ID,
      failureReason: '',
      failedStage: '',
      postponedStatus: '',
      postponedCourierStage: '',
      postponedAssignedCourier: ''
    };
  }

  return null;
}

// ---------- قراءة الطلبات ----------

app.get('/api/orders', adminOnly, async (req, res) => {
  if (req.query.format !== 'json') {
    return res.type('html').send(adminPage);
  }

  try {
    await connectDatabase();

    const collection = mongoose.connection.collection('orders');
    const status = String(req.query.status || 'new');

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة غير صحيحة.'
      });
    }

    const query = String(req.query.q || '').trim().slice(0, 120);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const conditions = [VIEW_FILTERS[status]];

    if (query) {
      conditions.push({
        $or: [
          'orderNo',
          'model',
          'details.name',
          'details.phone',
          'details.whatsapp',
          'details.address'
        ].map(key => ({
          [key]: {
            $regex: escaped,
            $options: 'i'
          }
        }))
      });
    }

    const filter = { $and: conditions };

    const [totals, filteredTotal] = await Promise.all([
      Promise.all(
        STATUSES.map(key =>
          collection.countDocuments(VIEW_FILTERS[key])
        )
      ),
      collection.countDocuments(filter)
    ]);

    const counts = Object.fromEntries(
      STATUSES.map((key, index) => [key, totals[index]])
    );

    const total = totals.reduce((sum, count) => sum + count, 0);
    const pages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
    const page = Math.min(
      pages,
      Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    );

    const orders = await collection.find(filter, {
      projection: {
        orderNo: 1,
        model: 1,
        selectedParts: 1,
        partNotes: 1,
        totalPrice: 1,
        details: 1,
        createdAt: 1,
        workflowStatus: 1,
        assignedCourier: 1,
        workflowVersion: 1,
        workflowUpdatedAt: 1,
        failureReason: 1,
        failedStage: 1,
        postponedStatus: 1,
        postponedCourierStage: 1,
        postponedAssignedCourier: 1,
        courierStage: 1
      }
    })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray();

    res.json({
      success: true,
      orders,
      total,
      counts,
      filteredTotal,
      page,
      pages
    });
  } catch (error) {
    console.error('Orders read error:', error);

    res.status(500).json({
      success: false,
      error: 'تعذر تحميل الطلبات. حاول مرة أخرى.'
    });
  }
});

// ---------- إسناد وتأجيل الطلبات ----------

app.patch(
  '/api/orders',
  adminOnly,
  workflowOrigin,
  async (req, res) => {
    const { action, items } = req.body || {};
    const allowed = ['assign', 'dispatch', 'retry', 'postpone'];
    const reason = typeof req.body?.reason === 'string'
      ? req.body.reason.trim()
      : '';

    if (
      !allowed.includes(action) ||
      !Array.isArray(items) ||
      !items.length ||
      items.length > PAGE_SIZE ||
      items.some(item =>
        !item ||
        typeof item.id !== 'string' ||
        !/^[a-f\d]{24}$/i.test(item.id) ||
        !Number.isSafeInteger(item.version) ||
        item.version < 0
      ) ||
      new Set(items.map(item => item.id)).size !== items.length ||
      (action === 'postpone' && (!reason || reason.length > 500))
    ) {
      return res.status(400).json({
        success: false,
        error: 'بيانات غير صحيحة. سبب التأجيل مطلوب وبحد أقصى 500 حرف.'
      });
    }

    try {
      await connectDatabase();

      const collection = mongoose.connection.collection('orders');
      let changedCount = 0;
      const conflicts = [];

      for (const item of items) {
        const scope = {
          _id: new mongoose.Types.ObjectId(item.id)
        };

        const order = await collection.findOne(scope);
        const change = order && nextWorkflow(order, action, reason);

        if (
          !change ||
          (order.workflowVersion || 0) !== item.version
        ) {
          conflicts.push(item.id);
          continue;
        }

        const filter = { ...scope };

        if (item.version === 0) {
          filter.$or = [
            { workflowVersion: 0 },
            { workflowVersion: { $exists: false } }
          ];
        } else {
          filter.workflowVersion = item.version;
        }

        const at = new Date();

        const result = await collection.updateOne(filter, {
          $set: {
            ...change,
            workflowUpdatedAt: at
          },
          $inc: {
            workflowVersion: 1
          },
          $push: {
            workflowHistory: {
              $each: [{
                action,
                role: 'admin',
                at,
                from: statusOf(order),
                to: change.workflowStatus,
                reason: action === 'postpone' ? reason : ''
              }],
              $slice: -100
            }
          }
        });

        if (result.modifiedCount) {
          changedCount++;
        } else {
          conflicts.push(item.id);
        }
      }

      res.json({
        success: true,
        changedCount,
        conflicts
      });
    } catch (error) {
      console.error('Workflow update error:', error);

      res.status(500).json({
        success: false,
        error: 'تعذر تأكيد تحديث الطلبات. اضغط تحديث للتحقق قبل المحاولة مجددًا.'
      });
    }
  }
);

// ---------- حذف الطلبات ----------

app.delete(
  '/api/orders',
  adminOnly,
  requireSameOrigin,
  async (req, res) => {
    try {
      const body = req.body || {};

      if (body.action === 'all') {
        if (body.confirmation !== 'حذف الكل') {
          return res.status(400).json({
            success: false,
            error: 'تأكيد مسح الكل غير صحيح.'
          });
        }

        await connectDatabase();

        const result = await mongoose.connection
          .collection('orders')
          .deleteMany({});

        return res.json({
          success: true,
          deletedCount: result.deletedCount
        });
      }

      if (
        body.action !== 'one' ||
        typeof body.id !== 'string' ||
        !/^[a-fA-F0-9]{24}$/.test(body.id)
      ) {
        return res.status(400).json({
          success: false,
          error: 'معرّف الطلب غير صحيح.'
        });
      }

      await connectDatabase();

      const result = await mongoose.connection
        .collection('orders')
        .deleteOne({
          _id: new mongoose.Types.ObjectId(body.id)
        });

      if (!result.deletedCount) {
        return res.status(404).json({
          success: false,
          error: 'الطلب غير موجود؛ ربما حُذف بالفعل. اضغط تحديث.'
        });
      }

      res.json({
        success: true,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Admin orders delete error:', error);

      res.status(500).json({
        success: false,
        error: 'تعذر تأكيد الحذف. حدّث القائمة للتحقق قبل المحاولة مجددًا.'
      });
    }
  }
);

// ---------- واجهة الإدارة ----------

const adminPage = String.raw`
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Reset | إدارة الطلبات</title>

<style>
:root {
  --bg: #f4f6fa;
  --card: #ffffff;
  --ink: #172338;
  --muted: #738096;
  --line: #e5eaf1;
  --blue: #275df2;
  --green: #187246;
  --red: #bd3044;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: Tahoma, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.8;
}
button, input, a { -webkit-tap-highlight-color: transparent; }
button, input { font: inherit; }
button, a { touch-action: manipulation; }
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #93b4ff;
  outline-offset: 3px;
}
.topbar {
  background: #132039;
  color: white;
  border-bottom: 4px solid #497bff;
}
.topbar-inner {
  max-width: 1160px;
  margin: auto;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.brand { display: flex; gap: 13px; align-items: center; }
.brand-mark {
  background: white;
  color: #132039;
  border-radius: 14px;
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  font-size: 21px;
  font-weight: bold;
  direction: ltr;
}
.brand-title { font-weight: bold; font-size: 17px; }
.brand-subtitle { font-size: 12px; color: #bdc9df; margin-top: 2px; }
.private-label {
  padding: 6px 13px;
  border: 1px solid #43516a;
  border-radius: 30px;
  color: #dce5f4;
  font-size: 12px;
}
main { max-width: 1160px; margin: auto; padding: 32px 24px 60px; }
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 24px;
}
h1 { margin: 0 0 5px; font-size: 28px; letter-spacing: -.7px; }
.muted { color: var(--muted); }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 17px;
  border: 1px solid transparent;
  border-radius: 11px;
  cursor: pointer;
  text-decoration: none;
  font-weight: bold;
  font-size: 13px;
  line-height: 1.5;
  transition: background .15s, border-color .15s, transform .15s;
}
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }

/* أزرار الكروت تحتفظ بألوانها */
.btn-primary { color: white; background: #174d40; }
.btn-primary:hover { background: #103c31; }

.btn-clear, .btn-delete {
  background: #fff4f5;
  border-color: #f1d3d8;
  color: var(--red);
}
.btn-clear:hover, .btn-delete:hover { background: #ffe7eb; }

.btn-call {
  color: #375d4c;
  background: #f5f9f6;
  border-color: #d9e6dd;
}
.btn-call:hover { background: #e1eee5; }

.btn-whatsapp {
  color: var(--green);
  background: #e8f6ec;
  border-color: #b9ddc5;
}
.btn-whatsapp:hover { background: #ccecd7; }

.btn-postpone {
  background: #fff3db;
  color: #875b10;
  border-color: #ead29e;
}
.btn-postpone:hover { background: #ffe7b3; }

/* الأزرار الرئيسية باللون الأزرق */
#refresh, #batchAction {
  background: #275df2;
  color: white;
  border-color: #275df2;
}
#refresh:hover, #batchAction:hover { background: #174bd5; }

.stats {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 16px;
  margin-bottom: 22px;
}
.stat {
  background: white;
  border: 1px solid var(--line);
  padding: 18px 21px;
  border-radius: 15px;
}
.stat-label { color: var(--muted); font-size: 12px; }
.stat-value {
  margin-top: 3px;
  font-size: 28px;
  font-weight: bold;
  color: var(--ink);
}
.stat-value.small { font-size: 17px; padding-top: 9px; }
.search-box {
  background: white;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 7px 17px;
}
#search {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 11px 0;
  color: var(--ink);
  font-size: 14px;
}
.list-meta {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin: 17px 2px;
  color: var(--muted);
  font-size: 12px;
}
#notice {
  margin: 0 0 18px;
  padding: 13px 16px;
  border-radius: 11px;
  white-space: pre-wrap;
}
#notice:empty { display: none; }
#notice.success {
  background: #e8f6ec;
  color: #086942;
  border: 1px solid #c5e8d6;
}
#notice.error {
  background: #fff0f2;
  color: #a8273b;
  border: 1px solid #f0ced5;
}
.order-card {
  margin-bottom: 20px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(23,59,41,.045);
}
.card-head {
  padding: 18px 22px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background: #fbfdfb;
}
.order-number {
  display: block;
  direction: ltr;
  text-align: right;
  font-size: 17px;
  font-weight: bold;
  color: #174d40;
}
.order-date { margin-top: 3px; color: var(--muted); font-size: 11px; }
.model-badge {
  background: #edf3ef;
  color: #3c6352;
  border-radius: 8px;
  padding: 6px 11px;
  font-size: 12px;
  direction: ltr;
}
.card-body { padding: 22px; }
.customer-name {
  margin: 0 0 19px;
  font-size: 20px;
  overflow-wrap: anywhere;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 19px 24px;
}
.field { min-width: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.field.wide { grid-column: 1 / -1; }
.field-label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 11px;
}
.field-value { font-size: 14px; }
.repairs-section { margin-top: 22px; }
.repairs-title {
  display: block;
  margin-bottom: 11px;
  color: var(--muted);
  font-size: 12px;
  font-weight: bold;
}
.repairs-list { display: grid; grid-template-columns: 1fr; gap: 10px; }
.repair-item {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 15px;
  border: 1px solid #d9e9e1;
  border-radius: 11px;
  background: #f7fcf9;
  min-width: 0;
}
.repair-number {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 8px;
  background: #e0f4e9;
  color: #187246;
  font-size: 13px;
  font-weight: bold;
}
.repair-content { flex: 1; min-width: 0; }
.repair-name {
  display: block;
  color: #187246;
  font-size: 14px;
  font-weight: bold;
  overflow-wrap: anywhere;
}
.repair-note-label {
  display: block;
  margin-top: 7px;
  color: var(--muted);
  font-size: 11px;
}
.repair-note-value {
  margin-top: 2px;
  color: var(--ink);
  font-size: 13px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.extra-notes {
  margin-top: 18px;
  padding: 15px;
  border-radius: 11px;
  background: #f5f8f5;
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 18px;
}
.extra-note-box { min-width: 0; overflow-wrap: anywhere; }
.device-color-value {
  color: var(--ink);
  font-size: 14px;
  font-weight: bold;
  white-space: pre-wrap;
}
.card-foot {
  padding: 17px 22px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.total-label { color: var(--muted); font-size: 11px; }
.total-value { font-size: 21px; font-weight: bold; color: #17322d; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.empty {
  text-align: center;
  padding: 55px 20px;
  border: 1px dashed #c8d8cd;
  background: white;
  border-radius: 16px;
  color: var(--muted);
}
.footnote {
  margin-top: 25px;
  text-align: center;
  color: var(--muted);
  font-size: 11px;
}
[hidden] { display: none !important; }
.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin: 18px 0;
}
.status-tab {
  flex: 1 1 160px;
  background: white;
  border-color: var(--line);
  color: var(--ink);
}
.status-tab.active {
  background: #275df2;
  color: white;
  border-color: #275df2;
}
.status-tab.active:hover { background: #174bd5; }
.batch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #edf3ff;
  border-radius: 12px;
}
.batch label, .order-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.batch input, .order-select input {
  width: 19px;
  height: 19px;
  accent-color: #275df2;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 20px;
}
#prevPage, #nextPage {
  color: #234eae;
  background: #eef4ff;
  border-color: #d3e1ff;
}
.workflow-info { margin-bottom: 18px; }
.status-badge {
  display: inline-block;
  border-radius: 8px;
  padding: 5px 10px;
  background: #edf3ef;
  color: #375d4c;
}
.state-with_courier .status-badge,
.state-delivery .status-badge {
  background: #dceee5;
  color: #174d40;
}
.state-ready .status-badge {
  background: #fff2d8;
  color: #806022;
}
.failure-reason {
  margin-top: 8px;
  color: var(--red);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.state-completed,
.state-completed .card-head,
.state-completed .card-body,
.state-completed .card-foot {
  background: #e8f6ec;
  border-color: #b9ddc5;
}
.state-completed .status-badge {
  background: #c8edd9;
  color: #086942;
}
.state-failed,
.state-failed .card-head,
.state-failed .card-body,
.state-failed .card-foot {
  background: #fff0f2;
  border-color: #f0ced5;
}
.state-failed .status-badge {
  background: #fbd6dd;
  color: #a8273b;
}
@media(max-width:700px) {
  main { padding: 23px 14px 40px; }
  .topbar-inner { padding: 16px; }
  h1 { font-size: 24px; }
  .stats { gap: 8px; }
  .stat { padding: 13px 10px; }
  .stat-value { font-size: 23px; }
  .stat-value.small { font-size: 13px; }
  .grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .extra-notes { grid-template-columns: 1fr; }
  .card-head, .card-body, .card-foot { padding: 17px; }
  .card-foot { align-items: stretch; }
  .actions { width: 100%; }
  .actions .btn { flex: 1; }
  .private-label { display: none; }
}
@media(prefers-reduced-motion:reduce) {
  .btn { transition: none; }
  .btn:hover { transform: none; }
}
</style>
</head>

<body>
<div class="topbar">
  <div class="topbar-inner">
    <div class="brand">
     <div class="reset-brand">
  <span class="reset-brand-icon">
    <img src="/reset-logo.svg" alt="" />
  </span>

  <span class="reset-brand-name">Reset</span>
</div>
      <div>
        <div class="brand-title">لوحة إدارة الطلبات</div>
        <div class="brand-subtitle">كل جهاز في مكانه، وكل خطوة مسجّلة</div>
      </div>
    </div>
    <span class="private-label">دخول خاص بالإدارة</span>
  </div>
</div>

<main>
  <div class="page-heading">
    <div>
      <h1>الطلبات</h1>
      <div class="muted">تابع الجهاز من استلامه من العميل حتى رجوعه إليه.</div>
    </div>
    <div class="toolbar">
      <button id="refresh" class="btn btn-primary">تحديث الطلبات</button>
      <button id="clearAll" class="btn btn-clear" disabled>
        مسح الكل · Clear all
      </button>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-label">كل الطلبات المحفوظة</div>
      <div id="totalCount" class="stat-value">—</div>
    </div>
    <div class="stat">
      <div class="stat-label">نتائج العرض</div>
      <div id="visibleCount" class="stat-value">—</div>
    </div>
    <div class="stat">
      <div class="stat-label">آخر تحديث · القاهرة</div>
      <div id="lastUpdated" class="stat-value small">—</div>
    </div>
  </div>

  <div id="notice" role="status" aria-live="polite"></div>

  <div class="search-box">
    <input
      id="search"
      type="search"
      autocomplete="off"
      placeholder="ابحث باسم العميل، الهاتف، العنوان أو رقم الطلب…"
      aria-label="البحث في طلبات القسم الحالي"
    >
  </div>

  <div
    id="statusTabs"
    class="status-tabs"
    role="group"
    aria-label="حالة الطلبات"
  ></div>

  <div id="batch" class="batch" hidden>
    <label>
      <input id="selectPage" type="checkbox">
      تحديد المتاح في هذه الصفحة
    </label>
    <span id="selectionCount">تم تحديد 0 طلب</span>
    <button id="batchAction" class="btn btn-primary" disabled>
      إسناد للمندوب للاستلام
    </button>
  </div>

  <div class="list-meta">
    <span>الأحدث أولًا · البحث داخل القسم الحالي · تحديث تلقائي كل 15 ثانية</span>
    <span id="listStatus">جاري التحميل…</span>
  </div>

  <section id="orders" aria-label="قائمة الطلبات"></section>

  <div class="pagination">
    <button id="prevPage" class="btn btn-call" disabled>السابق</button>
    <span id="pageLabel"></span>
    <button id="nextPage" class="btn btn-call" disabled>التالي</button>
  </div>

  <div class="footnote">
    الحذف نهائي من قاعدة البيانات.
    زر مسح الكل يحذف جميع الطلبات، وليس نتائج البحث فقط.
  </div>
</main>

<script>
let orders = [];
let total = 0;
let busy = false;
let loaded = false;

const container = document.getElementById('orders');
const search = document.getElementById('search');
const refresh = document.getElementById('refresh');
const clearAll = document.getElementById('clearAll');
const notice = document.getElementById('notice');
const totalCount = document.getElementById('totalCount');
const visibleCount = document.getElementById('visibleCount');
const lastUpdated = document.getElementById('lastUpdated');
const listStatus = document.getElementById('listStatus');

const labels = {
  new: 'طلبات جديدة',
  with_courier: 'مع المندوب — للصيانة',
  repair: 'في مركز الصيانة',
  ready: 'جاهز — بانتظار المندوب',
  delivery: 'مع المندوب — للتسليم',
  completed: 'مكتملة',
  failed: 'تأجيل'
};

let activeStatus = 'new';
let counts = {};
let filteredTotal = 0;
let page = 1;
let pages = 1;
let searchTimer;
let searchPending = false;

const selected = new Map();
const tabs = document.getElementById('statusTabs');
const batch = document.getElementById('batch');
const selectPage = document.getElementById('selectPage');
const batchAction = document.getElementById('batchAction');
const selectionCount = document.getElementById('selectionCount');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageLabel = document.getElementById('pageLabel');

function viewOf(order) {
  const status = order.workflowStatus || 'new';

  if (status === 'repair') {
    return order.courierStage === 'in_center'
      ? 'repair'
      : 'with_courier';
  }

  if (status === 'delivery') {
    return order.courierStage === 'to_customer'
      ? 'delivery'
      : 'ready';
  }

  return status;
}

function eligible(order) {
  const status = order.workflowStatus || 'new';

  return (
    (status === 'new' && !order.assignedCourier) ||
    (status === 'repair' && order.courierStage === 'in_center')
  );
}

function updateControls() {
  tabs.querySelectorAll('button').forEach(button => {
    button.disabled = busy;
  });

  prevPage.disabled = busy || page <= 1;
  nextPage.disabled = busy || page >= pages;
  batch.hidden = !['new', 'repair'].includes(activeStatus);

  const eligibleOrders = orders.filter(eligible);
  selectPage.disabled = busy || !eligibleOrders.length;

  selectPage.checked =
    eligibleOrders.length > 0 &&
    eligibleOrders.every(order => selected.has(order._id));

  selectPage.indeterminate = selected.size > 0 && !selectPage.checked;
  selectionCount.textContent = 'تم تحديد ' + selected.size + ' طلب';

  batchAction.textContent = activeStatus === 'repair'
    ? 'جاهز للتسليم — إسناد للمندوب'
    : 'إسناد للمندوب للاستلام';

  batchAction.disabled = busy || selected.size === 0;

  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.disabled = busy;
  });
}

function renderTabs() {
  tabs.replaceChildren();

  Object.entries(labels).forEach(([key, label]) => {
    const button = element(
      'button',
      'btn status-tab' + (activeStatus === key ? ' active' : ''),
      label + ' · ' + (counts[key] || 0)
    );

    button.type = 'button';
    button.setAttribute('aria-pressed', String(activeStatus === key));

    button.addEventListener('click', () => {
      if (busy) return;
      activeStatus = key;
      page = 1;
      selected.clear();
      loadOrders();
    });

    tabs.append(button);
  });

  pageLabel.textContent = 'صفحة ' + page + ' من ' + pages;
  updateControls();
}

function workflowDetails(order, card, head, body, actions) {
  const status = viewOf(order);
  card.classList.add('state-' + status);

  const info = element('div', 'workflow-info');
  let text = labels[status] || status;

  if (status === 'new' && order.assignedCourier) {
    text += ' — بانتظار استلام المندوب';
  }

  if (status === 'ready') {
    text += ' — الجهاز ما زال في المركز';
  }

  if (status === 'with_courier') {
    text += ' — استلمه من العميل ولم يؤكد تسليمه للمركز';
  }

  info.append(element('strong', 'status-badge', text));

  if (order.workflowUpdatedAt) {
    info.append(
      element(
        'div',
        'order-date',
        'آخر تغيير: ' + dateText(order.workflowUpdatedAt)
      )
    );
  }

  if (order.failureReason) {
    info.append(
      element(
        'div',
        'failure-reason',
        'سبب التأجيل: ' + order.failureReason
      )
    );
  }

  body.prepend(info);

  if (eligible(order)) {
    const label = element('label', 'order-select');
    const checkbox = element('input');

    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(order._id);
    checkbox.disabled = busy;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selected.set(order._id, order.workflowVersion || 0);
      } else {
        selected.delete(order._id);
      }

      updateControls();
    });

    label.append(checkbox, document.createTextNode(' تحديد الطلب'));
    head.append(label);
  }

  function actionButton(label, action, style) {
    const button = element('button', 'btn ' + style, label);
    button.type = 'button';
    button.disabled = busy;
    button.addEventListener('click', () => changeWorkflow(action, [order]));
    actions.append(button);
  }

  if (status === 'new' && !order.assignedCourier) {
    actionButton('إسناد للمندوب للاستلام', 'assign', 'btn-primary');
  }

  if (status === 'repair' && order.courierStage === 'in_center') {
    actionButton(
      'جاهز للتسليم — إسناد للمندوب',
      'dispatch',
      'btn-primary'
    );
  }

  if (!['failed', 'completed'].includes(status)) {
    actionButton('تأجيل', 'postpone', 'btn-postpone');
  }

  if (status === 'failed') {
    actionButton(
      'إعادة إسناد — استكمال المهمة',
      'retry',
      'btn-primary'
    );
  }
}

async function changeWorkflow(action, chosen) {
  if (busy || !chosen.length) return;

  let reason = '';

  if (action === 'postpone') {
    const value = window.prompt('اكتب سبب التأجيل (حتى 500 حرف):');
    if (value === null) return;

    reason = value.trim();

    if (!reason || reason.length > 500) {
      notify('اكتب السبب من 1 إلى 500 حرف.', 'error');
      return;
    }
  } else {
    const messages = {
      assign: 'إسناد الطلبات المحددة للمندوب ليستلم الأجهزة من العملاء؟',
      dispatch:
        'هل الأجهزة المحددة جاهزة لإرجاعها للعملاء؟ ستظهر للمندوب، وتظل في المركز حتى يؤكد استلامها.',
      retry: 'إعادة إسناد الطلب المؤجل للمندوب لاستكمال المهمة؟'
    };

    if (!window.confirm(messages[action])) return;
  }

  setBusy(true);
  notify('');
  let result;

  try {
    result = await api({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Action': 'update-workflow'
      },
      body: JSON.stringify({
        action,
        reason,
        items: chosen.map(order => ({
          id: order._id,
          version: order.workflowVersion || 0
        }))
      })
    });

    selected.clear();
    await readOrders();

    notify(
      'تم تحديث ' + result.changedCount + ' طلب.' +
      (
        result.conflicts.length
          ? ' لم يتم تغيير ' + result.conflicts.length +
            ' طلب لأن حالتها تغيّرت أو العملية غير متاحة؛ راجع القائمة.'
          : ''
      ),
      result.conflicts.length ? 'error' : 'success'
    );
  } catch (error) {
    notify(
      (
        result
          ? 'تم حفظ تحديث ' + result.changedCount +
            ' طلب، لكن تعذّر تحديث العرض. '
          : ''
      ) + error.message,
      'error'
    );
  } finally {
    setBusy(false);
  }
}

const partNames = {
  screen: { ar: 'الشاشة', en: 'Display' },
  display: { ar: 'الشاشة', en: 'Display' },
  battery: { ar: 'البطارية', en: 'Battery' },
  socket: { ar: 'سوكت الشحن', en: 'Charging Port' },
  charging_port: { ar: 'سوكت الشحن', en: 'Charging Port' },
  usp: { ar: 'سماعة المكالمات', en: 'Earpiece Speaker' },
  upper_speaker: { ar: 'السماعة العلوية', en: 'Upper Speaker' },
  lsp: { ar: 'السماعة الخارجية', en: 'Loudspeaker' },
  lower_speaker: { ar: 'السماعة السفلية', en: 'Lower Speaker' },
  mic: { ar: 'الميكروفون', en: 'Microphone' },
  microphone: { ar: 'الميكروفون', en: 'Microphone' },
  fcam: { ar: 'الكاميرا الأمامية', en: 'Front Camera' },
  front_camera: { ar: 'الكاميرا الأمامية', en: 'Front Camera' },
  bcam: { ar: 'الكاميرا الخلفية', en: 'Back Camera' },
  back_camera: { ar: 'الكاميرا الخلفية', en: 'Back Camera' },
  back: { ar: 'الظهر', en: 'Back Glass' },
  flash: { ar: 'الفلاش', en: 'Flash' },
  other: { ar: 'عطل آخر', en: 'Other Repair' }
};

function currentLanguage() {
  return String(document.documentElement.lang || 'ar')
    .toLowerCase()
    .startsWith('en')
      ? 'en'
      : 'ar';
}

function translate(ar, en) {
  return currentLanguage() === 'en' ? en : ar;
}

function normalizePart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function partLabel(value) {
  const item = partNames[normalizePart(value)];

  return item
    ? item[currentLanguage()]
    : String(value || '').replace(/_/g, ' ');
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function notify(text, type) {
  notice.textContent = text || '';
  notice.className = text ? (type || 'success') : '';
}

function setBusy(value) {
  busy = value;
  refresh.disabled = value;
  clearAll.disabled = value || !loaded || total === 0;

  container.querySelectorAll('button').forEach(button => {
    button.disabled = value;
  });

  updateControls();

  if (!value && searchPending) {
    searchPending = false;
    page = 1;
    selected.clear();
    loadOrders();
  }
}

function phoneDigits(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function field(parent, label, value, wide) {
  const box = element('div', 'field' + (wide ? ' wide' : ''));

  box.append(
    element('span', 'field-label', label),
    element(
      'div',
      'field-value',
      value === undefined || value === null || value === ''
        ? '—'
        : String(value)
    )
  );

  parent.append(box);
}

function dateText(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'تاريخ غير متاح';

  return date.toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function money(value) {
  if (value === null || value === undefined || value === '') return '—';

  const amount = Number(value);

  return Number.isFinite(amount)
    ? new Intl.NumberFormat('ar-EG', {
        maximumFractionDigits: 2
      }).format(amount) + ' ج.م'
    : '—';
}

function extractDeviceColor(details) {
  const d = details || {};
  let deviceColor = String(
    d.deviceColor || d.device_color || d.color || d.phoneColor || ''
  ).trim();

  const remainingLines = [];

  for (const line of String(d.notes || '').split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:لون\s*الجهاز|device[\s_-]*colou?r|phone[\s_-]*colou?r)\s*[:：=-]\s*(.*?)\s*$/i
    );

    if (match) {
      if (!deviceColor) deviceColor = match[1].trim();
    } else {
      remainingLines.push(line);
    }
  }

  return {
    deviceColor,
    customerNotes: remainingLines.join('\n').trim()
  };
}

function createRepairItem(part, index, note) {
  const item = element('div', 'repair-item');
  const number = element('span', 'repair-number', String(index + 1));
  const content = element('div', 'repair-content');

  content.append(element('span', 'repair-name', partLabel(part)));

  if (
    note !== undefined &&
    note !== null &&
    String(note).trim() !== ''
  ) {
    content.append(
      element(
        'span',
        'repair-note-label',
        translate('ملاحظات الإصلاح', 'Repair Notes')
      ),
      element('div', 'repair-note-value', String(note))
    );
  }

  item.append(number, content);
  return item;
}

function createRepairsSection(order) {
  const selectedParts = Array.isArray(order.selectedParts)
    ? order.selectedParts
    : [];

  const partNotes = order.partNotes || {};
  const section = element('div', 'repairs-section');

  section.append(
    element(
      'span',
      'repairs-title',
      translate('الإصلاحات المطلوبة', 'Required Repairs')
    )
  );

  if (!selectedParts.length) {
    section.append(element('div', 'field-value', '—'));
    return section;
  }

  const list = element('div', 'repairs-list');

  selectedParts.forEach((part, index) => {
    const key = normalizePart(part);
    let note = partNotes[part];

    if (note === undefined) note = partNotes[key];

    if (note === undefined) {
      const matchingKey = Object.keys(partNotes).find(
        noteKey => normalizePart(noteKey) === key
      );

      if (matchingKey !== undefined) {
        note = partNotes[matchingKey];
      }
    }

    list.append(createRepairItem(part, index, note));
  });

  section.append(list);
  return section;
}

function createExtraNotes(details) {
  const { customerNotes, deviceColor } = extractDeviceColor(details);
  if (!customerNotes && !deviceColor) return null;

  const notes = element('div', 'extra-notes');

  if (customerNotes) {
    const box = element('div', 'extra-note-box');
    box.append(
      element(
        'span',
        'field-label',
        translate('ملاحظات العميل', 'Customer Notes')
      ),
      element('div', 'field-value', customerNotes)
    );
    notes.append(box);
  }

  if (deviceColor) {
    const box = element('div', 'extra-note-box');
    box.append(
      element(
        'span',
        'field-label',
        translate('لون الجهاز', 'Device Color')
      ),
      element('div', 'device-color-value', deviceColor)
    );
    notes.append(box);
  }

  return notes;
}

function render() {
  container.replaceChildren();
  const query = search.value.trim();
  renderTabs();

  totalCount.textContent = total;
  visibleCount.textContent = filteredTotal;

  listStatus.textContent =
    'عرض ' + orders.length + ' من ' + filteredTotal + ' طلب في هذا القسم';

  if (!orders.length) {
    container.append(
      element(
        'div',
        'empty',
        query
          ? 'لا توجد نتائج مطابقة. جرّب كلمة بحث أخرى.'
          : 'لا توجد طلبات لعرضها حاليًا.'
      )
    );
  }

  for (const order of orders) {
    const d = order.details || {};
    const card = element('article', 'order-card');
    const head = element('div', 'card-head');
    const identity = element('div');

    identity.append(
      element('span', 'order-number', order.orderNo || 'طلب بدون رقم'),
      element('div', 'order-date', dateText(order.createdAt))
    );

    head.append(
      identity,
      element('span', 'model-badge', order.model || 'جهاز غير محدد')
    );

    const body = element('div', 'card-body');
    body.append(element('h2', 'customer-name', d.name || 'عميل بدون اسم'));

    const grid = element('div', 'grid');
    field(grid, 'رقم الهاتف', d.phone);
    field(grid, 'رقم واتساب', d.whatsapp);
    field(grid, 'العنوان', d.address, true);

    body.append(grid, createRepairsSection(order));

    const extraNotes = createExtraNotes(d);
    if (extraNotes) body.append(extraNotes);

    const foot = element('div', 'card-foot');
    const amount = element('div');

    amount.append(
      element('div', 'total-label', 'إجمالي الطلب'),
      element('div', 'total-value', money(order.totalPrice))
    );

    const actions = element('div', 'actions');
    const phone = phoneDigits(d.phone);

    if (phone) {
      const call = element('a', 'btn btn-call', 'اتصال بالعميل');
      call.href = 'tel:' + phone;
      actions.append(call);
    }

    let whatsapp = phoneDigits(d.whatsapp || d.phone);

    if (whatsapp.startsWith('00')) whatsapp = whatsapp.slice(2);
    if (whatsapp.length === 11 && whatsapp.startsWith('01')) {
      whatsapp = '2' + whatsapp;
    }

    if (whatsapp) {
      const link = element('a', 'btn btn-whatsapp');
      const parts = Array.isArray(order.selectedParts)
        ? order.selectedParts.map(part => partLabel(part)).join('، ')
        : '';
      const { customerNotes, deviceColor } = extractDeviceColor(d);
      const message = [
        'أهلاً ' + (d.name || 'بحضرتك') + ' 👋',
        'شكراً لطلبك من Reset ❤️',
        '',
        'تفاصيل طلبك:',
        'رقم الطلب: ' + (order.orderNo || 'غير متاح'),
        'الجهاز: ' + (order.model || 'غير محدد'),
        'الخدمة: ' + (parts || 'غير محددة'),
        'الإجمالي: ' + money(order.totalPrice),
        deviceColor ? 'لون الجهاز: ' + deviceColor : '',
        customerNotes ? 'ملاحظاتك: ' + customerNotes : '',
        '',
        'لو عندك أي استفسار، إحنا معاك.'
      ].filter(Boolean).join('\n');

      link.href = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="currentColor"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .16 5.34.16 11.91c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.9 11.9 0 0 0 5.77 1.47h.01C18.65 23.82 24 18.48 24 11.91c0-3.18-1.24-6.17-3.48-8.43ZM12.08 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.65-.24-.38a9.84 9.84 0 0 1-1.51-5.25c0-5.45 4.44-9.89 9.9-9.89a9.83 9.83 0 0 1 7 2.9 9.83 9.83 0 0 1 2.9 7c0 5.46-4.44 9.9-9.9 9.9Zm5.43-7.41c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></svg><span>واتساب + الفاتورة</span>';
      actions.append(link);
    }

    const remove = element('button', 'btn btn-delete', 'حذف الطلب');
    remove.type = 'button';
    remove.disabled = busy;
    remove.addEventListener('click', () => deleteOne(order));
    actions.append(remove);

    workflowDetails(order, card, head, body, actions);

    foot.append(amount, actions);
    card.append(head, body, foot);
    container.append(card);
  }

  clearAll.disabled = busy || !loaded || total === 0;
  updateControls();
}

async function api(options) {
  const params = new URLSearchParams({
    format: 'json',
    status: activeStatus,
    q: search.value.trim(),
    page: String(page)
  });

  const response = await fetch('/api/orders?' + params, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...options
  });

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      response.status === 401
        ? 'يلزم تسجيل الدخول. أعد فتح لوحة الإدارة.'
        : 'رد غير متوقع من السيرفر. حدّث الصفحة للتحقق.'
    );
  }

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'تعذر إتمام العملية.');
  }

  return data;
}

async function readOrders() {
  const data = await api({ method: 'GET' });

  orders = data.orders;
  total = data.total;
  counts = data.counts;
  filteredTotal = data.filteredTotal;
  page = data.page;
  pages = data.pages;

  for (const [id, version] of selected) {
    const order = orders.find(item => item._id === id);

    if (
      !order ||
      !eligible(order) ||
      (order.workflowVersion || 0) !== version
    ) {
      selected.delete(id);
    }
  }

  loaded = true;

  lastUpdated.textContent = new Date().toLocaleTimeString('ar-EG', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit'
  });

  render();
}

async function loadOrders(silent = false) {
  if (busy) return;
  setBusy(true);
  if (!silent) notify('');

  listStatus.textContent = 'جاري تحديث الطلبات…';

  try {
    await readOrders();
  } catch (error) {
    listStatus.textContent = 'تعذر التحديث';
    notify(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function performDelete(payload) {
  if (busy) return;
  setBusy(true);
  notify('');

  try {
    const result = await api({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Action': 'delete-orders'
      },
      body: JSON.stringify(payload)
    });

    orders = payload.action === 'all'
      ? []
      : orders.filter(order => order._id !== payload.id);

    total = Math.max(0, total - result.deletedCount);
    render();

    const successText = 'تم حذف ' + result.deletedCount + ' طلب نهائيًا.';

    try {
      await readOrders();
      notify(successText, 'success');
    } catch {
      notify(
        successText + ' تعذر تحديث بقية القائمة؛ اضغط تحديث الطلبات.',
        'error'
      );
    }
  } catch (error) {
    notify(
      error.message +
      ' لو النتيجة غير واضحة، اضغط تحديث قبل تكرار الحذف.',
      'error'
    );
  } finally {
    setBusy(false);
  }
}

function deleteOne(order) {
  if (busy) return;

  const name = (order.details || {}).name || 'بدون اسم';

  if (
    !window.confirm(
      'حذف الطلب ' + (order.orderNo || '') +
      ' الخاص بالعميل ' + name +
      ' نهائيًا من قاعدة البيانات؟ لا يمكن التراجع.'
    )
  ) {
    return;
  }

  performDelete({ action: 'one', id: order._id });
}

function deleteAll() {
  if (busy || !loaded || total === 0) return;

  const confirmation = window.prompt(
    'سيتم حذف جميع الطلبات الموجودة في قاعدة البيانات وقت التنفيذ،' +
    ' بما فيها الطلبات غير المعروضة وأي طلبات جديدة وصلت.' +
    '\nهذا الحذف نهائي ولا يقتصر على نتائج البحث.' +
    '\nللتأكيد اكتب: حذف الكل'
  );

  if (confirmation !== 'حذف الكل') {
    if (confirmation !== null) {
      notify('لم يحدث حذف؛ عبارة التأكيد غير مطابقة.', 'error');
    }
    return;
  }

  performDelete({ action: 'all', confirmation });
}

search.addEventListener('input', () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    if (busy) {
      searchPending = true;
      return;
    }

    page = 1;
    selected.clear();
    loadOrders();
  }, 350);
});

refresh.addEventListener('click', () => loadOrders());

selectPage.addEventListener('change', () => {
  selected.clear();

  if (selectPage.checked) {
    orders.filter(eligible).forEach(order => {
      selected.set(order._id, order.workflowVersion || 0);
    });
  }

  render();
});

batchAction.addEventListener('click', () => {
  changeWorkflow(
    activeStatus === 'repair' ? 'dispatch' : 'assign',
    orders.filter(order => selected.has(order._id))
  );
});

prevPage.addEventListener('click', () => {
  if (!busy && page > 1) {
    page--;
    selected.clear();
    loadOrders();
  }
});

nextPage.addEventListener('click', () => {
  if (!busy && page < pages) {
    page++;
    selected.clear();
    loadOrders();
  }
});

setInterval(() => {
  if (
    !busy &&
    !document.hidden &&
    document.activeElement !== search
  ) {
    loadOrders(true);
  }
}, 15000);

clearAll.addEventListener('click', deleteAll);
loadOrders();
</script>
</body>
</html>
`;

export default app;