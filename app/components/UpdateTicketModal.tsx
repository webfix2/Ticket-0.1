// /components/UpdateTicketModal.tsx
import { useState, useEffect } from 'react';
import { Ticket } from '../types';
import { useUser } from '../UserContext';

interface UpdateTicketModalProps {
  ticket: Ticket;
  onClose: () => void;
}

const UpdateTicketModal: React.FC<UpdateTicketModalProps> = ({ ticket, onClose }) => {
  const { fetchAllTickets } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Ticket>({...ticket});

  useEffect(() => {
    setFormData({...ticket});
  }, [ticket]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const payload = new URLSearchParams();
      payload.append("action", "updateTicket");
      payload.append("ticketId", ticket.ticketId);
      
      // Fields to exclude - these are auto-populated by spreadsheet formulas
      const autoPopulatedFields = ['sn', 'ticketId', 'eventStatus', 'ticketStatus'];
      
      // Add all form fields to payload (excluding auto-populated fields)
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && !autoPopulatedFields.includes(key)) {
          payload.append(key, value.toString());
        }
      });
      
      const response = await fetch("https://script.google.com/macros/s/AKfycbxcoCDXcWlKPDbttlFf2eR_EeuMkfupy5dfgIOklM1ShEZ30gfD3wzZZOxkKV4xIWEl/exec", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString()
      });
      
      if (response.ok) {
        alert("Ticket updated successfully!");
        fetchAllTickets(); // Refresh tickets list
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update ticket. Please try again.");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      setError("An error occurred while updating the ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-2xl font-black text-[#001B41]">Update Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#001B41] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-xs font-bold">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Event Name*</label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName || ''}
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
                value={formData.venue || ''}
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
                value={formData.location || ''}
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
                value={formData.dateTime || ''}
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
                value={formData.doorTime || ''}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Section*</label>
              <input
                type="text"
                name="section"
                value={formData.section || ''}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Section Number</label>
              <input
                type="text"
                name="sectionNo"
                value={formData.sectionNo || ''}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Gate</label>
              <input
                type="text"
                name="gate"
                value={formData.gate || ''}
                onChange={handleChange}
                placeholder="e.g. G, 3, A"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Entrance</label>
              <input
                type="text"
                name="entrance"
                value={formData.entrance || ''}
                onChange={handleChange}
                placeholder="e.g. E, VIP, North"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Hospitality Area</label>
              <input
                type="text"
                name="hospitalityArea"
                value={formData.hospitalityArea || ''}
                onChange={handleChange}
                placeholder="e.g. Village A, Lounge B"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category || ''}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Ticket Holder</label>
              <input
                type="text"
                name="ticketHolder"
                value={formData.ticketHolder || ''}
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
                value={formData.row || ''}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Seat Numbers</label>
              <input
                type="text"
                name="seatNumbers"
                value={formData.seatNumbers || ''}
                onChange={handleChange}
                placeholder="e.g. 101, 102"
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Age Restriction</label>
              <select
                name="ageRestriction"
                value={formData.ageRestriction || 'All Ages'}
                onChange={handleChange}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              >
                <option value="All Ages">All Ages</option>
                <option value="18+">18+</option>
                <option value="21+">21+</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Cover Image URL</label>
            <input
              type="url"
              name="coverImage"
              value={formData.coverImage || ''}
              onChange={handleChange}
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Terms & Conditions</label>
            <textarea
              name="terms"
              value={formData.terms || ''}
              onChange={handleChange}
              rows={2}
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
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
                  Updating...
                </>
              ) : (
                'Update Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateTicketModal;
