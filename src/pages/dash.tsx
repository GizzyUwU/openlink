import "../assets/css/main.css";
import { HiOutlineCog6Tooth, HiOutlineClock, HiSolidLink } from 'solid-icons/hi'
import { AiOutlineLineChart, AiOutlineFileText, AiOutlineTrophy, AiOutlineForm } from 'solid-icons/ai'
import { TbCertificate } from 'solid-icons/tb'
import { RiSystemErrorWarningLine } from 'solid-icons/ri'
import { IoBriefcaseOutline } from 'solid-icons/io'
import { FaSolidPersonRunning } from 'solid-icons/fa'
import { VsAccount } from 'solid-icons/vs'
import { Icon } from '@iconify-icon/solid';
import { makePersisted } from "@solid-primitives/storage";
import { createEffect, createSignal } from "solid-js";
import { useEdulink } from "../api/edulink";
import { Show } from "solid-js";

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

    // createEffect(() => {
    //     if (!sessionData() || !apiUrl()) {
    //         setSession(null);
    //         setApiUrl(null);
    //         throw navigate("/");
    //     }

    //     const fetchStatus = async () => {
    //         const result = await edulink.getStatus(sessionData()?.authtoken, apiUrl());
    //         if (result.result.success) {
    //             setStatus(result.result);
    //         } else {
    //             setSession(null);
    //             setApiUrl(null);
    //             throw navigate("/");
    //         }
    //     };

    //     fetchStatus();
    //     const checkStatus = setInterval(fetchStatus, 60 * 1000);
    //     onCleanup(() => clearInterval(checkStatus));
    // });

    function loadItemPage(page: string) {
        // Remove any previous box
        const prev = document.getElementById('item-page-box');
        if (prev) prev.remove();
        
        // Create the box
        const box = document.createElement('div');
        box.id = 'item-page-box';
        Object.assign(box.style, {
            position: 'absolute',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%) scale(0)',
            height: 'calc(100vh - 200px)',
            maxWidth: '1200px',
            width: '100%',
            background: '#fff',
            borderRadius: '24px',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.10)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            opacity: '0',
            // Performance optimizations
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden'
        });
        
        // Add content (page name for now)
        const label = document.createElement('span');
        label.textContent = page;
        label.style.color = '#222';
        label.style.fontSize = '2rem';
        label.style.fontWeight = '600';
        box.appendChild(label);
        
        // Insert into container
        const container = document.querySelector('.container');
        if (container) container.appendChild(box);
        
        // Start grow animation after nav wheel slide animation finishes (1.2s)
        setTimeout(() => {
            // Use CSS animation instead of transitions
            box.style.animation = 'growIn 0.7s ease-out forwards';
        }, 1200);
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
        if (isSlid()) {
            updateSlideX();
            setLogoOpacity(0);
            setIconOpacities(Array(items.length).fill(0));
            setTimeout(() => setIsLogoGone(true), 1200);
            const handler = () => updateSlideX();
            window.addEventListener('resize', handler);
            return () => window.removeEventListener('resize', handler);
        } else {
            setSlideX(0);
            setIsLogoGone(false);
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
        const showBack = isSlid() && isActive && showBackIcon();
        return (
            <li class="__item" style={getItemStyle(x, y)}>
                <div class="__inner">
                    <a
                        class={`__item-link ${item.class}`}
                        href={`/dash/#${item.id}`}
                        title={item.name}
                        onClick={e => {
                            e.preventDefault();
                            console.log(item.name)
                            
                            if (isSlid() && isActive) {
                                setIsAnimating(false);
                                setIsSlid(false);
                                setActiveIdx(null);
                                const prev = document.getElementById('item-page-box');
                                if (prev) prev.remove();
                            } else {
                                setActiveIdx(i);
                                setIsAnimating(true);
                                setIsSlid(true);
                                spinToIndex(i);
                                // Load item page - animation will start after nav wheel finishes
                                loadItemPage(item.name);
                            }
                        }}
                    >
                        {!isLogoGone() ? (
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
            <div id="item-page-box" class="__item-page-box">
            </div>
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