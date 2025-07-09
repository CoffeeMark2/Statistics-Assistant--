import { formatNumber, extractDateFromFilename, parseAmount } from '../../utils/util';
import { getRecords, saveRecords } from '../../utils/storage';


const fs = wx.getFileSystemManager();
const XLSX = require('../../utils/xlsx.mini.min.js');

Page({
    data: {
        files: [] as any[],
        previewFiles: [] as any[],
        selectedCount: 0,
        totalAmount: '0.00',
        filenamePattern: '(\\d+)月(\\d+)日.*\\.xlsx?$',
        rowIndex: 26,
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
        console.log("select", year)
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

    // 预览有效文件 - 改为异步真实读取
    async previewValidFiles() {
        wx.showLoading({ title: '正在解析文件...' });

        const validFiles = this.data.files.filter((file: any) => file.valid && file.selected);
        const yearToUse = this.data.yearText;
        const rowIndex = this.data.rowIndex;
        const colIndex = this.data.columnIndex;

        const previewPromises = validFiles.map(async (file: any) => {
            const date = extractDateFromFilename(file.name, this.data.filenamePattern, yearToUse);
            const cellPosition = `${String.fromCharCode(64 + colIndex)}${rowIndex}`;
            let amount = 0;
            let formattedAmount = '0.00';
            let parseError = '';

            try {
                // 1. 异步读取文件内容
                const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                    fs.readFile({
                        filePath: file.path,
                        success: (res) => {
                            const data = res.data;
                            if (data instanceof ArrayBuffer) {
                                console.log(`[文件: ${file.name}] -> 步骤1: 文件读取成功，得到 ArrayBuffer，大小: ${data.byteLength} 字节`);
                                resolve(data);
                            } else {
                                console.log(`[文件: ${file.name}] -> 步骤1: 文件读取成功，但格式为 String，长度: ${data.length} 字符`);
                                reject(new Error('Expected file content to be ArrayBuffer, but received string.'));
                            }
                        },
                        fail: reject,
                    });
                });

                // 2. 使用xlsx库解析
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                console.log(`[文件: ${file.name}] -> 步骤2: Workbook (工作簿) 解析成功。`, workbook);

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                console.log(`[文件: ${file.name}] -> 步骤3a: 获取到第一个工作表，名称: "${firstSheetName}"`);

                // 3. 定位单元格并提取数据
                const cellAddress = XLSX.utils.encode_cell({ r: rowIndex - 1, c: colIndex - 1 });
                console.log(`[文件: ${file.name}] -> 步骤3b: 根据行(${rowIndex})和列(${colIndex})计算出单元格地址: "${cellAddress}"`);

                const cell = worksheet[cellAddress];
                const rawValue = cell ? cell.v : undefined;
                console.log(`[文件: ${file.name}] -> 步骤3c: 从单元格 "${cellAddress}" 提取到的原始值 (rawValue):`, rawValue);


                // 4. 安全性检查和转换
                if (rawValue === undefined || rawValue === null || rawValue === '') {
                    parseError = '单元格为空';
                    amount = 0;
                } else {
                    const parsed = parseAmount(rawValue); // 使用工具函数处理金额
                    if (isNaN(parsed)) {
                        parseError = `无法解析金额`;
                        amount = 0;
                    } else {
                        amount = parsed;
                    }
                }

                formattedAmount = formatNumber(amount);

            } catch (e: any) {
                console.error(`解析文件 ${file.name} 失败:`, e);
                parseError = '文件解析失败';
                amount = 0;
            }

            return {
                name: file.name,
                date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '',
                cellPosition,
                amount,
                formattedAmount,
                parseError // 新增错误信息字段
            };
        });

        const previewFiles = await Promise.all(previewPromises);

        wx.hideLoading();

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

    // 导入数据 - 改为使用文件存储
    onImport() {
        if (this.data.selectedCount === 0) {
            wx.showToast({ title: '请选择文件', icon: 'error' });
            return;
        }

        const newRecords = this.data.previewFiles
            .filter((file: any) => !file.parseError) // 只导入没有解析错误的文件
            .map((file: any) => ({
                id: Date.now() + Math.random().toString(36).substring(2, 9),
                title: file.name,
                date: file.date,
                timestamp: new Date(file.date).getTime(),
                amount: file.amount,
                formattedAmount: file.formattedAmount,
                source: 'file',
                filename: file.name,
                cellPosition: file.cellPosition
            }));

        if (newRecords.length === 0) {
            wx.showToast({ title: '没有可导入的有效文件', icon: 'error' });
            return;
        }

        try {
            const existingRecords = getRecords();
            const updatedRecords = [...newRecords, ...existingRecords];
            saveRecords(updatedRecords); // 使用新的存储工具

            wx.showToast({ title: '导入成功', icon: 'success' });

            setTimeout(() => wx.navigateBack(), 1000);
        } catch (e) {
            console.error('保存记录失败:', e);
            wx.showToast({ title: '导入失败', icon: 'error' });
        }
    }
}); 