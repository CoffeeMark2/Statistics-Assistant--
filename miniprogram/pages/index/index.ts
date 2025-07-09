// index.ts
import { formatNumber } from '../../utils/util';
import { getRecords, saveRecords } from '../../utils/storage';

// 假设 RecordItem 定义在全局类型文件中
// 如果没有，需要在这里或者typings中定义
// interface RecordItem { ... }

// 获取应用实例
const app = getApp<IAppOption>();

Page({
    data: {
        activeTab: 'month', // 默认显示月
        totalAmount: '0.00',
        showActionMenu: false,
        allRecords: [] as RecordItem[], // 新增：存储所有记录
        records: [] as RecordItem[],    // 存储筛选后用于显示的记录
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

    loadRecords() {
        const allRecords = getRecords();
        this.setData({
            allRecords,
        });
        // 加载后，立即按当前激活的Tab进行筛选
        this.filterRecordsByTimeRange(this.data.activeTab);
    },

    // 计算总金额
    calculateTotalAmount(recordsToCalculate: any[]) {
        const total = recordsToCalculate.reduce((sum, record) => sum + record.amount, 0);
        this.setData({
            totalAmount: formatNumber(total),
        });
    },

    // Tab切换
    onTabChange(e: any) {
        const { value } = e.detail;
        this.setData({
            activeTab: value,
        });
        this.filterRecordsByTimeRange(value);
    },

    // 根据时间范围筛选记录
    filterRecordsByTimeRange(range: string) {
        const now = new Date();
        const { allRecords } = this.data;
        let filteredRecords = [];

        switch (range) {
            case 'week': {
                now.setHours(0, 0, 0, 0);
                const day = now.getDay() === 0 ? 7 : now.getDay(); // 将周日(0)映射为7
                const startOfWeek = new Date(now.getTime() - (day - 1) * 24 * 60 * 60 * 1000);
                filteredRecords = allRecords.filter((r: any) => r.timestamp >= startOfWeek.getTime());
                break;
            }
            case 'month': {
                const year = now.getFullYear();
                const month = now.getMonth();
                const startOfMonth = new Date(year, month, 1).getTime();
                filteredRecords = allRecords.filter((r: any) => r.timestamp >= startOfMonth);
                break;
            }
            case 'quarter': {
                const year = now.getFullYear();
                const quarter = Math.floor(now.getMonth() / 3);
                const startOfQuarter = new Date(year, quarter * 3, 1).getTime();
                filteredRecords = allRecords.filter((r: any) => r.timestamp >= startOfQuarter);
                break;
            }
            case 'year': {
                const year = now.getFullYear();
                const startOfYear = new Date(year, 0, 1).getTime();
                filteredRecords = allRecords.filter((r: any) => r.timestamp >= startOfYear);
                break;
            }
            case 'all':
            default:
                filteredRecords = [...allRecords];
                break;
        }

        this.setData({
            records: filteredRecords,
        });
        // 基于筛选后的记录重新计算总金额
        this.calculateTotalAmount(filteredRecords);
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
                    // 重要：同时从 allRecords 和当前显示的 records 中删除
                    const newAllRecords = this.data.allRecords.filter((item: any) => item.id !== id);

                    saveRecords(newAllRecords); // 保存全量数据

                    // 重新加载和筛选，以确保数据一致性
                    this.loadRecords();

                    wx.showToast({ title: '删除成功', icon: 'success' });
                }
            }
        });
    }
});
