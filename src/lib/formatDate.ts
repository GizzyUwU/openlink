/**
 * Universal date formatter utility for consistent formatting across the app.
 */

export interface FormatDateOptions {
    date: string | Date | null;
    time?: boolean;
    fullFormat?: boolean;
    short?: boolean;
}

/**
 * Formats a date string or Date object into a human-readable string.
 *
 * Examples:
 * - formatDate({ date: "2025-10-30" }) → "Thursday, 30 October"
 * - formatDate({ date: "2025-10-30T12:45:00", time: true }) → "12:45"
 * - formatDate({ date: "2025-10-30T12:45:00", fullFormat: true }) → "12:45 Thursday, 30 October"
 * - formatDate({ date: "2025-10-30", short: true }) → "30/10/2025"
 */
export function formatDate({
    date,
    time = false,
    fullFormat = false,
    short = false,
}: FormatDateOptions): string {
    if (!date) return "-";
    const d = new Date(typeof date === "string" ? date.replace(" ", "T") : date);
    if (isNaN(d.getTime())) return "-";

    if (short) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleDateString(undefined, { month: "long" });

    if (fullFormat) {
        const timeString = d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
        return `${timeString} ${weekday}, ${day} ${month}`;
    }

    if (time) {
        return d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }

    return `${weekday}, ${day} ${month}`;
}
