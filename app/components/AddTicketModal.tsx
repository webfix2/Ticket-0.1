"use client";

import { useState, useEffect } from 'react';
import { useUser } from '../UserContext';
import AiTicketCreator from './AiTicketCreator';
import type { AiTicketData } from '../lib/ai-providers';

interface AddTicketModalProps {
  onClose: () => void;
}

const AddTicketModal: React.FC<AddTicketModalProps> = ({ onClose }) => {
  const { fetchAllTickets } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flipImagesList, setFlipImagesList] = useState<string[]>(['']);
  const [creationMode, setCreationMode] = useState<'choose' | 'manual' | 'ai'>('choose');
  const [aiPrefill, setAiPrefill] = useState<AiTicketData | null>(null);

  useEffect(() => {
    if (creationMode === 'manual' && aiPrefill) {
      setFormData(prev => ({
        ...prev,
        eventName: aiPrefill.eventName || prev.eventName,
        venue: aiPrefill.venue || prev.venue,
        location: aiPrefill.location || prev.location,
        dateTime: aiPrefill.dateTime || prev.dateTime,
        doorTime: aiPrefill.doorTime || prev.doorTime,
        section: aiPrefill.section || prev.section,
        sectionNo: aiPrefill.sectionNo || prev.sectionNo,
        gate: aiPrefill.gate || prev.gate,
        entrance: aiPrefill.entrance || prev.entrance,
        hospitalityArea: aiPrefill.hospitalityArea || prev.hospitalityArea,
        row: aiPrefill.row || prev.row,
        seatNumbers: aiPrefill.seatNumbers || prev.seatNumbers,
        category: aiPrefill.category || prev.category,
        ticketHolder: aiPrefill.ticketHolder || prev.ticketHolder,
        ageRestriction: aiPrefill.ageRestriction || prev.ageRestriction,
        description: aiPrefill.description || prev.description,
        coverImage: aiPrefill.coverImage || prev.coverImage,
        terms: aiPrefill.terms || prev.terms,
      }));
      setAiPrefill(null);
    }
  }, [creationMode, aiPrefill]);

  const [formData, setFormData] = useState({
    eventName: '',
    venue: '',
    location: '',
    dateTime: '',
    doorTime: '',
    section: '',
    sectionNo: '',
    gate: '',
    entrance: '',
    hospitalityArea: '',
    row: '',
    category: '',
    ticketHolder: '',
    seatNumbers: '',
    platform: 'ticketmaster',
    ageRestriction: 'All Ages',
    coverImage: '',
    description: '',
    terms: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePlatform = (p: string) => {
    setFormData(prev => {
      const platforms = prev.platform ? prev.platform.split(',').map(item => item.trim()).filter(item => item !== "") : [];
      const newPlatforms = platforms.includes(p)
        ? platforms.filter(item => item !== p)
        : [...platforms, p];
      return { ...prev, platform: newPlatforms.join(',') };
    });
  };

  const handleAddFlipImage = () => {
    setFlipImagesList([...flipImagesList, '']);
  };

  const handleRemoveFlipImage = (index: number) => {
    const newList = [...flipImagesList];
    newList.splice(index, 1);
    setFlipImagesList(newList.length ? newList : ['']);
  };

  const handleFlipImageChange = (index: number, value: string) => {
    const newList = [...flipImagesList];
    newList[index] = value;
    setFlipImagesList(newList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const admin = localStorage.getItem("loggedInAdmin");
      if (!admin) {
        throw new Error("Admin session expired. Please log in again.");
      }
      
      const payload = new URLSearchParams();
      payload.append("action", "addTicket");
      payload.append("admin", admin);
      
      // Add all form fields to payload
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });
      
      const flipImagesString = flipImagesList.filter(url => url.trim() !== '').join(',');
      payload.append("flipImages", flipImagesString);
      
      const POST_URL = process.env.NEXT_PUBLIC_APP_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxcoCDXcWlKPDbttlFf2eR_EeuMkfupy5dfgIOklM1ShEZ30gfD3wzZZOxkKV4xIWEl/exec";
      const response = await fetch(POST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString()
      });
      
      if (response.ok) {
        alert("Ticket added successfully!");
        fetchAllTickets(); // Refresh tickets list
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to add ticket. Please try again.");
      }
    } catch (error) {
      console.error("Error adding ticket:", error);
      setError("An error occurred while adding the ticket.");
    } finally {
      setLoading(false);
    }
  };

  if (creationMode === 'choose') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-black text-[#001B41]">Add New Ticket</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-[#001B41] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-6">How would you like to proceed?</p>
          <div className="space-y-3">
            <button
              onClick={() => setCreationMode('ai')}
              className="w-full p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl text-left hover:border-[#026CDF] transition-all group"
            >
              <span className="text-lg font-black text-[#001B41] block">AI Assistant</span>
              <span className="text-sm text-gray-500">Describe the event and let AI generate the details</span>
            </button>
            <button
              onClick={() => setCreationMode('manual')}
              className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-left hover:border-gray-300 transition-all group"
            >
              <span className="text-lg font-black text-[#001B41] block">Manual Entry</span>
              <span className="text-sm text-gray-500">Fill in all ticket details yourself</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (creationMode === 'ai') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <AiTicketCreator
            brandColor="#026CDF"
            brandName="Ticketmaster"
            onApply={(data) => {
              setAiPrefill(data);
              setCreationMode('manual');
            }}
            onBack={() => setCreationMode('choose')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-2xl font-black text-[#001B41]">Add New Ticket</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-[#001B41] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Event Name*</label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Venue*</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Location*</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Date & Time*</label>
              <input
                type="datetime-local"
                name="dateTime"
                value={formData.dateTime}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Door Time</label>
              <input
                type="text"
                name="doorTime"
                value={formData.doorTime}
                onChange={handleChange}
                placeholder="e.g. 6:30 PM"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Section*</label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              >
                <option value="">Select a section</option>
                <option value="VIP Packages">VIP Packages</option>
                <option value="Floor Seats">Floor Seats</option>
                <option value="Lower Bowl">Lower Bowl</option>
                <option value="Upper Bowl">Upper Bowl</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Section Number</label>
              <input
                type="text"
                name="sectionNo"
                value={formData.sectionNo}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#002B7F] focus:bg-white outline-none transition-all font-bold text-[#002B7F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Gate</label>
              <input
                type="text"
                name="gate"
                value={formData.gate}
                onChange={handleChange}
                placeholder="e.g. G, 3, A"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#002B7F] focus:bg-white outline-none transition-all font-bold text-[#002B7F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Entrance</label>
              <input
                type="text"
                name="entrance"
                value={formData.entrance}
                onChange={handleChange}
                placeholder="e.g. E, VIP, North"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#002B7F] focus:bg-white outline-none transition-all font-bold text-[#002B7F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Hospitality Area</label>
              <input
                type="text"
                name="hospitalityArea"
                value={formData.hospitalityArea}
                onChange={handleChange}
                placeholder="e.g. Village A, Lounge B"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#002B7F] focus:bg-white outline-none transition-all font-bold text-[#002B7F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Ticket Holder</label>
              <input
                type="text"
                name="ticketHolder"
                value={formData.ticketHolder}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Row*</label>
              <input
                type="text"
                name="row"
                value={formData.row}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Seat Numbers*</label>
              <input
                type="text"
                name="seatNumbers"
                placeholder="e.g. 101, 102"
                value={formData.seatNumbers}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Platforms*</label>
              <div className="flex flex-wrap gap-2">
                {['ticketmaster', 'viagogo', 'uefa'].map((p) => {
                  const isSelected = formData.platform.split(',').includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${
                        isSelected 
                          ? 'bg-[#026CDF] border-[#026CDF] text-white shadow-md shadow-[#026CDF]/20' 
                          : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Age Restriction</label>
              <select
                name="ageRestriction"
                value={formData.ageRestriction}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              >
                <option value="All Ages">All Ages</option>
                <option value="18+">18+</option>
                <option value="21+">21+</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Cover Image URL</label>
            <input
              type="url"
              name="coverImage"
              value={formData.coverImage}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            />
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Flip Images URLs</label>
              <button 
                type="button" 
                onClick={handleAddFlipImage}
                className="text-[10px] font-bold text-[#026CDF] hover:underline"
              >
                + Add Another Image
              </button>
            </div>
            <p className="text-[10px] text-gray-500 font-bold mb-2 ml-1">Note: The first URL displays first, and the last displays last.</p>
            <div className="space-y-2">
              {flipImagesList.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleFlipImageChange(index, e.target.value)}
                    placeholder="https://example.com/flip-image.jpg"
                    className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveFlipImage(index)}
                    className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            ></textarea>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Terms & Conditions</label>
            <textarea
              name="terms"
              value={formData.terms}
              onChange={handleChange}
              rows={2}
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            ></textarea>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-[#026CDF] text-white rounded-xl font-black shadow-lg shadow-[#026CDF]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-3"></div>
                  Adding...
                </>
              ) : (
                'Add Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTicketModal;
