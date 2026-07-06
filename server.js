const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// قاعدة بيانات SQLite بسيطة
const dbFile = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbFile);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    type TEXT,
    date TEXT,
    amount REAL DEFAULT 0,
    qty INTEGER DEFAULT 0,
    notes TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  )`);
});

// API: إضافة عميل
app.post('/api/customers', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  db.run(`INSERT INTO customers(name) VALUES(?)`, [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

// API: قائمة العملاء
app.get('/api/customers', (req, res) => {
  db.all(`SELECT * FROM customers ORDER BY name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: إضافة عملية بيع
app.post('/api/sales', (req, res) => {
  const { customer_id, type, date, amount, qty, notes } = req.body;
  if (!customer_id || !date) return res.status(400).json({ error: 'customer_id and date required' });
  db.run(
    `INSERT INTO sales(customer_id, type, date, amount, qty, notes) VALUES(?,?,?,?,?,?)`,
    [customer_id, type || '', date, amount || 0, qty || 0, notes || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// API: عمليات لعميل (أو الكل)
app.get('/api/sales', (req, res) => {
  const { customer_id } = req.query;
  const params = [];
  let q = `SELECT s.*, c.name as customer_name FROM sales s JOIN customers c ON s.customer_id=c.id`;
  if (customer_id) {
    q += ` WHERE customer_id = ?`;
    params.push(customer_id);
  }
  q += ` ORDER BY date DESC`;
  db.all(q, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// توليد ملف Excel منفرد لعميل
app.get('/export/customer/:id', (req, res) => {
  const customerId = req.params.id;
  db.get(`SELECT * FROM customers WHERE id = ?`, [customerId], (err, customer) => {
    if (err || !customer) return res.status(404).send('Customer not found');
    db.all(`SELECT * FROM sales WHERE customer_id = ? ORDER BY date`, [customerId], async (err2, sales) => {
      if (err2) return res.status(500).send(err2.message);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'sales-tracker';
      // ورقة الملخص
      const summary = workbook.addWorksheet('ملخص');
      summary.columns = [
        { header: 'الاسم', key: 'name', width: 30 },
        { header: 'عدد العمليات', key: 'ops', width: 15 },
        { header: 'إجمالي المبيعات', key: 'total', width: 20 },
        { header: 'إجمالي الكمية', key: 'qty', width: 15 }
      ];
      const totalAmount = (sales || []).reduce((s, r) => s + (r.amount || 0), 0);
      const totalQty = (sales || []).reduce((s, r) => s + (r.qty || 0), 0);
      summary.addRow({ name: customer.name, ops: (sales || []).length, total: totalAmount, qty: totalQty });

      // ورقة العمليات
      const sheet = workbook.addWorksheet('العمليات');
      sheet.columns = [
        { header: 'المعرف', key: 'id', width: 8 },
        { header: 'التاريخ', key: 'date', width: 18 },
        { header: 'النوع', key: 'type', width: 20 },
        { header: 'الكمية', key: 'qty', width: 12 },
        { header: 'المبلغ', key: 'amount', width: 15 },
        { header: 'ملاحظات', key: 'notes', width: 30 }
      ];
      (sales || []).forEach(s => sheet.addRow(s));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=customer_${customerId}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    });
  });
});

// توليد ملف Excel مجمع (ورقة أولى ملخص لكل العملاء + ورقة لكل عميل)
app.get('/export/all', (req, res) => {
  db.all(`SELECT * FROM customers ORDER BY name`, [], (err, customers) => {
    if (err) return res.status(500).send(err.message);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'sales-tracker';

    // ملخص لكل العملاء
    const overview = workbook.addWorksheet('ملخص الكل');
    overview.columns = [
      { header: 'المعرف', key: 'id', width: 8 },
      { header: 'العميل', key: 'name', width: 30 },
      { header: 'عدد العمليات', key: 'ops', width: 15 },
      { header: 'إجمالي المبيعات', key: 'total', width: 20 },
      { header: 'إجمالي الكمية', key: 'qty', width: 15 }
    ];

    // سنجيب بعد تحميل كل المبيعات لكل عميل (تجميعي)
    const tasks = customers.map(c => new Promise((resolve) => {
      db.all(`SELECT * FROM sales WHERE customer_id = ?`, [c.id], (e, sales) => {
        const total = (sales || []).reduce((s, r) => s + (r.amount || 0), 0);
        const qty = (sales || []).reduce((s, r) => s + (r.qty || 0), 0);
        overview.addRow({ id: c.id, name: c.name, ops: (sales || []).length, total, qty });

        // ورقة مفصلة لكل عميل
        const sh = workbook.addWorksheet(`عميل_${c.id}`);
        sh.columns = [
          { header: 'المعرف', key: 'id', width: 8 },
          { header: 'التاريخ', key: 'date', width: 18 },
          { header: 'النوع', key: 'type', width: 20 },
          { header: 'الكمية', key: 'qty', width: 12 },
          { header: 'المبلغ', key: 'amount', width: 15 },
          { header: 'ملاحظات', key: 'notes', width: 30 }
        ];
        (sales || []).forEach(s => sh.addRow(s));
        resolve();
      });
    }));

    Promise.all(tasks).then(async () => {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=all_customers.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    }).catch(err2 => res.status(500).send(err2.message));
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
