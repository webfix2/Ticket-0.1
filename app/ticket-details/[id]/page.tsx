'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faClock, faInfoCircle, faTicketAlt, faUser, faCalendarAlt, faChair, faIdCard, faCheckCircle, faBell, faTimesCircle, faWallet, faMobileAlt, faCopy, faChevronDown, faChevronUp, faMoneyBillWave, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
const APP_SCRIPT_POST_URL = process.env.NEXT_PUBLIC_APP_SCRIPT_URL || "";
const APP_SCRIPT_URL = process.env.NEXT_PUBLIC_APP_SCRIPT_URL || "";
const APP_SCRIPT_ADMIN_URL = APP_SCRIPT_URL + "?sheetname=admin";

export default function TicketDetails() {
    const router = useRouter();
    const [approvalStatus, setApprovalStatus] = useState('pending');
    const [pageReady, setPageReady] = useState(false);
    const initialStatusSet = useRef(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const params = useParams();
    const searchParams = useSearchParams();
    const token = params.id as string;
    const queryToken = searchParams.get('token');
    const [user, setUser] = useState<any | null>(null);
    const [adminInfo, setAdminInfo] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
    const [copiedText, setCopiedText] = useState('');
    const [currentSeatIndex, setCurrentSeatIndex] = useState(0);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    useEffect(() => {
        // Token is required - either from path param or query param
        const actualToken = queryToken || token;
        if (!actualToken) {
            router.push('/invalid');
            return;
        }

        const fetchAndSetUser = async () => {
            setLoading(true);
            try {
                // Look up user by token via GAS
                const payload = new URLSearchParams();
                payload.append("action", "getUserByToken");
                payload.append("token", actualToken);
                const response = await fetch(APP_SCRIPT_POST_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: payload.toString()
                });
                const data = await response.json();

                if (data.success && data.user) {
                    const fetchedUser = data.user;
                    // Sheets returns numbers for some string fields — coerce them
                    fetchedUser.sectionNo = String(fetchedUser.sectionNo ?? '');
                    fetchedUser.row = String(fetchedUser.row ?? '');
                    fetchedUser.seatNumbers = String(fetchedUser.seatNumbers ?? '');
                    fetchedUser.userId = String(fetchedUser.userId ?? '');
                    fetchedUser.section = String(fetchedUser.section ?? '');
                    fetchedUser.gate = String(fetchedUser.gate ?? '');
                    fetchedUser.entrance = String(fetchedUser.entrance ?? '');
                    setUser(fetchedUser);
                    
                    // Fetch admin who transferred this ticket
                    if (fetchedUser.admin && APP_SCRIPT_ADMIN_URL) {
                        const adminResponse = await fetch(`${APP_SCRIPT_ADMIN_URL}`);
                        const admins = await adminResponse.json();
                        const relevantAdmin = admins.find((a: any) => a.username === fetchedUser.admin);
                        if (relevantAdmin) {
                            setAdminInfo(relevantAdmin);
                        }
                    }
                } else {
                    router.push('/invalid');
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                router.push('/invalid');
            } finally {
                setLoading(false);
            }
        };
        fetchAndSetUser();
    }, [token, queryToken, router]);

    useEffect(() => {
      if (user && !loading) {
          if (
              user.systemStatus === "DECLINED" ||
              user.systemStatus === "RETRACTED" ||
              user.systemStatus === "CANCELLED"
          ) {
              router.push(`/invalid?platform=${user.userPlatform || 'ticketmaster'}`);
              return;
          }
  
          if (user.systemStatus === "WAITING APPROVAL") {
              setApprovalStatus("pending");
          } else if (
              user.systemStatus === "WAITING COMPLETION" ||
              user.systemStatus === "COMPLETED"
          ) {
              setApprovalStatus("approved");
          }
  
          setPageReady(true);
          initialStatusSet.current = true;
      }
   }, [user, router, loading]);
  
    const handleAcceptTicket = useCallback(() => {
        if (user?.approvalSTAMP) return;

        setIsActionLoading(true);
        setApprovalStatus('processing');

        const currentDate = new Date().toISOString();
        let payload = new URLSearchParams();
        payload.append("action", "ticketApproval");
        payload.append("userId", user?.userId as string);
        payload.append("approvalSTAMP", currentDate);

        fetch(APP_SCRIPT_POST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload.toString()
        }).then(() => {
            setTimeout(() => {
                setApprovalStatus('approved');
                setIsActionLoading(false);
            }, 10000);
        }).catch(error => {
            console.error("Error accepting ticket:", error);
            setApprovalStatus('pending');
            setIsActionLoading(false);
        });
    }, [user]);

    const handleDeclineTransfer = useCallback(() => {
        if (user?.approvalSTAMP) return;

        setIsActionLoading(true);
        setApprovalStatus('processing');

        let payload = new URLSearchParams();
        payload.append("action", "ticketApproval");
        payload.append("userId", user?.userId as string);
        payload.append("approvalSTAMP", "DECLINED");

        fetch(APP_SCRIPT_POST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload.toString()
        }).then(() => {
            setTimeout(() => {
                setApprovalStatus('declined');
                setIsActionLoading(false);
            }, 10000);
        }).catch(error => {
            console.error("Error declining ticket:", error);
            setApprovalStatus('pending');
            setIsActionLoading(false);
        });
    }, [user]);

    const copyToClipboard = useCallback((text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(''), 2000);
    }, []);

    const handlePaymentConfirmation = useCallback(() => {
        if (paymentConfirmed || paymentLoading) return;
        setPaymentLoading(true);
        const payload = new URLSearchParams();
        payload.append('action', 'paymentConfirmation');
        payload.append('userId', user?.userId as string);
        payload.append('paymentSTAMP', new Date().toISOString());
        fetch(APP_SCRIPT_POST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString()
        }).then(() => {
            setPaymentConfirmed(true);
            setPaymentLoading(false);
        }).catch(error => {
            console.error('Error confirming payment:', error);
            setPaymentLoading(false);
        });
    }, [user, paymentConfirmed, paymentLoading]);

    if (!pageReady) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#026CDF]"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
                    <p className="text-gray-600">Please sign in to view ticket details.</p>
                </div>
            </div>
        );
    }

    const isTicketProcessed = approvalStatus === 'approved' || approvalStatus === 'declined';

    const seatStr = String(user.seatNumbers ?? '');
    const seatsArr = seatStr ? seatStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const seatsCount = seatsArr.length;

    return (
      <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[400px]">
        <Image
          src={user.coverImage || "https://placehold.co/1200x600/026CDF/FFFFFF?text=Event+Image"}
          alt={user.eventName}
          fill
          style={{ objectFit: 'cover' }}
          priority
          unoptimized={true}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="inline-block bg-[#F5A623] text-[#001B41] px-3 py-1 rounded-full text-sm font-bold mb-3">
            Ticket Transfer
          </div>
          <h1 className="text-4xl font-bold mb-2">{user.eventName}</h1>
          <div className="flex items-center space-x-2 text-lg">
            <FontAwesomeIcon icon={faMapMarkerAlt} />
            <span>{user.venue}, {user.location}</span>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <FontAwesomeIcon icon={faCalendarAlt} />
            <span>{new Date(user.dateTime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2">
            {/* Ticket Approval Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Ticket Transfer Details</h2>

              {isTicketProcessed ? (
                <div className={`mb-6 p-4 ${
                  approvalStatus === 'approved' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                } rounded-lg`}>
                  <div className="flex items-start">
                    <div className={`rounded-full p-3 mr-4 ${
                      approvalStatus === 'approved' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <FontAwesomeIcon 
                        icon={approvalStatus === 'approved' ? faCheckCircle : faTimesCircle} 
                        className="text-xl" 
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {approvalStatus === 'approved' ? 'Ticket Accepted' : 'Ticket Declined'}
                      </h3>
                      <p className={`${
                        approvalStatus === 'approved' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {user.messageStatus || (
                          approvalStatus === 'approved' 
                            ? 'You have successfully accepted this ticket. It is now available in your account.' 
                            : 'You have declined this ticket transfer. The ticket has been returned to the sender.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="bg-[#026CDF] rounded-full p-3 mr-4">
                      <FontAwesomeIcon icon={faTicketAlt} className="text-white text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">Ticket Transfer</h3>
                      <p className="text-gray-600">
                        {approvalStatus === 'processing'
                          ? 'Processing your request...'
                          : 'This ticket has been transferred to you. Accept to add it to your account.'}
                      </p>
                    </div>
                  </div>
                  
                  {approvalStatus === 'pending' && (
                    <div className="flex space-x-4">
                      <button 
                          onClick={handleAcceptTicket}
                          className="flex-1 bg-[#026CDF] text-white py-3 rounded-lg font-semibold hover:bg-[#0256b3] transition-colors"
                          disabled={isActionLoading}
                      >
                          {isActionLoading ? 'Processing...' : 'Accept Transfer'}
                      </button>
                      <button 
                          onClick={handleDeclineTransfer}
                          className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                          disabled={isActionLoading}
                      >
                          Decline
                      </button>
                    </div>
                  )}
                  
                  {approvalStatus === 'processing' && (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#026CDF] mr-3"></div>
                      <p>Processing your request...</p>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">From:</h3>
                  <div className="flex items-center">
                    <div className="bg-gray-200 rounded-full p-2 mr-3">
                      <FontAwesomeIcon icon={faUser} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{user.senderName || "John Doe"}</p>
                      <p className="text-sm text-gray-600">{user.senderEmail || "john.doe@example.com"}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">To:</h3>
                  <div className="flex items-center">
                    <div className="bg-gray-200 rounded-full p-2 mr-3">
                      <FontAwesomeIcon icon={faUser} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-sm text-gray-600">{user.emailAddress}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Event Information:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <FontAwesomeIcon icon={faClock} className="text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="font-medium">Door Time</p>
                          <p className="text-gray-600">{user.doorTime}</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <FontAwesomeIcon icon={faIdCard} className="text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="font-medium">Age Restriction</p>
                          <p className="text-gray-600">{user.ageRestriction || "All Ages"}</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Ticket Information:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <FontAwesomeIcon icon={faChair} className="text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="font-medium">Section</p>
                          <p className="text-gray-600">{user.section} {user.sectionNo}</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <FontAwesomeIcon icon={faChair} className="text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="font-medium">Row</p>
                          <p className="text-gray-600">{user.row}</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <FontAwesomeIcon icon={faChair} className="text-gray-500 mt-1 mr-2" />
                        <div>
                          <p className="font-medium">Seat(s)</p>
                          <p className="text-gray-600">{user.seatNumbers}</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {user.description && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Event Description:</h3>
                    <p className="text-gray-600">{user.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Ticket Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-24">
              <div className="bg-[#026CDF] text-white p-4">
                <h2 className="text-xl font-bold">Ticket Preview</h2>
              </div>

              <div className="p-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  {/* Ticket Header */}
                  <div className="bg-[#001B41] text-white p-4 text-center">
                    <div className="text-lg font-bold">ticketmaster</div>
                  </div>

                  {/* Event Info */}
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-bold text-lg mb-1">{user.eventName}</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {new Date(user.dateTime).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-gray-600 text-sm">{user.venue}, {user.location}</p>
                  </div>

                  {/* Slidable Seat Info & Barcode Area */}
                  <div className="relative overflow-hidden">
                     <div 
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${currentSeatIndex * 100}%)` }}
                     >
                        {(seatsArr.length ? seatsArr : [String(user.seatNumbers ?? '')]).map((seatNum: string, idx: number) => (
                           <div key={idx} className="min-w-full">
                              <div className="p-4 grid grid-cols-2 gap-2 text-center border-b border-gray-200">
                                <div className="border-r border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase">Section</p>
                                  <p className="font-bold">{user.section} {user.sectionNo}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase">Row</p>
                                  <p className="font-bold">{user.row}</p>
                                </div>
                                <div className="border-r border-gray-200 pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase text-[#026CDF]">Seat</p>
                                  <p className="font-bold text-[#026CDF]">{seatNum.trim()}</p>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 uppercase">Ticket</p>
                                  <p className="font-bold text-gray-500">{idx + 1} of {seatsCount || 1}</p>
                                </div>
                              </div>

                              <div className="p-4">
                                {approvalStatus === 'approved' ? (
                                  <div className="bg-white border border-gray-200 p-4 flex flex-col items-center justify-center space-y-4">
                                    <div className="text-center">
                                      <div className="text-sm font-bold mb-1">TICKET SECURED</div>
                                      <div className="text-xs text-gray-500 font-mono">#{user.userId?.substring(0, 8).toUpperCase()}-{idx + 1}</div>
                                    </div>
                                    <div className="w-full flex justify-center space-x-0.5 h-12 mb-3">
                                       {Array.from({length: 35}).map((_, i) => (
                                          <div key={i} className={`h-full bg-gray-900`} style={{width: `${Math.random() * 3 + 1}px`, opacity: Math.random() > 0.5 ? 1 : 0.4}}></div>
                                       ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-200 h-24 flex items-center justify-center border border-gray-200 border-dashed rounded-lg">
                                    <p className="text-gray-500 text-xs text-center px-4 uppercase tracking-widest font-bold">Awaiting Approval</p>
                                  </div>
                                )}
                              </div>
                           </div>
                        ))}
                     </div>
                     
                     {/* Navigation Arrows */}
                     {seatsCount > 1 && (
                        <>
                           {currentSeatIndex > 0 && (
                              <button 
                                 onClick={() => setCurrentSeatIndex(prev => prev - 1)}
                                 className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center text-[#001B41] z-10 border border-gray-200"
                              >
                                 <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                              </button>
                           )}
                           {currentSeatIndex < seatsCount - 1 && (
                              <button 
                                 onClick={() => setCurrentSeatIndex(prev => prev + 1)}
                                 className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center text-[#001B41] z-10 border border-gray-200"
                              >
                                 <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                              </button>
                           )}
                        </>
                     )}
                  </div>

                  {/* Dynamic Payment Options Extracted from Slider */}
                  <div className="p-4 border-t border-gray-200">
                    {approvalStatus === 'approved' && adminInfo?.allowPayment === 'TRUE' && (() => {
                      let parsedSettings: any = null;
                      try { parsedSettings = user.paymentSettings ? JSON.parse(user.paymentSettings) : null; } catch(e) {}
                      const applePayNum = parsedSettings?.applePayNumber || adminInfo?.applePayNumber;
                      const paypalLink = parsedSettings?.paypal;
                      const cryptoWallets = parsedSettings?.cryptoWallets;
                      const hasCrypto = cryptoWallets && (cryptoWallets.btc || cryptoWallets.eth || cryptoWallets.usdt || cryptoWallets.trc);
                      const hasAnyPayment = applePayNum || paypalLink || hasCrypto;
                      const perTicketSeatCount = seatsCount || 1;
                      const perTicketAmount = parseFloat(user.paymentAmount) || 0;
                      const totalAmount = perTicketAmount * perTicketSeatCount;
                      
                      if (!hasAnyPayment) return null;
                      
                      return (
                         <div className="w-full space-y-3 pt-2">
                            {perTicketAmount > 0 && (
                               <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="text-[10px] font-bold text-gray-500 uppercase">Amount Due</span>
                                     <span className="text-[10px] font-bold text-gray-400">{perTicketSeatCount} × ${perTicketAmount.toFixed(2)}</span>
                                  </div>
                                  <p className="text-xl font-black text-[#001B41]">${totalAmount.toFixed(2)}</p>
                               </div>
                            )}
                            {applePayNum && (
                               <div>
                                  <button onClick={() => setExpandedPayment(expandedPayment === 'apple' ? null : 'apple')} className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm flex items-center justify-between px-4 hover:bg-gray-900 transition-all active:scale-95">
                                     <div className="flex items-center"><FontAwesomeIcon icon={faMobileAlt} className="mr-2" />Apple Pay</div>
                                     <FontAwesomeIcon icon={expandedPayment === 'apple' ? faChevronUp : faChevronDown} className="text-white/40 text-xs" />
                                  </button>
                                  {expandedPayment === 'apple' && (
                                     <div className="mt-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-2">Send payment via Apple Pay to:</p>
                                        <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-gray-200">
                                           <span className="font-bold text-[#001B41]">{applePayNum}</span>
                                           <button onClick={() => copyToClipboard(applePayNum, 'apple')} className="bg-[#026CDF] text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase">{copiedText === 'apple' ? '✓ Copied' : 'Copy'}</button>
                                        </div>
                                     </div>
                                  )}
                               </div>
                            )}
                            {paypalLink && (
                               <a href={paypalLink.startsWith('http') ? paypalLink : `https://${paypalLink}`} target="_blank" rel="noopener noreferrer" className="w-full bg-[#0070ba] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center hover:bg-[#005ea6] transition-all active:scale-95">
                                  <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />Pay with PayPal
                               </a>
                            )}
                            {hasCrypto && (
                               <div>
                                  <button onClick={() => setExpandedPayment(expandedPayment === 'crypto' ? null : 'crypto')} className="w-full bg-gray-100 text-[#001B41] py-3 rounded-lg font-bold text-sm flex items-center justify-between px-4 hover:bg-gray-200 transition-all border border-gray-200">
                                     <div className="flex items-center"><FontAwesomeIcon icon={faWallet} className="mr-2" />Crypto</div>
                                     <FontAwesomeIcon icon={expandedPayment === 'crypto' ? faChevronUp : faChevronDown} className="text-gray-400 text-xs" />
                                  </button>
                                  {expandedPayment === 'crypto' && (
                                     <div className="mt-2 space-y-2">
                                        {Object.entries(cryptoWallets).filter(([_, v]) => v).map(([key, address]) => (
                                           <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                              <div className="flex items-center justify-between mb-2">
                                                 <span className="text-[10px] font-black uppercase" style={{color: key === 'btc' ? '#f7931a' : key === 'eth' ? '#627eea' : key === 'usdt' ? '#26a17b' : '#ff0013'}}>{key.toUpperCase()}</span>
                                                 <button onClick={() => copyToClipboard(address as string, key)} className="text-[10px] font-bold text-[#026CDF] uppercase flex items-center"><FontAwesomeIcon icon={faCopy} className="mr-1" />{copiedText === key ? 'Copied!' : 'Copy'}</button>
                                              </div>
                                              <p className="text-[10px] text-gray-500 font-mono break-all mb-2">{address as string}</p>
                                              <div className="flex justify-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(address as string)}`} alt={`${key.toUpperCase()} QR`} className="w-24 h-24 rounded bg-white p-1.5" /></div>
                                           </div>
                                        ))}
                                     </div>
                                  )}
                               </div>
                            )}
                            <button onClick={handlePaymentConfirmation} disabled={paymentConfirmed || paymentLoading || !!user?.paymentSTAMP} className={`w-full py-3 rounded-lg font-bold text-sm mt-1 transition-all ${paymentConfirmed || user?.paymentSTAMP ? 'bg-green-50 text-green-600 border border-green-200 cursor-default' : 'bg-[#026CDF] text-white hover:bg-[#0256b3] active:scale-95'}`}>
                               {paymentLoading ? (<div className="flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Confirming...</div>) : paymentConfirmed || user?.paymentSTAMP ? (<div className="flex items-center justify-center"><FontAwesomeIcon icon={faCheckCircle} className="mr-2" />Payment Submitted</div>) : ('I Have Paid')}
                            </button>
                         </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-6 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <FontAwesomeIcon icon={faInfoCircle} className="mt-1" />
                    <p className="text-xs">
                      This ticket is protected by Ticketmaster's SafeTix™ technology.
                      The barcode will refresh periodically to prevent screenshots or unauthorized transfers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
}
