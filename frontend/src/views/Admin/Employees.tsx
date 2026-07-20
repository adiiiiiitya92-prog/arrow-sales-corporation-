import React, { useEffect, useState } from 'react';
import type { Profile } from '../../types';
import { employeeService } from '../../services/employeeService';
import { Plus, Search, UserCheck, UserX, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export const Employees: React.FC = () => {
  const { currentRole, impersonateUser, originalUser } = useAuthStore();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleImpersonateClick = async (emp: Profile) => {
    if (confirm(`Do you want to log in as "${emp.fullName}" (${emp.role.replace('_', ' ')}) without a password?`)) {
      await impersonateUser(emp);
      const targetPath = emp.role === 'field_employee' ? '/leads' : '/dashboard';
      navigate(targetPath);
    }
  };

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'field_employee'>('field_employee');
  const [email, setEmail] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [designation, setDesignation] = useState('');

  const loadEmployees = async () => {
    const list = await employeeService.getEmployees();
    setEmployees(list);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleToggleStatus = async (id: string) => {
    if (confirm('Are you sure you want to change this employee status?')) {
      await employeeService.toggleEmployeeStatus(id);
      loadEmployees();
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      alert('Please fill out all fields.');
      return;
    }

    await employeeService.createEmployee({
      fullName,
      phone,
      role,
      email: email || undefined,
      aadhaarNumber: aadhaarNumber || undefined,
      panNumber: panNumber || undefined,
      joiningDate: joiningDate || undefined,
      designation: designation || undefined
    });

    // Reset states
    setFullName('');
    setPhone('');
    setRole('field_employee');
    setEmail('');
    setAadhaarNumber('');
    setPanNumber('');
    setJoiningDate('');
    setDesignation('');
    setShowAddModal(false);
    loadEmployees();
  };

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Employee Directory</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manage your administrators and field representatives.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Directory Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by employee name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs font-medium text-slate-800 focus:outline-none w-full bg-transparent"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold ${
                emp.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
              }`}>
                {emp.fullName[0].toUpperCase()}
              </div>
              <div className="truncate max-w-[70%]">
                <h4 className="text-sm font-bold text-slate-900 truncate">{emp.fullName}</h4>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{emp.role.replace('_', ' ')}</span>
                  {emp.designation && (
                    <>
                      <span className="text-slate-300 text-[8px]">•</span>
                      <span className="text-[8px] text-emerald-700 bg-emerald-50 border border-emerald-100/60 font-black px-1 rounded uppercase tracking-wider truncate max-w-[90px]">{emp.designation}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col space-y-1.5 text-xs text-slate-500">
              <p>📞 Phone: <span className="font-bold text-slate-700">{emp.phone}</span></p>
              {emp.email && <p>✉️ Email: <span className="font-bold text-slate-700">{emp.email}</span></p>}
              {emp.aadhaarNumber && <p>💳 Aadhaar: <span className="font-bold text-slate-700">{emp.aadhaarNumber}</span></p>}
              {emp.panNumber && <p>📁 PAN Card: <span className="font-bold text-slate-700">{emp.panNumber}</span></p>}
              {emp.joiningDate && <p>📅 Joined: <span className="font-bold text-slate-700">{emp.joiningDate}</span></p>}
              <p>🕒 Active: <span className={`font-bold ${emp.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {emp.isActive ? 'Active' : 'Inactive'}
              </span></p>
            </div>

            {/* Impersonate Option - Super Admin Only */}
            {(currentRole === 'super_admin' || originalUser?.role === 'super_admin') && emp.id !== useAuthStore.getState().currentUser?.id && (
              <button
                onClick={() => handleImpersonateClick(emp)}
                className="mt-3 w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-[10px] uppercase rounded-lg border border-amber-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>👤 Impersonate Account</span>
              </button>
            )}

            {/* Toggle Status button */}
            <button
              onClick={() => handleToggleStatus(emp.id)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              title="Toggle Active Status"
            >
              {emp.isActive ? <UserCheck className="w-5 h-5 text-emerald-600" /> : <UserX className="w-5 h-5 text-slate-300" />}
            </button>
          </div>
        ))}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 p-8 text-center rounded-xl">
            <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-bold">No employees found. Click "Add Employee" to create one.</p>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 m-4 animate-scale-in">
            <h3 className="text-lg font-black text-slate-900 mb-4">Add Mock Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Company Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="field_employee">Field Employee</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Designation / Post (Optional)</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Accountant, Sales Manager, Installer..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@company.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Aadhaar Card (Optional)</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="12-digit number"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">PAN Card (Optional)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Date of Joining (Optional)</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
