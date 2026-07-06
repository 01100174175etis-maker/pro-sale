# sales-tracker

تطبيق ويب بسيط لتسجيل عمليات البيع لكل عميل وتصدير ملفات Excel.

يتوفر الآن إصدارين في المستودع:
- Node.js (server.js) — الإصدار الأصلي.
- Python (app.py) — إصدار مُحدّث يعمل بـ Flask + SQLite + openpyxl.

تم إضافة حقول جديدة للمبيعات:
- رقم الفاتورة (invoice_number)
- رمز المنتج (product_code)

تشغيل الإصدار بالبايثون (Windows 7 أو أحدث)

1. تأكد أن لديك Python 3.8+ منصّبًا. إن لم يكن مثبتًا، نزّل من https://www.python.org/downloads/ (اختر إصدار يدعم Win7 إذا لزم).
2. افتح PowerShell في مجلد المشروع.
3. أنشئ بيئة افتراضية وتفعيلها:
   - python -m venv .venv
   - .\.venv\Scripts\activate
4. ثبّت الاعتماديات:
   - pip install -r requirements.txt
5. شغّل التطبيق:
   - python app.py
6. افتح المتصفح على:
   - http://localhost:3000

نقاط API المحدثة
- POST /api/sales الآن يقبل حقول إضافية:
  - invoice_number (string)
  - product_code (string)

تصدير Excel
- أوراق العمليات الآن تتضمن عمودين جديدين: رقم الفاتورة ورمز المنتج.

هام: الترقية من نسخة سابقة
- عند تشغيل app.py لأول مرة، سيحاول الكود إنشاء أعمدة جديدة في جدول sales إذا لم تكن موجودة بالفعل (يستخدم ALTER TABLE لإضافة invoice_number وproduct_code). لا تحتاج لمسح قاعدة البيانات القديمة.

إذا تريد نقل النسخة Node.js إلىلقسم legacy/ أو حذفها، أو إذا تريد حقل إضافي آخر (مثل حالة الدفع أو رقم الفاتورة الإلكتروني)، أخبرني وسأنفّذ التعديل.
