import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, LogIn, CheckCircle, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/Arrow-sales-corporation_logo-300x84.png';

export const Login: React.FC = () => {
  const { login } = useAuthStore();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    // Simulate loading for premium UX feel
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const success = await login(emailOrPhone);
    if (!success) {
      setError(`Access Denied: Email/Phone "${emailOrPhone}" is not pre-approved by Admin or Super Admin. Please ask your administrator to register your email ID in the Employee Directory.`);
      setIsSubmitting(false);
    }
  };

  const handleDemoSelect = (email: string) => {
    setEmailOrPhone(email);
    setPassword('••••••••');
    setError(null);
  };

  const handleQuickLogin = async (email: string) => {
    setIsSubmitting(true);
    setError(null);
    setEmailOrPhone(email);
    setPassword('••••••••');
    
    await new Promise((resolve) => setTimeout(resolve, 600));
    const success = await login(email);
    if (!success) {
      setError('Failed to login with this demo account.');
      setIsSubmitting(false);
    }
  };

  const demoAccounts = [
    {
      name: 'System Administrator',
      roleName: 'Super Admin',
      designation: 'Managing Director',
      email: 'admin@arrowsales.com',
      phone: '9876543210',
      badgeColor: 'border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800',
      tagColor: 'bg-emerald-600 text-white',
      desc: 'Full system control, employee setup, settings, and database reset.'
    },
    {
      name: 'Operations Admin',
      roleName: 'Admin',
      designation: 'Operations Manager',
      email: 'admin@arrow.com',
      phone: '9876543211',
      badgeColor: 'border-sky-200/80 bg-sky-50/50 hover:bg-sky-50 text-sky-800',
      tagColor: 'bg-sky-600 text-white',
      desc: 'Manage employees, product catalogs, and view lead pipelines.'
    },
    {
      name: 'Field Executive',
      roleName: 'Field Employee',
      designation: 'Field Inspector',
      email: 'field@arrow.com',
      phone: '9876543220',
      badgeColor: 'border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 text-amber-800',
      tagColor: 'bg-amber-600 text-white',
      desc: 'Mobile-optimized view to log field site visits and customer documents.'
    }
  ];

  return (
    <div className="min-h-screen w-full flex bg-slate-50/50 text-slate-800 font-sans overflow-hidden">
      {/* BRAND PANEL - Visible on desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 relative flex-col justify-between p-16 text-white overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[70%] rounded-full bg-emerald-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[100px]"></div>
        
        {/* Header */}
        <div className="relative z-10 flex items-center select-none">
          <div className="bg-white/95 backdrop-blur px-3.5 py-2 rounded-2xl shadow-xl border border-white/20">
            <img src={logoImg} alt="Arrow Sales Corporation" className="h-10 w-auto object-contain" />
          </div>
        </div>

        {/* Brand Pitch */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Streamline Your Solar Sales & Installation.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Arrow Solar Pipeline is a high-performance, offline-first CRM engineered to connect managing directors, office administrators, and field engineers under one unified database environment.
          </p>
          
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-start space-x-3 group">
              <div className="bg-emerald-950 border border-emerald-800 p-1 rounded-md text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Interactive Pipeline Tracking</h4>
                <p className="text-slate-400 text-xs mt-0.5">Visualize leads from fresh contact to completed solar installation.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 group">
              <div className="bg-emerald-950 border border-emerald-800 p-1 rounded-md text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Mobile-First Site Surveys</h4>
                <p className="text-slate-400 text-xs mt-0.5">Field staff can capture geotagged inspection reports offline with photo proof.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 group">
              <div className="bg-emerald-950 border border-emerald-800 p-1 rounded-md text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Instant PDF Challans & Quotations</h4>
                <p className="text-slate-400 text-xs mt-0.5">Create detailed product checklists and generate PDF sheets in a click.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-[10px] text-slate-500 font-semibold tracking-wide flex justify-between items-center select-none border-t border-slate-900 pt-6">
          <span>ARROW SALES CORPORATION</span>
          <span>SYSTEM OF RECORD • V1.0.0</span>
        </div>
      </div>

      {/* LOGIN CARD PANEL */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 md:p-16 overflow-y-auto">
        {/* Mobile Header */}
        <div className="flex lg:hidden justify-between items-center mb-8 select-none">
          <div className="flex items-center">
            <img src={logoImg} alt="Arrow Sales Corporation" className="h-8 w-auto object-contain" />
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200">
            Enterprise Portal
          </span>
        </div>

        <div className="my-auto max-w-md w-full mx-auto space-y-8 py-6">
          {/* Headline */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Sign in to your account</h2>
            <p className="text-slate-400 text-xs font-medium">Use your enterprise email address or phone number to begin.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3 flex items-start space-x-2.5 text-rose-700 text-xs font-semibold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-identity" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Email Address or Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-identity"
                  type="text"
                  placeholder="name@solar.com or 9876543210"
                  value={emailOrPhone}
                  onChange={(e) => {
                    setEmailOrPhone(e.target.value);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3.5 pl-10 pr-10 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative py-4 select-none">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80"></div>
            </div>
            <div className="relative flex justify-center text-xs font-extrabold uppercase">
              <span className="bg-slate-50/50 sm:bg-white px-3.5 text-[9px] text-slate-400 tracking-wider">
                Or Select An Enterprise Account
              </span>
            </div>
          </div>

          {/* Quick Demo Access Grid */}
          <div className="space-y-3">
            {demoAccounts.map((account) => (
              <div
                key={account.email}
                className="group/card border border-slate-200/80 rounded-2xl p-4 bg-white hover:border-emerald-500 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0"
              >
                <div
                  onClick={() => handleDemoSelect(account.email)}
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center font-black text-xs text-emerald-700 group-hover/card:bg-emerald-500 group-hover/card:text-white transition-all">
                    {account.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-xs font-bold text-slate-800">{account.name}</h4>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border ${account.badgeColor}`}>
                        {account.roleName}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {account.designation} • {account.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin(account.email)}
                  className="bg-slate-50 hover:bg-emerald-600 border border-slate-200 hover:border-emerald-600 hover:text-white text-slate-700 font-extrabold text-[9px] px-3 py-2 rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer self-start sm:self-auto uppercase tracking-wider"
                >
                  <span>Quick Sign In</span>
                  <ArrowRight className="w-3 h-3 group-hover/card:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="text-[10px] text-slate-400 text-center font-bold tracking-wide mt-12 select-none border-t border-slate-100 pt-4">
          © 2026 ARROW SOLAR INC • OFFLINE FIRST WORKSPACE
        </div>
      </div>
    </div>
  );
};

export default Login;
