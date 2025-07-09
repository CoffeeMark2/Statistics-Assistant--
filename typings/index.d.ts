/// <reference path="./types/index.d.ts" />

interface RecordItem {
    id: string;
    title: string;
    date: string;
    timestamp: number;
    amount: number;
    formattedAmount: string;
    source: string;
    filename?: string;
    cellPosition?: string;
    description?: string;
}

interface Settings {
    filenamePattern: string;
    rowKeyword: string;
    rowSearchColumn: number;
    colKeyword: string;
    colSearchRow: number;
}

interface IAppOption {
    globalData: {
        userInfo?: WechatMiniprogram.UserInfo;
        records: RecordItem[];
        settings: Settings;
    };
    userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback;

    // 方法
    loadSettings(): void;
    loadRecords(): void;
    saveRecords(records: RecordItem[]): boolean;
    addRecord(record: RecordItem): boolean;
    deleteRecord(id: string): boolean;
    calculateTotalAmount(records?: RecordItem[]): string;
    filterRecordsByTimeRange(range: string): RecordItem[];
}