import "../assets/css/main.css";
import { HiOutlineCog6Tooth, HiOutlineClock, HiSolidLink } from 'solid-icons/hi'
import { AiOutlineLineChart, AiOutlineFileText, AiOutlineTrophy, AiOutlineForm } from 'solid-icons/ai'
import { TbCertificate } from 'solid-icons/tb'
import { RiSystemErrorWarningLine } from 'solid-icons/ri'
import { IoBriefcaseOutline } from 'solid-icons/io'
import { FaSolidPersonRunning, FaSolidSection } from 'solid-icons/fa'
import { VsAccount } from 'solid-icons/vs'
import { Icon } from '@iconify-icon/solid';
import { makePersisted } from "@solid-primitives/storage";
import { createEffect, createSignal } from "solid-js";
import { useEdulink } from "../api/edulink";
import { Show, onCleanup, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useToast } from "../components/toast";
import { Transition } from "solid-transition-group";

function Main() {
    const [showBackIcon, setShowBackIcon] = createSignal(false);
    const [activeIdx, setActiveIdx] = createSignal<number | null>(null);
    const [isAnimating, setIsAnimating] = createSignal(false);
    const [isSlid, setIsSlid] = createSignal(false);
    let navWheelRef: HTMLDivElement | undefined;
    const [slideX, setSlideX] = createSignal(0);
    const [wheelRotation, setWheelRotation] = createSignal(0);
    const [isLogoGone, setIsLogoGone] = createSignal(false);
    const [logoOpacity, setLogoOpacity] = createSignal(1);
    const [navSlid, setNavSlid] = createSignal<boolean>(false);
    const [LoadedComponent, setLoadedComponent] = createSignal<any>(null);
    const navigate = useNavigate();
    const toast = useToast();
    createEffect(() => {
        const idx = activeIdx();
        const navActive = isSlid() && isLogoGone() && typeof idx === 'number';
        if (!navActive) {
            setShowBackIcon(false);
        } else {
            if (iconOpacities()[idx as number] === 0) setShowBackIcon(true);
        }
        if (isSlid() && idx !== null) {
            if (typeof idx === 'number' && items[idx]) {
                console.log("Active item index:", idx);
                console.log("Nav is slid");
                console.log("Active item:", items[idx].name);
            }
        }
    });
    const edulink = useEdulink();
    const [status, setStatus] = createSignal<any>({});
    const [sessionData, setSession] = makePersisted(createSignal<any>(null), {
        storage: sessionStorage,
        name: "sessionData"
    });

    const [apiUrl, setApiUrl] = makePersisted(createSignal<any>(null), {
        storage: sessionStorage,
        name: "apiUrl"
    });

    onMount(() => {
        if (!sessionData() || !apiUrl()) {
            setSession(null);
            setApiUrl(null);
            throw navigate("/");
        }

        const fetchStatus = async () => {
            const result = await edulink.getStatus(sessionData()?.authtoken, apiUrl());
            if (result.result.success) {
                setStatus(result.result);
            } else {
                setSession(null);
                setApiUrl(null);
                throw navigate("/");
            }
        };

        fetchStatus();
        const checkStatus = setInterval(fetchStatus, 60 * 1000);
        onCleanup(() => clearInterval(checkStatus));
    });

    async function loadItemPage(id: string, name: string) {
        try {
            const mod = await import(`../components/${id}.tsx`);
            const waitForSlide = () =>
                new Promise<void>(resolve => {
                    const check = () => {
                        if (navSlid()) {
                            resolve();
                        } else {
                            setTimeout(check, 20);
                        }
                    };
                    check();
                });
            await waitForSlide();
            setLoadedComponent(() => mod.default);


            const idx = activeIdx();
            if (typeof idx === "number") {
                setShowBackIcon(true);
            }

        } catch (err) {
            console.error(`Failed to load component: ../components/${id}.tsx`, err);
            setIsAnimating(false);
            setIsSlid(false);
            setNavSlid(false);
            setActiveIdx(null);
            setShowBackIcon(false);
            setLoadedComponent(null);
            const prev = document.getElementById('item-box');
            if (prev) prev.remove();
            toast.showToast("Error!", `${name} failed to open.`, "error");
        }
    }


    const updateSlideX = () => {
        if (navWheelRef) {
            const wheelRect = navWheelRef.getBoundingClientRect();
            setSlideX(-(wheelRect.left + wheelRect.width / 2 + 12));
        }
    };

    const items = [
        { id: "timetable", name: "Timetable", icon: <HiOutlineClock size={36} />, class: "_timetable" },
        { id: "documents", name: "Documents", icon: <AiOutlineFileText size={36} />, class: "_documents" },
        { id: "exams", name: "Exams", icon: <TbCertificate size={36} />, class: "_exams" },
        { id: "behaviour", name: "Behaviour", icon: <RiSystemErrorWarningLine size={36} />, class: "_behaviour" },
        { id: "achievement", name: "Achievement", icon: <AiOutlineTrophy size={36} />, class: "_achievement" },
        { id: "attendance", name: "Attendance", icon: <AiOutlineLineChart size={36} />, class: "_attendance_absencemanagement" },
        { id: "homework", name: "Homework", icon: <IoBriefcaseOutline size={36} />, class: "_homework" },
        { id: "forms", name: "Forms", icon: <AiOutlineForm size={36} />, class: "_forms" },
        { id: "links", name: "Links", icon: <HiSolidLink size={36} />, class: "_links" },
        { id: "clubs", name: "Clubs", icon: <FaSolidPersonRunning size={36} />, class: "_clubs" },
        { id: "account", name: "Account Info", icon: <VsAccount size={36} />, class: "_account" }
    ];

    const [iconOpacities, setIconOpacities] = createSignal(Array(items.length).fill(1));

    createEffect(() => {
        let resizeTimeout: number | undefined;
        if (isSlid()) {
            if (!isLogoGone()) updateSlideX();
            setLogoOpacity(0);
            setIconOpacities(Array(items.length).fill(0));
            setIsLogoGone(false)
            setTimeout(() => setNavSlid(true), 600);
            const handler = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = window.setTimeout(() => {
                    if (!navSlid()) updateSlideX();
                }, 100);
            };
            window.addEventListener('resize', handler);
            return () => window.removeEventListener('resize', handler);
        } else {
            setSlideX(0);
            setIsLogoGone(false);
            setNavSlid(false)
            setLogoOpacity(0);
            setIconOpacities(Array(items.length).fill(0));
            setTimeout(() => {
                setLogoOpacity(1);
                setIconOpacities(Array(items.length).fill(1));
            }, 10);
        }
    });
    const spinToIndex = (idx: number) => {
        setWheelRotation(idx * 360 / items.length);
    };

    createEffect(() => {
        if (isSlid() && typeof activeIdx() === 'number') {
            spinToIndex(activeIdx()!);
        } else if (!isSlid()) {
            setWheelRotation(0);
        }
    });

    const navWheelContainerStyle = () => isAnimating()
        ? { transition: 'transform 1.2s cubic-bezier(0.77,0,0.175,1)', transform: `translateX(${slideX()}px)` }
        : { transition: 'transform 1.2s cubic-bezier(0.77,0,0.175,1)', transform: 'none' };

    const navWheelListStyle = () => ({
        transition: isAnimating() ? 'transform 1.2s cubic-bezier(0.77,0,0.175,1)' : 'none',
        transform: `rotate(${wheelRotation()}deg)`
    });

    const getItemStyle = (x: number, y: number) => ({
        position: "absolute" as const,
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: `translate(-50%, -50%) rotate(${-wheelRotation()}deg)`,
        transition: isAnimating() ? 'transform 1.2s cubic-bezier(0.77,0,0.175,1)' : 'none'
    });

    function renderNavItem(item: typeof items[number], i: number) {
        const radius = 166;
        const angleStep = (2 * Math.PI) / items.length;
        const angle = 0 - i * angleStep;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const isActive = activeIdx() === i;
        console.log('bombfrance', isActive);
        const showBack = isActive && showBackIcon() ? true : false;
        return (
            <li class="__item" style={getItemStyle(x, y)}>
                <div class="__inner">
                    <a
                        class={`__item-link ${item.class}`}
                        href={`/dash/#${item.id}`}
                        title={item.name}
                        onClick={e => {
                            e.preventDefault();

                            if (isSlid() && isActive) {
                                setIsAnimating(false);
                                setIsSlid(false);
                                setActiveIdx(null);
                                setLoadedComponent(null);
                                const prev = document.getElementById('item-box');
                                if (prev) prev.remove();
                            } else {
                                setActiveIdx(i);
                                setIsAnimating(true);
                                setIsSlid(true);
                                spinToIndex(i);
                                loadItemPage(item.id, item.name);
                            }
                        }}
                    >
                        {!navSlid() ? (
                            <span
                                style={{
                                    opacity: iconOpacities()[i],
                                    transition: 'opacity 0.1s cubic-bezier(0.77,0,0.175,1)'
                                }}
                                onTransitionEnd={() => {
                                    if (isSlid() && isActive) setShowBackIcon(true);
                                }}
                            >{item.icon}</span>
                        ) : (
                            isSlid() ? (
                                showBack ? (
                                    <svg
                                        width="36"
                                        height="36"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        style={{
                                            opacity: 1,
                                            transition: 'opacity 0.2s cubic-bezier(0.77,0,0.175,1)'
                                        }}
                                    >
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                ) : null
                            ) : <span>{item.icon}</span>
                        )}
                    </a>
                </div>
            </li>
        );
    }

    return (
        <div class="container">
            <div class="s-header">
                <div class="__inner">
                    <div class="__gradient"></div>
                </div>
                <div class="__container">
                    <div class="pr-user _animated">
                        <button type="button" class="__settings"><HiOutlineCog6Tooth /></button>
                        <div class="__info">
                            <div
                                class="__avatar"
                                style={{
                                    "background-image": `url(data:image/webp;base64,${sessionData()?.user?.avatar?.photo || "default-avatar-data"})`,
                                }}
                            ></div>
                            <div class="__text">
                                Hello,&nbsp;
                                <span class="__name">{sessionData()?.user?.forename + " " + sessionData()?.user?.surname || ""}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="nav-wheel">
                <div class="__container __loaded" ref={el => (navWheelRef = el)}
                    style={navWheelContainerStyle()}>
                    <div class="__artboard"></div>
                    <Show when={!isLogoGone()} fallback={null}>
                        <div
                            class="__logo-wrap"
                            style={{
                                opacity: logoOpacity(),
                                transition: 'opacity 0.4s cubic-bezier(0.77,0,0.175,1)',
                                'pointer-events': logoOpacity() === 0 ? 'none' : 'auto',
                            }}
                        >
                            <div class="__logo" style={{
                                "background-image": `url(data:image/webp;base64,${sessionData().establishment?.logo || ""})`
                            }}></div>
                        </div>
                    </Show>
                    <ul class="__list" style={navWheelListStyle()}>
                        {items.map(renderNavItem)}
                    </ul>
                </div>
            </div>
            <Transition
                onEnter={(el, done) => {
                    const a = el.animate(
                        [
                            {
                                opacity: 0,
                                transform: "translate3d(-50%, 0, 0) scale(0.8)",
                            },
                            {
                                opacity: 1,
                                transform: "translate3d(-50%, 0, 0) scale(1)",
                            },
                        ],
                        {
                            duration: 200,
                            easing: "ease",
                        }
                    );
                    a.finished.then(done);
                }}
                onExit={(el, done) => {
                    const a = el.animate(
                        [
                            {
                                opacity: 1,
                                transform: "translate3d(-50%, 0, 0) scale(1)",
                            },
                            {
                                opacity: 0,
                                transform: "translate3d(-50%, 0, 0) scale(0.8)",
                            },
                        ],
                        {
                            duration: 200,
                            easing: "ease",
                        }
                    );
                    a.finished.then(done);
                }}
            >
                <Show when={LoadedComponent()}>
                    {(Comp) => (
                        <div
                            id="item-box"
                            style={{
                                position: "absolute",
                                top: "100px",
                                left: "50%",
                                transform: "translate3d(-50%, 0, 0)",
                                height: "100%",
                                "max-height": "calc(100vh - 200px)",
                                "max-width": "1200px",
                                width: "100%",
                                "z-index": 10,
                                opacity: "1",
                            }}
                        >
                            <Comp />
                        </div>
                    )}
                </Show>
            </Transition>

            <div class="s-footer">
                <div class="__container">
                    <div class="__item">
                        {status().lessons?.current && (
                            <div class="pr-couple">
                                <span class="__icon" style="background-image: linear-gradient(135deg, rgb(30, 175, 178), rgb(30, 179, 158));">
                                    <Icon icon="mdi:clock-outline" width="24" height="24"></Icon>
                                </span>
                                <span class="__content">
                                    <span class="__title">Current Lesson</span>
                                    <span class="__body">{status().lessons.current.teaching_group.subject} - {status().lessons.current.teaching_group.name}</span>
                                    <span class="__footer">
                                        {status().lessons.current.room.name} / {
                                            Array.isArray(status().lessons.current.teachers)
                                                ? status().lessons.current.teachers.map((t: string) => t).join(", ")
                                                : status().lessons.current.teachers || ""
                                        }
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                    <div class="__item">
                        {status().lessons?.next && (
                            <div class="pr-couple">
                                <span class="__icon" style="background-image: linear-gradient(to top left, #ebb326, #eb9e3d);">
                                    <Icon icon="streamline:fastforward-clock-remix" width="20" height="20"></Icon>
                                </span>
                                <span class="__content">
                                    <span class="__title">Next Lesson</span>
                                    <span class="__body">{status().lessons.next.teaching_group.subject} - {status().lessons.next.teaching_group.name}</span>
                                    <span class="__footer">
                                        {status().lessons.next.room.name} / {
                                            Array.isArray(status().lessons.next.teachers)
                                                ? status().lessons.next.teachers.map((t: string) => t).join(", ")
                                                : status().lessons.next.teachers || ""
                                        }
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                    <div class="__item">
                        <div class="pr-couple">
                            <span class="__icon" style="background-image: linear-gradient(135deg, rgb(253, 107, 92), rgb(235, 87, 86));">
                                <Icon icon="ic:outline-email" width="24" height="24"></Icon>
                            </span>
                            <span class="__content">
                                <span class="__title">Messages</span>
                                <span class="__body">{status().new_messages || 0} new message</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Main;