import { FormInstance } from "antd";
import { addDays, endOfDay, format, getDay, isBefore, startOfWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { EditRoomFormValues } from "../components/EditRoomPage";
import { PeriodicEndType, RoomType, Week } from "../types/room";

export function getWeekNames(weeks: Week[]): string {
    return weeks.map(getWeekName).join("、");
}

export function getWeekName(week: Week): string {
    const t = addDays(startOfWeek(new Date()), week);
    return format(t, "iii", { locale: zhCN });
}

export const getRoomTypeName = (type: RoomType): string => {
    const typeNameMap: Record<RoomType, string> = {
        [RoomType.OneToOne]: "一对一",
        [RoomType.SmallClass]: "小班课",
        [RoomType.BigClass]: "大班课",
    };
    return typeNameMap[type];
};

export function formatISODayWeekiii(date: Date): string {
    // TODO: i18n
    return format(date, "yyyy/MM/dd iii", { locale: zhCN });
}

/**
 * generate array of numbers in some range
 * @example
 * excludeRange(2, 5) //=> [2, 3, 4, 5]
 * excludeRange(3)    //=> [0, 1, 2]
 */
export const excludeRange = (slice1: number, slice2?: number): number[] =>
    slice2
        ? Array(slice2 - slice1 + 1)
              .fill(slice1)
              .map((i, k) => i + k)
        : Array.from(Array(slice1).keys());

/** get a now Date object with 0 second and 0 millisecond */
export const getRoughNow = (): Date => {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now;
};

export const compareDate = (date: Date, comparedDate: Date): -1 | 0 | 1 => {
    const diff = date.valueOf() - comparedDate.valueOf();
    if (diff < 0) {
        return -1;
    }
    if (diff > 0) {
        return 1;
    }
    return 0;
};

/**
 * compare with days
 */
export const compareDay = (date: Date, comparedDate: Date): -1 | 0 | 1 => {
    date = new Date(date);
    date.setHours(comparedDate.getHours());
    date.setMinutes(comparedDate.getMinutes());
    date.setSeconds(comparedDate.getSeconds());
    date.setMilliseconds(comparedDate.getMilliseconds());
    return compareDate(date, comparedDate);
};

/**
 * compare with hours
 */
export const compareHour = (date: Date, comparedDate: Date): -1 | 0 | 1 => {
    date = new Date(date);
    date.setMinutes(comparedDate.getMinutes());
    date.setSeconds(comparedDate.getSeconds());
    date.setMilliseconds(comparedDate.getMilliseconds());
    return compareDate(date, comparedDate);
};

/**
 * compare with minutes
 */
export const compareMinute = (date: Date, comparedDate: Date): -1 | 0 | 1 => {
    date = new Date(date);
    date.setSeconds(comparedDate.getSeconds());
    date.setMilliseconds(comparedDate.getMilliseconds());
    return compareDate(date, comparedDate);
};

export function getEndTimeFromRate(beginTime: Date, weeks: number[], rate: number): Date {
    let times = 0;
    let t = beginTime;

    while (times < 50 - 1) {
        if (weeks.includes(getDay(t))) {
            if (++times >= rate) {
                break;
            }
        }
        t = addDays(t, 1);
    }

    return endOfDay(t);
}

export function getRateFromEndTime(
    beginTime: Date,
    weeks: number[],
    periodicEndTime: Date,
): { endTime: Date; rate: number } {
    if (isBefore(periodicEndTime, beginTime)) {
        periodicEndTime = endOfDay(beginTime);
    }

    let times = 0;
    let t = beginTime;

    while (isBefore(t, periodicEndTime)) {
        if (weeks.includes(getDay(t))) {
            times++;
        }
        t = addDays(t, 1);
    }

    return { endTime: periodicEndTime, rate: times };
}

/**
 * In rate endType mode: make sure periodic end time is enough for all classes.
 * In time endType mode: recalculate classroom rate.
 */
export function syncPeriodicEndAmount(
    form: FormInstance<EditRoomFormValues>,
    beginTime: EditRoomFormValues["beginTime"],
    periodic: EditRoomFormValues["periodic"],
): void {
    const isPeriodic: EditRoomFormValues["isPeriodic"] = form.getFieldValue("isPeriodic");
    if (!isPeriodic) {
        return;
    }

    const newPeriodic = { ...periodic };

    const day = getDay(beginTime);

    if (!periodic.weeks.includes(day)) {
        newPeriodic.weeks = [...periodic.weeks, day].sort();
    }

    if (periodic.endType === "rate") {
        newPeriodic.endTime = getEndTimeFromRate(beginTime, newPeriodic.weeks, newPeriodic.rate);
    } else {
        const { endTime, rate } = getRateFromEndTime(
            beginTime,
            newPeriodic.weeks,
            newPeriodic.endTime,
        );
        newPeriodic.endTime = endTime;
        newPeriodic.rate = rate;
    }

    form.setFieldsValue({ periodic: newPeriodic });

    form.validateFields();
}

export const getPeriodicEndTypeName = (type: PeriodicEndType): string => {
    const endTypeNameMap: Record<PeriodicEndType, string> = {
        rate: "限定房间个数",
        time: "结束于某天",
    };

    return endTypeNameMap[type];
};
