# Gulugulu Poker - 升级扑克游戏

一个基于Python的升级扑克游戏（也称"拖拉机"、"双升"）实现，采用模块化设计。

## 项目特点

- ✅ 模块化架构，易于扩展和维护
- ✅ 完整的游戏核心逻辑（发牌、出牌、得分、升级）
- ✅ **Web版本：React + FastAPI + WebSocket 实时多人对战**
- ✅ 命令行界面，支持4人本地游戏
- ✅ 手牌默认可见（便于测试和演示）
- ✅ 事件驱动设计，便于添加新UI层
- 🚧 未来可扩展：AI玩家、强化学习训练

## 项目结构

```
gulugulu-poker/
├── src/                    # 游戏核心引擎
│   ├── core/               # 核心数据结构
│   ├── engine/             # 游戏引擎
│   ├── controller/         # 游戏控制器
│   └── ui/                 # 控制台UI
│
├── web/                    # 🌐 Web版本（NEW!）
│   ├── backend/            # FastAPI + Socket.IO 后端
│   │   ├── main.py         # API服务器
│   │   └── game_manager.py # 游戏会话管理
│   ├── frontend/           # React前端
│   │   ├── src/
│   │   │   ├── components/ # React组件
│   │   │   └── hooks/      # 自定义Hooks
│   │   └── package.json
│   ├── README.md           # Web版详细文档
│   └── START_HERE.md       # 快速启动指南
│
├── tests/                  # 测试
├── main.py                 # 命令行版本入口
├── ARCHITECTURE.md         # 架构设计文档
└── README.md              # 本文件
```

## 快速开始

### 环境要求

- Python 3.8+
- 无需额外依赖（仅使用Python标准库）

### 安装和运行

1. 克隆项目
```bash
git clone <your-repo-url>
cd gulugulu-poker
```

2. 运行测试
```bash
python tests/test_basic.py
```

3. 启动游戏
```bash
python main.py
```

### 游戏玩法

1. 游戏会自动为4个玩家发牌
2. 每轮轮到你时，查看你的手牌（带索引显示）
3. 输入要出的牌的索引（多张牌用空格分隔）
   - 例如：`0 1 2` 表示出索引为0、1、2的三张牌
4. 游戏会自动判断出牌是否合法
5. 继续直到所有玩家出完牌

## 核心模块说明

### Core Layer (核心数据层)

- **Card**: 扑克牌类，包含花色、点数、判断主牌、计算牌力等方法
- **Player**: 玩家类，管理手牌、队伍、得分
- **Deck**: 牌堆类，支持洗牌、发牌
- **GameState**: 游戏状态类，维护游戏进度、得分、历史记录

### Engine Layer (引擎层)

- **RuleEngine**: 规则引擎，验证出牌合法性、判断胜负
- **CardManager**: 发牌管理器，处理发牌逻辑
- **ScoreCalculator**: 得分计算器，计算分数和升级

### Controller Layer (控制层)

- **GameController**: 游戏主控制器，协调各模块，管理游戏流程，提供事件回调机制

### UI Layer (界面层)

- **ConsoleUI**: 控制台界面，提供命令行交互

详细的架构设计请查看 [ARCHITECTURE.md](ARCHITECTURE.md)

## 扩展指南

### 添加新的UI

```python
from src.controller import GameController

class YourUI:
    def __init__(self, controller):
        self.controller = controller
        # 注册事件回调
        controller.on_state_change = self.on_state_change
        controller.on_cards_dealt = self.on_cards_dealt
        # ...
```

### 添加AI玩家

```python
class AIPlayer:
    def select_cards(self, game_state, player):
        # 实现AI选牌逻辑
        # 返回要出的牌列表
        pass
```

### 网络多人游戏

在Controller和UI之间添加网络层：
- 服务器端运行GameController
- 客户端通过WebSocket/REST API通信

## 后续开发计划

### 已完成 ✅

1. ✅ 核心数据结构设计
2. ✅ 游戏引擎实现
3. ✅ 游戏控制器
4. ✅ 控制台UI
5. ✅ 基础测试用例

### 待实现 🚧

1. **完善游戏规则**
   - 亮主/反主机制
   - 拖拉机检测
   - 甩牌规则
   - 底牌和扣底逻辑
   - 进贡规则

2. **AI玩家**
   - 随机AI（基线）
   - 规则AI（启发式）
   - 强化学习AI

3. **强化学习环境**
   - RLCard兼容接口
   - 训练环境包装
   - 自对弈训练

4. **多人联机**
   - 服务器-客户端架构
   - WebSocket通信
   - 断线重连

5. **图形界面**
   - Web前端（React/Vue）
   - 或PyQt桌面应用
   - 动画和音效

6. **其他功能**
   - 游戏回放
   - 日志系统
   - 性能优化

## 技术栈

- **语言**: Python 3.8+
- **架构**: 分层模块化设计
- **设计模式**: 观察者模式（事件回调）、策略模式（规则引擎）

## 开发路线图

下面是一个可执行的路线图：

### 第一阶段：定义规则 / 写游戏引擎模块 ✅
 - 在本地写一个命令行版（CLI）版本，支持四个本地玩家操作，走一局完整流程（发牌、出牌、得分、升级等）
 - 用面向对象设计：GameState、Player、Deck、RuleEngine 等类

### 第二阶段：加入 AI 接口 / 模拟模式 🚧
 - 在引擎之上，定义"玩家接口"抽象，比如 get_valid_actions(state) + apply_action(action) + get_observation_for(player) 等
 - 用最简单规则 AI（随机、贪心、规则 heuristics）跑模拟对战，测试引擎正确性

### 第三阶段：包装成 RL 环境 / 集成 RLCard 样式接口 🔜
 - 仿照 RLCard 的设计，把游戏建为一个 environment，符合它的 step()、reset()、get_state()、get_legal_actions()、is_over()、get_reward() 等接口
 - 这样可以用 RLCard 的 pipeline 或别的 RL 算法来训练

### 第四阶段：构建多人联机服务器 + 客户端通信层 🔜
 - 写一个服务器 (Python) 维护游戏状态，接收客户端动作请求，广播状态变化
 - 客户端可以是一个简易 UI 接口（测试阶段甚至只是用文本 / 命令行交互也可以）连接服务器交互
 - 实现断线重连、同步校验、合法性检查等

### 第五阶段：做 GUI / 前端客户端 🔜
 - 选定一个 UI 框架（Python 的 PyQt / Arcade / Pygame，或 Web 前端）
 - 客户端显示手牌、界面按钮、操作提示、动画等
 - 客户端和服务器通过网络接口通信（WebSocket、REST + WebSocket 混合等）

### 第六阶段：AI 客户端接入 + 自对弈训练 🔜
 - 让 AI agent 作为一个客户端连接服务器，就像一个玩家一样行动
 - 用自对弈 (self-play) 或对抗方式训练 AI
 - 在训练阶段，可以绕过 UI，把 AI 直接对战在逻辑层运行，以加速训练

### 第七阶段：优化 / 提升 / 可视化 🔜
 - 加入日志、回放功能
 - 优化并行训练、高效样本生成
 - 在 UI 层加入动画、音效、提示、交互优化

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License
