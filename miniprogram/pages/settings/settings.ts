// settings.ts
Page({
  data: {
    filenamePattern: '(\\d+)月(\\d+)日财报\\.xlsx',
    rowIndex: '2',
    columnIndex: '3',
    recordCount: 24
  },

  onLoad() {
    // 加载保存的设置
    this.loadSettings();
  },

  // 加载设置
  loadSettings() {
    try {
      const settings = wx.getStorageSync('settings');
      if (settings) {
        this.setData({
          filenamePattern: settings.filenamePattern || this.data.filenamePattern,
          rowIndex: settings.rowIndex || this.data.rowIndex,
          columnIndex: settings.columnIndex || this.data.columnIndex
        });
      }

      // 获取记录数量
      const records = wx.getStorageSync('records') || [];
      this.setData({
        recordCount: records.length
      });
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  },

  // 文件名匹配规则变更
  onPatternChange(e: any) {
    this.setData({
      filenamePattern: e.detail.value
    });
  },

  // 行号变更
  onRowChange(e: any) {
    this.setData({
      rowIndex: e.detail.value
    });
  },

  // 列号变更
  onColumnChange(e: any) {
    this.setData({
      columnIndex: e.detail.value
    });
  },

  // 清空所有数据
  onClearAllData() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有导入的记录吗？此操作不可恢复。',
      confirmColor: '#e34d59',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('records', []);
          this.setData({
            recordCount: 0
          });
          wx.showToast({
            title: '已清空所有数据',
            icon: 'success'
          });
        }
      }
    });
  },

  // 恢复默认设置
  onResetSettings() {
    wx.showModal({
      title: '恢复默认',
      content: '确定要恢复所有设置为默认值吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            filenamePattern: '(\\d+)月(\\d+)日财报\\.xlsx',
            rowIndex: '2',
            columnIndex: '3'
          });
          wx.showToast({
            title: '已恢复默认设置',
            icon: 'success'
          });
        }
      }
    });
  },

  // 保存设置
  onSaveSettings() {
    try {
      wx.setStorageSync('settings', {
        filenamePattern: this.data.filenamePattern,
        rowIndex: this.data.rowIndex,
        columnIndex: this.data.columnIndex
      });
      wx.showToast({
        title: '设置已保存',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      console.error('保存设置失败:', e);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  }
}); 