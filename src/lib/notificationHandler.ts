import type { StatusResponse } from "../types/auth";
import { sendNotification } from '@tauri-apps/plugin-notification'
import { Accessor } from "solid-js";
import { ClubsResponse } from "../types/api/clubs";

export type NotificationPermission = {
    in_app: boolean;
    desktop: boolean,
    type: "Immediately even when window/tab is focused" |
    "As soon as window/tab is unfocused" |
    "No Mouse/Keyboard input or unfocused for 1 minute" |
    "No Mouse/Keyboard input or unfocused for 2 minutes" |
    "No Mouse/Keyboard input or unfocused for 5 minutes" |
    "No Mouse/Keyboard input or unfocused for 10 minutes" |
    "No Mouse/Keyboard input or unfocused for 15 minutes" |
    "No Mouse/Keyboard input or unfocused for 20 minutes" |
    "No Mouse/Keyboard input or unfocused for 25 minutes" |
    "No Mouse/Keyboard input or unfocused for 30 minutes";
    allowlist: { id: string; enabled: boolean }[];
}

const notifiedEvents = new Set<{ id: string; count?: number; }>();
const getCount = (id: string) => (Array.from(notifiedEvents).find(evt => evt.id === id)?.count ?? 0);
const plural = (n?: number) => (n && n > 1 ? "s" : "");
const updateEventCount = (id: string, count: number) => {
    const existing = Array.from(notifiedEvents).find(evt => evt.id === id);
    if (existing) {
        existing.count = count;
    } else {
        notifiedEvents.add({ id, count });
    }
};

const withinFiveMinutes = (date: Date): boolean => {
    const differenceInMilliseconds: number = date.getTime() - Date.now();
    const absoluteDifference: number = Math.abs(differenceInMilliseconds);
    const fiveMinutesInMilliseconds: number = 5 * 60 * 1000;
    return absoluteDifference <= fiveMinutesInMilliseconds;
};

export async function handleNotifications(notificationPermission: Accessor<NotificationPermission>, data: StatusResponse["result"], clubData: ClubsResponse.ClubType[]) {
    const isAllowed = (id: string) =>
        notificationPermission()
            .allowlist
            .some(item => item.id === id && item.enabled);

    const hasMessages = isAllowed("messages") && !!(data.new_messages && data.new_messages !== getCount("messages")) ? data.new_messages : 0;
    const hasForms = isAllowed("forms") && !!(data.new_forms && data.new_forms !== getCount("forms")) ? data.new_forms : 0;
    const hasNoticeboard = isAllowed("noticeboard") && !!(
        ((data.noticeboard?.new_items ?? 0) + (data.noticeboard?.new_snippets ?? 0)) !== getCount("noticeboard")
    ) ? (data.noticeboard?.new_snippets + data.noticeboard?.new_items) : 0

    if (hasMessages > 0 || hasForms > 0 || hasNoticeboard > 0) {
        const titleParts = [];
        if (hasMessages) {
            titleParts.push(`Message${plural(hasMessages)}`);
            updateEventCount("messages", hasMessages)
        }
        if (hasForms) {
            titleParts.push(`Form${plural(hasForms)}`);
            updateEventCount("forms", hasForms)
        }
        if (hasNoticeboard) {
            titleParts.push(`Noticeboard`);
            updateEventCount("noticeboard", hasNoticeboard)
        }

        const msgPart = hasMessages
            ? `${hasMessages} unread message${plural(hasMessages)}`
            : "";
        const formPart = hasForms
            ? `${hasForms} undone form${plural(hasForms)}`
            : "";
        const noticePart = hasNoticeboard
            ? `${hasNoticeboard} unread noticeboard update${plural(hasNoticeboard)}`
            : "";

        const joinedParts = [msgPart, formPart, noticePart].filter(Boolean).join(" and ");
        const body = `You have ${joinedParts}.`;

        sendNotification({
            title: `Openlink - New ${titleParts.join(" and ")}!`,
            body,
        });
    }

    if (isAllowed("lessons")) {
        const nextLesson = data.lessons?.next;
        const startTime = nextLesson?.start_time;
        if (startTime) {
            const [h, m] = startTime.split(":").map(Number);
            const lessonDate = new Date();
            lessonDate.setHours(h, m, 0, 0);
            if (withinFiveMinutes(lessonDate)) {
                if (notifiedEvents.has({ id: "lesson-" + lessonDate.toISOString() })) return;
                sendNotification({
                    title: `Openlink - ${nextLesson.teaching_group.subject} is coming up`,
                    body: `Next lesson starts in 5 minutes. Head to ${nextLesson.room.name}.`,
                });
                notifiedEvents.add({ id: "lesson-" + lessonDate.toISOString() });
            }
        }
    }

    if (isAllowed("clubs")) {
        for (const club of clubData ?? []) {
            if (!club.next_session) continue;
            const sessionDate = new Date(club.next_session);
            if (!withinFiveMinutes(sessionDate)) continue;
            if (notifiedEvents.has({ id: "club-" + sessionDate.toISOString() })) continue;
            sendNotification({
                title: `Openlink - ${club.name} is coming up.`,
                body: `${club.name} is in 5 minutes. Head to ${club.location}`,
            });
            notifiedEvents.add({ id: "club-" + sessionDate.toISOString() });
        }
    }

    for (const event of Array.from(notifiedEvents)) {
        if (event.id.startsWith("club-") || event.id.startsWith("lesson-")) {
            const iso = event.id.split("-")[1];
            const time = new Date(iso).getTime();
            if (!isNaN(time) && time < Date.now()) {
                notifiedEvents.delete(event);
            }
        }
    }
}