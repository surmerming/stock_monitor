"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketSessions = getMarketSessions;
exports.getPollingInterval = getPollingInterval;
function getNowInTimezone(tz) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(now);
    const get = (type) => parseInt(parts.find((p) => p.type === type).value);
    const year = get('year');
    const month = get('month');
    const day = get('day');
    let hour = get('hour');
    if (hour === 24)
        hour = 0;
    const minute = get('minute');
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    return { hour, minute, dayOfWeek };
}
function isWeekday(day) {
    return day >= 1 && day <= 5;
}
function inSession(hour, minute, sessions) {
    const t = hour * 60 + minute;
    return sessions.some(([sh, sm, eh, em]) => t >= sh * 60 + sm && t < eh * 60 + em);
}
function getMarketSessions() {
    const beijing = getNowInTimezone('Asia/Shanghai');
    const newYork = getNowInTimezone('America/New_York');
    return [
        {
            market: 'A股',
            isTrading: isWeekday(beijing.dayOfWeek) &&
                inSession(beijing.hour, beijing.minute, [
                    [9, 15, 11, 31],
                    [13, 0, 15, 1],
                ]),
        },
        {
            market: '港股',
            isTrading: isWeekday(beijing.dayOfWeek) &&
                inSession(beijing.hour, beijing.minute, [
                    [9, 30, 12, 1],
                    [13, 0, 16, 1],
                ]),
        },
        {
            market: '美股',
            isTrading: isWeekday(newYork.dayOfWeek) &&
                inSession(newYork.hour, newYork.minute, [
                    [4, 0, 20, 1],
                ]),
        },
    ];
}
function getPollingInterval() {
    const sessions = getMarketSessions();
    const anyTrading = sessions.some((s) => s.isTrading);
    return anyTrading ? 10_000 : 5 * 60_000;
}
//# sourceMappingURL=market-hours.js.map