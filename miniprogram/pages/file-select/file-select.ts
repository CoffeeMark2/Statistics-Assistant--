import { formatNumber, extractDateFromFilename, parseAmount } from '../../utils/util';
import { getRecords, saveRecords } from '../../utils/storage';

// 引入解析Excel的库
// 注意：实际项目中需要安装并引入一个Excel解析库，如xlsx或者SheetJS
// 这里仅做模拟


Page({
    data: {
        files: [] as any[],
        previewFiles: [] as any[],
        selectedCount: 0,
        totalAmount: '0.00',
        filenamePattern: '(\\d+)月(\\d+)日.*\\.xlsx?$',
        rowIndex: 2,
        columnIndex: 3,

        // for year picker
        yearVisible: false,
        yearText: new Date().getFullYear(),
        yearValue: new Date(new Date().getFullYear(), 0, 1).getTime(),
        start: '2020-01-01 00:00:00',
        end: '2060-09-09 12:12:12',
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

    // #region 年份选择器相关方法
    showYearPicker() {
        this.setData({ yearVisible: true });
    },

    hideYearPicker() {
        this.setData({ yearVisible: false });
    },

    onYearConfirm(e: any) {
        const { value } = e.detail;
        // 从picker返回的值中提取年份
        const year = parseInt(value.replace('年', ''));
        const newTimestamp = new Date(year, 0, 1).getTime();
        console.log("select",year)
        this.setData({
            yearText: year,
            yearValue: newTimestamp,
            yearVisible: false,
        });
        this.hideYearPicker();

        // 年份变更后，需要重新生成预览
        this.previewValidFiles();
    },
    onColumnChange() {
        // console.log('pick', e.detail.value);
    },
    // #endregion

    // 选择文件
    onSelectFile() {
        wx.chooseMessageFile({
            count: 10, // 最多可以选择10个文件
            type: 'file',
            extension: ['xls', 'xlsx'],
            success: (res) => {
                const tempFiles = res.tempFiles;
                const pattern = new RegExp(this.data.filenamePattern);

                // 获取已存在的文件名，包括已保存的和当前列表中的
                const existingRecordNames = getRecords().map((r: any) => r.filename);
                const currentFileNames = this.data.files.map((f: any) => f.name);
                const existingFilenames = new Set([...existingRecordNames, ...currentFileNames]);

                const newFiles = tempFiles.map(file => {
                    // 检查文件是否符合命名规则
                    const isValid = pattern.test(file.name);
                    // 检查文件是否已存在
                    const isDuplicate = existingFilenames.has(file.name);

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

                // 将新选择的文件追加到现有列表
                const updatedFiles = [...this.data.files, ...newFiles];

                this.setData({
                    files: updatedFiles
                });

                // 更新预览
                this.previewValidFiles();
            },
            fail: (err) => {
                console.error('选择文件失败:', err);
            }
        });
    },

    // 预览有效文件
    previewValidFiles() {
        const validFiles = this.data.files.filter((file: any) => file.valid && file.selected);
        const yearToUse = this.data.yearText;

        // 这里应该实际读取Excel文件内容
        // 由于微信小程序环境限制，这里仅做模拟
        const previewFiles = validFiles.map((file: any) => {
            // 从文件名中提取日期
            const date = extractDateFromFilename(file.name, this.data.filenamePattern, yearToUse);

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
        const newRecordsFromFile = this.data.previewFiles.map((file: any) => ({
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
            const existingRecords = getRecords();
            // 添加新记录
            const finalRecords = [...newRecordsFromFile, ...existingRecords];
            // 保存回文件
            saveRecords(finalRecords);

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