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

        // --- 关键修改(1)：在函数开头就获取fs管理器 ---
        // 这样可以确保在 try...catch...complete 中都能访问到它
        const fs = wx.getFileSystemManager();
        let backupFilePath = ''; // 将文件路径变量提升到外部，方便 complete 中访问

        try {
            console.log('--- 导出流程开始 ---');

            const records = getRecords();
            console.log('步骤1: 获取到 ' + records.length + ' 条记录。');

            if (records.length === 0) {
                wx.hideLoading();
                wx.showToast({ title: '没有记录可导出', icon: 'none' });
                console.log('--- 导出流程结束: 没有记录 ---');
                return;
            }

            const jsonContent = JSON.stringify(records, null, 2);
            // 打印部分内容以确认JSON转换成功，避免内容过长刷屏
            console.log('步骤2: JSON 字符串转换成功，部分内容:', jsonContent.substring(0, 1000));

            backupFilePath = `${wx.env.USER_DATA_PATH}/records_backup.json`;
            console.log('步骤3: 生成备份文件路径:', backupFilePath);

            fs.writeFileSync(backupFilePath, jsonContent, 'utf8');
            console.log('步骤4: 文件写入成功！');

            wx.hideLoading();

            console.log('步骤5: 准备调用 wx.shareFileMessage API...');
            wx.shareFileMessage({
                filePath: backupFilePath,
                success: () => {
                    console.log('步骤6a: wx.shareFileMessage 调用成功 (success回调触发)');
                    wx.showToast({ title: '请选择聊天保存文件', icon: 'none', duration: 2000 });
                },
                fail: (err: any) => {
                    console.error('步骤6b: wx.shareFileMessage 调用失败 (fail回调触发)', err);
                    if (err.errMsg && err.errMsg.includes('cancel')) {
                        wx.showToast({ title: '已取消分享', icon: 'none' });
                    } else {
                        wx.showToast({ title: '分享失败，请重试', icon: 'error' });
                    }
                },
                complete: () => {
                    console.log('步骤7: wx.shareFileMessage 操作完成 (complete回调触发)，准备清理文件...');

                    // 确保 backupFilePath 有效
                    if (backupFilePath) {
                        try {
                            // 使用同步删除，逻辑更简单
                            fs.unlinkSync(backupFilePath);
                            console.log('步骤8: 临时备份文件清理成功。');
                        } catch (unlinkErr) {
                            console.error('步骤8: 清理临时备份文件失败！', unlinkErr);
                        }
                    }
                    console.log('--- 导出流程全链路完成 ---');
                }
            });

        } catch (e) {
            wx.hideLoading();
            wx.showToast({ title: '导出过程出错', icon: 'error' });
            console.error('导出过程中发生严重错误 (catch捕获):', e);
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
                    content: '导入将覆盖所有现有记录，此操作不可恢复。确定要继续吗？',
                    confirmText: '确认导入',
                    confirmColor: '#e34d59',
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
        fs.readFile({
            filePath: filePath,
            encoding: 'utf8',
            success: (res) => {
                try {
                    const content = res.data as string;
                    const importedRecords = JSON.parse(content);

                    // 基础格式校验
                    if (Array.isArray(importedRecords) && (importedRecords.length === 0 || (importedRecords[0].id && importedRecords[0].amount !== undefined))) {
                        saveRecords(importedRecords);
                        this.updateRecordCount();
                        wx.hideLoading();
                        wx.showToast({ title: '导入成功', icon: 'success' });
                    } else {
                        throw new Error('文件内容格式不正确');
                    }
                } catch (e) {
                    wx.hideLoading();
                    wx.showToast({ title: '导入失败，文件无效', icon: 'error' });
                    console.error('解析或验证导入文件失败:', e);
                }
            },
            fail: (err) => {
                wx.hideLoading();
                wx.showToast({ title: '读取文件失败', icon: 'error' });
                console.error('读取导入文件失败:', err);
            },
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