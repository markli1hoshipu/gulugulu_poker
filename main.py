"""
游戏主入口
"""
import sys
import os

# 添加src目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.controller import GameController
from src.ui import ConsoleUI


def main():
    """主函数"""
    # 创建游戏控制器
    controller = GameController()

    # 创建UI
    ui = ConsoleUI(controller)

    # 运行游戏
    ui.run_game_loop()


if __name__ == "__main__":
    main()
