# WebMonitor - راهنمای استفاده

یک کامپوننت مرورگر برای Electron که همه سایت‌ها رو بدون محدودیت لود میکنه.

---

## اجرای این پروژه

```bash
cd c:\Users\abaone\Desktop\iframe
npm install
npm start
```

---

## اضافه کردن به پروژه‌های دیگه

### قدم ۱: کپی فایل کتابخانه

فایل `src/index.js` رو کپی کن توی پروژه‌ات.

### قدم ۲: تنظیم Main Process

توی فایل main.js پروژه‌ات:

```javascript
const { app, BrowserWindow } = require('electron');
const WebMonitor = require('./index.js');  // مسیر فایل کپی شده

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

  // این خط رو یکبار صدا بزن
  WebMonitor.setupMain();

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

### قدم ۳: استفاده توی HTML

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
  </style>
</head>
<body>
  <div id="browser" style="height: 100%;"></div>

  <script>
    const WebMonitor = require('./index.js');

    const monitor = new WebMonitor({
      container: '#browser',
      theme: 'dark'
    });

    monitor.init();
  </script>
</body>
</html>
```

---

## تنظیمات

| تنظیم | مقدار پیش‌فرض | توضیح |
|-------|--------------|-------|
| `container` | `document.body` | المان یا CSS selector |
| `theme` | `'dark'` | `'dark'` یا `'light'` |
| `showTabs` | `true` | نمایش تب‌ها |
| `showNavigation` | `true` | نمایش دکمه‌های ناوبری |
| `showStatusBar` | `true` | نمایش نوار وضعیت |
| `startUrl` | `''` | آدرس اولیه |

---

## متدها

```javascript
// تب جدید
monitor.newTab('https://example.com');

// رفتن به آدرس
monitor.navigate('https://google.com');

// ناوبری
monitor.goBack();
monitor.goForward();
monitor.reload();

// مدیریت تب
monitor.switchTab(tabId);
monitor.closeTab(tabId);

// گرفتن اطلاعات
monitor.getCurrentUrl();
monitor.getTabs();
```

---

## میانبرها

| کلید | عملکرد |
|------|--------|
| `Ctrl+T` | تب جدید |
| `Ctrl+W` | بستن تب |
| `Ctrl+R` | رفرش |
| `Enter` | رفتن به آدرس |

---

## Events (اختیاری)

```javascript
const monitor = new WebMonitor({
  container: '#browser',
  onNavigate: (tab, url) => {
    console.log('رفت به:', url);
  },
  onTitleChange: (tab, title) => {
    console.log('عنوان:', title);
  },
  onError: (tab, error) => {
    console.log('خطا:', error);
  }
});
```