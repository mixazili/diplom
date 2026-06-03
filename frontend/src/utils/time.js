export const getClientNow = (timeOffsetMs = 0) => Date.now() + (Number(timeOffsetMs) || 0);

export const toDateFromClientNow = (timeOffsetMs = 0) => new Date(getClientNow(timeOffsetMs));
