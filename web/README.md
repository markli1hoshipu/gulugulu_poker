# Gulugulu Poker - Web版本

基于React + FastAPI的实时多人扑克游戏（升级/拖拉机）

## 技术栈

### 前端
- React 18
- Vite
- TailwindCSS
- Socket.IO Client
- Lucide React (图标)
- React Hot Toast (通知)

### 后端
- FastAPI
- Python Socket.IO
- Uvicorn (ASGI服务器)

## 快速开始

### 1. 安装依赖

#### 后端
```bash
cd web/backend
pip install -r requirements.txt
```

#### 前端
```bash
cd web/frontend
npm install
```

### 2. 启动服务

#### 启动后端 (端口 6005)
```bash
cd web/backend
python main.py
```

后端将在 `http://localhost:6005` 启动
- API文档: http://localhost:6005/docs
- WebSocket: ws://localhost:6005

#### 启动前端 (端口 6000)
```bash
cd web/frontend
npm run dev
```

前端将在 `http://localhost:6000` 启动

### 3. 开始游戏

1. 在浏览器中打开 4 个标签页，访问 http://localhost:6000
2. 每个标签页输入不同的玩家名字并加入游戏
3. 当 4 名玩家全部加入后，游戏自动开始
4. 跟随提示进行游戏

## 游戏规则

### 基本规则
- 4人游戏，两两组队（玩家0&2 vs 玩家1&3）
- 使用2副扑克牌（108张）
- 目标：通过出牌赢取分数牌（5、10、K）

### 出牌规则
- 轮到你时，选择要出的牌，点击"出牌"按钮
- 必须跟随领牌玩家的花色
- 如果没有相同花色，可以出其他牌
- 主牌大于副牌
- 赢得本轮的玩家成为下一轮的领牌者

### 得分
- 5: 5分
- 10: 10分
- K: 10分
- 其他牌: 0分

## 项目结构

```
web/
├── backend/                # 后端代码
│   ├── main.py            # FastAPI主应用 + Socket.IO
│   ├── game_manager.py    # 游戏管理器
│   └── requirements.txt   # Python依赖
│
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── components/    # React组件
│   │   │   ├── JoinGame.jsx      # 加入游戏页面
│   │   │   ├── WaitingRoom.jsx   # 等待室
│   │   │   ├── GameRoom.jsx      # 游戏主界面
│   │   │   ├── PlayerArea.jsx    # 玩家区域
│   │   │   ├── GameBoard.jsx     # 游戏板（当前轮出牌）
│   │   │   ├── ScoreBoard.jsx    # 计分板
│   │   │   └── Card.jsx          # 卡牌组件
│   │   ├── hooks/
│   │   │   └── useSocket.js      # Socket.IO Hook
│   │   ├── App.jsx        # 主应用
│   │   ├── main.jsx       # 入口
│   │   └── index.css      # 全局样式
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md              # 本文件
```

## API端点

### HTTP端点
- `GET /` - 根路径，API信息
- `GET /health` - 健康检查
- `GET /api/game/status` - 获取游戏状态

### WebSocket事件

#### 客户端 -> 服务器
- `join_game` - 加入游戏
  ```json
  { "name": "玩家名称" }
  ```
- `play_cards` - 出牌
  ```json
  { "card_indices": [0, 1, 2] }
  ```
- `request_game_state` - 请求游戏状态
- `restart_game` - 重启游戏

#### 服务器 -> 客户端
- `connection_established` - 连接成功
- `join_success` - 加入成功
- `join_error` - 加入失败
- `game_state` - 游戏状态更新
- `play_error` - 出牌错误
- `round_complete` - 一轮结束
- `game_complete` - 游戏结束

## 开发

### 添加新功能
1. 后端：在 `game_manager.py` 中添加游戏逻辑
2. 前端：在 `src/components/` 中创建新组件
3. Socket事件：在 `main.py` 中添加新的事件处理

### 调试
- 后端日志：查看终端输出
- 前端日志：打开浏览器开发者工具 Console
- WebSocket通信：在Network标签查看WS连接

## 待优化功能

- [ ] 实现完整的亮主机制
- [ ] 添加拖拉机检测
- [ ] 实现底牌和埋底逻辑
- [ ] 添加音效
- [ ] 添加动画效果
- [ ] 移动端适配
- [ ] 房间系统（支持多个游戏房间）
- [ ] 游戏回放
- [ ] 聊天功能

## 许可证

MIT License
