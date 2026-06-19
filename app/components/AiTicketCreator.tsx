'use client';

import { useState } from 'react';
import type { AiTicketData } from '../lib/ai-providers';
import type { SearchResult } from '../lib/ai-providers';

interface AiTicketCreatorProps {
  brandColor?: string;
  brandName?: string;
  onApply: (data: AiTicketData) => void;
  onBack: () => void;
}

export default function AiTicketCreator({
  brandColor = '#026CDF',
  brandName = 'Ticketmaster',
  onApply,
  onBack,
}: AiTicketCreatorProps) {
  const [query, setQuery] = useState('');
  const [step, setStep] = useState<'input' | 'generating' | 'results' | 'preview'>('input');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<AiTicketData[]>([]);
  const [selected, setSelected] = useState<AiTicketData | null>(null);

  const handleSearchGenerate = async () => {
    if (!query.trim()) return;
    setStep('generating');
    setError(null);

    try {
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!searchRes.ok) throw new Error('Search failed');
      const searchData = await searchRes.json();
      const results: SearchResult[] = searchData.results || [];
      setSearchResults(results);

      if (results.length === 0) {
        throw new Error('No search results found. Try a more specific query.');
      }

      const { generateWithAI } = await import('../lib/ai-providers');
      const aiResults = await generateWithAI(query, results);

      if (aiResults && aiResults.length > 0) {
        setSuggestions(aiResults);
      } else {
        setSuggestions(
          results.map((r) => ({
            eventName: r.title,
            venue: '',
            location: '',
            dateTime: '',
            doorTime: '',
            section: '',
            sectionNo: '',
            gate: '',
            entrance: '',
            hospitalityArea: '',
            ticketHolder: '',
            row: '',
            seatNumbers: '',
            category: '',
            ageRestriction: 'All Ages',
            description: r.snippet,
            coverImage: r.imageUrl || '',
            terms: '',
          }))
        );
      }

      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('input');
    }
  };

  const handleSelect = (data: AiTicketData) => {
    setSelected(data);
    setStep('preview');
  };

  const handleApply = () => {
    if (selected) onApply(selected);
  };

  if (step === 'preview' && selected) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-black text-[#001B41]">Review & Edit</h2>
          <button
            onClick={() => setStep('results')}
            className="text-sm font-bold text-gray-400 hover:text-[#001B41] transition-colors"
          >
            Back to results
          </button>
        </div>

        <div className="space-y-4">
          {selected.coverImage && (
            <img
              src={selected.coverImage}
              alt="Cover preview"
              className="w-full h-40 object-cover rounded-xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Event Name', key: 'eventName', inputType: 'text' },
              { label: 'Venue', key: 'venue', inputType: 'text' },
              { label: 'Location', key: 'location', inputType: 'text' },
              { label: 'Date & Time', key: 'dateTime', inputType: 'datetime-local' },
              { label: 'Door Time', key: 'doorTime', inputType: 'text' },
              { label: 'Section No', key: 'sectionNo', inputType: 'text' },
              { label: 'Row', key: 'row', inputType: 'text' },
              { label: 'Seat Numbers', key: 'seatNumbers', inputType: 'text' },
              { label: 'Category', key: 'category', inputType: 'text' },
            ] as const).map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                  {field.label}
                </label>
                <input
                  type={field.inputType}
                  value={(selected as any)[field.key]}
                  onChange={(e) =>
                    setSelected({ ...selected, [field.key]: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
                />
              </div>
            ))}

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                Section
              </label>
              <select
                value={selected.section}
                onChange={(e) => setSelected({ ...selected, section: e.target.value })}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              >
                <option value="">Select section</option>
                <option value="VIP Packages">VIP Packages</option>
                <option value="Floor Seats">Floor Seats</option>
                <option value="Lower Bowl">Lower Bowl</option>
                <option value="Upper Bowl">Upper Bowl</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                Age Restriction
              </label>
              <select
                value={selected.ageRestriction}
                onChange={(e) => setSelected({ ...selected, ageRestriction: e.target.value })}
                className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
              >
                <option value="All Ages">All Ages</option>
                <option value="18+">18+</option>
                <option value="21+">21+</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
              Description
            </label>
            <textarea
              value={selected.description}
              onChange={(e) =>
                setSelected({ ...selected, description: e.target.value })
              }
              rows={3}
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
              Cover Image URL
            </label>
            <input
              type="url"
              value={selected.coverImage}
              onChange={(e) =>
                setSelected({ ...selected, coverImage: e.target.value })
              }
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
              Terms & Conditions
            </label>
            <textarea
              value={selected.terms}
              onChange={(e) =>
                setSelected({ ...selected, terms: e.target.value })
              }
              rows={2}
              className="w-full p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41]"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-8 py-3 text-white rounded-xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center"
            style={{ backgroundColor: brandColor }}
          >
            Apply to Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-black text-[#001B41]">AI Ticket Assistant</h2>
        <button
          onClick={onBack}
          className="text-sm font-bold text-gray-400 hover:text-[#001B41] transition-colors"
        >
          Back
        </button>
      </div>

      {step === 'input' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Describe the event and we&apos;ll search the web and generate ticket details using AI.
          </p>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "Taylor Swift Eras Tour at SoFi Stadium June 2026"'
            rows={4}
            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:border-[#026CDF] focus:bg-white outline-none transition-all font-bold text-[#001B41] resize-none"
          />
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-3">
              {error}
            </div>
          )}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSearchGenerate}
              disabled={!query.trim()}
              className="px-8 py-3 text-white rounded-xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center"
              style={{ backgroundColor: brandColor }}
            >
              Search & Generate
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-16">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
            style={{ borderColor: `${brandColor}40`, borderTopColor: brandColor }}
          />
          <p className="text-sm font-bold text-gray-500">Searching the web & generating suggestions...</p>
          <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
        </div>
      )}

      {step === 'results' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Choose a suggestion or go back to refine your query.
          </p>
          <div className="space-y-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className="w-full text-left p-4 bg-gray-50 rounded-xl border-2 border-transparent hover:border-[#026CDF] hover:bg-white transition-all group"
              >
                <div className="flex gap-4">
                  {s.coverImage && (
                    <img
                      src={s.coverImage}
                      alt=""
                      className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-[#001B41] text-sm group-hover:text-[#026CDF] transition-colors truncate">
                      {s.eventName || 'Untitled Event'}
                    </h3>
                    {s.venue && (
                      <p className="text-xs font-bold text-gray-400 mt-0.5 truncate">{s.venue}</p>
                    )}
                    {s.location && (
                      <p className="text-xs font-bold text-gray-400 truncate">{s.location}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
