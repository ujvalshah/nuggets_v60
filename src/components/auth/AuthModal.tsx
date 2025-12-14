
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Phone, ArrowRight, Loader2, Linkedin, Chrome, ChevronLeft, Shield, User as UserIcon, MapPin, AtSign, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '../UI/Input';
import { ENABLED_SOCIAL_PROVIDERS } from '@/types/auth';

// Simple mock for Pincode lookup
const mockPincodeLookup = async (pincode: string) => {
    await new Promise(r => setTimeout(r, 600)); // Simulate net delay
    // Deterministic mock based on last digit
    const lastDigit = pincode.slice(-1);
    if (['1','2','3'].includes(lastDigit)) return { city: 'New York', country: 'USA' };
    if (['4','5','6'].includes(lastDigit)) return { city: 'London', country: 'UK' };
    if (['7','8','9'].includes(lastDigit)) return { city: 'Mumbai', country: 'India' };
    return { city: 'Unknown City', country: 'Unknown Country' };
};

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalView, login, signup, socialLogin, featureFlags, signupConfig } = useAuth();
  
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'verify_pending'>(authModalView);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Signup Form
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    setView(authModalView);
    setError(null);
    setEmail('');
    setPassword('');
    // Reset Signup
    setFullName('');
    setUsername('');
    setPincode('');
    setCity('');
    setCountry('');
    setGender('');
    setPhone('');
    setDob('');
  }, [isAuthModalOpen, authModalView]);

  useEffect(() => {
    if (isAuthModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isAuthModalOpen]);

  // Handle Pincode Auto-fill
  useEffect(() => {
      if (pincode.length >= 5) {
          const fetchLoc = async () => {
              setIsLookingUpPin(true);
              try {
                  const data = await mockPincodeLookup(pincode);
                  if (data) {
                      setCity(data.city);
                      setCountry(data.country);
                  }
              } catch (e) {
                  // ignore
              } finally {
                  setIsLookingUpPin(false);
              }
          };
          const timer = setTimeout(fetchLoc, 500); // Debounce
          return () => clearTimeout(timer);
      }
  }, [pincode]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Sanitize: Remove @ and spaces, allow alphanum + underscore
      const val = e.target.value.replace(/[@\s]/g, '').replace(/[^a-zA-Z0-9_]/g, '');
      setUsername(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
        if (view === 'login') {
            await login({ email, password });
        } else if (view === 'signup') {
            await signup({ 
                fullName, 
                username, 
                email, 
                password, 
                pincode, 
                city, 
                country, 
                gender,
                phoneNumber: phone,
                dateOfBirth: dob
            });
            
            // Check if verification is required
            if (featureFlags?.enableEmailVerification) {
                setView('verify_pending');
            } else {
                // Auth context handles close
            }
        } else if (view === 'forgot') {
            await new Promise(r => setTimeout(r, 1000));
            alert("If an account exists, a reset link has been sent.");
            setView('login');
        }
    } catch (err: any) {
        setError(err.message || "An error occurred");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'user') => {
      setIsLoading(true);
      setError(null);
      try {
          const email = role === 'admin' ? 'akash@example.com' : 'hemant@example.com';
          await login({ email, password: 'password' }); 
      } catch (err: any) {
          setError("Demo login failed.");
      } finally {
          setIsLoading(false);
      }
  };

  if (!isAuthModalOpen) return null;

  const inputClass = "bg-white/60 dark:bg-black/20 border-slate-200/80 dark:border-slate-700/60 focus:ring-primary-400/50 focus:border-primary-400 dark:text-white backdrop-blur-sm transition-all shadow-sm";
  const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wider";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={closeAuthModal}
      />
      
      <div className="
        relative w-full max-w-md 
        bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl 
        rounded-2xl shadow-2xl 
        border border-white/20 dark:border-white/10
        flex flex-col overflow-hidden 
        animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300
        max-h-[90vh]
      ">
        
        <button 
            onClick={closeAuthModal} 
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors z-20"
        >
            <X size={20} />
        </button>

        {/* Verification Pending View */}
        {view === 'verify_pending' ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <Mail size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Check your inbox</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
                    We've sent a verification link to <strong>{email}</strong>. Please click the link to activate your account.
                </p>
                <button onClick={() => setView('login')} className="text-sm font-bold text-primary-600 hover:underline">
                    Return to Login
                </button>
            </div>
        ) : (
            <>
                <div className="px-8 pt-10 pb-2 text-center shrink-0">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        {view === 'login' && 'Welcome Back'}
                        {view === 'signup' && 'Join Nuggets'}
                        {view === 'forgot' && 'Reset Password'}
                    </h2>
                    {view === 'login' && <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to continue to your space.</p>}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 pt-6">
                    
                    {/* Toggle Tabs */}
                    {view !== 'forgot' && (
                        <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl mb-6 relative border border-slate-200/50 dark:border-slate-700/50">
                            <button onClick={() => setView('login')} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${view === 'login' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Log in</button>
                            <button onClick={() => setView('signup')} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${view === 'signup' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Sign up</button>
                        </div>
                    )}

                    {/* Social Login */}
                    {view !== 'forgot' && (
                        <div className="space-y-3 mb-6">
                            {ENABLED_SOCIAL_PROVIDERS.includes('google') && (
                                <button type="button" onClick={() => socialLogin('google')} className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors font-medium text-sm text-slate-700 dark:text-slate-200 group shadow-sm">
                                    <Chrome size={18} className="text-slate-500 group-hover:text-blue-500 transition-colors" /> <span>Google</span>
                                </button>
                            )}
                            <div className="relative py-2 flex items-center justify-center mt-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700/60"></div></div>
                                <span className="relative px-2 text-[10px] uppercase font-bold text-slate-400 bg-white/90 dark:bg-slate-900/90 rounded-full">or</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        
                        {/* SIGNUP FIELDS */}
                        {view === 'signup' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Full Name</label>
                                        <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Username</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <AtSign size={14} />
                                            </div>
                                            <input 
                                                className={`block w-full py-2.5 pl-8 pr-4 ${inputClass} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                                                placeholder="username" 
                                                value={username} 
                                                onChange={handleUsernameChange}
                                                required 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Email</label>
                                    <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                                </div>

                                <div>
                                    <label className={labelClass}>Password</label>
                                    <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
                                </div>

                                {/* LOCATION GROUP - Configurable */}
                                {signupConfig?.location.show && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1">
                                            <label className={labelClass}>Pincode {signupConfig.location.required ? '*' : ''}</label>
                                            <Input 
                                                placeholder="Zip" 
                                                value={pincode} 
                                                onChange={e => setPincode(e.target.value)} 
                                                required={signupConfig.location.required}
                                                className={inputClass} 
                                                maxLength={10}
                                            />
                                        </div>
                                        <div className="col-span-2 relative">
                                            {isLookingUpPin && <div className="absolute right-2 top-8"><Loader2 size={14} className="animate-spin text-primary-500"/></div>}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className={labelClass}>City</label>
                                                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className={inputClass} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Country</label>
                                                    <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className={inputClass} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    {/* GENDER - Configurable */}
                                    {signupConfig?.gender.show && (
                                        <div>
                                            <label className={labelClass}>Gender {signupConfig.gender.required ? '*' : ''}</label>
                                            <select 
                                                value={gender} 
                                                onChange={e => setGender(e.target.value)} 
                                                className={`w-full py-2.5 px-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${inputClass}`}
                                                required={signupConfig.gender.required}
                                            >
                                                <option value="" disabled>Select</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                                <option value="prefer_not_to_say">Prefer not to say</option>
                                            </select>
                                        </div>
                                    )}
                                    
                                    {/* PHONE - Configurable */}
                                    {signupConfig?.phone.show && (
                                        <div>
                                            <label className={labelClass}>Mobile {signupConfig.phone.required ? '*' : <span className="normal-case opacity-50 font-normal">(Optional)</span>}</label>
                                            <Input 
                                                type="tel" 
                                                placeholder="+1..." 
                                                value={phone} 
                                                onChange={e => setPhone(e.target.value)} 
                                                className={inputClass} 
                                                required={signupConfig.phone.required}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* DATE OF BIRTH - Configurable */}
                                {signupConfig?.dob.show && (
                                    <div>
                                        <label className={labelClass}>Date of Birth {signupConfig.dob.required ? '*' : ''}</label>
                                        <Input 
                                            type="date" 
                                            value={dob}
                                            onChange={e => setDob(e.target.value)}
                                            required={signupConfig.dob.required}
                                            className={inputClass}
                                            leftIcon={<Calendar size={16} />}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* LOGIN FIELDS */}
                        {view === 'login' && (
                            <>
                                <div>
                                    <label className={labelClass}>Email Address</label>
                                    <Input type="email" placeholder="you@example.com" leftIcon={<Mail size={16} />} value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1.5 ml-1">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Password</label>
                                    </div>
                                    <Input type="password" placeholder="••••••••" leftIcon={<Lock size={16} />} value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${keepSignedIn ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white/50 border-slate-300 dark:border-slate-600 dark:bg-black/20'}`}>
                                            {keepSignedIn && <div className="w-2 h-2 bg-white rounded-sm" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} />
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Remember me</span>
                                    </label>
                                    <button type="button" onClick={() => setView('forgot')} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white underline transition-colors">Forgot?</button>
                                </div>
                            </>
                        )}

                        {/* FORGOT FIELDS */}
                        {view === 'forgot' && (
                            <div>
                                <label className={labelClass}>Email Address</label>
                                <Input type="email" placeholder="you@example.com" leftIcon={<Mail size={16} />} value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-primary-500 hover:bg-primary-400 text-slate-900 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                                <>
                                    {view === 'login' && 'Sign In'}
                                    {view === 'signup' && 'Create Account'}
                                    {view === 'forgot' && 'Send Reset Link'}
                                    {!isLoading && view !== 'forgot' && <ArrowRight size={16} />}
                                </>
                            )}
                        </button>

                        {view === 'forgot' && (
                            <button type="button" onClick={() => setView('login')} className="w-full py-3 mt-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                                <ChevronLeft size={16} /> Back to Login
                            </button>
                        )}
                    </form>

                    {/* DEMO ACCOUNTS */}
                    {view === 'login' && (
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">Quick Demo Login</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleDemoLogin('admin')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-slate-800 hover:border-primary-300 transition-all group">
                                    <Shield size={16} className="text-slate-400 group-hover:text-primary-500 mb-1.5" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Admin</span>
                                </button>
                                <button onClick={() => handleDemoLogin('user')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-slate-800 hover:border-primary-300 transition-all group">
                                    <UserIcon size={16} className="text-slate-400 group-hover:text-primary-500 mb-1.5" />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">User</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>,
    document.body
  );
};
