import { formatNumber, formatTime } from '../../utils/util';
import { getRecords, saveRecords } from '../../utils/storage';

Page({
    data: {
        date: Date.now(),
        dateFormatted: '',
        amountType: 'income', // 默认为收入
        amount: '',
        description: '',

        // date selector
        mode: '',
        dateVisible: false,

        filter(type: string, options: { value: number; label: string }[]) {
            if (type === 'year') {
                // 当 options 的类型确定后，a 和 b 的类型会被 TypeScript 自动推断出来
                // 所以 a 和 b 你甚至不需要手动写类型
                return options.sort((a, b) => b.value - a.value);
            }
            return options;
        },
        popupProps: {
            usingCustomNavbar: true,
        },
        // 指定选择区间起始值
        start: '2020-01-01 00:00:00',
        end: '2099-12-12 23:59:59',
    },


    showPicker(e: WechatMiniprogram.BaseEvent) {
        const { mode } = e.currentTarget.dataset;
        this.setData({
            mode,
            [`${mode}Visible`]: true,
        });
    },

    handleClose(e: WechatMiniprogram.BaseEvent) {
        console.log('handleClose:', e);
    },

    onConfirm(e: WechatMiniprogram.CustomEvent) {
        const { value } = e.detail;
        const { mode } = this.data;
        console.log('confirm', value.split(' ')[0]);
        const timestampValue = new Date(value.split(' ')[0]).getTime();
        this.setData({
            [mode]: value,
            [`${mode}Text`]: value,
            dateFormatted:value.split(' ')[0],
            date:timestampValue
        });
    },

    onColumnChange(e: WechatMiniprogram.CustomEvent) {
        console.log('pick', e.detail.value);
    },



    onLoad() {
        // 格式化默认日期
        this.formatDate();
    },

    // 格式化日期
    formatDate() {
        const date = new Date(this.data.date);
        const dateFormatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        this.setData({ dateFormatted });
    },


    // 金额类型变更
    onAmountTypeChange(e: any) {
        this.setData({
            amountType: e.detail.value
        });
    },

    // 金额变更
    onAmountChange(e: any) {
        this.setData({
            amount: e.detail.value
        });
    },

    // 描述变更
    onDescriptionChange(e: any) {
        this.setData({
            description: e.detail.value
        });
    },

    // 取消
    onCancel() {
        wx.navigateBack();
    },

    // 提交表单
    onFormSubmit() {
        // 验证表单
        if (!this.data.amount) {
            wx.showToast({
                title: '请输入金额',
                icon: 'error'
            });
            return;
        }

        // 解析金额
        let amountValue = parseFloat(this.data.amount);
        if (isNaN(amountValue)) {
            wx.showToast({
                title: '金额格式不正确',
                icon: 'error'
            });
            return;
        }

        // 如果是支出，转为负数
        if (this.data.amountType === 'expense') {
            amountValue = -Math.abs(amountValue);
        }

        // 创建记录对象
        const record = {
            id: Date.now().toString(), // 使用时间戳作为ID
            title: this.data.description || '手动添加记录',
            date: this.data.dateFormatted,
            timestamp: this.data.date,
            amount: amountValue,
            formattedAmount: formatNumber(Math.abs(amountValue)),
            source: 'manual', // 标记为手动添加
            description: this.data.description
        };

        // 保存记录
        try {
            // 获取现有记录
            const records = getRecords();
            // 添加新记录
            records.unshift(record);
            console.log("submit succees",record)
            // 保存回存储
            saveRecords(records);
            console.log("getFileRecords",getRecords())

            wx.showToast({
                title: '添加成功',
                icon: 'success'
            });

            // 延迟返回
            setTimeout(() => {
                wx.navigateBack();
            }, 1500);
        } catch (e) {
            console.error('保存记录失败:', e);
            wx.showToast({
                title: '保存失败',
                icon: 'error'
            });
        }
    }
}); 