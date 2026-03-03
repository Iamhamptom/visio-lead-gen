'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, MapPin, X, Search } from 'lucide-react';

// ─── Geography Data ────────────────────────────────────────────────
export type GeographyLevel = 'worldwide' | 'continent' | 'country' | 'state' | 'city' | 'radius' | 'top_cities';

export interface GeographySelection {
    level: GeographyLevel;
    continent?: string;
    country?: string;
    state?: string;
    city?: string;
    radiusKm?: number;
}

const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

const COUNTRIES_BY_CONTINENT: Record<string, string[]> = {
    'Africa': ['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Tanzania', 'Egypt', 'Morocco', 'Ethiopia', 'Uganda', 'Senegal', 'Cameroon', 'Ivory Coast', 'Mozambique', 'Angola', 'Zimbabwe', 'Botswana', 'Namibia', 'Rwanda'],
    'Asia': ['Japan', 'South Korea', 'India', 'China', 'Philippines', 'Indonesia', 'Thailand', 'Vietnam', 'Malaysia', 'Singapore', 'Taiwan', 'Pakistan', 'Bangladesh', 'UAE', 'Saudi Arabia', 'Israel', 'Turkey'],
    'Europe': ['United Kingdom', 'Germany', 'France', 'Netherlands', 'Sweden', 'Spain', 'Italy', 'Portugal', 'Belgium', 'Ireland', 'Denmark', 'Norway', 'Finland', 'Poland', 'Austria', 'Switzerland', 'Czech Republic', 'Greece', 'Romania'],
    'North America': ['United States', 'Canada', 'Mexico', 'Jamaica', 'Trinidad and Tobago', 'Puerto Rico', 'Dominican Republic', 'Cuba', 'Haiti', 'Costa Rica', 'Panama'],
    'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela', 'Ecuador', 'Uruguay', 'Bolivia', 'Paraguay'],
    'Oceania': ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea'],
};

const MAJOR_CITIES: Record<string, string[]> = {
    'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'Soweto', 'Sandton'],
    'Nigeria': ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Benin City'],
    'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
    'Ghana': ['Accra', 'Kumasi', 'Tamale', 'Tema'],
    'United States': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Atlanta', 'Houston', 'Dallas', 'San Francisco', 'Seattle', 'Nashville', 'Austin', 'Philadelphia', 'Detroit', 'Denver', 'Boston', 'Las Vegas', 'Portland', 'Minneapolis', 'New Orleans', 'Memphis'],
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Glasgow', 'Edinburgh', 'Cardiff', 'Nottingham'],
    'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg'],
    'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Düsseldorf', 'Stuttgart'],
    'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Bordeaux', 'Lille'],
    'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
    'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Belo Horizonte', 'Fortaleza'],
    'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Fukuoka'],
    'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu'],
    'India': ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune'],
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast'],
    'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancún', 'Tijuana'],
    'Jamaica': ['Kingston', 'Montego Bay', 'Spanish Town'],
    'Colombia': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'],
    'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
    'Sweden': ['Stockholm', 'Gothenburg', 'Malmö'],
    'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao'],
    'Italy': ['Milan', 'Rome', 'Naples', 'Turin', 'Florence'],
};

// ─── Component ─────────────────────────────────────────────────────
interface GlobalGeographySelectorProps {
    value: GeographySelection;
    onChange: (selection: GeographySelection) => void;
    compact?: boolean;
}

export const GlobalGeographySelector: React.FC<GlobalGeographySelectorProps> = ({
    value,
    onChange,
    compact = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const getDisplayLabel = (): string => {
        switch (value.level) {
            case 'worldwide': return 'Worldwide';
            case 'continent': return value.continent || 'Select Continent';
            case 'country': return value.country || 'Select Country';
            case 'state': return value.state ? `${value.state}, ${value.country}` : 'Select State';
            case 'city': return value.city ? `${value.city}, ${value.country}` : 'Select City';
            case 'radius': return value.city ? `${value.radiusKm || 50}km around ${value.city}` : 'Set Radius';
            case 'top_cities': return value.country ? `Top cities in ${value.country}` : 'Top Cities';
            default: return 'Worldwide';
        }
    };

    const handleSelectLevel = (level: GeographyLevel) => {
        if (level === 'worldwide') {
            onChange({ level: 'worldwide' });
            setIsOpen(false);
        } else {
            onChange({ ...value, level });
        }
    };

    const handleSelectContinent = (continent: string) => {
        onChange({ level: 'continent', continent });
        setIsOpen(false);
    };

    const handleSelectCountry = (country: string, continent?: string) => {
        const resolvedContinent = continent || Object.entries(COUNTRIES_BY_CONTINENT).find(([, countries]) => countries.includes(country))?.[0];
        onChange({ level: 'country', continent: resolvedContinent, country });
        setIsOpen(false);
    };

    const handleSelectCity = (city: string) => {
        onChange({ ...value, level: 'city', city });
        setIsOpen(false);
    };

    const handleSelectTopCities = (country: string) => {
        const continent = Object.entries(COUNTRIES_BY_CONTINENT).find(([, countries]) => countries.includes(country))?.[0];
        onChange({ level: 'top_cities', continent, country });
        setIsOpen(false);
    };

    // Build filtered options based on search
    const getFilteredOptions = () => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return null;

        const results: { type: 'continent' | 'country' | 'city'; label: string; parent?: string }[] = [];

        CONTINENTS.forEach(c => {
            if (c.toLowerCase().includes(q)) results.push({ type: 'continent', label: c });
        });

        Object.entries(COUNTRIES_BY_CONTINENT).forEach(([continent, countries]) => {
            countries.forEach(country => {
                if (country.toLowerCase().includes(q)) results.push({ type: 'country', label: country, parent: continent });
            });
        });

        Object.entries(MAJOR_CITIES).forEach(([country, cities]) => {
            cities.forEach(city => {
                if (city.toLowerCase().includes(q)) results.push({ type: 'city', label: city, parent: country });
            });
        });

        return results.slice(0, 8);
    };

    const filteredOptions = searchQuery ? getFilteredOptions() : null;

    // Determine current step in the flow
    const currentStep: 'pick_level' | 'pick_continent' | 'pick_country' | 'pick_city' =
        value.level === 'worldwide' ? 'pick_level' :
        value.level === 'continent' && !value.continent ? 'pick_continent' :
        (value.level === 'country' || value.level === 'top_cities') && !value.country ? 'pick_country' :
        (value.level === 'city' || value.level === 'radius') && !value.city ? 'pick_city' :
        'pick_level';

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 ${compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.07] text-white/80 transition-all duration-200 group`}
            >
                <Globe size={compact ? 12 : 14} className="text-visio-teal/80" />
                <span className="font-medium truncate max-w-[150px]">{getDisplayLabel()}</span>
                <ChevronDown size={compact ? 10 : 12} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className={`absolute ${compact ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 min-w-[280px] max-h-[360px] bg-[#141414]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden`}>
                    {/* Search Bar */}
                    <div className="p-3 border-b border-white/[0.06]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search location..."
                                className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-white/30 outline-none focus:border-visio-teal/30"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options Area */}
                    <div className="overflow-y-auto max-h-[280px] p-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>

                        {/* Search Results */}
                        {filteredOptions ? (
                            filteredOptions.length > 0 ? (
                                <div className="space-y-0.5">
                                    {filteredOptions.map((opt, i) => (
                                        <button
                                            key={`${opt.type}-${opt.label}-${i}`}
                                            onClick={() => {
                                                if (opt.type === 'continent') handleSelectContinent(opt.label);
                                                else if (opt.type === 'country') handleSelectCountry(opt.label, opt.parent);
                                                else if (opt.type === 'city') {
                                                    const country = opt.parent!;
                                                    const continent = Object.entries(COUNTRIES_BY_CONTINENT).find(([, c]) => c.includes(country))?.[0];
                                                    onChange({ level: 'city', continent, country, city: opt.label });
                                                    setIsOpen(false);
                                                }
                                                setSearchQuery('');
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors"
                                        >
                                            <MapPin size={14} className={opt.type === 'city' ? 'text-rose-400/70' : opt.type === 'country' ? 'text-blue-400/70' : 'text-emerald-400/70'} />
                                            <div>
                                                <span className="text-xs font-medium text-white/90">{opt.label}</span>
                                                {opt.parent && <span className="text-[10px] text-white/40 ml-2">{opt.parent}</span>}
                                            </div>
                                            <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40 uppercase tracking-wider">{opt.type}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-white/30 text-center py-6">No locations found</p>
                            )
                        ) : (
                            /* Level-based Navigation */
                            <div className="space-y-0.5">

                                {/* Worldwide option (always visible) */}
                                <button
                                    onClick={() => { onChange({ level: 'worldwide' }); setIsOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${value.level === 'worldwide' ? 'bg-visio-teal/10 border border-visio-teal/20' : 'hover:bg-white/[0.06]'}`}
                                >
                                    <Globe size={14} className="text-visio-teal" />
                                    <span className="text-xs font-medium text-white/90">Worldwide</span>
                                    {value.level === 'worldwide' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-visio-teal" />}
                                </button>

                                <div className="h-[1px] bg-white/[0.04] my-1.5" />

                                {/* Continents */}
                                <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 py-1.5 font-medium">By Region</p>
                                {CONTINENTS.map(continent => (
                                    <button
                                        key={continent}
                                        onClick={() => handleSelectContinent(continent)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${value.continent === continent && value.level === 'continent' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/[0.06]'}`}
                                    >
                                        <MapPin size={12} className="text-emerald-400/60" />
                                        <span className="text-xs text-white/80">{continent}</span>
                                    </button>
                                ))}

                                <div className="h-[1px] bg-white/[0.04] my-1.5" />

                                {/* Quick-pick countries (most common for music) */}
                                <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 py-1.5 font-medium">Popular Countries</p>
                                {['South Africa', 'United States', 'United Kingdom', 'Nigeria', 'Germany', 'Brazil', 'Japan', 'France'].map(country => (
                                    <button
                                        key={country}
                                        onClick={() => handleSelectCountry(country)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${value.country === country ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/[0.06]'}`}
                                    >
                                        <MapPin size={12} className="text-blue-400/60" />
                                        <span className="text-xs text-white/80">{country}</span>
                                    </button>
                                ))}

                                {/* If country is selected, show cities */}
                                {value.country && MAJOR_CITIES[value.country] && (
                                    <>
                                        <div className="h-[1px] bg-white/[0.04] my-1.5" />
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 py-1.5 font-medium">Cities in {value.country}</p>
                                        <button
                                            onClick={() => handleSelectTopCities(value.country!)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${value.level === 'top_cities' ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-white/[0.06]'}`}
                                        >
                                            <MapPin size={12} className="text-amber-400/60" />
                                            <span className="text-xs text-white/80">Top cities in {value.country}</span>
                                            <span className="ml-auto text-[9px] text-white/30">{MAJOR_CITIES[value.country]?.length || '10'}+ cities</span>
                                        </button>
                                        {MAJOR_CITIES[value.country].map(city => (
                                            <button
                                                key={city}
                                                onClick={() => handleSelectCity(city)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${value.city === city ? 'bg-rose-500/10 border border-rose-500/20' : 'hover:bg-white/[0.06]'}`}
                                            >
                                                <MapPin size={12} className="text-rose-400/60" />
                                                <span className="text-xs text-white/80">{city}</span>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Helper: format geography for prompts ──────────────────────────
export function formatGeographyForPrompt(geo: GeographySelection): string {
    switch (geo.level) {
        case 'worldwide': return 'worldwide';
        case 'continent': return `in ${geo.continent}`;
        case 'country': return `in ${geo.country}`;
        case 'state': return `in ${geo.state}, ${geo.country}`;
        case 'city': return `in ${geo.city}, ${geo.country}`;
        case 'radius': return `within ${geo.radiusKm || 50}km of ${geo.city}, ${geo.country}`;
        case 'top_cities': return `across top cities in ${geo.country}`;
        default: return 'worldwide';
    }
}

export const DEFAULT_GEOGRAPHY: GeographySelection = { level: 'worldwide' };
