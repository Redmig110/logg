const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_FILE = path.join(__dirname, 'habit-data.json');

function cleanup() {
  if (fs.existsSync(DATA_FILE)) {
    fs.unlinkSync(DATA_FILE);
  }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function run(cmd) {
  try {
    const output = execSync(`node index.js ${cmd}`, { encoding: 'utf8', cwd: __dirname });
    return stripAnsi(output);
  } catch (e) {
    return stripAnsi(e.stdout + e.stderr);
  }
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`测试失败: ${message}`);
  }
  console.log(`✓ ${message}`);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getTime();
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      cleanup();
      fn();
      passed++;
    } catch (e) {
      failed++;
      console.log(`✗ ${name}`);
      console.log(`  错误: ${e.message}`);
    }
  }

  console.log('=== 开始功能测试 ===\n');

  test('1. 初始状态 - 无数据时 status 显示正确', () => {
    const output = run('status');
    assert(output.includes('未打卡'), '显示今日未打卡');
    assert(output.includes('连续打卡'), '包含连续打卡字段');
    assert(/连续打卡\s+0 天/.test(output), '连续打卡为 0');
    assert(/累计打卡\s+0 天/.test(output), '累计打卡为 0');
    assert(output.includes('暂无记录'), '显示暂无记录');
  });

  test('2. 初始状态 - help 命令显示帮助信息', () => {
    const output = run('help');
    assert(output.includes('habit done'), '显示 done 命令');
    assert(output.includes('habit status'), '显示 status 命令');
    assert(output.includes('habit help'), '显示 help 命令');
    assert(output.includes('习惯打卡器'), '显示标题');
  });

  test('3. 初始状态 - 无参数时显示帮助信息', () => {
    const output = run('');
    assert(output.includes('习惯打卡器'), '显示标题');
    assert(output.includes('habit done'), '显示命令列表');
  });

  test('4. 打卡功能 - 首次打卡成功', () => {
    const output = run('done');
    assert(output.includes('打卡成功'), '显示打卡成功');
    assert(/连续打卡\s+1 天/.test(output), '连续打卡为 1');
    assert(/累计打卡\s+1 天/.test(output), '累计打卡为 1');
    assert(output.includes('打卡时间'), '显示打卡时间');

    const data = readData();
    assert(data.records.length === 1, '记录数组有 1 条记录');
    assert(data.streak === 1, 'streak 为 1');
    assert(data.lastCheckIn !== null, 'lastCheckIn 已设置');
  });

  test('5. 打卡功能 - 同一天重复打卡提示已打卡', () => {
    run('done');
    const output = run('done');
    assert(output.includes('今天已经打卡过了'), '提示已打卡');
    assert(/连续打卡\s+1 天/.test(output), '连续打卡仍为 1');

    const data = readData();
    assert(data.records.length === 1, '记录仍为 1 条');
  });

  test('6. 状态查询 - 打卡后 status 显示正确', () => {
    run('done');
    const output = run('status');
    assert(output.includes('已完成'), '显示今日已打卡');
    assert(/连续打卡\s+1 天/.test(output), '连续打卡为 1');
    assert(/累计打卡\s+1 天/.test(output), '累计打卡为 1');
    assert(output.includes('上次打卡'), '显示上次打卡时间');
    assert(output.includes('距离下一里程碑'), '显示里程碑进度');
    assert(output.includes('█'), '显示进度条');
  });

  test('7. 断签判断 - 昨天打卡，今天打卡，连续天数递增', () => {
    const yesterday = daysAgo(1);
    writeData({
      records: [yesterday],
      streak: 1,
      lastCheckIn: yesterday
    });

    const output = run('done');
    assert(/连续打卡\s+2 天/.test(output), '连续打卡递增到 2');
    assert(/累计打卡\s+2 天/.test(output), '累计打卡为 2');

    const data = readData();
    assert(data.streak === 2, 'streak 为 2');
  });

  test('8. 断签判断 - 前天打卡，昨天未打卡，今天打卡，连续天数重置为 1', () => {
    const twoDaysAgo = daysAgo(2);
    writeData({
      records: [twoDaysAgo],
      streak: 1,
      lastCheckIn: twoDaysAgo
    });

    const output = run('done');
    assert(/连续打卡\s+1 天/.test(output), '断签后连续打卡重置为 1');
    assert(/累计打卡\s+2 天/.test(output), '累计打卡仍递增');

    const data = readData();
    assert(data.streak === 1, 'streak 重置为 1');
  });

  test('9. 断签判断 - 3 天前打卡，今天查询 status 时自动断签', () => {
    const threeDaysAgo = daysAgo(3);
    writeData({
      records: [threeDaysAgo],
      streak: 5,
      lastCheckIn: threeDaysAgo
    });

    const output = run('status');
    assert(/连续打卡\s+0 天/.test(output), '断签后连续打卡为 0');
    assert(output.includes('检测到断签'), '显示断签提示');

    const data = readData();
    assert(data.streak === 0, 'streak 已重置为 0');
  });

  test('10. 连续打卡 - 模拟 5 天连续打卡', () => {
    const records = [];
    for (let i = 4; i >= 1; i--) {
      records.push(daysAgo(i));
    }
    writeData({
      records: records,
      streak: 4,
      lastCheckIn: daysAgo(1)
    });

    const output = run('done');
    assert(/连续打卡\s+5 天/.test(output), '连续打卡 5 天');
    assert(/累计打卡\s+5 天/.test(output), '累计打卡 5 天');
  });

  test('11. 里程碑 - 达成 7 天里程碑显示祝贺', () => {
    const records = [];
    for (let i = 6; i >= 1; i--) {
      records.push(daysAgo(i));
    }
    writeData({
      records: records,
      streak: 6,
      lastCheckIn: daysAgo(1)
    });

    const output = run('done');
    assert(/连续打卡\s+7 天/.test(output), '连续打卡 7 天');
    assert(output.includes('恭喜达成'), '显示里程碑祝贺');
    assert(output.includes('7 天里程碑'), '显示 7 天里程碑');
  });

  test('12. 数据持久化 - 多次打卡后数据正确保存', () => {
    run('done');
    const data1 = readData();
    assert(data1.records.length === 1, '第一次打卡后 1 条记录');

    const twoDaysAgo = daysAgo(2);
    writeData({
      records: [twoDaysAgo],
      streak: 1,
      lastCheckIn: twoDaysAgo
    });

    run('done');
    const data2 = readData();
    assert(data2.records.length === 2, '第二次打卡后 2 条记录');
    assert(data2.streak === 1, '断签后 streak 为 1');
  });

  test('13. 未知命令 - 显示错误信息', () => {
    const output = run('unknown');
    assert(output.includes('未知命令'), '提示未知命令');
    assert(output.includes('习惯打卡器'), '显示帮助标题');
  });

  test('14. 进度条 - status 输出包含进度条元素', () => {
    const yesterday = daysAgo(1);
    writeData({
      records: [yesterday],
      streak: 1,
      lastCheckIn: yesterday
    });
    run('done');
    const output = run('status');
    assert(output.includes('█'), '包含进度条填充字符');
    assert(output.includes('░'), '包含进度条空字符');
    assert(output.includes('%'), '包含百分比');
  });

  console.log(`\n=== 测试完成 ===`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);

  cleanup();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
