import React, { useState, useRef, useEffect } from 'react';
import { User } from '@/types';
import { MapPin, Link as LinkIcon, Twitter, Linkedin, Github, Camera, Save, Edit3, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { storageService } from '@/services/storageService';
import { Avatar } from '../shared/Avatar';
import { adminConfigService } from '@/admin/services/adminConfigService';

interface ProfileCardProps {
  user: User;
  isOwner: boolean;
  nuggetCount: number;
  onUpdate: (updatedUser: User) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, isOwner, nuggetCount, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allowUpload, setAllowUpload] = useState(false);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminConfigService.getFeatureFlags().then(flags => {
        setAllowUpload(flags.enableAvatarUpload);
    });
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    name: user.name,
    avatarUrl: user.avatarUrl,
    title: 'Senior Product Designer', // Mock field
    company: 'TechFlow Inc.', // Mock field
    bio: 'Building minimalist interfaces for busy people. Obsessed with typography and whitespace.', // Mock field
    location: 'San Francisco, CA', // Mock field
    website: 'https://akash.design', // Mock field
    twitter: 'akash_ux', // Mock field
    linkedin: 'akash-solanki', // Mock field
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedUser = { ...user, name: formData.name, avatarUrl: formData.avatarUrl };
      await storageService.updateUser(user.id, { name: formData.name, avatarUrl: formData.avatarUrl });
      
      onUpdate(updatedUser);
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
        name: user.name,
        avatarUrl: user.avatarUrl,
        title: 'Senior Product Designer',
        company: 'TechFlow Inc.',
        bio: 'Building minimalist interfaces for busy people. Obsessed with typography and whitespace.',
        location: 'San Francisco, CA',
        website: 'https://akash.design',
        twitter: 'akash_ux',
        linkedin: 'akash-solanki',
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm sticky top-24 flex flex-col gap-6">
      {/* 1. Avatar Section */}
      <div className="relative w-24 h-24">
        <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg flex items-center justify-center overflow-hidden">
            <Avatar name={formData.name} src={formData.avatarUrl} size="xl" className="w-full h-full text-3xl" />
        </div>
        {isEditing && allowUpload && (
            <>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full hover:bg-primary-500 hover:text-slate-900 transition-colors shadow-md z-10"
                >
                    <Camera size={14} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*"
                />
            </>
        )}
      </div>

      {/* 2. Main Info */}
      <div className="flex flex-col gap-4">
        {isEditing ? (
            <div className="space-y-3 animate-in fade-in duration-200">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Full Name</label>
                    <input 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Title & Company</label>
                    <input 
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Job Title"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                    <input 
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="Company"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Bio</label>
                    <textarea 
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Location</label>
                    <input 
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                </div>
            </div>
        ) : (
            <div className="animate-in fade-in duration-200">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-1">{formData.name}</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                    {formData.title} at <span className="text-slate-900 dark:text-slate-200">{formData.company}</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {formData.bio}
                </p>
                
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        <span>{formData.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>Joined {new Date(user.joinedAt).getFullYear()}</span>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* 3. Stats - Followers removed for MVP, Centered, Sentence Case */}
      {!isEditing && (
        <div className="flex items-center justify-center py-4 border-t border-b border-slate-100 dark:border-slate-800">
            <div className="text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{nuggetCount}</div>
                <div className="text-[10px] font-bold text-slate-400 tracking-wider">Nuggets</div>
            </div>
        </div>
      )}

      {/* 4. Social Links */}
      <div className="flex flex-col gap-2">
        {isEditing ? (
            <>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Social Links</label>
                <div className="flex items-center gap-2">
                    <LinkIcon size={16} className="text-slate-400" />
                    <input name="website" value={formData.website} onChange={handleInputChange} placeholder="Website" className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-white" />
                </div>
                <div className="flex items-center gap-2">
                    <Twitter size={16} className="text-slate-400" />
                    <input name="twitter" value={formData.twitter} onChange={handleInputChange} placeholder="Twitter" className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-white" />
                </div>
            </>
        ) : (
            <div className="flex gap-3 pt-1">
                <a href={formData.website} target="_blank" rel="noopener" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors">
                    <LinkIcon size={18} />
                </a>
                <a href={`https://twitter.com/${formData.twitter}`} target="_blank" rel="noopener" className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                    <Twitter size={18} />
                </a>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-300 cursor-not-allowed">
                    <Linkedin size={18} />
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-300 cursor-not-allowed">
                    <Github size={18} />
                </div>
            </div>
        )}
      </div>

      {/* 5. Action Buttons (Always Last) */}
      {isOwner && (
        <div className="pt-2">
            {isEditing ? (
                <div className="flex gap-3">
                    <button 
                        onClick={handleCancel}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                >
                    <Edit3 size={16} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                    Edit Profile
                </button>
            )}
        </div>
      )}
    </div>
  );
};
