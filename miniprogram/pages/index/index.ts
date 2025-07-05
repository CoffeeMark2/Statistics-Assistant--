// index.ts
import { formatNumber } from '../../utils/util';

// 获取应用实例
const app = getApp<IAppOption>();

Page({
  data: {
    activeTab: 'month',
    totalAmount: '1,234,567.89',
    showActionMenu: false,
    records: [
      {
        id: '1',
        title: '8月5日财报',
        date: '2023-08-05',
        amount: 12500,
        formattedAmount: '12,500.00'
      },
      {
        id: '2',
        title: '7月30日财报',
        date: '2023-07-30',
        amount: 8750,
        formattedAmount: '8,750.00'
      },
      {
        id: '3',
        title: '季度调整',
        date: '2023-07-15',
        amount: -3200,
        formattedAmount: '3,200.00'
      },
      {
        id: '4',
        title: '7月10日财报',
        date: '2023-07-10',
        amount: 9300,
        formattedAmount: '9,300.00'
      },
      {
        id: '5',
        title: '7月1日财报',
        date: '2023-07-01',
        amount: 11200,
        formattedAmount: '11,200.00'
      }
    ],
    swipeActions: [
      {
        name: '删除',
        theme: 'danger',
        width: 80
      }
    ]
  },

  onLoad() {
    this.calculateTotalAmount();
  },

  // 计算总金额
  calculateTotalAmount() {
    const total = this.data.records.reduce((sum, record) => sum + record.amount, 0);
    this.setData({
      totalAmount: formatNumber(total)
    });
  },

  // Tab切换
  onTabChange(e: any) {
    const { value } = e.detail;
    this.setData({
      activeTab: value
    });

    // 根据选中的Tab筛选数据
    this.filterRecordsByTimeRange(value);
  },

  // 根据时间范围筛选记录
  filterRecordsByTimeRange(range: string) {
    // 实际应用中，这里应该从存储中获取所有记录，然后根据时间范围进行筛选
    // 这里仅做演示
    console.log(`筛选${range}范围的记录`);
  },

  // 点击浮动按钮
  onFabClick() {
    this.setData({
      showActionMenu: true
    });
  },

  // 关闭操作菜单
  onActionMenuClose() {
    this.setData({
      showActionMenu: false
    });
  },

  // 点击导入文件
  onImportFileClick() {
    this.setData({
      showActionMenu: false
    });
    wx.navigateTo({
      url: '/pages/file-select/file-select'
    });
  },

  // 点击手动添加
  onAddRecordClick() {
    this.setData({
      showActionMenu: false
    });
    wx.navigateTo({
      url: '/pages/add-record/add-record'
    });
  },

  // 点击设置
  onSettingsClick() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 滑动删除
  onSwipeDelete(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 删除记录
          const newRecords = this.data.records.filter(item => item.id !== id);
          this.setData({
            records: newRecords
          });
          this.calculateTotalAmount();
        }
      }
    });
  }
});
