const { app, BrowserWindow, Tray, Menu, globalShortcut, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Mikrofon ve medya erişimi için gerekli
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

let mainWindow;
let tray;
let bridgeProcess;

// Köprü sunucusunu başlat
function startBridge() {
  const serverPath = path.join(__dirname, 'server.js');
  bridgeProcess = spawn('node', [serverPath], {
    stdio: 'ignore',
    detached: true
  });
  bridgeProcess.unref();
  console.log('Köprü başlatıldı (PID:', bridgeProcess.pid, ')');
}

// Köprü sunucusunu durdur
function stopBridge() {
  if (bridgeProcess) {
    bridgeProcess.kill();
    console.log('Köprü durduruldu');
  }
}

// Ana pencereyi oluştur
function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png');
  const hasIcon = require('fs').existsSync(iconPath);
  
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    frame: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    icon: hasIcon ? iconPath : undefined,
    title: 'AI Asistanım'
  });

  // Mikrofon izni iste
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // HTTPS gibi davran (mikrofon için gerekli)
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return true;
  });

  // Google Speech API'ye erişime izin ver
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: details.requestHeaders });
  });

  // index.html'i yükle
  mainWindow.loadFile('index.html');

  // Pencere kapatıldığında
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// Sistem tepsisi (tray) oluştur
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icon.png');
    if (!require('fs').existsSync(iconPath)) {
      console.log('İkon dosyası bulunamadı, tepsisiz devam ediliyor');
      return;
    }
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Asistanı Göster',
        click: () => {
          mainWindow.show();
        }
      },
      {
        label: 'Köprüyü Yeniden Başlat',
        click: () => {
          stopBridge();
          startBridge();
        }
      },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => {
          app.isQuitting = true;
          stopBridge();
          app.quit();
        }
      }
    ]);

    tray.setToolTip('AI Asistanım - Jarvis');
    tray.setContextMenu(contextMenu);
    
    // Tıklama ile pencereyi göster/gizle
    tray.on('double-click', () => {
      mainWindow.show();
    });
  } catch (e) {
    console.log('Tray oluşturulamadı:', e.message);
  }
}

// Uygulama başlatma
app.whenReady().then(() => {
  // Köprüyü başlat
  startBridge();
  
  // Pencereyi oluştur
  createWindow();
  
  // Tepsisini oluştur
  createTray();
  
  // Global hotkey: Ctrl+Shift+A ile aç/kapat
  globalShortcut.register('Ctrl+Shift+A', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
});

// Tüm pencereler kapatıldığında
app.on('window-all-closed', () => {
  // macOS dışı sistemlerde uygulamayı kapat
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Uygulama kapatılırken
app.on('before-quit', () => {
  app.isQuitting = true;
  stopBridge();
  globalShortcut.unregisterAll();
});
