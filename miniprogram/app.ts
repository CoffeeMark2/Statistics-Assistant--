// app.ts
import { formatNumber } from './utils/util';

App<IAppOption>({
  globalData: {
    records: [],
    settings: {
      filenamePattern: '(\\d+)月(\\d+)日财报\\.xlsx',
      rowIndex: '2',
      columnIndex: '3'
    }
  },

  onLaunch() {
    // 加载设置和记录
    this.loadSettings();
    this.loadRecords();
  },

  // 加载设置
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

  // 加载记录
  loadRecords() {
    try {
      const records = wx.getStorageSync('records') || [];
      this.globalData.records = records;
    } catch (e) {
      console.error('加载记录失败:', e);
    }
  },

  // 保存记录
  saveRecords(records: any[]) {
    try {
      this.globalData.records = records;
      wx.setStorageSync('records', records);
      return true;
    } catch (e) {
      console.error('保存记录失败:', e);
      return false;
    }
  },

  // 添加记录
  addRecord(record: any) {
    try {
      const records = [record, ...this.globalData.records];
      return this.saveRecords(records);
    } catch (e) {
      console.error('添加记录失败:', e);
      return false;
    }
  },

  // 删除记录
  deleteRecord(id: string) {
    try {
      const records = this.globalData.records.filter((r: any) => r.id !== id);
      return this.saveRecords(records);
    } catch (e) {
      console.error('删除记录失败:', e);
      return false;
    }
  },

  // 计算总金额
  calculateTotalAmount(this: IAppOption,records: RecordItem[] = this.globalData.records) {
    const total = records.reduce((sum, record) => sum + record.amount, 0);
    return formatNumber(total);
  },

  // 按时间范围筛选记录
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