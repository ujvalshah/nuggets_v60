export const detectProviderFromUrl = (url: string): 'image' | 'video' | 'document' | 'link' | 'text' | 'youtube' | 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'rich' => {
  if (!url) return 'link';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
  if (lowerUrl.includes('linkedin.com')) return 'linkedin';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  
  // Check for image extensions
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return 'image';
  
  // Check for video extensions
  if (/\.(mp4|webm|ogg)$/i.test(url)) return 'video';
  
  // Check for document extensions
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(url)) return 'document';
  
  return 'link';
};


