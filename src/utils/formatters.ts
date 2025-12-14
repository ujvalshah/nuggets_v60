export const formatDate = (isoString: string, includeTime: boolean = true): string => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    
    // Check for Invalid Date
    if (isNaN(date.getTime())) {
        return '';
    }
    
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits of year
    
    if (!includeTime) {
        return `${day} ${month} '${year}`;
    }

    const time = date.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: 'numeric', 
        hour12: true 
    });

    // Returns: "6:12 PM • 25 Nov '25"
    return `${time} • ${day} ${month} '${year}`;
  } catch (e) {
    console.error("Error formatting date:", isoString, e);
    return '';
  }
};

export const formatReadTime = (minutes: number): string => {
  if (minutes < 1) {
    return '1 min read';
  }
  if (minutes === 1) {
    return '1 min read';
  }
  return `${minutes} min read`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength).trim() + '...';
};

export const getInitials = (name: string): string => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export const normalizeCategoryLabel = (input: string): string => {
  let cleaned = input.trim();
  if (!cleaned) return '';
  
  // Remove existing hash to re-add it cleanly
  cleaned = cleaned.replace(/^#/, '');
  
  // Title Case
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
    
  return `#${cleaned}`;
};


