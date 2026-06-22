"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '../../../UserContext';
import { Ticket } from '../../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTicketAlt, 
    faSearch,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const SWIPE_THRESHOLD = -60;

export default function MyTicketsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        admin,
        tickets: allTickets,
        fetchAllTickets,
        setAdmin,
        setUsers,
        setTickets,
        setLoggedInAdmin,
    } = useUser();

    const [localAdmin, setLocalAdmin] = useState<string | null>(null);
    const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);
    const [hiddenTicketIds, setHiddenTicketIds] = useState<Set<string>>(new Set());
    const [swipedTicketId, setSwipedTicketId] = useState<string | null>(null);
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const touchStartX = useRef(0);
    const touchCurrentId = useRef<string | null>(null);

    // Restore hidden tickets from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem("hiddenTickets");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setHiddenTicketIds(new Set(parsed));
            }
        } catch (e) {}
    }, []);

    // Sync hidden tickets to localStorage
    useEffect(() => {
        localStorage.setItem("hiddenTickets", JSON.stringify(Array.from(hiddenTicketIds)));
    }, [hiddenTicketIds]);

    // Handle revealAll from URL param (set by Manage page)
    useEffect(() => {
        if (searchParams.get('revealAll') === '1') {
            localStorage.removeItem("hiddenTickets");
            setHiddenTicketIds(new Set());
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [searchParams]);

    const handleTouchStart = useCallback((ticketId: string, e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchCurrentId.current = ticketId;
        setIsSwiping(true);
        setSwipedTicketId(ticketId);
        setSwipeX(0);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isSwiping || !swipedTicketId) return;
        const dx = e.touches[0].clientX - touchStartX.current;
        if (dx > 0 && swipeX === 0) return;
        setSwipeX(Math.max(dx, -80));
    }, [isSwiping, swipedTicketId, swipeX]);

    const handleTouchEnd = useCallback(() => {
        setIsSwiping(false);
        if (swipeX < SWIPE_THRESHOLD) {
            setSwipeX(-80);
        } else {
            setSwipedTicketId(null);
            setSwipeX(0);
            touchCurrentId.current = null;
        }
    }, [swipeX]);

    const handleHideConfirm = useCallback((ticketId: string) => {
        const next = new Set(hiddenTicketIds);
        next.add(ticketId);
        setHiddenTicketIds(next);
        setSwipedTicketId(null);
        setSwipeX(0);
        touchCurrentId.current = null;
    }, [hiddenTicketIds]);

    const handleSnapBack = useCallback(() => {
        setSwipedTicketId(null);
        setSwipeX(0);
        touchCurrentId.current = null;
    }, []);

    useEffect(() => {
        const adminToken = localStorage.getItem("adminToken");
        if (!adminToken) {
            router.replace('/login');
            return;
        }
        setIsSessionValid(true);
        const adminUsername = localStorage.getItem("loggedInAdmin");
        const adminData = localStorage.getItem('adminData');
        if (adminUsername && adminData) {
            try {
                const parsedAdminData = JSON.parse(adminData);
                setAdmin(parsedAdminData);
                setLoggedInAdmin(adminUsername);
                setLocalAdmin(adminUsername);
                fetchAllTickets();
            } catch (e) {
                console.error("Error parsing admin data", e);
            }
        } else if (admin) {
            setLocalAdmin(admin.username || admin.adminId);
            fetchAllTickets();
        }
    }, [setAdmin, router, fetchAllTickets, setLoggedInAdmin]);


    useEffect(() => {
        if (isSessionValid === true && localAdmin && Array.isArray(allTickets)) {
            const filtered = allTickets.filter((t) => {
                const matchesAdmin = t.admin === localAdmin;
                const isNotDeleted = !t.deletedSTAMP || t.deletedSTAMP.trim() === "";
                const platformList = t.platform?.toLowerCase().split(',').map(p => p.trim()) || [];
                const matchesPlatform = platformList.includes("ticketmaster");

                if (!matchesAdmin || !isNotDeleted || !matchesPlatform) return false;
                if (hiddenTicketIds.has(t.ticketId)) return false;

                if (activeTab === 'upcoming') {
                    return t.eventStatus === 'ACTIVE' || t.eventStatus === 'WAITING';
                } else {
                    return t.eventStatus === 'PAST';
                }
            });
            setFilteredTickets(filtered);
        }
    }, [allTickets, localAdmin, isSessionValid, activeTab, hiddenTicketIds]);

    if (isSessionValid === null) return null;

    const isOpen = (ticketId: string) => swipedTicketId === ticketId && swipeX === -80;

    return (
        <div className="flex-1 flex flex-col bg-white min-h-full pb-[100px]">
            {/* Tabs */}
            <div className="flex bg-[#1F1F1F] border-b border-white/5 sticky top-[72px] z-40">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex-1 py-4 font-black text-[12px] uppercase tracking-[0.1em] transition-all border-b-[3px] whitespace-nowrap ${activeTab === 'upcoming' ? 'border-white text-white' : 'border-transparent text-white/40'}`}
                >
                    Upcoming ({activeTab === 'upcoming' ? filteredTickets.length : '?'})
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`flex-1 py-4 font-black text-[12px] uppercase tracking-[0.1em] transition-all border-b-[3px] whitespace-nowrap ${activeTab === 'past' ? 'border-white text-white' : 'border-transparent text-white/40'}`}
                >
                    Past (0)
                </button>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4 space-y-4">
                {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket, i) => (
                        <div key={i} className="relative overflow-hidden">
                            {/* Hide? button behind the card */}
                            {isOpen(ticket.ticketId) && (
                                <div className="absolute inset-y-0 right-0 w-[80px] flex items-center justify-center bg-red-500 rounded-none z-0">
                                    <button
                                        onClick={() => handleHideConfirm(ticket.ticketId)}
                                        className="text-white font-black text-xs uppercase tracking-widest"
                                    >
                                        Hide?
                                    </button>
                                </div>
                            )}
                            {/* Swipeable card */}
                            <div
                                className="relative z-10"
                                style={{
                                    transform: `translateX(${swipedTicketId === ticket.ticketId ? swipeX : 0}px)`,
                                    transition: isSwiping ? 'none' : 'transform 0.25s ease',
                                    touchAction: 'pan-y',
                                }}
                                onTouchStart={(e) => handleTouchStart(ticket.ticketId, e)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                {isOpen(ticket.ticketId) ? (
                                    <div
                                        onClick={handleSnapBack}
                                        className="block bg-white rounded-none overflow-hidden shadow-md cursor-pointer"
                                    >
                                        {/* Hero Image Section */}
                                        <div className="relative w-full aspect-[16/10] bg-black">
                                            {ticket.coverImage && (
                                                <img 
                                                    src={ticket.coverImage} 
                                                    alt={ticket.eventName} 
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            <div className="absolute bottom-0 left-0 bg-[#1F1F1F] px-4 py-2">
                                                <p className="text-white text-[11px] font-black uppercase tracking-[0.1em]">
                                                    {ticket.dateTime || 'FRI • JUL 17, 2026 • 7:30 PM'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-[#1F1F1F] p-5 text-white">
                                            <h2 className="text-2xl font-black leading-tight uppercase mb-3 tracking-tighter border-b-2 border-white/20 pb-2 inline-block">
                                                {ticket.eventName}
                                            </h2>
                                            <div className="flex justify-between items-end mt-2">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-white/60">{ticket.venue}</p>
                                                    <p className="text-sm font-bold text-white/60">{ticket.location}</p>
                                                </div>
                                                <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                                    <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M0 6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2V6z" />
                                                        <path d="M14 4h4a2 2 0 012 2v8a2 2 0 01-2 2h-4V4z" />
                                                    </svg>
                                                    <span className="text-xs font-black">x{ticket.seatNumbers?.split(',').length || 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Link 
                                        href={`/secure/myaccount/tickets/${ticket.ticketId}`}
                                        className="block bg-white rounded-none overflow-hidden shadow-md active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                        <div className="relative w-full aspect-[16/10] bg-black">
                                            {ticket.coverImage && (
                                                <img 
                                                    src={ticket.coverImage} 
                                                    alt={ticket.eventName} 
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            <div className="absolute bottom-0 left-0 bg-[#1F1F1F] px-4 py-2">
                                                <p className="text-white text-[11px] font-black uppercase tracking-[0.1em]">
                                                    {ticket.dateTime || 'FRI • JUL 17, 2026 • 7:30 PM'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-[#1F1F1F] p-5 text-white">
                                            <h2 className="text-2xl font-black leading-tight uppercase mb-3 tracking-tighter border-b-2 border-white/20 pb-2 inline-block">
                                                {ticket.eventName}
                                            </h2>
                                            <div className="flex justify-between items-end mt-2">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-white/60">{ticket.venue}</p>
                                                    <p className="text-sm font-bold text-white/60">{ticket.location}</p>
                                                </div>
                                                <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                                    <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M0 6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2V6z" />
                                                        <path d="M14 4h4a2 2 0 012 2v8a2 2 0 01-2 2h-4V4z" />
                                                    </svg>
                                                    <span className="text-xs font-black">x{ticket.seatNumbers?.split(',').length || 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FontAwesomeIcon icon={faTicketAlt} className="text-3xl text-gray-400" />
                        </div>
                        <h3 className="text-xl font-black text-[#1F1F1F] mb-2">No upcoming purchases</h3>
                        <p className="text-gray-400 font-bold mb-8 px-10">Find your next live experience today!</p>
                        <button 
                            onClick={() => router.push('/')}
                            className="bg-[#026CDF] text-white px-10 py-3 rounded-md font-black text-xs uppercase tracking-widest shadow-lg"
                        >
                            Browse Events
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
