export default {
    name: "quackOnTimetable",
    description: "Using Toast and onItemLoad it will quack only on timetable",
    authors: ["GizzyUwU"],
    onItemLoad(itemId) {
        if (itemId === "timetable") {
            window.toast.showToast("Quack On Timetable", "Quack", "info")
        }
    }
}