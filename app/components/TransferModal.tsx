"use client";

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, 
    faChevronLeft,
    faChevronRight,
    faCheckCircle, 
    faInfoCircle,
    faTag
} from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../UserContext';
import { Ticket } from '../types';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket | null;
}

type ViewState = 'select' | 'form' | 'success';

export default function TransferModal({ isOpen, onClose, ticket }: TransferModalProps) {
    const { admin, fetchAllUsers } = useUser();
    const [view, setView] = useState<ViewState>('select');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        recipient: '',
        note: ''
    });

    const [applePayNumber, setApplePayNumber] = useState('');
    const [paypalLink, setPaypalLink] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [btcWallet, setBtcWallet] = useState('');
    const [ethWallet, setEthWallet] = useState('');
    const [trcWallet, setTrcWallet] = useState('');
    const [usdtWallet, setUsdtWallet] = useState('');

    useEffect(() => {
        if (isOpen) {
            setView('select');
            setSelectedSeats([]);
            setError(null);
            setFormData({
                firstName: '',
                lastName: '',
                recipient: '',
                note: ''
            });
        }
    }, [isOpen]);

    if (!isOpen || !ticket) return null;

    const seats = ticket.seatNumbers ? ticket.seatNumbers.split(',').map(s => s.trim()).filter(Boolean) : [ticket.seat || '1'];

    const toggleSeat = (seat: string) => {
        setSelectedSeats(prev => 
            prev.includes(seat) ? prev.filter(s => s !== seat) : [...prev, seat]
        );
    };

    const handleTransfer = async () => {
        if (!admin) return;
        setLoading(true);
        setError(null);

        const POST_URL = process.env.NEXT_PUBLIC_APP_SCRIPT_URL || "";

        try {
            const payload = new URLSearchParams();
            payload.append('action', 'transferTicket');
            payload.append('fullName', `${formData.firstName} ${formData.lastName}`);
            payload.append('emailAddress', formData.recipient);
            payload.append('phoneNumber', '');
            payload.append('transferringSeatNumbers', selectedSeats.join(', '));
            payload.append('ticketId', ticket.ticketId);
            payload.append('admin', admin.username);
            payload.append('senderName', admin.accountName || admin.username);
            payload.append('senderEmail', admin.accountEmail || 'user@virtualmail.com');
            payload.append('userPlatform', 'ticketmaster');
            payload.append('sendType', 'auto');
            payload.append('note', formData.note);
            payload.append('token', crypto.randomUUID());

            let paymentSettingsObj: any = null;
            if (applePayNumber || paypalLink || btcWallet || ethWallet || trcWallet || usdtWallet) {
                paymentSettingsObj = {};
                if (applePayNumber) paymentSettingsObj.applePayNumber = applePayNumber;
                if (paypalLink) paymentSettingsObj.paypal = paypalLink;
                if (btcWallet || ethWallet || trcWallet || usdtWallet) {
                    paymentSettingsObj.cryptoWallets = {};
                    if (btcWallet) paymentSettingsObj.cryptoWallets.btc = btcWallet;
                    if (ethWallet) paymentSettingsObj.cryptoWallets.eth = ethWallet;
                    if (trcWallet) paymentSettingsObj.cryptoWallets.trc = trcWallet;
                    if (usdtWallet) paymentSettingsObj.cryptoWallets.usdt = usdtWallet;
                }
            }

            if (paymentSettingsObj) {
                payload.append('paymentSettings', JSON.stringify(paymentSettingsObj));
            }

            if (paymentAmount) {
                payload.append('paymentAmount', paymentAmount);
            }

            const response = await fetch(POST_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: payload.toString()
            });

            console.log('TransferModal payload:', Object.fromEntries(payload.entries()));
            const result = await response.json();
            console.log('TransferModal response:', result);
            if (result.success) {
                fetchAllUsers();
                setView('success');
            } else {
                setError(result.error || 'Transfer failed');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Modal Container */}
            <div className={`w-full max-w-lg bg-white rounded-t-[20px] shadow-2xl transition-transform duration-500 ease-out overflow-hidden flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-center items-center relative">
                    <h2 className="text-[12px] font-black text-[#1F1F1F] uppercase tracking-widest">
                        {view === 'select' && 'Select Tickets to Transfer'}
                        {view === 'form' && 'Transfer Tickets'}
                        {view === 'success' && 'Success'}
                    </h2>
                    <button onClick={onClose} className="absolute right-6 text-gray-400 hover:text-black">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto max-h-[85vh]">
                    
                    {/* View: Selection */}
                    {view === 'select' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-300">
                            {/* Safety Banner */}
                            <div className="px-6 py-4 flex items-start space-x-4 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white shrink-0">
                                    <FontAwesomeIcon icon={faInfoCircle} className="text-xl" />
                                </div>
                                <p className="text-sm font-bold text-[#1F1F1F] leading-tight pt-1">
                                    Only transfer tickets to people you know and trust to ensure everyone stays safe
                                </p>
                            </div>

                            {/* Ticket Info */}
                            <div className="px-6 py-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-black text-[#1F1F1F]">
                                        Sec {ticket.section}, Row {ticket.row}
                                    </h3>
                                    <div className="flex items-center space-x-2">
                                        <FontAwesomeIcon icon={faTag} className="text-gray-300 rotate-[-45deg]" />
                                        <span className="text-sm font-black text-[#1F1F1F]">{seats.length} tickets</span>
                                    </div>
                                </div>

                                {/* Seat Selection List */}
                                <div className="flex space-x-4 overflow-x-auto pb-8 scrollbar-hide px-2">
                                    {seats.map((seat, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => toggleSeat(seat)}
                                            className="shrink-0 w-[110px] bg-white rounded-xl shadow-[0_8px_25px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden group active:scale-95 transition-all"
                                        >
                                            <div className={`py-2 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${selectedSeats.includes(seat) ? 'bg-[#026CDF] text-white' : 'bg-[#E5E7EB] text-gray-500'}`}>
                                                Seat {seat}
                                            </div>
                                            <div className="py-6 flex justify-center">
                                                <div className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${selectedSeats.includes(seat) ? 'border-[#026CDF] bg-[#026CDF]' : 'border-gray-200 bg-white'}`}>
                                                    {selectedSeats.includes(seat) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Recipient Form */}
                    {view === 'form' && (
                        <div className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-lg font-black text-[#1F1F1F] mb-1">{selectedSeats.length} Tickets Selected</h3>
                                <p className="text-xs font-bold text-gray-400">
                                    Sec {ticket.section} Row {ticket.row} Seat {selectedSeats.join(', ')}
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-[#1F1F1F] uppercase tracking-widest">First Name</label>
                                    <input 
                                        type="text"
                                        placeholder="First Name"
                                        className="w-full p-4 bg-white border border-gray-200 rounded-md text-sm font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-[#1F1F1F] uppercase tracking-widest">Last Name</label>
                                    <input 
                                        type="text"
                                        placeholder="Last Name"
                                        className="w-full p-4 bg-white border border-gray-200 rounded-md text-sm font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-[#1F1F1F] uppercase tracking-widest">Email or Mobile Number</label>
                                    <input 
                                        type="text"
                                        placeholder="Email or Mobile Number"
                                        className="w-full p-4 bg-white border border-gray-200 rounded-md text-sm font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]"
                                        value={formData.recipient}
                                        onChange={(e) => setFormData({...formData, recipient: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-[#1F1F1F] uppercase tracking-widest">Note</label>
                                    <textarea 
                                        placeholder="Note"
                                        className="w-full p-4 bg-white border border-gray-200 rounded-md text-sm font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF] h-24 resize-none"
                                        value={formData.note}
                                        onChange={(e) => setFormData({...formData, note: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Payment Configuration */}
                            {admin && admin.allowPayment === 'TRUE' && (
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-[11px] font-black text-[#1F1F1F] uppercase tracking-widest">Payment Configuration (Optional)</h4>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Apple Pay Number</label>
                                            <input type="text" value={applePayNumber} onChange={(e) => setApplePayNumber(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-md text-sm font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]" placeholder="e.g. +1234567890" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">PayPal (paypal.me link)</label>
                                            <input type="text" value={paypalLink} onChange={(e) => setPaypalLink(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-md text-sm font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]" placeholder="e.g. paypal.me/username" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BTC Wallet</label>
                                                <input type="text" value={btcWallet} onChange={(e) => setBtcWallet(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-md text-xs font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]" placeholder="BTC" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ETH Wallet</label>
                                                <input type="text" value={ethWallet} onChange={(e) => setEthWallet(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-md text-xs font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]" placeholder="ETH" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TRC Wallet</label>
                                                <input type="text" value={trcWallet} onChange={(e) => setTrcWallet(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-md text-xs font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]" placeholder="TRC" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">USDT Wallet</label>
                                                <input type="text" value={usdtWallet} onChange={(e) => setUsdtWallet(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-md text-xs font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]" placeholder="USDT" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Payment Amount (per ticket)</label>
                                            <input type="text" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-md text-sm font-bold text-[#1F1F1F] placeholder:text-gray-400 outline-none focus:border-[#026CDF]" placeholder="e.g. 150.00" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View: Success */}
                    {view === 'success' && (
                        <div className="py-20 text-center animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-4xl" />
                            </div>
                            <h3 className="text-2xl font-black text-[#1F1F1F] mb-2">Transfer Sent!</h3>
                            <p className="text-gray-400 font-bold px-12">
                                Your tickets have been sent to {formData.firstName} {formData.lastName}.
                            </p>
                            <button 
                                onClick={onClose}
                                className="mt-10 px-12 py-3 bg-[#1F1F1F] text-white rounded-md font-black text-sm uppercase tracking-widest"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {view !== 'success' && (
                    <div className="px-6 py-6 border-t border-gray-100 bg-white">
                        {view === 'select' ? (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-500">
                                    {selectedSeats.length} Selected
                                </span>
                                <button 
                                    onClick={() => selectedSeats.length > 0 && setView('form')}
                                    disabled={selectedSeats.length === 0}
                                    className={`text-[12px] font-black uppercase tracking-widest flex items-center transition-colors ${selectedSeats.length > 0 ? 'text-[#026CDF]' : 'text-gray-300'}`}
                                >
                                    Transfer To <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => setView('select')}
                                    className="text-[11px] font-black text-[#026CDF] uppercase tracking-widest flex items-center"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} className="mr-2" /> Back
                                </button>
                                <button 
                                    onClick={handleTransfer}
                                    disabled={loading || !formData.recipient || !formData.firstName}
                                    className="bg-[#026CDF] text-white px-8 py-3 rounded-md font-black text-[12px] uppercase tracking-widest shadow-lg shadow-[#026CDF]/20 disabled:opacity-50 transition-all flex items-center"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        `Transfer ${selectedSeats.length} Tickets`
                                    )}
                                </button>
                            </div>
                        )}
                        {error && <p className="mt-4 text-[10px] font-bold text-red-500 text-center">{error}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
