
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', name: '', phone: '', password: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addForm, setAddForm] = useState({
      email: '',
      password: '',
      name: '',
      phone: '',
      isPaid: false,
      isActive: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const allUsers = authService.getUsers();
    allUsers.sort((a, b) => {
        if (a.isActive === b.isActive) return 0;
        return a.isActive ? 1 : -1;
    });
    setUsers(allUsers);
  };

  const handleToggle = (id: string, field: 'isActive' | 'isPaid') => {
    const success = authService.toggleUserStatus(id, field);
    if (success) loadUsers();
    else alert("Cannot modify Root Admin.");
  };

  const startEdit = (user: User) => {
      setEditingUser(user);
      setEditForm({ email: user.id, name: user.name, phone: user.phone || '', password: '' });
  };

  const saveEdit = () => {
      if (!editingUser) return;
      if (!editForm.email || !editForm.name) {
          alert("Email and Name are required.");
          return;
      }

      const updated = { 
          ...editingUser, 
          id: editForm.email,
          name: editForm.name, 
          phone: editForm.phone,
          password: editForm.password 
      };
      
      const result = authService.updateUser(editingUser.id, updated);
      if (result.success) {
          loadUsers();
          setEditingUser(null);
      } else {
          alert(result.message || "Failed to update user.");
      }
  };

  const handleAddUser = () => {
      if (!addForm.email || !addForm.password || !addForm.name) {
          alert("Email, Password, and Name are required.");
          return;
      }
      const result = authService.addUser({
          id: addForm.email,
          password: addForm.password,
          name: addForm.name,
          phone: addForm.phone,
          isPaid: addForm.isPaid,
          isActive: addForm.isActive,
          provider: 'local'
      });

      if (result.success) {
          loadUsers();
          setIsAddingUser(false);
          setAddForm({ email: '', password: '', name: '', phone: '', isPaid: false, isActive: true });
      } else {
          alert(result.message || "Failed to add user.");
      }
  };

  const handleBackup = () => {
      authService.exportDatabase();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = event.target?.result as string;
              const parsed = JSON.parse(json);
              if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
                  if (confirm(`Restore ${parsed.length} users? This will overwrite current data.`)) {
                      authService.saveUsers(parsed);
                      loadUsers();
                      alert("Database restored successfully.");
                  }
              } else {
                  alert("Invalid backup file format.");
              }
          } catch (err) {
              alert("Failed to parse backup file.");
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage user access and subscriptions</p>
          </div>
          <div className="flex gap-3 items-center">
             <button 
                onClick={handleBackup}
                className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium border border-indigo-200"
                title="Download JSON Backup"
              >
                Download DB
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium border border-indigo-200"
                title="Restore from JSON"
              >
                Restore DB
              </button>
              <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />

             <div className="h-6 w-px bg-gray-300 mx-1"></div>

             <button 
                onClick={() => setIsAddingUser(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3.75 15a2.25 2.25 0 0 1 2.25-2.25h2.25A2.25 2.25 0 0 1 10.5 15v3a2.25 2.25 0 0 1-2.25 2.25h-2.25A2.25 2.25 0 0 1 3.75 18v-3ZM13.25 6a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM13.5 18a2.25 2.25 0 0 1 2.25-2.25h2.25A2.25 2.25 0 0 1 20.25 18v3a2.25 2.25 0 0 1-2.25 2.25h-2.25A2.25 2.25 0 0 1 13.5 18v-3Z" />
                </svg>
                Add User
              </button>
              <button 
                onClick={onClose}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Exit
              </button>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Member</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const isPending = !user.isActive;
                return (
                  <tr key={user.id} className={`${isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-primary-100 text-primary-600'}`}>
                          {user.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                             {user.name} 
                             {user.isAdmin && <span className="text-xs bg-gray-800 text-white px-1.5 py-0.5 rounded ml-1">Admin</span>}
                             {isPending && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-1 border border-red-200 font-bold">Pending</span>}
                          </div>
                          <div className="text-sm text-gray-500">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.provider === 'google' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => handleToggle(user.id, 'isPaid')}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${user.isPaid ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${user.isPaid ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => handleToggle(user.id, 'isActive')}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${user.isActive ? 'bg-primary-600' : 'bg-gray-200'}`}
                        disabled={user.id === 'shoutjoy1@gmail.com'}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${user.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button 
                            onClick={() => startEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded hover:bg-indigo-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                        </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
             <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Add New User</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email (ID) *</label>
                        <input type="email" value={addForm.email} onChange={(e) => setAddForm(prev => ({...prev, email: e.target.value}))} className="w-full rounded border border-gray-300 p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password *</label>
                        <input type="password" value={addForm.password} onChange={(e) => setAddForm(prev => ({...prev, password: e.target.value}))} className="w-full rounded border border-gray-300 p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                        <input type="text" value={addForm.name} onChange={(e) => setAddForm(prev => ({...prev, name: e.target.value}))} className="w-full rounded border border-gray-300 p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center"><input type="checkbox" checked={addForm.isPaid} onChange={(e) => setAddForm(prev => ({...prev, isPaid: e.target.checked}))} className="mr-2"/> Paid</label>
                        <label className="flex items-center"><input type="checkbox" checked={addForm.isActive} onChange={(e) => setAddForm(prev => ({...prev, isActive: e.target.checked}))} className="mr-2"/> Active</label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 border rounded">Cancel</button>
                    <button onClick={handleAddUser} className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
                </div>
             </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Email (ID)</label>
                          <input type="text" value={editForm.email} onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))} className="w-full rounded border border-gray-300 p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <input type="text" value={editForm.name} onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))} className="w-full rounded border border-gray-300 p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input type="text" value={editForm.phone} onChange={(e) => setEditForm(prev => ({...prev, phone: e.target.value}))} className="w-full rounded border border-gray-300 p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">New Password</label>
                          <input type="password" value={editForm.password} onChange={(e) => setEditForm(prev => ({...prev, password: e.target.value}))} placeholder="Leave blank to keep current" className="w-full rounded border border-gray-300 p-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded">Cancel</button>
                      <button onClick={saveEdit} className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
