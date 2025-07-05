import { formatNumber, extractDateFromFilename, parseAmount } from '../../utils/util';

// 引入解析Excel的库
// 注意：实际项目中需要安装并引入一个Excel解析库，如xlsx或者SheetJS
// 这里仅做模拟

// 定义记录类型
interface Record {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  amount: number;
  formattedAmount: string;
  source: string;
  filename?: string;
  cellPosition?: string;
  description?: string;
}

Page({
  data: {
    files: [] as any[],
    previewFiles: [] as any[],
    selectedCount: 0,
    totalAmount: '0.00',
    filenamePattern: '(\\d+)月(\\d+)日财报\\.xlsx',
    rowIndex: 2,
    columnIndex: 3
  },

  onLoad() {
    // 加载设置
    this.loadSettings();
  },

  // 加载设置
  loadSettings() {
    try {
      const settings = wx.getStorageSync('settings');
      if (settings) {
        this.setData({
          filenamePattern: settings.filenamePattern || this.data.filenamePattern,
          rowIndex: parseInt(settings.rowIndex) || this.data.rowIndex,
          columnIndex: parseInt(settings.columnIndex) || this.data.columnIndex
        });
      }
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  },

  // 选择文件
  onSelectFile() {
    wx.chooseMessageFile({
      count: 10,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        // 处理选择的文件
        this.processFiles(res.tempFiles);
      }
    });
  },

  // 处理文件
  processFiles(tempFiles: any[]) {
    const currentYear = new Date().getFullYear();
    const pattern = new RegExp(this.data.filenamePattern);
    const existingRecords = wx.getStorageSync('records') || [];
    const existingFilenames = existingRecords
      .filter((r: Record) => r.source === 'file')
      .map((r: Record) => r.filename);
    
    // 转换文件信息
    const files = tempFiles.map(file => {
      // 检查文件是否符合命名规则
      const isValid = pattern.test(file.name);
      // 检查文件是否已存在
      const isDuplicate = existingFilenames.includes(file.name);
      
      return {
        name: file.name,
        path: file.path,
        size: this.formatFileSize(file.size),
        type: this.getFileType(file.name),
        valid: isValid && !isDuplicate,
        selected: isValid && !isDuplicate,
        reason: !isValid ? '文件名不符合规则' : (isDuplicate ? '文件已存在' : '')
      };
    });

    this.setData({ files });
    
    // 预览有效文件
    this.previewValidFiles();
  },

  // 预览有效文件
  previewValidFiles() {
    const validFiles = this.data.files.filter(file => file.valid && file.selected);
    const currentYear = new Date().getFullYear();
    
    // 这里应该实际读取Excel文件内容
    // 由于微信小程序环境限制，这里仅做模拟
    const previewFiles = validFiles.map(file => {
      // 从文件名中提取日期
      const date = extractDateFromFilename(file.name, this.data.filenamePattern, currentYear);
      
      // 模拟从Excel中读取的金额
      const amount = Math.floor(Math.random() * 10000) + 1000; // 随机生成1000-11000之间的金额
      
      return {
        name: file.name,
        date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '',
        cellPosition: `${String.fromCharCode(64 + this.data.columnIndex)}${this.data.rowIndex}`,
        amount: amount,
        formattedAmount: formatNumber(amount)
      };
    });

    this.setData({ previewFiles });
    this.calculateTotal();
  },

  // 文件选中状态变更
  onFileCheckChange(e: any) {
    const index = e.currentTarget.dataset.index;
    const selected = e.detail.value;
    
    // 更新文件选中状态
    const files = [...this.data.files];
    files[index].selected = selected;
    
    this.setData({ files });
    
    // 重新预览有效文件
    this.previewValidFiles();
  },

  // 计算总金额和选中数量
  calculateTotal() {
    const selectedFiles = this.data.files.filter(file => file.valid && file.selected);
    const selectedCount = selectedFiles.length;
    
    // 计算总金额
    const totalAmount = this.data.previewFiles.reduce((sum, file) => sum + file.amount, 0);
    
    this.setData({
      selectedCount,
      totalAmount: formatNumber(totalAmount)
    });
  },

  // 格式化文件大小
  formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(0)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  },

  // 获取文件类型
  getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return 'Excel文件';
    }
    return '未知文件类型';
  },

  // 取消
  onCancel() {
    wx.navigateBack();
  },

  // 导入数据
  onImport() {
    if (this.data.selectedCount === 0) {
      wx.showToast({
        title: '请选择文件',
        icon: 'error'
      });
      return;
    }

    // 创建记录
    const records = this.data.previewFiles.map(file => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9), // 生成唯一ID
      title: file.name,
      date: file.date,
      timestamp: new Date(file.date).getTime(),
      amount: file.amount,
      formattedAmount: file.formattedAmount,
      source: 'file', // 标记为文件导入
      filename: file.name,
      cellPosition: file.cellPosition
    }));

    try {
      // 获取现有记录
      const existingRecords = wx.getStorageSync('records') || [];
      // 添加新记录
      const newRecords = [...records, ...existingRecords];
      // 保存回存储
      wx.setStorageSync('records', newRecords);
      
      wx.showToast({
        title: '导入成功',
        icon: 'success'
      });

      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      console.error('保存记录失败:', e);
      wx.showToast({
        title: '导入失败',
        icon: 'error'
      });
    }
  }
}); 