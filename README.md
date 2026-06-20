# logg

极简命令行习惯打卡器 — 用 Git 一样的体验追踪你的每日习惯。

## 安装

```bash
npm install -g .
```

安装后，`habit` 命令即可全局使用。

## 使用方法

```bash
habit done      # 完成今日打卡
habit status    # 查看打卡状态与连续天数
habit help      # 显示帮助信息
```

### 示例

```bash
$ habit done
✓ 打卡成功！
当前连续打卡：7 天
累计打卡：30 天
打卡时间：2026/6/20 21:30:00

$ habit status
=== 打卡状态 ===
今日打卡：✓ 已完成
连续打卡：7 天
累计打卡：30 天
上次打卡：2026/6/20 21:30:00
```

### 断签检测

如果昨天没有打卡，今天再次打卡时连续天数自动重置为 1。执行 `status` 命令也会自动检测断签并修正数据。

## 数据存储

打卡数据保存在 `habit-data.json` 文件中（与脚本同目录），格式如下：

```json
{
  "records": [1718888400000, 1718974800000],
  "streak": 2,
  "lastCheckIn": 1718974800000
}
```

- `records` — 所有打卡时间戳
- `streak` — 当前连续打卡天数
- `lastCheckIn` — 最后一次打卡时间

## 运行测试

```bash
npm test
```

共 12 个测试用例，覆盖：首次打卡、重复打卡、连续打卡递增、断签重置、数据持久化、未知命令等场景。

## 项目结构

```
logg/
├── index.js       # 主程序入口
├── package.json   # 包配置
├── test.js        # 功能测试
├── .gitignore
└── README.md
```

## License

MIT
