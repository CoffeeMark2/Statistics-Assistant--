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

// 解析金额字符串为数字
export const parseAmount = (amountStr: string): number => {
  if (!amountStr) return 0;
  // 移除所有非数字、小数点和负号的字符
  const cleanStr = amountStr.replace(/[^\d.-]/g, '');
  return parseFloat(cleanStr) || 0;
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
