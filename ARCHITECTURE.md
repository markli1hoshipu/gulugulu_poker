# 项目架构设计文档

## 概述

本项目是一个升级扑克游戏（也称"拖拉机"、"双升"）的实现，采用模块化设计，便于后续扩展和维护。

## 设计原则

1. **模块化**: 将系统分为核心数据、游戏引擎、控制器和UI四大模块
2. **可扩展性**: 使用接口和回调机制，便于添加新功能
3. **分离关注点**: 游戏逻辑与UI分离，便于替换UI层
4. **可测试性**: 各模块独立，易于单元测试

## 架构层次

```
┌─────────────────────────────────────────┐
│           UI Layer (UI层)               │
│   ┌──────────────┐   ┌──────────────┐   │
│   │ ConsoleUI    │   │  WebUI (未来)│   │
│   └──────────────┘   └──────────────┘   │
└─────────────┬───────────────────────────┘
              │ 事件回调 & 命令调用
┌─────────────▼───────────────────────────┐
│      Controller Layer (控制层)          │
│   ┌──────────────────────────────┐      │
│   │    GameController            │      │
│   │  - 游戏流程控制              │      │
│   │  - 事件分发                  │      │
│   └──────────────────────────────┘      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│      Engine Layer (引擎层)              │
│   ┌──────────┐  ┌──────────┐  ┌──────┐ │
│   │RuleEngine│  │CardMgr   │  │Score │ │
│   │规则引擎  │  │发牌管理  │  │计算  │ │
│   └──────────┘  └──────────┘  └──────┘ │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│       Core Layer (核心数据层)           │
│   ┌────┐  ┌──────┐  ┌────┐  ┌────────┐ │
│   │Card│  │Player│  │Deck│  │GameState│ │
│   └────┘  └──────┘  └────┘  └────────┘ │
└─────────────────────────────────────────┘
```

## 模块详解

### 1. Core Layer (核心数据层)

**路径**: `src/core/`

核心数据结构，定义游戏的基本元素。

#### Card (牌)
- **职责**: 表示单张扑克牌
- **关键属性**: 花色(suit)、点数(rank)
- **关键方法**:
  - `is_trump()`: 判断是否为主牌
  - `get_power()`: 获取牌力（用于比较大小）

#### Player (玩家)
- **职责**: 表示一个游戏玩家
- **关键属性**: 玩家ID、名称、手牌、队伍、得分
- **关键方法**:
  - `add_cards()`: 添加手牌
  - `remove_cards()`: 移除手牌
  - `sort_hand()`: 整理手牌

#### Deck (牌堆)
- **职责**: 管理一副或多副扑克牌
- **关键属性**: 牌列表
- **关键方法**:
  - `reset()`: 重置牌堆
  - `shuffle()`: 洗牌
  - `draw()`: 抽牌

#### GameState (游戏状态)
- **职责**: 维护整个游戏的状态
- **关键属性**:
  - 游戏阶段、玩家列表
  - 主牌信息（主花色、级别）
  - 当前轮次、出牌历史
  - 得分情况
- **关键方法**:
  - `add_to_trick()`: 添加出牌
  - `clear_trick()`: 清空当前轮
  - `reset_round()`: 重置本局

### 2. Engine Layer (引擎层)

**路径**: `src/engine/`

游戏逻辑和规则引擎。

#### RuleEngine (规则引擎)
- **职责**: 验证游戏规则、判断胜负
- **关键方法**:
  - `validate_play()`: 验证出牌是否合法
  - `determine_trick_winner()`: 判断本轮赢家
  - `can_declare_trump()`: 判断是否可以亮主

#### CardManager (发牌管理器)
- **职责**: 管理发牌流程
- **关键方法**:
  - `deal_cards()`: 一次性发牌
  - `deal_cards_incrementally()`: 分批发牌（用于亮主阶段）

#### ScoreCalculator (得分计算器)
- **职责**: 计算分数和升级
- **关键方法**:
  - `get_card_points()`: 获取单张牌分值
  - `calculate_trick_points()`: 计算一轮总分
  - `calculate_level_change()`: 根据分数计算升级数
  - `advance_level()`: 升级

### 3. Controller Layer (控制层)

**路径**: `src/controller/`

#### GameController (游戏控制器)
- **职责**: 协调各模块，管理游戏流程
- **关键属性**:
  - `game_state`: 游戏状态
  - `card_manager`: 发牌管理器
  - `rule_engine`: 规则引擎
  - 事件回调函数
- **关键方法**:
  - `initialize_game()`: 初始化游戏
  - `start_round()`: 开始新一局
  - `play_cards()`: 玩家出牌
  - 事件通知方法

### 4. UI Layer (UI层)

**路径**: `src/ui/`

#### ConsoleUI (控制台界面)
- **职责**: 提供命令行交互界面
- **关键方法**:
  - `display_game_state()`: 显示游戏状态
  - `display_all_hands()`: 显示所有玩家手牌
  - `get_player_input()`: 获取玩家输入
  - `run_game_loop()`: 运行游戏主循环
  - 事件回调处理

## 数据流

### 游戏初始化流程
```
UI -> Controller.initialize_game()
  -> GameState.add_player() (×4)
  -> 事件: on_state_change
```

### 开始一局流程
```
UI -> Controller.start_round()
  -> GameState.reset_round()
  -> CardManager.deal_cards()
  -> GameState.set_phase(PLAYING)
  -> 事件: on_cards_dealt, on_state_change
```

### 出牌流程
```
UI -> Controller.play_cards()
  -> RuleEngine.validate_play()
  -> Player.remove_cards()
  -> GameState.add_to_trick()
  -> [如果一轮结束]
     -> RuleEngine.determine_trick_winner()
     -> ScoreCalculator.calculate_trick_points()
     -> GameState.clear_trick()
     -> 事件: on_trick_complete
  -> [如果游戏结束]
     -> ScoreCalculator.calculate_level_change()
     -> 事件: on_round_end
  -> 事件: on_state_change
```

## 扩展点

### 1. 添加新的UI
实现新的UI类，注册事件回调即可：
```python
class WebUI:
    def __init__(self, controller):
        self.controller = controller
        controller.on_state_change = self.on_state_change
        # 注册其他回调...
```

### 2. 添加AI玩家
创建AI类，实现选牌逻辑：
```python
class AIPlayer:
    def select_cards(self, game_state):
        # AI选牌逻辑
        pass
```

### 3. 网络多人游戏
- 在Controller和UI之间添加网络层
- Controller运行在服务器端
- UI通过网络协议与服务器通信

### 4. 集成强化学习
- 实现RLCard兼容接口
- 添加环境包装器：
  - `step()`
  - `reset()`
  - `get_state()`
  - `get_legal_actions()`

## 未来改进方向

1. **完善亮主逻辑**: 当前简化为固定主牌，需要实现完整的亮主/反主机制
2. **完善出牌规则**:
   - 拖拉机检测
   - 甩牌规则
   - 更精确的跟牌验证
3. **底牌处理**: 实现埋底和扣底逻辑
4. **进贡规则**: 实现上游给下游进贡的机制
5. **多轮次游戏**: 支持多局游戏，记录总成绩
6. **回放系统**: 保存和回放游戏过程
7. **性能优化**: 对于AI训练场景的性能优化

## 代码规范

- 使用类型注解（Type Hints）
- 每个类和方法都有文档字符串
- 遵循PEP 8编码规范
- 使用有意义的变量名和函数名

## 测试策略

1. **单元测试**: 测试每个核心类的功能
2. **集成测试**: 测试模块间的协作
3. **端到端测试**: 测试完整游戏流程
