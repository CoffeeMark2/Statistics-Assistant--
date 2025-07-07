// index.ts
import { formatNumber } from '../../utils/util';
import { getRecords, saveRecords } from '../../utils/storage';

// 获取应用实例
const app = getApp<IAppOption>();

Page({
    data: {
        activeTab: 'month',
        totalAmount: '0.00',
        showActionMenu: false,
        records: [] as RecordItem[],
        swipeActions: [
            {
                text: '删除',
                className: 'btn delete-btn'
            }
        ]
    },

    onShow() {
        this.loadRecords();
    },

    onLoad() {
        // This logic is now handled by onShow to ensure data is fresh
    },

    loadRecords() {
        const records = getRecords();
        this.setData({
            records,
        });
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
                    const deletedRecord = this.data.records.find((item: any) => item.id === id);
                    let newRecords = this.data.records.filter((item: any) => item.id !== id);

                    // 更新文件
                    saveRecords(newRecords);

                    this.setData({
                        records: newRecords
                    });
                    this.calculateTotalAmount();
                    console.log("delete success: ",deletedRecord)
                    wx.showToast({ title: '删除成功', icon: 'success' });
                }
            }
        });
    }
});
