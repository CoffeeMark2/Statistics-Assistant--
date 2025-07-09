// app.ts
import { formatNumber, formatTime } from './utils/util';
import { getRecords, saveRecords } from './utils/storage';

App<IAppOption>({
  globalData: {
    records: [],
    settings: {
      filenamePattern: '(\\d+)月(\\d+)日.*\\.xlsx?$',
      rowIndex: '26',
      columnIndex: '3'
    }
  },

  onLaunch() {
    // onLaunch 中不再主动加载所有记录，交由页面自行处理
    this.loadSettings();

    // 保留原有的logs处理逻辑
    const logs = wx.getStorageSync('logs') || []
    const logsWithFormat = logs.map((log: number) => {
      return {
        date: formatTime(new Date(log)),
        timeStamp: log
      }
    })
    wx.setStorageSync('logs', logsWithFormat)
  },

  // 加载设置 - 仍然从缓存读取
  loadSettings() {
    try {
      const settings = wx.getStorageSync('settings');
      if (settings) {
        this.globalData.settings = settings;
      }
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  },

  // 加载记录 - 改为从文件读取
  loadRecords() {
    try {
      const records = getRecords();
      this.globalData.records = records;
    } catch (e) {
      console.error('从文件加载记录失败:', e);
    }
  },

  // 保存记录 - 改为写入文件
  saveRecords(records: RecordItem[]): boolean {
    try {
      this.globalData.records = records;
      saveRecords(records); // 直接调用文件存储
      return true;
    } catch (e) {
      console.error('保存记录到文件失败:', e);
      return false;
    }
  },

  // 添加记录 - 逻辑不变，但依赖 saveRecords
  addRecord(record: RecordItem): boolean {
    try {
      const records = [record, ...this.globalData.records];
      return this.saveRecords(records);
    } catch (e) {
      console.error('添加记录失败:', e);
      return false;
    }
  },

  // 删除记录 - 逻辑不变，但依赖 saveRecords
  deleteRecord(id: string): boolean {
    try {
      const records = this.globalData.records.filter((r: any) => r.id !== id);
      return this.saveRecords(records);
    } catch (e) {
      console.error('删除记录失败:', e);
      return false;
    }
  },

  // 计算总金额 - 不变
  calculateTotalAmount(this: IAppOption, records: RecordItem[] = this.globalData.records) {
    const total = records.reduce((sum, record) => sum + record.amount, 0);
    return formatNumber(total);
  },

  // 按时间范围筛选记录 - 不变
  filterRecordsByTimeRange(range: string) {
    const now = new Date();
    const records = this.globalData.records;
    
    switch (range) {
      case 'month': {
        // 本月
        const year = now.getFullYear();
        const month = now.getMonth();
        const startOfMonth = new Date(year, month, 1).getTime();
        return records.filter((r: any) => r.timestamp >= startOfMonth);
      }
      case 'quarter': {
        // 本季度
        const year = now.getFullYear();
        const quarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(year, quarter * 3, 1).getTime();
        return records.filter((r: any) => r.timestamp >= startOfQuarter);
      }
      case 'year': {
        // 本年
        const year = now.getFullYear();
        const startOfYear = new Date(year, 0, 1).getTime();
        return records.filter((r: any) => r.timestamp >= startOfYear);
      }
      case 'all':
      default:
        // 全部
        return records;
    }
  }
});