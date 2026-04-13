"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Plus, Edit, Shield, Check, X, Loader2 } from "lucide-react";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

export default function AdminsManagementPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/admins");
      if (!res.ok) throw new Error("Failed to fetch admins");
      const data = await res.json();
      setAdmins(data);
    } catch (e) {
      toast.error("Unable to load admins");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(admin?: Admin) {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: ""
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: ""
      });
    }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = editingAdmin 
        ? `/api/super-admin/admins/${editingAdmin.id}` 
        : "/api/super-admin/admins";
      const method = editingAdmin ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Operation failed");
      }

      toast.success(editingAdmin ? "Admin updated" : "Admin created");
      setModalOpen(false);
      fetchAdmins();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function toggleStatus(admin: Admin) {
    setStatusLoadingId(admin.id);
    try {
      const res = await fetch(`/api/super-admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !admin.isActive })
      });
      if (!res.ok) throw new Error();
      toast.success(`Admin ${admin.isActive ? 'deactivated' : 'activated'}`);
      fetchAdmins();
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setStatusLoadingId(null);
    }
  }

  return (
    <div className="admin-page">
      <style>{`
        .admin-page {
          min-height: 100vh;
          background: #0A0F1C;
          color: white;
          padding: 2rem;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
        }
        .admin-page::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: 
            radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 90% 90%, rgba(168, 85, 247, 0.05) 0%, transparent 40%);
          pointer-events: none;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
          animation: fadeIn 0.8s ease-out;
        }
        .title {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #FFF, #A0AEC0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -1px;
        }
        .add-btn {
          background: linear-gradient(135deg, #6366F1, #4F46E5);
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 14px;
          color: white;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
        }
        .add-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 15px 30px rgba(99, 102, 241, 0.4);
        }
        .table-container {
          background: rgba(20, 27, 46, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          overflow: hidden;
          animation: slideUp 0.8s ease-out;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          text-align: left;
           padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #A0AEC0;
          font-weight: 500;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        td {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: #E2E8F0;
        }
        tr:last-child td { border-bottom: none; }
        .user-cell {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #1A2238, #2D3748);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #6366F1;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .status-active { background: rgba(34, 197, 94, 0.1); color: #4ADE80; }
        .status-inactive { background: rgba(239, 68, 68, 0.1); color: #F87171; }
        .actions {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          min-width: 100px;
          height: 36px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0 0.85rem;
          cursor: pointer;
          transition: 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.03);
          color: #A0AEC0;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .action-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }
        .action-btn:disabled {
          cursor: not-allowed;
          opacity: 0.65;
          background: rgba(255, 255, 255, 0.02);
        }
        .action-btn.edit:hover { background: rgba(99, 102, 241, 0.1); color: #6366F1; border-color: #6366F1; }
        .action-btn.toggle:hover { background: rgba(34, 197, 94, 0.1); color: #22C55E; border-color: #22C55E; }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s;
        }
        .modal-content {
          background: #141B2E;
          padding: 3rem;
          border-radius: 32px;
          width: 100%;
          max-width: 500px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          box-shadow: 0 40px 100px rgba(0,0,0,0.8);
        }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: #A0AEC0; font-size: 0.9rem; }
        .form-group input {
          width: 100%;
          background: #1A2238;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.8rem 1rem;
          border-radius: 12px;
          color: white;
          outline: none;
        }
        .form-group input:focus { border-color: #6366F1; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        .loading-shimmer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }
        .shimmer-line {
          height: 60px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 0.7; } 100% { opacity: 0.3; } }
      `}</style>

      <div className="header">
        <div>
          <h1 className="title">Super Admin Platform</h1>
          <p style={{ color: '#A0AEC0' }}>Create control panel</p>
        </div>
        <button className="add-btn" onClick={() => handleOpenModal()}>
          <Plus size={20} />
          Launch New Admin
        </button>
      </div>

      {loading ? (
        <div className="loading-shimmer">
          {[1,2,3,4].map(i => <div key={i} className="shimmer-line" />)}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Admin Profile</th>
                <th>Permissions</th>
                <th>Connectivity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar">{admin.firstName[0]}</div>
                      <div>
                        <div className="font-bold">{admin.firstName} {admin.lastName}</div>
                        <div className="text-sm" style={{ color: '#A0AEC0' }}>{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                       <Shield size={14} className="text-indigo-400" />
                       <span className="text-xs uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">Head Admin</span>
                    </div>
                  </td>
                  <td>
                    <div className={`status-badge ${admin.isActive ? 'status-active' : 'status-inactive'}`}>
                      {admin.isActive ? <Check size={12} /> : <X size={12} />}
                      {admin.isActive ? 'Active' : 'Locked'}
                    </div>
                  </td>
                  <td>
                     <div className="actions">
                        <button className="action-btn edit" onClick={() => handleOpenModal(admin)}>
                           <Edit size={16} />
                        </button>
                        <button
                          className="action-btn toggle"
                          onClick={() => toggleStatus(admin)}
                          disabled={statusLoadingId === admin.id}
                          title={admin.isActive ? "Deactivate admin" : "Activate admin"}
                          aria-label={admin.isActive ? "Deactivate admin" : "Activate admin"}
                        >
                          {statusLoadingId === admin.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : admin.isActive ? (
                            <X size={16} />
                          ) : (
                            <Check size={16} />
                          )}
                          <span style={{ marginLeft: 6, fontSize: 12 }}>
                            {statusLoadingId === admin.id
                              ? admin.isActive ? 'Deactivating...' : 'Activating...'
                              : admin.isActive ? 'Deactivate' : 'Activate'}
                          </span>
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {admins.length === 0 && (
            <div className="p-10 text-center text-slate-500">
               No tenant administrators found targeting the system core.
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-2xl font-bold mb-6">{editingAdmin ? 'Refine Profile' : 'Configure New Root'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>First Name</label>
                  <input 
                    type="text" 
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              {!editingAdmin && (
                <div className="form-group">
                  <label>Master Password</label>
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
              )}
              <div className="flex gap-4 mt-8">
                <button type="submit" disabled={formLoading} className="add-btn flex-1 justify-center">
                  {formLoading ? 'Synchronizing...' : editingAdmin ? 'Commit Changes' : 'Initialize Root'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-6 rounded-xl border border-slate-700 font-medium hover:bg-slate-800 transition">
                  Abort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
