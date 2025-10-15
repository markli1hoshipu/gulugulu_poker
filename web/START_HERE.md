# 启动指南

## Windows 用户

### 1. 安装依赖

#### 后端
打开命令提示符（CMD）或PowerShell：
```cmd
cd web\backend
pip install -r requirements.txt
```

#### 前端
打开另一个命令提示符：
```cmd
cd web\frontend
npm install
```

### 2. 启动服务

#### 方式一：使用启动脚本（推荐）

**启动后端：**
```cmd
cd web\backend
run.bat
```

**启动前端：**
打开新的命令提示符窗口
```cmd
cd web\frontend
npm run dev
```

#### 方式二：手动启动

**启动后端：**
```cmd
cd web\backend
python main.py
```

**启动前端：**
```cmd
cd web\frontend
npm run dev
```

### 3. 开始游戏

1. 在浏览器中打开 4 个标签页
2. 每个标签访问：http://localhost:6000
3. 输入不同的玩家名字加入游戏
4. 4人到齐后自动开始

## Linux/Mac 用户

### 1. 安装依赖

```bash
# 后端
cd web/backend
pip3 install -r requirements.txt

# 前端
cd web/frontend
npm install
```

### 2. 启动服务

```bash
# 启动后端（终端1）
cd web/backend
chmod +x run.sh
./run.sh

# 启动前端（终端2）
cd web/frontend
npm run dev
```

## 测试连接

### 检查后端
访问：http://localhost:6005
应该看到 API 信息

### 检查前端
访问：http://localhost:6000
应该看到游戏登录界面

## 常见问题

### 端口被占用
如果端口6000或6005被占用：

**方式一：修改端口**
- 后端：修改 `web/backend/main.py` 最后一行的端口号
- 前端：修改 `web/frontend/vite.config.js` 中的 `server.port`

**方式二：关闭占用进程**
Windows:
```cmd
netstat -ano | findstr :6000
taskkill /PID <进程ID> /F
```

Linux/Mac:
```bash
lsof -ti:6000 | xargs kill -9
```

### Python模块未找到
```bash
pip install -r web/backend/requirements.txt --upgrade
```

### npm 安装失败
```bash
cd web/frontend
rm -rf node_modules package-lock.json
npm install
```

### WebSocket连接失败
1. 确保后端已启动且运行在 6005 端口
2. 检查防火墙设置
3. 尝试关闭代理/VPN

## 享受游戏！

需要更多帮助？查看 `web/README.md` 了解详细文档。
