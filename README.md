# WebMonitor

یک کامپوننت مرورگر قابل جاسازی برای اپلیکیشن‌های Electron که محدودیت‌های X-Frame-Options و CSP را دور می‌زند.

---

## چیست؟

**WebMonitor** یک مرورگر سفارشی برای Electron است که می‌تواند هر وبسایتی را بدون محدودیت‌های امنیتی مرورگرها نمایش دهد.

### ویژگی‌ها

| ویژگی | توضیح |
|-------|-------|
| دور زدن X-Frame-Options | سایت‌هایی که iframe را بلاک می‌کنند |
| غیرفعال کردن CSP | Content Security Policy را حذف می‌کند |
| سیستم تب | چندین تب مثل Chrome |
| تم تاریک/روشن | قابل تنظیم |
| جستجوی گوگل | متن غیر-URL خودکار در گوگل سرچ می‌شود |
| کیبورد شورتکات | Ctrl+T, Ctrl+W, Ctrl+R |

---

## نصب

```bash
npm install
```

## اجرا

```bash
npm start
```

---

## ساختار پروژه

```
iframe/
├── src/
│   └── index.js          # کلاس اصلی WebMonitor
├── example/
│   ├── main.js           # Electron main process
│   └── index.html        # صفحه نمونه
├── package.json
└── README.md
```

---

## نحوه استفاده

### ۱. در Main Process (main.js)

```javascript
const { app, BrowserWindow } = require('electron');
const WebMonitor = require('./src/index.js');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true  // مهم!
    }
  });

  // این خط header های امنیتی را حذف می‌کند
  WebMonitor.setupMain();

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

### ۲. در Renderer (index.html)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    html, body, #browser { height: 100%; margin: 0; }
  </style>
</head>
<body>
  <div id="browser"></div>

  <script>
    const WebMonitor = require('./src/index.js');

    const monitor = new WebMonitor({
      container: '#browser',
      theme: 'dark',
      startUrl: 'https://google.com'
    });

    monitor.init();
  </script>
</body>
</html>
```

---

## تنظیمات (Options)

```javascript
new WebMonitor({
  container: '#browser',      // سلکتور یا المان
  theme: 'dark',              // 'dark' یا 'light'
  showTabs: true,             // نمایش نوار تب
  showNavigation: true,       // نمایش دکمه‌های back/forward/reload
  showStatusBar: true,        // نمایش نوار وضعیت
  startUrl: 'https://...',    // URL شروع

  // Event callbacks
  onNavigate: (tab, url) => {},
  onTitleChange: (tab, title) => {},
  onLoadStart: (tab) => {},
  onLoadEnd: (tab) => {},
  onError: (tab, error) => {}
});
```

---

## متدها (API)

| متد | توضیح |
|-----|-------|
| `init()` | راه‌اندازی کامپوننت |
| `newTab(url?)` | باز کردن تب جدید |
| `closeTab(id)` | بستن تب |
| `switchTab(id)` | تغییر به تب دیگر |
| `navigate(url)` | رفتن به URL |
| `goBack()` | برگشت |
| `goForward()` | جلو |
| `reload()` | بارگذاری مجدد |
| `getCurrentUrl()` | گرفتن URL فعلی |
| `getTabs()` | لیست تب‌ها |

---

## کیبورد شورتکات

| کلید | عملکرد |
|------|--------|
| `Ctrl + T` | تب جدید |
| `Ctrl + W` | بستن تب |
| `Ctrl + R` | بارگذاری مجدد |
| `Enter` | رفتن به URL |

---

## چگونه کار می‌کند؟

### ۱. حذف Header های امنیتی

```javascript
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  // حذف X-Frame-Options و CSP
  delete headers['x-frame-options'];
  delete headers['content-security-policy'];
  callback({ responseHeaders: headers });
});
```

### ۲. استفاده از webview

Electron از تگ `<webview>` پشتیبانی می‌کند که مثل iframe عمل می‌کند اما محدودیت‌های کمتری دارد.

---

## محدودیت‌ها

- فقط در **Electron** کار می‌کند (اپ دسکتاپ)
- در مرورگر وب کار نمی‌کند
- نیاز به نصب Electron دارد (~200MB)

---

## کاربردها

- ساخت مرورگر سفارشی
- نمایش وبسایت‌هایی که iframe بلاک دارند
- ابزارهای Web Scraping با UI
- داشبوردهای چند سایتی
- کیوسک مود

---

## لایسنس

MIT

---

## نویسنده

ساخته شده با Electron + Node.js"# google-app" 
# google-app
