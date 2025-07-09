export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumberPadding).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumberPadding).join(':')
  )
}

// 数字补零
export const formatNumberPadding = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

// 格式化金额，添加千分位分隔符
export const formatNumber = (n: number) => {
  return n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

/**
 * @description 解析金额。可以处理数字或字符串（包含逗号、货币符号）
 * @param {any} value - 可能是数字或字符串的原始值
 * @returns {number} 解析后的纯数字金额
 */
export function parseAmount(value: any): number {
    // --- 新增的健壮性处理 ---
    
    // 1. 如果输入值本身就是数字，直接返回，无需任何处理
    if (typeof value === 'number') {
      return value;
    }
  
    // 2. 如果是字符串，再执行原来的替换和解析逻辑
    if (typeof value === 'string') {
      // 替换掉所有可能的逗号、人民币符号、元等非数字字符
      const cleanedStr = value.replace(/[,¥元\s]/g, '').trim();
      
      // 如果清理后为空字符串，也视为0
      if (cleanedStr === '') {
          return 0;
      }
  
      const number = parseFloat(cleanedStr);
      
      // 如果解析失败（比如内容是"未知"），返回0
      return isNaN(number) ? 0 : number;
    }
  
    // 3. 对于其他所有类型 (null, undefined 等)，都安全地返回 0
    return 0;
  }

// 从文件名中提取日期
export const extractDateFromFilename = (filename: string, pattern: string, currentYear: number): Date | null => {
  try {
    const regex = new RegExp(pattern);
    const match = regex.exec(filename);
    
    if (!match || match.length < 3) {
      return null;
    }
    
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    
    // 检查月份和日期的有效性
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    
    return new Date(currentYear, month - 1, day);
  } catch (error) {
    console.error('日期提取错误:', error);
    return null;
  }
}
