import { getRecords, saveRecords } from '../../utils/storage';

const defaultSettings = {
    filenamePattern: '(\\d+)月(\\d+)日.*\\.xlsx?$',
    rowIndex: 26,
    columnIndex: 2,
};

const fs = wx.getFileSystemManager();

Page({
    data: {
        filenamePattern: '',
        rowIndex: '',
        columnIndex: '',
        recordCount: 0,
        dialogVisible: false,
    },

    onShow() {
        this.updateRecordCount();
    },

    onLoad() {
        this.loadSettings();
    },

    updateRecordCount() {
        try {
            const records = getRecords();
            this.setData({
                recordCount: records.length,
            });
        } catch (e) {
            console.error('加载记录数量失败:', e);
            this.setData({
                recordCount: 0,
            });
        }
    },

    loadSettings() {
        try {
            const settings = wx.getStorageSync('settings') || defaultSettings;
            this.setData({
                filenamePattern: settings.filenamePattern,
                rowIndex: settings.rowIndex.toString(),
                columnIndex: settings.columnIndex.toString(),
            });
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    },

    saveSettings() {
        const newSettings = {
            filenamePattern: this.data.filenamePattern || defaultSettings.filenamePattern,
            rowIndex: parseInt(this.data.rowIndex) || defaultSettings.rowIndex,
            columnIndex: parseInt(this.data.columnIndex) || defaultSettings.columnIndex,
        };

        try {
            wx.setStorageSync('settings', newSettings);
            return true;
        } catch (e) {
            console.error('保存设置失败:', e);
            return false;
        }
    },

    onExportData() {
        wx.showLoading({ title: '正在导出...' });
        try {
            const records = getRecords();
            if (records.length === 0) {
                wx.hideLoading();
                wx.showToast({ title: '没有记录可导出', icon: 'none' });
                return;
            }

            const jsonContent = JSON.stringify(records, null, 2);
            const backupFilePath = `${wx.env.USER_DATA_PATH}/records_backup.json`;
            const fs = wx.getFileSystemManager();

            fs.writeFileSync(backupFilePath, jsonContent, 'utf8');
            wx.hideLoading();

            wx.shareFileMessage({
                filePath: backupFilePath,
                success: () => {
                    wx.showToast({ title: '请选择聊天保存文件', icon: 'none', duration: 2000 });
                },
                fail: (err: any) => {
                    if (err.errMsg && err.errMsg.includes('cancel')) {
                        wx.showToast({ title: '已取消分享', icon: 'none' });
                    } else {
                        wx.showToast({ title: '分享失败，请重试', icon: 'error' });
                        console.error('导出分享失败:', err);
                    }
                },
            });

        } catch (e) {
            wx.hideLoading();
            wx.showToast({ title: '导出失败', icon: 'error' });
            console.error('导出过程出错:', e);
        }
    },

    onImportData() {
        wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['json'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].path;

                wx.showModal({
                    title: '确认导入',
                    content: '导入将合并数据：ID相同的记录将被更新，新的记录将被添加。确定要继续吗？',
                    confirmText: '确认导入',
                    confirmColor: '#0052d9', 
                    success: (modalRes) => {
                        if (modalRes.confirm) {
                            this.importRecordsFromFile(tempFilePath);
                        }
                    },
                });
            },
        });
    },

    importRecordsFromFile(filePath: string) {
        wx.showLoading({ title: '正在导入...' });

        const fs = wx.getFileSystemManager();

        try {
            // 读取文件内容
            const content = fs.readFileSync(filePath, 'utf8');

            // ---增加类型守卫 ---
            if (typeof content === 'string') {
                // 在这个 if 代码块内部，TypeScript 知道 content 一定是 string 类型
                const importedRecords = JSON.parse(content);

                // 基础格式校验
                if (Array.isArray(importedRecords) && (importedRecords.length === 0 || (importedRecords[0].id && importedRecords[0].amount !== undefined))) {
                    
                    // --- 合并逻辑 ---
                    const existingRecords = getRecords();
                    const mergedMap = new Map();

                    for (const record of existingRecords) {
                        if (record.id) {
                            mergedMap.set(record.id, record);
                        }
                    }

                    for (const record of importedRecords) {
                        if (record.id) {
                            mergedMap.set(record.id, record);
                        }
                    }

                    const finalRecords = Array.from(mergedMap.values());
                    saveRecords(finalRecords);
                    // --- 合并逻辑结束 ---
                    
                    this.updateRecordCount(); // 假设这是一个更新总数显示的方法
                    wx.hideLoading();
                    wx.showToast({ title: '合并导入成功', icon: 'success' });

                    setTimeout(() => wx.navigateBack(), 1500);

                } else {
                    // 如果 JSON 解析出来的数据格式不对
                    throw new Error('文件内容格式不正确');
                }
            } else {
                // 如果读取到的不是字符串（理论上指定了'utf8'后不应发生）
                throw new Error('读取到的文件内容不是文本格式');
            }
            // --- 修改结束 ---

        } catch (e) {
            wx.hideLoading();
            wx.showToast({ title: '导入失败，文件无效', icon: 'error' });
            console.error('解析或验证导入文件失败:', e);
        }
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

    onRestoreDefault() {
        this.setData({
            filenamePattern: defaultSettings.filenamePattern,
            rowIndex: defaultSettings.rowIndex.toString(),
            columnIndex: defaultSettings.columnIndex.toString(),
        });
        this.saveSettings();
        wx.showToast({
            title: '已恢复默认',
            icon: 'none',
        });
    },

    showClearDialog() {
        this.setData({ dialogVisible: true });
    },

    hideClearDialog() {
        this.setData({ dialogVisible: false });
    },

    onClearRecords() {
        this.hideClearDialog();
        wx.showModal({
            title: '确认清空',
            content: '此操作将永久删除所有记录，且无法恢复。您确定要继续吗？',
            confirmText: '我意已决',
            confirmColor: '#e34d59',
            success: (res) => {
                if (res.confirm) {
                    try {
                        saveRecords([]); // 写入空数组到用户文件
                        this.setData({ recordCount: 0 }); // 清空成功后，同步更新界面
                        wx.showToast({
                            title: '已清空所有记录',
                            icon: 'success',
                        });
                    } catch (e) {
                        console.error('清空记录失败:', e);
                        wx.showToast({
                            title: '操作失败',
                            icon: 'error',
                        });
                    }
                }
            },
        });
    },

    onSave() {
        if (this.saveSettings()) {
            wx.showToast({
                title: '保存成功',
                icon: 'success',
            });
            setTimeout(() => {
                wx.navigateBack();
            }, 1000);
        } else {
            wx.showToast({
                title: '保存失败',
                icon: 'error',
            });
        }
    },

});