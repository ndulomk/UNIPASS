import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function formatDate(
    date: string | Date | null | undefined,
    options?: {
        includeTime?: boolean;
        format?: 'short' | 'long' | 'medium';
        locale?: string;
    }
): string {
    if (!date) return 'Data não informada';

    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
            return 'Data inválida';
        }

        const locale = options?.locale || 'pt-BR';
        const format = options?.format || 'short';
        const includeTime = options?.includeTime || false;

        // Format options based on format type
        let formatOptions: Intl.DateTimeFormatOptions = {};

        switch (format) {
            case 'short':
                formatOptions = {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                };
                break;
            case 'medium':
                formatOptions = {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                };
                break;
            case 'long':
                formatOptions = {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                };
                break;
        }

        if (includeTime) {
            formatOptions.hour = '2-digit';
            formatOptions.minute = '2-digit';
            formatOptions.hour12 = false;
        }

        return dateObj.toLocaleDateString(locale, formatOptions);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Erro na formatação';
    }
}


export function formatRelativeDate(date: string | Date | null | undefined): string {
    if (!date) return 'Data não informada';

    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffTime = now.getTime() - dateObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Ontem';
        if (diffDays === -1) return 'Amanhã';
        if (diffDays > 1) return `Há ${diffDays} dias`;
        if (diffDays < -1) return `Em ${Math.abs(diffDays)} dias`;

        return formatDate(date);
    } catch (error) {
        console.error('Error formatting relative date:', error);
        return formatDate(date);
    }
}


export function formatDateTime(date: string | Date | null | undefined): string {
    return formatDate(date, { includeTime: true });
}


export function formatDateRange(
    startDate: string | Date | null | undefined,
    endDate: string | Date | null | undefined
): string {
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    if (start === 'Data não informada' && end === 'Data não informada') {
        return 'Período não definido';
    }
    if (start === 'Data não informada') {
        return `Até ${end}`;
    }
    if (end === 'Data não informada') {
        return `A partir de ${start}`;
    }

    return `${start} - ${end}`;
}


export function isPastDate(date: string | Date | null | undefined): boolean {
    if (!date) return false;
    
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.getTime() < new Date().getTime();
    } catch {
        return false;
    }
}


export function isToday(date: string | Date | null | undefined): boolean {
    if (!date) return false;
    
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        
        return dateObj.toDateString() === today.toDateString();
    } catch {
        return false;
    }
}


export function calculateAge(birthDate: string | Date | null | undefined): number | null {
    if (!birthDate) return null;
    
    try {
        const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    } catch {
        return null;
    }
}