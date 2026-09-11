import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
    id: string;
    name: string;
}

interface DropdownProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
}

export default function Dropdown({ options, value, onChange, placeholder = 'Select...', label }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
            {label && <label className="form-label">{label}</label>}
            <div
                className={`select ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderColor: isOpen ? 'var(--accent)' : 'var(--border)',
                    background: 'var(--bg-tertiary)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
            >
                <span>{selectedOption ? selectedOption.name : placeholder}</span>
                <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.5rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        zIndex: 100,
                        maxHeight: '250px',
                        overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                        animation: 'fadeInDown 0.2s ease-out'
                    }}
                >
                    {options.map((option) => (
                        <div
                            key={option.id}
                            onClick={() => {
                                onChange(option.id);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '0.4rem 1rem',
                                cursor: 'pointer',
                                background: value === option.id ? 'var(--accent-bg)' : 'transparent',
                                color: value === option.id ? 'var(--accent)' : 'var(--text-primary)',
                                transition: 'all 0.2s',
                                fontWeight: value === option.id ? 600 : 400
                            }}
                            onMouseEnter={(e) => {
                                if (value !== option.id) {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== option.id) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            {option.name}
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            No options available
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .select.active { border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(11, 107, 58, 0.1); }
            `}</style>
        </div>
    );
}
