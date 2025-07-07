const fs = wx.getFileSystemManager();
const FILE_PATH = `${wx.env.USER_DATA_PATH}/records.json`;

/**
 * 从本地用户文件中读取所有记录
 * @returns {any[]} 记录数组
 */
export const getRecords = (): any[] => {
    try {
        // 检查文件是否存在
        fs.accessSync(FILE_PATH);
        // 读取文件内容
        const content = fs.readFileSync(FILE_PATH, 'utf8',);
        if (typeof content === 'string') {
            return JSON.parse(content || '[]');
        }
        // 如果是 ArrayBuffer 或 Buffer，先转成字符串
        return JSON.parse(content.toString() || '[]');
    } catch (e) {
        // 文件不存在或读取失败，返回空数组
        return [];
    }
};

/**
 * 将记录数组保存到本地用户文件
 * @param {any[]} records 要保存的记录数组
 */
export const saveRecords = (records: any[]) => {
    try {
        const content = JSON.stringify(records, null, 2); // 美化JSON格式以便调试
        fs.writeFileSync(FILE_PATH, content, 'utf8');
    } catch (e) {
        console.error('保存记录到文件失败:', e);
        wx.showToast({
            title: '保存记录失败',
            icon: 'error',
        });
    }
}; 