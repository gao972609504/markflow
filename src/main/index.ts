import { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } from 'electron'
import { join, dirname, relative } from 'path'
import { readFile, writeFile, readdir, stat, mkdir, unlink, rmdir, rename as fsRename } from 'fs/promises'
import { existsSync } from 'fs'
import { homedir } from 'os'

let mainWindow: BrowserWindow | null = null

// 生成 HTML 目录
function generateToc(html: string): string {
  const headings = html.match(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)
  if (!headings || headings.length === 0) return ''
  let toc = '<nav class="toc"><h3>目录</h3><ul>'
  for (const h of headings) {
    const level = h.match(/<h([1-6])/)?.[1]
    const text = h.replace(/<[^>]+>/g, '').trim()
    const id = text.toLowerCase().replace(/[^\w一-鿿]+/g, '-')
    toc += `<li class="toc-level-${level}"><a href="#${id}">${text}</a></li>`
  }
  toc += '</ul></nav>'
  return toc
}

// 为 HTML 标题添加 id 锚点
function addHeadingIds(html: string): string {
  return html.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/g, (_match, level, attrs, content) => {
    const text = content.replace(/<[^>]+>/g, '').trim()
    const id = text.toLowerCase().replace(/[^\w一-鿿]+/g, '-')
    return `<h${level} id="${id}"${attrs}>${content}</h${level}>`
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '泊墨',
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 开发模式加载 dev server，生产模式加载文件
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  createMenu()
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建文件', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-file') },
        { label: '打开文件', accelerator: 'CmdOrCtrl+O', click: () => handleOpenFile() },
        { label: '打开文件夹', accelerator: 'CmdOrCtrl+K CmdOrCtrl+O', click: () => handleOpenFolder() },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { label: '另存为', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu:save-as') },
        { type: 'separator' },
        { label: '导出 HTML', click: () => mainWindow?.webContents.send('menu:export', 'html') },
        { label: '导出 PDF', click: () => mainWindow?.webContents.send('menu:export', 'pdf') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { label: '查找替换', accelerator: 'CmdOrCtrl+H', click: () => mainWindow?.webContents.send('menu:find-replace') }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '切换源码模式', accelerator: 'CmdOrCtrl+/', click: () => mainWindow?.webContents.send('menu:toggle-mode') },
        { label: '切换侧边栏', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('menu:toggle-sidebar') },
        { label: '切换大纲', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow?.webContents.send('menu:toggle-outline') },
        { type: 'separator' },
        { label: '切换主题', click: () => mainWindow?.webContents.send('menu:toggle-theme') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于 泊墨', click: () => {
          dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: '关于 泊墨',
            message: '泊墨 v2.1.0',
            detail: '功能丰富的 Markdown 编辑器 | 100+ 特性迭代 | 实时渲染\n基于 Electron + React 构建'
          })
        }}
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function handleOpenFile(): Promise<void> {
  if (!mainWindow) return
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
      { name: '文本文件', extensions: ['txt'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf-8')
    mainWindow.webContents.send('file:opened', { filePath, content })
  }
}

async function handleOpenFolder(): Promise<void> {
  if (!mainWindow) return
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0]
    const tree = await buildFileTree(folderPath)
    mainWindow.webContents.send('folder:opened', { folderPath, tree })
  }
}

interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
}

async function buildFileTree(dirPath: string, maxDepth: number = 10): Promise<FileTreeNode[]> {
  if (maxDepth <= 0) return []
  const entries = await readdir(dirPath, { withFileTypes: true })
  const nodes: FileTreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, maxDepth - 1)
      nodes.push({ name: entry.name, path: fullPath, isDirectory: true, children })
    } else if (/\.(md|markdown|txt|mdown|mkd)$/i.test(entry.name)) {
      nodes.push({ name: entry.name, path: fullPath, isDirectory: false })
    }
  }

  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

// IPC handlers
ipcMain.handle('file:read', async (_event, filePath: string) => {
  return await readFile(filePath, 'utf-8')
})

ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
  try {
    // 自动备份：文件已存在且内容变化时，将旧版本写入 .bomo-backup/
    try {
      const oldStat = await stat(filePath)
      if (oldStat.isFile()) {
        const oldContent = await readFile(filePath, 'utf-8')
        if (oldContent && oldContent !== content) {
          const dir = dirname(filePath)
          const base = filePath.split(/[/\\]/).pop() || 'doc'
          const backupDir = join(dir, '.bomo-backup')
          await mkdir(backupDir, { recursive: true })
          const ts = new Date().toISOString().replace(/[:.]/g, '-')
          await writeFile(join(backupDir, `${base}.${ts}.bak`), oldContent, 'utf-8')
          // 轮换：仅保留该文件最近 20 份备份
          try {
            const files = await readdir(backupDir)
            const baks = files.filter(f => f.startsWith(base + '.') && f.endsWith('.bak')).sort().reverse()
            for (const f of baks.slice(20)) { try { await unlink(join(backupDir, f)) } catch { /* noop */ } }
          } catch { /* cleanup noop */ }
        }
      }
    } catch { /* 文件尚不存在，跳过备份 */ }
    await writeFile(filePath, content, 'utf-8')
    return true
  } catch (e) {
    console.error('file:write error', e)
    return false
  }
})

ipcMain.handle('file:save-as', async (_event, content: string) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  if (!result.canceled && result.filePath) {
    await writeFile(result.filePath, content, 'utf-8')
    return result.filePath
  }
  return null
})

ipcMain.handle('export:html', async (_event, html: string) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'HTML', extensions: ['html'] }]
  })
  if (!result.canceled && result.filePath) {
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>泊墨 导出</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 30px; color: #333; line-height: 1.6; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-size: 85%; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #dfe2e5; padding: 0 16px; margin: 0; color: #6a737d; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    img { max-width: 100%; }
    h1,h2,h3,h4,h5,h6 { border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
    .toc { background: #f6f8fa; border: 1px solid #d1d9e0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
    .toc h3 { border: none; margin-top: 0; padding-bottom: 8px; }
    .toc ul { list-style: none; padding-left: 0; }
    .toc a { color: #0969da; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .toc-level-2 { padding-left: 20px; }
    .toc-level-3 { padding-left: 40px; }
    .toc-level-4 { padding-left: 60px; }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
</head>
<body>${generateToc(html)}${addHeadingIds(html)}</body>
</html>`
    await writeFile(result.filePath, fullHtml, 'utf-8')
    return result.filePath
  }
  return null
})

ipcMain.handle('export:pdf', async (_event) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (!result.canceled && result.filePath) {
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    })
    await writeFile(result.filePath, pdfData)
    return result.filePath
  }
  return null
})

ipcMain.handle('dialog:openFolder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('fs:readdir', async (_event, dirPath: string) => {
  return await buildFileTree(dirPath)
})

ipcMain.handle('app:getDefaultPath', () => {
  return homedir()
})

ipcMain.handle('backup:list', async (_event, filePath: string) => {
  try {
    if (!filePath) return []
    const dir = dirname(filePath)
    const base = filePath.split(/[/\\]/).pop() || ''
    const backupDir = join(dir, '.bomo-backup')
    const files = await readdir(backupDir)
    const list = files.filter(f => f.startsWith(base + '.') && f.endsWith('.bak'))
    const out: { name: string; path: string; mtime: number; size: number }[] = []
    for (const f of list) {
      const p = join(backupDir, f)
      const s = await stat(p)
      out.push({ name: f, path: p, mtime: s.mtimeMs, size: s.size })
    }
    return out.sort((a, b) => b.mtime - a.mtime)
  } catch { return [] }
})

ipcMain.handle('backup:read', async (_event, backupPath: string) => {
  return await readFile(backupPath, 'utf-8')
})

// 文件变更检测：返回文件的修改时间戳
ipcMain.handle('fs:getModifiedTime', async (_event, filePath: string) => {
  try {
    const s = await stat(filePath)
    return s.mtimeMs
  } catch {
    return null
  }
})

// 文件树操作：新建文件
ipcMain.handle('fs:createFile', async (_event, filePath: string) => {
  await writeFile(filePath, '', 'utf-8')
  return true
})

// 文件树操作：新建文件夹
ipcMain.handle('fs:createFolder', async (_event, dirPath: string) => {
  await mkdir(dirPath, { recursive: true })
  return true
})

// 文件树操作：重命名
ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
  await fsRename(oldPath, newPath)
  return true
})

// 文件树操作：删除文件
ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
  await unlink(filePath)
  return true
})

// 文件树操作：删除文件夹
ipcMain.handle('fs:deleteFolder', async (_event, dirPath: string) => {
  await rmdir(dirPath, { recursive: true })
  return true
})

// 图片粘贴：保存图片到 assets 目录并返回相对路径
ipcMain.handle('image:savePasted', async (_event, base64Data: string, filePath: string | null) => {
  const buffer = Buffer.from(base64Data, 'base64')
  // 确定保存目录
  const baseDir = filePath ? dirname(filePath) : homedir()
  const assetsDir = join(baseDir, 'assets')
  if (!existsSync(assetsDir)) {
    await mkdir(assetsDir, { recursive: true })
  }
  // 生成文件名
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`
  const imgName = `image-${ts}.png`
  const imgPath = join(assetsDir, imgName)
  await writeFile(imgPath, buffer)
  // 返回相对路径
  const relPath = relative(baseDir, imgPath).replace(/\\/g, '/')
  return relPath
})

/** 待打开的文件（窗口创建前拖入的） */
let pendingFile: string | null = null

/** 发送文件到渲染进程 */
async function sendFileToRenderer(filePath: string) {
  if (!mainWindow) return
  const content = await readFile(filePath, 'utf-8')
  mainWindow.webContents.send('file:opened', { filePath, content })
}

/** 检查命令行参数中的文件 */
function getArgFile(): string | null {
  const args = process.argv.slice(1)
  for (const arg of args) {
    if (!arg.startsWith('-') && /\.(md|markdown|mdown|mkd|txt)$/i.test(arg)) {
      return arg
    }
  }
  return null
}

// macOS / Windows：文件拖到 Dock 图标或通过"打开方式"触发
app.on('open-file', async (event, filePath) => {
  event.preventDefault()
  if (mainWindow) {
    await sendFileToRenderer(filePath)
  } else {
    pendingFile = filePath
  }
})

app.whenReady().then(async () => {
  createWindow()

  // 等窗口加载完毕后发送待打开的文件
  mainWindow!.webContents.on('did-finish-load', async () => {
    const file = pendingFile || getArgFile()
    if (file) {
      await sendFileToRenderer(file)
      pendingFile = null
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
